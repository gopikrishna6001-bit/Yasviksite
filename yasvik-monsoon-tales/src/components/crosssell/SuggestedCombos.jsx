import { useQuery } from '@tanstack/react-query';
import { ComboProductCardFromBundle } from '@/components/products/ComboProductCard';
import { fetchSuggestedCombos } from '@/services/productRelationsApi';
import { Link } from 'react-router-dom';
import { BUNDLES_SHOP_PATH } from '@/lib/comboUtils';

/**
 * On combo PDPs: recommend other published Yasvik combos (excludes current).
 */
export default function SuggestedCombos({
  excludeProductId = null,
  limit = 4,
  className = '',
}) {
  const { data: bundles = [], isLoading } = useQuery({
    queryKey: ['suggested-combos', excludeProductId, limit],
    queryFn: () => fetchSuggestedCombos({ excludeProductId, limit }),
    enabled: Boolean(excludeProductId),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || bundles.length === 0) return null;

  return (
    <section className={`mt-6 rounded-[28px] border border-soft-border bg-[#FAF7F0] p-4 md:p-5 ${className}`}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-cormorant text-2xl font-semibold text-deep-forest">Suggested Combos</h2>
          <p className="mt-1 font-inter text-sm text-deep-forest/55">
            Other Yasvik combinations worth considering.
          </p>
        </div>
        <Link
          to={BUNDLES_SHOP_PATH}
          className="font-inter text-xs font-bold text-deep-forest hover:underline"
        >
          View all combos →
        </Link>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {bundles.map((bundle, index) => (
          <ComboProductCardFromBundle
            key={bundle.id}
            bundle={bundle}
            index={index}
            compact
          />
        ))}
      </div>
    </section>
  );
}
