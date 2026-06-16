/**
 * ProductPeekTray
 * ─────────────────────────────────────────────────────────
 * Generic slide-up product preview card.
 * Works for both category/journey explore lists.
 * Shows price, emotional tag, key story detail, stock notify.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Leaf, Droplets } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '@/lib/CartContext';
import { useTrending } from '@/lib/TrendingContext';
import StockNotifyButton from './StockNotifyButton';

function getEmotionalTag(product) {
  const tagMap = {
    rice: 'Rain-fed Fields', heritage: 'Heritage Grain', millet: 'Dry-land Harvest',
    pulse: 'Heritage Pulses', lentil: 'Heritage Pulses', dal: 'Heritage Pulses',
    spice: 'Forest Spice', pepper: 'Forest Pepper', turmeric: 'Sacred Root',
    mustard: 'Cold-press Oil', oil: 'Cold-press Oil', honey: 'Wild Nectar',
    forest: 'Forest Bounty', monsoon: 'Monsoon Harvest', organic: 'Earth-grown',
    wild: 'Wildcraft', seed: 'Heritage Seed', flour: 'Stone-ground',
    coconut: 'Coastal Grove', jaggery: 'Country Sweetness',
  };
  const str = [...(product?.tags || []), product?.title || '', product?.short_description || ''].join(' ').toLowerCase();
  for (const [key, label] of Object.entries(tagMap)) {
    if (str.includes(key)) return label;
  }
  return null;
}

export default function ProductPeekTray({ product, onClose }) {
  const { items: cartItems, addItem, updateQty } = useCart();
  const { bump } = useTrending();

  const cartKey = product ? `${product.id}__default` : null;
  const cartItem = cartItems.find(c => c.key === cartKey);
  const qty = cartItem?.qty || 0;
  const tag = product ? getEmotionalTag(product) : null;
  const outOfStock = product?.stock === 0;

  const handleAdd = (e) => {
    e.stopPropagation();
    addItem({ id: product.id, title: product.title, price: product.price, hero_image: product.hero_image, unit: product.unit });
    bump(product.id, 'cart');
  };
  const handleInc = (e) => { e.stopPropagation(); updateQty(cartKey, qty + 1); bump(product.id, 'cart'); };
  const handleDec = (e) => { e.stopPropagation(); updateQty(cartKey, qty - 1); };

  return (
    <AnimatePresence>
      {product && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-rain-cloud/30 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.div
            key="tray"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[60] px-3 pb-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="rounded-3xl overflow-hidden bg-white shadow-2xl border border-white/60 max-w-lg mx-auto">
              {/* Image */}
              {product.hero_image && (
                <div className="relative aspect-[16/8] overflow-hidden">
                  <img src={product.hero_image} alt={product.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-white/70 to-transparent" />
                  <button
                    onClick={onClose}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-rain-cloud/35 backdrop-blur-md flex items-center justify-center"
                  >
                    <X className="w-3.5 h-3.5 text-white" strokeWidth={2} />
                  </button>
                </div>
              )}

              <div className="px-5 pt-4 pb-5">
                {/* Emotional tag */}
                {tag && (
                  <div className="flex items-center gap-1 mb-1.5">
                    <Droplets className="w-2.5 h-2.5 text-forest-canopy/70" strokeWidth={1.5} />
                    <span className="font-inter text-[9px] uppercase tracking-[0.22em] text-forest-canopy/70">{tag}</span>
                  </div>
                )}

                {/* Title + price */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-cormorant text-2xl text-rain-cloud font-light leading-tight flex-1">{product.title}</h3>
                  <div className="text-right flex-shrink-0">
                    <p className="font-cormorant text-2xl text-rain-cloud">₹{product.price}</p>
                    {product.compare_price > product.price && (
                      <p className="font-inter text-xs text-rain-cloud/30 line-through">₹{product.compare_price}</p>
                    )}
                  </div>
                </div>

                {/* Story snippet */}
                {(product.short_description || product.sourcing_story) && (
                  <p className="font-inter text-[12px] text-rain-cloud/55 leading-relaxed line-clamp-2 mb-4">
                    {product.short_description || product.sourcing_story}
                  </p>
                )}

                {/* Out of stock: notify */}
                {outOfStock ? (
                  <div className="space-y-2">
                    <p className="font-inter text-xs text-rain-cloud/40 italic">Awaiting next harvest</p>
                    <StockNotifyButton productId={product.id} stock={product.stock} forceShow />
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      {qty === 0 ? (
                        <button
                          onClick={handleAdd}
                          className="w-full py-3 rounded-full bg-rain-cloud text-white font-inter text-sm tracking-wide hover:bg-rain-cloud/85 active:scale-95 transition-all"
                        >
                          Add to Cart
                        </button>
                      ) : (
                        <div className="flex items-center justify-between bg-rain-cloud rounded-full px-4 py-2.5">
                          <button onClick={handleDec} className="w-6 h-6 flex items-center justify-center text-white">−</button>
                          <span className="font-inter text-sm text-white">{qty}</span>
                          <button onClick={handleInc} className="w-6 h-6 flex items-center justify-center text-white">+</button>
                        </div>
                      )}
                    </div>
                    <Link
                      to={`/product/${product.id}`}
                      onClick={onClose}
                      className="w-12 h-12 rounded-full border border-rain-cloud/15 flex items-center justify-center hover:bg-rain-mist transition-colors flex-shrink-0"
                    >
                      <ArrowRight className="w-4 h-4 text-rain-cloud/55" strokeWidth={1.5} />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}