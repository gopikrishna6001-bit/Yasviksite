import { motion } from 'framer-motion';
import { Search } from 'lucide-react';

export default function StickySearchBar({ onSearchClick, hidden }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: hidden ? 0 : 1, y: hidden ? -10 : 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="fixed top-[max(3.75rem,calc(env(safe-area-inset-top)+3.75rem))] left-0 right-0 z-25 px-4 py-2 bg-white/85 backdrop-blur-xl border-b border-border/20 pointer-events-auto"
    >
      <button
        onClick={onSearchClick}
        className="w-full flex items-center gap-3 bg-rain-mist rounded-xl px-4 py-2.5 transition-all hover:bg-rain-mist/80"
      >
        <Search className="w-4 h-4 text-rain-cloud/40" strokeWidth={1.5} />
        <span className="font-inter text-sm text-rain-cloud/40">Search heritage foods, stories…</span>
      </button>
    </motion.div>
  );
}