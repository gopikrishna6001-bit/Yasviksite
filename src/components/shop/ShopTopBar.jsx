import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Menu } from 'lucide-react';
import { useCart } from '@/lib/CartContext';
import YasvikLogo from '@/components/brand/YasvikLogo';

export default function ShopTopBar({ onMenuOpen, onCartOpen }) {
  const { totalItems } = useCart();

  return (
    <div
      className="flex-shrink-0 flex items-center justify-between px-4 bg-white/90 backdrop-blur-md border-b border-stone-100 z-30"
      style={{ paddingTop: 'max(0.85rem, env(safe-area-inset-top))', paddingBottom: '0.65rem' }}
    >
      {/* Left — Menu + Wordmark */}
      <div className="flex items-center gap-2">
        <button
          onClick={onMenuOpen}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-stone-100 transition-colors"
        >
          <Menu className="w-4 h-4 text-stone-500" strokeWidth={1.6} />
        </button>
        <YasvikLogo variant="wordmark" imageClassName="h-6 w-auto" />
      </div>

      {/* Right — Cart (only when items exist) */}
      <AnimatePresence>
        {totalItems > 0 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={onCartOpen}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-stone-100 transition-colors relative"
          >
            <ShoppingBag className="w-4 h-4 text-stone-500" strokeWidth={1.5} />
            <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-wet-earth text-white text-[8px] font-inter flex items-center justify-center">
              {totalItems > 9 ? '9+' : totalItems}
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
