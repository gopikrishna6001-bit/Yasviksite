import { Link, useLocation } from 'react-router-dom';
import { Home, ShoppingBag, Store } from 'lucide-react';
import { useCart } from '@/lib/CartContext';

const tabs = [
  { label: 'Home', path: '/', icon: Home, exact: true },
  { label: 'Shop', path: '/shop', icon: Store },
];

export default function BottomNav({ onCartOpen }) {
  const location = useLocation();
  const { totalItems } = useCart();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-temple-stone/15 bg-white/92 backdrop-blur-xl md:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {tabs.map(({ label, path, icon: NavIcon, exact }) => {
          const isActive = exact
            ? location.pathname === path
            : location.pathname.startsWith(path);
          return (
            <Link
              key={path}
              to={path}
              className="flex min-w-[4.5rem] flex-col items-center gap-0.5 px-3 py-1"
            >
              <NavIcon
                className={`h-6 w-6 transition-colors ${isActive ? 'text-forest-canopy' : 'text-rain-cloud/35'}`}
                strokeWidth={isActive ? 2 : 1.5}
              />
              <span className={`font-inter text-xs ${isActive ? 'font-medium text-forest-canopy' : 'text-rain-cloud/35'}`}>
                {label}
              </span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={onCartOpen}
          className="relative flex min-w-[4.5rem] flex-col items-center gap-0.5 px-3 py-1"
          aria-label="Open cart"
        >
          <div className="relative">
            <ShoppingBag className="h-6 w-6 text-rain-cloud/35" strokeWidth={1.5} />
            {totalItems > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-wet-earth font-inter text-[10px] text-white">
                {totalItems > 9 ? '9+' : totalItems}
              </span>
            )}
          </div>
          <span className="font-inter text-xs text-rain-cloud/35">Cart</span>
        </button>
      </div>
    </nav>
  );
}
