import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useRecentlyViewed } from '@/lib/RecentlyViewedContext';
import { ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { journeys as journeysApi, products as productsApi } from '@/services/api';
import { useUserAffinity } from '@/lib/UserAffinityContext';

export default function PersonalizedContextBanner() {
  const { items: recentItems } = useRecentlyViewed();
  const { affinity, topCategoryId } = useUserAffinity();

  const { data: journeys = [] } = useQuery({
    queryKey: ['journeys-banner'],
    queryFn: () => journeysApi.listFeatured(3),
  });

  // Fetch category-specific products if we know the user's top category
  const { data: categoryProducts = [] } = useQuery({
    queryKey: ['affinity-products', topCategoryId],
    queryFn: () => productsApi.listByCategory(topCategoryId, 3),
    enabled: !!topCategoryId,
  });

  // Show only if user has browsing history
  if (recentItems.length === 0 && journeys.length === 0) return null;

  const journey = journeys[0];

  // Personalized prompt based on affinity
  const categoryName = affinity.firstCategoryName;
  const prompt = categoryName
    ? `More from ${categoryName}`
    : affinity.firstJourneyName
    ? `Continue your ${affinity.firstJourneyName} journey`
    : 'Return to the rain-fed fields';

  return (
    <section className="px-5 py-6">
      {journey && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Link to={topCategoryId ? `/shop?category=${topCategoryId}` : `/journeys/${journey.id}`} className="block relative rounded-2xl overflow-hidden">
            <div className="aspect-[16/7] bg-temple-stone/20">
              {journey.cover_image && (
                <img src={journey.cover_image} alt={journey.title} className="w-full h-full object-cover" loading="lazy" />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-rain-cloud/75 via-rain-cloud/30 to-transparent" />
            </div>
            <div className="absolute inset-0 flex flex-col justify-center px-5">
              <p className="font-inter text-[9px] tracking-[0.25em] uppercase text-white/50 mb-1">
                {topCategoryId ? 'Based on your interest' : 'Inspired by your journeys'}
              </p>
              <h3 className="font-cormorant text-xl text-white font-light leading-snug max-w-[200px]">
                {prompt}
              </h3>
              <div className="flex items-center gap-1.5 mt-3">
                <span className="font-inter text-xs text-white/70">Explore</span>
                <ArrowRight className="w-3.5 h-3.5 text-white/70" />
              </div>
            </div>
          </Link>
        </motion.div>
      )}

      {/* Affinity-driven product suggestions */}
      {categoryProducts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mt-4 flex gap-2 overflow-x-auto hide-scrollbar"
        >
          {categoryProducts.map(p => (
            <Link
              key={p.id}
              to={`/product/${p.id}`}
              className="flex-shrink-0 flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-border/40 shadow-sm active:scale-95 transition-transform"
            >
              {p.hero_image && (
                <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
                  <img src={p.hero_image} alt={p.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div>
                <p className="font-cormorant text-sm text-rain-cloud font-medium leading-tight line-clamp-1 max-w-[110px]">{p.title}</p>
                <p className="font-inter text-[10px] text-rain-cloud/45">₹{p.price}</p>
              </div>
            </Link>
          ))}
        </motion.div>
      )}
    </section>
  );
}