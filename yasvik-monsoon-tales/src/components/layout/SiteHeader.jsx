import { useEffect, useMemo } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, Package, MapPin, Search, ShoppingBag, User, Truck } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useCart } from '@/lib/CartContext';
import { useAuth } from '@/lib/AuthContext';
import YasvikLogo from '@/components/brand/YasvikLogo';
import { STORE_GEOGRAPHY } from '@/brand/monsoonTokens';
import { DELIVERY_OFFER_LINE } from '@/lib/commerceCopy';
import { fetchAllAppSettings, resolveSettingsMap, SETTINGS_QUERY_KEYS } from '@/services/settingsService';

const NAV_LINKS = [
  { label: 'Shop', path: '/shop' },
  { label: 'Our Roots', path: '/our-roots' },
  { label: 'Stories', path: '/stories' },
  { label: 'Contact', path: '/contact' },
];

function clampNumber(value, fallback, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
  return Math.min(Math.max(numeric, min), max);
}

function HeaderIconButton({ as: Component = 'button', children, className = '', ...props }) {
  return (
    <Component
      className={`relative inline-flex h-11 w-11 items-center justify-center rounded-full text-deep-forest transition-colors hover:bg-deep-forest/5 active:scale-95 ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

function syncHeaderHeight() {
  const utilityPx = window.innerWidth >= 768 ? 36 : 0;
  const mainPx = window.innerWidth >= 768 ? 80 : 60;
  const total = utilityPx + mainPx;
  const breathing = window.innerWidth >= 768 ? 8 : 8;
  document.documentElement.style.setProperty('--yasvik-site-header-h', `${total}px`);
  document.documentElement.style.setProperty('--yasvik-nav-top', `${total}px`);
  document.documentElement.style.setProperty('--yasvik-content-top', `${total + breathing}px`);
  document.documentElement.style.setProperty('--yasvik-content-top-no-nav', `${total}px`);
}

export default function SiteHeader({ onMenuOpen, onCartOpen, onSearchOpen }) {
  const { totalItems } = useCart();
  const { isAuthenticated } = useAuth();
  const accountHref = isAuthenticated ? '/profile' : '/login?next=/profile';

  const { data: settings = [] } = useQuery({
    queryKey: SETTINGS_QUERY_KEYS.public,
    queryFn: fetchAllAppSettings,
    staleTime: 10 * 60 * 1000,
  });
  const settingsMap = useMemo(() => resolveSettingsMap(settings), [settings]);
  const logoScale = clampNumber(settingsMap.brand_logo_header_scale, 1, 0.55, 1.35);
  const desktopLogoMaxHeight = Math.round(
    clampNumber(
      clampNumber(settingsMap.brand_logo_header_max_height_desktop, 46, 38, 52) * logoScale,
      46,
      38,
      52,
    ),
  );
  const mobileLogoMaxHeight = Math.round(
    clampNumber(
      clampNumber(settingsMap.brand_logo_header_max_height_mobile, 52, 48, 56) * logoScale,
      52,
      48,
      56,
    ),
  );
  const logoImageStyle = (maxHeightPx, { fixedHeight = false } = {}) => ({
    ...(fixedHeight ? { height: `${maxHeightPx}px` } : { maxHeight: `${maxHeightPx}px` }),
    width: 'auto',
    objectFit: 'contain',
    display: 'block',
  });

  useEffect(() => {
    syncHeaderHeight();
    window.addEventListener('resize', syncHeaderHeight, { passive: true });
    return () => window.removeEventListener('resize', syncHeaderHeight);
  }, []);

  const cartBadge =
    totalItems > 0 ? (
      <motion.span
        key={totalItems}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-neon-paddy px-1 font-inter text-[10px] font-bold text-white"
      >
        {totalItems > 99 ? '99+' : totalItems}
      </motion.span>
    ) : null;

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-white shadow-[0_1px_0_rgba(31,61,43,0.06)]">
      <div className="hidden border-b border-deep-forest/10 bg-deep-forest text-warm-cream md:block">
        <div className="mx-auto grid h-9 max-w-[1400px] grid-cols-[1fr_auto_1fr] items-center px-6 lg:px-8">
          <p className="inline-flex items-center gap-1.5 font-inter text-xs font-medium text-warm-cream/90">
            <MapPin className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            Delivering across {STORE_GEOGRAPHY.city}
          </p>
          <p className="hidden items-center justify-center gap-1.5 font-inter text-xs font-medium text-warm-cream/90 lg:inline-flex">
            <Truck className="h-4 w-4" aria-hidden="true" />
            {DELIVERY_OFFER_LINE}
          </p>
          <div className="flex items-center justify-end gap-5 font-inter text-xs font-medium">
            <Link to="/contact#store" className="inline-flex items-center gap-1 hover:text-neon-paddy">
              Store locator
            </Link>
            <Link to="/profile#orders" className="inline-flex items-center gap-1 hover:text-neon-paddy">
              <Package className="h-4 w-4" aria-hidden="true" />
              Track order
            </Link>
          </div>
        </div>
      </div>

      <div className="border-b border-soft-border/80 bg-white">
        {/* Mobile */}
        <div className="relative mx-auto flex h-[3.75rem] max-w-[1400px] items-center justify-between px-4 md:hidden">
          <HeaderIconButton type="button" onClick={onMenuOpen} aria-label="Open menu">
            <Menu className="h-6 w-6" strokeWidth={1.75} />
          </HeaderIconButton>
          <Link to="/" aria-label="Yasvik Home" className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center">
            <YasvikLogo
              variant="horizontal"
              imageStyle={logoImageStyle(mobileLogoMaxHeight, { fixedHeight: true })}
            />
          </Link>
          <HeaderIconButton type="button" onClick={onSearchOpen} aria-label="Search">
            <Search className="h-6 w-6" strokeWidth={1.75} />
          </HeaderIconButton>
        </div>

        {/* Desktop */}
        <div className="mx-auto hidden h-20 max-w-[1400px] grid-cols-[auto_1fr_auto] items-center gap-4 px-6 md:grid lg:px-8">
          <Link to="/" aria-label="Yasvik Home" className="flex max-h-12 flex-shrink-0 items-center overflow-hidden pr-2">
            <YasvikLogo
              variant="horizontal"
              imageStyle={logoImageStyle(desktopLogoMaxHeight)}
            />
          </Link>

          <nav aria-label="Primary" className="hidden justify-center md:flex">
            <div className="flex items-center gap-0.5">
              {NAV_LINKS.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `rounded-md px-3.5 py-2.5 font-inter text-sm font-bold uppercase tracking-[0.1em] transition-colors ${
                      isActive
                        ? 'text-deep-forest underline decoration-deep-forest decoration-2 underline-offset-4'
                        : 'text-deep-forest/65 hover:text-deep-forest'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </nav>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onSearchOpen}
              className="hidden min-w-[14rem] max-w-[18rem] flex-1 items-center gap-2.5 rounded-full border border-soft-border bg-warm-cream/60 px-4 py-2.5 text-left font-inter text-sm text-deep-forest/45 transition-colors hover:border-deep-forest/20 hover:text-deep-forest/60 lg:flex xl:min-w-[16rem]"
              aria-label="Search products"
            >
              <Search className="h-5 w-5 flex-shrink-0" strokeWidth={1.75} />
              <span className="truncate">Search for products...</span>
            </button>
            <HeaderIconButton type="button" onClick={onSearchOpen} aria-label="Search" className="lg:hidden">
              <Search className="h-6 w-6" strokeWidth={1.75} />
            </HeaderIconButton>
            <Link
              to={accountHref}
              className="hidden items-center gap-2 rounded-full px-3 py-2 font-inter text-sm font-semibold text-deep-forest/75 transition-colors hover:bg-deep-forest/5 xl:inline-flex"
            >
              <User className="h-5 w-5" strokeWidth={1.75} />
              My account
            </Link>
            <HeaderIconButton as={Link} to={accountHref} aria-label="Account" className="xl:hidden">
              <User className="h-6 w-6" strokeWidth={1.75} />
            </HeaderIconButton>
            <button
              type="button"
              onClick={onCartOpen}
              className="relative inline-flex items-center gap-2 rounded-full px-3 py-2 font-inter text-sm font-semibold text-deep-forest/75 transition-colors hover:bg-deep-forest/5"
              aria-label="Open cart"
            >
              <ShoppingBag className="h-5 w-5" strokeWidth={1.75} />
              <span className="hidden xl:inline">My cart</span>
              {cartBadge}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
