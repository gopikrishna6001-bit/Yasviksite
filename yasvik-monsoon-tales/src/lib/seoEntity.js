/** Canonical Yasvik entity copy for search-facing metadata and JSON-LD. */

export const SITE_ORIGIN = 'https://www.yasvik.com';
export const WEBSITE_ENTITY_ID = `${SITE_ORIGIN}/#website`;
export const STORE_ENTITY_ID = `${SITE_ORIGIN}/#store`;
export const ORG_ENTITY_ID = `${SITE_ORIGIN}/#organization`;

/** Keep in sync with src/brand/yasvikManifesto.js — no @/ imports (Node sitemap scripts). */
export const BRAND_LINE = 'Better Food. Found.';

export const ENTITY_DESCRIPTION =
  'Yasvik — Better Food. Found. We travel, learn and choose everyday foods we can stand behind: homemade snacks, pickles, cold-pressed oils, honey, jaggery, heritage rice, millets and essentials — from our store in Ashok Nagar, Hyderabad.';

export const ENTITY_SHORT_OFFERING =
  'Homemade snacks, pickles, spice powders and podis, cold-pressed oils, ghee, honey, jaggery, dry fruits, heritage rice, millets and carefully chosen everyday foods.';

export const FOOTER_SEO_DESCRIPTION =
  'Better Food. Found. Yasvik finds and chooses everyday foods worth bringing home — available in store and across Hyderabad.';

export const HOME_SEO = {
  title: 'Yasvik | Organic Foods Chanda Nagar',
  description:
    'Organic food shop in Ashok Nagar, Chanda Nagar — cold-pressed oils, millets, rice, pickles, ghee, honey, pooja items and everyday foods. Visit, call, WhatsApp or order online.',
  ogTitle: 'Yasvik | Better Food. Found.',
  ogDescription:
    'Better everyday foods from Yasvik in Ashok Nagar, Chanda Nagar — store visit, WhatsApp and Hyderabad delivery.',
};

export const SHOP_INDEX_SEO = {
  title: 'Shop Yasvik | Oils, Millets, Pooja | Chanda Nagar',
  description:
    'Shop cold-pressed oils, millets, heritage rice, pickles, ghee, honey, dry fruits, pooja items and staples from Yasvik in Ashok Nagar, Chanda Nagar, Hyderabad.',
};

export const STORE_PAGE_SEO = {
  title: 'Visit Yasvik | Ashok Nagar, Chanda Nagar, Hyderabad',
  description:
    'Visit Yasvik in Ashok Nagar, Chanda Nagar, Hyderabad. Better Food. Found. — store pickup, local delivery and WhatsApp ordering for snacks, pickles, oils, honey and everyday foods we stand behind.',
};

export const BRAND_KEYWORDS =
  'yasvik, yasvik foods, organic shop chanda nagar, ashok nagar hyderabad, lingampally, ameenpur, cold pressed oils near me, millets near me, pooja items chanda nagar, homemade snacks hyderabad, pickles hyderabad, ghee honey jaggery, heritage rice, spice powders podis';

export const CATEGORY_PUBLIC_SLUGS = {
  snacks: 'homemade-snacks-sweets',
  pickles: 'homemade-pickles',
  spices: 'spices-powders-podis',
  'cold-pressed-oils': 'cold-pressed-oils',
  ghee: 'ghee',
  honey: 'honey',
  jaggery: 'jaggery',
  'dry-fruits': 'dry-fruits-nuts-seeds',
  'heritage-rice': 'heritage-rice',
  millets: 'millets-millet-foods',
  'store-staples': 'organic-staples',
  pooja: 'pooja-essentials',
  'functional-food-powders': 'functional-food-powders',
  'natural-care': 'natural-care',
};

/** Any legacy/short/public slug -> canonical DB/root category slug. */
export const CATEGORY_SLUG_ALIASES = {
  snacks: 'snacks',
  'homemade-snacks-sweets': 'snacks',
  'homemade-snacks-and-sweets': 'snacks',
  'snacks-and-sweets': 'snacks',
  pickles: 'pickles',
  'homemade-pickles': 'pickles',
  'pickles-and-condiments': 'pickles',
  spices: 'spices',
  'spices-powders-podis': 'spices',
  'spices-masalas-and-pantry': 'spices',
  'cold-pressed-oils': 'cold-pressed-oils',
  'cold-pressed-oil': 'cold-pressed-oils',
  'wood-pressed-oils': 'cold-pressed-oils',
  ghee: 'ghee',
  honey: 'honey',
  jaggery: 'jaggery',
  'dry-fruits': 'dry-fruits',
  'dry-fruits-nuts-seeds': 'dry-fruits',
  'dry-fruits-nuts-and-seeds': 'dry-fruits',
  'heritage-rice': 'heritage-rice',
  'heritage-rice-millets': 'heritage-rice',
  millets: 'millets',
  'millets-millet-foods': 'millets',
  'millet-flours': 'millets',
  'store-staples': 'store-staples',
  'organic-staples': 'store-staples',
  pooja: 'pooja',
  'pooja-essentials': 'pooja',
  'functional-food-powders': 'functional-food-powders',
  'natural-care': 'natural-care',
};

export function normalizeSeoSlug(value = '') {
  return String(value || '').trim().toLowerCase().replace(/_/g, '-');
}

export function resolveCategorySlugParam(value = '') {
  const raw = normalizeSeoSlug(value);
  if (!raw) return '';
  return CATEGORY_SLUG_ALIASES[raw] || raw;
}

export function canonicalCategoryDbSlug(categoryOrSlug = '') {
  if (categoryOrSlug && typeof categoryOrSlug === 'object') {
    return resolveCategorySlugParam(categoryOrSlug.slug || categoryOrSlug.name || '');
  }
  return resolveCategorySlugParam(categoryOrSlug);
}

export function canonicalCategoryPublicSlug(categoryOrSlug = '') {
  if (categoryOrSlug && typeof categoryOrSlug === 'object') {
    const override = normalizeSeoSlug(categoryOrSlug.seo_slug || '');
    if (override) return override;
  }
  const dbSlug = canonicalCategoryDbSlug(categoryOrSlug);
  return CATEGORY_PUBLIC_SLUGS[dbSlug] || dbSlug;
}

export function isCanonicalCategoryPathSlug(value = '') {
  const raw = normalizeSeoSlug(value);
  return Boolean(raw) && canonicalCategoryPublicSlug(raw) === raw;
}

export function categoryShopPath(categoryOrSlug = '') {
  const resolved = canonicalCategoryPublicSlug(categoryOrSlug);
  return resolved ? `/shop/${resolved}` : '/shop';
}

export function absoluteUrl(path = '/') {
  const base = SITE_ORIGIN.replace(/\/$/, '');
  const next = String(path || '/');
  if (next.startsWith('http')) return next;
  return `${base}${next.startsWith('/') ? next : `/${next}`}`;
}
