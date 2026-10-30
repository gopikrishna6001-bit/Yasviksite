import { useQuery } from '@tanstack/react-query';
import ComboCarousel from '@/components/products/ComboCarousel';
import { BUNDLES_SHOP_PATH } from '@/lib/comboUtils';
import { fetchActiveBundlesWithProducts } from '@/services/productRelationsApi';

/**
 * Compact combo merchandising strip — reuses ComboCarousel.
 * Never expands What’s Inside on the page.
 */
export default function BundleStrip({
  location = 'home',
  productId = null,
  title = 'Combos & Value Packs',
  description = 'Useful combinations at better overall value.',
  limit = 6,
  className = '',
  showBrowseAll = true,
}) {
  const { data: bundles = [] } = useQuery({
    queryKey: ['product-bundles-carousel', location, productId, limit],
    queryFn: () => fetchActiveBundlesWithProducts({ location, limit: Math.max(limit * 2, 8), productId }),
    staleTime: 5 * 60 * 1000,
  });

  const sellable = bundles.filter((b) => b?.parent_product?.id && b.parent_product.is_published !== false);
  if (!sellable.length) return null;

  return (
    <ComboCarousel
      bundles={sellable}
      title={title}
      description={description}
      limit={limit}
      className={className}
      viewAllHref={showBrowseAll ? BUNDLES_SHOP_PATH : null}
    />
  );
}
