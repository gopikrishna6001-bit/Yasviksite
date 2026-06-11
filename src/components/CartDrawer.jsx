import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, ShoppingBag, Gift, CreditCard } from 'lucide-react';
import { useCart } from '@/lib/CartContext';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchAllAppSettings, resolveSetting, SETTINGS_QUERY_KEYS } from '@/services/settingsService';

function cleanPublicLicense(value = '') {
  const text = String(value || '').trim();
  return /pending|to be confirmed|license number/i.test(text) ? '' : text;
}

export default function CartDrawer({ open, onClose }) {
  const navigate = useNavigate();
  const { items, updateQty, removeItem, totalPrice, totalItems } = useCart();
  const { data: settings = [] } = useQuery({ queryKey: SETTINGS_QUERY_KEYS.public, queryFn: fetchAllAppSettings, staleTime: 10 * 60 * 1000 });
  const freeDeliveryThreshold = Number(resolveSetting(settings, 'free_delivery_threshold', 999));
  const fssaiLicense = cleanPublicLicense(resolveSetting(settings, 'fssai_license_number', ''));
  const supportEmail = resolveSetting(settings, 'support_email', 'hello@yasvik.com');
  const qualifiesForFreeDelivery = totalPrice >= freeDeliveryThreshold;
  const amountNeeded = Math.max(0, freeDeliveryThreshold - totalPrice);
  const deliveryProgress = Math.min(100, (totalPrice / freeDeliveryThreshold) * 100);
  const milestoneCopy = qualifiesForFreeDelivery
    ? 'The path is clear. Your harvest qualifies for free delivery.'
    : deliveryProgress >= 70
      ? `Almost there — add ₹${amountNeeded.toFixed(0)} more for free delivery.`
      : 'Your Yasvik harvest is assembling.';

  const handleCheckout = () => {
    onClose();
    navigate('/checkout');
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex justify-end">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={onClose} />
          <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 260 }} className="relative z-10 flex h-full w-full max-w-md flex-col bg-white text-[#122615] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#D9D0B0] px-5 py-4">
              <div className="flex items-center gap-2"><ShoppingBag className="h-5 w-5 text-[#0B4F2F]" /><h2 className="font-syne text-xl font-bold">My Cart {totalItems > 0 && <span className="font-inter text-sm font-medium text-[#96947B]">({totalItems})</span>}</h2></div>
              <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full border border-[#D9D0B0] text-[#6E735D] hover:bg-[#F3F3EB]"><X className="h-4 w-4" /></button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <ShoppingBag className="mb-4 h-12 w-12 text-[#D0D0C4]" />
                  <p className="font-syne text-2xl font-bold text-[#122615]">Your cart is empty</p>
                  <p className="mt-2 font-inter text-sm text-[#6E735D]">Add everyday staples, then check out in one clean flow.</p>
                  <Link to="/shop" onClick={onClose} className="mt-5 rounded-xl bg-[#0B4F2F] px-5 py-3 font-inter text-sm font-bold text-white hover:bg-[#2D7A3E]">Start Shopping</Link>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.key} className="flex gap-3 rounded-xl bg-[#FBF7EA] p-3">
                    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#D9D0B0] bg-white">
                      {item.hero_image ? <img src={item.hero_image} alt={item.title} className="h-full w-full object-cover" /> : <ShoppingBag className="h-6 w-6 text-[#C8C8B8]" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-inter text-sm font-semibold text-[#122615]">{item.title}</p>
                      {item.variant && <p className="mt-0.5 font-inter text-[11px] text-[#96947B]">{item.variant}</p>}
                      {item.unit && !item.variant && <p className="mt-0.5 font-inter text-[11px] text-[#96947B]">{item.unit}</p>}
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="font-syne text-base font-bold text-[#0B4F2F]">₹{item.price * item.qty}</span>
                        <div className="flex items-center overflow-hidden rounded-lg border border-[#D9D0B0] bg-white">
                          <button onClick={() => updateQty(item.key, item.qty - 1)} className="flex h-8 w-8 items-center justify-center hover:bg-[#F3F3EB]"><Minus className="h-3.5 w-3.5" /></button>
                          <span className="min-w-7 text-center font-inter text-sm font-bold">{item.qty}</span>
                          <button onClick={() => updateQty(item.key, item.qty + 1)} className="flex h-8 w-8 items-center justify-center hover:bg-[#F3F3EB]"><Plus className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => removeItem(item.key)} className="mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[#96947B] hover:bg-white hover:text-[#B96A2E]"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ))
              )}
            </div>

            {items.length > 0 && (
              <div className="space-y-3 border-t border-[#D9D0B0] px-5 py-4">
                <div className="rounded-xl border border-[#D5B548] bg-[#FFF4C9] p-3">
                  <div className="flex items-center gap-2"><Gift className="h-4 w-4 text-[#A9791F]" /><p className="font-inter text-xs font-semibold text-[#332713]">{milestoneCopy}</p></div>
                  {!qualifiesForFreeDelivery && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white"><motion.div initial={{ width: 0 }} animate={{ width: `${deliveryProgress}%` }} transition={{ duration: 0.35 }} className="h-full rounded-full bg-[#0B4F2F]" /></div>}
                </div>
                <div className="space-y-1 border-t border-[#D9D0B0] pt-3 font-inter text-sm">
                  <div className="flex justify-between text-[#6E735D]"><span>Subtotal</span><span>₹{totalPrice}</span></div>
                  <div className="flex justify-between text-[#2D7A3E]"><span>Delivery</span><span>{qualifiesForFreeDelivery ? 'FREE' : 'Calculated at checkout'}</span></div>
                  <div className="flex justify-between pt-2 font-syne text-xl font-bold text-[#122615]"><span>Total</span><span>₹{totalPrice}</span></div>
                </div>
                <button onClick={handleCheckout} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0B4F2F] font-inter text-sm font-bold text-white hover:bg-[#2D7A3E] active:scale-[0.98]"><CreditCard className="h-4 w-4" /> Proceed to Checkout</button>
                <div className="rounded-xl border border-[#D9D0B0] bg-[#F8F4E7] p-3 font-inter text-[10px] leading-relaxed text-[#6E735D]">{fssaiLicense && <p>FSSAI: {fssaiLicense}</p>}<p>Support: {supportEmail}</p></div>
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
