import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MessageCircle, Search, X } from 'lucide-react';
import { categories as categoriesApi, products as productsApi } from '@/services/api';
import { appClient } from '@/api/appClient';
import ComboCard from '@/components/products/ComboCard';
import ProductCard from '@/components/products/ProductCard';
import BundleStrip from '@/components/crosssell/BundleStrip';
import { BUNDLES_SHOP_CATEGORY_KEY, sortCombosFeaturedFirst } from '@/lib/comboUtils';
import { fetchAllAppSettings, resolveSettingsMap, SETTINGS_QUERY_KEYS } from '@/services/settingsService';
import PageHeaderBanner from '@/components/brand/atmosphere/PageHeaderBanner';
import StoreOfflineExperience from '@/components/shop/StoreOfflineExperience';
import { useStoreOffline } from '@/hooks/useStoreOffline';
import { sortCatalogProducts } from '@/lib/productSortUtils';
import { YASVIK_WHATSAPP_NUMBER } from '@/lib/storeLocation';

const BUNDLES_KEY = BUNDLES_SHOP_CATEGORY_KEY;
/** Region filter UI disabled for now; logic kept for future use. */
const SHOW_REGION_FILTER = false;
const SHOP_PAGE_SIZE = 24;

function normalizePhone(value = '') {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return YASVIK_WHATSAPP_NUMBER;
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

function getRegionLabel(product) {
  return String(product?.origin_region || product?.region_name || product?.sourcing_location || product?.location_label || '').trim();
}

function getCategoryLabel(category) {
  return String(category?.name || category?.emotional_title || 'Category').trim();
}

function sortProducts(items, sort) {
  const list = [...items];
  if (sort === 'price-low') return list.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
  if (sort === 'price-high') return list.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
  if (sort === 'name') return list.sort((a, b) => String(a.title || a.name || '').localeCompare(String(b.title || b.name || '')));
  return sortCatalogProducts(list);
}

function ProductSkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-[1.35rem] border border-soft-border bg-white">
          <div className="aspect-square animate-pulse bg-warm-cream" />
          <div className="space-y-2 p-3.5">
            <div className="h-4 w-3/4 animate-pulse rounded bg-warm-cream" />
            <div className="h-6 w-1/3 animate-pulse rounded bg-warm-cream" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ShopEmptyState({ title, children }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[1.75rem] border border-soft-border bg-white px-6 py-16 text-center md:py-20">
      <p className="max-w-md font-cormorant text-2xl font-semibold leading-snug text-deep-forest md:text-3xl">{title}</p>
      {children}
    </div>
  );
}

