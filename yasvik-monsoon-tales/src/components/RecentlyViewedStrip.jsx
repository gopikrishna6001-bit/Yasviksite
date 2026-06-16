import { Link } from 'react-router-dom';
import { useRecentlyViewed } from '@/lib/RecentlyViewedContext';

export default function RecentlyViewedStrip({ currentProductId }) {
  const { items } = useRecentlyViewed();
  const filtered = items.filter(i => i.id !== currentProductId);
  if (filtered.length === 0) return null;

  return (
    <div className="px-6 py-6">
      <p className="font-inter text-[10px] tracking-[0.2em] uppercase text-rain-cloud/40 mb-4">
        Recently Viewed
      </p>
      <div className="flex gap-3 overflow-x-auto hide-scrollbar">
        {filtered.map(item => (
          <Link key={item.id} to={`/product/${item.id}`} className="flex-shrink-0 w-24">
            <div className="aspect-square rounded-xl overflow-hidden bg-temple-stone/20 mb-2">
              {item.hero_image && (
                <img src={item.hero_image} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
              )}
            </div>
            <p className="font-cormorant text-xs text-rain-cloud leading-tight line-clamp-2">{item.title}</p>
            <p className="font-inter text-[10px] text-rain-cloud/50 mt-0.5">₹{item.price}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}