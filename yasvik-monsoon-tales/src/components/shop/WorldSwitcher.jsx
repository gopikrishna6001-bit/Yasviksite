import { motion } from 'framer-motion';
import { Search, ShoppingBag } from 'lucide-react';
import { useCart } from '@/lib/CartContext';
import YasvikLogo from '@/components/brand/YasvikLogo';

export default function WorldSwitcher({ worlds, activeIndex, onSelect, openSearch, openCart }) {
  const { totalItems } = useCart();

  return (
    <div className="flex-shrink-0 bg-rain-mist/95 backdrop-blur-md border-b border-temple-stone/10 pt-[max(0.75rem,env(safe-area-inset-top))] pb-0 px-4 z-30">
      <div className="flex items-center justify-between mb-0">
        {/* Wordmark */}
        <YasvikLogo variant="wordmark" imageClassName="h-6 w-auto flex-shrink-0" />

        {/* World tabs — scrollable */}
        <div className="flex-1 mx-3 overflow-x-auto hide-scrollbar">
          <div className="flex gap-0 min-w-max mx-auto justify-center">
            {worlds.map((world, i) => {
              const active = i === activeIndex;
              return (
                <button
                  key={world.id}
                  onClick={() => onSelect(i)}
                  className="relative px-3 py-3 flex flex-col items-center"
                >
                  <span
                    className={`font-inter text-[11px] tracking-wide transition-all duration-200 ${
                      active
                        ? 'text-wet-earth font-semibold'
                        : 'text-rain-cloud/38 font-normal'
                    }`}
                  >
                    {world.label}
                  </span>
                  {active && (
                    <motion.div
                      layoutId="worldUnderline"
                      className="absolute bottom-0 left-3 right-3 h-[1.5px] bg-wet-earth rounded-full"
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={openSearch}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-rain-cloud/8 transition-colors"
          >
            <Search className="w-4 h-4 text-rain-cloud/55" strokeWidth={1.5} />
          </button>
          <button
            onClick={openCart}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-rain-cloud/8 transition-colors relative"
          >
            <ShoppingBag className="w-4 h-4 text-rain-cloud/55" strokeWidth={1.5} />
            {totalItems > 0 && (
              <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-wet-earth text-white text-[8px] font-inter flex items-center justify-center">
                {totalItems > 9 ? '9+' : totalItems}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
