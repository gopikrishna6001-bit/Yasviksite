import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Grid3X3, Heart, Search, ShoppingBag, Sparkles, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCart } from '@/lib/CartContext';
import { useAuth } from '@/lib/AuthContext';
import YasvikLogo from '@/components/brand/YasvikLogo';
import { fetchAllAppSettings, resolveSetting, SETTINGS_QUERY_KEYS } from '@/services/settingsService';
import { categories as categoriesApi } from '@/services/api';

function HeaderBrandMark({ className = '' }) {
  return (
    <Link to="/" className={`flex items-center gap-2.5 text-white ${className}`} aria-label="Yasvik Home">
      <YasvikLogo
        variant="symbol"
        tone="light"
        imageClassName="h-8 w-auto brightness-0 invert md:h-9"
        className="shrink-0"
      />
      <span className="flex flex-col leading-none">
        <span className="font-cormorant text-[31px] font-semibold tracking-[0.09em] md:text-[30px]">Yasvik</span>
        <span className="-mt-0.5 hidden font-inter text-[8px] font-bold uppercase tracking-[0.24em] text-white/70 sm:block">Natural Foods & Essentials</span>
      </span>
    </Link>
  );
}

function normalizeAnnouncementHref(value = '') {
  const href = String(value || '').trim();
  if (!href) return '';
  if (href.startsWith('#')) return `/${href}`;
  if (href.startsWith('/') || href.startsWith('http')) return href;
  return `/${href}`;
}

