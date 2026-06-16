import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { categories as categoriesApi } from '@/services/api';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CategoryArtwork from '@/components/categories/CategoryArtwork';

const PRIMARY_LINKS = [
  { label: 'SHOP', path: '/shop', hasMenu: true },
  { label: 'OUR ROOTS', path: '/our-roots' },
  { label: 'CONTACT', path: '/contact' },
];

export default function PrimaryNavRow() {
  const [openMenu, setOpenMenu] = useState(null);
  const [compact, setCompact] = useState(typeof document !== 'undefined' && document.documentElement.dataset.yasvikHeaderCompact === '1');

  useEffect(() => {
    const onCompactEvent = (event) => setCompact(Boolean(event?.detail?.compact));
    window.addEventListener('yasvik-header-compact', onCompactEvent);
    return () => window.removeEventListener('yasvik-header-compact', onCompactEvent);
  }, []);

  const { data: categories = [] } = useQuery({ queryKey: ['categories-nav'], queryFn: () => categoriesApi.listActive(12), staleTime: 5 * 60 * 1000 });

  return (
    <motion.div
      animate={{ y: compact ? '-110%' : '0%', opacity: compact ? 0 : 1 }}
      transition={{ duration: 0.2 }}
      className="fixed left-0 right-0 z-[35] hidden border-y border-white/10 bg-[color-mix(in_srgb,var(--theme-header)_84%,black_16%)] text-[var(--theme-header-text)] md:block"
      style={{ pointerEvents: compact ? 'none' : 'auto', top: 'var(--yasvik-nav-top,7.25rem)' }}
      onMouseLeave={() => setOpenMenu(null)}
    >
      <nav className="mx-auto flex h-[50px] max-w-[1400px] items-center gap-1 overflow-visible px-8">
        {PRIMARY_LINKS.map((link) => (
          <div key={link.path} className="relative shrink-0" onMouseEnter={() => setOpenMenu(link.hasMenu ? link.path : null)}>
            <NavLink
              to={link.path}
              className={({ isActive }) =>
                `inline-flex h-[50px] items-center gap-2 border-b-2 px-4 font-inter text-[13px] font-bold tracking-wide transition-colors ${isActive ? 'border-white text-white' : 'border-transparent text-white/82 hover:border-white/50 hover:text-white'}`
              }
            >
              {link.label}
              {link.hasMenu && <ChevronDown className="h-4 w-4" />}
            </NavLink>
          </div>
        ))}
      </nav>

      <AnimatePresence>
        {openMenu === '/shop' && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className="absolute left-0 right-0 hidden border-t border-white/10 bg-[var(--bg-card)] text-[var(--text-main)] shadow-[0_18px_44px_rgba(0,0,0,.12)] md:block">
            <div className="pointer-events-none absolute left-0 right-0 top-full h-screen bg-black/25 backdrop-blur-[2px]" />
            <div className="relative mx-auto grid max-w-[1400px] grid-cols-5 gap-6 px-8 py-6">
              <div>
                <p className="mb-2 font-inter text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--theme-muted)]">Shop By</p>
                <Link className="block py-1.5 font-inter text-sm text-[var(--text-main)] hover:text-[var(--action-primary)]" to="/shop">All Products</Link>
                <Link className="block py-1.5 font-inter text-sm text-[var(--text-main)] hover:text-[var(--action-primary)]" to="/shop?category=__bundles__">Bundles</Link>
                <div className="mt-5 rounded-2xl border border-[var(--theme-border)] bg-[var(--bg-canvas)] p-3">
                  <p className="font-syne text-lg font-bold leading-tight text-[var(--text-main)]">Foods sourced through journeys.</p>
                  <p className="mt-1 font-inter text-[11px] leading-relaxed text-[var(--theme-muted)]">Traditional foods, fair prices, trusted quality.</p>
                </div>
              </div>
              <div className="col-span-2">
                <p className="mb-2 font-inter text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--theme-muted)]">Categories</p>
                <div className="grid grid-cols-3 gap-x-8 gap-y-2">
                  {categories.map((cat) => <Link key={cat.id} className="font-inter text-sm text-[var(--text-main)] hover:text-[var(--action-primary)]" to={`/shop?category=${cat.id}`}>{cat.emotional_title || cat.name}</Link>)}
                </div>
              </div>
              <div className="col-span-2">
                <p className="mb-2 font-inter text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--theme-muted)]">Featured Categories</p>
                <div className="grid grid-cols-3 gap-3">
                  {categories.slice(0, 3).map((cat) => (
                    <Link key={`feature-${cat.id}`} to={`/shop?category=${cat.id}`} className="group block overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-[var(--bg-canvas)]">
                      <div className="flex aspect-[4/5] items-center justify-center bg-[color-mix(in_srgb,var(--action-primary)_10%,var(--bg-card))]">
                        {cat.image_url || cat.media_url ? <img src={cat.image_url || cat.media_url} alt={cat.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" loading="lazy" decoding="async" fetchPriority="low" /> : <CategoryArtwork title={cat.emotional_title || cat.name} />}
                      </div>
                      <div className="px-2 py-2"><p className="line-clamp-1 font-inter text-xs font-semibold text-[var(--text-main)]">{cat.emotional_title || cat.name}</p></div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
