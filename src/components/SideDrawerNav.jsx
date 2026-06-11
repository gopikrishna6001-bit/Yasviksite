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
  hidden: { x: '-100%' },
  visible: { x: 0, transition: { type: 'spring', damping: 34, stiffness: 300 } },
  exit: { x: '-100%', transition: { duration: 0.24, ease: [0.4, 0, 1, 1] } },
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
      className={`group flex items-center justify-between border-b border-[#E4DAB9] font-inter transition-colors hover:bg-[#F7FAF4] ${
        compact ? 'min-h-[3.35rem] px-6 text-[14px] font-semibold text-[#24351F]/72' : 'min-h-[4.55rem] px-6 text-[18px] font-bold text-[#122615]'
      }`}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className={`flex shrink-0 items-center justify-center rounded-full bg-[#EEF5E9] text-[#2D6330] ${compact ? 'h-8 w-8' : 'h-10 w-10'}`}>
          <Icon className={compact ? 'h-3.5 w-3.5' : 'h-[18px] w-[18px]'} strokeWidth={1.9} />
        </span>
        <span className="truncate">{item.label}</span>
      </span>
      {item.emphasis && (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#D7D7CF] text-[#222] transition-transform group-hover:translate-x-0.5">
          <ChevronRight className="h-5 w-5" strokeWidth={1.8} />
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
    queryFn: () => categoriesApi.listActive(12),
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
            className="fixed inset-0 z-50 bg-black/58 backdrop-blur-[2px]"
            onClick={onClose}
          />

          <motion.nav
            key="drawer"
            variants={drawerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            aria-label="Yasvik site menu"
            className="fixed bottom-4 left-4 top-4 z-[60] flex w-[min(86vw,30rem)] flex-col overflow-hidden rounded-[1.6rem] bg-white text-[#122615] shadow-[0_30px_80px_rgba(0,0,0,.32)] md:left-8 md:top-8 md:w-[34rem]"
          >
            <div className="flex h-[5.9rem] shrink-0 items-center gap-5 border-b border-[#D9D0B0] px-5">
              <button
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="flex h-11 w-11 items-center justify-center rounded-full text-[#122615] transition-colors hover:bg-[#F2F2EC] active:scale-95"
              >
                <X className="h-6 w-6" strokeWidth={1.7} />
              </button>
              <YasvikLogo variant="wordmark" imageClassName="h-11 w-auto" className="origin-left" />
            </div>

            <div className="flex-1 overflow-y-auto pb-4">
              {groups.map((group) => {
                const visibleItems = group.key === 'shop' ? group.items.filter((item) => item.key !== 'shop_all') : group.items;

                return (
                  <section key={group.key} aria-labelledby={`drawer-${group.key}`} className="border-b border-[#E9E1C8]/70 last:border-b-0">
                    <h2 id={`drawer-${group.key}`} className="px-6 pb-2 pt-5 font-inter text-[11px] font-black uppercase tracking-[0.2em] text-[#6C7B62]">
                      {group.label}
                    </h2>

                    {group.key === 'shop' && (
                      <div className="border-b border-[#E4DAB9]">
                        <button
                          type="button"
                          onClick={() => setCategoriesOpen((value) => !value)}
                          aria-expanded={categoriesOpen}
                          className="flex min-h-[4.55rem] w-full items-center justify-between px-6 text-left font-inter text-[18px] font-bold text-[#122615] transition-colors hover:bg-[#F7FAF4]"
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EEF5E9] text-[#2D6330]">
                              <Grid3X3 className="h-[18px] w-[18px]" strokeWidth={1.9} />
                            </span>
                            <span className="truncate">All Categories</span>
                          </span>
                          <ChevronDown className={`h-5 w-5 shrink-0 transition-transform duration-200 ${categoriesOpen ? 'rotate-180' : ''}`} strokeWidth={1.8} />
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
                                <Link
                                  to="/shop"
                                  onClick={onClose}
                                  className="flex min-h-[3.2rem] items-center justify-between rounded-2xl border border-[#D7E8C8] bg-[#F3F8ED] px-4 font-inter text-[13px] font-black text-[#173318] transition-colors hover:bg-[#E9F5DE]"
                                >
                                  View all products
                                  <ChevronRight className="h-4 w-4" strokeWidth={1.8} />
                                </Link>
                                {categories.map((category) => (
                                  <Link
                                    key={category.id}
                                    to={`/shop?category=${category.id}`}
                                    onClick={onClose}
                                    className="flex min-h-[3.2rem] items-center rounded-2xl border border-[#E5DFC8] bg-[#FBFAF2] px-4 font-inter text-[13px] font-bold text-[#24351F] transition-colors hover:bg-[#EFF7E7]"
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
