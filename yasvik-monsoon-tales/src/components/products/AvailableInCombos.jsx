import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchBundlesContainingProduct } from '@/services/productRelationsApi';
import {
  computeBundleRetailValue,
  isSellableBundleProduct,
} from '@/lib/productBundleUtils';
import { getProductPath } from '@/lib/productUrls';
import { formatDisplayTitle } from '@/lib/formatDisplayTitle';
import OptimizedImage from '@/components/ui/OptimizedImage';
import { productCardImageUrl } from '@/lib/mediaUrl';

function formatRupee(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

/**
 * On individual PDPs: promote Yasvik combos that include this product.
 */
export default function AvailableInCombos({
  productId,
  bundles: bundlesProp = null,
  className = '',
}) {
  const { data: fetchedBundles = [], isLoading } = useQuery({
    queryKey: ['product-available-in-combos', productId],
    queryFn: () => fetchBundlesContainingProduct(productId, { limit: 6 }),
    enabled: Boolean(productId) && bundlesProp == null,
    staleTime: 3 * 60 * 1000,
  });

  const bundles = bundlesProp != null ? bundlesProp : fetchedBundles;
  if ((bundlesProp == null && isLoading) || !bundles.length) return null;

  return (
    <section className={className}>
      <h3 className="font-inter text-sm font-semibold text-deep-forest md:text-base">
        Available in these Yasvik Combos
      </h3>
      <p className="mt-1 font-inter text-xs text-deep-forest/55">
        Better value when packed together — buy the combo instead of every item separately.
      </p>
      <div className="mt-4 space-y-3">
        {bundles.map((bundle) => {
          const parent = bundle.parent_product;
          if (!parent?.id || !isSellableBundleProduct(parent)) return null;
          if (parent.is_published === false) return null;

          const productsById = new Map((bundle.products || []).map((row) => [row.id, row]));
          const value = computeBundleRetailValue({
            bundle,
            productsById,
            comboSellingPrice: parent.price,
          });
          const href = getProductPath(parent);
          const title = formatDisplayTitle(parent.title || parent.name || bundle.bundle_name);
          const image = productCardImageUrl(parent, null, 'thumb');
          const saveLabel = value.allExactMatches && value.saveAmountRs > 0
            ? `Save ₹${Math.round(value.saveAmountRs).toLocaleString('en-IN')}`
            : null;
          const badge = String(parent.yasvik_mark || '').trim();

          return (
            <Link
              key={bundle.id}
              to={href}
              className="flex items-center gap-3 rounded-2xl border border-soft-border bg-white p-3 transition-colors hover:border-neon-paddy/40"
            >
              <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-warm-cream">
                {image ? (
                  <OptimizedImage src={image} alt={title} preset="thumb" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                {badge ? (
                  <p className="font-inter text-[10px] font-bold uppercase tracking-[0.12em] text-sun-dried-clay">
                    {badge}
                  </p>
                ) : null}
                <p className="font-inter text-sm font-semibold text-deep-forest line-clamp-2">{title}</p>
                <p className="mt-0.5 font-inter text-xs text-deep-forest/55">
                  {value.itemCount} products
                  {value.netWeightLabel ? ` · ${value.netWeightLabel}` : ''}
                  {formatRupee(parent.price) ? ` · ${formatRupee(parent.price)}` : ''}
                </p>
              </div>
              <div className="flex-shrink-0 text-right">
                <span className="inline-flex rounded-full bg-deep-forest px-3 py-1.5 font-inter text-[11px] font-bold text-warm-cream">
                  Buy in Combo
                </span>
                {saveLabel ? (
                  <p className="mt-1 font-inter text-[11px] font-bold text-neon-paddy">{saveLabel}</p>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
