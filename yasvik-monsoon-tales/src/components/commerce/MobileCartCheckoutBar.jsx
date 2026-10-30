import { AnimatePresence, motion } from 'framer-motion';
import { ShoppingBag } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '@/lib/CartContext';
import { useStoreOffline } from '@/hooks/useStoreOffline';

export default function MobileCartCheckoutBar({ onOpenCart }) {
  const { totalItems, totalPrice } = useCart();
  const location = useLocation();
  const { enabled: storeOffline } = useStoreOffline();

  const showOnRoutes = ['/', '/shop'].some((path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path),
  );

  if (storeOffline || !showOnRoutes || totalItems === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-soft-border bg-white shadow-[0_-8px_30px_rgba(31,61,43,0.1)] pb-[max(0.625rem,env(safe-area-inset-bottom))] md:hidden"
      >
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-2.5">
          <button
            type="button"
            onClick={onOpenCart}
            className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-deep-forest text-warm-cream"
            aria-label={`Open cart, ${totalItems} items`}
          >
            <ShoppingBag className="h-4 w-4" strokeWidth={1.8} />
          </button>
          <p className="min-w-0 flex-1 font-inter text-sm font-bold text-deep-forest">
            {totalItems} {totalItems === 1 ? 'Item' : 'Items'} <span className="text-deep-forest/40">|</span> ₹{totalPrice}
          </p>
          <Link
            to="/checkout"
            className="flex-shrink-0 rounded-full bg-deep-forest px-4 py-2 font-inter text-[10px] font-bold uppercase tracking-wide text-warm-cream"
          >
            Checkout
          </Link>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
