import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { appClient } from '@/api/appClient';
import ComboCard from '@/components/products/ComboCard';
import SectionHeader from '@/components/brand/SectionHeader';
import { BUNDLES_SHOP_PATH, getFeaturedCombos } from '@/lib/comboUtils';

export default function FeaturedBundlesSection() {
  const { data: combos = [], isLoading } = useQuery({
    queryKey: ['home-featured-combos'],
    queryFn: () => appClient.entities.Combo.filter({ is_published: true }, '-created_date', 20),
    staleTime: 5 * 60 * 1000,
  });

  const featured = getFeaturedCombos(combos, 3);

  if (isLoading || featured.length === 0) return null;

  return (
    <section className="border-b border-soft-border/40 bg-warm-cream px-4 py-12 md:px-8 md:py-16">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-7 flex items-end justify-between gap-4">
          <SectionHeader
            eyebrow="Save more together"
            title="Featured bundles"
            description="Curated packs with a better combined price — add the whole bundle in one tap."
          />
          <Link
            to={BUNDLES_SHOP_PATH}
            className="hidden flex-shrink-0 items-center gap-1 font-inter text-sm font-bold text-sun-dried-clay hover:text-deep-forest md:inline-flex"
          >
            All bundles <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {featured.map((combo) => (
            <ComboCard key={combo.id} combo={combo} />
          ))}
        </div>

        <div className="mt-6 text-center md:hidden">
          <Link to={BUNDLES_SHOP_PATH} className="inline-flex items-center gap-1 font-inter text-sm font-bold text-sun-dried-clay">
            View all bundles <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
