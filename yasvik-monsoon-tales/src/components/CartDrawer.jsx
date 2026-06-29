import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, ShoppingBag, Truck, CreditCard, MessageCircle } from 'lucide-react';
import { useCart } from '@/lib/CartContext';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { resolveFreeDeliveryThreshold } from '@/lib/commerceCopy';
import { fetchAllAppSettings, resolveSetting, resolveSettingsMap, SETTINGS_QUERY_KEYS } from '@/services/settingsService';
import { getLineItemStockKg } from '@/lib/productVariantUtils';
import CartForgotThese from '@/components/crosssell/CartForgotThese';
import YasvikButton from '@/components/brand/YasvikButton';
import { safeMedia } from '@/lib/mediaUrl';
import { YASVIK_WHATSAPP_NUMBER } from '@/lib/storeLocation';

function normalizePhone(value = '') {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return YASVIK_WHATSAPP_NUMBER;
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

function cleanPublicLicense(value = '') {
  const text = String(value || '').trim();
  return /pending|to be confirmed|license number/i.test(text) ? '' : text;
}

export default function CartDrawer({ open, onClose }) {
  const navigate = useNavigate();
  const { items, updateQty, removeItem, totalPrice, totalItems, storeOffline } = useCart();
  const { data: settings = [] } = useQuery({
    queryKey: SETTINGS_QUERY_KEYS.public,
    queryFn: fetchAllAppSettings,
    staleTime: 10 * 60 * 1000,
  });
  const settingsMap = resolveSettingsMap(settings);
  const freeDeliveryThreshold = resolveFreeDeliveryThreshold(settingsMap);
  const fssaiLicense = cleanPublicLicense(resolveSetting(settings, 'fssai_license_number', ''));
  const qualifiesForFreeDelivery = totalPrice >= freeDeliveryThreshold;
  const amountNeeded = Math.max(0, freeDeliveryThreshold - totalPrice);
  const deliveryProgress = Math.min(100, (totalPrice / freeDeliveryThreshold) * 100);
  const milestoneCopy = qualifiesForFreeDelivery
    ? `Free home delivery in Hyderabad — unlocked.`
    : deliveryProgress >= 70
      ? `₹${amountNeeded.toFixed(0)} more for free delivery in Hyderabad.`
      : `Free home delivery in Hyderabad above ₹${freeDeliveryThreshold}.`;
  const whatsappNumber = normalizePhone(
    settingsMap.whatsapp_number || settingsMap.support_whatsapp_number || settingsMap.contact_whatsapp || settingsMap.footer_whatsapp_number,
  );
  const whatsappHref = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Hi Yasvik, I have a query about my order / delivery.')}`;


  const handleCheckout = () => {
    if (storeOffline) return;
    onClose();
    navigate('/checkout');
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-deep-forest/25 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-soft-border bg-warm-cream text-deep-forest shadow-[0_24px_64px_rgba(31,61,43,0.16)]"
          >
            <div className="flex items-center justify-between border-b border-soft-border bg-white/90 px-5 py-4 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-neon-paddy" strokeWidth={1.7} />
                <h2 className="font-cormorant text-2xl font-semibold text-deep-forest">
                  My Cart
                  {totalItems > 0 && (
                    <span className="ml-2 font-inter text-sm font-medium text-deep-forest/55">({totalItems})</span>
                  )}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close cart"
                className="yasvik-icon-button h-9 w-9"
              >
                <X className="h-4 w-4" strokeWidth={1.7} />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <ShoppingBag className="mb-4 h-12 w-12 text-deep-forest/20" strokeWidth={1.5} />
                  <p className="font-cormorant text-2xl font-semibold text-deep-forest">Your cart is empty</p>
                  <p className="mt-2 font-inter text-sm text-deep-forest/65">
                    Add millets, staples and pantry essentials, then check out on the website.
                  </p>
                  <YasvikButton to="/shop" onClick={onClose} variant="primary" className="mt-5">
                    Start shopping
                  </YasvikButton>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.key} className="flex gap-3 rounded-2xl border border-soft-border bg-white p-3 shadow-[0_8px_24px_rgba(31,61,43,0.04)]">
                    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-soft-border bg-warm-cream">
                      {item.hero_image ? (
                        <img src={safeMedia(item.hero_image, 'thumb')} alt={item.title} className="h-full w-full object-cover" />
                      ) : (
                        <ShoppingBag className="h-6 w-6 text-deep-forest/25" strokeWidth={1.5} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-inter text-sm font-semibold text-deep-forest">{item.title}</p>
                      {item.variant && (
                        <p className="mt-0.5 font-inter text-[11px] text-deep-forest/55">
                          {item.variant}
                          {item.pack_kg ? ` · ${item.pack_kg}kg pack` : ''}
                        </p>
                      )}
                      {item.unit && !item.variant && (
                        <p className="mt-0.5 font-inter text-[11px] text-deep-forest/55">{item.unit}</p>
                      )}
                      {getLineItemStockKg(item) > 0 && (
                        <p className="mt-0.5 font-inter text-[10px] text-deep-forest/45">
                          Bulk stock use: {getLineItemStockKg(item)}kg
                        </p>
                      )}
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="font-inter text-base font-bold text-deep-forest">₹{item.price * item.qty}</span>
                        <div className="flex items-center overflow-hidden rounded-lg border border-soft-border bg-warm-cream">
                          <button
                            type="button"
                            onClick={() => updateQty(item.key, item.qty - 1)}
                            className="flex h-8 w-8 items-center justify-center hover:bg-white"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="min-w-7 text-center font-inter text-sm font-bold">{item.qty}</span>
                          <button
                            type="button"
                            onClick={() => updateQty(item.key, item.qty + 1)}
                            className="flex h-8 w-8 items-center justify-center hover:bg-white"
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.key)}
                      aria-label={`Remove ${item.title}`}
                      className="mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-deep-forest/45 hover:bg-warm-cream hover:text-sun-dried-clay"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {items.length > 0 ? (
              <CartForgotThese cartProductIds={items.map((item) => item.productId || item.id).filter(Boolean)} />
            ) : null}

            {items.length > 0 && (
              <div className="space-y-3 border-t border-soft-border bg-white/90 px-5 py-4 backdrop-blur-sm">
                <div className="rounded-2xl border border-soft-border bg-warm-cream p-3">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-neon-paddy" strokeWidth={1.7} />
                    <p className="font-inter text-xs font-semibold text-deep-forest/80">{milestoneCopy}</p>
                  </div>
                  {!qualifiesForFreeDelivery && (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${deliveryProgress}%` }}
                        transition={{ duration: 0.35 }}
                        className="h-full rounded-full bg-neon-paddy"
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-1 border-t border-soft-border pt-3 font-inter text-sm">
                  <div className="flex justify-between text-deep-forest/65">
                    <span>Subtotal</span>
                    <span>₹{totalPrice}</span>
                  </div>
                  <div className="flex justify-between text-neon-paddy">
                    <span>Delivery</span>
                    <span>{qualifiesForFreeDelivery ? 'FREE' : 'At checkout'}</span>
                  </div>
                  <div className="flex justify-between pt-2 font-cormorant text-xl font-semibold text-deep-forest">
                    <span>Total</span>
                    <span>₹{totalPrice}</span>
                  </div>
                </div>
                {storeOffline && (
                  <p className="rounded-2xl border border-neon-paddy/25 bg-neon-paddy/8 px-3 py-2 font-inter text-xs font-semibold text-deep-forest/75">
                    We&apos;re restocking the shop — checkout will open again soon.
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={storeOffline}
                  className="yasvik-harvest-cta w-full gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CreditCard className="h-4 w-4" /> Proceed to checkout
                </button>
                <div className="rounded-2xl border border-soft-border bg-warm-cream p-3 font-inter text-[10px] leading-relaxed text-deep-forest/55">
                  <p>Delivery charges applicable for locations outside Hyderabad.</p>
                  {fssaiLicense && <p className="mt-1">FSSAI: {fssaiLicense}</p>}
                </div>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 rounded-2xl border border-[#25D366]/40 bg-[#25D366]/8 px-4 py-2.5 font-inter text-xs font-semibold text-deep-forest transition-colors hover:bg-[#25D366]/15"
                >
                  <MessageCircle className="h-3.5 w-3.5 text-[#25D366]" />
                  Message us on WhatsApp for any queries
                </a>
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
