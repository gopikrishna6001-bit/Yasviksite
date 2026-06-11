import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { products as productsApi } from '@/services/api';
import QuickAddProductCard from '../products/QuickAddProductCard';

export default function FeaturedProductsSection() {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['featured-products-fallback'],
    queryFn: () => productsApi.listFeatured(6),
    staleTime: 5 * 60 * 1000,
  });

  if (!isLoading && products.length === 0) return null;

  return (
    <section className="px-5 pt-12 pb-6 bg-gradient-to-b from-transparent to-rain-mist/20">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mb-6"
      >
        <p className="font-inter text-[9px] tracking-[0.28em] uppercase text-rain-cloud/35">New Here?</p>
        <h2 className="font-cormorant text-2xl text-rain-cloud font-light mt-0.5">Featured Selections</h2>
      </motion.div>

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
          {products.map((p, i) => (
            <QuickAddProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}