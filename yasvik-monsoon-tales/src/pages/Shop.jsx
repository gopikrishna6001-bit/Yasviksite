import ComboProductCard, { ComboProductCardFromBundle } from '@/components/products/ComboProductCard';
import ComboCarousel from '@/components/products/ComboCarousel';
import ProductCard from '@/components/products/ProductCard';
import {
  BUNDLES_SHOP_CATEGORY_KEY,
  BUNDLES_SHOP_PATH,
  isBundlesShopRoute,
  isShopComboProduct,
} from '@/lib/comboUtils';
import { fetchShopCatalogueBundles } from '@/services/productRelationsApi';
import { fetchAllAppSettings, resolveSettingsMap, SETTINGS_QUERY_KEYS } from '@/services/settingsService';
import ShopBreadcrumbs from '@/components/shop/ShopBreadcrumbs';
import ShopFiltersPanel from '@/components/shop/ShopFiltersPanel';
import ProductListRow from '@/components/products/ProductListRow';
import StoreOfflineExperience from '@/components/shop/StoreOfflineExperience';
import { useStoreOffline } from '@/hooks/useStoreOffline';
import { sortCatalogProducts } from '@/lib/productSortUtils';
import { filterOfferProducts } from '@/lib/productOfferUtils';
import { YASVIK_WHATSAPP_NUMBER } from '@/lib/storeLocation';
import { resolveCategorySlugParam, SHOP_INDEX_SEO } from '@/lib/seoEntity';
import {
  buildCategoryBreadcrumbJsonLd,
  buildCategoryCollectionJsonLd,
  buildCategoryFaqJsonLd,
  buildCategoryFaqs,
  buildCategorySeoMeta,
  listRelatedCategorySlugs,
} from '@/lib/categorySeo';
import { applyShopSeoHead, clearShopSeoHead } from '@/lib/seoHead';
import { BRAND_LOGO_HORIZONTAL } from '@/lib/brandAssets';
import { optimizeMediaUrl } from '@/lib/mediaUrl';
import { valueFromBundleAndParent } from '@/lib/comboVisualUtils';
import { partitionBundlesByMerchCategory, COMBO_MERCH_LABELS } from '@/lib/comboV2Utils';
import { getProductPath } from '@/lib/productUrls';
import { products as productsApi } from '@/services/api';
import { getCategoryDisplayName, getCategoryShopHref } from '@/lib/categoryDisplay';
import { buildCategoryProductImageMap } from '@/lib/categoryDisplayImages';
import { useStorefrontCategories, useAllActiveCategories } from '@/hooks/useStorefrontCategories';
import { findCategoryById, listChildCategories, categoryBreadcrumb, groupProductsByShopAisle, sortProductsByCategoryHierarchy } from '@/lib/categoryTree';
import { LEGACY_ROOT_SLUG_MAP, normalizeCategorySlug } from '@/lib/storefrontCategories';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Filter, MessageCircle } from 'lucide-react';

/** Shop shell — wider than marketing pages so filters + grid use the viewport; padding matches header. */
const SHOP_SHELL = 'mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8';

const BUNDLES_KEY = BUNDLES_SHOP_CATEGORY_KEY;
/** Region filter UI disabled for now; logic kept for future use. */
const SHOW_REGION_FILTER = false;
const SHOP_PAGE_SIZE = 24;

const COMBO_SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'best-value', label: 'Best Value' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'most-products', label: 'Most Products' },
  { value: 'newest', label: 'Newest' },
];

const COMBO_TYPE_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'separate', label: COMBO_MERCH_LABELS.separate, merchCategory: 'separate' },
  { value: 'mixed', label: COMBO_MERCH_LABELS.mixed, merchCategory: 'mixed' },
  { value: 'free_gift', label: COMBO_MERCH_LABELS.free_gift, merchCategory: 'free_gift' },
];

function sortCatalogueBundles(bundles, sortKey) {
  const list = [...(bundles || [])];
  const parentPrice = (b) => Number(b?.parent_product?.price) || 0;
  const itemCount = (b) => Number(b?.item_count) || (b?.products || []).length || 0;
  const saveAmount = (b) => {
    const { presentation } = valueFromBundleAndParent(b, b?.parent_product);
    return presentation.saveAmount || 0;
  };
  const newest = (b) => new Date(b?.updated_at || b?.created_at || b?.parent_product?.updated_date || 0).getTime();

  if (sortKey === 'price-low') return list.sort((a, b) => parentPrice(a) - parentPrice(b));
  if (sortKey === 'price-high') return list.sort((a, b) => parentPrice(b) - parentPrice(a));
  if (sortKey === 'most-products') return list.sort((a, b) => itemCount(b) - itemCount(a));
  if (sortKey === 'best-value') return list.sort((a, b) => saveAmount(b) - saveAmount(a));
  if (sortKey === 'newest') return list.sort((a, b) => newest(b) - newest(a));
  // featured: featured parents first, then price low → high
  return list.sort((a, b) => {
    const af = Number(Boolean(a?.parent_product?.is_featured || a?.is_featured));
    const bf = Number(Boolean(b?.parent_product?.is_featured || b?.is_featured));
    if (af !== bf) return bf - af;
    const priceDiff = parentPrice(a) - parentPrice(b);
    if (priceDiff !== 0) return priceDiff;
    return (Number(a?.sort_order) || 0) - (Number(b?.sort_order) || 0);
  });
}

