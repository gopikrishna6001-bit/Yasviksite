import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useCart } from '@/lib/CartContext';
import { useRazorpay } from '@/hooks/useRazorpay';
import { useAuth } from '@/lib/AuthContext';
import { appClient } from '@/api/appClient';
import { ChevronLeft, Loader2, AlertCircle, CheckCircle, Minus, Plus, Trash2, MapPin, MessageCircle } from 'lucide-react';
import { useStoreOffline } from '@/hooks/useStoreOffline';
import BundleItemDetail from '@/components/checkout/BundleItemDetail';
import { getLineItemStockKg } from '@/lib/productVariantUtils';
import { buildItemsSnapshot, buildShippingAddress } from '@/lib/orderPayloadUtils';
import {
  resolvePincodeDelivery,
  resolveDeliveryQuote,
  resolveFreeThreshold,
  formatDeliveryFee,
  zoneDisplayName,
} from '@/lib/deliveryZones';
import { fetchAllAppSettings } from '@/services/settingsService';
import { STORE_GEOGRAPHY } from '@/brand/monsoonTokens';
import { saveCheckoutDraft, loadCheckoutDraft, clearCheckoutDraft } from '@/lib/checkoutDraft';
import { checkoutAddressToProfilePayload } from '@/lib/userAddressPayload';
import { safeMedia } from '@/lib/mediaUrl';

import { YASVIK_WHATSAPP_NUMBER } from '@/lib/storeLocation';
import { trackBeginCheckout } from '@/lib/analytics';

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

