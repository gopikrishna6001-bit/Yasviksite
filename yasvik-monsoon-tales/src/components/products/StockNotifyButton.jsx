/**
 * StockNotifyButton
 * ─────────────────────────────────────────────────────────
 * Elegant bell toggle for "notify me when back in stock".
 * Shows for out-of-stock products (stock === 0) or always
 * when forceShow=true.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellOff, Check } from 'lucide-react';
import { useState } from 'react';
import { useStockNotify } from '@/hooks/useStockNotify';

export default function StockNotifyButton({ productId, stock, forceShow = false }) {
  const { isSubscribed, toggle } = useStockNotify(productId);
  const [flash, setFlash] = useState(false);

  const outOfStock = stock === 0 || stock == null;
  if (!outOfStock && !forceShow) return null;

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggle();
    if (!isSubscribed) {
      setFlash(true);
      setTimeout(() => setFlash(false), 1800);
    }
  };

  return (
    <div className="relative">
      <motion.button
        onClick={handleClick}
        whileTap={{ scale: 0.88 }}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-inter text-[10px] transition-all border ${
          isSubscribed
            ? 'bg-forest-canopy/10 border-forest-canopy/30 text-forest-canopy'
            : 'bg-white border-temple-stone/40 text-rain-cloud/55 hover:border-wet-earth/40 hover:text-wet-earth'
        }`}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isSubscribed ? (
            <motion.span
              key="on"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="flex items-center gap-1"
            >
              <Bell className="w-2.5 h-2.5 fill-forest-canopy text-forest-canopy" strokeWidth={1.5} />
              Notifying you
            </motion.span>
          ) : (
            <motion.span
              key="off"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="flex items-center gap-1"
            >
              <Bell className="w-2.5 h-2.5" strokeWidth={1.5} />
              Notify on harvest
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Confirmation flash */}
      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.9 }}
            animate={{ opacity: 1, y: -28, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
            className="absolute left-0 bottom-full mb-1 flex items-center gap-1 bg-forest-canopy text-white px-2.5 py-1 rounded-full text-[9px] font-inter whitespace-nowrap shadow-md pointer-events-none"
          >
            <Check className="w-2.5 h-2.5" strokeWidth={2.5} />
            We'll let you know!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}