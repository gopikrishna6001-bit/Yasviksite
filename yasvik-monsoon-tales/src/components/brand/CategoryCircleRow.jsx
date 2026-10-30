import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import CategoryCircle from '@/components/brand/CategoryCircle';
import { getCategoryDisplayName, getCategoryShopHref } from '@/lib/categoryDisplay';
import { useCategoryDisplayImages } from '@/hooks/useCategoryDisplayImages';
import { useStorefrontCategories } from '@/hooks/useStorefrontCategories';

export default function CategoryCircleRow() {
  const { data: categories = [] } = useStorefrontCategories();

  const { categories: enriched } = useCategoryDisplayImages(categories);

  if (!enriched.length) return null;

  return (
    <section className="bg-white px-4 py-6 md:px-8 md:py-8" aria-labelledby="home-categories-heading">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="home-categories-heading" className="font-cormorant text-2xl font-semibold text-deep-forest md:text-3xl">
            Shop by Category
          </h2>
          <Link to="/shop" className="inline-flex items-center gap-1 font-inter text-sm font-bold text-neon-paddy">
            View all <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-4 gap-x-3 gap-y-5 sm:grid-cols-5 md:grid-cols-5 md:gap-x-5 md:gap-y-7 lg:grid-cols-10">
          {enriched.map((cat, index) => (
            <CategoryCircle
              key={cat.id}
              label={getCategoryDisplayName(cat)}
              href={getCategoryShopHref(cat)}
              imageUrl={cat.displayImage || cat.cover_image}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
