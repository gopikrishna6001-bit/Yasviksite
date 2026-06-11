import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { categories as categoriesApi, products as productsApi } from '@/services/api';
import { ChevronRight } from 'lucide-react';
import { useUserAffinity } from '@/lib/UserAffinityContext';
import ProductPeekTray from '@/components/products/ProductPeekTray';

const STORY_LABELS = {
  default: ['From Rain-fed Fields', 'Forest Flavors', 'Slow Ground', 'Temple Pantry', 'Native Traditions'],
};

export default function CategoryDiscoveryStrip() {
  const scrollRef = useRef(null);
  const { recordEngagement } = useUserAffinity();
  const [peekProduct, setPeekProduct] = useState(null);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories-strip'],
    queryFn: () => categoriesApi.listActive(10),
  });

  // Fetch one featured product per category for peek preview
  const { data: categoryProducts = [] } = useQuery({
    queryKey: ['category-peek-products'],
    queryFn: () => productsApi.listFeatured(20),
    staleTime: 5 * 60 * 1000,
  });

  const getProductForCategory = (catId) =>
    categoryProducts.find(p => p.category_id === catId) || null;

  const handleCategoryTap = (cat, e) => {
    // Record engagement for personalization
    recordEngagement({ categoryId: cat.id, categoryName: cat.emotional_title || cat.name });
  };

  if (categories.length === 0) return null;

  return (
    <section className="py-8">
      <div className="flex items-center justify-between px-5 mb-4">
        <div>
          <p className="font-inter text-[9px] tracking-[0.28em] uppercase text-rain-cloud/35">Discover</p>
          <h2 className="font-cormorant text-2xl text-rain-cloud font-light mt-0.5">By Origin</h2>
        </div>
        <Link to="/shop" className="flex items-center gap-1 font-inter text-xs text-wet-earth">
          All <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto px-5 pb-1 hide-scrollbar snap-x snap-mandatory"
      >
        {categories.map((cat, i) => (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.07 }}
            className="flex-shrink-0 snap-start"
          >
            <Link
              to={`/shop?category=${cat.id}`}
              onClick={(e) => handleCategoryTap(cat, e)}
              className="block w-36 rounded-2xl overflow-hidden relative group active:scale-95 transition-transform duration-150"
            >
              <div className="aspect-[3/4] bg-temple-stone/20">
                {cat.cover_image ? (
                  <img src={cat.cover_image} alt={cat.name} className="w-full h-full object-cover group-active:scale-105 transition-transform duration-300" loading="lazy" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-b from-forest-canopy/20 to-wet-earth/20" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-rain-cloud/75 via-rain-cloud/10 to-transparent" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="font-cormorant text-white text-base font-light leading-tight">
                  {STORY_LABELS.default[i] || cat.emotional_title || cat.name}
                </p>
                {cat.short_intro && (
                  <p className="font-inter text-[9px] text-white/55 mt-0.5 line-clamp-2 leading-relaxed">
                    {cat.short_intro}
                  </p>
                )}
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Product peek tray */}
      <ProductPeekTray product={peekProduct} onClose={() => setPeekProduct(null)} />
    </section>
  );
}