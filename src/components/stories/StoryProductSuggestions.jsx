/**
 * StoryProductSuggestions
 * ────────────────────────────────────────────────────────────
 * Shown at the end of a story. Pulls products that are either
 * directly linked via linked_product_ids, or share the same
 * journey/region as the story. Renders emotional mood tags.
 */
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Leaf, ArrowRight, Droplets } from 'lucide-react';
import { Link } from 'react-router-dom';
import { products as productsApi } from '@/services/api';
import { useCart } from '@/lib/CartContext';
import { useTrending } from '@/lib/TrendingContext';

// Same tag map as QuickAddProductCard
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
  const str = [...(product.tags || []), product.title || '', product.short_description || ''].join(' ').toLowerCase();
  for (const [key, label] of Object.entries(tagMap)) {
    if (str.includes(key)) return label;
  }
  return null;
}

function ProductPill({ product, index }) {
  const { addItem, items, updateQty } = useCart();
  const { bump } = useTrending();
  const cartKey = `${product.id}__default`;
  const cartItem = items.find(i => i.key === cartKey);
  const qty = cartItem?.qty || 0;
  const tag = getEmotionalTag(product);

  const handleAdd = (e) => {
    e.preventDefault();
    addItem(product, null, 1);
    bump(product.id, 'cart');
  };
  const handleInc = (e) => { e.preventDefault(); updateQty(cartKey, qty + 1); };
  const handleDec = (e) => { e.preventDefault(); updateQty(cartKey, qty - 1); };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay: index * 0.08 }}
      className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-sm border border-border/40"
    >
      {/* Thumbnail */}
      <Link to={`/product/${product.id}`} className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-temple-stone/20">
        {product.hero_image
          ? <img src={product.hero_image} alt={product.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-gradient-to-br from-temple-stone/20 to-rain-mist" />
        }
      </Link>

      {/* Info */}
      <div className="flex-1 min-w-0">
        {tag && (
          <div className="flex items-center gap-1 mb-0.5">
            <Droplets className="w-2 h-2 text-forest-canopy/60" strokeWidth={1.5} />
            <span className="font-inter text-[8px] uppercase tracking-[0.2em] text-forest-canopy/60">{tag}</span>
          </div>
        )}
        <Link to={`/product/${product.id}`}>
          <h4 className="font-cormorant text-base text-rain-cloud font-medium leading-tight truncate">{product.title}</h4>
        </Link>
        <p className="font-cormorant text-sm text-rain-cloud/60 mt-0.5">₹{product.price}</p>
      </div>

      {/* Cart control */}
      <div className="flex-shrink-0">
        {qty === 0 ? (
          <button
            onClick={handleAdd}
            className="w-8 h-8 rounded-full bg-wet-earth text-white flex items-center justify-center active:scale-90 transition-transform"
          >
            <span className="text-lg leading-none">+</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 bg-wet-earth rounded-full px-2.5 py-1.5">
            <button onClick={handleDec} className="text-white text-xs font-bold leading-none">−</button>
            <span className="font-inter text-xs text-white w-3 text-center">{qty}</span>
            <button onClick={handleInc} className="text-white text-xs font-bold leading-none">+</button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function StoryProductSuggestions({ story }) {
  const linkedIds = story?.linked_product_ids || [];
  const journeyId = story?.journey_id;
  const regionId = story?.region_id;

  // Fetch linked products directly
  const { data: linkedProducts = [] } = useQuery({
    queryKey: ['story-linked-products', story?.id],
    queryFn: async () => {
      if (!linkedIds.length) return [];
      const all = await Promise.all(linkedIds.map(id => productsApi.get(id).catch(() => null)));
      return all.filter(Boolean).filter(p => p.is_published);
    },
    enabled: !!story && linkedIds.length > 0,
  });

  // Fetch contextual products from same journey or region (fallback)
  const { data: contextProducts = [] } = useQuery({
    queryKey: ['story-context-products', journeyId, regionId],
    queryFn: async () => {
      if (journeyId) {
        return productsApi.listByJourney(journeyId, 6);
      }
      if (regionId) {
        return productsApi.listByRegion(regionId, 6);
      }
      return [];
    },
    enabled: !!story && linkedIds.length === 0 && !!(journeyId || regionId),
  });

  // Merge: linked first, then contextual (no dupes), max 5
  const merged = [
    ...linkedProducts,
    ...contextProducts.filter(p => !linkedProducts.find(l => l.id === p.id)),
  ].slice(0, 5);

  if (merged.length === 0) return null;

  return (
    <section className="px-5 py-8 border-t border-border/40">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Leaf className="w-3.5 h-3.5 text-forest-canopy" strokeWidth={1.5} />
        <p className="font-inter text-[10px] uppercase tracking-[0.24em] text-forest-canopy">From This Story</p>
      </div>
      <h3 className="font-cormorant text-xl text-rain-cloud font-light mb-5 leading-snug">
        Taste What You Just Read
      </h3>

      <div className="space-y-3">
        {merged.map((p, i) => (
          <ProductPill key={p.id} product={p} index={i} />
        ))}
      </div>

      {/* Browse all link */}
      <Link
        to="/shop"
        className="mt-5 flex items-center gap-1.5 font-inter text-xs text-rain-cloud/45 hover:text-wet-earth transition-colors"
      >
        Browse all heritage foods
        <ArrowRight className="w-3 h-3" strokeWidth={1.5} />
      </Link>
    </section>
  );
}