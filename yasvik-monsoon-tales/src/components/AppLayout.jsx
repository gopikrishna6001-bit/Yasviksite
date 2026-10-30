import { useState, useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import SideDrawerNav from './SideDrawerNav';
import SmartSearchSheet from './search/SmartSearchSheet';
import CartDrawer from './CartDrawer';
import FloatingCart from './FloatingCart';
import PageTransition from './PageTransition';
import SiteHeader from './layout/SiteHeader';
import SiteFooter from './layout/SiteFooter';
import MobileCartCheckoutBar from './commerce/MobileCartCheckoutBar';
import BottomNav from './BottomNav';
import { useCart } from '@/lib/CartContext';
import { useStoreOffline } from '@/hooks/useStoreOffline';
import { resolveMobileChrome } from '@/lib/mobileChrome';

export default function AppLayout() {
  const [navOpen, setNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const location = useLocation();
  const { totalItems } = useCart();
  const { enabled: storeOffline } = useStoreOffline();

  const chrome = useMemo(
    () => resolveMobileChrome({
      pathname: location.pathname,
      totalItems,
      storeOffline,
    }),
    [location.pathname, totalItems, storeOffline],
  );

  const openCart = () => {
    setNavOpen(false);
    setCartOpen(true);
  };
  const openSearch = () => {
    setNavOpen(false);
    setSearchOpen(true);
  };
  const openMenu = () => setNavOpen(true);

  const noFooterRoutes = ['/checkout'];
  const showFooter = !noFooterRoutes.some((path) => location.pathname.startsWith(path));
  const noFloatingCartRoutes = ['/login', '/register', '/checkout', '/profile', '/contact'];
  const showFloatingCart = !noFloatingCartRoutes.some((path) => location.pathname.startsWith(path));

  return (
    <div
      className="flex min-h-screen flex-col bg-warm-cream text-deep-forest"
      style={{ '--yasvik-mobile-bottom-inset': chrome.bottomInset }}
    >
      <SiteHeader onMenuOpen={openMenu} onCartOpen={openCart} onSearchOpen={openSearch} />

      <main
        className="flex-1 pt-[var(--yasvik-site-header-h,5.75rem)] pb-[var(--yasvik-mobile-bottom-inset,0px)] md:pb-0"
      >
        <AnimatePresence mode="wait">
          <PageTransition key={location.pathname}>
            <Outlet context={{ openCart, openSearch, openMenu }} />
          </PageTransition>
        </AnimatePresence>
      </main>

      {showFooter && <SiteFooter />}

      <SideDrawerNav open={navOpen} onClose={() => setNavOpen(false)} />

      {showFloatingCart && (
        <div className="hidden md:block">
          <FloatingCart onOpen={openCart} />
        </div>
      )}
      {showFloatingCart && !chrome.isProductPage && chrome.showCartCheckoutBar && (
        <MobileCartCheckoutBar onOpenCart={openCart} />
      )}
      <SmartSearchSheet open={searchOpen} onClose={() => setSearchOpen(false)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      {chrome.showBottomNav && (
        <div className="md:hidden">
          <BottomNav onCartOpen={openCart} />
        </div>
      )}
    </div>
  );
}
