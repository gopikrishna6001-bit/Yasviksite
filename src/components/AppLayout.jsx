import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import SideDrawerNav from './SideDrawerNav';
import SmartSearchSheet from './search/SmartSearchSheet';
import CartDrawer from './CartDrawer';
import FloatingCart from './FloatingCart';
import HeroTopBar from './home/HeroTopBar';
import PageTransition from './PageTransition';
import PrimaryNavRow from './PrimaryNavRow';

export default function AppLayout() {
  const [navOpen, setNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const location = useLocation();

  const hidePrimaryNav =
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/login') ||
    location.pathname.startsWith('/register') ||
    location.pathname.startsWith('/checkout') ||
    location.pathname.startsWith('/profile');
  const showPrimaryNav = !hidePrimaryNav;
  const showGlobalSearch =
    location.pathname === '/' ||
    location.pathname.startsWith('/product/') ||
    location.pathname === '/our-roots';
  const contentTopPadding = showPrimaryNav
    ? 'pt-[var(--yasvik-content-top,4.75rem)]'
    : 'pt-[var(--yasvik-content-top-no-nav,4.75rem)]';

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-main)] transition-colors duration-300">
      {/* Stable top bar */}
      <HeroTopBar
        onMenuOpen={() => setNavOpen(true)}
        onCartOpen={() => setCartOpen(true)}
        onSearchOpen={() => setSearchOpen(true)}
        showSearch={showGlobalSearch}
      />
      {showPrimaryNav && <PrimaryNavRow />}

      {/* Page content with cinematic transitions */}
      <div className={contentTopPadding}>
        <AnimatePresence mode="wait">
          <PageTransition key={location.pathname}>
            <Outlet context={{ openCart: () => setCartOpen(true), openSearch: () => setSearchOpen(true), openMenu: () => setNavOpen(true) }} />
          </PageTransition>
        </AnimatePresence>
      </div>

      <SideDrawerNav
        open={navOpen}
        onClose={() => setNavOpen(false)}
        onSearchOpen={() => setSearchOpen(true)}
        onCartOpen={() => setCartOpen(true)}
      />

      <div className="md:hidden">
        <FloatingCart onOpen={() => setCartOpen(true)} />
      </div>
      <SmartSearchSheet open={searchOpen} onClose={() => setSearchOpen(false)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
