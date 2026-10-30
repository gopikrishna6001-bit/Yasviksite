import { useQuery } from '@tanstack/react-query';
import ComboCarousel from '@/components/products/ComboCarousel';
import { fetchShopCatalogueBundles } from '@/services/productRelationsApi';
import { retailClasses } from '@/brand/retailTheme';

/**
 * Combos as a permanent commercial block — purpose-led, not decorative.
 */
export default function EditorialCombosSection() {
  const { data: bundles = [], isLoading } = useQuery({
    queryKey: ['editorial-catalogue-bundles'],
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

  if (isLoading || !featured.length) return null;

  return (
    <section className="border-b border-soft-border/40 bg-warm-cream py-8 md:py-10">
      <div className={retailClasses.container}>
        <ComboCarousel
          bundles={featured}
          limit={6}
          eyebrow="Combinations"
          title="Baskets with a clear purpose"
          description="Everyday seeds, family dry fruits, value combinations — see what you pay for, including any free items."
        />
      </div>
    </section>
  );
}
