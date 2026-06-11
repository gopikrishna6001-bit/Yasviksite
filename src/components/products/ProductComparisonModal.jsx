import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function ProductComparisonModal({ products, open, onClose }) {
  if (!products || products.length === 0) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-rain-cloud/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed inset-x-4 bottom-6 z-50 bg-white rounded-2xl shadow-lg max-w-2xl mx-auto max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between p-5 border-b border-border/30 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="font-cormorant text-xl text-rain-cloud font-light">Compare</h2>
              <button onClick={onClose} className="text-rain-cloud/40 hover:text-rain-cloud">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 p-5">
              {products.map(p => (
                <div key={p.id} className="space-y-4">
                  <div className="aspect-[3/4] rounded-xl overflow-hidden">
                    <img src={p.hero_image} alt={p.title} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="font-cormorant text-base text-rain-cloud font-light line-clamp-2">{p.title}</h3>
                    <p className="font-cormorant text-lg text-wet-earth mt-1">₹{p.price}</p>
                    {p.compare_price && (
                      <p className="font-inter text-xs text-rain-cloud/40 line-through">₹{p.compare_price}</p>
                    )}
                  </div>
                  <div className="space-y-2 text-xs">
                    {p.unit && <p className="font-inter text-rain-cloud/55"><strong>Unit:</strong> {p.unit}</p>}
                    {p.stock > 0 && <p className="font-inter text-forest-canopy"><strong>Stock:</strong> {p.stock} in stock</p>}
                    {p.stock === 0 && <p className="font-inter text-red-500"><strong>Out of stock</strong></p>}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}