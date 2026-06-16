import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Store, Compass, User, Home as HomeIcon, Mail } from 'lucide-react';

const TAB_ITEMS = [
  { path: '/',         icon: HomeIcon, label: 'Home'     },
  { path: '/shop',     icon: Store,    label: 'Shop'     },
  { path: '/our-roots', icon: Compass,  label: 'Our Roots' },
  { path: '/contact',  icon: Mail, label: 'Contact'  },
  { path: '/profile',  icon: User,     label: 'Profile'  },
];

export default function BottomTabBar({ onSearchClick: _s, onCartOpen: _c }) {
  const location = useLocation();
  const [hidden, setHidden] = useState(false);

  // Only hide on non-shop pages (shop manages its own scroll container)
  const isShop = location.pathname.startsWith('/shop');

  useEffect(() => {
    if (isShop) { setHidden(false); return; }
    let lastY = 0;
    const onScroll = () => {
      const y = window.scrollY;
      if (y > lastY + 8) setHidden(true);
      else if (y < lastY - 8) setHidden(false);
      lastY = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isShop]);

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    if (path === '/shop') return location.pathname.startsWith('/shop') || location.pathname.startsWith('/product');
    if (path === '/our-roots') return location.pathname.startsWith('/our-roots');
    if (path === '/contact') return location.pathname.startsWith('/contact');
    if (path === '/profile') return location.pathname.startsWith('/profile');
    return false;
  };

  const handleTab = (_path, _e) => {};

  return (
    <AnimatePresence>
      {!hidden && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          exit={{ y: 100 }}
          transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
          className="fixed bottom-0 left-0 right-0 z-40 pb-[env(safe-area-inset-bottom)]"
        >
          {/* Glassmorphism bar */}
          <div className="mx-3 mb-3 rounded-2xl bg-rain-cloud/90 backdrop-blur-xl border border-white/10 shadow-2xl shadow-rain-cloud/30">
            <div className="flex items-center justify-around h-[3.6rem]">
              {TAB_ITEMS.map(item => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={(e) => handleTab(item.path, e)}
                    className="relative flex flex-col items-center justify-center w-16 h-full group"
                  >
                    {active && (
                      <motion.div
                        layoutId="tabActivePill"
                        className="absolute inset-x-1 inset-y-1.5 rounded-xl bg-white/12"
                        transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                      />
                    )}
                    <div className="relative z-10">
                      <Icon
                        className={`transition-all duration-200 ${
                          active ? 'text-white' : 'text-white/35 group-hover:text-white/55'
                        }`}
                        style={{ width: '1.1rem', height: '1.1rem' }}
                        strokeWidth={active ? 2.2 : 1.5}
                      />
                    </div>
                    <span className={`text-[8px] font-inter mt-1 tracking-wide transition-all duration-200 relative z-10 ${
                      active ? 'text-white font-medium' : 'text-white/30'
                    }`}>
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
