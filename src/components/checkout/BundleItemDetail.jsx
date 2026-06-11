import { useState } from 'react';
import { ChevronDown, Minus, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function BundleItemDetail({ item, product_details = [] }) {
  const [expanded, setExpanded] = useState(false);

  // Calculate total weight from products in bundle
  const totalWeight = product_details.reduce((sum, p) => {
    const qty = item.products?.find(ip => ip.id === p.id)?.qty || 1;
    return sum + ((p.weight_grams || 0) * qty);
  }, 0);

  const formatWeight = (grams) => {
    if (grams >= 1000) return `${(grams / 1000).toFixed(1)}kg`;
    return `${grams}g`;
  };

  return (
    <div className="space-y-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left"
      >
        <div className="flex items-center gap-2 py-2">
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4 text-rain-cloud/40" />
          </motion.span>
          <span className="font-inter text-xs text-rain-cloud/50">
            View {item.products?.length || 0} products · {formatWeight(totalWeight)}
          </span>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="bg-rain-mist/30 rounded-xl p-3 space-y-2">
              {product_details.map(product => {
                const itemProduct = item.products?.find(p => p.id === product.id);
                const qty = itemProduct?.qty || 1;
                const weight = (product.weight_grams || 0) * qty;

                return (
                  <div key={product.id} className="flex items-center justify-between gap-2 pb-2 border-b border-border/10 last:border-0 last:pb-0">
                    <div className="flex-1 min-w-0">
                      <p className="font-inter text-xs text-rain-cloud/70 font-medium">{product.title}</p>
                      <p className="font-inter text-[11px] text-rain-cloud/40 mt-0.5">
                        {product.unit || ''} {weight > 0 && `· ${formatWeight(weight)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="font-inter text-xs text-rain-cloud/60 w-4 text-center">
                        ×{qty}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}