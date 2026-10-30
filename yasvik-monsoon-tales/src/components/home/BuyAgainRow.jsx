import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { RotateCcw } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useCart } from '@/lib/CartContext';
import { orders as ordersApi, products as productsApi } from '@/services/api';
import OptimizedImage from '@/components/ui/OptimizedImage';
import { getProductPath } from '@/lib/productUrls';
import { safeMedia } from '@/lib/mediaUrl';
import {
  buildReorderCartProduct,
  buyAgainCardKey,
  extractBuyAgainCandidates,
  mergeBuyAgainByCatalog,
} from '@/lib/buyAgainUtils';

export default function BuyAgainRow() {
  const { user, isAuthenticated } = useAuth();
  const { addItem } = useCart();

  const { data: recentOrders = [] } = useQuery({
    queryKey: ['buy-again-orders', user?.id],
    queryFn: () => ordersApi.listByUser(user.id, 20),
    enabled: Boolean(isAuthenticated && user?.id),
    staleTime: 2 * 60 * 1000,
  });

  const rawCandidates = useMemo(
    () => extractBuyAgainCandidates(recentOrders, { limit: 12 }),
    [recentOrders],
  );

  const productIds = useMemo(() => {
    const ids = new Set();
    for (const candidate of rawCandidates) {
      if (candidate.productId) ids.add(candidate.productId);
    }
    return [...ids];
  }, [rawCandidates]);

  const titleOnlyCandidates = useMemo(
    () => rawCandidates.some((candidate) => !candidate.productId),
    [rawCandidates],
  );

  const { data: catalogForMatch = [] } = useQuery({
    queryKey: ['buy-again-catalog-match'],
    queryFn: () => productsApi.listPublished('sort_order', 150),
    enabled: titleOnlyCandidates,
    staleTime: 10 * 60 * 1000,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['buy-again-products', productIds.join(',')],
    queryFn: async () => {
      const results = await Promise.all(
        productIds.map((id) => productsApi.get(id).catch(() => null)),
      );
      return results.filter((p) => p && p.is_published !== false);
    },
    enabled: productIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const catalogProducts = useMemo(() => {
    const byId = new Map();
    for (const product of [...products, ...catalogForMatch]) {
      if (product?.id) byId.set(product.id, product);
    }
    return [...byId.values()];
  }, [products, catalogForMatch]);

  const buyAgainItems = useMemo(() => {
    const merged = mergeBuyAgainByCatalog(rawCandidates, catalogProducts);
    return merged
      .filter((candidate) => candidate.productId && catalogProducts.some((p) => p.id === candidate.productId))
      .slice(0, 8);
  }, [rawCandidates, catalogProducts]);

  if (!isAuthenticated || buyAgainItems.length === 0) return null;

  const handleReorder = (candidate) => {
    const product = candidate.product || catalogProducts.find((p) => p.id === candidate.productId);
    if (!product) return;

    const { payload, variant, qty } = buildReorderCartProduct(product, candidate.line);
    if (!payload.id) return;

    addItem(payload, variant, qty);
  };

  return (
    <section className="border-b border-soft-border/40 bg-white px-4 py-8 md:px-8 md:py-10" aria-labelledby="buy-again-heading">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <p className="font-inter text-[11px] font-bold uppercase tracking-[0.14em] text-deep-forest/45">Your pantry</p>
            <h2 id="buy-again-heading" className="font-cormorant text-2xl font-semibold text-deep-forest md:text-3xl">
              Buy again
            </h2>
            <p className="mt-1 font-inter text-xs text-deep-forest/55">
              Your most-ordered staples — one tap adds your usual pack size.
            </p>
          </div>
          <Link to="/profile" className="font-inter text-xs font-bold text-neon-paddy hover:text-deep-forest">
            Order history
          </Link>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-1 hide-scrollbar">
          {buyAgainItems.map((candidate) => {
            const product = candidate.product || catalogProducts.find((p) => p.id === candidate.productId);
            const { payload } = buildReorderCartProduct(product, candidate.line);
            const image = safeMedia(
              payload.hero_image || product?.hero_image || product?.featured_image_url || product?.image_url,
              'thumb',
            );
            const href = candidate.productId
              ? getProductPath(product || { id: candidate.productId, title: candidate.title })
              : '/shop';
            const variantLabel = candidate.preferredVariant || candidate.line?.variant;

            return (
              <article
                key={buyAgainCardKey(candidate)}
                className="flex w-[9.5rem] flex-shrink-0 flex-col rounded-xl border border-soft-border/70 bg-warm-cream/40 p-3 md:w-[10.5rem]"
              >
                <Link to={href} className="block overflow-hidden rounded-lg bg-white">
                  {image ? (
                    <OptimizedImage src={image} alt="" preset="thumb" fadeOnLoad={false} className="aspect-square w-full object-cover" />
                  ) : (
                    <div className="flex aspect-square items-center justify-center bg-white font-inter text-[10px] text-deep-forest/40">
                      No image
                    </div>
                  )}
                </Link>
                <p className="mt-2 line-clamp-2 font-inter text-xs font-semibold leading-snug text-deep-forest">
                  {payload.title}
                </p>
                {variantLabel ? (
                  <p className="mt-0.5 font-inter text-[10px] font-medium text-deep-forest/55">{variantLabel}</p>
                ) : null}
                {payload.price ? (
                  <p className="mt-1 font-inter text-xs font-bold text-deep-forest">₹{payload.price}</p>
                ) : null}
                {candidate.orderCount > 1 ? (
                  <p className="mt-0.5 font-inter text-[10px] text-deep-forest/45">
                    Ordered {candidate.orderCount}×
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={() => handleReorder(candidate)}
                  className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-lg bg-deep-forest px-2 py-2 font-inter text-[11px] font-bold text-white hover:bg-deep-forest/90"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  Add to cart
                </button>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
