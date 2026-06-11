import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/lib/CartContext';
import { useQuery } from '@tanstack/react-query';
import { appClient } from '@/api/appClient';
import { ShoppingBag, Zap, ChevronDown } from 'lucide-react';
import { useState } from 'react';

export default function ComboCard({ combo }) {
  const { addCombo } = useCart();
  const [added, setAdded] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const { data: comboProducts = [] } = useQuery({
    queryKey: ['combo-products', combo.id],
    queryFn: async () => {
      if (!combo.product_ids?.length) return [];
      // De-duplicate: fetch each unique product once
      const uniqueIds = [...new Set(combo.product_ids)];
      return Promise.all(uniqueIds.map(id => appClient.entities.Product.get(id)));
    },
    enabled: !!combo.product_ids?.length,
  });

  // Bundle is unavailable if any included product is out of stock
  const isUnavailable = comboProducts.length > 0 && comboProducts.some(p =>
    p.availability === 'out_of_stock' || p.stock <= 0
  );

  const handleAddCombo = () => {
    if (isUnavailable) return;
    addCombo(combo, comboProducts);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  // Store product details in combo for checkout flexibility
  const comboWithProductData = {
    ...combo,
    product_details: comboProducts,
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`rounded-2xl overflow-hidden border-2 transition-all ${
        combo.is_featured ? 'border-warm-turmeric bg-warm-turmeric/5' : 'border-border bg-white'
      }`}
    >
      {combo.hero_image && (
        <div className="aspect-[16/9] overflow-hidden relative">
          <img src={combo.hero_image} alt={combo.title} className="w-full h-full object-cover" />
          {combo.discount_percentage > 0 && (
            <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-wet-earth text-white font-inter text-sm font-medium flex items-center gap-1">
              <Zap className="w-4 h-4" />
              {combo.discount_percentage}% OFF
            </div>
          )}
          {isUnavailable && (
            <div className="absolute inset-0 bg-rain-cloud/40 flex items-center justify-center">
              <span className="font-inter text-sm text-white bg-rain-cloud/70 px-3 py-1 rounded-full">
                Currently Unavailable
              </span>
            </div>
          )}
        </div>
      )}

      <div className="p-4">
        <h3 className="font-cormorant text-xl text-rain-cloud font-light line-clamp-1">{combo.title}</h3>
        {combo.description && (
          <p className="font-inter text-xs text-rain-cloud/50 mt-1 line-clamp-2">{combo.description}</p>
        )}

        <div className="flex items-baseline gap-1 mt-3">
          <span className="font-cormorant text-2xl text-rain-cloud font-medium">₹{combo.combo_price}</span>
          {combo.original_price > combo.combo_price && (
            <span className="font-inter text-xs text-rain-cloud/40 line-through">₹{combo.original_price}</span>
          )}
        </div>

        {/* Collapsible products list */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 mt-2 mb-1 font-inter text-[11px] text-rain-cloud/50 hover:text-rain-cloud/70 transition-colors"
        >
          <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-3.5 h-3.5" />
          </motion.span>
          {combo.product_ids?.length || 0} products included
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
              <div className="flex flex-wrap gap-1.5 pt-1 pb-3">
                {comboProducts.map(p => {
                  const qty = combo.product_ids.filter(id => id === p.id).length;
                  const outOfStock = p.availability === 'out_of_stock' || p.stock <= 0;
                  return (
                    <span
                      key={p.id}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 border rounded-full font-inter text-[10px] ${
                        outOfStock
                          ? 'bg-red-50 border-red-200 text-red-400'
                          : 'bg-rain-mist border-temple-stone/20 text-rain-cloud/70'
                      }`}
                    >
                      {p.hero_image && (
                        <img src={p.hero_image} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />
                      )}
                      {p.title}
                      <span className="ml-0.5 opacity-60">×{qty}</span>
                      {outOfStock && <span className="ml-0.5 text-red-400">· Out of stock</span>}
                    </span>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => {
            handleAddCombo();
            // Pass enriched combo with product data
            addCombo(comboWithProductData, comboProducts);
          }}
          disabled={isUnavailable}
          className={`w-full py-2.5 rounded-full font-inter text-sm transition-all flex items-center justify-center gap-2 ${
            isUnavailable
              ? 'bg-border text-rain-cloud/40 cursor-not-allowed'
              : added
              ? 'bg-forest-canopy text-white'
              : 'bg-wet-earth text-white hover:bg-wet-earth/90'
          }`}
        >
          {isUnavailable ? 'Unavailable' : added ? (
            '✓ Added to Cart'
          ) : (
            <>
              <ShoppingBag className="w-4 h-4" />
              Add Bundle
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}