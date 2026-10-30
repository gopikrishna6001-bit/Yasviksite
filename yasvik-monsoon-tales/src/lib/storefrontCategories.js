import { categoryLabel, findCategoryById, listRootCategories } from '@/lib/categoryTree';

/** Launch-ready root aisles for shop/nav (not homepage merchandising order). */
export const LAUNCH_STOREFRONT_ROOT_SLUGS = [
  'snacks',
  'pickles',
  'spices',
  'cold-pressed-oils',
  'ghee',
  'honey',
  'jaggery',
  'dry-fruits',
  'functional-food-powders',
  'heritage-rice',
  'millets',
  'pooja',
  'natural-care',
];

/** Legacy / retired root slugs → canonical launch root slug. */
export const LEGACY_ROOT_SLUG_MAP = {
  millets: 'millets',
  'millet-flours': 'millets',
  'millet-mixes': 'millets',
  'organic-millets': 'millets',
  'organic-millet-flours': 'millets',
  'organic-heritage-rice': 'heritage-rice',
  'cold-pressed-oils': 'cold-pressed-oils',
  'oils-ghee': 'cold-pressed-oils',
  'ghee-and-honey': 'ghee',
  'oils-ghee-ghee': 'ghee',
  'oils-ghee-honey': 'honey',
  'rice-millets-and-grains': 'millets',
  'flours-breakfast-ready-mixes': 'millets',
  'pickles-and-condiments': 'pickles',
  'snacks-and-sweets': 'snacks',
  'dry-fruits-nuts-and-seeds': 'dry-fruits',
  'pooja-essentials': 'pooja',
  'spices-masalas-and-pantry': 'spices',
  'jaggery-sweeteners': 'jaggery',
  'dals-and-pulses': 'store-staples',
  'store-staples': 'store-staples',
  'oils-ghee-and-honey': 'cold-pressed-oils',
};

export function normalizeCategorySlug(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-');
}

export function canonicalStorefrontRootSlug(category = {}) {
  const slug = normalizeCategorySlug(category?.slug || category?.name);
  if (LAUNCH_STOREFRONT_ROOT_SLUGS.includes(slug)) return slug;
  return LEGACY_ROOT_SLUG_MAP[slug] || null;
}

export function isStorefrontRootCategory(category = {}) {
  if (!category || category.parent_id) return false;
  if (category.is_active === false) return false;
  const slug = normalizeCategorySlug(category.slug);
  return LAUNCH_STOREFRONT_ROOT_SLUGS.includes(slug);
}

/** Root categories for shop chips + nav — launch aisles only, shop tree order. */
export function filterStorefrontRootCategories(categories = []) {
  return listRootCategories(categories)
    .filter(isStorefrontRootCategory)
    .sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0));
}

/** Map any product category to its launch storefront root (for shop grouping). */
export function resolveStorefrontRootCategory(categoryId, categories = []) {
  const cat = findCategoryById(categoryId, categories);
  if (!cat) return null;

  let root = cat;
  // Walk up one level (tree is max 2 deep)
  if (cat.parent_id) {
    root = findCategoryById(cat.parent_id, categories) || cat;
  }

  let canonicalSlug = canonicalStorefrontRootSlug(root);
  if (!canonicalSlug || canonicalSlug === 'store-staples') {
    // Former roots that became children (e.g. millet-flours) map via legacy slug
    canonicalSlug = canonicalStorefrontRootSlug(cat);
  }
  if (!canonicalSlug || canonicalSlug === 'store-staples') return null;

  const match = listRootCategories(categories).find(
    (row) => normalizeCategorySlug(row.slug) === canonicalSlug,
  );
  return match || (isStorefrontRootCategory(root) ? root : null);
}

export function storefrontAisleLabel(rootCategory) {
  return categoryLabel(rootCategory);
}
