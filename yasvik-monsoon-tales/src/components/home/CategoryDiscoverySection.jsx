import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { categories as categoriesApi } from '@/services/api';
import CategoryTile from '@/components/brand/CategoryTile';
import SectionHeader from '@/components/brand/SectionHeader';
import { resolveCategoryLinks } from '@/brand/monsoonTokens';

export default function CategoryDiscoverySection() {
  const { data: categories = [] } = useQuery({
    queryKey: ['home-category-discovery'],
    queryFn: () => categoriesApi.listActive(24),
    staleTime: 5 * 60 * 1000,
  });

  const categoryLinks = useMemo(() => resolveCategoryLinks(categories), [categories]);

  return (
    <section className="bg-white px-4 py-12 md:px-8 md:py-16" aria-labelledby="home-categories-heading">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-6 flex items-end justify-between gap-4">
          <SectionHeader
            id="home-categories-heading"
            eyebrow="Shop by category"
            title="Find what your kitchen needs"
            description="Millets, staples, oils, spices, snacks and pooja essentials — chosen for everyday Indian homes."
          />
          <Link
            to="/shop"
            className="hidden flex-shrink-0 items-center gap-1 font-inter text-sm font-bold text-neon-paddy hover:text-deep-forest md:inline-flex"
          >
            View all <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {categoryLinks.map((category, index) => (
            <CategoryTile
              key={category.label}
              label={category.label}
              href={category.href}
              imageUrl={category.imageUrl}
              index={index}
            />
          ))}
        </div>

        <div className="mt-6 text-center md:hidden">
          <Link
            to="/shop"
            className="inline-flex items-center gap-1 font-inter text-sm font-bold text-neon-paddy"
          >
            View all categories <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
