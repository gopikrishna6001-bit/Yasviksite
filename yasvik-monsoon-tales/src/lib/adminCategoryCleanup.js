import { findCategoryById, listChildCategories, listRootCategories } from '@/lib/categoryTree';
import {
  LAUNCH_STOREFRONT_ROOT_SLUGS,
  LEGACY_ROOT_SLUG_MAP,
  isStorefrontRootCategory,
  normalizeCategorySlug,
} from '@/lib/storefrontCategories';

export function countProductsByCategory(products = []) {
  const counts = new Map();
  (Array.isArray(products) ? products : []).forEach((product) => {
    if (!product?.category_id) return;
    counts.set(product.category_id, (counts.get(product.category_id) || 0) + 1);
  });
  return counts;
}

/** True when category sits outside the launch parent-aisle tree. */
export function isLegacyCategory(category = {}, categories = []) {
  if (!category?.id) return false;
  const root = category.parent_id
    ? findCategoryById(category.parent_id, categories)
    : category;
  if (!root) return true;
  return !isStorefrontRootCategory(root);
}

export function splitLaunchAndLegacyCategories(categories = []) {
  const launch = [];
  const legacy = [];
  (Array.isArray(categories) ? categories : []).forEach((cat) => {
    if (isLegacyCategory(cat, categories)) legacy.push(cat);
    else launch.push(cat);
  });
  return { launch, legacy };
}

function categoryRoot(category = {}, categories = []) {
  if (!category?.id) return null;
  if (!category.parent_id) return category;
  return findCategoryById(category.parent_id, categories) || category;
}

function findLaunchSubcategoryMatch(category = {}, targetRoot = {}, categories = []) {
  const label = String(category.emotional_title || category.name || '').trim().toLowerCase();
  if (!label) return null;
  return listChildCategories(targetRoot.id, categories).find((sub) => {
    const subLabel = String(sub.emotional_title || sub.name || '').trim().toLowerCase();
    return subLabel === label;
  }) || null;
}

/** Resolve launch category id for a product currently on a legacy row. */
export function resolveLaunchCategoryId(categoryId, categories = []) {
  const cat = findCategoryById(categoryId, categories);
  if (!cat) return null;

  const root = categoryRoot(cat, categories);
  const rootSlug = normalizeCategorySlug(root?.slug || root?.name);
  if (LAUNCH_STOREFRONT_ROOT_SLUGS.includes(rootSlug)) {
    return cat.id;
  }

  const targetRootSlug = LEGACY_ROOT_SLUG_MAP[rootSlug];
  if (!targetRootSlug) return null;

  const targetRoot = listRootCategories(categories).find(
    (row) => normalizeCategorySlug(row.slug) === targetRootSlug,
  );
  if (!targetRoot) return null;

  if (cat.parent_id && cat.parent_id === root.id && cat.id !== root.id) {
    const matchedSub = findLaunchSubcategoryMatch(cat, targetRoot, categories);
    return matchedSub?.id || targetRoot.id;
  }

  return targetRoot.id;
}

export function planLegacyCategoryDeletes(categories = [], productCounts = new Map()) {
  const deletable = [];
  const blocked = [];

  const countFor = (id) => productCounts.get(id) || 0;
  const childRows = (parentId) => listChildCategories(parentId, categories);

  categories.forEach((cat) => {
    if (!isLegacyCategory(cat, categories)) return;

    const direct = countFor(cat.id);
    const children = childRows(cat.id);
    const childProductTotal = children.reduce((sum, child) => sum + countFor(child.id), 0);

    if (direct > 0 || childProductTotal > 0) {
      blocked.push({
        category: cat,
        productCount: direct + childProductTotal,
      });
      return;
    }

    children.forEach((child) => {
      if (countFor(child.id) === 0) deletable.push(child);
    });
    deletable.push(cat);
  });

  const seen = new Set();
  return {
    deletable: deletable.filter((cat) => {
      if (seen.has(cat.id)) return false;
      seen.add(cat.id);
      return true;
    }),
    blocked,
  };
}