export default function HeroTopBar({ onMenuOpen, onCartOpen, onSearchOpen, showSearch = true }) {
  const [stripVisible, setStripVisible] = useState(true);
  const [compact, setCompact] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const compactRef = useRef(false);
  const hiddenRef = useRef(false);
  const categoryRef = useRef(null);
  const { totalItems } = useCart();
  const { isAuthenticated } = useAuth();
  const { data: settings = [] } = useQuery({ queryKey: SETTINGS_QUERY_KEYS.announcement, queryFn: fetchAllAppSettings, staleTime: 10 * 60 * 1000 });
  const { data: categories = [] } = useQuery({
    queryKey: ['header-categories'],
    queryFn: () => categoriesApi.listActive(12),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    let rafId = null;
    const onScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        const y = window.scrollY || 0;
        const nextCompact = compactRef.current ? y > 36 : y > 72;
        const hideAfter = Math.max(window.innerHeight * 1.15, 720);
        const nextHidden = y > hideAfter;
        if (nextCompact !== compactRef.current) {
          compactRef.current = nextCompact;
          setCompact(nextCompact);
        }
        if (nextHidden !== hiddenRef.current) {
          hiddenRef.current = nextHidden;
          setHidden(nextHidden);
          if (nextHidden) setCategoryOpen(false);
        }
        rafId = null;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('scroll', onScroll, { passive: true });
    const samplerId = window.setInterval(onScroll, 220);
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('scroll', onScroll);
      window.clearInterval(samplerId);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    if (!categoryOpen) return undefined;
    const onPointerDown = (event) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target)) {
        setCategoryOpen(false);
      }
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [categoryOpen]);

  const announcementEnabled = resolveSetting(settings, 'announcement_enabled', true);
  const announcementMode = String(resolveSetting(settings, 'announcement_mode', 'ticker')).toLowerCase() === 'promo' ? 'promo' : 'ticker';
  const announcementRaw = String(resolveSetting(settings, 'announcement_items', 'Midseason pantry offers | Traditional foods | Fair prices | Trusted quality'));
  const announcementItems = announcementRaw.split('|').map((s) => s.trim()).filter(Boolean);
  const announcementSpeed = Number(resolveSetting(settings, 'announcement_speed_seconds', 34)) || 34;
  const tickerText = announcementItems.length > 0 ? announcementItems.join('  ✤  ') : 'Traditional Foods';
  const announcementCtaLabel = String(resolveSetting(settings, 'announcement_cta_label', '') || '').trim();
  const announcementCtaUrl = normalizeAnnouncementHref(resolveSetting(settings, 'announcement_cta_url', ''));
  const announcementCtaExternal = /^https?:\/\//i.test(announcementCtaUrl);
  const shouldShowStrip = announcementEnabled && stripVisible;
  const accountHref = isAuthenticated ? '/profile' : '/login?next=/profile';
  const accountLabel = isAuthenticated ? 'Profile' : 'Sign in or create account';
  const headerHeightClass = showSearch
    ? (compact ? 'h-[94px] md:h-[68px]' : 'h-[100px] md:h-[76px]')
    : (compact ? 'h-[58px] md:h-[68px]' : 'h-[64px] md:h-[76px]');

  useEffect(() => {
    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
    document.documentElement.dataset.yasvikHeaderCompact = compact ? '1' : '0';
    document.documentElement.dataset.yasvikHeaderHidden = hidden ? '1' : '0';
    window.dispatchEvent(new CustomEvent('yasvik-header-compact', { detail: { compact, hidden } }));
    const stripPx = shouldShowStrip ? (isDesktop ? 30 : 34) : 0;
    const headerPx = isDesktop ? (compact ? 68 : 76) : showSearch ? (compact ? 94 : 100) : (compact ? 58 : 64);
    const navPx = isDesktop ? (compact ? 0 : 50) : 0;
    const breathingPx = isDesktop ? 10 : 24;
    document.documentElement.style.setProperty('--yasvik-nav-top', `${stripPx + headerPx}px`);
    document.documentElement.style.setProperty('--yasvik-content-top', `${stripPx + headerPx + navPx + breathingPx}px`);
    document.documentElement.style.setProperty('--yasvik-content-top-no-nav', `${stripPx + headerPx + breathingPx}px`);
  }, [compact, hidden, shouldShowStrip, showSearch]);

  const closeAnnouncement = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setStripVisible(false);
  };

  return (
    <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: hidden ? '-108%' : 0, opacity: hidden ? 0 : 1 }} transition={{ duration: hidden ? 0.22 : 0.28, ease: [0.23, 1, 0.32, 1] }} className="fixed left-0 right-0 top-0 z-40 bg-[var(--theme-header)] text-[var(--theme-header-text)] shadow-[0_10px_30px_rgba(26,58,16,.16)] transition-colors duration-300">
      {shouldShowStrip && (
        <div className="relative flex h-[34px] items-center border-b border-white/10 bg-[color-mix(in_srgb,var(--theme-header)_82%,black_18%)] md:h-[30px]">
          <div className="hidden w-1/4 pl-8 font-inter text-[11px] font-semibold text-white/75 md:block">IN / EN</div>
          <div className="min-w-0 flex-1 overflow-hidden px-3 text-center">
            {announcementMode === 'promo' ? (
              <div className="flex h-full min-w-0 items-center justify-center gap-3">
                <span className="truncate font-inter text-[12px] font-semibold tracking-wide text-white md:text-[13px]">{announcementItems[0] || tickerText}</span>
                {announcementCtaLabel && announcementCtaUrl ? (
                  announcementCtaExternal ? (
                    <a href={announcementCtaUrl} target="_blank" rel="noreferrer" className="hidden rounded-full bg-[var(--action-primary)] px-3 py-1 font-inter text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--action-text)] shadow-sm sm:inline-flex">{announcementCtaLabel}</a>
                  ) : (
                    <Link to={announcementCtaUrl} className="hidden rounded-full bg-[var(--action-primary)] px-3 py-1 font-inter text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--action-text)] shadow-sm sm:inline-flex">{announcementCtaLabel}</Link>
                  )
                ) : null}
              </div>
            ) : (
              <motion.div initial={{ x: '100%' }} animate={{ x: '-100%' }} transition={{ duration: announcementSpeed, ease: 'linear', repeat: Infinity }} className="whitespace-nowrap font-inter text-[12px] font-semibold tracking-wide text-white md:text-[13px]">{tickerText}</motion.div>
            )}
          </div>
          <div className="hidden w-1/4 justify-end pr-16 font-inter text-[11px] font-semibold text-white/75 md:flex">Need help? hello@yasvik.com</div>
          <button type="button" onClick={closeAnnouncement} onPointerDown={closeAnnouncement} aria-label="Close announcement" className="relative z-50 h-full w-10 flex-shrink-0 border-l border-white/12 text-xl text-white/80 hover:bg-white/10 hover:text-white active:bg-white/15">×</button>
        </div>
      )}

      <div className={`relative flex flex-col gap-2 border-b border-white/10 px-4 py-2 transition-all md:flex-row md:items-center md:px-8 md:py-0 ${headerHeightClass}`}>
        <div className="flex min-w-0 items-center justify-between gap-2 md:flex-1 md:justify-start">
          <button
            type="button"
            onClick={onMenuOpen}
            aria-label="Open menu"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-white/8 text-white transition-colors hover:bg-white/14 active:scale-95"
          >
            <span className="sr-only">Open menu</span>
            <span className="flex flex-col gap-[4px]">
              <span className="block h-[2px] w-5 rounded-full bg-white" />
              <span className="block h-[2px] w-4 rounded-full bg-white" />
              <span className="block h-[2px] w-5 rounded-full bg-white" />
            </span>
          </button>
          <HeaderBrandMark className="md:hidden" />
          <div className="flex items-center gap-2 md:hidden">
            <Link to={accountHref} aria-label={accountLabel} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-white/8 text-white transition-colors hover:bg-white/14"><User className="h-[18px] w-[18px]" /></Link>
            <button onClick={onCartOpen} aria-label="Open cart" className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-white/8 text-white transition-colors hover:bg-white/14">
              <ShoppingBag className="h-[18px] w-[18px]" />
              {totalItems > 0 && <motion.span key={totalItems} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#C76A2B] px-1 font-inter text-[10px] font-bold text-white">{totalItems > 99 ? '99+' : totalItems}</motion.span>}
            </button>
          </div>
          <HeaderBrandMark className="hidden md:flex" />
        </div>

        {showSearch && (
          <div ref={categoryRef} className="relative flex min-w-0 flex-1 items-center gap-2 md:max-w-[42rem]">
            <div className="flex h-11 min-w-0 flex-1 items-center overflow-hidden rounded-full bg-[var(--bg-card)] text-left font-inter text-[var(--text-main)] shadow-[0_9px_22px_rgba(0,0,0,.13)] ring-1 ring-white/70 md:h-[46px]">
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setCategoryOpen((value) => !value);
                }}
                aria-expanded={categoryOpen}
                aria-haspopup="menu"
                className="flex h-full shrink-0 items-center gap-1.5 border-r border-[var(--theme-border)] px-3 text-[13px] font-semibold text-[var(--text-main)] transition-colors hover:bg-[color-mix(in_srgb,var(--action-primary)_12%,var(--bg-card))] sm:gap-2 sm:px-4 sm:text-[14px] md:px-5 md:text-[14px]"
              >
                <Grid3X3 className="h-[17px] w-[17px]" />
                <span>Categories</span>
                <ChevronDown className="h-3.5 w-3.5 text-[var(--theme-muted)]" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setCategoryOpen(false);
                  onSearchOpen?.();
                }}
                className="flex h-full min-w-0 flex-1 items-center justify-between pl-3 pr-1.5 text-left transition-colors hover:bg-[var(--bg-canvas)] sm:pl-4"
              >
                <span className="min-w-0 truncate text-[13px] text-[var(--theme-muted)] md:text-[14px]">What are you looking for?</span>
                <span className="ml-2 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--action-primary)] text-[var(--action-text)] md:h-9 md:w-9"><Search className="h-[17px] w-[17px]" strokeWidth={2.2} /></span>
              </button>
            </div>
            <AnimatePresence>
              {categoryOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                className="absolute left-0 right-0 top-[calc(100%+0.65rem)] z-50 overflow-hidden rounded-[1.6rem] border border-[var(--theme-border)] bg-[var(--bg-card)] text-[var(--text-main)] shadow-[0_24px_54px_rgba(0,0,0,.2)] md:left-0 md:right-auto md:w-[26rem]"
              >
                <Link to="/shop" onClick={() => setCategoryOpen(false)} className="flex items-center justify-between border-b border-[var(--theme-border)] px-5 py-4 font-inter text-[15px] font-bold hover:bg-[color-mix(in_srgb,var(--action-primary)_12%,var(--bg-card))]">
                  All collections
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#D9D0B0]">›</span>
                </Link>
                <div className="grid max-h-[58vh] grid-cols-1 overflow-y-auto p-2 md:grid-cols-2">
                  {categories.map((category) => (
                    <Link
                      key={category.id}
                      to={`/shop?category=${category.id}`}
                      onClick={() => setCategoryOpen(false)}
                      className="rounded-2xl px-4 py-3 font-inter text-[14px] font-semibold text-[var(--text-main)] transition-colors hover:bg-[color-mix(in_srgb,var(--action-primary)_12%,var(--bg-card))]"
                    >
                      {category.emotional_title || category.name}
                    </Link>
                  ))}
                </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <div className="hidden flex-1 items-center justify-end gap-3 md:flex">
          <Link to="/shop" className="inline-flex h-10 items-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 font-inter text-[12px] font-bold text-white transition-colors hover:bg-white/14"><Sparkles className="h-4 w-4" />Best Deals</Link>
          <Link to="/shop" className="inline-flex h-10 items-center rounded-full border border-white/12 bg-white/8 px-4 font-inter text-[12px] font-bold text-white transition-colors hover:bg-white/14">Sale 30% off</Link>
          <Link to="/wishlist" aria-label="Wishlist" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/14 bg-white/8 text-white transition-colors hover:bg-white/14"><Heart className="h-4 w-4" /></Link>
          <Link to={accountHref} aria-label={accountLabel} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/14 bg-white/8 text-white transition-colors hover:bg-white/14"><User className="h-4 w-4" /></Link>
          <button onClick={onCartOpen} aria-label="Open cart" className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/14 bg-white/8 text-white transition-colors hover:bg-white/14">
            <ShoppingBag className="h-4 w-4" />
            {totalItems > 0 && <motion.span key={totalItems} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#C76A2B] px-1 font-inter text-[10px] font-bold text-white">{totalItems > 99 ? '99+' : totalItems}</motion.span>}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
