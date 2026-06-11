import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useRecentlyViewed } from '@/lib/RecentlyViewedContext';
import { useCart } from '@/lib/CartContext';
import { Plus, Minus } from 'lucide-react';

export default function ContinueExploringSection() {
  const { items: recentItems } = useRecentlyViewed();
  const { items: cartItems, addItem, updateQty } = useCart();

  if (recentItems.length === 0) return null;

  return (
    <section className="py-8">
      <div className="px-5 mb-4">
        <p className="font-inter text-[9px] tracking-[0.28em] uppercase text-rain-cloud/35">From Your Discoveries</p>
        <h2 className="font-cormorant text-2xl text-rain-cloud font-light mt-0.5">Continue Exploring</h2>
      </div>

      <div className="flex gap-3 overflow-x-auto px-5 pb-1 hide-scrollbar snap-x">
        {recentItems.slice(0, 8).map((item, i) => {
          const cartKey = `${item.id}__default`;
          const cartItem = cartItems.find(c => c.key === cartKey);
          const qty = cartItem?.qty || 0;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
              className="flex-shrink-0 snap-start w-36"
            >
              <Link to={`/product/${item.id}`} className="block">
                <div className="aspect-square rounded-2xl overflow-hidden bg-temple-stone/15 relative">
                  {item.hero_image && (
                    <img src={item.hero_image} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                  )}
                </div>
                <div className="mt-2 px-0.5">
                  <p className="font-cormorant text-sm text-rain-cloud leading-tight line-clamp-2">{item.title}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="font-inter text-xs text-rain-cloud/60">₹{item.price}</span>
                    <div onClick={e => e.preventDefault()}>
                      {qty === 0 ? (
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); addItem({ id: item.id, title: item.title, price: item.price, hero_image: item.hero_image, unit: item.unit }); }}
                          className="w-7 h-7 rounded-full bg-wet-earth flex items-center justify-center"
                        >
                          <Plus className="w-3 h-3 text-white" />
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 bg-wet-earth rounded-full px-1.5 py-1">
                          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); updateQty(cartKey, qty - 1); }} className="w-4 h-4 flex items-center justify-center">
                            <Minus className="w-2.5 h-2.5 text-white" />
                          </button>
                          <span className="font-inter text-[10px] text-white w-3 text-center">{qty}</span>
                          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); updateQty(cartKey, qty + 1); }} className="w-4 h-4 flex items-center justify-center">
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
    </section>
  );
}