export default function Shop() {
  const [search, setSearch] = useState('');
  const [activeRegion, setActiveRegion] = useState('');
  const [sort, setSort] = useState('latest');
  const [visibleCount, setVisibleCount] = useState(SHOP_PAGE_SIZE);
  const [searchParams, setSearchParams] = useSearchParams();
  const { enabled: storeOffline, message: offlineMessage } = useStoreOffline();

  const activeCategory = searchParams.get('category') || null;
  const showBundles = activeCategory === BUNDLES_KEY;

  const { data: settings = [] } = useQuery({
    queryKey: SETTINGS_QUERY_KEYS.public,
    queryFn: fetchAllAppSettings,
    staleTime: 10 * 60 * 1000,
  });
  const settingsMap = useMemo(() => resolveSettingsMap(settings), [settings]);
  const whatsappNumber = normalizePhone(settingsMap.whatsapp_number || settingsMap.support_whatsapp_number || '');
  const whatsappHref = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Hi Yasvik, I need help choosing products from the shop.')}`;

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.listActive(24),
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: products = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['shop-products', activeCategory],
    queryFn: () =>
      activeCategory && activeCategory !== BUNDLES_KEY
        ? productsApi.listByCategory(activeCategory, 200)
        : productsApi.listPublished('sort_order', 150),
    staleTime: 3 * 60 * 1000,
    enabled: activeCategory !== BUNDLES_KEY,
  });

  const { data: combos = [], isLoading: combosLoading } = useQuery({
    queryKey: ['shop-combos'],
    queryFn: () => appClient.entities.Combo.filter({ is_published: true }, '-created_date', 20),
    staleTime: 5 * 60 * 1000,
  });

  const sortedCombos = useMemo(() => sortCombosFeaturedFirst(combos), [combos]);

  const regions = [...new Set(products.map(getRegionLabel).filter(Boolean))].slice(0, 12);
  const filtered = sortProducts(
    products
      .filter((p) => !SHOW_REGION_FILTER || !activeRegion || getRegionLabel(p) === activeRegion)
      .filter((p) => {
        if (!search.trim()) return true;
        const haystack = `${p.title || p.name || ''} ${p.short_description || ''} ${p.description || ''}`.toLowerCase();
        return haystack.includes(search.toLowerCase());
      }),
    sort,
  );

  useEffect(() => {
    setVisibleCount(SHOP_PAGE_SIZE);
  }, [activeCategory, search, sort, activeRegion]);

  const visibleProducts = filtered.slice(0, visibleCount);
  const hasMoreProducts = visibleCount < filtered.length;

  const activeCategoryLabel = useMemo(() => {
    if (!activeCategory) return null;
    if (activeCategory === BUNDLES_KEY) return 'Bundles';
    return getCategoryLabel(categories.find((cat) => cat.id === activeCategory));
  }, [activeCategory, categories]);

  const hasActiveFilters = Boolean(search.trim() || activeCategory || sort !== 'latest' || (SHOW_REGION_FILTER && activeRegion));

  const setCategory = (categoryId) => {
    const next = new URLSearchParams(searchParams);
    if (!categoryId) next.delete('category');
    else next.set('category', categoryId);
    setSearchParams(next, { replace: true });
  };

  const clearAllFilters = () => {
    setSearch('');
    setSort('latest');
    setActiveRegion('');
    setSearchParams({}, { replace: true });
  };

  const resultCount = showBundles ? sortedCombos.length : filtered.length;

  if (storeOffline) {
    return <StoreOfflineExperience message={offlineMessage} whatsappHref={whatsappHref} />;
  }

  return (
    <div className="min-h-screen bg-warm-cream pb-24 text-deep-forest transition-colors duration-300">
      <PageHeaderBanner page="shop" />
      <section className="mx-auto max-w-[1400px] px-4 pt-6 md:px-8 md:pt-8">
        <div className="rounded-[1.75rem] border border-soft-border bg-white px-5 py-7 shadow-[0_12px_36px_rgba(31,61,43,0.05)] md:px-8 md:py-9">
          <p className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-sun-dried-clay">Shop</p>
          <h1 className="mt-2 font-cormorant text-3xl font-semibold leading-tight text-deep-forest md:text-5xl">
            Everyday essentials for your kitchen
          </h1>
          <p className="mt-3 max-w-2xl font-inter text-sm leading-7 text-deep-forest/70 md:text-base">
            Millets, staples, oils, spices, and pantry items — browse by category or search what you need.
          </p>
        </div>
      </section>

      <section className="sticky top-[var(--yasvik-content-top,8rem)] z-20 border-y border-soft-border bg-warm-cream/95 px-4 py-3 shadow-[0_8px_24px_rgba(31,61,43,0.05)] backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative lg:w-[22rem]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-deep-forest/45" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search staples, oils, spices…"
                className="h-11 w-full rounded-full border border-soft-border bg-white pl-10 pr-10 font-inter text-sm text-deep-forest outline-none transition-colors placeholder:text-deep-forest/45 focus:border-neon-paddy focus:ring-2 focus:ring-neon-paddy/15"
              />
              {search.trim() && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-deep-forest/55 hover:bg-warm-cream hover:text-deep-forest"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex flex-1 gap-2 overflow-x-auto hide-scrollbar">
              <button
                type="button"
                onClick={() => setCategory(null)}
                className={`h-9 flex-shrink-0 rounded-full px-4 font-inter text-xs font-bold transition-colors sm:text-[13px] ${!activeCategory ? 'bg-deep-forest text-warm-cream' : 'border border-soft-border bg-white text-deep-forest/70 hover:border-neon-paddy/35'}`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`h-9 flex-shrink-0 rounded-full px-4 font-inter text-xs font-bold transition-colors sm:text-[13px] ${activeCategory === cat.id ? 'bg-deep-forest text-warm-cream' : 'border border-soft-border bg-white text-deep-forest/70 hover:border-neon-paddy/35'}`}
                >
                  {getCategoryLabel(cat)}
                </button>
              ))}
              {sortedCombos.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCategory(BUNDLES_KEY)}
                  className={`h-9 flex-shrink-0 rounded-full px-4 font-inter text-xs font-bold transition-colors sm:text-[13px] ${activeCategory === BUNDLES_KEY ? 'bg-sun-dried-clay text-warm-cream' : 'border border-soft-border bg-white text-deep-forest/70 hover:border-sun-dried-clay/40'}`}
                >
                  Bundles
                </button>
              )}
            </div>

            <div className="flex gap-2">
              {SHOW_REGION_FILTER && regions.length > 0 && (
                <select
                  value={activeRegion}
                  onChange={(e) => setActiveRegion(e.target.value)}
                  className="h-9 rounded-full border border-soft-border bg-white px-3 font-inter text-xs font-bold text-deep-forest/70 outline-none focus:border-neon-paddy sm:text-[13px]"
                >
                  <option value="">All origin areas</option>
                  {regions.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
              )}
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="h-9 rounded-full border border-soft-border bg-white px-3 font-inter text-xs font-bold text-deep-forest/70 outline-none focus:border-neon-paddy sm:text-[13px]"
              >
                <option value="latest">Latest</option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
                <option value="name">Name</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-soft-border pt-3">
            <p className="font-inter text-sm text-deep-forest/75">
              {isLoading && !showBundles ? (
                'Loading products…'
              ) : (
                <>
                  <span className="font-bold text-deep-forest">{resultCount}</span>
                  {resultCount === 1 ? ' item' : ' products'}
                  {activeCategoryLabel ? (
                    <>
                      {' '}
                      in <span className="font-bold text-deep-forest">{activeCategoryLabel}</span>
                    </>
                  ) : null}
                  {search.trim() ? (
                    <>
                      {' '}
                      matching &ldquo;{search.trim()}&rdquo;
                    </>
                  ) : null}
                </>
              )}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="font-inter text-sm font-bold text-neon-paddy hover:text-deep-forest"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1400px] px-4 md:px-8">
        <a
          href={whatsappHref}
          target="_blank"
          rel="noreferrer"
          className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-soft-border bg-white px-4 py-2.5 text-sm shadow-[0_6px_18px_rgba(31,61,43,0.04)] transition-colors hover:border-neon-paddy/25"
        >
          <span className="font-inter text-deep-forest/75">Need help choosing?</span>
          <span className="inline-flex items-center gap-1.5 font-inter text-sm font-bold text-neon-paddy">
            <MessageCircle className="h-4 w-4" />
            WhatsApp us
          </span>
        </a>
      </div>

      <section className="mx-auto max-w-[1400px] px-4 py-7 md:px-8">
        {showBundles ? (
          combosLoading ? (
            <div className="grid grid-cols-1 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-48 animate-pulse rounded-2xl bg-white" />
              ))}
            </div>
          ) : sortedCombos.length === 0 ? (
            <ShopEmptyState title="No bundles available right now.">
              <button type="button" onClick={() => setCategory(null)} className="mt-4 font-inter text-sm font-bold text-neon-paddy hover:text-deep-forest">
                Browse all products
              </button>
            </ShopEmptyState>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {sortedCombos.map((combo) => (
                <ComboCard key={combo.id} combo={combo} />
              ))}
            </div>
          )
        ) : isError ? (
          <ShopEmptyState title="Couldn't load products right now.">
            <p className="mt-3 max-w-sm font-inter text-sm leading-6 text-deep-forest/65">
              Please check your connection and try again.
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-5 rounded-full bg-neon-paddy px-5 py-2.5 font-inter text-sm font-bold text-white hover:bg-deep-forest"
            >
              Retry
            </button>
          </ShopEmptyState>
        ) : isLoading ? (
          <ProductSkeletonGrid />
        ) : filtered.length === 0 ? (
          <ShopEmptyState title="No products found.">
            <p className="mt-3 max-w-sm font-inter text-sm leading-6 text-deep-forest/65">
              Try another category or clear your search.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-4">
              {hasActiveFilters && (
                <button type="button" onClick={clearAllFilters} className="font-inter text-sm font-bold text-neon-paddy hover:text-deep-forest">
                  Clear all filters
                </button>
              )}
              <a href={whatsappHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-inter text-sm font-bold text-neon-paddy hover:text-deep-forest">
                <MessageCircle className="h-4 w-4" />
                Ask on WhatsApp
              </a>
            </div>
          </ShopEmptyState>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
            >
              {visibleProducts.slice(0, 10).map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} variant="shop" />
              ))}
            </motion.div>

            {filtered.length >= 8 ? (
              <BundleStrip
                location="category"
                title="Shop by combo"
                description="Starter kits and monthly baskets — view items and add individually."
                className="my-8"
                limit={3}
              />
            ) : null}

            {visibleProducts.length > 10 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25 }}
                className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
              >
                {visibleProducts.slice(10).map((product, i) => (
                  <ProductCard key={product.id} product={product} index={i + 10} variant="shop" />
                ))}
              </motion.div>
            ) : null}

            {hasMoreProducts ? (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((count) => count + SHOP_PAGE_SIZE)}
                  className="rounded-full border border-soft-border bg-white px-6 py-3 font-inter text-sm font-bold text-deep-forest transition-colors hover:border-neon-paddy/40 hover:text-neon-paddy"
                >
                  Load more products ({filtered.length - visibleCount} remaining)
                </button>
              </div>
            ) : null}
          </>
        )}
      </section>

      {!isLoading && !isError && (showBundles ? sortedCombos.length > 0 : filtered.length > 0) && (
        <div className="mx-auto max-w-[1400px] px-4 pb-8 md:px-8">
          <div className="flex flex-col gap-3 rounded-2xl border border-soft-border bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-inter text-sm text-deep-forest/75">
              Questions about delivery, stock, or pack sizes?
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/contact" className="font-inter text-sm font-bold text-deep-forest hover:text-neon-paddy">
                Contact us
              </Link>
              <a href={whatsappHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-inter text-sm font-bold text-neon-paddy hover:text-deep-forest">
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