export default function CheckoutSummary() {
  const navigate = useNavigate();
  const { items, totalPrice, clearCart, updateQty, removeItem } = useCart();
  const { enabled: storeOffline, message: offlineMessage } = useStoreOffline();
  const { initiatePayment, loading: payLoading, error: payError, setError } = useRazorpay();
  const { isAuthenticated, user } = useAuth();

  const comboItems = useMemo(() => items.filter(i => i.type === 'combo'), [items]);
  const standaloneItems = useMemo(() => items.filter(i => i.type !== 'combo'), [items]);

  const [orderSuccess, setOrderSuccess] = useState(false);
  const [completedOrderId, setCompletedOrderId] = useState(null);
  const [completedOrderNumber, setCompletedOrderNumber] = useState(null);
  const [saveAddressToProfile, setSaveAddressToProfile] = useState(true);
  const [deliveryZone, setDeliveryZone] = useState(null);
  const [postalLabel, setPostalLabel] = useState('');
  const [pincodeError, setPincodeError] = useState('');
  const [pincodeChecking, setPincodeChecking] = useState(false);

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
  const freeThreshold = resolveFreeThreshold(settingsMap);

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
  const deliveryFeePaise = deliveryQuote?.feePaise ?? 0;
  const grandTotalPaise = subtotalPaise + (deliveryFeePaise ?? 0);
  const grandTotal = grandTotalPaise / 100;

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
  const canCheckout = isFormValid && deliveryZone && !pincodeError;

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

    if (!isAuthenticated) {
      saveCheckoutDraft(address);
      navigate('/login?next=/checkout');
      return;
    }

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
    const feePaise = quote.feePaise ?? 0;

    trackBeginCheckout(subtotalPaise / 100, items.length);

    await initiatePayment({
      amountPaise: subtotalPaise + feePaise,
      subtotalPaise,
      deliveryFeePaise: feePaise,
      items: buildItemsSnapshot(items),
      pincode: address.pincode,
      eta_label: quote.eta_label || zone.eta_label,
      shipping_address: shippingAddress,
      delivery_instructions: address.delivery_instructions,
      customer: {
        name: address.name,
        email: address.email,
        phone: address.phone,
      },
      onSuccess: async (result) => {
        const orderNumber = result?.order_number || null;
        setCompletedOrderId(result?.db_order_id || null);
        setCompletedOrderNumber(orderNumber);
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
      },
      onFailure: () => {},
      onDismiss: () => {},
    });
  };

  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hi Yasvik, I need help with delivery to my pincode.')}`;

  if (items.length === 0 && !orderSuccess) {
    return (
      <div className="min-h-screen bg-rain-mist px-6 py-12 flex items-center justify-center pb-24">
        <div className="text-center max-w-sm">
          <p className="font-cormorant text-2xl text-rain-cloud/60 mb-4">Your harvest bag is empty</p>
          <Link to="/shop" className="inline-block py-3 px-6 bg-wet-earth text-white font-inter text-sm rounded-full">
            Back to Shop
          </Link>
        </div>
      </div>
    );
  }

  if (orderSuccess) {
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
          <h2 className="font-cormorant text-2xl text-rain-cloud mb-2">Your Harvest Is Confirmed</h2>
          <p className="font-inter text-sm text-rain-cloud/60 mb-1">
            Thank you for choosing consciously. Your order is now confirmed.
          </p>
          <p className="font-inter text-xs text-rain-cloud/40 mb-2">
            {deliveryZone?.eta_label || 'Same-day / next-day delivery'} to {address.city}, {STORE_GEOGRAPHY.city}.
          </p>
          {completedOrderNumber && (
            <p className="font-mono text-sm text-rain-cloud/70 mb-4">
              Order <span className="font-semibold text-rain-cloud">{completedOrderNumber}</span>
            </p>
          )}
          <p className="font-inter text-xs text-rain-cloud/45 mb-6">
            Confirmation sent to {address.email}. We&apos;ll update you when your order is packed and out for delivery.
          </p>
          {(completedOrderNumber || completedOrderId) && (
            <Link
              to={`/orders/${completedOrderNumber || completedOrderId}/track`}
              className="inline-block mb-3 py-2.5 px-5 border border-forest-canopy text-forest-canopy font-inter text-sm rounded-full"
            >
              Track your order
            </Link>
          )}
          <Link to="/shop" className="inline-block py-3 px-6 bg-forest-canopy text-white font-inter text-sm rounded-full">
            Continue Shopping
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-rain-mist pb-24">
      <div className="px-6 py-6 bg-white border-b border-border/20 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-rain-cloud/60 font-inter text-sm mb-4 inline-flex">
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="font-cormorant text-3xl text-rain-cloud font-medium">Order Summary</h1>
          <p className="font-inter text-xs text-rain-cloud/45 mt-1">Door delivery across {STORE_GEOGRAPHY.city}</p>
        </div>
      </div>

      <div className="px-6 py-8 max-w-2xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-border/20">
              <h2 className="font-cormorant text-xl text-rain-cloud font-light mb-4">Your Items</h2>
              <div className="space-y-3">
                {comboItems.map(item => (
                  <div key={item.key} className="rounded-xl border border-warm-turmeric/30 bg-warm-turmeric/5 overflow-hidden">
                    <div className="flex items-start gap-3 p-3">
                      <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-temple-stone/20">
                        {item.hero_image && <img src={safeMedia(item.hero_image, 'thumb')} alt={item.title} className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-cormorant text-base text-rain-cloud font-medium">{item.title}</p>
                          <span className="font-inter text-[10px] px-2 py-0.5 bg-warm-turmeric/20 text-wet-earth rounded-full">Bundle</span>
                        </div>
                        <div className="flex items-baseline gap-1.5 mt-2">
                          <span className="font-cormorant text-base text-rain-cloud font-medium">₹{item.price * item.qty}</span>
                        </div>
                        <BundleItemDetail item={item} product_details={item.product_details || item.products || []} />
                        <QtyControl item={item} updateQty={updateQty} removeItem={removeItem} />
                      </div>
                    </div>
                  </div>
                ))}
                {standaloneItems.map((item) => (
                  <div key={item.key} className="flex items-start gap-3 pb-3 border-b border-border/10 last:border-0 last:pb-0">
                    <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-temple-stone/20">
                      {item.hero_image && <img src={safeMedia(item.hero_image, 'thumb')} alt={item.title} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-cormorant text-base text-rain-cloud font-medium">{item.title}</p>
                      {item.variant && <p className="font-inter text-xs text-rain-cloud/40">{item.variant}{item.pack_kg ? ` · ${item.pack_kg}kg pack` : ''}</p>}
                      {getLineItemStockKg(item) > 0 && <p className="font-inter text-[10px] text-rain-cloud/35">Bulk stock use: {getLineItemStockKg(item)}kg</p>}
                      <p className="font-inter text-sm text-rain-cloud/60 mt-0.5">₹{item.price} each</p>
                      <QtyControl item={item} updateQty={updateQty} removeItem={removeItem} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {savedAddresses.length > 0 && (
              <div className="bg-white rounded-2xl p-4 border border-border/20">
                <p className="font-inter text-xs font-medium text-rain-cloud/50 uppercase tracking-wider mb-3">Saved addresses</p>
                <div className="flex flex-wrap gap-2">
                  {savedAddresses.map(addr => (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() => selectSavedAddress(addr)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-left font-inter text-xs transition-colors ${
                        address.addressId === addr.id
                          ? 'border-forest-canopy bg-forest-canopy/5 text-rain-cloud'
                          : 'border-border text-rain-cloud/60 hover:border-forest-canopy/40'
                      }`}
                    >
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      {addr.label || 'Address'} · {addr.pin_code || addr.postal_code}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl p-6 border border-border/20">
              <h2 className="font-cormorant text-xl text-rain-cloud font-light mb-4">Delivery Address</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="text" placeholder="Full Name *" value={address.name} onChange={(e) => handleAddressChange('name', e.target.value)} className="px-4 py-3 border border-border rounded-xl font-inter text-sm focus:outline-none focus:border-forest-canopy" />
                  <input type="tel" placeholder="Phone Number *" value={address.phone} onChange={(e) => handleAddressChange('phone', e.target.value)} className="px-4 py-3 border border-border rounded-xl font-inter text-sm focus:outline-none focus:border-forest-canopy" />
                </div>
                <input type="email" placeholder="Email Address *" value={address.email} onChange={(e) => handleAddressChange('email', e.target.value)} className="w-full px-4 py-3 border border-border rounded-xl font-inter text-sm focus:outline-none focus:border-forest-canopy" />
                <input type="text" placeholder="Street Address *" value={address.street} onChange={(e) => handleAddressChange('street', e.target.value)} className="w-full px-4 py-3 border border-border rounded-xl font-inter text-sm focus:outline-none focus:border-forest-canopy" />
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="City *" value={address.city} onChange={(e) => handleAddressChange('city', e.target.value)} className="px-4 py-3 border border-border rounded-xl font-inter text-sm focus:outline-none focus:border-forest-canopy" />
                  <input type="text" placeholder="Pincode *" value={address.pincode} onChange={(e) => handleAddressChange('pincode', e.target.value)} onBlur={handlePincodeBlur} maxLength={6} className="px-4 py-3 border border-border rounded-xl font-inter text-sm focus:outline-none focus:border-forest-canopy" />
                </div>
                {pincodeChecking && <p className="font-inter text-xs text-rain-cloud/40">Checking delivery area…</p>}
                {deliveryZone && !pincodeError && (
                  <p className="font-inter text-xs text-forest-canopy">
                    ✓ Delivering to {postalLabel || deliveryZone.area_name} · {deliveryQuote?.eta_label || deliveryZone.eta_label}
                    <span className="block text-[10px] text-rain-cloud/35 mt-0.5">Verified via India Post directory</span>
                  </p>
                )}
                {deliveryQuote?.notes?.map((note) => (
                  <p key={note} className="font-inter text-[10px] text-rain-cloud/45">{note}</p>
                ))}
                {deliveryQuote?.warnings?.map((warn) => (
                  <p key={warn} className="font-inter text-[10px] text-sun-dried-clay/80">{warn}</p>
                ))}
                {pincodeError && (
                  <div className="rounded-xl border border-sun-dried-clay/30 bg-sun-dried-clay/10 px-3 py-2">
                    <p className="font-inter text-xs text-sun-dried-clay">{pincodeError}</p>
                    <a href={whatsappHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-2 font-inter text-xs font-medium text-forest-canopy">
                      <MessageCircle className="w-3.5 h-3.5" />
                      WhatsApp Yasvik
                    </a>
                  </div>
                )}
                <textarea
                  placeholder="Delivery instructions (gate code, landmark…)"
                  value={address.delivery_instructions}
                  onChange={(e) => handleAddressChange('delivery_instructions', e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 border border-border rounded-xl font-inter text-sm focus:outline-none focus:border-forest-canopy resize-none"
                />
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
          </div>

          <div className="bg-white rounded-2xl p-6 border border-border/20 h-fit sticky top-28">
            <h3 className="font-cormorant text-lg text-rain-cloud font-light mb-4">Order Total</h3>
            <div className="space-y-3 mb-6 pb-6 border-b border-border/20">
              <div className="flex items-center justify-between">
                <span className="font-inter text-sm text-rain-cloud/60">Subtotal</span>
                <span className="font-cormorant text-sm text-rain-cloud">₹{totalPrice}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-inter text-sm text-rain-cloud/60">Delivery</span>
                <span className={`font-inter text-sm ${deliveryFeePaise === 0 && deliveryZone ? 'text-forest-canopy' : 'text-rain-cloud'}`}>
                  {deliveryZone ? formatDeliveryFee(deliveryFeePaise) : '—'}
                </span>
              </div>
              {freeThreshold > 0 && deliveryQuote?.source !== 'local_colony' && (
                <p className="font-inter text-[10px] text-rain-cloud/35">Free delivery above ₹{freeThreshold} in {STORE_GEOGRAPHY.city}</p>
              )}
              {deliveryQuote?.pickupRecommended && (
                <p className="font-inter text-[10px] text-sun-dried-clay/80">Store pickup recommended for small orders — or pay ₹30 local delivery</p>
              )}
            </div>
            <div className="flex items-center justify-between mb-6">
              <span className="font-cormorant text-lg text-rain-cloud">Total</span>
              <span className="font-cormorant text-2xl text-rain-cloud font-medium">₹{grandTotal}</span>
            </div>
            {payError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 rounded-xl mb-4">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="font-inter text-xs text-red-600 leading-snug">{payError}</p>
              </div>
            )}
            {storeOffline && (
              <p className="mb-4 rounded-xl border border-sun-dried-clay/30 bg-sun-dried-clay/10 px-3 py-2 font-inter text-xs font-semibold text-sun-dried-clay">{offlineMessage}</p>
            )}
            <button
              onClick={handleProceedToPayment}
              disabled={storeOffline || payLoading || !canCheckout}
              className="w-full py-3.5 bg-wet-earth text-white font-inter text-sm rounded-full hover:bg-wet-earth/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {payLoading ? (<><Loader2 className="w-4 h-4 animate-spin" />Securing your order…</>) : isAuthenticated ? 'Proceed to Payment' : 'Login & Pay'}
            </button>
            {!isAuthenticated && canCheckout && (
              <p className="font-inter text-[10px] text-center text-rain-cloud/40 mt-2">
                Your address is saved — you&apos;ll return here after login.
              </p>
            )}
            <p className="font-inter text-[10px] text-center text-rain-cloud/30 mt-3">Secure payment via Razorpay</p>
          </div>
        </div>
      </div>
    </div>
  );
}
