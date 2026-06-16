import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Compass,
  Grid3X3,
  Heart,
  HelpCircle,
  Leaf,
  LockKeyhole,
  PackageSearch,
  ShoppingBag,
  User,
  Users,
  UtensilsCrossed,
  Wheat,
  X,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import YasvikLogo from '@/components/brand/YasvikLogo';
import { categories as categoriesApi, pageSettings as pageSettingsApi } from '@/services/api';
import { useAuth } from '@/lib/AuthContext';
import { groupNavItems, resolveVisibleNavItems } from '@/config/publicNavigation';

const ICONS = {
  shop_all: ShoppingBag,
  wishlist: Heart,
  our_roots: Compass,
  producers: Users,
  people: Users,
  stories: BookOpen,
  recipes: UtensilsCrossed,
  farming_cycle: Wheat,
  profile: User,
  orders: PackageSearch,
  login: LockKeyhole,
  contact: HelpCircle,
  support: HelpCircle,
};

const drawerVariants = {
  hidden: { x: '-104%' },
  visible: { x: 0, transition: { type: 'spring', damping: 35, stiffness: 300 } },
  exit: { x: '-104%', transition: { duration: 0.24, ease: [0.4, 0, 1, 1] } },
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

function DrawerLink({ item, compact = false, onClose }) {
  const Icon = ICONS[item.key] || Leaf;

  return (
    <Link
      to={item.path}
      onClick={onClose}
      className={`group flex items-center justify-between border-b border-[#f5f1e8]/10 font-inter transition-colors hover:bg-[#f5f1e8]/8 ${
        compact ? 'min-h-[3.35rem] px-6 text-[14px] font-semibold text-[#f5f1e8]/68' : 'min-h-[4.35rem] px-6 text-[17px] font-bold text-[#f5f1e8]'
      }`}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className={`flex shrink-0 items-center justify-center rounded-full border border-[#f5f1e8]/10 bg-[#f5f1e8]/7 text-[#d9c88d] ${compact ? 'h-8 w-8' : 'h-10 w-10'}`}>
          <Icon className={compact ? 'h-3.5 w-3.5' : 'h-[18px] w-[18px]'} strokeWidth={1.7} />
        </span>
        <span className="truncate">{item.label}</span>
      </span>
      {item.emphasis && (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#f5f1e8]/12 text-[#f5f1e8]/78 transition-transform group-hover:translate-x-0.5">
          <ChevronRight className="h-5 w-5" strokeWidth={1.7} />
        </span>
      )}
    </Link>
  );
}

export default function SideDrawerNav({ open, onClose }) {
  const { isAuthenticated } = useAuth();
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ['drawer-categories'],
    queryFn: () => categoriesApi.listActive(18),
    staleTime: 5 * 60 * 1000,
  });

  const { data: pageSettings = [] } = useQuery({
    queryKey: ['drawer-page-settings'],
    queryFn: pageSettingsApi.list,
    staleTime: 5 * 60 * 1000,
  });

  const groups = groupNavItems(resolveVisibleNavItems({ pageSettings, isAuthenticated }));

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
            className="fixed inset-0 z-50 bg-[#1a1814]/68 backdrop-blur-[3px]"
            onClick={onClose}
          />

          <motion.nav
            key="drawer"
            variants={drawerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            aria-label="Yasvik site menu"
            className="fixed bottom-3 left-3 top-3 z-[60] flex w-[min(88vw,30rem)] flex-col overflow-hidden rounded-[1.4rem] border border-[#f5f1e8]/12 bg-[#1e1c18] text-[#f5f1e8] shadow-[0_30px_90px_rgba(0,0,0,.42)] md:left-6 md:top-6 md:w-[34rem]"
          >
            <div className="flex h-[5.8rem] shrink-0 items-center gap-5 border-b border-[#f5f1e8]/12 px-5">
              <button
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[#f5f1e8]/12 text-[#f5f1e8] transition-colors hover:bg-[#f5f1e8]/8 active:scale-95"
              >
                <X className="h-5 w-5" strokeWidth={1.7} />
              </button>
              <Link to="/" onClick={onClose} aria-label="Yasvik Home" className="inline-flex rounded-xl bg-[#f5f1e8] px-3 py-2">
                <YasvikLogo variant="horizontal" imageClassName="h-10 w-auto" />
              </Link>
            </div>

            <div className="flex-1 overflow-y-auto pb-4">
              {groups.map((group) => {
                const visibleItems = group.key === 'shop' ? group.items.filter((item) => item.key !== 'shop_all') : group.items;

                return (
                  <section key={group.key} aria-labelledby={`drawer-${group.key}`} className="border-b border-[#f5f1e8]/10 last:border-b-0">
                    <h2 id={`drawer-${group.key}`} className="px-6 pb-2 pt-5 font-inter text-[11px] font-black uppercase tracking-[0.24em] text-[#d9c88d]">
                      {group.label}
                    </h2>

                    {group.key === 'shop' && (
                      <div className="border-b border-[#f5f1e8]/10">
                        <button
                          type="button"
                          onClick={() => setCategoriesOpen((value) => !value)}
                          aria-expanded={categoriesOpen}
                          className="flex min-h-[4.35rem] w-full items-center justify-between px-6 text-left font-inter text-[17px] font-bold text-[#f5f1e8] transition-colors hover:bg-[#f5f1e8]/8"
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#f5f1e8]/10 bg-[#f5f1e8]/7 text-[#d9c88d]">
                              <Grid3X3 className="h-[18px] w-[18px]" strokeWidth={1.7} />
                            </span>
                            <span className="truncate">All Categories</span>
                          </span>
                          <ChevronDown className={`h-5 w-5 shrink-0 transition-transform duration-200 ${categoriesOpen ? 'rotate-180' : ''}`} strokeWidth={1.7} />
                        </button>

                        <AnimatePresence initial={false}>
                          {categoriesOpen && (
                            <motion.div
                              key="drawer-categories"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                              className="overflow-hidden"
                            >
                              <div className="grid grid-cols-1 gap-2 px-5 pb-5 sm:grid-cols-2">
                                {categories.map((category) => (
                                  <Link
                                    key={category.id}
                                    to={`/shop?category=${category.id}`}
                                    onClick={onClose}
                                    className="flex min-h-[3.1rem] items-center rounded-2xl border border-[#f5f1e8]/10 bg-[#f5f1e8]/6 px-4 font-inter text-[13px] font-bold text-[#f5f1e8]/86 transition-colors hover:bg-[#f5f1e8]/12"
                                  >
                                    <span className="line-clamp-2">{category.emotional_title || category.name}</span>
                                  </Link>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {visibleItems.map((item) => (
                      <DrawerLink key={item.key} item={item} compact={group.compact} onClose={onClose} />
                    ))}
                  </section>
                );
              })}
            </div>
          </motion.nav>
        </>
      )}
    </AnimatePresence>
  );
}
