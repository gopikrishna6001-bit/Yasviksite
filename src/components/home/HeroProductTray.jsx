/**
 * HeroProductTray
 * ────────────────────────────────────────────────────────
 * Slide-out product peek card that appears at the bottom of
 * the hero without navigating away from the cinematic view.
 *
 * Usage:
 *   <HeroProductTray product={productObj} onClose={() => {}} />
 *
 * product shape: { id, title, short_description, price, compare_price,
 *                  hero_image, unit, story_description }
 */
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { X, Plus, Minus, ArrowRight, Leaf } from 'lucide-react';
import { useCart } from '@/lib/CartContext';
import { useTrending } from '@/lib/TrendingContext';
import { usePremiumHapticPulse } from '@/hooks/usePremiumHapticPulse';

export default function HeroProductTray({ product, onClose }) {
  const { items: cartItems, addItem, updateQty } = useCart();
  const { bump } = useTrending();
  const { isPulseActive, triggerPulse } = usePremiumHapticPulse();

  const cartKey = product ? `${product.id}__default` : null;
  const cartItem = cartItems.find(c => c.key === cartKey);
  const qty = cartItem?.qty || 0;

  // Track view when tray opens
  useEffect(() => {
    if (product) bump(product.id, 'view');
  }, [product?.id]);

  const handleAdd = (e) => {
    e.stopPropagation();
    triggerPulse();
    addItem({
      id: product.id,
      title: product.title,
      price: product.price,
      hero_image: product.hero_image,
      unit: product.unit,
    });
    bump(product.id, 'cart');
  };

  const handleInc = (e) => { e.stopPropagation(); updateQty(cartKey, qty + 1); bump(product.id, 'cart'); };
  const handleDec = (e) => { e.stopPropagation(); updateQty(cartKey, qty - 1); };

  const discount = product?.compare_price && product.compare_price > product.price
    ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100)
    : null;

  return (
    <AnimatePresence>
      {product && (
        <>
          {/* Backdrop — tap to close */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 z-40"
            onClick={onClose}
          />

          {/* The tray card */}
          <motion.div
            key="tray"
            initial={{ y: '100%', opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 280 }}
            className="absolute bottom-0 left-0 right-0 z-50"
            onClick={e => e.stopPropagation()}
          >
            <div className="mx-3 mb-4 rounded-3xl overflow-hidden bg-white/95 backdrop-blur-2xl shadow-2xl border border-white/40">
              {/* Image strip */}
              {product.hero_image && (
                <div className="relative aspect-[16/7] overflow-hidden">
                  <img
                    src={product.hero_image}
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-white/80 to-transparent" />

                  {discount && (
                    <div className="absolute top-3 left-3 px-2.5 py-1 bg-wet-earth rounded-full">
                      <span className="font-inter text-[10px] text-white font-medium">{discount}% off</span>
                    </div>
                  )}

                  <button
                    onClick={onClose}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-rain-cloud/40 backdrop-blur-md flex items-center justify-center"
                  >
                    <X className="w-3.5 h-3.5 text-white" strokeWidth={2} />
                  </button>
                </div>
              )}

              {/* Content */}
              <div className="px-5 pt-4 pb-5">
                {/* Title + price row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-cormorant text-2xl text-rain-cloud font-light leading-tight">
                      {product.title}
                    </h3>
                    {product.unit && (
                      <p className="font-inter text-[10px] text-rain-cloud/40 mt-0.5 flex items-center gap-1">
                        <Leaf className="w-2.5 h-2.5" strokeWidth={1.5} />
                        {product.unit}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-cormorant text-2xl text-rain-cloud font-medium">₹{product.price}</p>
                    {product.compare_price > product.price && (
                      <p className="font-inter text-xs text-rain-cloud/35 line-through">₹{product.compare_price}</p>
                    )}
                  </div>
                </div>

                {/* Short description */}
                {product.short_description && (
                  <p className="font-inter text-[12px] text-rain-cloud/55 leading-relaxed line-clamp-2 mb-4">
                    {product.short_description}
                  </p>
                )}

                {/* Actions row */}
                <div className="flex items-center gap-3">
                  {/* Cart control */}
                  <div className="flex-1">
                    {qty === 0 ? (
                      <button
                        onClick={handleAdd}
                        className={`w-full py-3 rounded-full bg-rain-cloud text-white font-inter text-sm tracking-wide hover:bg-rain-cloud/85 active:scale-95 transition-all ${
                          isPulseActive ? 'premium-haptic-pulse' : ''
                        }`}
                      >
                        Add to Cart
                      </button>
                    ) : (
                      <div className="flex items-center justify-between bg-rain-cloud rounded-full px-4 py-2.5">
                        <button onClick={handleDec} className="w-6 h-6 flex items-center justify-center">
                          <Minus className="w-3 h-3 text-white" strokeWidth={2} />
                        </button>
                        <span className="font-inter text-sm text-white tabular-nums">{qty}</span>
                        <button onClick={handleInc} className="w-6 h-6 flex items-center justify-center">
                          <Plus className="w-3 h-3 text-white" strokeWidth={2} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Full page link */}
                  <Link
                    to={`/product/${product.id}`}
                    className="flex-shrink-0 w-12 h-12 rounded-full border border-rain-cloud/15 flex items-center justify-center hover:bg-rain-mist transition-colors"
                    onClick={onClose}
                  >
                    <ArrowRight className="w-4 h-4 text-rain-cloud/55" strokeWidth={1.5} />
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
