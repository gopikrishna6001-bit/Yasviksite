import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, LockKeyhole, PackageSearch, User, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import YasvikLogo from '@/components/brand/YasvikLogo';
import { getCategoryDisplayName, getCategoryShopHref } from '@/lib/categoryDisplay';
import { useStorefrontCategories } from '@/hooks/useStorefrontCategories';
import { pageSettings as pageSettingsApi } from '@/services/api';
import { useAuth } from '@/lib/AuthContext';
import { getDrawerNavSections } from '@/config/publicNavigation';

const drawerVariants = {
  hidden: { x: '-100%' },
  visible: { x: 0, transition: { type: 'spring', damping: 34, stiffness: 320 } },
  exit: { x: '-100%', transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } },
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

function isActivePath(pathname, path) {
  const base = String(path || '').split('?')[0].split('#')[0];
  if (base === '/') return pathname === '/';
  return pathname === base || pathname.startsWith(`${base}/`);
}

function DrawerRow({ to, label, onClose, active = false, className = '' }) {
  return (
    <Link
      to={to}
      onClick={onClose}
      className={`flex min-h-[3rem] items-center border-b border-soft-border/70 px-5 font-inter text-[15px] font-semibold transition-colors ${
        active
          ? 'bg-deep-forest/[0.06] text-deep-forest'
          : 'text-deep-forest/85 hover:bg-deep-forest/[0.04]'
      } ${className}`}
    >
      {label}
    </Link>
  );
}

function AccountRow({ item, onClose }) {
  const icons = {
    profile: User,
    orders: PackageSearch,
    login: LockKeyhole,
  };
  const Icon = icons[item.key] || User;

  return (
    <Link
      to={item.path}
      onClick={onClose}
      className="flex min-h-[3rem] items-center gap-3 border-b border-soft-border/70 px-5 font-inter text-sm font-semibold text-deep-forest/80 transition-colors hover:bg-deep-forest/[0.04]"
    >
      <Icon className="h-4 w-4 text-deep-forest/55" strokeWidth={1.7} aria-hidden="true" />
      {item.label}
    </Link>
  );
}

export default function SideDrawerNav({ open, onClose }) {
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation();
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const { data: categories = [] } = useStorefrontCategories();

  const { data: pageSettings = [] } = useQuery({
    queryKey: ['drawer-page-settings'],
    queryFn: pageSettingsApi.list,
    staleTime: 5 * 60 * 1000,
  });

  const { primary, shopExtras, account, legal } = getDrawerNavSections({
    pageSettings,
    isAuthenticated,
  });

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-50 bg-deep-forest/30 backdrop-blur-[1px] md:bg-deep-forest/25"
            onClick={onClose}
          />

          <motion.nav
            key="drawer"
            variants={drawerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            aria-label="Yasvik site menu"
            className="fixed inset-y-0 left-0 z-[60] flex w-[min(86vw,20rem)] flex-col overflow-hidden border-r border-soft-border bg-white text-deep-forest shadow-[8px_0_32px_rgba(31,61,43,0.12)]"
          >
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-soft-border px-4">
              <Link to="/" onClick={onClose} aria-label="Yasvik Home" className="inline-flex">
                <YasvikLogo variant="horizontal" imageClassName="h-8 w-auto" />
              </Link>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-deep-forest transition-colors hover:bg-deep-forest/5 active:scale-95"
              >
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="py-1">
                {primary.map((item) => (
                  <DrawerRow
                    key={item.key}
                    to={item.path}
                    label={item.label}
                    onClose={onClose}
                    active={isActivePath(pathname, item.path)}
                  />
                ))}
              </div>

              <div className="border-t border-soft-border/80">
                <button
                  type="button"
                  onClick={() => setCategoriesOpen((value) => !value)}
                  aria-expanded={categoriesOpen}
                  className="flex min-h-[3rem] w-full items-center justify-between px-5 font-inter text-sm font-semibold text-deep-forest/80 transition-colors hover:bg-deep-forest/[0.04]"
                >
                  Browse categories
                  <ChevronDown
                    className={`h-4 w-4 text-deep-forest/45 transition-transform duration-200 ${categoriesOpen ? 'rotate-180' : ''}`}
                    strokeWidth={1.75}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {categoriesOpen && (
                    <motion.div
                      key="drawer-categories"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden border-b border-soft-border/70 bg-warm-cream/50"
                    >
                      <div className="grid grid-cols-1 gap-1.5 px-4 py-3">
                        {categories.map((category) => (
                          <Link
                            key={category.id}
                            to={getCategoryShopHref(category)}
                            onClick={onClose}
                            className="rounded-xl border border-soft-border/80 bg-white px-3 py-2.5 font-inter text-[13px] font-medium leading-snug text-deep-forest/85 transition-colors hover:border-neon-paddy/30"
                          >
                            {getCategoryDisplayName(category)}
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {shopExtras.map((item) => (
                  <DrawerRow
                    key={item.key}
                    to={item.path}
                    label={item.label}
                    onClose={onClose}
                    active={isActivePath(pathname, item.path)}
                    className="text-sm font-medium text-deep-forest/75"
                  />
                ))}
              </div>

              {account.length > 0 ? (
                <div className="border-t border-soft-border/80">
                  <p className="px-5 pb-1 pt-4 font-inter text-[10px] font-bold uppercase tracking-[0.16em] text-deep-forest/40">
                    Account
                  </p>
                  {account.map((item) => (
                    <AccountRow key={item.key} item={item} onClose={onClose} />
                  ))}
                </div>
              ) : null}
            </div>

            {legal.length > 0 ? (
              <div className="shrink-0 border-t border-soft-border px-5 py-4">
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {legal.map((item) => (
                    <Link
                      key={item.key}
                      to={item.path}
                      onClick={onClose}
                      className="font-inter text-xs font-medium text-deep-forest/55 transition-colors hover:text-deep-forest"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </motion.nav>
        </>
      )}
    </AnimatePresence>
  );
}