function filterCatalogueBundles(bundles, typeFilter) {
  if (!typeFilter || typeFilter === 'all') return bundles || [];
  const rule = COMBO_TYPE_FILTERS.find((row) => row.value === typeFilter);
  if (!rule) return bundles || [];
  if (rule.merchCategory) {
    return (bundles || []).filter((bundle) => bundle?.combo_merch_category === rule.merchCategory);
  }
  if (!rule.match) return bundles || [];
  return (bundles || []).filter((bundle) => {
    const hay = [
      bundle?.bundle_name,
      bundle?.bundle_description,
      bundle?.parent_product?.title,
      bundle?.parent_product?.name,
      bundle?.parent_product?.yasvik_mark,
      bundle?.parent_product?.best_for,
      bundle?.bundle_type,
    ].filter(Boolean).join(' ');
    return rule.match.test(hay);
  });
}

function CategoryComboStrip({ bundles = [], categoryLabel = '' }) {
  if (!bundles.length) return null;
  const ordered = sortCatalogueBundles(bundles, 'featured');
  return (
    <ComboCarousel
      bundles={ordered}
      eyebrow="Better Together"
      title={categoryLabel ? `${categoryLabel} Combos` : 'Value Packs'}
      description="Useful combinations at better overall value."
      limit={5}
      className="mb-8"
    />
  );
}

const COMBO_DECISION_GUIDE = [
  { need: 'I mainly need everyday seeds.', title: 'Everyday Seeds Combo', price: 550, slug: 'yasvik-everyday-seeds-Combo' },
  { need: 'I want a focused dry-fruit selection with options.', title: 'Five Dry Fruits Combo', price: 899, slug: 'yasvik-five-dry-fruits-combo' },
  { need: 'I want seven everyday nuts and seeds.', title: '7 Superfoods Combo', price: 699, slug: 'yasvik-seven-superfoods-combo' },
  { need: 'I want a wider mixed variety.', title: '12 Superfoods Combo', price: 899, slug: 'yasvik-twelve-superfoods-combo' },
  { need: 'I am new and want maximum discovery.', title: '17 Item Discovery', price: 999, slug: 'yasvik-17-item-discovery-box' },
  { need: 'I want the biggest variety pack.', title: '20 Item Variety', price: 1299, slug: 'yasvik-grand-variety-combo' },
  { need: 'My family needs a 2.2 kg practical box.', title: '2.2kg Family Combo', price: 1499, slug: 'yasvik-family-dry-fruit-seeds-combo' },
  { need: 'I want a 2.75 kg premium box with free seeds.', title: '2.75kg Premium Combo', price: 2199, slug: 'yasvik-premium-family-combo' },
  { need: 'I want a 4 kg grand family stock.', title: '4kg Grand Family Combo', price: 2999, slug: 'yasvik-grand-family-combo' },
];

