import { Link } from 'react-router-dom';
import { useWishlist } from '@/lib/WishlistContext';
import { useQuery } from '@tanstack/react-query';
import { products as productsApi } from '@/services/api';
import ProductListRow from '@/components/products/ProductListRow';
import RetailPageShell from '@/components/retail/RetailPageShell';
import RetailPageHeader from '@/components/retail/RetailPageHeader';
import { retailClasses } from '@/brand/retailTheme';
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
    <RetailPageShell>
      <RetailPageHeader title="Saved items" backTo="/shop" backLabel="Shop" />

      <div className={`${retailClasses.container} py-6`}>
        {ids.length === 0 ? (
          <div className={`${retailClasses.card} px-6 py-14 text-center`}>
            <Bookmark className="mx-auto mb-3 h-8 w-8 text-deep-forest/25" />
            <p className="font-cormorant text-xl text-deep-forest">Nothing saved yet</p>
            <Link to="/shop" className={`mt-4 inline-flex ${retailClasses.btnPrimary}`}>Browse shop</Link>
          </div>
        ) : isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-white/80" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-4">
            {products.map((product, index) => (
              <ProductListRow key={product.id} product={product} index={index} />
            ))}
          </div>
        )}

        {ids.length > 0 && !isLoading && products.length === 0 ? (
          <p className="py-10 text-center font-inter text-sm text-deep-forest/55">
            Saved items unavailable.{' '}
            <Link to="/shop" className="font-bold text-neon-paddy">Browse shop</Link>
          </p>
        ) : null}
      </div>
    </RetailPageShell>
  );
}
