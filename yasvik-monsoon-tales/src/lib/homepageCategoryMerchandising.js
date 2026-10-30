/**
 * Homepage category merchandising — independent of shop tree sort_order.
 * One category database; separate homepage visibility + order.
 */

export const HOMEPAGE_STATUS = {
  ACTIVE: 'active',
  DRAFT: 'draft',
  HIDDEN: 'hidden',
  SEASONAL: 'seasonal',
};

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function nowMs(now = new Date()) {
  const d = now instanceof Date ? now : new Date(now);
  return d.getTime();
}

/** Seasonal window open? Missing bounds = always open when status is seasonal. */
export function isSeasonalWindowOpen(category = {}, now = new Date()) {
  const start = category.seasonal_starts_at ? new Date(category.seasonal_starts_at).getTime() : null;
  const end = category.seasonal_ends_at ? new Date(category.seasonal_ends_at).getTime() : null;
  const t = nowMs(now);
  if (start != null && Number.isFinite(start) && t < start) return false;
  if (end != null && Number.isFinite(end) && t > end) return false;
  return true;
}

export function isHomepageCategoryEligible(category = {}, now = new Date()) {
  if (!category?.id) return false;
  if (category.show_on_homepage !== true) return false;
  const status = String(category.homepage_status || HOMEPAGE_STATUS.ACTIVE).toLowerCase();
  if (status === HOMEPAGE_STATUS.HIDDEN || status === HOMEPAGE_STATUS.DRAFT) return false;
  if (status === HOMEPAGE_STATUS.SEASONAL || category.is_seasonal_category) {
    return isSeasonalWindowOpen(category, now);
  }
  return status === HOMEPAGE_STATUS.ACTIVE || status === '';
}

export function homepageDisplayLabel(category = {}) {
  return String(
    category.homepage_label
      || category.emotional_title
      || category.name
      || 'Category',
  ).trim();
}

export function homepageDisplayImage(category = {}) {
  return String(category.homepage_image_override || category.cover_image || category.displayImage || '').trim();
}

export function homepageDisplayDescription(category = {}) {
  return String(category.homepage_description || category.short_intro || category.description || '').trim();
}

export function homepageCtaLabel(category = {}) {
  return String(category.homepage_cta_label || 'Shop').trim() || 'Shop';
}

export function homepageCtaUrl(category = {}, fallbackHref = '/shop') {
  const custom = String(category.homepage_cta_url || '').trim();
  return custom || fallbackHref;
}

function sortByHomepageOrder(a, b) {
  const orderDiff = toNumber(a.homepage_order, 1000) - toNumber(b.homepage_order, 1000);
  if (orderDiff !== 0) return orderDiff;
  return homepageDisplayLabel(a).localeCompare(homepageDisplayLabel(b));
}

/** Eligible homepage categories sorted by marketing order. */
export function listHomepageCategories(categories = [], now = new Date()) {
  return (Array.isArray(categories) ? categories : [])
    .filter((cat) => !cat.parent_id && isHomepageCategoryEligible(cat, now))
    .sort(sortByHomepageOrder);
}

export function listHomepageHeroCategories(categories = [], now = new Date()) {
  return listHomepageCategories(categories, now).filter((cat) => cat.is_hero_category === true);
}

export function listHomepageFeaturedCategories(categories = [], limit = 3, now = new Date()) {
  const featured = listHomepageCategories(categories, now)
    .filter((cat) => cat.is_featured_category === true && cat.is_hero_category !== true);
  return featured.slice(0, Math.max(0, Number(limit) || 3));
}

/**
 * Admin preview helper: build a tile model without requiring live images.
 */
export function buildHomepageTilePreview(category = {}, shopHref = '/shop') {
  return {
    id: category.id,
    label: homepageDisplayLabel(category),
    description: homepageDisplayDescription(category),
    imageUrl: homepageDisplayImage(category),
    ctaLabel: homepageCtaLabel(category),
    href: homepageCtaUrl(category, shopHref),
    isHero: category.is_hero_category === true,
    isFeatured: category.is_featured_category === true,
    isSeasonal: category.is_seasonal_category === true,
    status: category.homepage_status || HOMEPAGE_STATUS.ACTIVE,
    homepageOrder: toNumber(category.homepage_order, 1000),
    showOnHomepage: category.show_on_homepage === true,
  };
}

/** Reorder helper for admin drag/save — assigns homepage_order in steps of 10. */
export function assignHomepageOrder(orderedIds = []) {
  return (Array.isArray(orderedIds) ? orderedIds : []).map((id, index) => ({
    id,
    homepage_order: (index + 1) * 10,
  }));
}