function ComboDecisionGuide() {
  return (
    <section className="rounded-2xl border border-soft-border/80 bg-white p-4 sm:p-5">
      <h2 className="font-cormorant text-xl font-semibold text-deep-forest md:text-2xl">
        Which Yasvik box is right for you?
      </h2>
      <ul className="mt-4 divide-y divide-soft-border/70">
        {COMBO_DECISION_GUIDE.map((row) => (
          <li key={row.slug} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
            <p className="font-inter text-sm text-deep-forest/70">{row.need}</p>
            <Link
              to={getProductPath({ slug: row.slug, name: row.title })}
              className="shrink-0 font-inter text-sm font-semibold text-deep-forest hover:text-sun-dried-clay"
            >
              {row.title}
              {' '}
              —
              {' '}
              ₹{row.price.toLocaleString('en-IN')}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function normalizePhone(value = '') {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return YASVIK_WHATSAPP_NUMBER;
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

function getRegionLabel(product) {
  return String(product?.origin_region || product?.region_name || product?.sourcing_location || product?.location_label || '').trim();
}

function sortProducts(items, sort, categories = []) {
  const list = [...items];
  if (sort === 'offers') {
    return filterOfferProducts(list, list.length);
  }
  if (sort === 'price-low') return list.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
  if (sort === 'price-high') return list.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
  if (sort === 'name') return list.sort((a, b) => String(a.title || a.name || '').localeCompare(String(b.title || b.name || '')));
  if (sort === 'category') return sortProductsByCategoryHierarchy(list, categories);
  return sortCatalogProducts(list);
}

function ProductSkeletonList() {
  return (
    <div className="flex flex-col gap-3 md:hidden">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-soft-border/80 bg-white p-2.5">
          <div className="h-[5.5rem] w-[5.5rem] animate-pulse rounded-lg bg-warm-cream" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-3/4 animate-pulse rounded bg-warm-cream" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-warm-cream" />
          </div>
        </div>
      ))}
    </div>
  );
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

function ShopAisleSection({ section, onViewAisle, renderProduct }) {
  const hasSubs = section.subsections.some((sub) => sub.products.length > 0);
  const directCount = section.products.length;
  const totalCount = directCount + section.subsections.reduce((n, sub) => n + sub.products.length, 0);

  if (!totalCount) return null;

  return (
    <section className="mb-10 last:mb-0">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b border-soft-border pb-3">
        <div>
          <h2 className="font-cormorant text-2xl font-semibold text-deep-forest md:text-3xl">{section.label}</h2>
          <p className="mt-0.5 font-inter text-xs text-deep-forest/50">{totalCount} product{totalCount === 1 ? '' : 's'}</p>
        </div>
        {section.root?.id ? (
          <button
            type="button"
            onClick={() => onViewAisle(section.root.id)}
            className="font-inter text-xs font-bold text-neon-paddy hover:text-deep-forest"
          >
            View aisle →
          </button>
        ) : null}
      </div>

      {directCount > 0 ? (
        <div className="mb-6">
          {hasSubs ? (
            <p className="mb-3 font-inter text-[11px] font-bold uppercase tracking-wider text-deep-forest/45">General</p>
          ) : null}
          <div className="flex flex-col gap-3 md:hidden">
            {section.products.map((product, i) => renderProduct(product, i, 'list'))}
          </div>
          <div className="hidden grid-cols-2 gap-4 sm:grid-cols-3 md:grid lg:grid-cols-4">
            {section.products.map((product, i) => renderProduct(product, i, 'card'))}
          </div>
        </div>
      ) : null}

      {section.subsections.map((sub) => {
        if (!sub.products.length) return null;
        return (
          <div key={sub.id} className="mb-6 last:mb-0">
            <p className="mb-3 font-inter text-[11px] font-bold uppercase tracking-wider text-deep-forest/45">{sub.label}</p>
            <div className="flex flex-col gap-3 md:hidden">
              {sub.products.map((product, i) => renderProduct(product, i, 'list'))}
            </div>
            <div className="hidden grid-cols-2 gap-4 sm:grid-cols-3 md:grid lg:grid-cols-4">
              {sub.products.map((product, i) => renderProduct(product, i, 'card'))}
            </div>
          </div>
        );
      })}
    </section>
  );
}

export default function Shop() {
  const [search, setSearch] = useState('');
  const [activeRegion, setActiveRegion] = useState('');
  const [sort, setSort] = useState('category');
  const [visibleCount, setVisibleCount] = useState(SHOP_PAGE_SIZE);
  const [comboTypeFilter, setComboTypeFilter] = useState('all');
  const [comboSort, setComboSort] = useState('featured');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const { categorySlug: routeSlug } = useParams();
  const navigate = useNavigate();
  const { enabled: storeOffline, message: offlineMessage } = useStoreOffline();

  const queryCategory = searchParams.get('category');
  const showBundles = isBundlesShopRoute(routeSlug, queryCategory);

  useEffect(() => {
    if (!mobileFiltersOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileFiltersOpen]);

  useEffect(() => {
    if (queryCategory === BUNDLES_KEY && routeSlug !== 'combos') {
      navigate(BUNDLES_SHOP_PATH, { replace: true });
    }
  }, [queryCategory, routeSlug, navigate]);

  useEffect(() => {
    const urlSort = searchParams.get('sort');
    if (urlSort === 'offers') setSort('offers');
  }, [searchParams]);

  const { data: settings = [] } = useQuery({
    queryKey: SETTINGS_QUERY_KEYS.public,
    queryFn: fetchAllAppSettings,
    staleTime: 10 * 60 * 1000,
  });
  const settingsMap = useMemo(() => resolveSettingsMap(settings), [settings]);
  const whatsappNumber = normalizePhone(settingsMap.whatsapp_number || settingsMap.support_whatsapp_number || '');
  const whatsappHref = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Hi Yasvik, I need help choosing products from the shop.')}`;

  const { data: categories = [] } = useStorefrontCategories();
  const { data: allCategories = [] } = useAllActiveCategories();

  const resolvedCategory = useMemo(() => {
    const param = routeSlug || queryCategory;
    if (!param || param === BUNDLES_KEY || isBundlesShopRoute(routeSlug, queryCategory)) return null;
    const byId = findCategoryById(param, allCategories);
    if (byId) return byId;
    const slug = resolveCategorySlugParam(normalizeCategorySlug(param));
    const bySlug = allCategories.find((cat) => normalizeCategorySlug(cat.slug) === slug);
    if (bySlug) return bySlug;
    const mapped = LEGACY_ROOT_SLUG_MAP[slug];
    if (!mapped || mapped === 'store-staples') return null;
    return allCategories.find(
      (cat) => !cat.parent_id && normalizeCategorySlug(cat.slug) === mapped,
    ) || null;
  }, [routeSlug, queryCategory, allCategories]);

  const resolvedCategoryId = resolvedCategory?.id || null;

  const activeRootId = useMemo(() => {
    if (!resolvedCategory) return null;
    if (resolvedCategory.parent_id) return resolvedCategory.parent_id;
    return listChildCategories(resolvedCategory.id, allCategories).length > 0
      ? resolvedCategory.id
      : null;
  }, [resolvedCategory, allCategories]);

  const subcategories = useMemo(
    () => (activeRootId ? listChildCategories(activeRootId, allCategories) : []),
    [activeRootId, allCategories],
  );

  const {
    data: products = [],
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['shop-products', resolvedCategoryId],
    queryFn: () =>
      resolvedCategoryId
        ? productsApi.listByCategory(resolvedCategoryId, 200)
        : productsApi.listPublished('sort_order', 500),
    staleTime: 3 * 60 * 1000,
    enabled: !showBundles,
    placeholderData: keepPreviousData,
  });

  const { data: catalogueBundles = [], isLoading: catalogueBundlesLoading } = useQuery({
    queryKey: ['shop-catalogue-bundles'],
    queryFn: () => fetchShopCatalogueBundles({ limit: 40 }),
    staleTime: 5 * 60 * 1000,
  });

  const filteredCatalogueBundles = useMemo(
    () => sortCatalogueBundles(filterCatalogueBundles(catalogueBundles, comboTypeFilter), comboSort),
    [catalogueBundles, comboTypeFilter, comboSort],
  );
  const comboSections = useMemo(
    () => partitionBundlesByMerchCategory(sortCatalogueBundles(catalogueBundles, comboSort)),
    [catalogueBundles, comboSort],
  );
  const activeComboTypeFilters = useMemo(() => {
    return COMBO_TYPE_FILTERS.filter((row) => {
      if (row.value === 'all') return true;
      return filterCatalogueBundles(catalogueBundles, row.value).length > 0;
    });
  }, [catalogueBundles]);
  const hasAnyCombos = catalogueBundles.length > 0;

  const categoryCatalogueBundles = useMemo(() => {
    if (!resolvedCategoryId || showBundles) return [];
    const childIds = new Set(
      listChildCategories(resolvedCategoryId, allCategories).map((cat) => cat.id),
    );
    const matches = catalogueBundles.filter((bundle) => {
      const parent = bundle.parent_product;
      if (!parent) return false;
      const catId = parent.category_id;
      return parent.category_id === resolvedCategoryId
        || parent.primary_category_id === resolvedCategoryId
        || (Array.isArray(parent.category_ids) && parent.category_ids.includes(resolvedCategoryId))
        || (catId && childIds.has(catId));
    });
    return sortCatalogueBundles(matches, 'featured');
  }, [catalogueBundles, resolvedCategoryId, showBundles, allCategories]);

  const shopMidComboBundles = useMemo(
    () => sortCatalogueBundles(catalogueBundles, 'featured'),
    [catalogueBundles],
  );

  const regions = [...new Set(products.map(getRegionLabel).filter(Boolean))].slice(0, 12);
  const categoryImageMap = useMemo(() => buildCategoryProductImageMap(products), [products]);
  const filtered = sortProducts(
    products
      .filter((p) => !SHOW_REGION_FILTER || !activeRegion || getRegionLabel(p) === activeRegion)
      .filter((p) => {
        if (!search.trim()) return true;
        const haystack = `${p.title || p.name || ''} ${p.short_description || ''} ${p.description || ''}`.toLowerCase();
        return haystack.includes(search.toLowerCase());
      }),
    sort,
    allCategories,
  );

  const useGroupedAisleView = !routeSlug && !queryCategory && !search.trim() && sort === 'category';

  const shopAisleSections = useMemo(
    () => (useGroupedAisleView
      ? groupProductsByShopAisle(filtered, allCategories)
      : []),
    [useGroupedAisleView, filtered, allCategories],
  );

  useEffect(() => {
    setVisibleCount(SHOP_PAGE_SIZE);
  }, [routeSlug, queryCategory, search, sort, activeRegion]);

  const visibleProducts = filtered.slice(0, visibleCount);
  const hasMoreProducts = visibleCount < filtered.length;
  const showMidCombos = !showBundles && !search.trim()
    && !routeSlug && !queryCategory
    && shopMidComboBundles.length > 0;

  const showProductSkeleton = isLoading && products.length === 0;
  const isRefreshingProducts = isFetching && !showProductSkeleton;

  const renderShopProduct = (product, index, mode) => {
    if (isShopComboProduct(product)) {
      return <ComboProductCard key={product.id} product={product} index={index} />;
    }
    if (mode === 'list') {
      return <ProductListRow key={product.id} product={product} index={index} />;
    }
    return <ProductCard key={product.id} product={product} index={index} variant="shop" />;
  };

  const shopGridItems = useMemo(
    () => visibleProducts.map((product, i) => (
      isShopComboProduct(product)
        ? <ComboProductCard key={product.id} product={product} index={i} />
        : <ProductCard key={product.id} product={product} index={i} variant="shop" />
    )),
    [visibleProducts],
  );

  const categorySeo = useMemo(
    () => (resolvedCategory ? buildCategorySeoMeta(resolvedCategory, { origin: window.location.origin }) : null),
    [resolvedCategory],
  );

  const relatedCategories = useMemo(() => {
    if (!resolvedCategory || !categorySeo?.slug) return [];
    return listRelatedCategorySlugs(categorySeo.slug)
      .map((slug) => allCategories.find((cat) => normalizeCategorySlug(cat.slug) === slug))
      .filter(Boolean);
  }, [resolvedCategory, categorySeo?.slug, allCategories]);

  const categoryFaqs = useMemo(
    () => (resolvedCategory ? buildCategoryFaqs(resolvedCategory) : []),
    [resolvedCategory],
  );

  useEffect(() => {
    if (!resolvedCategory || showBundles) return;
    const canonicalPath = getCategoryShopHref(resolvedCategory);
    if (queryCategory && !routeSlug && canonicalPath.startsWith('/shop/')) {
      navigate(canonicalPath, { replace: true });
      return;
    }
    if (routeSlug && canonicalPath !== `/shop/${routeSlug}`) {
      navigate(canonicalPath, { replace: true });
    }
  }, [resolvedCategory, queryCategory, routeSlug, showBundles, navigate]);

  useEffect(() => {
    const origin = window.location.origin;
    const ogImage = optimizeMediaUrl(BRAND_LOGO_HORIZONTAL, 'banner');
    const absoluteOgImage = ogImage.startsWith('http') ? ogImage : `${origin}${ogImage}`;

    if (showBundles) {
      applyShopSeoHead({
        title: 'Combos & Value Packs | Yasvik Hyderabad',
        description: 'Useful Yasvik combinations brought together for easier shopping and better overall value.',
        canonicalUrl: `${origin}${BUNDLES_SHOP_PATH}`,
        ogImage: absoluteOgImage,
        robots: 'index,follow',
      });
      return () => clearShopSeoHead();
    }

    if (search.trim()) {
      applyShopSeoHead({
        title: `Search: ${search.trim()} | Yasvik Shop`,
        description: SHOP_INDEX_SEO.description,
        canonicalUrl: `${origin}/shop`,
        ogImage: absoluteOgImage,
        robots: 'noindex,nofollow',
      });
      return () => clearShopSeoHead();
    }

    if (resolvedCategory && categorySeo) {
      applyShopSeoHead({
        title: categorySeo.title,
        description: categorySeo.description,
        canonicalUrl: categorySeo.canonicalUrl,
        ogImage: absoluteOgImage,
        robots: categorySeo.indexable ? 'index,follow' : 'noindex,follow',
        breadcrumbJsonLd: buildCategoryBreadcrumbJsonLd(resolvedCategory, { origin }),
        collectionJsonLd: buildCategoryCollectionJsonLd(resolvedCategory, filtered.length, { origin }),
        faqJsonLd: buildCategoryFaqJsonLd(resolvedCategory, { origin }),
      });
      return () => clearShopSeoHead();
    }

    applyShopSeoHead({
      title: SHOP_INDEX_SEO.title,
      description: SHOP_INDEX_SEO.description,
      canonicalUrl: `${origin}/shop`,
      ogImage: absoluteOgImage,
      breadcrumbJsonLd: {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
          { '@type': 'ListItem', position: 2, name: 'Shop', item: `${origin}/shop` },
        ],
      },
    });
    return () => clearShopSeoHead();
  }, [resolvedCategory, categorySeo, filtered.length, search, showBundles]);

  const activeCategoryLabel = useMemo(() => {
    if (showBundles) return 'Combos & Value Packs';
    if (resolvedCategoryId) {
      const crumb = categoryBreadcrumb(resolvedCategoryId, allCategories);
      if (crumb) return crumb;
      return getCategoryDisplayName(resolvedCategory);
    }
    return null;
  }, [showBundles, resolvedCategoryId, resolvedCategory, allCategories]);

  const categoryHeaderCopy = useMemo(() => {
    if (showBundles) return 'Combos & Value Packs';
    if (categorySeo?.h1) return categorySeo.h1;
    if (activeCategoryLabel) return activeCategoryLabel;
    return 'Shop better everyday foods';
  }, [showBundles, categorySeo, activeCategoryLabel]);

  const categoryIntroCopy = useMemo(() => {
    if (showBundles) {
      return 'Useful Yasvik combinations brought together for easier shopping and better overall value.';
    }
    if (categorySeo?.intro) return categorySeo.intro;
    if (!resolvedCategory) {
      return 'Homemade snacks, pickles, spice powders, cold-pressed oils, ghee, honey, jaggery, dry fruits, heritage rice, millets and carefully chosen everyday foods from Yasvik in Hyderabad.';
    }
    return '';
  }, [showBundles, categorySeo, resolvedCategory]);

  const breadcrumbItems = useMemo(() => {
    const items = [
      { label: 'Home', href: '/' },
      { label: 'Shop', href: '/shop' },
    ];
    if (showBundles) {
      items.push({ label: 'Combos & Value Packs', href: BUNDLES_SHOP_PATH });
    } else if (resolvedCategory && categorySeo?.h1) {
      items.push({ label: categorySeo.h1, href: categorySeo.path });
    }
    return items;
  }, [showBundles, resolvedCategory, categorySeo]);

  const hasActiveFilters = Boolean(search.trim() || routeSlug || queryCategory || sort !== 'category' || (SHOW_REGION_FILTER && activeRegion));

  const setCategory = (categoryId) => {
    if (!categoryId) {
      navigate('/shop');
      return;
    }
    if (categoryId === BUNDLES_KEY) {
      navigate(BUNDLES_SHOP_PATH);
      return;
    }
    const cat = findCategoryById(categoryId, allCategories);
    navigate(cat ? getCategoryShopHref(cat) : '/shop');
  };

  const clearAllFilters = () => {
    setSearch('');
    setSort('category');
    setActiveRegion('');
    navigate('/shop');
  };

  const resultCount = showBundles
    ? filteredCatalogueBundles.length
    : filtered.length;

  const filterPanelProps = {
    search,
    onSearchChange: setSearch,
    onClearSearch: () => setSearch(''),
    categories,
    allCategories,
    categoryImageMap,
    routeSlug,
    queryCategory,
    resolvedCategoryId,
    activeRootId,
    subcategories,
    showBundles,
    hasAnyCombos,
    onSelectCategory: (id) => {
      setCategory(id);
      setMobileFiltersOpen(false);
    },
    hasActiveFilters,
    onClearAll: () => {
      clearAllFilters();
      setMobileFiltersOpen(false);
    },
    showRegionFilter: SHOW_REGION_FILTER,
    regions,
    activeRegion,
    onRegionChange: setActiveRegion,
  };

  const resultCountLabel = showProductSkeleton && !showBundles
    ? 'Loading…'
    : `${resultCount} ${resultCount === 1 ? 'Product' : 'Products'}`;

  const sortSelect = (
    <label className="inline-flex items-center gap-2 font-inter text-sm text-deep-forest/60">
      <span className="hidden sm:inline">Sort by:</span>
      <select
        value={showBundles ? comboSort : sort}
        onChange={(e) => {
          if (showBundles) setComboSort(e.target.value);
          else setSort(e.target.value);
        }}
        className="h-9 rounded-full border border-soft-border bg-white px-3 font-inter text-xs font-bold text-deep-forest/70 outline-none focus:border-neon-paddy sm:text-[13px]"
      >
        {showBundles
          ? COMBO_SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))
          : (
            <>
              <option value="category">By category (aisle order)</option>
              <option value="offers">Best offers</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
              <option value="name">Name</option>
            </>
          )}
      </select>
    </label>
  );

  if (storeOffline) {
    return <StoreOfflineExperience message={offlineMessage} whatsappHref={whatsappHref} />;
  }

  return (
    <div className="min-h-screen bg-warm-cream text-deep-forest transition-colors duration-300">
      <h1 className="sr-only">{categoryHeaderCopy}</h1>
      {categoryIntroCopy ? <p className="sr-only">{categoryIntroCopy}</p> : null}

      <div className={`${SHOP_SHELL} pt-4 md:pt-5`}>
        <ShopBreadcrumbs items={breadcrumbItems} />
      </div>

      <section className={`sticky top-[var(--yasvik-site-header-h,5.75rem)] z-20 border-y border-soft-border bg-warm-cream/95 py-2.5 backdrop-blur lg:hidden ${SHOP_SHELL}`}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full border border-soft-border bg-white font-inter text-xs font-bold text-deep-forest"
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
            {hasActiveFilters ? (
              <span className="rounded-full bg-neon-paddy px-1.5 py-0.5 text-[10px] text-deep-forest">On</span>
            ) : null}
          </button>
          <div className="flex-shrink-0">{sortSelect}</div>
        </div>
      </section>

      {mobileFiltersOpen ? (
        <ShopFiltersPanel
          variant="sheet"
          {...filterPanelProps}
          onClose={() => setMobileFiltersOpen(false)}
        />
      ) : null}

      <section className={`${SHOP_SHELL} pb-6 pt-3 md:pb-8 md:pt-4`}>
        <div className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start lg:gap-6 xl:grid-cols-[260px_minmax(0,1fr)] xl:gap-8">
          <aside className="relative hidden lg:sticky lg:top-[calc(var(--yasvik-site-header-h,5.75rem)+0.75rem)] lg:z-10 lg:block lg:max-h-[calc(100vh-var(--yasvik-site-header-h,5.75rem)-1.5rem)] lg:overflow-y-auto lg:overscroll-contain">
            <ShopFiltersPanel variant="sidebar" {...filterPanelProps} />
          </aside>

          <div className="min-w-0">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-cormorant text-2xl font-semibold text-deep-forest md:text-3xl">
                  {resultCountLabel}
                </h2>
                {activeCategoryLabel || search.trim() ? (
                  <p className="mt-1 font-inter text-sm text-deep-forest/60">
                    {activeCategoryLabel ? (
                      <>in <span className="font-semibold text-deep-forest">{activeCategoryLabel}</span></>
                    ) : null}
                    {search.trim() ? (
                      <>
                        {activeCategoryLabel ? ' · ' : null}
                        matching &ldquo;{search.trim()}&rdquo;
                      </>
                    ) : null}
                  </p>
                ) : null}
              </div>
              <div className="hidden lg:block">{sortSelect}</div>
            </div>

            {showBundles && hasAnyCombos && !catalogueBundlesLoading ? (
              <div className="mb-6 flex flex-wrap gap-2">
                {activeComboTypeFilters.map((row) => (
                  <button
                    key={row.value}
                    type="button"
                    onClick={() => setComboTypeFilter(row.value)}
                    className={`rounded-full px-3.5 py-1.5 font-inter text-xs font-bold transition-colors ${
                      comboTypeFilter === row.value
                        ? 'bg-deep-forest text-warm-cream'
                        : 'border border-soft-border bg-white text-deep-forest/70 hover:border-deep-forest/30'
                    }`}
                  >
                    {row.label}
                  </button>
                ))}
              </div>
            ) : null}

        {showBundles ? (
          (catalogueBundlesLoading) ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] animate-pulse rounded-[1.35rem] bg-white" />
              ))}
            </div>
          ) : !hasAnyCombos ? (
            <ShopEmptyState title="No combos available right now.">
              <button type="button" onClick={() => setCategory(null)} className="mt-4 font-inter text-sm font-bold text-deep-forest hover:text-sun-dried-clay">
                Browse all products
              </button>
            </ShopEmptyState>
          ) : (
            <div className="space-y-8">
              {filteredCatalogueBundles.length > 0 ? (
                <div className="space-y-10">
                  {comboTypeFilter === 'all' ? (
                    ['separate', 'mixed', 'free_gift'].map((sectionKey) => {
                      const sectionBundles = comboSections[sectionKey] || [];
                      if (!sectionBundles.length) return null;
                      return (
                        <section key={sectionKey}>
                          <div className="mb-4">
                            <h2 className="font-cormorant text-2xl font-semibold text-deep-forest md:text-3xl">
                              {COMBO_MERCH_LABELS[sectionKey]}
                            </h2>
                            <p className="mt-1 font-inter text-sm text-deep-forest/65">
                              {sectionKey === 'separate'
                                ? 'Focused category combos for a clear purpose.'
                                : sectionKey === 'mixed'
                                  ? 'Variety boxes with many products in one pack.'
                                  : 'Premium boxes with free gifts highlighted.'}
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
                            {sectionBundles.map((bundle, index) => (
                              <ComboProductCardFromBundle key={bundle.id} bundle={bundle} index={index} />
                            ))}
                          </div>
                        </section>
                      );
                    })
                  ) : (
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
                      {filteredCatalogueBundles.map((bundle, index) => (
                        <ComboProductCardFromBundle key={bundle.id} bundle={bundle} index={index} />
                      ))}
                    </div>
                  )}
                  <ComboDecisionGuide />
                </div>
              ) : (
                <ShopEmptyState title="No combos match this filter.">
                  <button
                    type="button"
                    onClick={() => setComboTypeFilter('all')}
                    className="mt-4 font-inter text-sm font-bold text-deep-forest"
                  >
                    Show all combos
                  </button>
                </ShopEmptyState>
              )}
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
        ) : showProductSkeleton ? (
          <>
            <ProductSkeletonList />
            <div className="hidden md:block">
              <ProductSkeletonGrid />
            </div>
          </>
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
          <div
            className={`transition-opacity duration-200 ${isRefreshingProducts ? 'pointer-events-none opacity-70' : 'opacity-100'}`}
            aria-busy={isRefreshingProducts}
          >
            {!showBundles && categoryCatalogueBundles.length > 0 ? (
              <CategoryComboStrip
                bundles={categoryCatalogueBundles}
                categoryLabel={getCategoryDisplayName(resolvedCategory) || ''}
              />
            ) : null}

            {useGroupedAisleView ? (
              <div className="space-y-2">
                {shopAisleSections.map((section, sectionIndex) => (
                  <div key={section.id}>
                    <ShopAisleSection
                      section={section}
                      onViewAisle={setCategory}
                      renderProduct={renderShopProduct}
                    />
                    {showMidCombos && sectionIndex === 0 ? (
                      <ComboCarousel
                        bundles={shopMidComboBundles}
                        limit={5}
                        className="my-10 border-y border-soft-border/60 py-8"
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <>
                {showMidCombos ? (
                  <>
                    <div className="flex flex-col gap-3 md:hidden">
                      {visibleProducts.slice(0, 4).map((product, i) => renderShopProduct(product, i, 'list'))}
                    </div>
                    <div className="hidden grid-cols-2 gap-4 sm:grid-cols-3 md:grid xl:grid-cols-4">
                      {visibleProducts.slice(0, 4).map((product, i) => renderShopProduct(product, i, 'card'))}
                    </div>
                    <ComboCarousel
                      bundles={shopMidComboBundles}
                      limit={5}
                      className="my-10 border-y border-soft-border/60 py-8"
                    />
                    <div className="flex flex-col gap-3 md:hidden">
                      {visibleProducts.slice(4).map((product, i) => renderShopProduct(product, i + 4, 'list'))}
                    </div>
                    <div className="hidden grid-cols-2 gap-4 sm:grid-cols-3 md:grid xl:grid-cols-4">
                      {visibleProducts.slice(4).map((product, i) => renderShopProduct(product, i + 4, 'card'))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex flex-col gap-3 md:hidden">
                      {visibleProducts.map((product, i) => renderShopProduct(product, i, 'list'))}
                    </div>
                    <div className="hidden grid-cols-2 gap-4 sm:grid-cols-3 md:grid xl:grid-cols-4">
                      {shopGridItems}
                    </div>
                  </>
                )}

                {hasMoreProducts ? (
                  <div className="mt-8 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setVisibleCount((count) => count + SHOP_PAGE_SIZE)}
                      className="rounded-full border border-soft-border bg-white px-6 py-3 font-inter text-sm font-bold text-deep-forest transition-colors hover:border-deep-forest/30"
                    >
                      Load more products ({filtered.length - visibleCount} remaining)
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        )}

            {relatedCategories.length > 0 ? (
              <div className="mt-8 rounded-2xl border border-soft-border bg-white px-5 py-4">
                <h2 className="font-cormorant text-xl font-semibold text-deep-forest">Related aisles</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {relatedCategories.map((cat) => (
                    <Link
                      key={cat.id}
                      to={getCategoryShopHref(cat)}
                      className="rounded-full border border-soft-border bg-warm-cream px-3 py-1.5 font-inter text-xs font-semibold text-deep-forest hover:border-neon-paddy hover:text-neon-paddy"
                    >
                      {getCategoryDisplayName(cat)}
                    </Link>
                  ))}
                  <Link
                    to="/store"
                    className="rounded-full border border-soft-border bg-warm-cream px-3 py-1.5 font-inter text-xs font-semibold text-deep-forest hover:border-neon-paddy hover:text-neon-paddy"
                  >
                    Visit store
                  </Link>
                </div>
              </div>
            ) : null}

            {categoryFaqs.length > 0 ? (
              <div className="mt-6 rounded-2xl border border-soft-border bg-white px-5 py-5">
                <h2 className="font-cormorant text-2xl font-semibold text-deep-forest">Category FAQs</h2>
                <div className="mt-4 space-y-3">
                  {categoryFaqs.map((item) => (
                    <div key={item.q} className="rounded-xl border border-soft-border/80 bg-warm-cream/30 p-4">
                      <h3 className="font-inter text-sm font-semibold text-deep-forest">{item.q}</h3>
                      <p className="mt-1.5 font-inter text-sm leading-6 text-deep-forest/70">{item.a}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

          </div>
        </div>
      </section>

      {!showProductSkeleton && !isError && (showBundles ? filteredCatalogueBundles.length > 0 : filtered.length > 0) && (
        <div className={`${SHOP_SHELL} pb-8`}>
          <div className="flex flex-col gap-3 rounded-2xl border border-soft-border bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-inter text-sm text-deep-forest/75">
              Questions about delivery, stock, or pack sizes?
            </p>
            <div className="flex flex-wrap items-center gap-4 sm:justify-end">
              <Link to="/store" className="font-inter text-sm font-bold text-deep-forest hover:text-neon-paddy">
                Store &amp; pickup
              </Link>
              <Link to="/delivery-policy" className="font-inter text-sm font-bold text-deep-forest hover:text-neon-paddy">
                Delivery policy
              </Link>
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
