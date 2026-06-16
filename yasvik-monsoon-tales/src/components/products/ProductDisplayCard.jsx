import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Plus, Minus, Check, Droplets, Flame, ChevronRight } from 'lucide-react';
import { useCart } from '@/lib/CartContext';
import { useTrending } from '@/lib/TrendingContext';
import StockNotifyButton from './StockNotifyButton';
import { usePremiumHapticPulse } from '@/hooks/usePremiumHapticPulse';

function getEmotionalTag(product) {
  const tagMap = {
    rice: 'Rain-fed Fields', heritage: 'Heritage Grain', millet: 'Dry-land Harvest',
    pulse: 'Heritage Pulses', lentil: 'Heritage Pulses', dal: 'Heritage Pulses',
    spice: 'Forest Spice', pepper: 'Forest Pepper', turmeric: 'Sacred Root',
    mustard: 'Cold-press Oil', oil: 'Cold-press Oil', honey: 'Wild Nectar',
    forest: 'Forest Bounty', monsoon: 'Monsoon Harvest', organic: 'Earth-grown',
    wild: 'Wildcraft', seed: 'Heritage Seed', flour: 'Stone-ground',
    coconut: 'Coastal Grove', tamarind: 'Tangy Tropics', jaggery: 'Country Sweetness',
  };
  const searchStr = [...(product.tags || []), product.title || '', product.short_description || ''].join(' ').toLowerCase();
  for (const [key, label] of Object.entries(tagMap)) {
    if (searchStr.includes(key)) return label;
  }
  return null;
}

function useSellingFast(productId) {
  const { scores } = useTrending();
  const s = scores[productId];
  return s && s.score >= 4;
}

export default function ProductDisplayCard({ product }) {
  const { addItem, items, updateQty } = useCart();
  const [flash, setFlash] = useState(false);
  const { isPulseActive, triggerPulse } = usePremiumHapticPulse();
  const sellingFast = useSellingFast(product.id);

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

  const handleInc = (e) => { e.preventDefault(); e.stopPropagation(); updateQty(cartKey, qty + 1); };
  const handleDec = (e) => { e.preventDefault(); e.stopPropagation(); updateQty(cartKey, qty - 1); };

  const emotionalTag = getEmotionalTag(product);
  const discount = product.compare_price && product.compare_price > product.price
    ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100)
    : null;

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl overflow-hidden shadow-sm">
      {/* Image */}
      <Link to={`/product/${product.id}`} className="relative block flex-shrink-0" style={{ height: '52%' }}>
        <div className="relative w-full h-full bg-temple-stone/15">
          {product.hero_image ? (
            <img src={product.hero_image} alt={product.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-temple-stone/20 to-rain-mist" />
          )}

          {sellingFast && (
            <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-wet-earth/90 backdrop-blur-sm">
              <motion.span animate={{ scale: [1, 1.25, 1] }} transition={{ repeat: Infinity, duration: 2.2 }}>
                <Flame className="w-3 h-3 text-warm-turmeric" strokeWidth={1.5} />
              </motion.span>
              <span className="font-inter text-[10px] text-white/90">Selling fast</span>
            </div>
          )}

          {discount && (
            <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-forest-canopy text-white font-inter text-[10px]">
              -{discount}%
            </div>
          )}

          <AnimatePresence>
            {flash && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-forest-canopy/20 flex items-center justify-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                  className="w-14 h-14 rounded-full bg-forest-canopy flex items-center justify-center">
                  <Check className="w-7 h-7 text-white" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Link>

      {/* Info */}
      <div className="flex flex-col flex-grow px-5 py-4 gap-2">
        {emotionalTag && (
          <div className="flex items-center gap-1.5">
            <Droplets className="w-3 h-3 text-forest-canopy/60" strokeWidth={1.5} />
            <span className="font-inter text-[9px] uppercase tracking-[0.25em] text-forest-canopy/70">{emotionalTag}</span>
          </div>
        )}

        <div className="flex items-start justify-between gap-2">
          <h3 className="font-cormorant text-[26px] text-rain-cloud font-medium leading-tight">
            {product.title}
          </h3>
          <Link to={`/product/${product.id}`} className="flex-shrink-0 mt-1">
            <ChevronRight className="w-5 h-5 text-rain-cloud/30" />
          </Link>
        </div>

        {product.short_description && (
          <p className="font-inter text-xs text-rain-cloud/55 leading-relaxed line-clamp-2">
            {product.short_description}
          </p>
        )}

        <div className="flex items-baseline justify-between mt-auto pt-2">
          <div className="flex items-baseline gap-2">
            <span className="font-cormorant text-2xl text-rain-cloud font-medium">₹{product.price}</span>
            {product.compare_price && (
              <span className="font-inter text-sm text-rain-cloud/35 line-through">₹{product.compare_price}</span>
            )}
          </div>
          {product.unit && (
            <span className="font-inter text-xs text-rain-cloud/45 bg-rain-mist px-2 py-0.5 rounded-full">{product.unit}</span>
          )}
        </div>

        {/* CTA */}
        <div className="mt-2">
          {product.stock === 0 ? (
            <StockNotifyButton productId={product.id} stock={product.stock} />
          ) : (
            <AnimatePresence mode="wait">
              {qty === 0 ? (
                <motion.button key="add"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.15 }}
                  onClick={handleAdd}
                  className={`w-full h-11 rounded-full bg-wet-earth text-white flex items-center justify-center gap-2 font-inter text-sm tracking-wide active:scale-95 transition-transform duration-100 ${
                    isPulseActive ? 'premium-haptic-pulse' : ''
                  }`}
                >
                  <Plus className="w-4 h-4" /> Add to Cart
                </motion.button>
              ) : (
                <motion.div key="qty"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center justify-between bg-wet-earth rounded-full h-11 px-2"
                >
                  <button onClick={handleDec} className="w-9 h-9 flex items-center justify-center active:scale-75 transition-transform">
                    <Minus className="w-4 h-4 text-white" />
                  </button>
                  <motion.span key={qty} initial={{ scale: 1.3 }} animate={{ scale: 1 }}
                    className="font-inter text-base text-white w-8 text-center">
                    {qty}
                  </motion.span>
                  <button onClick={handleInc} className="w-9 h-9 flex items-center justify-center active:scale-75 transition-transform">
                    <Plus className="w-4 h-4 text-white" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}
