import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useCart } from '@/lib/CartContext';
import { useRazorpay } from '@/hooks/useRazorpay';
import { useAuth } from '@/lib/AuthContext';
import { appClient } from '@/api/appClient';
import { ChevronLeft, Loader2, AlertCircle, CheckCircle, Minus, Plus, Trash2, MapPin, MessageCircle, Ticket } from 'lucide-react';
import { useStoreOffline } from '@/hooks/useStoreOffline';
import BundleItemDetail, { CheckoutComboThumb } from '@/components/checkout/BundleItemDetail';
import PackSavingsBadge from '@/components/products/PackSavingsBadge';
import { getLineItemStockKg } from '@/lib/productVariantUtils';
import { sumCartBulkSavings } from '@/lib/variantBulkSavings';
import { formatCartLineVariant, getCartLineSavings } from '@/lib/cartDisplayUtils';
import DeliveryInfoCard from '@/components/commerce/DeliveryInfoCard';
import { DELIVERY_FEE_AT_CHECKOUT, DELIVERY_FEE_CHECKOUT_LABEL, MIN_DELIVERY_ORDER_RS } from '@/lib/commerceCopy';
import { buildItemsSnapshot, buildShippingAddress } from '@/lib/orderPayloadUtils';
import {
  resolvePincodeDelivery,
  resolveDeliveryQuote,
  zoneDisplayName,
} from '@/lib/deliveryZones';
import { fetchAllAppSettings } from '@/services/settingsService';
import { saveCheckoutDraft, loadCheckoutDraft, clearCheckoutDraft } from '@/lib/checkoutDraft';
import { checkoutAddressToProfilePayload } from '@/lib/userAddressPayload';
import { safeMedia } from '@/lib/mediaUrl';

import { YASVIK_WHATSAPP_NUMBER } from '@/lib/storeLocation';
import { trackBeginCheckout } from '@/lib/analytics';
import { products as productsApi } from '@/services/api';
import { buildDeliverySlotOptions, defaultDeliverySlot } from '@/lib/deliverySlots';
import ProductCard from '@/components/products/ProductCard';
import { normalizeCouponCode } from '@/lib/couponUtils';

const WHATSAPP_NUMBER = YASVIK_WHATSAPP_NUMBER;

