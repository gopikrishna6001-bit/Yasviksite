import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { products as productsApi } from '@/services/api';
import { useCart } from '@/lib/CartContext';
import { Plus, Minus } from 'lucide-react';

// One product, given full editorial focus — not a grid, not a carousel.
export default function IsolatedProductMoment() {
  const { data: products = [] } = useQuery({
    queryKey: ['featured-products-fallback'],
    queryFn: () => productsApi.listFeatured(6),
    staleTime: 5 * 60 * 1000,
  });

  const { addItem, items, updateQty } = useCart();

  // Pick the first featured product with a hero image
  const product = products.find(p => p.hero_image) || products[0];
  if (!product) return null;

  const cartKey = `${product.id}__default`;
  const cartItem = items.find(i => i.key === cartKey);
  const qty = cartItem?.qty || 0;

  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 1.4, ease: 'easeOut' }}
      className="py-20 px-5"
    >
      {/* Section eyebrow */}
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
        className="font-inter text-[9px] tracking-[0.35em] uppercase text-rain-cloud/30 text-center mb-14"
      >
        From the Fields
      </motion.p>

      <div className="max-w-sm mx-auto">
        {/* Large editorial image — cinematic scale reveal */}
        <motion.div
          initial={{ opacity: 0, scale: 1.05, y: 24 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        >
          <Link to={`/product/${product.id}`} className="block relative aspect-[3/4] rounded-3xl overflow-hidden bg-temple-stone/15">
            <img
              src={product.hero_image}
              alt={product.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-rain-cloud/50 via-transparent to-transparent" />
          </Link>
        </motion.div>

        {/* Text block — asymmetric offset, breathing room */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
          className="mt-8 pl-3"
        >
          {product.sourcing_location && (
            <p className="font-inter text-[9px] tracking-[0.28em] uppercase text-wet-earth/60 mb-2">
              {product.sourcing_location}
            </p>
          )}
          <h2 className="font-cormorant text-3xl text-rain-cloud font-light leading-tight">
            {product.title}
          </h2>
          {product.short_description && (
            <p className="font-inter text-xs text-rain-cloud/45 mt-3 leading-relaxed max-w-[260px]">
              {product.short_description}
            </p>
          )}

          {/* Price + quiet add-to-cart */}
          <div className="flex items-center justify-between mt-6 pr-3">
            <div className="flex items-baseline gap-2">
              <span className="font-cormorant text-xl text-rain-cloud">₹{product.price}</span>
              {product.unit && (
                <span className="font-inter text-[10px] text-rain-cloud/35">{product.unit}</span>
              )}
            </div>
            <div onClick={e => e.preventDefault()}>
              {qty === 0 ? (
                <button
                  onClick={() => addItem(product, null, 1)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-wet-earth text-white font-inter text-xs tracking-wide active:scale-95 transition-transform"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              ) : (
                <div className="flex items-center gap-2 bg-wet-earth rounded-full px-3 py-2">
                  <button onClick={() => updateQty(cartKey, qty - 1)}>
                    <Minus className="w-3 h-3 text-white" />
                  </button>
                  <span className="font-inter text-xs text-white w-3 text-center">{qty}</span>
                  <button onClick={() => updateQty(cartKey, qty + 1)}>
                    <Plus className="w-3 h-3 text-white" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}