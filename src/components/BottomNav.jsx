import { Link, useLocation } from 'react-router-dom';
import { Home, UtensilsCrossed, ShoppingBag, Search, Compass, Mail } from 'lucide-react';
import { useCart } from '@/lib/CartContext';

const tabs = [
  { label: 'Home', path: '/', icon: Home, exact: true },
  { label: 'Shop', path: '/shop', icon: UtensilsCrossed },
  { label: 'Our Roots', path: '/our-roots', icon: Compass },
  { label: 'Contact', path: '/contact', icon: Mail },
];

export default function BottomNav({ onSearchOpen, onCartOpen }) {
  const location = useLocation();
  const { totalItems } = useCart();

  // Hide on homepage — hero handles navigation there
  if (location.pathname === '/') return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/92 backdrop-blur-xl border-t border-temple-stone/15">
      <div className="max-w-lg mx-auto flex items-center justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {tabs.map(({ label, path, icon: NavIcon, exact }) => {
          const isActive = exact
            ? location.pathname === path
            : location.pathname.startsWith(path);
          return (
            <Link
              key={path}
              to={path}
              className="flex flex-col items-center gap-0.5 px-3 py-1"
            >
              <NavIcon
                className={`w-5 h-5 transition-colors ${isActive ? 'text-forest-canopy' : 'text-rain-cloud/35'}`}
                strokeWidth={isActive ? 2 : 1.5}
              />
              <span className={`text-[10px] font-inter ${isActive ? 'text-forest-canopy font-medium' : 'text-rain-cloud/35'}`}>
                {label}
              </span>
            </Link>
          );
        })}

        <button onClick={onSearchOpen} className="flex flex-col items-center gap-0.5 px-3 py-1">
          <Search className="w-5 h-5 text-rain-cloud/35" strokeWidth={1.5} />
          <span className="text-[10px] font-inter text-rain-cloud/35">Search</span>
        </button>

        <button onClick={onCartOpen} className="flex flex-col items-center gap-0.5 px-3 py-1 relative">
          <div className="relative">
            <ShoppingBag className="w-5 h-5 text-rain-cloud/35" strokeWidth={1.5} />
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-wet-earth text-white text-[9px] font-inter flex items-center justify-center">
                {totalItems > 9 ? '9+' : totalItems}
              </span>
            )}
          </div>
          <span className="text-[10px] font-inter text-rain-cloud/35">Cart</span>
        </button>
      </div>
    </nav>
  );
}
