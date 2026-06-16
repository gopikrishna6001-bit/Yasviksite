import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { collections as collectionsApi } from '@/services/api';
import { ArrowRight } from 'lucide-react';
import { useSmartSort } from '@/hooks/useSmartSort';

function CollectionCard({ collection, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.12 }}
    >
      <Link to={`/shop?collection=${collection.id}`} className="block group">
        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden">
          <img
            src={collection.cover_image || 'https://images.unsplash.com/photo-1542010589005-d1eacc3918f2?w=600&q=75'}
            alt={collection.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-rain-cloud/70 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <h3 className="font-cormorant text-lg text-white font-light leading-snug">
              {collection.title}
            </h3>
            {collection.description && (
              <p className="font-inter text-xs text-white/55 mt-1 line-clamp-2 leading-relaxed">
                {collection.description}
              </p>
            )}
            {collection.product_ids?.length > 0 && (
              <p className="font-inter text-[10px] text-warm-turmeric mt-2">
                {collection.product_ids.length} items
              </p>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function FeaturedCollectionsSection() {
  const { data: raw = [], isLoading } = useQuery({
    queryKey: ['collections-featured'],
    queryFn: () => collectionsApi.filter({ is_featured: true, is_active: true }, 'sort_order', 4),
  });

  const collections = useSmartSort(raw, { dateField: 'created_date' });

  if (!isLoading && collections.length === 0) return null;

  return (
    <section className="py-8 px-5 bg-temple-stone/12 border-t border-border/10">
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="flex items-center justify-between mb-10 max-w-lg mx-auto"
      >
        <span className="font-inter text-[10px] tracking-[0.32em] text-rain-cloud/45 uppercase">
          Collections
        </span>
        <Link to="/shop" className="flex items-center gap-1 font-inter text-[10px] text-forest-canopy hover:text-forest-canopy/70 transition-colors">
          Browse all <ArrowRight className="w-3 h-3" />
        </Link>
      </motion.div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="aspect-[4/3] rounded-2xl bg-temple-stone/30 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
          {collections.map((col, i) => (
            <CollectionCard key={col.id} collection={col} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}