function QtyControl({ item, updateQty, removeItem }) {
  return (
    <div className="flex items-center gap-1 mt-1.5">
      <button
        onClick={() => updateQty(item.key, item.qty - 1)}
        className="w-6 h-6 rounded-full border border-border flex items-center justify-center text-rain-cloud/50 hover:border-wet-earth hover:text-wet-earth transition-colors"
      >
        <Minus className="w-3 h-3" />
      </button>
      <span className="font-inter text-sm text-rain-cloud w-5 text-center">{item.qty}</span>
      <button
        onClick={() => updateQty(item.key, item.qty + 1)}
        className="w-6 h-6 rounded-full border border-border flex items-center justify-center text-rain-cloud/50 hover:border-forest-canopy hover:text-forest-canopy transition-colors"
      >
        <Plus className="w-3 h-3" />
      </button>
      <button
        onClick={() => removeItem(item.key)}
        className="ml-1 w-6 h-6 rounded-full flex items-center justify-center text-rain-cloud/30 hover:text-red-400 transition-colors"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}

function addressToForm(addr) {
  if (!addr) return null;
  return {
    name: addr.name || addr.label || '',
    phone: addr.phone || addr.phone_number || '',
    email: '',
    street: [addr.building_name, addr.street, addr.area].filter(Boolean).join(', '),
    city: addr.city || '',
    state: addr.state || 'Telangana',
    pincode: addr.pin_code || addr.postal_code || '',
    delivery_instructions: '',
    addressId: addr.id,
  };
}

function CheckoutOrderAside({
  className = '',
  showPayButton = true,
  totalBulkSavings,
  totalPrice,
  discountPaise = 0,
  discountLabel = '',
  couponInput = '',
  setCouponInput,
  couponBusy = false,
  couponError = '',
  appliedCoupon = null,
  onApplyCoupon,
  onClearCoupon,
  grandTotal,
  payError,
  isAuthenticated,
  deliveryZone,
  paymentMethod,
  setPaymentMethod,
  codEligible,
  codReason,
  storeOffline,
  offlineMessage,
  payLoading,
  placingCod,
  canCheckout,
  handleProceedToPayment,
  minShortfallRs = 0,
  pickupHref = '',
}) {
  const discountRs = Math.round((Number(discountPaise) || 0) / 100);
  return (
    <aside className={`rounded-2xl border border-border/20 bg-white p-5 lg:p-6 ${className}`.trim()}>
      <h3 className="mb-4 font-cormorant text-lg font-semibold text-rain-cloud">Order Total</h3>
      <div className="mb-5 space-y-2.5 border-b border-border/20 pb-5">
        {totalBulkSavings > 0 ? (
          <div className="flex items-center justify-between">
            <span className="font-inter text-sm text-deep-forest/60">Fair pricing benefit</span>
            <span className="font-inter text-sm text-deep-forest/80">₹{totalBulkSavings}</span>
          </div>
        ) : null}
        <div className="flex items-center justify-between">
          <span className="font-inter text-sm text-rain-cloud/60">Subtotal</span>
          <span className="font-cormorant text-sm text-rain-cloud">₹{totalPrice}</span>
        </div>
        {discountRs > 0 ? (
          <div className="flex items-center justify-between">
            <span className="font-inter text-sm text-forest-canopy">
              Discount{discountLabel ? ` (${discountLabel})` : ''}
            </span>
            <span className="font-inter text-sm text-forest-canopy">−₹{discountRs}</span>
          </div>
        ) : null}
        <div className="flex items-center justify-between">
          <span className="font-inter text-sm text-rain-cloud/60">Delivery</span>
          <span className="font-inter text-sm text-rain-cloud/70">{DELIVERY_FEE_CHECKOUT_LABEL}</span>
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="font-cormorant text-lg text-rain-cloud">Total</span>
          <span className="font-cormorant text-2xl font-medium text-rain-cloud">₹{grandTotal}</span>
        </div>
      </div>

      <div className="mb-5 space-y-2">
        <p className="font-inter text-xs font-medium uppercase tracking-wider text-rain-cloud/50">
          Have a coupon?
        </p>
        {appliedCoupon?.coupon_code ? (
          <div className="flex items-center justify-between rounded-xl border border-forest-canopy/30 bg-forest-canopy/5 px-3 py-2">
            <p className="font-mono text-sm text-forest-canopy">{appliedCoupon.coupon_code}</p>
            <button type="button" onClick={onClearCoupon} className="font-inter text-xs text-rain-cloud/50 hover:text-rain-cloud">
              Remove
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              value={couponInput}
              onChange={(e) => setCouponInput?.(e.target.value.toUpperCase())}
              placeholder="Enter code"
              className="min-w-0 flex-1 rounded-xl border border-border px-3 py-2 font-mono text-sm uppercase"
            />
            <button
              type="button"
              onClick={onApplyCoupon}
              disabled={couponBusy || !couponInput?.trim()}
              className="rounded-xl bg-rain-cloud px-3 py-2 font-inter text-xs text-white disabled:opacity-50"
            >
              {couponBusy ? '…' : 'Apply'}
            </button>
          </div>
        )}
        {couponError ? <p className="font-inter text-[11px] text-amber-700">{couponError}</p> : null}
      </div>

      {payError && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
          <p className="font-inter text-xs leading-snug text-red-600">{payError}</p>
        </div>
      )}
      {isAuthenticated && deliveryZone && (
        <div className="mb-4 space-y-2">
          <p className="font-inter text-xs font-medium uppercase tracking-wider text-rain-cloud/50">Payment</p>
          <div className="grid grid-cols-1 gap-2">
            <label className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 font-inter text-xs ${paymentMethod === 'online' ? 'border-forest-canopy bg-forest-canopy/5' : 'border-border'}`}>
              <input type="radio" name="payment_method" checked={paymentMethod === 'online'} onChange={() => setPaymentMethod('online')} className="accent-forest-canopy" />
              Pay online (UPI / card)
            </label>
            <label className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 font-inter text-xs ${codEligible ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'} ${paymentMethod === 'cod' ? 'border-forest-canopy bg-forest-canopy/5' : 'border-border'}`}>
              <input
                type="radio"
                name="payment_method"
                checked={paymentMethod === 'cod'}
                disabled={!codEligible}
                onChange={() => codEligible && setPaymentMethod('cod')}
                className="accent-forest-canopy"
              />
              Cash on delivery
            </label>
          </div>
          {!codEligible && codReason ? (
            <p className="font-inter text-[10px] text-rain-cloud/45">{codReason}</p>
          ) : null}
        </div>
      )}
      {storeOffline && (
        <p className="mb-4 rounded-xl border border-sun-dried-clay/30 bg-sun-dried-clay/10 px-3 py-2 font-inter text-xs font-semibold text-sun-dried-clay">{offlineMessage}</p>
      )}
      {minShortfallRs > 0 ? (
        <div className="mb-4 rounded-xl border border-soft-border bg-warm-cream px-3 py-2.5 font-inter text-xs text-deep-forest/80">
          <p className="font-semibold text-deep-forest">
            Home delivery starts at ₹{MIN_DELIVERY_ORDER_RS}. Add ₹{minShortfallRs} more to continue.
          </p>
          <p className="mt-1">
            Or pick it up free from our Chanda Nagar store —{' '}
            <a href={pickupHref} target="_blank" rel="noreferrer" className="font-semibold text-forest-canopy underline">
              reserve on WhatsApp
            </a>
            .
          </p>
        </div>
      ) : null}
      {showPayButton ? (
        <div className="hidden lg:block">
          <button
            onClick={handleProceedToPayment}
            disabled={storeOffline || payLoading || placingCod || !canCheckout}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-wet-earth py-3.5 font-inter text-sm text-white transition-all hover:bg-wet-earth/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {payLoading || placingCod ? (
              <><Loader2 className="h-4 w-4 animate-spin" />{paymentMethod === 'cod' ? 'Placing order…' : 'Securing your order…'}</>
            ) : paymentMethod === 'cod' ? (
              'Place COD order'
            ) : (
              'Proceed to Payment'
            )}
          </button>
          {!isAuthenticated && canCheckout && (
            <p className="mt-2 text-center font-inter text-[11px] text-rain-cloud/50">
              Checking out as guest — use your email and phone to track this order later.
            </p>
          )}
          <p className="mt-3 text-center font-inter text-[10px] text-rain-cloud/30">
            {paymentMethod === 'cod' ? 'Pay the delivery partner in cash when your order arrives' : 'Secure payment via Razorpay'}
          </p>
        </div>
      ) : null}
    </aside>
  );
}

