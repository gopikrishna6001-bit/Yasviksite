import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { appClient } from '@/api/appClient';
import ProductCard from '../products/ProductCard';

export default function DynamicProductsSection() {
  const { data: products = [] } = useQuery({
    queryKey: ['products-featured'],
    queryFn: () => appClient.entities.Product.filter({ is_published: true, is_featured: true }, '-created_date', 4),
  });

  return (
    <section className="py-16 px-5 bg-temple-stone/15">
      <motion.h2
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="text-center font-cormorant text-3xl md:text-4xl text-rain-cloud font-light italic mb-12"
      >
        From This Journey
      </motion.h2>

      {products.length === 0 ? (
        <div className="space-y-6 max-w-lg mx-auto">
          {[1, 2].map(i => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden">
              <div className="aspect-[4/3] bg-temple-stone/30 animate-pulse" />
              <div className="p-5 space-y-3">
                <div className="h-5 bg-temple-stone/30 rounded animate-pulse w-2/3" />
                <div className="h-4 bg-temple-stone/20 rounded animate-pulse" />
                <div className="h-4 bg-temple-stone/20 rounded animate-pulse w-4/5" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6 max-w-lg mx-auto">
          {products.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}