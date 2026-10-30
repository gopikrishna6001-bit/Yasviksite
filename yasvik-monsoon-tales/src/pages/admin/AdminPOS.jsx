import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Search, Plus, Minus, Trash2, Loader2, CheckCircle, Receipt, Phone, User,
  RotateCcw, Star, ScanLine, LayoutGrid, Clock, RefreshCw, Pencil, PackagePlus,
  ShieldCheck, ExternalLink, CloudOff, CloudUpload, WifiOff, Percent, Ticket, FileText,
} from 'lucide-react';
import { usePosOnlineOrderAlerts } from '@/hooks/usePosOnlineOrderAlerts';
import PosOnlineOrderAlertBanner, { PosOnlineOrderAlertToggle } from '@/components/admin/pos/PosOnlineOrderAlertBanner';
import { products, orders, categories as categoriesApi } from '@/services/api';
import { appClient } from '@/api/appClient';
import { normalizeProductVariant } from '@/lib/productVariantUtils';
import { isPricingMetaVariant } from '@/lib/productPricingMeta';
import { loadPosSession, savePosSession, clearPosSession } from '@/lib/posSession';
import { usePosDraftGuard } from '@/hooks/usePosDraftGuard';
import { buildPosCatalog, getSellableVariants } from '@/lib/posCatalog';
import { productExcludesBillDiscount } from '@/lib/categoryBillDiscount';
import { resolvePosVariantPrice } from '@/lib/pricingStrategy';
import { resolveScanToProduct, resolveScanLocally, markLabelItemsSold, parseScanCode } from '@/lib/posBarcode';
import {
  cartItemKey,
  recordFrequentSale,
  getFrequentItems,
  getFavoriteItems,
  toggleFavorite,
  isFavorite,
} from '@/lib/posFrequent';
import PosSaleDocuments from '@/components/admin/pos/PosSaleDocuments';
import PosYasvikBonusPanel from '@/components/admin/pos/PosYasvikBonusPanel';
import PosCustomLineDialog from '@/components/admin/pos/PosCustomLineDialog';
import PosLineEditor from '@/components/admin/pos/PosLineEditor';
import PosVariantPicker from '@/components/admin/pos/PosVariantPicker';
import YasvikLogo from '@/components/brand/YasvikLogo';
import { usePosSidebarHidden } from '@/lib/posSidebarStore';
import { usePosOffline } from '@/hooks/usePosOffline';
import { usePosBarcodeScanner } from '@/hooks/usePosBarcodeScanner';
import {
  enqueuePendingPosSale,
  newOfflineSaleId,
  updateCachedProducts,
} from '@/lib/posOfflineStore';
import { applyOfflineStockDeduction, validateOfflineCartStock } from '@/lib/posOfflineStock';
import { buildOfflineSaleRecord, isLikelyNetworkError } from '@/lib/posOfflineSync';
import { POS_QUICK_PERCENTS, computeDiscountPaise, normalizeCouponCode } from '@/lib/couponUtils';
import { findDiscountFloorBreaches } from '@/lib/posDiscountGuard';
import { allocateOrderDiscountToLines, eligibleDiscountSubtotalPaise } from '@/lib/orderLinePricing';
import { customerPhoneDigits } from '@/lib/orderWhatsAppNotify';
import { downloadOrderInvoicePdf } from '@/lib/orderInvoicePdf';
import { format } from 'date-fns';

const PAYMENT_MODES = [
  { id: 'cash', label: 'Cash' },
  { id: 'upi', label: 'UPI' },
  { id: 'card', label: 'Card' },
];

const BROWSE_TABS = [
  { id: 'browse', label: 'Browse', icon: LayoutGrid },
  { id: 'frequent', label: 'Frequent', icon: Clock },
  { id: 'favorites', label: 'Pinned', icon: Star },
];

function makeCartLine(product, variant, extras = {}) {
  const v = variant ? (normalizeProductVariant(variant) || null) : null;
  const price = extras.price ?? (v ? resolvePosVariantPrice(v, product) : product?.price ?? 0);
  const key = extras.key || cartItemKey(product?.id, v?.sku, v?.label, extras.customKey);
  return {
    key,
    productId: product?.id || null,
    title: extras.title || product?.title || product?.name || 'Item',
    variant: extras.variant ?? v?.label ?? null,
    sku: extras.sku ?? v?.sku ?? product?.sku ?? null,
    pack_kg: extras.pack_kg ?? v?.pack_kg ?? null,
    price: Number(price),
    originalPrice: Number(extras.originalPrice ?? price),
    qty: extras.qty || 1,
    type: extras.type || 'product',
    note: extras.note || null,
    labelBarcode: extras.labelBarcode || null,
    priceOverridden: Boolean(extras.priceOverridden),
    exclude_from_discount: Boolean(extras.exclude_from_discount),
  };
}

