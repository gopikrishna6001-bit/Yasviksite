import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, X } from 'lucide-react';
import { useCart } from '@/lib/CartContext';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  fetchAllAppSettings,
  resolveSetting,
  SETTINGS_QUERY_KEYS,
} from '@/services/settingsService';

const FREE_DELIVERY_DEFAULT = 999;

export default function FloatingCart({ onOpen }) {
  const { items, totalItems, totalPrice } = useCart();
  const location = useLocation();
  const [dismissed, setDismissed] = useState(false);

  const { data: settings = [] } = useQuery({
    queryKey: SETTINGS_QUERY_KEYS.public,
    queryFn: fetchAllAppSettings,
    staleTime: 10 * 60 * 1000,
  });

  const threshold = Number(resolveSetting(settings, 'free_delivery_threshold', FREE_DELIVERY_DEFAULT));
  const remaining = threshold - totalPrice;
  const nearFreeDelivery = remaining > 0 && remaining <= 300;
  const hasFreeDelivery = totalPrice >= threshold;

  useEffect(() => {
    setDismissed(false);
  }, [totalItems]);

  const canShowOnThisPage = location.pathname === '/shop' || location.pathname.startsWith('/product/');

  // Keep the shortcut focused on active shopping flows only.
  if (totalItems === 0 || !canShowOnThisPage || dismissed) return null;

  const deliveryMessage = hasFreeDelivery
    ? 'Free delivery unlocked'
    : nearFreeDelivery
      ? `₹${Math.ceil(remaining)} to free delivery`
      : 'Review cart';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 34, scale: 0.9, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 34, scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 320 }}
        className="fixed bottom-5 right-4 z-40 flex items-end gap-2"
      >
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Hide cart shortcut"
          className="mb-1 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--theme-border)] bg-[var(--bg-card)] text-[var(--text-main)] shadow-lg active:scale-95"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onOpen}
          aria-label={`Open cart, ${totalItems} items, total ₹${totalPrice}`}
          className="group relative flex h-16 w-16 items-center justify-center rounded-full bg-[var(--theme-header)] text-[var(--theme-header-text)] shadow-[0_18px_46px_rgba(28,58,16,.28)] ring-1 ring-white/20 active:scale-[0.98]"
        >
          <motion.span
            aria-hidden="true"
            className="absolute inset-0 rounded-full border border-[var(--action-primary)]/55"
            animate={{ scale: [1, 1.16, 1], opacity: [0.45, 0, 0.45] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--action-primary)_16%,var(--bg-card))] text-[var(--action-primary)]">
            <ShoppingBag className="h-5 w-5" strokeWidth={1.8} />
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#C24E1B] px-1 font-inter text-[10px] font-bold text-white">
              {totalItems > 9 ? '9+' : totalItems}
            </span>
          </div>
          <span className="pointer-events-none absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-full bg-[var(--bg-card)] px-3 py-1.5 font-inter text-[10px] font-bold text-[var(--text-main)] opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            ₹{totalPrice} · {deliveryMessage}
          </span>
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
