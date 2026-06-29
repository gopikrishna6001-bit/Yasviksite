import { Link } from 'react-router-dom';
import { useWishlist } from '@/lib/WishlistContext';
import { useQuery } from '@tanstack/react-query';
import { products as productsApi } from '@/services/api';
import ProductCard from '@/components/products/ProductCard';
import PublicPageHeader from '@/components/brand/PublicPageHeader';
import PublicPageShell from '@/components/brand/PublicPageShell';
import YasvikButton from '@/components/brand/YasvikButton';
import { Bookmark } from 'lucide-react';

export default function Wishlist() {
  const { ids } = useWishlist();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['wishlist-products', ids],
    queryFn: async () => {
      if (ids.length === 0) return [];
      const all = await productsApi.list('-created_date', 100);
      return all.filter((p) => ids.includes(p.id));
    },
    enabled: ids.length > 0,
  });

  return (
    <PublicPageShell illustration="wishlist">
      <PublicPageHeader
        eyebrow="Bookmarks"
        title="Saved items"
        description="Products you bookmarked while browsing the shop."
      />

      <div className="mx-auto max-w-2xl px-5 pb-8">
        {ids.length === 0 ? (
          <div className="rounded-2xl border border-soft-border bg-white px-6 py-16 text-center">
            <Bookmark className="mx-auto mb-4 h-8 w-8 text-deep-forest/25" />
            <p className="font-cormorant text-2xl text-deep-forest">Nothing saved yet</p>
            <p className="mt-2 font-inter text-sm text-deep-forest/60">Tap the bookmark on any product to save it here.</p>
            <div className="mt-6">
              <YasvikButton to="/shop" variant="primary">
                Browse the shop
              </YasvikButton>
            </div>
          </div>
        ) : isLoading ? (
          <div className="space-y-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl bg-white/80" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {products.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} variant="shop" />
            ))}
          </div>
        )}

        {ids.length > 0 && !isLoading && products.length === 0 ? (
          <p className="py-12 text-center font-inter text-sm text-deep-forest/55">
            Saved items are no longer available.{' '}
            <Link to="/shop" className="font-bold text-neon-paddy hover:text-deep-forest">
              Browse the shop
            </Link>
          </p>
        ) : null}
      </div>
    </PublicPageShell>
  );
}