export default function CheckoutSummary() {
  const navigate = useNavigate();
  const { items, totalPrice, clearCart, updateQty, removeItem } = useCart();
  const { enabled: storeOffline, message: offlineMessage } = useStoreOffline();
  const { initiatePayment, loading: payLoading, error: payError, setError } = useRazorpay();
  const { isAuthenticated, user } = useAuth();

  const comboItems = useMemo(() => items.filter((i) => i.type === 'combo' || i.isBundle), [items]);
  const standaloneItems = useMemo(() => items.filter((i) => i.type !== 'combo' && !i.isBundle), [items]);

  const [orderSuccess, setOrderSuccess] = useState(false);
  const [completedOrderId, setCompletedOrderId] = useState(null);
  const [completedOrderNumber, setCompletedOrderNumber] = useState(null);
  const [confirmationEmailSent, setConfirmationEmailSent] = useState(null);
  const [saveAddressToProfile, setSaveAddressToProfile] = useState(true);
  const [deliveryZone, setDeliveryZone] = useState(null);
  const [postalLabel, setPostalLabel] = useState('');
  const [pincodeError, setPincodeError] = useState('');
  const [pincodeChecking, setPincodeChecking] = useState(false);
  const [deliverySlot, setDeliverySlot] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('online');
  const [codEligible, setCodEligible] = useState(false);
  const [codReason, setCodReason] = useState('');
  const [placingCod, setPlacingCod] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponError, setCouponError] = useState('');

  const [address, setAddress] = useState({
    name: '',
    phone: '',
    email: user?.email || '',
    street: '',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '',
    delivery_instructions: '',
    addressId: null,
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['checkout-settings'],
    queryFn: fetchAllAppSettings,
    staleTime: 5 * 60 * 1000,
  });
  const settingsMap = useMemo(
    () => Object.fromEntries(settings.map(s => [s.key || s.setting_key, s.value ?? s.setting_value])),
    [settings]
  );

  const { data: savedAddresses = [] } = useQuery({
    queryKey: ['checkout-addresses', user?.email],
    queryFn: () => appClient.entities.UserAddress.filter({ user_email: user.email }, '-created_date'),
    enabled: !!user?.email,
  });

  useEffect(() => {
    const draft = loadCheckoutDraft();
    if (draft && typeof draft === 'object') {
      setAddress((prev) => ({
        ...prev,
        ...draft,
        email: draft.email || user?.email || prev.email,
      }));
      if (draft.pincode) validatePincode(draft.pincode);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- restore once on mount

  useEffect(() => {
    if (user?.email && !address.email) {
      setAddress(prev => ({ ...prev, email: user.email }));
    }
  }, [user?.email, address.email]);

  useEffect(() => {
    const hasContent = address.name || address.street || address.pincode;
    if (hasContent) saveCheckoutDraft(address);
  }, [address]);

  useEffect(() => {
    if (!savedAddresses.length || address.addressId) return;
    const defaultAddr = savedAddresses.find(a => a.is_default) || savedAddresses[0];
    const mapped = addressToForm(defaultAddr);
    if (mapped) {
      setAddress(prev => ({ ...prev, ...mapped, email: prev.email || user?.email || '' }));
    }
  }, [savedAddresses, address.addressId, user?.email]);

  const subtotalPaise = Math.round(totalPrice * 100);
  const totalBulkSavings = useMemo(() => sumCartBulkSavings(items), [items]);
  const totalWeightKg = useMemo(
    () => items.reduce((sum, item) => sum + (getLineItemStockKg(item) || 0), 0),
    [items]
  );
  const hasFragileItems = useMemo(
    () => items.some((item) => /oil|ghee|glass|honey|pickle/i.test(`${item.title || ''} ${item.variant || ''} ${item.category || ''}`)),
    [items]
  );
  const deliveryQuote = deliveryZone
    ? resolveDeliveryQuote({
        subtotalPaise,
        zone: deliveryZone,
        pincode: address.pincode,
        settingsMap,
        totalWeightKg,
        hasFragileItems,
      })
    : null;
  const deliveryFeePaise = DELIVERY_FEE_AT_CHECKOUT ? (deliveryQuote?.feePaise ?? 0) : 0;
  const discountPaise = Number(appliedCoupon?.discount_paise) || 0;
  const discountLabel = appliedCoupon?.discount_label || appliedCoupon?.coupon_code || '';
  const grandTotalPaise = Math.max(0, subtotalPaise - discountPaise + deliveryFeePaise);
  const grandTotal = grandTotalPaise / 100;

  const applyCheckoutCoupon = useCallback(async () => {
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
        channel: 'web',
        customer_phone: address.phone,
        customer_email: address.email,
      });
      const data = res.data;
      if (!data?.valid || data?.error) throw new Error(data?.error || 'Invalid coupon');
      setAppliedCoupon(data);
    } catch (err) {
      setAppliedCoupon(null);
      setCouponError(err?.message || 'Coupon not valid');
    } finally {
      setCouponBusy(false);
    }
  }, [couponInput, subtotalPaise, address.phone, address.email]);

  const clearCheckoutCoupon = useCallback(() => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError('');
  }, []);

  // Re-validate coupon when cart subtotal changes
  useEffect(() => {
    if (!appliedCoupon?.coupon_code) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await appClient.functions.invoke('validateCouponPreview', {
          coupon_code: appliedCoupon.coupon_code,
          subtotal_paise: subtotalPaise,
          channel: 'web',
          customer_phone: address.phone,
          customer_email: address.email,
        });
        if (cancelled) return;
        if (!res.data?.valid) {
          setAppliedCoupon(null);
          setCouponError(res.data?.error || 'Coupon no longer applies');
        } else {
          setAppliedCoupon(res.data);
          setCouponError('');
        }
      } catch (err) {
        if (!cancelled) {
          setAppliedCoupon(null);
          setCouponError(err?.message || 'Coupon no longer applies');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [subtotalPaise]); // eslint-disable-line react-hooks/exhaustive-deps

  const deliverySlotOptions = useMemo(
    () => (deliveryZone ? buildDeliverySlotOptions(deliveryZone) : []),
    [deliveryZone]
  );

  useEffect(() => {
    if (!deliveryZone) {
      setDeliverySlot('');
      return;
    }
    setDeliverySlot((prev) => {
      if (prev && deliverySlotOptions.some((opt) => opt.value === prev)) return prev;
      return defaultDeliverySlot(deliveryZone) || '';
    });
  }, [deliveryZone, deliverySlotOptions]);

  const validatePincode = useCallback(async (pin) => {
    const code = String(pin || '').trim();
    if (!/^\d{6}$/.test(code)) {
      setDeliveryZone(null);
      setPostalLabel('');
      setPincodeError(code ? 'Enter a valid 6-digit pincode' : '');
      return null;
    }
    setPincodeChecking(true);
    setPincodeError('');
    try {
      const result = await resolvePincodeDelivery(code);
      setPostalLabel(result.postal_label || zoneDisplayName(result) || '');
      if (!result.serviceable) {
        setDeliveryZone(null);
        setPincodeError(result.error || `We don't deliver to ${code} yet.`);
        return null;
      }
      setDeliveryZone(result.zone);
      return result.zone;
    } catch {
      setPincodeError('Could not verify pincode. Try again.');
      setDeliveryZone(null);
      setPostalLabel('');
      return null;
    } finally {
      setPincodeChecking(false);
    }
  }, []);

  const handlePincodeBlur = () => {
    if (address.pincode) validatePincode(address.pincode);
  };

  const isFormValid = address.name && address.phone && address.email && address.street && address.city && address.pincode;
  const minShortfallRs = Math.max(0, Math.ceil(MIN_DELIVERY_ORDER_RS - subtotalPaise / 100));
  const canCheckout = isFormValid && deliveryZone && !pincodeError && deliverySlot && minShortfallRs === 0;

  useEffect(() => {
    if (!isAuthenticated || !isFormValid || !deliveryZone || pincodeError) {
      setCodEligible(false);
      setCodReason('');
      if (paymentMethod === 'cod') setPaymentMethod('online');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await appClient.functions.invoke('checkCodEligibility', {
          amount_paise: grandTotalPaise,
        });
        if (cancelled) return;
        setCodEligible(Boolean(res.data?.eligible));
        setCodReason(res.data?.reason || '');
      } catch {
        if (!cancelled) {
          setCodEligible(false);
          setCodReason('');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated, isFormValid, deliveryZone, pincodeError, grandTotalPaise, paymentMethod]);

  const handleAddressChange = (field, value) => {
    setAddress(prev => ({ ...prev, [field]: value }));
    if (field === 'pincode') {
      setPincodeError('');
      setDeliveryZone(null);
    }
  };

  const selectSavedAddress = (addr) => {
    const mapped = addressToForm(addr);
    if (mapped) {
      setAddress(prev => ({ ...prev, ...mapped, email: prev.email || user?.email || '' }));
      validatePincode(mapped.pincode);
    }
  };

  const completeOrderSuccess = async (result) => {
    const orderNumber = result?.order_number || null;
    setCompletedOrderId(result?.db_order_id || null);
    setCompletedOrderNumber(orderNumber);
    setConfirmationEmailSent(result?.email_sent === true);
    setOrderSuccess(true);
    clearCheckoutDraft();
    clearCart();

    if (saveAddressToProfile && user?.email && !address.addressId) {
      try {
        await appClient.entities.UserAddress.create(
          checkoutAddressToProfilePayload(address, user)
        );
      } catch {
        // non-blocking — order already placed
      }
    }
  };

  const handleProceedToPayment = async () => {
    if (storeOffline) {
      alert(offlineMessage || 'We are currently offline.');
      return;
    }
    if (!isFormValid) {
      alert('Please complete all address details to continue.');
      return;
    }

    const zone = deliveryZone || await validatePincode(address.pincode);
    if (!zone) return;

    setError(null);
    setOrderSuccess(false);

    const shippingAddress = buildShippingAddress(address);
    const quote = resolveDeliveryQuote({
      subtotalPaise,
      zone,
      pincode: address.pincode,
      settingsMap,
      totalWeightKg,
      hasFragileItems,
    });
    const feePaise = DELIVERY_FEE_AT_CHECKOUT ? (quote.feePaise ?? 0) : 0;

    trackBeginCheckout(subtotalPaise / 100, items.length);

    if (paymentMethod === 'cod') {
      if (!codEligible) {
        alert(codReason || 'Cash on delivery is not available for this order.');
        return;
      }
      setPlacingCod(true);
      setError(null);
      try {
        const res = await appClient.functions.invoke('createCodOrder', {
          amount: Math.max(0, subtotalPaise - discountPaise + feePaise),
          subtotal_paise: subtotalPaise,
          delivery_fee_paise: feePaise,
          coupon_code: appliedCoupon?.coupon_code || null,
          items: buildItemsSnapshot(items),
          pincode: address.pincode,
          eta_label: quote.eta_label || zone.eta_label,
          delivery_slot: deliverySlot,
          shipping_address: shippingAddress,
          delivery_instructions: address.delivery_instructions,
          customer: {
            name: address.name,
            email: address.email,
            phone: address.phone,
          },
        });
        await completeOrderSuccess(res.data);
      } catch (err) {
        setError(err.message || 'Could not place COD order. Try online payment.');
      } finally {
        setPlacingCod(false);
      }
      return;
    }

    await initiatePayment({
      amountPaise: Math.max(0, subtotalPaise - discountPaise + feePaise),
      subtotalPaise,
      deliveryFeePaise: feePaise,
      coupon_code: appliedCoupon?.coupon_code || null,
      items: buildItemsSnapshot(items),
      pincode: address.pincode,
      eta_label: quote.eta_label || zone.eta_label,
      delivery_slot: deliverySlot,
      shipping_address: shippingAddress,
      delivery_instructions: address.delivery_instructions,
      customer: {
        name: address.name,
        email: address.email,
        phone: address.phone,
      },
      onSuccess: async (result) => {
        await completeOrderSuccess(result);
      },
      onFailure: () => {},
      onDismiss: () => {},
    });
  };

  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hi Yasvik, I need help with home delivery to my area.')}`;
  const pickupHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Hi Yasvik, I'd like to pick up from your store: ${items.map((item) => `${item.title} ${item.variant || ''} x${item.qty}`.replace(/\s+/g, ' ')).join(', ')}`,
  )}`;

  const asideProps = {
    totalBulkSavings,
    totalPrice,
    discountPaise,
    discountLabel,
    couponInput,
    setCouponInput,
    couponBusy,
    couponError,
    appliedCoupon,
    onApplyCoupon: applyCheckoutCoupon,
    onClearCoupon: clearCheckoutCoupon,
    grandTotal,
    payError,
    isAuthenticated,
    deliveryZone,
    paymentMethod,
    setPaymentMethod,
    codEligible,
    codReason,
    storeOffline,
    offlineMessage,
    payLoading,
    placingCod,
    canCheckout,
    handleProceedToPayment,
    minShortfallRs,
    pickupHref,
  };

  const { data: emptyCartPicks = [] } = useQuery({
    queryKey: ['checkout-empty-picks'],
    queryFn: () => productsApi.listPublished('sort_order', 4),
    enabled: items.length === 0 && !orderSuccess,
    staleTime: 5 * 60 * 1000,
  });

  if (items.length === 0 && !orderSuccess) {
    return (
      <div className="min-h-screen bg-rain-mist px-6 py-12 pb-24">
        <div className="mx-auto max-w-lg text-center">
          <p className="font-cormorant text-2xl text-rain-cloud/60 mb-2">Your cart is empty</p>
          <p className="font-inter text-sm text-rain-cloud/50 mb-6">Add a few staples below or browse the full shop.</p>
          <Link to="/shop" className="inline-block py-3 px-6 bg-wet-earth text-white font-inter text-sm rounded-full">
            Back to Shop
          </Link>
        </div>
        {emptyCartPicks.length > 0 && (
          <div className="mx-auto mt-10 max-w-4xl">
            <h2 className="mb-4 text-center font-cormorant text-2xl text-deep-forest">Popular picks to start with</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {emptyCartPicks.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} variant="homepage" />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (orderSuccess) {
    const trackRef = completedOrderNumber || completedOrderId;
    const trackContact = address.email || address.phone || '';
    const trackHref = trackRef
      ? `/orders/${encodeURIComponent(trackRef)}/track${trackContact ? `?contact=${encodeURIComponent(trackContact)}` : ''}`
      : '/orders/track';

    return (
      <div className="min-h-screen bg-rain-mist px-6 py-12 flex items-center justify-center pb-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center bg-white rounded-2xl p-8 shadow-sm max-w-sm"
        >
          <div className="w-16 h-16 rounded-full bg-forest-canopy/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-forest-canopy" />
          </div>
          <h2 className="font-cormorant text-2xl text-rain-cloud mb-2">Order confirmed</h2>
          <p className="font-inter text-sm text-rain-cloud/60 mb-1">
            Thank you — we&apos;re preparing your order for delivery.
          </p>
          <p className="font-inter text-xs text-rain-cloud/40 mb-2">
            Standard delivery charges apply — we pick the best slot and partner for your area.
          </p>
          {completedOrderNumber ? (
            <div className="mb-4 rounded-xl bg-rain-mist/60 px-4 py-3">
              <p className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/45">Order number</p>
              <p className="font-mono text-lg font-semibold text-rain-cloud">{completedOrderNumber}</p>
            </div>
          ) : null}
          <p className="font-inter text-xs text-rain-cloud/45 mb-6">
            {confirmationEmailSent === true
              ? `Confirmation email sent to ${address.email}.`
              : confirmationEmailSent === false
                ? `We could not send a confirmation email to ${address.email}. Save your order number below and use Track order.`
                : `Save your order number${address.email ? ` and check ${address.email}` : ''} for updates.`}
            {!isAuthenticated ? ' Use your order number and phone to track delivery.' : ' We\'ll update you when your order is packed and out for delivery.'}
          </p>
          {trackRef ? (
            <Link
              to={trackHref}
              className="inline-block mb-3 w-full py-2.5 px-5 border border-forest-canopy text-forest-canopy font-inter text-sm rounded-full"
            >
              Track your order
            </Link>
          ) : null}
          <Link to="/shop" className="inline-block py-3 px-6 bg-forest-canopy text-white font-inter text-sm rounded-full">
            Continue Shopping
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-rain-mist pb-28 lg:pb-12">
      <div className="sticky top-0 z-20 border-b border-border/20 bg-white px-4 py-5 md:px-6">
        <div className="mx-auto max-w-6xl">
          <button onClick={() => navigate(-1)} className="mb-3 inline-flex items-center gap-1 font-inter text-sm text-rain-cloud/60">
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
          <h1 className="font-cormorant text-3xl font-medium text-rain-cloud">Order Summary</h1>
          <p className="mt-1 font-inter text-xs text-rain-cloud/45">
            Courier fee by location &amp; weight — confirmed before we dispatch
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
          <div className="rounded-2xl border border-border/20 bg-white p-5 lg:col-start-1 lg:row-start-1 lg:p-6">
            <h2 className="mb-4 font-cormorant text-xl font-semibold text-rain-cloud">Your Items</h2>
            <div className="max-h-[min(50vh,28rem)] space-y-3 overflow-y-auto pr-1">
              {comboItems.map(item => (
                <div key={item.key} className="overflow-hidden rounded-xl border border-deep-forest/15 bg-warm-cream/40">
                  <div className="flex items-start gap-3 p-3">
                    <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-temple-stone/20">
                      <CheckoutComboThumb item={item} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-cormorant text-base font-medium text-rain-cloud">{item.title}</p>
                        <span className="rounded-full bg-deep-forest/10 px-2 py-0.5 font-inter text-[10px] font-bold uppercase tracking-wide text-deep-forest">
                          {item.yasvikMark || 'Combo'}
                        </span>
                      </div>
                      {item.bundleMetaLine || item.bundleItemCount ? (
                        <p className="mt-1 font-inter text-xs text-rain-cloud/55">
                          {item.bundleMetaLine || `${item.bundleItemCount} products`}
                          {item.qty > 1 ? ` · Qty ${item.qty}` : ''}
                        </p>
                      ) : null}
                      <div className="mt-2 flex items-baseline gap-1.5">
                        <span className="font-cormorant text-base font-medium text-rain-cloud">₹{item.price * item.qty}</span>
                        <span className="font-inter text-[11px] text-rain-cloud/45">Qty {item.qty}</span>
                      </div>
                      <BundleItemDetail item={item} product_details={item.product_details || item.products || []} />
                      <QtyControl item={item} updateQty={updateQty} removeItem={removeItem} />
                    </div>
                  </div>
                </div>
              ))}
              {standaloneItems.map((item) => {
                const variantLabel = formatCartLineVariant(item);
                const savings = getCartLineSavings(item);
                return (
                <div key={item.key} className="flex items-start gap-3 border-b border-border/10 pb-3 last:border-0 last:pb-0">
                  <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-temple-stone/20">
                    {item.hero_image && <img src={safeMedia(item.hero_image, 'thumb')} alt={item.title} className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-cormorant text-base font-medium text-rain-cloud">{item.title}</p>
                    {variantLabel ? <p className="font-inter text-xs text-rain-cloud/50">{variantLabel}</p> : null}
                    <PackSavingsBadge savings={item.bulk_savings} qty={item.qty} surface="cart" className="mt-0.5" />
                    <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <p className="font-inter text-sm font-semibold text-rain-cloud">₹{item.price * item.qty}</p>
                      {savings ? (
                        <>
                          <span className="font-inter text-xs text-rain-cloud/40 line-through">MRP ₹{savings.compare * item.qty}</span>
                          <span className="rounded-full bg-neon-paddy/12 px-2 py-0.5 font-inter text-[10px] font-bold text-neon-paddy">
                            Save ₹{savings.saveTotal}
                          </span>
                        </>
                      ) : (
                        <p className="font-inter text-xs text-rain-cloud/45">₹{item.price} each</p>
                      )}
                    </div>
                    <QtyControl item={item} updateQty={updateQty} removeItem={removeItem} />
                  </div>
                </div>
                );
              })}
            </div>
          </div>

          <CheckoutOrderAside
            {...asideProps}
            className="lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1 lg:self-start"
          />

          <div className="space-y-5 lg:col-start-1 lg:row-start-2">
            {savedAddresses.length > 0 && (
              <div className="rounded-2xl border border-border/20 bg-white p-4">
                <p className="mb-3 font-inter text-xs font-medium uppercase tracking-wider text-rain-cloud/50">Saved addresses</p>
                <div className="flex flex-wrap gap-2">
                  {savedAddresses.map(addr => (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() => selectSavedAddress(addr)}
                      className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-left font-inter text-xs transition-colors ${
                        address.addressId === addr.id
                          ? 'border-forest-canopy bg-forest-canopy/5 text-rain-cloud'
                          : 'border-border text-rain-cloud/60 hover:border-forest-canopy/40'
                      }`}
                    >
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      {addr.label || 'Address'} · {addr.pin_code || addr.postal_code}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-border/20 bg-white p-5 lg:p-6">
              <h2 className="mb-4 font-cormorant text-xl font-semibold text-rain-cloud">Delivery Address</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <input type="text" placeholder="Full Name *" value={address.name} onChange={(e) => handleAddressChange('name', e.target.value)} className="rounded-xl border border-border px-4 py-3 font-inter text-sm focus:border-forest-canopy focus:outline-none" />
                  <input type="tel" placeholder="Phone Number *" value={address.phone} onChange={(e) => handleAddressChange('phone', e.target.value)} className="rounded-xl border border-border px-4 py-3 font-inter text-sm focus:border-forest-canopy focus:outline-none" />
                </div>
                <input type="email" placeholder="Email Address *" value={address.email} onChange={(e) => handleAddressChange('email', e.target.value)} className="w-full rounded-xl border border-border px-4 py-3 font-inter text-sm focus:border-forest-canopy focus:outline-none" />
                <input type="text" placeholder="Street Address *" value={address.street} onChange={(e) => handleAddressChange('street', e.target.value)} className="w-full rounded-xl border border-border px-4 py-3 font-inter text-sm focus:border-forest-canopy focus:outline-none" />
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="City *" value={address.city} onChange={(e) => handleAddressChange('city', e.target.value)} className="rounded-xl border border-border px-4 py-3 font-inter text-sm focus:border-forest-canopy focus:outline-none" />
                  <input type="text" placeholder="Pincode *" value={address.pincode} onChange={(e) => handleAddressChange('pincode', e.target.value)} onBlur={handlePincodeBlur} maxLength={6} className="rounded-xl border border-border px-4 py-3 font-inter text-sm focus:border-forest-canopy focus:outline-none" />
                </div>
                {pincodeChecking && <p className="font-inter text-xs text-rain-cloud/40">Checking delivery area…</p>}
                {deliveryZone && !pincodeError && (
                  <p className="font-inter text-xs text-forest-canopy">
                    ✓ Delivering to {postalLabel || deliveryZone.area_name} · {deliveryQuote?.eta_label || deliveryZone.eta_label}
                  </p>
                )}
                {pincodeError && (
                  <div className="rounded-xl border border-sun-dried-clay/30 bg-sun-dried-clay/10 px-3 py-2">
                    <p className="font-inter text-xs text-sun-dried-clay">{pincodeError}</p>
                    <a href={whatsappHref} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 font-inter text-xs font-medium text-forest-canopy">
                      <MessageCircle className="h-3.5 w-3.5" />
                      WhatsApp Yasvik
                    </a>
                  </div>
                )}
                <textarea
                  placeholder="Delivery instructions (gate code, landmark…)"
                  value={address.delivery_instructions}
                  onChange={(e) => handleAddressChange('delivery_instructions', e.target.value)}
                  rows={2}
                  className="w-full resize-none rounded-xl border border-border px-4 py-3 font-inter text-sm focus:border-forest-canopy focus:outline-none"
                />
                {deliveryZone && deliverySlotOptions.length > 0 && (
                  <div>
                    <p className="mb-2 font-inter text-xs font-medium uppercase tracking-wider text-rain-cloud/50">Preferred delivery window</p>
                    <div className="grid grid-cols-1 gap-2">
                      {deliverySlotOptions.map((opt) => (
                        <label
                          key={opt.value}
                          className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 font-inter text-xs transition-colors ${
                            deliverySlot === opt.value
                              ? 'border-forest-canopy bg-forest-canopy/5 text-rain-cloud'
                              : 'border-border text-rain-cloud/65 hover:border-forest-canopy/30'
                          }`}
                        >
                          <input
                            type="radio"
                            name="delivery_slot"
                            value={opt.value}
                            checked={deliverySlot === opt.value}
                            onChange={() => setDeliverySlot(opt.value)}
                            className="accent-forest-canopy"
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                {isAuthenticated && !address.addressId && (
                  <label className="flex items-center gap-2 font-inter text-xs text-rain-cloud/55">
                    <input
                      type="checkbox"
                      checked={saveAddressToProfile}
                      onChange={(e) => setSaveAddressToProfile(e.target.checked)}
                      className="rounded border-border"
                    />
                    Save this address to my profile for next time
                  </label>
                )}
              </div>
            </div>

            <DeliveryInfoCard compact className="lg:hidden" />
            <DeliveryInfoCard className="hidden lg:block" />
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/20 bg-white shadow-[0_-8px_30px_rgba(31,61,43,0.08)] pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4">
          <div className="min-w-0 flex-1">
            <p className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/45">Total</p>
            <p className="font-cormorant text-xl font-medium text-rain-cloud">₹{grandTotal}</p>
          </div>
          <button
            onClick={handleProceedToPayment}
            disabled={storeOffline || payLoading || placingCod || !canCheckout}
            className="flex flex-shrink-0 items-center justify-center gap-2 rounded-full bg-wet-earth px-5 py-3 font-inter text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {payLoading || placingCod ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : paymentMethod === 'cod' ? (
              'Place order'
            ) : (
              'Pay now'
            )}
          </button>
        </div>
        {!canCheckout && !payLoading && !placingCod ? (
          <p className="mx-auto mt-1 max-w-6xl px-4 text-center font-inter text-[10px] text-rain-cloud/45">
            {minShortfallRs > 0
              ? `Add ₹${minShortfallRs} more for home delivery, or pick up free at our store`
              : 'Complete address & pincode to continue'}
          </p>
        ) : null}
      </div>
    </div>
  );
}
