import { motion } from 'framer-motion';
import { Search, User, LayoutGrid } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ShopBottomNav({ worlds, activeIndex, onSearchOpen }) {
  const world = worlds[activeIndex];

  return (
    <div
      className="flex-shrink-0 bg-white/90 backdrop-blur-md border-t border-stone-100 z-30"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      {/* Dots + world label — centered above the icon row */}
      <div className="flex flex-col items-center gap-1 pt-2">
        <motion.span
          key={world.id}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="font-inter text-[10px] font-semibold tracking-[0.16em] uppercase text-stone-400"
        >
          {world.label}
        </motion.span>
        <div className="flex items-center gap-1">
          {worlds.map((_, i) => (
            <motion.div
              key={i}
              animate={{
                width: i === activeIndex ? 16 : 5,
                backgroundColor: i === activeIndex ? '#78716c' : '#d6d3d1',
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="h-1 rounded-full"
            />
          ))}
        </div>
      </div>

      {/* Icon row */}
      <div className="flex items-center justify-between px-8 pt-1 pb-1">
        {/* Search */}
        <button
          onClick={onSearchOpen}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-stone-100 transition-colors"
        >
          <Search className="w-5 h-5 text-stone-500" strokeWidth={1.5} />
        </button>

        {/* User / Profile */}
        <Link
          to="/profile"
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-stone-100 transition-colors"
        >
          <User className="w-5 h-5 text-stone-500" strokeWidth={1.5} />
        </Link>

        {/* Home / 9-dots */}
        <Link
          to="/"
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-stone-100 transition-colors"
        >
          <LayoutGrid className="w-5 h-5 text-stone-500" strokeWidth={1.5} />
        </Link>
      </div>
    </div>
  );
}