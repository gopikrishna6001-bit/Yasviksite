import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useRecentlyViewed } from '@/lib/RecentlyViewedContext';
import { useTrending } from '@/lib/TrendingContext';
import { useQuery } from '@tanstack/react-query';
import { products as productsApi } from '@/services/api';
import { useCart } from '@/lib/CartContext';
import { Plus, Minus, ArrowRight } from 'lucide-react';

// The utility zone — secondary visual weight, deeper scroll position.
// Shows recently viewed (returning users) OR trending picks (new users).
export default function QuietUtilityZone() {
  const { items: recentItems } = useRecentlyViewed();
  const { sortByTrending } = useTrending();
  const { items: cartItems, addItem, updateQty } = useCart();

  const { data: allProducts = [] } = useQuery({
    queryKey: ['trending-section-products'],
    queryFn: () => productsApi.listPublished('-created_date', 30),
    staleTime: 3 * 60 * 1000,
  });

  const hasRecent = recentItems.length > 0;
  const displayItems = hasRecent
    ? recentItems.slice(0, 6)
    : sortByTrending(allProducts).slice(0, 6).map(p => ({
        id: p.id,
        title: p.title,
        price: p.price,
        hero_image: p.hero_image,
        unit: p.unit,
      }));

  if (displayItems.length === 0) return null;

  const label = hasRecent ? 'Continue Exploring' : 'Others Are Choosing';
  const sublabel = hasRecent ? 'From your discoveries' : 'Popular this week';

  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.9, ease: 'easeOut' }}
      className="py-14 border-t border-border/15"
    >
      {/* Quiet header */}
      <div className="px-5 mb-6 flex items-end justify-between">
        <div>
          <p className="font-inter text-[9px] tracking-[0.28em] uppercase text-rain-cloud/30">
            {sublabel}
          </p>
          <h3 className="font-cormorant text-xl text-rain-cloud/70 font-light mt-0.5">
            {label}
          </h3>
        </div>
        <Link
          to="/shop"
          className="flex items-center gap-1 font-inter text-[10px] text-rain-cloud/35 hover:text-forest-canopy transition-colors"
        >
          All foods <ArrowRight className="w-3 h-3" strokeWidth={1.5} />
        </Link>
      </div>

      {/* Horizontal scroll — compact, secondary density */}
      <div className="flex gap-3 overflow-x-auto px-5 pb-2 hide-scrollbar snap-x">
        {displayItems.map((item, i) => {
          const cartKey = `${item.id}__default`;
          const cartItem = cartItems.find(c => c.key === cartKey);
          const qty = cartItem?.qty || 0;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05, duration: 0.5 }}
              className="flex-shrink-0 snap-start w-32"
            >
              <Link to={`/product/${item.id}`} className="block">
                <div className="aspect-square rounded-2xl overflow-hidden bg-temple-stone/15">
                  {item.hero_image && (
                    <img
                      src={item.hero_image}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  )}
                </div>
                <div className="mt-2 px-0.5">
                  <p className="font-cormorant text-sm text-rain-cloud/80 leading-tight line-clamp-2">
                    {item.title}
                  </p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="font-inter text-[11px] text-rain-cloud/50">₹{item.price}</span>
                    <div onClick={e => e.preventDefault()}>
                      {qty === 0 ? (
                        <button
                          onClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            addItem({ id: item.id, title: item.title, price: item.price, hero_image: item.hero_image, unit: item.unit });
                          }}
                          className="w-6 h-6 rounded-full bg-wet-earth/80 flex items-center justify-center active:scale-90 transition-transform"
                        >
                          <Plus className="w-2.5 h-2.5 text-white" />
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 bg-wet-earth/80 rounded-full px-1.5 py-0.5">
                          <button onClick={e => { e.preventDefault(); e.stopPropagation(); updateQty(cartKey, qty - 1); }}>
                            <Minus className="w-2.5 h-2.5 text-white" />
                          </button>
                          <span className="font-inter text-[10px] text-white w-2.5 text-center">{qty}</span>
                          <button onClick={e => { e.preventDefault(); e.stopPropagation(); updateQty(cartKey, qty + 1); }}>
                            <Plus className="w-2.5 h-2.5 text-white" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}