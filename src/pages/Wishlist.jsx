import { motion } from 'framer-motion';
import { useWishlist } from '@/lib/WishlistContext';
import { useQuery } from '@tanstack/react-query';
import { appClient } from '@/api/appClient';
import { products as productsApi } from '@/services/api';
import ProductCard from '@/components/products/ProductCard';
import PageHeroRenderer from '@/components/PageHeroRenderer';
import { Bookmark } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Wishlist() {
  const { ids } = useWishlist();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['wishlist-products', ids],
    queryFn: async () => {
      if (ids.length === 0) return [];
      const all = await productsApi.list('-created_date', 100);
      return all.filter(p => ids.includes(p.id));
    },
    enabled: ids.length > 0,
  });

  const { data: hero, isLoading: heroLoading } = useQuery({
    queryKey: ['page-hero', 'wishlist'],
    queryFn: async () => {
      const results = await appClient.entities.PageHero.filter({ page_key: 'wishlist' }, '-updated_date', 1);
      return results[0];
    },
  });

  return (
    <div className="min-h-screen bg-rain-mist pb-24">
      {hero && <PageHeroRenderer hero={hero} isLoading={heroLoading} />}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8 px-6 pt-8">
        <p className="font-inter text-[10px] tracking-[0.2em] uppercase text-rain-cloud/40 mb-2">Bookmarks</p>
        <h1 className="font-cormorant text-4xl text-rain-cloud font-light mb-2">Saved</h1>
        <p className="font-inter text-xs text-rain-cloud/50">Your wishlist</p>
      </motion.div>

      <div className="px-5 max-w-lg mx-auto">
        {ids.length === 0 ? (
          <div className="text-center py-20">
            <Bookmark className="w-8 h-8 text-rain-cloud/20 mx-auto mb-4" />
            <p className="font-cormorant text-xl text-rain-cloud/35 font-light italic">Nothing saved yet</p>
            <p className="font-inter text-xs text-rain-cloud/30 mt-2 mb-6">Tap the bookmark on any product to save it here</p>
            <Link to="/shop" className="inline-block py-2.5 px-6 bg-wet-earth text-white font-inter text-sm rounded-full">
              Browse Foods
            </Link>
          </div>
        ) : isLoading ? (
          <div className="space-y-5">
            {[1,2,3].map(i => <div key={i} className="h-40 bg-temple-stone/20 rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <div className="space-y-6">
            {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        )}
      </div>
    </div>
  );
}