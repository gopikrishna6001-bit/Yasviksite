import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { products, categories } from '@/services/api';
import { appClient } from '@/api/appClient';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminCollapseSection from '../../components/admin/AdminCollapseSection';
import ProductFormDrawer from '../../components/admin/ProductFormDrawer';
import {
  PRODUCT_EDITOR_EMPTY,
  buildProductSavePayload,
  isPrepackedComboInventory,
  normalizeEditorList,
  productToEditorForm,
  validateProductVariantsForSave,
} from '@/lib/adminProductFormUtils';
import { fetchBundleForProduct, saveProductBundle } from '@/services/productRelationsApi';
import {
  PRODUCT_KINDS,
  isSellableBundleProduct,
  sumBundleNetWeightGrams,
  validateBundleForPublish,
  validateBundleForSave,
} from '@/lib/productBundleUtils';
import { Plus, Search, Barcode, Download, Upload, FileSpreadsheet, FileText, ExternalLink, Copy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import AdminCatalogueTabs from '../../components/admin/AdminCatalogueTabs';
import {
  CUSTOMER_SHOP_URL,
  buildCustomerPriceListRows,
  downloadCustomerPriceListExcel,
  downloadCustomerPriceListPdf,
  buildCustomerPriceListWhatsAppText,
} from '@/lib/customerPriceList';
import ProductMobileQuickCard from '../../components/admin/ProductMobileQuickCard';
import SpreadsheetImportDialog from '../../components/admin/SpreadsheetImportDialog';
import AdminNumberBox from '../../components/admin/AdminNumberBox';
import { getProductEffectiveStock } from '@/lib/productStockUtils';
import { reassignAllProductSkus } from '@/lib/productSku';
import { exportSkuBarcodePdf } from '@/lib/skuBarcodeLabel';
import { buildCategorySelectOptions, expandCategoryFilterIds } from '@/lib/categoryTree';
import ProductQuickOpsRow from '../../components/admin/ProductQuickOpsRow';
import { ADMIN_PRODUCT_SORT_OPTIONS, sortAdminProducts, buildQuickOpsNonStockPayload, isQuickOpsNonStockDirty, isQuickOpsStockDirty, productToQuickOpsDraft } from '@/lib/productQuickOpsUtils';
import {
  computeBulkStockAdjustment,
  computeQuickOpsStockAdjustments,
} from '@/lib/quickOpsStockAdjustments';
import {
  applyProductSpreadsheetImport,
  downloadProductSpreadsheet,
  parseProductSpreadsheetFile,
  planProductSpreadsheetImport,
  buildSpreadsheetImportPreview,
} from '@/lib/productSpreadsheet';
import { invalidatePublicProductQueries } from '@/lib/productQueryInvalidation';

const EMPTY = PRODUCT_EDITOR_EMPTY;

const STATUS_FILTERS = ['all', 'published', 'draft', 'low_stock', 'out_of_stock'];
const ADMIN_PRODUCTS_PAGE_SIZE = 50;
const normalizeList = normalizeEditorList;

function productToDuplicateForm(item = {}) {
  const base = productToEditorForm(item);
  const baseTitle = (base.title || 'Product').trim();

  const {
    id: _id,
    created_date: _createdDate,
    updated_date: _updatedDate,
    created_at: _createdAt,
    updated_at: _updatedAt,
    slug: _slug,
    sku: _sku,
    product_code: _code,
    seo_title: _seoTitle,
    seo_description: _seoDesc,
    seo_keywords: _seoKeys,
    ...rest
  } = base;

  return {
    ...rest,
    title: `${baseTitle} (Copy)`,
    slug: '',
    sku: '',
    product_code: '',
    seo_title: '',
    seo_description: '',
    seo_keywords: '',
    is_published: true,
    is_featured: false,
    featured_in_hero: false,
    variants: normalizeList(rest.variants).map((variant) => ({
      ...variant,
      sku: '',
    })),
  };
}

export default function AdminProducts() {
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerInitialTab, setDrawerInitialTab] = useState('basic');
  const [editing, setEditing] = useState(null);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [productPage, setProductPage] = useState(0);
  const [bulkStockKg, setBulkStockKg] = useState('10');
  const [savingOpsId, setSavingOpsId] = useState(null);
  const [savedOpsId, setSavedOpsId] = useState(null);
  const [pendingOps, setPendingOps] = useState({});
  const [batchSaving, setBatchSaving] = useState(false);
  const [barcodeExportBusy, setBarcodeExportBusy] = useState(false);
  const [spreadsheetImportBusy, setSpreadsheetImportBusy] = useState(false);
  const [importDialog, setImportDialog] = useState(null);
  const [bulkStockPreviewOpen, setBulkStockPreviewOpen] = useState(false);
  const [bulkStockInStockOnly, setBulkStockInStockOnly] = useState(false);
  const [mobileStockSavingId, setMobileStockSavingId] = useState(null);
  const [priceListBusy, setPriceListBusy] = useState(false);
  const [priceListSellOnlineOnly, setPriceListSellOnlineOnly] = useState(true);
  const importInputRef = useRef(null);

  const { data: productList = [], isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => products.list('-created_date', 500),
  });
  const { data: categoryList = [] } = useQuery({
    queryKey: ['categories-all'],
    queryFn: () => categories.listActive(100),
  });
  const categoryFilterOptions = useMemo(
    () => buildCategorySelectOptions(categoryList, productList),
    [categoryList, productList],
  );

  const filtered = useMemo(() => {
    const categoryIds = categoryFilter === 'all'
      ? null
      : new Set(expandCategoryFilterIds(categoryFilter, categoryList));
    return productList.filter(p => {
      const matchSearch = !search || p.title?.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all'
        || (statusFilter === 'published' && p.is_published)
        || (statusFilter === 'draft' && !p.is_published)
        || (statusFilter === 'low_stock' && getProductEffectiveStock(p) > 0 && getProductEffectiveStock(p) <= (p.low_stock_threshold || 10))
        || (statusFilter === 'out_of_stock' && getProductEffectiveStock(p) === 0);
      const matchCategory = !categoryIds || categoryIds.has(p.category_id);
      return matchSearch && matchStatus && matchCategory;
    });
  }, [productList, search, statusFilter, categoryFilter, categoryList]);

  const sorted = useMemo(
    () => sortAdminProducts(filtered, sortBy),
    [filtered, sortBy],
  );

  useEffect(() => {
    setProductPage(0);
  }, [search, statusFilter, categoryFilter, sortBy]);

  const productPageCount = Math.max(1, Math.ceil(sorted.length / ADMIN_PRODUCTS_PAGE_SIZE));
  const safeProductPage = Math.min(productPage, productPageCount - 1);
  const pagedProducts = useMemo(() => {
    const start = safeProductPage * ADMIN_PRODUCTS_PAGE_SIZE;
    return sorted.slice(start, start + ADMIN_PRODUCTS_PAGE_SIZE);
  }, [sorted, safeProductPage]);
  const pageStart = sorted.length ? safeProductPage * ADMIN_PRODUCTS_PAGE_SIZE + 1 : 0;
  const pageEnd = Math.min(sorted.length, (safeProductPage + 1) * ADMIN_PRODUCTS_PAGE_SIZE);

  const bulkStockTargets = useMemo(() => {
    const base = filtered.length ? filtered : productList;
    if (!bulkStockInStockOnly) return base;
    return base.filter((p) => getProductEffectiveStock(p) > 0);
  }, [filtered, productList, bulkStockInStockOnly]);

  const createMut = useMutation({
    mutationFn: async (d) => {
      const created = await products.create(d);
      if (created?.id && isSellableBundleProduct({ ...d, ...created })) {
        await saveProductBundle({
          parentProductId: created.id,
          bundleId: d.bundle_id || null,
          bundle: {
            bundle_name: d.title || created.title || created.name,
            bundle_slug: d.slug || created.slug,
            bundle_description: d.short_description || '',
            bundle_type: d.product_kind === 'gift_box' ? 'gift_box' : 'bundle_combo',
            bundle_status: d.bundle_status || 'draft',
            inventory_mode: d.bundle_inventory_mode || d.inventory_mode || 'prepacked_stock',
            packaging_mode: 'separately_packed',
            substitution_policy: d.bundle_substitution_policy || null,
            total_net_weight_g: d.bundle_total_net_weight_g || sumBundleNetWeightGrams(d.bundle_items),
            item_count: (d.bundle_items || []).length,
            outer_packaging_cost_paise: d.bundle_outer_packaging_cost_paise || 0,
            has_unresolved_components: Boolean(d.bundle_has_unresolved_components),
            mapping_notes: d.bundle_mapping_notes || null,
          },
          items: d.bundle_items || [],
        });
      }
      return created;
    },
    onSuccess: (data, variables, context) => {
      const wasDuplicate = isDuplicating;
      qc.invalidateQueries(['admin-products']);
      qc.invalidateQueries(['admin-label-products']);
      invalidatePublicProductQueries(qc);
      closeDrawer();
      if (wasDuplicate) {
        toast({
          title: 'Product duplicated',
          description: 'Set prices in Pricing Strategy before printing labels.',
          action: data?.id ? (
            <a href={`/admin/pricing?product=${data.id}`} className="font-inter text-xs font-medium underline">
              Open Pricing
            </a>
          ) : undefined,
        });
      }
    },
    onError: (err) => { toast({ variant: 'destructive', title: 'Create failed', description: err?.message || 'Failed to create product' }); },
  });
  const updateMut = useMutation({
    mutationFn: async ({ id, d }) => {
      const updated = await products.update(id, d);
      if (isSellableBundleProduct({ ...d, ...updated, id })) {
        await saveProductBundle({
          parentProductId: id,
          bundleId: d.bundle_id || updated?.bundle_id || null,
          bundle: {
            bundle_name: d.title || updated?.title || updated?.name,
            bundle_slug: d.slug || updated?.slug,
            bundle_description: d.short_description || '',
            bundle_type: d.product_kind === 'gift_box' ? 'gift_box' : 'bundle_combo',
            bundle_status: d.bundle_status || 'draft',
            inventory_mode: d.bundle_inventory_mode || d.inventory_mode || 'prepacked_stock',
            packaging_mode: 'separately_packed',
            substitution_policy: d.bundle_substitution_policy || null,
            total_net_weight_g: d.bundle_total_net_weight_g || sumBundleNetWeightGrams(d.bundle_items),
            item_count: (d.bundle_items || []).length,
            outer_packaging_cost_paise: d.bundle_outer_packaging_cost_paise || 0,
            has_unresolved_components: Boolean(d.bundle_has_unresolved_components),
            mapping_notes: d.bundle_mapping_notes || null,
          },
          items: d.bundle_items || [],
        });
      }
      return updated;
    },
    onSuccess: () => {
      qc.invalidateQueries(['admin-products']);
      qc.invalidateQueries(['admin-label-products']);
      invalidatePublicProductQueries(qc);
      closeDrawer();
    },
    onError: (err) => { alert(err?.message || 'Failed to update product'); },
  });
  const opsUpdateMut = useMutation({
    mutationFn: ({ id, d }) => products.update(id, d),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries(['admin-products']);
      qc.invalidateQueries(['admin-label-products']);
      invalidatePublicProductQueries(qc);
      setSavingOpsId(null);
      setSavedOpsId(id);
      setPendingOps((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      window.setTimeout(() => {
        setSavedOpsId((current) => (current === id ? null : current));
      }, 2000);
    },
    onError: (err) => {
      setSavingOpsId(null);
      setBatchSaving(false);
      alert(err?.message || 'Failed to update product');
    },
  });
  const deleteMut = useMutation({
    mutationFn: (id) => products.delete(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries(['admin-products']);
      qc.invalidateQueries(['admin-label-products']);
      invalidatePublicProductQueries(qc);
      setPendingOps((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      if (editing?.id === id) closeDrawer();
    },
    onError: (err) => {
      alert(err?.message || 'Failed to delete product. It may be linked to past orders or stock history.');
    },
  });

  const applyQuickOpsSave = async (product, draft) => {
    const stockAdjustments = isQuickOpsStockDirty(product, draft)
      ? computeQuickOpsStockAdjustments(product, draft)
      : [];

    if (isQuickOpsNonStockDirty(product, draft)) {
      await products.update(product.id, buildQuickOpsNonStockPayload(product, draft));
    }
    for (const adjustment of stockAdjustments) {
      await appClient.functions.invoke('recordStockAdjustment', adjustment);
    }
  };

  const handleOpsDraftChange = useCallback((productId, { dirty, draft }) => {
    setPendingOps((prev) => {
      const next = { ...prev };
      if (dirty && draft) next[productId] = draft;
      else delete next[productId];
      return next;
    });
  }, []);

  const handleOpsSave = async (product, draft) => {
    setSavingOpsId(product.id);
    try {
      await applyQuickOpsSave(product, draft);
      qc.invalidateQueries(['admin-products']);
      qc.invalidateQueries(['admin-label-products']);
      qc.invalidateQueries(['admin-stock-movements']);
      invalidatePublicProductQueries(qc);
      setSavedOpsId(product.id);
      setPendingOps((prev) => {
        const next = { ...prev };
        delete next[product.id];
        return next;
      });
      window.setTimeout(() => {
        setSavedOpsId((current) => (current === product.id ? null : current));
      }, 2000);
    } catch (err) {
      alert(err?.message || 'Failed to update product');
    } finally {
      setSavingOpsId(null);
    }
  };

  const handleMobileStockSave = async (product, payload, done) => {
    setMobileStockSavingId(product.id);
    try {
      const draft = productToQuickOpsDraft(product);
      if (payload.stock !== undefined) draft.bulkStock = String(payload.stock);
      const variants = payload.quick_variants || payload.variants || [];
      for (const variant of variants) {
        const key = variant.sku || variant.label;
        if (key && variant.stock !== undefined) draft.variantStocks[key] = String(variant.stock);
      }
      const adjustments = computeQuickOpsStockAdjustments(product, draft);
      for (const adjustment of adjustments) {
        await appClient.functions.invoke('recordStockAdjustment', adjustment);
      }
      qc.invalidateQueries(['admin-products']);
      qc.invalidateQueries(['admin-stock-movements']);
      done?.();
      toast({ title: 'Stock updated' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Stock update failed', description: err?.message || 'Could not update stock' });
    } finally {
      setMobileStockSavingId(null);
    }
  };

  const handleSaveAllOps = async () => {
    const entries = Object.entries(pendingOps);
    if (!entries.length) return;
    if (!window.confirm(`Save changes for ${entries.length} product${entries.length === 1 ? '' : 's'}?`)) return;

    setBatchSaving(true);
    try {
      for (const [id, draft] of entries) {
        const product = productList.find((p) => p.id === id);
        if (!product) continue;
        await applyQuickOpsSave(product, draft);
      }
      qc.invalidateQueries(['admin-products']);
      qc.invalidateQueries(['admin-label-products']);
      qc.invalidateQueries(['admin-stock-movements']);
      invalidatePublicProductQueries(qc);
      setPendingOps({});
      alert(`Saved ${entries.length} product${entries.length === 1 ? '' : 's'}.`);
    } catch (err) {
      alert(err?.message || 'Batch save failed');
    } finally {
      setBatchSaving(false);
    }
  };

  const handleBulkStockApply = async () => {
    const kg = Number(bulkStockKg);
    if (!Number.isFinite(kg) || kg < 0) {
      toast({ variant: 'destructive', title: 'Invalid amount', description: 'Enter a valid stock amount.' });
      return;
    }
    setBulkStockPreviewOpen(false);

    try {
      let updated = 0;
      for (const item of bulkStockTargets) {
        const adjustment = computeBulkStockAdjustment(item, kg);
        if (!adjustment) continue;
        await appClient.functions.invoke('recordStockAdjustment', adjustment);
        updated += 1;
      }
      qc.invalidateQueries(['admin-products']);
      qc.invalidateQueries(['admin-stock-movements']);
      toast({ title: 'Bulk stock updated', description: `Updated ${updated} product${updated === 1 ? '' : 's'} via inventory ledger.` });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Bulk stock failed', description: err?.message || 'Bulk stock update failed' });
    }
  };

  const openBulkStockPreview = () => {
    const kg = Number(bulkStockKg);
    if (!Number.isFinite(kg) || kg < 0) {
      toast({ variant: 'destructive', title: 'Invalid amount', description: 'Enter a valid stock amount.' });
      return;
    }
    setBulkStockPreviewOpen(true);
  };

  const assignSkusMut = useMutation({
    mutationFn: async () => {
      const updates = reassignAllProductSkus(productList);
      await Promise.all(
        updates.map((item) =>
          products.update(item.id, { sku: item.sku, product_code: item.product_code }),
        ),
      );
      return updates;
    },
    onSuccess: (updates) => {
      qc.invalidateQueries(['admin-products']);
      qc.invalidateQueries(['admin-label-products']);
      alert(
        updates.length
          ? `Renumbered ${updates.length} products to YAS-001 … YAS-${String(updates.length).padStart(3, '0')}. Re-print barcode labels for counter.`
          : 'No products to renumber.',
      );
    },
    onError: (err) => { alert(err?.message || 'Failed to renumber SKUs'); },
  });

  const confirmRenumberAllSkus = () => {
    if (!productList.length) {
      alert('No products to renumber.');
      return;
    }
    const ok = window.confirm(
      `Renumber ALL ${productList.length} products to YAS-001, YAS-002, …?\n\n`
      + 'Products are sorted A→Z by title. Existing SKUs and product codes will be replaced.\n\n'
      + 'Re-print shelf barcode labels after this.',
    );
    if (ok) assignSkusMut.mutate();
  };

  const openCreate = (overrides = {}, { tab = 'basic' } = {}) => {
    setEditing(null);
    setIsDuplicating(false);
    setForm({ ...EMPTY, ...overrides });
    setDrawerInitialTab(tab);
    setDrawerOpen(true);
  };
  const openEdit = async (item, { tab = 'basic' } = {}) => {
    try {
      const full = await products.get(item.id);
      let formState = productToEditorForm(full || item);
      if (isSellableBundleProduct(formState)) {
        try {
          const bundle = await fetchBundleForProduct(item.id, { includeDraftComponents: true });
          if (bundle) {
            formState = {
              ...formState,
              bundle_id: bundle.id,
              bundle_items: (bundle.items || []).map((row) => ({
                product_id: row.product_id,
                quantity_value: row.quantity_value,
                quantity_unit: row.quantity_unit || 'g',
                pack_count: row.pack_count || 1,
                sort_order: row.sort_order || 0,
                is_required: row.is_required !== false,
                substitution_allowed: Boolean(row.substitution_allowed),
                is_active: row.is_active !== false,
                component_variant_sku: row.component_variant_sku || '',
                component_title_snapshot: row.component_title_snapshot || '',
              })),
              bundle_status: bundle.bundle_status || 'draft',
              bundle_inventory_mode: bundle.inventory_mode || 'prepacked_stock',
              bundle_substitution_policy: bundle.substitution_policy || '',
              bundle_total_net_weight_g: bundle.total_net_weight_g || '',
              bundle_item_count: bundle.item_count || 0,
              bundle_outer_packaging_cost_paise: bundle.outer_packaging_cost_paise || 0,
              bundle_has_unresolved_components: Boolean(bundle.has_unresolved_components),
              bundle_mapping_notes: bundle.mapping_notes || '',
              product_kind: formState.product_kind || 'bundle_combo',
              inventory_mode: formState.inventory_mode || bundle.inventory_mode || 'prepacked_stock',
            };
          }
        } catch (bundleErr) {
          console.warn('Could not load product bundle', bundleErr);
        }
      }
      setEditing(full || item);
      setIsDuplicating(false);
      setForm(formState);
      setDrawerInitialTab(tab);
      setDrawerOpen(true);
    } catch (err) {
      alert(err?.message || 'Could not load product for editing');
    }
  };
  const openEditPhotos = (item) => openEdit(item, { tab: 'media' });
  const openDuplicate = (item) => {
    setEditing(null);
    setIsDuplicating(true);
    setForm(productToDuplicateForm(item));
    setDrawerInitialTab('basic');
    setDrawerOpen(true);
  };
  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditing(null);
    setIsDuplicating(false);
    setForm(EMPTY);
    setDrawerInitialTab('basic');
  };

  const handleDeleteProduct = (product) => {
    if (!product?.id) return;
    const title = String(product.title || 'this product').trim();
    if (!window.confirm(
      `Permanently delete "${title}"?\n\nThis cannot be undone. Products with past orders or stock history may not delete until those records are cleared.`,
    )) {
      return;
    }
    deleteMut.mutate(product.id);
  };

  const editProductId = searchParams.get('edit');
  const editTab = searchParams.get('tab');
  const newCombo = searchParams.get('new') === 'combo';
  const duplicateProductId = searchParams.get('duplicate');

  useEffect(() => {
    if (!editProductId || isLoading) return;
    const item = productList.find((p) => p.id === editProductId);
    if (!item) return;

    const tab = editTab === 'media'
      ? 'media'
      : editTab === 'bundle'
        ? 'bundle'
        : 'basic';
    openEdit(item, { tab });

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('edit');
      next.delete('tab');
      return next;
    }, { replace: true });
  }, [editProductId, editTab, productList, isLoading, setSearchParams]);

  useEffect(() => {
    if (!newCombo) return;
    openCreate({
      product_kind: 'bundle_combo',
      product_group: 'packaged_combo',
      inventory_mode: 'prepacked_stock',
      is_published: false,
      price: 0,
      stock: 0,
      stock_quantity: 0,
      availability: 'out_of_stock',
      yasvik_mark: '',
      best_for: '',
      bundle_items: [],
      bundle_status: 'draft',
      bundle_inventory_mode: 'prepacked_stock',
    }, { tab: 'basic' });
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('new');
      return next;
    }, { replace: true });
  }, [newCombo, setSearchParams]);

  useEffect(() => {
    if (!duplicateProductId || isLoading) return;
    const item = productList.find((p) => p.id === duplicateProductId);
    if (!item) return;
    openDuplicate(item);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('duplicate');
      return next;
    }, { replace: true });
  }, [duplicateProductId, productList, isLoading, setSearchParams]);

  const handleSave = () => {
    try {
      const variantError = validateProductVariantsForSave(form);
      if (variantError) {
        alert(variantError);
        return;
      }
      if (!String(form.title || '').trim()) {
        alert('Product name is required.');
        return;
      }
      if (isSellableBundleProduct(form)) {
        const bundleErrors = validateBundleForSave(
          {
            total_net_weight_g: form.bundle_total_net_weight_g,
            bundle_status: form.bundle_status,
          },
          form.bundle_items || [],
        );
        if (bundleErrors.length && form.bundle_status !== 'unresolved') {
          alert(bundleErrors.join('\n'));
          return;
        }
        if (form.is_published) {
          const publishErrors = validateBundleForPublish(
            form,
            {
              has_unresolved_components: form.bundle_has_unresolved_components,
              bundle_status: form.bundle_status,
              inventory_mode: form.bundle_inventory_mode || form.inventory_mode,
            },
            form.bundle_items || [],
          );
          if (publishErrors.length) {
            alert(`Cannot publish this bundle:\n${publishErrors.join('\n')}`);
            return;
          }
        }
      }
      if (isPrepackedComboInventory(form)) {
        const ok = window.confirm(
          'This product uses prepacked inventory. Component stock will not be deducted automatically.\n\nContinue saving?',
        );
        if (!ok) return;
      }
      const payload = buildProductSavePayload(form, { isDuplicating, allProducts: productList });
      // Keep bundle editor fields for mutation side-effects (not written to products table directly).
      const withBundle = {
        ...payload,
        bundle_id: form.bundle_id || null,
        bundle_items: form.bundle_items || [],
        bundle_status: form.bundle_status || 'draft',
        bundle_inventory_mode: form.bundle_inventory_mode || form.inventory_mode || 'prepacked_stock',
        bundle_substitution_policy: form.bundle_substitution_policy || '',
        bundle_total_net_weight_g: form.bundle_total_net_weight_g,
        bundle_outer_packaging_cost_paise: form.bundle_outer_packaging_cost_paise || 0,
        bundle_has_unresolved_components: Boolean(form.bundle_has_unresolved_components),
        bundle_mapping_notes: form.bundle_mapping_notes || '',
        product_kind: form.product_kind || payload.product_kind || PRODUCT_KINDS.INDIVIDUAL,
      };
      if (editing) updateMut.mutate({ id: editing.id, d: withBundle });
      else createMut.mutate(withBundle);
    } catch (err) {
      console.error('[AdminProducts] save failed', err);
      toast({
        variant: 'destructive',
        title: 'Could not save product',
        description: err?.message || 'Unexpected error while preparing the product.',
      });
    }
  };

  const pendingCount = Object.keys(pendingOps).length;

  const handleBulkBarcodePdf = async () => {
    const targets = filtered.filter((item) => String(item.sku || '').trim());
    if (!targets.length) {
      alert('No products with SKU in the current list. Use Renumber all SKUs first.');
      return;
    }
    setBarcodeExportBusy(true);
    try {
      const count = await exportSkuBarcodePdf(targets);
      alert(`Downloaded PDF with ${count} barcode label${count === 1 ? '' : 's'} (50×25 mm, one per page).`);
    } catch (err) {
      alert(err?.message || 'Barcode PDF export failed');
    } finally {
      setBarcodeExportBusy(false);
    }
  };

  const handleExportSpreadsheet = () => {
    const targets = filtered.length ? filtered : productList;
    if (!targets.length) {
      alert('No products to export.');
      return;
    }
    const suffix = filtered.length && filtered.length !== productList.length ? 'filtered' : 'all';
    downloadProductSpreadsheet(
      targets,
      categoryList,
      `yasvik-products-${suffix}-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  };

  const handleImportSpreadsheet = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setSpreadsheetImportBusy(true);
    try {
      const { rows, sheetName } = await parseProductSpreadsheetFile(file);
      const { planned, skipped } = planProductSpreadsheetImport(rows, productList, categoryList);

      if (!planned.length) {
        const sample = skipped.slice(0, 3).map((item) => `Row ${item.row}: ${item.reason}`).join('\n');
        toast({ variant: 'destructive', title: 'Nothing to import', description: sample || 'Check that id column matches exported file.' });
        return;
      }

      setImportDialog({
        fileName: `${file.name} (${sheetName})`,
        planned,
        skipped,
        preview: buildSpreadsheetImportPreview(planned, productList),
      });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Import failed', description: err?.message || 'Could not read file' });
    } finally {
      setSpreadsheetImportBusy(false);
    }
  };

  const confirmSpreadsheetImport = async () => {
    if (!importDialog?.planned?.length) return;
    setSpreadsheetImportBusy(true);
    try {
      const results = await applyProductSpreadsheetImport(
        importDialog.planned,
        (id, payload) => products.update(id, payload),
      );

      qc.invalidateQueries(['admin-products']);
      qc.invalidateQueries(['admin-label-products']);
      setImportDialog(null);

      const failedNote = results.failed.length
        ? ` ${results.failed.length} failed.`
        : '';
      toast({
        title: 'Import complete',
        description: `Updated ${results.updated} product${results.updated === 1 ? '' : 's'}.${failedNote}`,
      });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Import failed', description: err?.message || 'Import failed' });
    } finally {
      setSpreadsheetImportBusy(false);
    }
  };

  const priceListSource = useMemo(() => {
    // Respect list filters (search / category / status) so owners can export a slice.
    return sorted;
  }, [sorted]);

  const priceListRows = useMemo(
    () => buildCustomerPriceListRows(priceListSource, categoryList, {
      sellOnlineOnly: priceListSellOnlineOnly,
      publishedOnly: true,
      pricedOnly: true,
    }),
    [priceListSource, categoryList, priceListSellOnlineOnly],
  );

  const handlePriceListPdf = async () => {
    if (!priceListRows.length) {
      toast({ variant: 'destructive', title: 'No priced packs', description: 'Adjust filters or set prices in Pricing Strategy.' });
      return;
    }
    setPriceListBusy(true);
    try {
      downloadCustomerPriceListPdf(priceListRows);
      toast({ title: 'Price list PDF downloaded', description: `${priceListRows.length} pack lines · shop link included` });
    } catch (err) {
      toast({ variant: 'destructive', title: 'PDF failed', description: err?.message || 'Could not build PDF' });
    } finally {
      setPriceListBusy(false);
    }
  };

  const handlePriceListExcel = async () => {
    if (!priceListRows.length) {
      toast({ variant: 'destructive', title: 'No priced packs', description: 'Adjust filters or set prices in Pricing Strategy.' });
      return;
    }
    setPriceListBusy(true);
    try {
      await downloadCustomerPriceListExcel(priceListRows);
      toast({ title: 'Price list Excel downloaded', description: `${priceListRows.length} pack lines · shop link on sheet` });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Excel failed', description: err?.message || 'Could not build Excel' });
    } finally {
      setPriceListBusy(false);
    }
  };

  const handleCopyShopLink = async () => {
    try {
      await navigator.clipboard.writeText(CUSTOMER_SHOP_URL);
      toast({ title: 'Shop link copied', description: CUSTOMER_SHOP_URL });
    } catch {
      toast({ variant: 'destructive', title: 'Copy failed', description: CUSTOMER_SHOP_URL });
    }
  };

  const handleCopyWhatsAppPriceBlurb = async () => {
    const text = priceListRows.length <= 60
      ? buildCustomerPriceListWhatsAppText(priceListRows)
      : [
        'Yasvik price list',
        `Live shop (always current): ${CUSTOMER_SHOP_URL}`,
        '',
        'Full pack list attached as PDF/Excel — or open the shop link above for live prices.',
      ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'WhatsApp text copied',
        description: priceListRows.length <= 60
          ? 'Paste into chat (includes shop link).'
          : 'Short blurb copied — attach the PDF/Excel for the full list.',
      });
    } catch {
      toast({ variant: 'destructive', title: 'Copy failed' });
    }
  };

  return (
    <div className="flex flex-1 flex-col p-6 max-w-[1400px] mx-auto w-full">
      <AdminCatalogueTabs />
      <AdminPageHeader
        title="Products"
        description={`${productList.length} products · customer price list · Excel catalogue edits · quick ops`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportSpreadsheet}
              className="flex items-center gap-2 py-2.5 px-4 border border-border font-inter text-sm rounded-full text-rain-cloud hover:bg-rain-mist/50 transition-all"
              title="Download CSV for Excel — edit and re-upload"
            >
              <Download className="w-4 h-4" /> Export Excel
            </button>
            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              disabled={spreadsheetImportBusy}
              className="flex items-center gap-2 py-2.5 px-4 border border-border font-inter text-sm rounded-full text-rain-cloud hover:bg-rain-mist/50 transition-all disabled:opacity-50"
              title="Upload edited CSV from Excel"
            >
              <Upload className="w-4 h-4" /> {spreadsheetImportBusy ? 'Importing…' : 'Import Excel'}
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={handleImportSpreadsheet}
            />
            <button
              type="button"
              onClick={confirmRenumberAllSkus}
              disabled={assignSkusMut.isPending}
              className="flex items-center gap-2 py-2.5 px-4 border border-border font-inter text-sm rounded-full text-rain-cloud hover:bg-rain-mist/50 transition-all disabled:opacity-50"
            >
              <Barcode className="w-4 h-4" /> {assignSkusMut.isPending ? 'Renumbering…' : 'Renumber all SKUs'}
            </button>
            <button
              type="button"
              onClick={handleBulkBarcodePdf}
              disabled={barcodeExportBusy}
              className="flex items-center gap-2 py-2.5 px-4 border border-border font-inter text-sm rounded-full text-rain-cloud hover:bg-rain-mist/50 transition-all disabled:opacity-50"
            >
              <Barcode className="w-4 h-4" /> {barcodeExportBusy ? 'Building PDF…' : 'Barcode PDF (list)'}
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 py-2.5 px-5 bg-wet-earth text-white font-inter text-sm rounded-full hover:bg-wet-earth/90 transition-all"
            >
              <Plus className="w-4 h-4" /> Add Product
            </button>
          </div>
        }
      />

      <div className="mb-4 rounded-2xl border border-wet-earth/20 bg-wet-earth/[0.04] px-4 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="font-inter text-sm font-semibold text-rain-cloud">Customer price list</p>
            <p className="mt-1 font-inter text-xs leading-relaxed text-rain-cloud/60">
              Dense pack list for WhatsApp / email — not the catalogue publisher.
              Uses current filters · {priceListRows.length} priced pack line{priceListRows.length === 1 ? '' : 's'}.
              Customers can also check live prices at{' '}
              <a href={CUSTOMER_SHOP_URL} target="_blank" rel="noreferrer" className="font-medium text-wet-earth hover:underline">
                {CUSTOMER_SHOP_URL}
              </a>.
            </p>
            <label className="mt-2 inline-flex items-center gap-2 font-inter text-xs text-rain-cloud/70">
              <input
                type="checkbox"
                checked={priceListSellOnlineOnly}
                onChange={(e) => setPriceListSellOnlineOnly(e.target.checked)}
              />
              Sell-online products only
            </label>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePriceListPdf}
              disabled={priceListBusy || !priceListRows.length}
              className="inline-flex items-center gap-1.5 rounded-full bg-wet-earth px-3.5 py-2 font-inter text-xs font-semibold text-white disabled:opacity-40"
            >
              <FileText className="h-3.5 w-3.5" />
              {priceListBusy ? 'Building…' : 'PDF'}
            </button>
            <button
              type="button"
              onClick={handlePriceListExcel}
              disabled={priceListBusy || !priceListRows.length}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3.5 py-2 font-inter text-xs font-semibold text-rain-cloud disabled:opacity-40"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Excel
            </button>
            <button
              type="button"
              onClick={handleCopyShopLink}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3.5 py-2 font-inter text-xs font-semibold text-rain-cloud"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Copy shop link
            </button>
            <button
              type="button"
              onClick={handleCopyWhatsAppPriceBlurb}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3.5 py-2 font-inter text-xs font-semibold text-rain-cloud"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy WhatsApp text
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4 mb-4">
        <AdminCollapseSection title="Search & filters" defaultOpen badge={`${filtered.length} shown`}>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rain-cloud/35" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by title or SKU…"
                className="w-full pl-9 pr-4 py-2 border border-border rounded-xl font-inter text-sm text-rain-cloud focus:outline-none focus:border-forest-canopy transition-colors"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="border border-border rounded-xl px-3 py-2 font-inter text-sm text-rain-cloud focus:outline-none bg-white"
            >
              {STATUS_FILTERS.map(f => (
                <option key={f} value={f}>{f === 'all' ? 'All Status' : f.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
              ))}
            </select>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="border border-border rounded-xl px-3 py-2 font-inter text-sm text-rain-cloud focus:outline-none bg-white"
            >
          <option value="all">All Categories</option>
          {categoryFilterOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-border rounded-xl px-3 py-2 font-inter text-sm text-rain-cloud focus:outline-none bg-white"
              aria-label="Sort products"
            >
              {ADMIN_PRODUCT_SORT_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </div>
        </AdminCollapseSection>
      </div>

      <AdminCollapseSection
        title="Product catalog"
        description="Quick edit table — open full editor for photos, story, and publish settings"
        defaultOpen
        badge={`${filtered.length} products`}
        className="mb-4 flex-1 flex flex-col min-h-0"
      >
      {!isLoading && filtered.length > 0 ? (
      <div className="mb-4 space-y-3 lg:hidden">
        {pagedProducts.map((item) => (
          <ProductMobileQuickCard
            key={`mobile-${item.id}`}
            product={item}
            onEdit={openEdit}
            onEditPhotos={openEditPhotos}
            onStockSave={handleMobileStockSave}
            isStockSaving={mobileStockSavingId === item.id}
          />
        ))}
      </div>
      ) : null}

      {/* Table */}
      <div className="hidden flex-1 flex-col bg-white rounded-2xl shadow-sm overflow-hidden min-h-0 lg:flex">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-temple-stone/15 rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-20">
            <p className="font-inter text-sm text-rain-cloud/40">{search || statusFilter !== 'all' ? 'No products match your filters.' : 'No products yet. Create your first.'}</p>
          </div>
        ) : (
          <div className="flex flex-1 flex-col min-h-0 overflow-x-auto">
            <table className="w-full min-w-[1110px] table-fixed">
              <colgroup>
                <col className="w-11" />
                <col className="w-[11%]" />
                <col className="w-[4.5rem]" />
                <col className="w-[11%]" />
                <col className="w-[11%]" />
                <col className="w-[5.75rem]" />
                <col className="w-[6.5rem]" />
                <col className="w-[6.5rem]" />
                <col className="w-[3.25rem]" />
                <col className="w-10" />
                <col className="w-10" />
                <col className="w-[4.5rem]" />
                <col className="w-[8rem]" />
              </colgroup>
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-2 py-2.5 text-left font-inter text-[10px] font-medium uppercase tracking-wider text-rain-cloud/45" />
                  <th className="px-2 py-2.5 text-left font-inter text-[10px] font-medium uppercase tracking-wider text-rain-cloud/45">Product</th>
                  <th className="px-2 py-2.5 text-left font-inter text-[10px] font-medium uppercase tracking-wider text-rain-cloud/45">Unit</th>
                  <th className="px-2 py-2.5 text-left font-inter text-[10px] font-medium uppercase tracking-wider text-rain-cloud/45">Category</th>
                  <th className="px-2 py-2.5 text-left font-inter text-[10px] font-medium uppercase tracking-wider text-rain-cloud/45">Telugu</th>
                  <th className="px-2 py-2.5 text-right font-inter text-[10px] font-medium uppercase tracking-wider text-rain-cloud/45">Stock</th>
                  <th className="px-2 py-2.5 text-left font-inter text-[10px] font-medium uppercase tracking-wider text-rain-cloud/45">SKU</th>
                  <th className="px-2 py-2.5 text-right font-inter text-[10px] font-medium uppercase tracking-wider text-rain-cloud/45">Prices</th>
                  <th className="px-2 py-2.5 text-center font-inter text-[10px] font-medium uppercase tracking-wider text-rain-cloud/45" title="Lower = first">Order</th>
                  <th className="px-2 py-2.5 text-center font-inter text-[10px] font-medium uppercase tracking-wider text-rain-cloud/45">Live</th>
                  <th className="px-2 py-2.5 text-center font-inter text-[10px] font-medium uppercase tracking-wider text-rain-cloud/45" title="Best Seller on homepage">Best</th>
                  <th className="px-2 py-2.5 text-center font-inter text-[10px] font-medium uppercase tracking-wider text-rain-cloud/45">Save</th>
                  <th className="px-2 py-2.5 text-right font-inter text-[10px] font-medium uppercase tracking-wider text-rain-cloud/45">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedProducts.map((item) => (
                  <ProductQuickOpsRow
                    key={item.id}
                    product={item}
                    categories={categoryList}
                    onSave={(draft) => handleOpsSave(item, draft)}
                    onEdit={openEdit}
                    onDuplicate={openDuplicate}
                    onDelete={handleDeleteProduct}
                    isSaving={savingOpsId === item.id}
                    isDeleting={deleteMut.isPending && deleteMut.variables === item.id}
                    saveStatus={savedOpsId === item.id ? 'saved' : null}
                    onDraftChange={handleOpsDraftChange}
                  />
                ))}
              </tbody>
            </table>
            <div className="mt-auto px-4 py-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-2">
              <p className="font-inter text-xs text-rain-cloud/35">
                Showing {pageStart}–{pageEnd} of {filtered.length} products
                {filtered.length !== productList.length ? ` (${productList.length} total)` : ''}
                {pendingCount > 0 ? ` · ${pendingCount} unsaved` : ''}
              </p>
              <div className="flex items-center gap-2">
                {productPageCount > 1 ? (
                  <>
                    <button
                      type="button"
                      disabled={safeProductPage <= 0}
                      onClick={() => setProductPage((p) => Math.max(0, p - 1))}
                      className="rounded-full border border-border px-3 py-1 font-inter text-xs text-rain-cloud/70 disabled:opacity-40 hover:bg-rain-mist/50"
                    >
                      Previous
                    </button>
                    <span className="font-inter text-xs text-rain-cloud/50">
                      Page {safeProductPage + 1} / {productPageCount}
                    </span>
                    <button
                      type="button"
                      disabled={safeProductPage >= productPageCount - 1}
                      onClick={() => setProductPage((p) => Math.min(productPageCount - 1, p + 1))}
                      className="rounded-full border border-border px-3 py-1 font-inter text-xs text-rain-cloud/70 disabled:opacity-40 hover:bg-rain-mist/50"
                    >
                      Next
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  onClick={confirmRenumberAllSkus}
                  disabled={assignSkusMut.isPending}
                  className="font-inter text-xs text-rain-cloud/50 hover:text-forest-canopy"
                >
                  Renumber all SKUs
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      </AdminCollapseSection>

      <AdminCollapseSection
        title="Quick stock refill"
        description="Bulk apply stock to filtered products"
        className="mb-4"
      >
        <div className="flex flex-col gap-3">
          <p className="font-inter text-xs text-rain-cloud/50">
            Sets stock for filtered products · respects each product&apos;s measure (kg / L / units).
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <AdminNumberBox
              allowDecimal
              value={bulkStockKg}
              onChange={setBulkStockKg}
              className="w-24 rounded-xl border border-border px-3 py-2 font-inter text-sm focus:outline-none focus:border-forest-canopy bg-white"
              aria-label="Bulk stock amount"
            />
            <span className="font-inter text-xs text-rain-cloud/50">kg / L / units</span>
            <label className="inline-flex items-center gap-1.5 font-inter text-xs text-rain-cloud/60">
              <input
                type="checkbox"
                checked={bulkStockInStockOnly}
                onChange={(e) => setBulkStockInStockOnly(e.target.checked)}
                className="rounded border-border"
              />
              In-stock only
            </label>
            <button
              type="button"
              onClick={openBulkStockPreview}
              className="rounded-full bg-forest-canopy px-4 py-2 font-inter text-sm text-white hover:bg-forest-canopy/90 transition-colors"
            >
              Preview & apply
            </button>
            {pendingCount > 0 ? (
              <button
                type="button"
                onClick={handleSaveAllOps}
                disabled={batchSaving}
                className="rounded-full border-2 border-amber-500 bg-amber-50 px-4 py-2 font-inter text-sm font-medium text-amber-800 hover:bg-amber-100 transition-colors disabled:opacity-50"
              >
                {batchSaving ? 'Saving…' : `Save all (${pendingCount})`}
              </button>
            ) : null}
          </div>
          {bulkStockPreviewOpen ? (
            <div className="rounded-xl border border-border/60 bg-rain-mist/20 px-4 py-3">
              <p className="font-inter text-sm text-rain-cloud">
                Will set <strong>{bulkStockTargets.length}</strong> product{bulkStockTargets.length === 1 ? '' : 's'} to <strong>{bulkStockKg}</strong> kg/L/units
                {bulkStockInStockOnly ? ' (in-stock only)' : ''}.
              </p>
              <ul className="mt-2 space-y-0.5">
                {bulkStockTargets.slice(0, 5).map((item) => (
                  <li key={item.id} className="font-inter text-xs text-rain-cloud/60">{item.title}</li>
                ))}
              </ul>
              {bulkStockTargets.length > 5 ? (
                <p className="mt-1 font-inter text-[11px] text-rain-cloud/40">+{bulkStockTargets.length - 5} more</p>
              ) : null}
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={handleBulkStockApply} className="rounded-lg bg-forest-canopy px-3 py-1.5 font-inter text-xs text-white">
                  Confirm apply
                </button>
                <button type="button" onClick={() => setBulkStockPreviewOpen(false)} className="rounded-lg px-3 py-1.5 font-inter text-xs text-rain-cloud/50 hover:bg-white">
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </AdminCollapseSection>

      <AdminCollapseSection
        title="Excel import / export"
        description="Bulk edit catalog in Excel — set prices in Pricing Strategy, not Excel"
        className="mb-4"
      >
        <p className="font-inter text-xs leading-relaxed text-rain-cloud/55">
          Export catalog, edit in Excel, then Import the same file (.xlsx or CSV).
          Price columns in the export are for reference only — use <Link to="/admin/pricing" className="text-wet-earth font-medium hover:underline">Pricing Strategy</Link> to change prices.
          Keep the <code className="rounded bg-temple-stone/20 px-1">id</code> column unchanged.
          Exports {filtered.length} of {productList.length} products (current filters).
        </p>
      </AdminCollapseSection>

      <SpreadsheetImportDialog
        open={!!importDialog}
        fileName={importDialog?.fileName || ''}
        preview={importDialog?.preview || []}
        skipped={importDialog?.skipped || []}
        totalPlanned={importDialog?.planned?.length || 0}
        onConfirm={confirmSpreadsheetImport}
        onCancel={() => setImportDialog(null)}
        busy={spreadsheetImportBusy}
      />

      <ProductFormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        data={form}
        onChange={setForm}
        onSave={handleSave}
        onDelete={editing ? () => handleDeleteProduct(editing) : undefined}
        isDeleting={deleteMut.isPending}
        isSaving={createMut.isPending || updateMut.isPending}
        isEditing={!!editing}
        isDuplicating={isDuplicating}
        initialTab={drawerInitialTab}
      />
    </div>
  );
}
