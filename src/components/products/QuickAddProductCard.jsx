import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Plus, Minus, Check, Droplets, Flame } from 'lucide-react';
import { useCart } from '@/lib/CartContext';
import { useTrending } from '@/lib/TrendingContext';
import StockNotifyButton from './StockNotifyButton';
import { usePremiumHapticPulse } from '@/hooks/usePremiumHapticPulse';
import { buildProductAltText } from '@/lib/productSeo';

// Derive an emotional tag from the product's tags array or category name
function getEmotionalTag(product) {
  const tagMap = {
    rice: 'Rain-fed Fields',
    heritage: 'Heritage Grain',
    millet: 'Dry-land Harvest',
    pulse: 'Heritage Pulses',
    lentil: 'Heritage Pulses',
    dal: 'Heritage Pulses',
    spice: 'Forest Spice',
    pepper: 'Forest Pepper',
    turmeric: 'Sacred Root',
    mustard: 'Cold-press Oil',
    oil: 'Cold-press Oil',
    honey: 'Wild Nectar',
    forest: 'Forest Bounty',
    monsoon: 'Monsoon Harvest',
    organic: 'Earth-grown',
    wild: 'Wildcraft',
    seed: 'Heritage Seed',
    flour: 'Stone-ground',
    coconut: 'Coastal Grove',
    tamarind: 'Tangy Tropics',
    jaggery: 'Country Sweetness',
  };
  const searchStr = [
    ...(product.tags || []),
    product.title || '',
    product.short_description || '',
  ].join(' ').toLowerCase();

  for (const [key, label] of Object.entries(tagMap)) {
    if (searchStr.includes(key)) return label;
  }
  return null;
}

// A product is "selling fast" if it has a trending score >= 4 (1+ cart or 4+ views)
function useSellingFast(productId) {
  const { scores } = useTrending();
  const s = scores[productId];
  return s && s.score >= 4;
}

export default function QuickAddProductCard({ product, index = 0, compact = false }) {
  const { addItem, items, updateQty } = useCart();
  const [flash, setFlash] = useState(false);
  const { isPulseActive, triggerPulse } = usePremiumHapticPulse();
  const sellingFast = useSellingFast(product.id);
  const productImageAlt = buildProductAltText(product);

  const cartKey = `${product.id}__default`;
  const cartItem = items.find(i => i.key === cartKey);
  const qty = cartItem?.qty || 0;

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    triggerPulse();
    addItem(product, null, 1);
    setFlash(true);
    setTimeout(() => setFlash(false), 600);
  };

  const handleInc = (e) => {
    e.preventDefault();
    e.stopPropagation();
    updateQty(cartKey, qty + 1);
  };

  const handleDec = (e) => {
    e.preventDefault();
    e.stopPropagation();
    updateQty(cartKey, qty - 1);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.06, 0.3) }}
      className="relative"
    >
      <Link to={`/product/${product.id}`} className="block bg-white rounded-2xl overflow-hidden shadow-sm active:scale-95 transition-transform duration-100 active:opacity-90">
        {/* Image */}
        <div className={`relative ${compact ? 'aspect-[4/5]' : 'aspect-[3/4]'} overflow-hidden bg-temple-stone/15`}>
          {product.hero_image ? (
            <img src={product.hero_image} alt={productImageAlt} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700 ease-out" loading="lazy" decoding="async" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-temple-stone/20 to-rain-mist" />
          )}

          {/* Selling fast badge */}
          {sellingFast && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-1 rounded-full bg-wet-earth/90 backdrop-blur-sm"
            >
              <motion.span
                animate={{ scale: [1, 1.25, 1] }}
                transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
              >
                <Flame className="w-2.5 h-2.5 text-warm-turmeric" strokeWidth={1.5} />
              </motion.span>
              <span className="font-inter text-[8px] text-white/90 tracking-wide">Selling fast</span>
            </motion.div>
          )}

          {/* Flash overlay on add */}
          <AnimatePresence>
            {flash && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-forest-canopy/20 flex items-center justify-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="w-10 h-10 rounded-full bg-forest-canopy flex items-center justify-center"
                >
                  <Check className="w-5 h-5 text-white" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick add / qty control — bottom right of image */}
          <div className="absolute bottom-3 right-3" onClick={e => e.preventDefault()}>
            <AnimatePresence mode="wait">
              {qty === 0 ? (
                <motion.button
                  key="add"
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.85, opacity: 0 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  onClick={handleAdd}
                  className={`w-10 h-10 rounded-full bg-wet-earth text-white flex items-center justify-center shadow-md active:scale-90 transition-transform duration-100 ${
                    isPulseActive ? 'premium-haptic-pulse' : ''
                  }`}
                >
                  <Plus className="w-4 h-4" />
                </motion.button>
              ) : (
                <motion.div
                  key="qty"
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.85, opacity: 0 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="flex items-center gap-0.5 bg-wet-earth rounded-full px-1.5 py-1.5 shadow-md"
                >
                  <button onClick={handleDec} className="w-7 h-7 flex items-center justify-center active:scale-75 transition-transform duration-100">
                    <Minus className="w-3 h-3 text-white" />
                  </button>
                  <motion.span
                    key={qty}
                    initial={{ scale: 1.25 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.1 }}
                    className="font-inter text-xs text-white w-4 text-center"
                  >
                    {qty}
                  </motion.span>
                  <button onClick={handleInc} className="w-7 h-7 flex items-center justify-center active:scale-75 transition-transform duration-100">
                    <Plus className="w-3 h-3 text-white" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Info */}
        <div className={compact ? 'px-3.5 py-3' : 'px-4 py-3.5'}>
          {!compact && (() => {
            const tag = getEmotionalTag(product);
            return tag ? (
              <div className="flex items-center gap-1 mb-1.5">
                <Droplets className="w-2.5 h-2.5 text-forest-canopy/70" strokeWidth={1.5} />
                <span className="font-inter text-[9px] uppercase tracking-[0.22em] text-forest-canopy/70">{tag}</span>
              </div>
            ) : null;
          })()}
          <h3 className={`font-cormorant text-rain-cloud font-medium leading-snug ${compact ? 'text-[17px]' : 'text-lg'}`}>
            {product.title}
          </h3>
          {!compact && product.short_description && (
            <p className="font-inter text-xs text-rain-cloud/50 mt-1 leading-relaxed line-clamp-2">
              {product.short_description}
            </p>
          )}
          <div className={`flex items-center justify-between ${compact ? 'mt-2' : 'mt-3'}`}>
            <div className="flex items-baseline gap-1.5">
              <span className={`font-cormorant text-rain-cloud ${compact ? 'text-base' : 'text-base'}`}>₹{product.price}</span>
              {product.compare_price && (
                <span className="font-inter text-[10px] text-rain-cloud/30 line-through">₹{product.compare_price}</span>
              )}
            </div>
            {product.unit && (
              <span className="font-inter text-[10px] text-rain-cloud/40">{product.unit}</span>
            )}
          </div>
          {product.stock === 0 && (
            <div className="mt-2" onClick={e => e.preventDefault()}>
              <StockNotifyButton productId={product.id} stock={product.stock} />
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
