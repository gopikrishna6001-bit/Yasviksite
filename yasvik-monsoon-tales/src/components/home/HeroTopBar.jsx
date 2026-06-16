import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, MessageCircle, Search, ShoppingBag, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useCart } from '@/lib/CartContext';
import { useAuth } from '@/lib/AuthContext';
import YasvikLogo from '@/components/brand/YasvikLogo';
import { fetchAllAppSettings, resolveSettingsMap, SETTINGS_QUERY_KEYS } from '@/services/settingsService';

const NAV_LINKS = [
  { label: 'Shop', path: '/shop' },
  { label: 'Our Roots', path: '/our-roots' },
  { label: 'Producers', path: '/producers' },
  { label: 'Recipes', path: '/recipes' },
];

function normalizePhone(value = '') {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '917842938998';
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

function clampNumber(value, fallback, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
  return Math.min(Math.max(numeric, min), max);
}

function IconButton({ as: Component = 'button', children, className = '', ...props }) {
  return (
    <Component
      className={`inline-flex h-11 w-11 items-center justify-center rounded-full border border-deep-forest/12 bg-white/85 text-deep-forest shadow-[0_10px_28px_rgba(31,61,43,0.08)] backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:border-neon-paddy/30 hover:bg-white active:scale-95 ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

export default function HeroTopBar({ onMenuOpen, onCartOpen, onSearchOpen }) {
  const [scrolled, setScrolled] = useState(false);
  const { totalItems } = useCart();
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const { data: settings = [] } = useQuery({
    queryKey: SETTINGS_QUERY_KEYS.public,
    queryFn: fetchAllAppSettings,
    staleTime: 10 * 60 * 1000,
  });

  const settingsMap = useMemo(() => resolveSettingsMap(settings), [settings]);
  const whatsappNumber = normalizePhone(
    settingsMap.whatsapp_number || settingsMap.support_whatsapp_number || settingsMap.contact_whatsapp || settingsMap.footer_whatsapp_number,
  );
  const whatsappHref = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Hi Yasvik, I need help choosing better everyday foods.')}`;
  const isHome = location.pathname === '/';
  const accountHref = isAuthenticated ? '/profile' : '/login?next=/profile';
  const logoScale = clampNumber(settingsMap.brand_logo_header_scale, 1, 0.55, 1.55);
  const desktopLogoWidth = Math.round(clampNumber(clampNumber(settingsMap.brand_logo_header_width_desktop, 230, 140, 340) * logoScale, 230, 140, 320));
  const mobileLogoWidth = Math.round(clampNumber(clampNumber(settingsMap.brand_logo_header_width_mobile, 162, 118, 220) * logoScale, 162, 118, 200));
  const desktopLogoMaxHeight = Math.round(clampNumber(settingsMap.brand_logo_header_max_height_desktop, 50, 30, 68));
  const mobileLogoMaxHeight = Math.round(clampNumber(settingsMap.brand_logo_header_max_height_mobile, 42, 28, 56));

  useEffect(() => {
    let raf = null;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        setScrolled((window.scrollY || 0) > 18);
        raf = null;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    const headerPx = typeof window !== 'undefined' && window.innerWidth >= 768 ? 84 : 76;
    const breathingPx = typeof window !== 'undefined' && window.innerWidth >= 768 ? 18 : 14;
    document.documentElement.style.setProperty('--yasvik-nav-top', `${headerPx}px`);
    document.documentElement.style.setProperty('--yasvik-content-top', `${headerPx + breathingPx}px`);
    document.documentElement.style.setProperty('--yasvik-content-top-no-nav', `${headerPx}px`);
    document.documentElement.dataset.yasvikHeaderCompact = scrolled ? '1' : '0';
    document.documentElement.dataset.yasvikHeaderHidden = '0';
  }, [scrolled]);

  const shellClass = isHome && !scrolled
    ? 'border-transparent bg-warm-cream/80 shadow-none backdrop-blur-md'
    : 'border-soft-border bg-warm-cream/95 shadow-[0_14px_38px_rgba(31,61,43,0.08)] backdrop-blur-xl';

  return (
    <motion.header
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed inset-x-0 top-0 z-40 border-b text-deep-forest transition-all duration-300 ${shellClass}`}
    >
      <div className="mx-auto flex h-[76px] max-w-[1480px] items-center justify-between gap-4 px-4 md:h-[84px] md:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-5">
          <IconButton type="button" onClick={onMenuOpen} aria-label="Open menu" className="md:h-12 md:w-12">
            <Menu className="h-5 w-5 md:h-6 md:w-6" strokeWidth={1.7} />
          </IconButton>

          <Link to="/" aria-label="Yasvik Home" className="hidden shrink-0 items-center md:inline-flex">
            <YasvikLogo
              variant="horizontal"
              imageClassName="h-auto w-auto"
              imageStyle={{ width: `${desktopLogoWidth}px`, maxHeight: `${desktopLogoMaxHeight}px`, objectFit: 'contain' }}
            />
          </Link>
        </div>

        <Link to="/" aria-label="Yasvik Home" className="absolute left-1/2 top-1/2 inline-flex -translate-x-1/2 -translate-y-1/2 items-center md:hidden">
          <YasvikLogo
            variant="horizontal"
            imageClassName="h-auto w-auto"
            imageStyle={{ width: `${mobileLogoWidth}px`, maxHeight: `${mobileLogoMaxHeight}px`, objectFit: 'contain' }}
          />
        </Link>

        <nav aria-label="Primary navigation" className="hidden items-center justify-center gap-2 md:flex">
          {NAV_LINKS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `rounded-full px-4 py-2 font-inter text-[12px] font-bold uppercase tracking-[0.17em] transition-colors ${isActive ? 'bg-deep-forest text-warm-cream' : 'text-deep-forest/72 hover:bg-deep-forest/7 hover:text-deep-forest'}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 md:gap-3">
          {onSearchOpen && (
            <IconButton type="button" onClick={onSearchOpen} aria-label="Search Yasvik" className="hidden md:inline-flex">
              <Search className="h-5 w-5" strokeWidth={1.7} />
            </IconButton>
          )}
          <IconButton
            as="a"
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            aria-label="Order on WhatsApp"
            className="inline-flex text-neon-paddy lg:hidden"
          >
            <MessageCircle className="h-5 w-5" strokeWidth={1.7} />
          </IconButton>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="hidden h-11 items-center gap-2 rounded-full border border-neon-paddy/20 bg-white/80 px-4 font-inter text-[12px] font-bold uppercase tracking-[0.14em] text-neon-paddy shadow-[0_10px_28px_rgba(31,61,43,0.06)] transition-all hover:-translate-y-0.5 hover:bg-white lg:inline-flex"
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
          <IconButton as={Link} to={accountHref} aria-label={isAuthenticated ? 'Profile' : 'Login or sign up'}>
            <User className="h-5 w-5" strokeWidth={1.7} />
          </IconButton>
          <IconButton type="button" onClick={onCartOpen} aria-label="Open cart" className="relative">
            <ShoppingBag className="h-5 w-5" strokeWidth={1.7} />
            {totalItems > 0 && (
              <motion.span
                key={totalItems}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-sun-dried-clay px-1 font-inter text-[10px] font-bold text-warm-cream"
              >
                {totalItems > 99 ? '99+' : totalItems}
              </motion.span>
            )}
          </IconButton>
        </div>
      </div>
    </motion.header>
  );
}
