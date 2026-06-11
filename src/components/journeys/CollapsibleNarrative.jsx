import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

export default function CollapsibleNarrative({ shortText, longText }) {
  const [expanded, setExpanded] = useState(false);

  if (!longText) {
    return <p className="font-inter text-sm text-rain-cloud/65 leading-relaxed">{shortText}</p>;
  }

  return (
    <div>
      <p className="font-inter text-sm text-rain-cloud/65 leading-relaxed">{shortText}</p>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 mt-3 font-inter text-xs text-forest-canopy hover:text-forest-canopy/80 transition-colors"
      >
        {expanded ? 'Read less' : 'Read the full story'}
        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-3 h-3" />
        </motion.div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <p className="font-inter text-sm text-rain-cloud/55 leading-relaxed mt-4 pt-4 border-t border-border/20">
              {longText}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}