import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import SideDrawerNav from './SideDrawerNav';
import SmartSearchSheet from './search/SmartSearchSheet';
import CartDrawer from './CartDrawer';
import FloatingCart from './FloatingCart';
import HeroTopBar from './home/HeroTopBar';
import FooterSection from './home/FooterSection';
import PageTransition from './PageTransition';
export default function AppLayout() {
  const [navOpen, setNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const location = useLocation();

  const noFooterRoutes = ['/checkout'];
  const showFooter = !noFooterRoutes.some((path) => location.pathname.startsWith(path));
  const noFloatingCartRoutes = ['/login', '/register', '/checkout', '/profile', '/contact'];
  const showFloatingCart = !noFloatingCartRoutes.some((path) => location.pathname.startsWith(path));
  const contentTopPadding = location.pathname === '/'
    ? 'pt-[var(--yasvik-content-top-no-nav,4.75rem)] md:pt-[5.25rem]'
    : 'pt-[var(--yasvik-content-top,5.5rem)]';

  return (
    <div className="min-h-screen bg-warm-cream text-deep-forest transition-colors duration-300">
      <HeroTopBar
        onMenuOpen={() => setNavOpen(true)}
        onCartOpen={() => setCartOpen(true)}
        onSearchOpen={() => setSearchOpen(true)}
      />
      <div className={contentTopPadding}>
        <AnimatePresence mode="wait">
          <PageTransition key={location.pathname}>
            <Outlet context={{ openCart: () => setCartOpen(true), openSearch: () => setSearchOpen(true), openMenu: () => setNavOpen(true) }} />
          </PageTransition>
        </AnimatePresence>
      </div>

      {showFooter && <FooterSection />}

      <SideDrawerNav
        open={navOpen}
        onClose={() => setNavOpen(false)}
        onSearchOpen={() => setSearchOpen(true)}
        onCartOpen={() => setCartOpen(true)}
      />

      {showFloatingCart && (
        <div className="md:hidden">
          <FloatingCart onOpen={() => setCartOpen(true)} />
        </div>
      )}
      <SmartSearchSheet open={searchOpen} onClose={() => setSearchOpen(false)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