export default function AdminPOS() {
  const qc = useQueryClient();
  const { hidden: posSidebarHidden } = usePosSidebarHidden();
  const billFocus = posSidebarHidden;
  const initial = useMemo(() => loadPosSession(), []);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState(initial.cart || []);
  const [paymentMethod, setPaymentMethod] = useState(initial.paymentMethod || 'cash');
  const [customerName, setCustomerName] = useState(initial.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(initial.customerPhone || '');
  const [orderChannel, setOrderChannel] = useState('pos');
  const [customerCrmHint, setCustomerCrmHint] = useState('');
  const [cashReceived, setCashReceived] = useState(initial.cashReceived || '');
  const [browseTab, setBrowseTab] = useState(initial.browseTab || 'browse');
  const [categoryId, setCategoryId] = useState(initial.categoryId || 'all');
  const [scannerEnabled, setScannerEnabled] = useState(initial.scannerEnabled !== false);
  const [completing, setCompleting] = useState(false);
  const [provisionalBusy, setProvisionalBusy] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const [error, setError] = useState('');
  const [scanFlash, setScanFlash] = useState('');
  const [customOpen, setCustomOpen] = useState(false);
  const [variantPick, setVariantPick] = useState(null);
  const [editingLine, setEditingLine] = useState(null);
  const [favVersion, setFavVersion] = useState(0);
  const [localCatalogProducts, setLocalCatalogProducts] = useState(null);
  const [catalogRefreshing, setCatalogRefreshing] = useState(false);
  const {
    online: posOnline,
    offlineReady,
    catalogCache,
    catalogAge,
    pendingSummary,
    syncing: posSyncing,
    syncMessage,
    syncNow,
    refreshState: refreshPosOffline,
    cacheCatalog,
  } = usePosOffline();
  const {
    alerts: onlineOrderAlerts,
    alertsEnabled: onlineAlertsEnabled,
    setAlertsEnabled: setOnlineAlertsEnabled,
    dismissAlert: dismissOnlineAlert,
    dismissAll: dismissAllOnlineAlerts,
    requestNotificationPermission,
    notificationPermission,
  } = usePosOnlineOrderAlerts({ enabled: posOnline });
  const [draftNotice, setDraftNotice] = useState(() => {
    const lines = (initial.cart || []).length;
    return lines > 0 ? `Resumed open bill (${lines} line${lines === 1 ? '' : 's'})` : '';
  });
  const [discountMode, setDiscountMode] = useState('none');
  const [manualPercent, setManualPercent] = useState('');
  const [manualFixedRs, setManualFixedRs] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [customPercentOpen, setCustomPercentOpen] = useState(false);
  const [bonusPreview, setBonusPreview] = useState(null);
  const [bonusPreviewBusy, setBonusPreviewBusy] = useState(false);
  const [applyYasvikBonus, setApplyYasvikBonus] = useState(true);
  const [bonusRedeemRs, setBonusRedeemRs] = useState('');

  const searchRef = useRef(null);
  const refocusScannerRef = useRef(() => {});

  const { data: productListRemote = [], isLoading: productsLoading, refetch: refetchProducts } = useQuery({
    queryKey: ['pos-products'],
    queryFn: () => products.list('-created_date', 1000),
    staleTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnReconnect: true,
    retry: posOnline ? 1 : false,
  });

  const { data: categoryList = [], refetch: refetchCategories } = useQuery({
    queryKey: ['pos-categories'],
    queryFn: () => categoriesApi.listActive(200),
    staleTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnReconnect: true,
    retry: posOnline ? 1 : false,
  });

  useEffect(() => {
    if (productListRemote.length) {
      cacheCatalog(productListRemote, categoryList);
      setLocalCatalogProducts(null);
    }
  }, [productListRemote, categoryList, cacheCatalog]);

  const productList = useMemo(() => {
    if (localCatalogProducts?.length) return localCatalogProducts;
    if (productListRemote.length) return productListRemote;
    return catalogCache?.products || [];
  }, [localCatalogProducts, productListRemote, catalogCache]);

  const categoryListEffective = useMemo(() => {
    if (categoryList.length) return categoryList;
    return catalogCache?.categories || [];
  }, [categoryList, catalogCache]);

  // Category policy wins: turn on exclusion for matching product lines (never auto-clear).
  useEffect(() => {
    if (!categoryListEffective.length || !productList.length) return;
    const byId = new Map(productList.map((p) => [p.id, p]));
    setCart((prev) => {
      let changed = false;
      const next = prev.map((line) => {
        if (!line.productId || line.exclude_from_discount) return line;
        const product = byId.get(line.productId);
        if (!product || !productExcludesBillDiscount(product, categoryListEffective)) return line;
        changed = true;
        return { ...line, exclude_from_discount: true };
      });
      return changed ? next : prev;
    });
  }, [categoryListEffective, productList]);

  const { data: recentPosOrders = [], refetch: refetchToday } = useQuery({
    queryKey: ['pos-recent-orders'],
    queryFn: () => orders.list('-created_date', 50),
    staleTime: 2 * 60 * 1000,
    refetchOnMount: false,
  });

  const catalog = useMemo(
    () => buildPosCatalog(productList, categoryListEffective),
    [productList, categoryListEffective]
  );

  const catalogLoading = productsLoading && !productList.length;

  const productsById = useMemo(
    () => Object.fromEntries(productList.map((p) => [p.id, p])),
    [productList]
  );

  const posToday = useMemo(() => {
    const today = new Date().toDateString();
    const synced = recentPosOrders.filter((o) => {
      if ((o.order_channel || 'web') !== 'pos') return false;
      const d = o.created_date ? new Date(o.created_date).toDateString() : '';
      return d === today;
    });
    const localPending = pendingSummary.sales.filter((sale) => {
      const d = sale.soldAt ? new Date(sale.soldAt).toDateString() : '';
      return d === today && sale.status !== 'synced';
    });
    return { synced, localPending };
  }, [recentPosOrders, pendingSummary.sales]);

  const todayBillCount = posToday.synced.length + posToday.localPending.length;
  const todayTotal =
    posToday.synced.reduce((s, o) => s + (o.amount_paise || 0) / 100, 0)
    + posToday.localPending.reduce((s, sale) => s + (sale.total || 0), 0);

  const todayBillRows = useMemo(() => {
    const local = posToday.localPending.map((sale) => ({
      id: sale.id,
      label: `${sale.customer_name || 'Walk-in'} · offline`,
      amount: sale.total || 0,
    }));
    const synced = posToday.synced.map((o) => ({
      id: o.id,
      label: `${o.customer_name || 'Walk-in'} · #${o.receipt_id?.slice(-6) || o.id?.slice(-6)}`,
      amount: (o.amount_paise || 0) / 100,
    }));
    return [...local, ...synced].slice(0, 8);
  }, [posToday]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q) return catalog.search(q, 48);
    const base = browseTab === 'browse'
      ? catalog.productsForCategory(categoryId)
      : catalog.products;
    return base.slice(0, 48);
  }, [catalog, search, browseTab, categoryId]);

  const frequentTiles = useMemo(() => getFrequentItems(20), [cart, lastSale]);
  const favoriteTiles = useMemo(() => getFavoriteItems(24), [favVersion]);

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const subtotalPaise = Math.round(subtotal * 100);
  const discountEligiblePaise = useMemo(() => eligibleDiscountSubtotalPaise(cart), [cart]);
  const excludedDiscountCount = useMemo(
    () => cart.filter((item) => item.exclude_from_discount).length,
    [cart],
  );

  const discountPreview = useMemo(() => {
    const eligibleBase = discountEligiblePaise > 0 ? discountEligiblePaise : 0;
    if (discountMode === 'coupon' && appliedCoupon) {
      const couponPaise = Number(appliedCoupon.discount_paise) || 0;
      return {
        discountPaise: Math.min(couponPaise, eligibleBase),
        label: appliedCoupon.discount_label || appliedCoupon.coupon_code,
      };
    }
    if (discountMode === 'percent' && Number(manualPercent) > 0) {
      const discountPaise = computeDiscountPaise(eligibleBase, { type: 'percent', value: Number(manualPercent) });
      return { discountPaise, label: `${Number(manualPercent)}%` };
    }
    if (discountMode === 'fixed' && Number(manualFixedRs) > 0) {
      const discountPaise = computeDiscountPaise(eligibleBase, {
        type: 'fixed_paise',
        value: Math.round(Number(manualFixedRs) * 100),
      });
      return { discountPaise, label: `₹${Math.round(Number(manualFixedRs))} off` };
    }
    return { discountPaise: 0, label: null };
  }, [discountMode, appliedCoupon, manualPercent, manualFixedRs, discountEligiblePaise]);

  const discountFloor = useMemo(() => {
    if (discountMode !== 'percent' || !(Number(manualPercent) > 0)) {
      return { breaches: [], maxSafePercent: 100, knownLineCount: 0 };
    }
    return findDiscountFloorBreaches(
      cart.filter((item) => !item.exclude_from_discount),
      productsById,
      Number(manualPercent),
    );
  }, [discountMode, manualPercent, cart, productsById]);

  const discountRs = discountPreview.discountPaise / 100;
  const cartPricingByKey = useMemo(() => new Map(
    allocateOrderDiscountToLines(cart, discountPreview.discountPaise, subtotalPaise)
      .map((line) => [line.key, line]),
  ), [cart, discountPreview.discountPaise, subtotalPaise]);
  const total = Math.max(0, subtotal - discountRs);
  const maxBonusRedeemPaise = Number(bonusPreview?.suggested_redeem_paise || 0);
  const bonusRedeemPaise = (() => {
    if (!applyYasvikBonus || !posOnline || maxBonusRedeemPaise <= 0) return 0;
    const entered = Math.round(Number(bonusRedeemRs) * 100);
    if (!Number.isFinite(entered) || entered <= 0) return 0;
    return Math.min(entered, maxBonusRedeemPaise);
  })();
  const bonusRedeemAmountRs = bonusRedeemPaise / 100;
  const payableTotal = Math.max(0, total - bonusRedeemAmountRs);
  const changeDue = paymentMethod === 'cash' && cashReceived
    ? Math.max(0, Number(cashReceived) - payableTotal)
    : 0;

  const clearDiscount = useCallback(() => {
    setDiscountMode('none');
    setManualPercent('');
    setManualFixedRs('');
    setCouponInput('');
    setAppliedCoupon(null);
    setCouponError('');
    setCustomPercentOpen(false);
  }, []);

  const applyCouponCode = useCallback(async () => {
    const code = normalizeCouponCode(couponInput);
    if (!code) {
      setCouponError('Enter a coupon code');
      return;
    }
    setCouponBusy(true);
    setCouponError('');
    try {
      const res = await appClient.functions.invoke('validateCouponPreview', {
        coupon_code: code,
        subtotal_paise: subtotalPaise,
        channel: 'pos',
        customer_phone: customerPhone.replace(/\D/g, '').slice(-10) || null,
      });
      const data = res.data;
      if (!data?.valid || data?.error) throw new Error(data?.error || 'Invalid coupon');
      setDiscountMode('coupon');
      setManualPercent('');
      setManualFixedRs('');
      setCustomPercentOpen(false);
      setAppliedCoupon(data);
    } catch (err) {
      setAppliedCoupon(null);
      setCouponError(err?.message || 'Coupon not valid');
    } finally {
      setCouponBusy(false);
    }
  }, [couponInput, subtotalPaise, customerPhone]);

  const refreshBonusPreview = useCallback(async () => {
    const digits = customerPhoneDigits(customerPhone);
    if (digits.length !== 10 || !cart.length || !posOnline) {
      setBonusPreview(null);
      return;
    }
    setBonusPreviewBusy(true);
    try {
      const res = await appClient.functions.invoke('previewBonus', {
        customer_phone: digits,
        items: cart.map((item) => ({
          productId: item.productId,
          title: item.title,
          price: item.price,
          qty: item.qty,
          line_total_after_discount_paise: Math.round(
            (cartPricingByKey.get(item.key)?.finalLineTotal ?? item.price * item.qty) * 100,
          ),
        })),
      });
      setBonusPreview(res.data?.error ? null : res.data);
    } catch {
      setBonusPreview(null);
    } finally {
      setBonusPreviewBusy(false);
    }
  }, [customerPhone, cart, posOnline, cartPricingByKey]);

  const handleCustomerPhoneBlur = useCallback(async () => {
    const digits = customerPhoneDigits(customerPhone);
    if (digits.length !== 10) {
      setCustomerCrmHint('');
      setBonusPreview(null);
      return;
    }
    try {
      const res = await appClient.functions.invoke('lookupCustomerByPhone', { phone: digits });
      const c = res.data?.customer;
      if (c) {
        if (c.name && !customerName.trim()) setCustomerName(c.name);
        const bonusBit = Number(c.bonus_balance_paise || 0) > 0
          ? ` · Bonus ₹${Math.round(Number(c.bonus_balance_paise) / 100)}`
          : '';
        setCustomerCrmHint(
          `${c.order_count || 0} orders · ₹${Math.round((c.lifetime_spend_paise || 0) / 100)} lifetime${bonusBit}`,
        );
      } else {
        setCustomerCrmHint('');
      }
    } catch {
      /* ignore lookup failures at counter */
    }
    refreshBonusPreview();
  }, [customerPhone, customerName, refreshBonusPreview]);

  useEffect(() => {
    const digits = customerPhoneDigits(customerPhone);
    if (digits.length !== 10 || !cart.length || !posOnline) {
      setBonusPreview(null);
      return undefined;
    }
    const t = setTimeout(() => {
      refreshBonusPreview();
    }, 350);
    return () => clearTimeout(t);
  }, [customerPhone, cart, discountPreview.discountPaise, posOnline, refreshBonusPreview]);

  useEffect(() => {
    const suggested = Number(bonusPreview?.suggested_redeem_paise || 0);
    if (suggested > 0) {
      setBonusRedeemRs(String(Math.round(suggested / 100)));
    } else {
      setBonusRedeemRs('');
    }
  }, [bonusPreview?.suggested_redeem_paise, bonusPreview?.settled_balance_paise]);

  usePosDraftGuard(cart.length);

  useEffect(() => {
    savePosSession({
      cart,
      customerName,
      customerPhone,
      paymentMethod,
      cashReceived,
      browseTab,
      categoryId,
      scannerEnabled,
    });
  }, [cart, customerName, customerPhone, paymentMethod, cashReceived, browseTab, categoryId, scannerEnabled]);

  useEffect(() => {
    if (!draftNotice) return undefined;
    const t = setTimeout(() => setDraftNotice(''), 8000);
    return () => clearTimeout(t);
  }, [draftNotice]);

  const addLineToCart = useCallback((line) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.key === line.key);
      if (existing) {
        return prev.map((i) => (i.key === line.key ? { ...i, qty: i.qty + (line.qty || 1) } : i));
      }
      return [...prev, line];
    });
    setError('');
  }, []);

  const addToCart = useCallback((product, variant = null, extras = {}) => {
    const autoExclude = productExcludesBillDiscount(product, categoryListEffective);
    const line = makeCartLine(product, variant, {
      ...extras,
      exclude_from_discount:
        extras.exclude_from_discount != null
          ? Boolean(extras.exclude_from_discount)
          : autoExclude,
    });
    if (!line.price || line.price <= 0) return;
    addLineToCart(line);
    if (scannerEnabled) refocusScannerRef.current();
    else searchRef.current?.focus();
  }, [addLineToCart, scannerEnabled, categoryListEffective]);

  const addCustomLine = useCallback(({ title, price, qty }) => {
    const key = `custom_${Date.now()}`;
    addLineToCart(makeCartLine(null, null, {
      key,
      customKey: key,
      title,
      price,
      qty,
      type: 'custom',
    }));
    setError('');
    setDraftNotice('');
  }, [addLineToCart]);

  const finishProductAdd = useCallback((product, variant = null, extras = {}) => {
    const variants = getSellableVariants(product);
    if (!variant && variants.length > 1) {
      setVariantPick({ product, extras });
      setScanFlash('ok');
      setError('');
      if (scannerEnabled) refocusScannerRef.current();
      else searchRef.current?.focus();
      return true;
    }
    const resolvedVariant = variant || (variants.length === 1 ? variants[0] : null);
    addToCart(product, resolvedVariant, extras);
    setScanFlash('ok');
    setError('');
    return true;
  }, [addToCart, scannerEnabled]);

  const resolveAndAdd = useCallback(async (code) => {
    const trimmed = String(code || '').trim();
    if (!trimmed) return false;

    const extrasFromHit = (hit) => ({
      price: hit.priceOverride ?? undefined,
      priceOverridden: hit.priceOverride != null,
      labelBarcode: hit.labelBarcode || null,
      originalPrice: hit.variant ? resolvePosVariantPrice(hit.variant, hit.product) : hit.product.price,
    });

    try {
      const localHit = resolveScanLocally(trimmed, catalog);
      if (localHit?.product) {
        setSearch('');
        return finishProductAdd(localHit.product, localHit.variant, extrasFromHit(localHit));
      }

      if (!posOnline) {
        const parsed = parseScanCode(trimmed);
        if (parsed.kind === 'label_batch') {
          setError('Batch labels need internet. Use product barcode (SKU) when offline.');
        } else {
          setError(`No match offline: ${trimmed}. Tap Refresh when online once.`);
        }
        setScanFlash('error');
        return false;
      }

      const hit = await resolveScanToProduct(trimmed, catalog, { online: true });
      if (!hit?.product) {
        setError(`No match for scan: ${trimmed}`);
        setScanFlash('error');
        return false;
      }
      return finishProductAdd(hit.product, hit.variant, extrasFromHit(hit));
    } catch {
      setError('Scan lookup failed');
      setScanFlash('error');
      return false;
    } finally {
      setTimeout(() => setScanFlash(''), 400);
    }
  }, [catalog, finishProductAdd, posOnline]);

  const tryAddFromSearch = useCallback(async () => {
    const q = search.trim();
    if (!q) return;
    const skuHit = catalog.resolveBySku(q);
    if (skuHit) {
      const added = finishProductAdd(skuHit.product, skuHit.variant);
      if (added) setSearch('');
      return;
    }
    if (/^YV/i.test(q)) {
      const added = await resolveAndAdd(q);
      if (added) setSearch('');
      return;
    }
    const first = filtered[0];
    if (!first) {
      setError(`No product match for "${q}"`);
      setScanFlash('error');
      setTimeout(() => setScanFlash(''), 400);
      return;
    }
    const variants = getSellableVariants(first).filter((v) => !isPricingMetaVariant(v));
    const variant = variants.find((v) => String(v.sku || '').toLowerCase() === q.toLowerCase())
      || (variants.length === 1 ? variants[0] : null);
    if (!variant && variants.length > 1) {
      setVariantPick({ product: first, extras: {} });
      setSearch('');
      return;
    }
    addToCart(first, variant);
    setSearch('');
  }, [search, catalog, filtered, addToCart, resolveAndAdd, finishProductAdd]);

  const refreshCatalog = useCallback(async () => {
    if (!posOnline) {
      setError('Connect to internet to refresh products.');
      return;
    }
    setCatalogRefreshing(true);
    setError('');
    setLocalCatalogProducts(null);
    try {
      qc.invalidateQueries({ queryKey: ['pos-products'] });
      qc.invalidateQueries({ queryKey: ['pos-categories'] });
      qc.invalidateQueries({ queryKey: ['pos-recent-orders'] });
      await Promise.all([refetchProducts(), refetchCategories(), refetchToday()]);
      refreshPosOffline();
      setDraftNotice('Product catalog refreshed');
    } catch (err) {
      setError(err?.message || 'Could not refresh products');
    } finally {
      setCatalogRefreshing(false);
    }
  }, [posOnline, qc, refetchProducts, refetchCategories, refetchToday, refreshPosOffline]);

  const addFrequentOrFavorite = useCallback((tile) => {
    const product = catalog.byId.get(tile.productId);
    if (!product) return;
    const variants = getSellableVariants(product);
    const variant = variants.find(
      (v) => (tile.sku && v.sku === tile.sku) || (tile.variant && v.label === tile.variant)
    ) || (variants.length === 1 ? variants[0] : null);
    addToCart(product, variant);
  }, [catalog, addToCart]);

  const updateQty = (key, qty) => {
    if (qty < 1) {
      setCart((prev) => prev.filter((i) => i.key !== key));
      return;
    }
    setCart((prev) => prev.map((i) => (i.key === key ? { ...i, qty } : i)));
  };

  const saveLineEdit = (updated) => {
    setCart((prev) => prev.map((i) => (i.key === updated.key ? updated : i)));
  };

  const toggleLineDiscountExclusion = (key) => {
    setCart((prev) => prev.map((i) => (
      i.key === key ? { ...i, exclude_from_discount: !i.exclude_from_discount } : i
    )));
  };

  const clearBill = () => {
    if (cart.length > 0 && !window.confirm('Clear this bill? Saved draft will be removed.')) return;
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerCrmHint('');
    setBonusPreview(null);
    setApplyYasvikBonus(true);
    setBonusRedeemRs('');
    setCashReceived('');
    setError('');
    setDraftNotice('');
    clearPosSession();
    if (scannerEnabled) refocusScannerRef.current();
    else searchRef.current?.focus();
  };

  const openCounterWindow = () => {
    window.open('/admin/pos', 'yasvik-counter', 'noopener,noreferrer,width=1280,height=900');
  };

  const downloadProvisionalBill = useCallback(async () => {
    if (!cart.length || provisionalBusy) return;
    setError('');
    setProvisionalBusy(true);
    try {
      const estimateNo = `EST-${format(new Date(), 'yyMMdd-HHmm')}`;
      await downloadOrderInvoicePdf({
        provisional: true,
        invoice_kind: 'provisional',
        status: 'provisional',
        payment_status: 'estimate',
        payment_method: 'estimate',
        order_channel: 'pos',
        order_number: estimateNo,
        receipt_id: estimateNo,
        customer_name: customerName.trim() || 'Walk-in customer',
        customer_phone: customerPhone.replace(/\D/g, '').slice(-10) || '',
        items_snapshot: cart.map((item) => ({
          title: item.title,
          name: item.title,
          variant: item.variant,
          qty: item.qty,
          price: item.price,
          exclude_from_discount: Boolean(item.exclude_from_discount),
        })),
        subtotal_paise: subtotalPaise,
        discount_paise: discountPreview.discountPaise,
        discount_label: discountPreview.label,
        bonus_redeemed_paise: bonusRedeemPaise,
        amount_paise: Math.round(payableTotal * 100),
        created_date: new Date().toISOString(),
      });
      setDraftNotice('Provisional bill downloaded — cart unchanged');
    } catch (err) {
      setError(err?.message || 'Could not generate provisional bill');
    } finally {
      setProvisionalBusy(false);
    }
  }, [
    cart,
    provisionalBusy,
    customerName,
    customerPhone,
    subtotalPaise,
    discountPreview.discountPaise,
    discountPreview.label,
    bonusRedeemPaise,
    payableTotal,
  ]);

  const completeSale = useCallback(async () => {
    if (!cart.length) return;
    if (paymentMethod === 'cash' && cashReceived && Number(cashReceived) < payableTotal) {
      setError(`Cash received (₹${cashReceived}) is less than bill (₹${payableTotal.toFixed(0)})`);
      return;
    }
    setError('');
    setCompleting(true);

    const finishLocalSale = (saleRecord, receiptExtras = {}) => {
      recordFrequentSale(cart);
      setLastSale({
        ...saleRecord,
        ...receiptExtras,
        payment_method: paymentMethod,
        customer_name: customerName.trim() || 'Walk-in customer',
        customer_phone: customerPhone.replace(/\D/g, '').slice(-10) || null,
        cash_received: paymentMethod === 'cash' && cashReceived ? Number(cashReceived) : null,
        change_due: paymentMethod === 'cash' && cashReceived ? changeDue : null,
        items: [...cart],
        offline: true,
      });
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerCrmHint('');
      setBonusPreview(null);
      setApplyYasvikBonus(true);
      setBonusRedeemRs('');
      setCashReceived('');
      clearDiscount();
      clearPosSession();
      refreshPosOffline();
    };

    const runOfflineSale = () => {
      if (!offlineReady && !productList.length) {
        throw new Error('Offline catalog missing. Connect internet once and tap Refresh products.');
      }
      validateOfflineCartStock(cart, productsById);
      const saleId = newOfflineSaleId();
      const saleRecord = buildOfflineSaleRecord({
        id: saleId,
        cart,
        paymentMethod,
        customerName,
        customerPhone,
        cashReceived,
        changeDue,
        total,
        subtotalPaise,
        discountPaise: discountPreview.discountPaise,
        discountMode,
        discountLabel: discountPreview.label,
        couponCode: appliedCoupon?.coupon_code || normalizeCouponCode(couponInput),
        manualPercent: Number(manualPercent) || null,
        manualFixedPaise: Number(manualFixedRs) > 0 ? Math.round(Number(manualFixedRs) * 100) : null,
        orderChannel,
      });
      enqueuePendingPosSale(saleRecord);
      const updatedProducts = applyOfflineStockDeduction(productList, cart);
      updateCachedProducts(updatedProducts);
      setLocalCatalogProducts(updatedProducts);
      finishLocalSale(saleRecord, {
        order_number: saleId.slice(-8).toUpperCase(),
        receipt_id: saleId,
        amount_paise: Math.round(total * 100),
      });
      setDraftNotice(`Offline sale saved · sync when internet is back (${pendingSummary.count + 1} waiting)`);
    };

    try {
      if (navigator.onLine) {
        try {
          const res = await appClient.functions.invoke('createPosSale', {
            items: cart.map((i) => ({
              productId: i.productId,
              product_id: i.productId,
              title: i.title,
              variant: i.variant,
              sku: i.sku,
              pack_kg: i.pack_kg,
              qty: i.qty,
              price: i.price,
              original_price: i.originalPrice,
              type: i.type || 'product',
              exclude_from_discount: Boolean(i.exclude_from_discount),
            })),
            payment_method: paymentMethod,
            customer_name: customerName.trim() || 'Walk-in customer',
            customer_phone: customerPhone.replace(/\D/g, '').slice(-10) || null,
            order_channel: orderChannel === 'whatsapp' ? 'whatsapp' : 'pos',
            coupon_code: discountMode === 'coupon' ? (appliedCoupon?.coupon_code || normalizeCouponCode(couponInput)) : null,
            manual_discount_percent: discountMode === 'percent' && Number(manualPercent) > 0 ? Number(manualPercent) : null,
            manual_discount_paise: discountMode === 'fixed' && Number(manualFixedRs) > 0
              ? Math.round(Number(manualFixedRs) * 100)
              : null,
            bonus_redeem_paise: bonusRedeemPaise,
            bonus_redeem_confirmed: bonusRedeemPaise > 0 && applyYasvikBonus,
          });
          const data = res.data;
          if (!data?.success) throw new Error(data?.error || 'Sale failed');

          recordFrequentSale(cart);
          const barcodes = cart.map((i) => i.labelBarcode).filter(Boolean);
          if (barcodes.length) markLabelItemsSold(barcodes);

          setLastSale({
            ...data,
            payment_method: paymentMethod,
            customer_name: customerName.trim() || 'Walk-in customer',
            customer_phone: customerPhone.replace(/\D/g, '').slice(-10) || null,
            cash_received: paymentMethod === 'cash' && cashReceived ? Number(cashReceived) : null,
            change_due: paymentMethod === 'cash' && cashReceived ? changeDue : null,
            items: [...cart],
            offline: false,
            discount_paise: data.discount_paise ?? discountPreview.discountPaise,
            discount_label: data.discount_label || discountPreview.label,
            subtotal_paise: data.subtotal_paise ?? subtotalPaise,
            bonus_earned_paise: data.bonus_earned_paise,
            bonus_redeemed_paise: data.bonus_redeemed_paise,
            bonus_balance_after_paise: data.bonus_balance_after_paise,
            bonus_breakdown: data.bonus?.earn?.expires_at
              ? { expires_at: data.bonus.earn.expires_at }
              : data.bonus?.earn?.data?.expires_at
                ? { expires_at: data.bonus.earn.data.expires_at }
                : null,
          });
          setCart([]);
          setCustomerName('');
          setCustomerPhone('');
          setOrderChannel('pos');
          setCustomerCrmHint('');
          setBonusPreview(null);
          setApplyYasvikBonus(true);
          setBonusRedeemRs('');
          setCashReceived('');
          clearDiscount();
          clearPosSession();
          qc.invalidateQueries({ queryKey: ['pos-recent-orders'] });
          qc.invalidateQueries({ queryKey: ['admin-orders'] });
          refetchProducts();
          return;
        } catch (err) {
          if (!isLikelyNetworkError(err)) throw err;
        }
      }

      runOfflineSale();
    } catch (err) {
      setError(err.message || 'Could not complete sale');
    } finally {
      setCompleting(false);
    }
  }, [
    cart,
    paymentMethod,
    cashReceived,
    payableTotal,
    total,
    bonusRedeemPaise,
    applyYasvikBonus,
    customerName,
    customerPhone,
    orderChannel,
    changeDue,
    qc,
    offlineReady,
    pendingSummary.count,
    refreshPosOffline,
    productList,
    productsById,
    refetchProducts,
    discountMode,
    appliedCoupon,
    couponInput,
    manualPercent,
    manualFixedRs,
    discountPreview,
    subtotalPaise,
    clearDiscount,
  ]);

  const posTypingModalOpen = customOpen || Boolean(variantPick?.product) || Boolean(editingLine) || Boolean(lastSale);

  const { scannerRef, refocusScanner } = usePosBarcodeScanner({
    enabled: scannerEnabled && !posTypingModalOpen,
    onScan: resolveAndAdd,
  });

  useEffect(() => {
    refocusScannerRef.current = scannerEnabled
      ? refocusScanner
      : () => searchRef.current?.focus({ preventScroll: true });
  }, [scannerEnabled, refocusScanner]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        refocusScannerRef.current();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && cart.length) {
        e.preventDefault();
        completeSale();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cart.length, completeSale, refocusScannerRef]);

  useEffect(() => {
    if (scannerEnabled) refocusScanner();
  }, [scannerEnabled, refocusScanner]);

  const renderProductCard = (product) => {
    const variants = getSellableVariants(product);
    const hasVariants = variants.length > 0;
    const favKey = cartItemKey(product.id, product.sku, null);
    const pinned = isFavorite(favKey) || variants.some((v) => isFavorite(cartItemKey(product.id, v.sku, v.label)));

    return (
      <div key={product.id} className="bg-white rounded-xl border border-border/50 p-3 shadow-sm relative">
        <button
          type="button"
          onClick={() => {
            toggleFavorite(favKey, { productId: product.id, title: product.title || product.name });
            setFavVersion((v) => v + 1);
          }}
          className={`absolute top-2 right-2 p-1 rounded-full ${pinned ? 'text-warm-turmeric' : 'text-rain-cloud/20'}`}
          title="Pin to favorites"
        >
          <Star className="w-3.5 h-3.5" fill={pinned ? 'currentColor' : 'none'} />
        </button>
        <p className="font-inter text-sm text-rain-cloud font-semibold line-clamp-2 leading-snug pr-6">{product.title || product.name}</p>
        {product.sku && <p className="font-mono text-[10px] text-rain-cloud/40 mt-0.5">{product.sku}</p>}
        {hasVariants ? (
          <div className="mt-2 space-y-1">
            {variants.map((v, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => addToCart(product, v)}
                className="w-full text-left px-2.5 py-2 rounded-lg bg-muted/40 hover:bg-forest-canopy/15 active:scale-[0.98] font-inter text-xs text-rain-cloud border border-transparent hover:border-forest-canopy/20"
              >
                <span className="font-medium">{v.label}</span>
                <span className="float-right text-wet-earth font-semibold">₹{resolvePosVariantPrice(v, product)}</span>
              </button>
            ))}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => addToCart(product)}
            className="mt-2 w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-wet-earth text-white font-inter text-sm font-medium active:scale-[0.98]"
          >
            <span>Add</span>
            <span>₹{resolvePosVariantPrice(null, product) || product.price}</span>
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#f4f1ea] print:bg-white">
      <div className="relative shrink-0 z-20 bg-rain-cloud text-white px-4 py-2.5 print:hidden">
        <div className="flex items-center justify-between gap-3 min-h-[52px]">
          <div className="min-w-0 flex-1 basis-0">
            <p className="font-cormorant text-lg leading-tight font-semibold text-white">Yasvik Counter</p>
            <p className="font-inter text-[10px] text-white/75">
              {scannerEnabled ? 'Scanner active — scan without clicking search · F2 refocus' : 'Bill auto-saved · offline ready · F2 · ⌘+Enter'}
            </p>
          </div>

          <div className="pointer-events-none absolute inset-x-0 flex flex-col items-center justify-center px-[min(28rem,42vw)]">
            <YasvikLogo
              variant="horizontal"
              tone="light"
              framed
              imageClassName="h-7 md:h-8 w-auto max-w-[200px] object-contain"
            />
            {billFocus && (
              <p className="font-inter text-[9px] text-white/70 tracking-wide mt-0.5">Good Food · Fair Prices</p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end flex-1 basis-0">
          {cart.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-forest-canopy/25 border border-forest-canopy/40">
              <ShieldCheck className="w-3.5 h-3.5 text-warm-turmeric" />
              <span className="font-inter text-[10px] text-white/85">
                Draft · {cart.length} lines · ₹{payableTotal.toFixed(0)}
              </span>
            </div>
          )}
          {(pendingSummary.count > 0 || pendingSummary.failedCount > 0) && (
            <button
              type="button"
              onClick={async () => {
                const result = await syncNow();
                if (result?.synced) {
                  refetchProducts();
                  refetchCategories();
                  refetchToday();
                }
              }}
              disabled={posSyncing || !posOnline}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warm-turmeric/25 border border-warm-turmeric/50 font-inter text-[10px] hover:bg-warm-turmeric/35 disabled:opacity-50"
              title="Upload offline sales to cloud"
            >
              {posSyncing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CloudUpload className="w-3.5 h-3.5" />
              )}
              Sync {pendingSummary.count + pendingSummary.failedCount} sale
              {pendingSummary.count + pendingSummary.failedCount === 1 ? '' : 's'}
            </button>
          )}
          {!posOnline && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sun-dried-clay/30 border border-sun-dried-clay/50 font-inter text-[10px]">
              <WifiOff className="w-3.5 h-3.5" />
              Offline billing
            </div>
          )}
          <PosOnlineOrderAlertToggle
            alertsEnabled={onlineAlertsEnabled}
            onToggle={() => setOnlineAlertsEnabled(!onlineAlertsEnabled)}
            notificationPermission={notificationPermission}
            onRequestNotifications={requestNotificationPermission}
            pendingCount={onlineOrderAlerts.length}
          />
          <button
            type="button"
            onClick={openCounterWindow}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-white/20 font-inter text-[10px] hover:bg-white/10"
            title="Open billing in a dedicated window"
          >
            <ExternalLink className="w-3 h-3" />
            Counter window
          </button>
          <button
            type="button"
            onClick={refreshCatalog}
            disabled={catalogRefreshing || !posOnline}
            className="p-2 rounded-full border border-white/20 hover:bg-white/10 disabled:opacity-50"
            title="Refresh product catalog and today's tally"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${catalogRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <div className="text-right">
            <p className="font-inter text-[10px] text-white/45 uppercase tracking-wider">Today (POS)</p>
            <p className="font-cormorant text-xl">{todayBillCount} bills · ₹{todayTotal.toLocaleString('en-IN')}</p>
          </div>
          <Link to="/admin/orders" className="px-3 py-1.5 rounded-full border border-white/20 font-inter text-xs hover:bg-white/10">
            All orders
          </Link>
          </div>
        </div>
      </div>

      {/* Hidden scanner capture — USB QR/barcode scanners type here + Enter */}
      <input
        ref={scannerRef}
        type="text"
        inputMode="none"
        autoComplete="off"
        aria-hidden="true"
        tabIndex={-1}
        className="sr-only"
        data-testid="pos-scanner-input"
      />

      <div className={`flex-1 min-h-0 flex flex-col p-3 md:p-4 mx-auto w-full print:hidden ${billFocus ? 'max-w-[1800px]' : 'max-w-[1500px]'}`}>
        <PosOnlineOrderAlertBanner
          alerts={onlineOrderAlerts}
          alertsEnabled={onlineAlertsEnabled}
          onToggleAlerts={() => setOnlineAlertsEnabled(!onlineAlertsEnabled)}
          onDismiss={dismissOnlineAlert}
          onDismissAll={dismissAllOnlineAlerts}
          notificationPermission={notificationPermission}
          onRequestNotifications={requestNotificationPermission}
        />
        {draftNotice && (
          <div className="mb-3 shrink-0 flex items-center gap-2 rounded-xl border border-forest-canopy/30 bg-forest-canopy/10 px-4 py-2.5">
            <ShieldCheck className="w-4 h-4 text-forest-canopy shrink-0" />
            <p className="font-inter text-sm text-rain-cloud">{draftNotice} — safe to refresh or switch tabs</p>
          </div>
        )}
        {(!offlineReady || !posOnline) && (
          <div className={`mb-3 shrink-0 rounded-xl border px-4 py-3 flex flex-wrap items-center justify-between gap-3 ${
            posOnline ? 'border-warm-turmeric/40 bg-warm-turmeric/10' : 'border-sun-dried-clay/40 bg-sun-dried-clay/10'
          }`}>
            <div className="flex items-start gap-2">
              {posOnline ? <CloudOff className="w-4 h-4 text-warm-turmeric shrink-0 mt-0.5" /> : <WifiOff className="w-4 h-4 text-sun-dried-clay shrink-0 mt-0.5" />}
              <div>
                <p className="font-inter text-sm font-medium text-rain-cloud">
                  {posOnline ? 'Offline catalog not ready' : 'Offline billing mode'}
                </p>
                <p className="font-inter text-xs text-rain-cloud/60 mt-0.5">
                  {offlineReady
                    ? `Catalog saved ${catalogAge || 'locally'} · sales sync when you connect internet`
                    : 'Connect internet once, open POS, and tap Refresh products before going offline.'}
                </p>
                {syncMessage ? <p className="font-inter text-xs text-forest-canopy mt-1">{syncMessage}</p> : null}
              </div>
            </div>
            {posOnline && (
              <button
                type="button"
                onClick={refreshCatalog}
                disabled={catalogRefreshing}
                className="shrink-0 rounded-full border border-border bg-white px-4 py-2 font-inter text-xs text-rain-cloud hover:bg-rain-mist disabled:opacity-50"
              >
                {catalogRefreshing ? 'Refreshing…' : 'Refresh products'}
              </button>
            )}
          </div>
        )}
        <div className={`flex-1 min-h-0 grid grid-cols-1 gap-4 items-stretch overflow-y-auto xl:overflow-visible ${billFocus ? 'xl:grid-cols-12' : 'xl:grid-cols-5'}`}>
          <div className={`flex flex-col min-h-0 h-full min-w-0 gap-3 overflow-hidden ${billFocus ? 'xl:col-span-5' : 'xl:col-span-3'}`}>
            <div className="shrink-0 flex flex-wrap items-center gap-2">
              {BROWSE_TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setBrowseTab(tab.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full font-inter text-xs font-medium border ${
                      browseTab === tab.id ? 'bg-white border-forest-canopy text-rain-cloud shadow-sm' : 'border-border/60 text-rain-cloud/55'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setScannerEnabled((v) => !v)}
                className={`ml-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-full font-inter text-xs border ${
                  scannerEnabled ? 'bg-forest-canopy/15 border-forest-canopy text-forest-canopy' : 'border-border text-rain-cloud/50'
                }`}
              >
                <ScanLine className="w-3.5 h-3.5" />
                Scanner {scannerEnabled ? 'on' : 'off'}
              </button>
              <button
                type="button"
                onClick={refreshCatalog}
                disabled={catalogRefreshing || !posOnline}
                className="inline-flex items-center gap-1 px-2.5 py-2 rounded-full border border-border text-rain-cloud/45 font-inter text-xs disabled:opacity-50"
                title="Refresh products and update offline catalog"
              >
                <RefreshCw className={`w-3 h-3 ${catalogRefreshing ? 'animate-spin' : ''}`} />
                {catalogRefreshing ? 'Refreshing…' : offlineReady ? 'Refresh' : 'Load offline catalog'}
              </button>
            </div>

            {browseTab === 'browse' && (
              <div className="shrink-0 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <button
                  type="button"
                  onClick={() => setCategoryId('all')}
                  className={`shrink-0 px-3 py-1.5 rounded-full font-inter text-xs border ${
                    categoryId === 'all' ? 'bg-rain-cloud text-white border-rain-cloud' : 'bg-white border-border text-rain-cloud/60'
                  }`}
                >
                  All
                </button>
                {catalog.categoryList.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={`shrink-0 px-3 py-1.5 rounded-full font-inter text-xs border ${
                      categoryId === cat.id ? 'bg-rain-cloud text-white border-rain-cloud' : 'bg-white border-border text-rain-cloud/60'
                    }`}
                  >
                    {cat.parent_label
                      ? `${cat.parent_label} › ${cat.emotional_title || cat.name}`
                      : (cat.emotional_title || cat.name)} ({cat.products.length})
                  </button>
                ))}
                {catalog.uncategorized.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCategoryId('uncategorized')}
                    className={`shrink-0 px-3 py-1.5 rounded-full font-inter text-xs border ${
                      categoryId === 'uncategorized' ? 'bg-rain-cloud text-white border-rain-cloud' : 'bg-white border-border text-rain-cloud/60'
                    }`}
                  >
                    Other ({catalog.uncategorized.length})
                  </button>
                )}
              </div>
            )}

            <div className="shrink-0 flex gap-2 items-stretch">
              <div className="relative flex-1 min-w-0" data-pos-allow-typing="true">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-rain-cloud/35 pointer-events-none" />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); tryAddFromSearch(); } }}
                  placeholder={scannerEnabled ? 'Click here to type · name or SKU · Enter to add' : 'Search name, SKU, or scan label QR… Enter to add'}
                  data-pos-allow-typing="true"
                  className={`w-full pl-10 pr-4 py-3.5 border-2 rounded-2xl font-inter text-base bg-white focus:outline-none shadow-sm transition-colors ${
                    scanFlash === 'ok' ? 'border-forest-canopy' : scanFlash === 'error' ? 'border-red-400' : 'border-border focus:border-forest-canopy'
                  }`}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setCustomOpen(true);
                }}
                className="shrink-0 inline-flex items-center gap-1.5 px-3.5 rounded-2xl border-2 border-rain-cloud/15 bg-white font-inter text-xs font-semibold text-rain-cloud hover:border-forest-canopy hover:text-forest-canopy shadow-sm"
                title="Add a product not in catalog"
              >
                <PackagePlus className="w-4 h-4" />
                New item
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            {catalogLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-28 bg-white/60 rounded-xl animate-pulse" />)}
              </div>
            ) : browseTab === 'frequent' ? (
              frequentTiles.length === 0 ? (
                <p className="text-center py-12 font-inter text-sm text-rain-cloud/45">Frequent items appear after you bill them a few times.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pb-2">
                  {frequentTiles.map((tile) => (
                    <button
                      key={tile.key}
                      type="button"
                      onClick={() => addFrequentOrFavorite(tile)}
                      className="bg-white rounded-xl border border-border/50 p-3 text-left hover:border-forest-canopy/30"
                    >
                      <p className="font-inter text-sm font-semibold text-rain-cloud line-clamp-2">{tile.title}</p>
                      {tile.variant && <p className="font-inter text-[10px] text-rain-cloud/40">{tile.variant}</p>}
                      <p className="font-inter text-[10px] text-rain-cloud/35 mt-1">Billed {tile.count}×</p>
                    </button>
                  ))}
                </div>
              )
            ) : browseTab === 'favorites' ? (
              favoriteTiles.length === 0 ? (
                <p className="text-center py-12 font-inter text-sm text-rain-cloud/45">Star products while browsing to pin them here.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pb-2">
                  {favoriteTiles.map((tile) => (
                    <button
                      key={tile.key}
                      type="button"
                      onClick={() => addFrequentOrFavorite(tile)}
                      className="bg-white rounded-xl border border-warm-turmeric/30 p-3 text-left"
                    >
                      <p className="font-inter text-sm font-semibold text-rain-cloud line-clamp-2">{tile.title}</p>
                      {tile.variant && <p className="font-inter text-[10px] text-rain-cloud/40">{tile.variant}</p>}
                    </button>
                  ))}
                </div>
              )
            ) : filtered.length === 0 ? (
              <p className="text-center py-12 font-inter text-sm text-rain-cloud/45">No products in this category.</p>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pb-2">
                  {filtered.map(renderProductCard)}
                </div>
            )}
            </div>
          </div>

          <div className={`flex flex-col min-h-0 h-full min-w-0 ${billFocus ? 'xl:col-span-7' : 'xl:col-span-2'}`}>
            <div
              className={`flex flex-col h-full min-h-0 bg-white rounded-2xl border-2 border-rain-cloud/10 shadow-md ${
                billFocus ? 'ring-2 ring-forest-canopy/10' : ''
              }`}
            >
              <div className={`flex flex-col flex-1 min-h-0 overflow-y-auto ${billFocus ? 'p-4 md:p-5' : 'p-4'}`}>
              <div className="shrink-0 flex items-start justify-between gap-3 mb-3">
                <h3 className={`text-rain-cloud flex items-center gap-2 min-w-0 ${billFocus ? 'font-cormorant text-xl md:text-2xl' : 'font-cormorant text-xl'}`}>
                  <Receipt className={billFocus ? 'w-5 h-5' : 'w-4 h-4'} />
                  <span className="truncate">{billFocus ? 'Your bill' : 'Current bill'}</span>
                  {cart.length > 0 && (
                    <span className={`font-inter text-rain-cloud/40 shrink-0 ${billFocus ? 'text-sm' : 'text-xs'}`}>
                      ({cart.length} {cart.length === 1 ? 'item' : 'items'})
                    </span>
                  )}
                </h3>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {billFocus && cart.length > 0 && (
                    <p className="font-cormorant text-3xl md:text-4xl text-rain-cloud font-semibold tabular-nums leading-none">
                      ₹{payableTotal.toFixed(0)}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setCustomOpen(true);
                      }}
                      className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1.5 font-inter text-[11px] font-semibold text-rain-cloud/70 hover:border-forest-canopy hover:text-forest-canopy"
                      title="Add item to bill (name, price, qty)"
                    >
                      <PackagePlus className="w-3.5 h-3.5" />
                      New item
                    </button>
                    {cart.length > 0 && (
                      <button type="button" onClick={clearBill} className="p-2 text-rain-cloud/40 hover:text-red-400" title="Clear bill">
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {!billFocus && (
              <div className="shrink-0 space-y-2 mb-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-rain-cloud/30" />
                    <input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Customer name"
                      data-pos-allow-typing="true"
                      className="w-full pl-8 pr-2 py-2 border border-border rounded-xl font-inter text-sm text-rain-cloud"
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-rain-cloud/30" />
                    <input
                      value={customerPhone}
                      onChange={(e) => {
                        setCustomerPhone(e.target.value);
                        setCustomerCrmHint('');
                        setBonusPreview(null);
                      }}
                      onBlur={handleCustomerPhoneBlur}
                      placeholder="Phone"
                      inputMode="tel"
                      data-pos-allow-typing="true"
                      className="w-full pl-8 pr-2 py-2 border border-border rounded-xl font-inter text-sm text-rain-cloud"
                    />
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {[
                    { id: 'pos', label: 'Store' },
                    { id: 'whatsapp', label: 'WhatsApp' },
                  ].map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => setOrderChannel(ch.id)}
                      className={`flex-1 py-1.5 rounded-full font-inter text-[11px] border ${
                        orderChannel === ch.id
                          ? 'bg-rain-cloud text-white border-rain-cloud'
                          : 'border-border text-rain-cloud/55'
                      }`}
                    >
                      {ch.label}
                    </button>
                  ))}
                </div>
                {customerCrmHint ? (
                  <p className="font-inter text-[10px] text-forest-canopy">{customerCrmHint}</p>
                ) : null}
              </div>
              )}

              <div
                className={`flex-1 min-h-[12rem] md:min-h-[16rem] overflow-y-auto overscroll-contain ${
                  billFocus ? 'space-y-0' : 'space-y-2 border-y border-border/30 py-3 my-1'
                }`}
              >
                {cart.length === 0 && (
                  <div className={`text-center py-8 ${billFocus ? 'py-12' : 'py-6'}`}>
                    {billFocus ? (
                      <>
                        <p className="font-cormorant text-2xl text-rain-cloud/70">Welcome to Yasvik</p>
                        <p className="font-inter text-sm text-rain-cloud/45 mt-2 max-w-xs mx-auto">
                          Your items will appear here as we scan them at the counter.
                        </p>
                      </>
                    ) : (
                      <p className="font-inter text-rain-cloud/40 text-xs">Scan barcode, tap products, or add custom line</p>
                    )}
                  </div>
                )}
                {cart.map((item) => (
                  billFocus ? (
                    <div key={item.key} className="flex items-center justify-between gap-3 py-3 px-1 border-b border-border/20 last:border-0 group">
                      <div className="min-w-0 flex-1">
                        <p className="font-inter text-base md:text-lg text-rain-cloud font-medium leading-snug">
                          {item.title}
                          {item.exclude_from_discount ? (
                            <span className="ml-2 align-middle rounded-full bg-amber-50 px-2 py-0.5 font-inter text-[9px] font-bold uppercase tracking-wider text-amber-800">
                              No discount
                            </span>
                          ) : null}
                        </p>
                        <p className="font-inter text-sm text-rain-cloud/50 mt-0.5">
                          {[item.variant, item.qty > 1 ? `Qty ${item.qty}` : null].filter(Boolean).join(' · ')}
                        </p>
                        {discountPreview.discountPaise > 0 ? (
                          <button
                            type="button"
                            onClick={() => toggleLineDiscountExclusion(item.key)}
                            className="mt-1 font-inter text-[11px] font-semibold text-forest-canopy underline-offset-2 hover:underline"
                          >
                            {item.exclude_from_discount ? 'Include in discount' : 'Exclude from discount'}
                          </button>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => updateQty(item.key, item.qty - 1)}
                            className="w-10 h-10 rounded-lg border flex items-center justify-center bg-white active:scale-[0.97]"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center font-inter text-base font-semibold tabular-nums">{item.qty}</span>
                          <button
                            type="button"
                            onClick={() => updateQty(item.key, item.qty + 1)}
                            className="w-10 h-10 rounded-lg border flex items-center justify-center bg-white active:scale-[0.97]"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="w-[6.5rem] text-right tabular-nums">
                          {cartPricingByKey.get(item.key)?.discountAllocated > 0 ? (
                            <p className="font-inter text-xs text-rain-cloud/35 line-through">
                              ₹{cartPricingByKey.get(item.key).originalLineTotal.toFixed(2)}
                            </p>
                          ) : null}
                          <p className="font-inter text-lg md:text-xl font-semibold text-rain-cloud">
                            ₹{(cartPricingByKey.get(item.key)?.finalLineTotal ?? item.price * item.qty).toFixed(2)}
                          </p>
                          {cartPricingByKey.get(item.key)?.discountAllocated > 0 ? (
                            <p className="font-inter text-[10px] font-semibold text-forest-canopy">
                              Saved ₹{cartPricingByKey.get(item.key).discountAllocated.toFixed(2)}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : (
                  <div key={item.key} className="flex items-center gap-2 group">
                    <button type="button" onClick={() => setEditingLine(item)} className="flex-1 min-w-0 text-left">
                      <p className={`font-inter text-rain-cloud font-medium truncate ${billFocus ? 'text-base md:text-lg' : 'text-sm'}`}>
                        {item.title}
                        {item.priceOverridden && <span className="text-sun-dried-clay text-[10px] ml-1">override</span>}
                        {item.exclude_from_discount && <span className="text-amber-700 text-[10px] ml-1">no disc.</span>}
                      </p>
                      <p className={`font-inter text-rain-cloud/40 truncate ${billFocus ? 'text-sm text-rain-cloud/55' : 'text-[10px]'}`}>
                        {[item.variant, !billFocus && item.sku, item.type === 'custom' ? 'custom' : null].filter(Boolean).join(' · ')}
                      </p>
                    </button>
                    {discountPreview.discountPaise > 0 || item.exclude_from_discount ? (
                      <button
                        type="button"
                        onClick={() => toggleLineDiscountExclusion(item.key)}
                        title={item.exclude_from_discount ? 'Include in discount' : 'Exclude from discount'}
                        className={`rounded-lg border px-1.5 py-1 font-inter text-[9px] font-bold uppercase tracking-wide ${
                          item.exclude_from_discount
                            ? 'border-amber-300 bg-amber-50 text-amber-800'
                            : 'border-border text-rain-cloud/45 hover:border-forest-canopy/40 hover:text-forest-canopy'
                        }`}
                      >
                        {item.exclude_from_discount ? 'No disc' : 'Disc'}
                      </button>
                    ) : null}
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => updateQty(item.key, item.qty - 1)}
                        className={`rounded-lg border flex items-center justify-center bg-white ${billFocus ? 'w-10 h-10' : 'w-8 h-8'}`}
                      >
                        <Minus className={billFocus ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
                      </button>
                      <span className={`text-center font-inter font-semibold ${billFocus ? 'w-8 text-lg' : 'w-6 text-sm'}`}>{item.qty}</span>
                      <button
                        type="button"
                        onClick={() => updateQty(item.key, item.qty + 1)}
                        className={`rounded-lg border flex items-center justify-center bg-white ${billFocus ? 'w-10 h-10' : 'w-8 h-8'}`}
                      >
                        <Plus className={billFocus ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
                      </button>
                    </div>
                    <div className="w-20 text-right tabular-nums">
                      {cartPricingByKey.get(item.key)?.discountAllocated > 0 ? (
                        <p className="font-inter text-[9px] text-rain-cloud/35 line-through">
                          ₹{cartPricingByKey.get(item.key).originalLineTotal.toFixed(2)}
                        </p>
                      ) : null}
                      <p className="font-inter text-sm font-semibold text-rain-cloud">
                        ₹{(cartPricingByKey.get(item.key)?.finalLineTotal ?? item.price * item.qty).toFixed(2)}
                      </p>
                      {cartPricingByKey.get(item.key)?.discountAllocated > 0 ? (
                        <p className="font-inter text-[9px] text-forest-canopy">
                          Save ₹{cartPricingByKey.get(item.key).discountAllocated.toFixed(2)}
                        </p>
                      ) : null}
                    </div>
                    <button type="button" onClick={() => setEditingLine(item)} className="text-rain-cloud/25 hover:text-forest-canopy p-1 opacity-0 group-hover:opacity-100"><Pencil className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={() => updateQty(item.key, 0)} className="text-rain-cloud/25 hover:text-red-400 p-1"><Trash2 className={`${billFocus ? 'w-4 h-4' : 'w-3.5 h-3.5'}`} /></button>
                  </div>
                  )
                ))}
              </div>

              <div className="shrink-0 pt-2 mt-auto border-t border-border/30 space-y-2 bg-white">
              {billFocus && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-rain-cloud/30" />
                    <input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Customer name"
                      data-pos-allow-typing="true"
                      className="w-full pl-8 pr-2 py-2 border border-border rounded-xl font-inter text-sm text-rain-cloud"
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-rain-cloud/30" />
                    <input
                      value={customerPhone}
                      onChange={(e) => {
                        setCustomerPhone(e.target.value);
                        setCustomerCrmHint('');
                        setBonusPreview(null);
                      }}
                      onBlur={handleCustomerPhoneBlur}
                      placeholder="Phone"
                      inputMode="tel"
                      data-pos-allow-typing="true"
                      className="w-full pl-8 pr-2 py-2 border border-border rounded-xl font-inter text-sm text-rain-cloud"
                    />
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                <p className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/40">Discount</p>
                <div className="flex flex-wrap gap-1.5">
                  {POS_QUICK_PERCENTS.map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => {
                        setDiscountMode('percent');
                        setManualPercent(String(pct));
                        setManualFixedRs('');
                        setAppliedCoupon(null);
                        setCouponError('');
                        setCustomPercentOpen(false);
                      }}
                      className={`rounded-full border px-2.5 py-1 font-inter text-xs ${
                        discountMode === 'percent' && Number(manualPercent) === pct
                          ? 'border-forest-canopy bg-forest-canopy/10 text-forest-canopy'
                          : 'border-border text-rain-cloud/60'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountMode('percent');
                      setCustomPercentOpen(true);
                      setManualFixedRs('');
                      setAppliedCoupon(null);
                    }}
                    className={`rounded-full border px-2.5 py-1 font-inter text-xs ${
                      customPercentOpen || (discountMode === 'percent' && !POS_QUICK_PERCENTS.includes(Number(manualPercent)))
                        ? 'border-forest-canopy bg-forest-canopy/10 text-forest-canopy'
                        : 'border-border text-rain-cloud/60'
                    }`}
                  >
                    <Percent className="mr-0.5 inline h-3 w-3" />
                    Custom %
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountMode('fixed');
                      setManualPercent('');
                      setAppliedCoupon(null);
                      setCustomPercentOpen(false);
                    }}
                    className={`rounded-full border px-2.5 py-1 font-inter text-xs ${
                      discountMode === 'fixed' ? 'border-forest-canopy bg-forest-canopy/10 text-forest-canopy' : 'border-border text-rain-cloud/60'
                    }`}
                  >
                    ₹ off
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountMode('coupon');
                      setManualPercent('');
                      setManualFixedRs('');
                      setCustomPercentOpen(false);
                    }}
                    className={`rounded-full border px-2.5 py-1 font-inter text-xs ${
                      discountMode === 'coupon' ? 'border-forest-canopy bg-forest-canopy/10 text-forest-canopy' : 'border-border text-rain-cloud/60'
                    }`}
                  >
                    <Ticket className="mr-0.5 inline h-3 w-3" />
                    Coupon
                  </button>
                  {discountMode !== 'none' && (
                    <button
                      type="button"
                      onClick={clearDiscount}
                      className="rounded-full border border-border px-2.5 py-1 font-inter text-xs text-rain-cloud/45"
                    >
                      Clear
                    </button>
                  )}
                </div>
                {(customPercentOpen || (discountMode === 'percent' && !POS_QUICK_PERCENTS.includes(Number(manualPercent)))) && (
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={manualPercent}
                    onChange={(e) => {
                      setDiscountMode('percent');
                      setManualPercent(e.target.value);
                    }}
                    placeholder="Custom %"
                    data-pos-allow-typing="true"
                    className="w-full rounded-xl border border-border px-3 py-2 font-inter text-sm"
                  />
                )}
                {discountMode === 'fixed' && (
                  <input
                    type="number"
                    min="0"
                    value={manualFixedRs}
                    onChange={(e) => setManualFixedRs(e.target.value)}
                    placeholder="Amount off (₹)"
                    data-pos-allow-typing="true"
                    className="w-full rounded-xl border border-border px-3 py-2 font-inter text-sm"
                  />
                )}
                {discountMode === 'coupon' && (
                  <div className="flex gap-2">
                    <input
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="Code e.g. MONSOON10"
                      data-pos-allow-typing="true"
                      className="min-w-0 flex-1 rounded-xl border border-border px-3 py-2 font-mono text-sm uppercase"
                    />
                    <button
                      type="button"
                      onClick={applyCouponCode}
                      disabled={couponBusy || !couponInput.trim()}
                      className="rounded-xl bg-rain-cloud px-3 py-2 font-inter text-xs text-white disabled:opacity-50"
                    >
                      {couponBusy ? '…' : 'Apply'}
                    </button>
                  </div>
                )}
                {couponError ? <p className="font-inter text-[11px] text-amber-700">{couponError}</p> : null}
                {discountFloor.breaches.length > 0 ? (
                  <div className="rounded-xl border border-amber-300/70 bg-amber-50 px-3 py-2 space-y-1.5">
                    <p className="font-inter text-[11px] font-semibold text-amber-900">
                      {discountFloor.breaches.length} item{discountFloor.breaches.length === 1 ? '' : 's'} go below cost at {Number(manualPercent)}%
                    </p>
                    <p className="font-inter text-[10px] text-amber-800/80 leading-snug">
                      {discountFloor.breaches.slice(0, 3).map((b) => b.title).join(', ')}
                      {discountFloor.breaches.length > 3 ? ` +${discountFloor.breaches.length - 3} more` : ''}
                    </p>
                    {discountFloor.maxSafePercent < Number(manualPercent) ? (
                      <button
                        type="button"
                        onClick={() => {
                          setDiscountMode('percent');
                          setManualPercent(String(discountFloor.maxSafePercent));
                          setCustomPercentOpen(true);
                        }}
                        className="rounded-full border border-amber-400/80 bg-white px-2.5 py-1 font-inter text-[10px] font-semibold text-amber-900"
                      >
                        Use safe {discountFloor.maxSafePercent}% instead
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <PosYasvikBonusPanel
                preview={bonusPreview}
                busy={bonusPreviewBusy}
                billTotal={total}
                applyBonus={applyYasvikBonus}
                onApplyChange={setApplyYasvikBonus}
                redeemRs={bonusRedeemRs}
                onRedeemRsChange={setBonusRedeemRs}
                online={posOnline}
                compact={billFocus}
              />

              <div className={`grid grid-cols-3 gap-2 ${billFocus ? 'gap-3' : ''}`}>
                {PAYMENT_MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={`rounded-xl font-inter font-medium border-2 ${
                      billFocus ? 'py-2.5 text-sm' : 'py-2.5 text-sm'
                    } ${
                      paymentMethod === m.id ? 'bg-rain-cloud text-white border-rain-cloud' : 'border-border text-rain-cloud/60 bg-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {paymentMethod === 'cash' && (
                <div>
                  <input
                    type="number"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    placeholder="Cash received (optional)"
                    data-pos-allow-typing="true"
                    className={`w-full px-3 border border-border rounded-xl font-inter mb-1 ${billFocus ? 'py-3 text-base' : 'py-2 text-sm'}`}
                  />
                  {cashReceived && Number(cashReceived) >= payableTotal && (
                    <p className={`font-inter text-forest-canopy font-medium ${billFocus ? 'text-base' : 'text-xs'}`}>
                      Change: ₹{changeDue.toFixed(0)}
                    </p>
                  )}
                </div>
              )}

              <div className={`space-y-1 rounded-xl bg-muted/30 ${billFocus ? 'py-2.5 px-3' : 'py-2 px-1'}`}>
                <div className="flex items-center justify-between font-inter text-xs text-rain-cloud/55">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toFixed(0)}</span>
                </div>
                {discountPreview.discountPaise > 0 && (
                  <div className="flex items-center justify-between font-inter text-xs text-forest-canopy">
                    <span>Discount {discountPreview.label ? `(${discountPreview.label})` : ''}</span>
                    <span>−₹{discountRs.toFixed(0)}</span>
                  </div>
                )}
                {excludedDiscountCount > 0 && discountPreview.discountPaise > 0 ? (
                  <p className="font-inter text-[10px] text-amber-800/80">
                    {excludedDiscountCount} item{excludedDiscountCount === 1 ? '' : 's'} excluded from discount
                  </p>
                ) : null}
                {bonusRedeemPaise > 0 && (
                  <div className="flex items-center justify-between font-inter text-xs text-forest-canopy">
                    <span>Yasvik Bonus</span>
                    <span>−₹{bonusRedeemAmountRs.toFixed(0)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1">
                  <span className={`text-rain-cloud ${billFocus ? 'font-cormorant text-xl' : 'font-cormorant text-xl'}`}>
                    {bonusRedeemPaise > 0 ? 'Pay now' : 'Total'}
                  </span>
                  <span className={`text-rain-cloud font-semibold tabular-nums ${billFocus ? 'font-cormorant text-3xl md:text-4xl' : 'font-cormorant text-3xl'}`}>
                    ₹{payableTotal.toFixed(0)}
                  </span>
                </div>
              </div>

              {error && <p className="font-inter text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

              <button
                type="button"
                onClick={downloadProvisionalBill}
                disabled={!cart.length || completing || provisionalBusy}
                className={`w-full rounded-2xl border-2 border-forest-canopy/30 bg-white text-forest-canopy font-inter font-semibold flex items-center justify-center gap-2 disabled:opacity-40 ${
                  billFocus ? 'py-3.5 text-sm' : 'py-3 text-sm'
                }`}
              >
                {provisionalBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Provisional bill / estimate PDF
              </button>

              <button
                type="button"
                onClick={completeSale}
                disabled={!cart.length || completing || provisionalBusy}
                className={`w-full bg-wet-earth text-white rounded-2xl font-inter font-semibold flex items-center justify-center gap-2 disabled:opacity-40 shadow-lg ${
                  billFocus ? 'py-4 text-base' : 'py-4 text-base'
                }`}
              >
                {completing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                Complete · print receipt / invoice
              </button>
              </div>
              </div>
            </div>

            {!billFocus && todayBillRows.length > 0 && (
              <div className="bg-white rounded-2xl border border-border/50 p-4">
                <p className="font-inter text-xs font-medium text-rain-cloud/50 uppercase tracking-wider mb-2">Today&apos;s bills</p>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {todayBillRows.map((row) => (
                    <div key={row.id} className="flex justify-between font-inter text-xs text-rain-cloud/70">
                      <span className="truncate">{row.label}</span>
                      <span className="font-medium">₹{row.amount.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <PosVariantPicker
        open={Boolean(variantPick?.product)}
        product={variantPick?.product}
        onClose={() => {
          setVariantPick(null);
          refocusScannerRef.current();
        }}
        onSelect={(variant) => {
          const pick = variantPick;
          setVariantPick(null);
          if (!pick?.product) return;
          finishProductAdd(pick.product, variant, pick.extras || {});
        }}
      />
      <PosCustomLineDialog open={customOpen} onClose={() => setCustomOpen(false)} onAdd={addCustomLine} />
      <PosLineEditor item={editingLine} onClose={() => setEditingLine(null)} onSave={saveLineEdit} />
      {lastSale && (
        <PosSaleDocuments
          sale={lastSale}
          onDone={() => {
            setLastSale(null);
            if (scannerEnabled) refocusScannerRef.current();
            else searchRef.current?.focus();
          }}
        />
      )}
    </div>
  );
}
