/**
 * TrendingNowSection
 * ──────────────────────────────────────────────────────────
 * Displays top trending products (based on recent view/cart
 * signals from TrendingContext) with emotional mood tags and
 * quick-add controls. Appears on the homepage below the hero.
 */
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Droplets } from 'lucide-react';
import { products as productsApi } from '@/services/api';
import { useTrending } from '@/lib/TrendingContext';
import QuickAddProductCard from '../products/QuickAddProductCard';

export default function TrendingNowSection() {
  const { sortByTrending, topProductIds } = useTrending();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['trending-section-products'],
    queryFn: () => productsApi.listPublished('-created_date', 30),
    staleTime: 3 * 60 * 1000,
  });

  // Sort by trending; take top 6
  const sorted = sortByTrending(products).slice(0, 6);

  // Don't render if nothing to show
  if (!isLoading && sorted.length === 0) return null;

  return (
    <section className="px-5 pt-12 pb-6 border-t border-border/10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3 h-3 text-warm-turmeric" strokeWidth={1.5} />
            <span className="font-inter text-[9px] uppercase tracking-[0.28em] text-warm-turmeric">
              Trending Now
            </span>
          </div>
          <h2 className="font-cormorant text-2xl text-rain-cloud font-light">
            What Others Are Choosing
          </h2>
        </div>
      </motion.div>

      {/* Product grid */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden">
              <div className="aspect-[4/3] bg-temple-stone/25 animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-2 bg-temple-stone/20 rounded w-1/3 animate-pulse" />
                <div className="h-5 bg-temple-stone/25 rounded w-2/3 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {sorted.map((p, i) => (
            <QuickAddProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}