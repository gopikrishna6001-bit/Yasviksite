import { useState } from 'react';
import { Search } from 'lucide-react';
import { motion } from 'framer-motion';

export default function GlobalSearchBar({ onFocus, onBlur, compact = false, className = '' }) {
  const [focused, setFocused] = useState(false);

  return (
    <motion.div
      className={`flex-1 ${compact ? 'max-w-xs' : 'max-w-sm'} ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <div
        className={`relative transition-all duration-300 ${
          focused ? 'scale-105' : 'scale-100'
        }`}
      >
        {/* Soft background glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-rain-cloud/5 via-rain-cloud/10 to-rain-cloud/5 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Input container */}
        <div className="relative flex items-center gap-3 px-4 py-2.5 rounded-full bg-rain-mist border border-rain-cloud/15 shadow-sm transition-all duration-300">
          <Search className="w-4 h-4 text-rain-cloud/65" strokeWidth={1.5} />
          <input
            type="text"
            placeholder="Search journeys, stories, products..."
            onFocus={() => {
              setFocused(true);
              onFocus?.();
            }}
            onBlur={() => {
              setFocused(false);
              onBlur?.();
            }}
            className="flex-1 bg-transparent text-rain-cloud/90 placeholder-rain-cloud/40 text-sm font-inter outline-none"
          />
        </div>
      </div>
    </motion.div>
  );
}
