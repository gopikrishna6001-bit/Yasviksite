import { useQuery } from '@tanstack/react-query';
import ComboCarousel from '@/components/products/ComboCarousel';
import { fetchShopCatalogueBundles } from '@/services/productRelationsApi';

/**
 * Homepage merchandising — compact carousel of catalogue combos.
 */
export default function FeaturedBundlesSection() {
  const { data: bundles = [], isLoading } = useQuery({
    queryKey: ['home-featured-catalogue-bundles'],
    queryFn: () => fetchShopCatalogueBundles({ limit: 12 }),
    staleTime: 5 * 60 * 1000,
  });

  const featured = [...bundles]
    .sort((a, b) => {
      const af = Number(Boolean(a?.parent_product?.is_featured || a?.is_featured));
      const bf = Number(Boolean(b?.parent_product?.is_featured || b?.is_featured));
      if (af !== bf) return bf - af;
      return 0;
    })
    .slice(0, 6);

  if (isLoading || featured.length === 0) return null;

  return (
    <section className="border-b border-soft-border/40 bg-warm-cream px-4 py-10 md:px-8 md:py-14">
      <div className="mx-auto max-w-[1400px]">
        <ComboCarousel bundles={featured} limit={6} />
      </div>
    </section>
  );
}
