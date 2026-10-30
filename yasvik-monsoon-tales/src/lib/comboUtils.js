/** Virtual shop category key for the Bundles tab (not a DB category). */
export const BUNDLES_SHOP_CATEGORY_KEY = '__bundles__';

/** Canonical customer-facing combos collection. */
export const BUNDLES_SHOP_PATH = '/shop/combos';

/** Query-param alias still accepted for older links. */
export const BUNDLES_SHOP_QUERY_PATH = `/shop?category=${BUNDLES_SHOP_CATEGORY_KEY}`;

export function isBundlesShopRoute(categorySlug, queryCategory) {
  const slug = String(categorySlug || '').trim().toLowerCase();
  if (slug === 'combos' || slug === 'bundles' || slug === 'value-packs') return true;
  return queryCategory === BUNDLES_SHOP_CATEGORY_KEY;
}

function comboTimestamp(combo) {
  const raw = combo?.created_date || combo?.updated_date || combo?.created_at || combo?.updated_at || 0;
  const time = new Date(raw).getTime();
  return Number.isFinite(time) ? time : 0;
}

export function isComboFeatured(combo) {
  return combo?.is_featured === true || combo?.is_featured === 'true' || combo?.is_featured === 1;
}

/** Featured bundles first, then newest. */
export function sortCombosFeaturedFirst(combos = []) {
  return [...combos].sort((a, b) => {
    const featuredDelta = Number(isComboFeatured(b)) - Number(isComboFeatured(a));
    if (featuredDelta !== 0) return featuredDelta;
    return comboTimestamp(b) - comboTimestamp(a);
  });
}

export function getFeaturedCombos(combos = [], limit = 3) {
  return sortCombosFeaturedFirst(combos).filter(isComboFeatured).slice(0, limit);
}

/** Sellable catalogue combo / gift-box products (not marketing `combos` rows). */
export function isShopComboProduct(product = {}) {
  const kind = String(product?.product_kind || '').trim();
  if (kind === 'bundle_combo' || kind === 'gift_box') return true;
  const group = String(product?.product_group || '').trim().toLowerCase();
  if (group === 'packaged_combo' || group === 'combo') return true;
  const slug = String(product?.slug || '').toLowerCase();
  if (slug.includes('-combo') || slug.endsWith('-bundle')) return true;
  return false;
}

/** Combos first, then individuals — preserves relative order within each group. */
export function prioritizeShopCombos(products = []) {
  const combos = [];
  const individuals = [];
  (Array.isArray(products) ? products : []).forEach((product) => {
    if (isShopComboProduct(product)) combos.push(product);
    else individuals.push(product);
  });
  return [...combos, ...individuals];
}

export function isComboAisleSubsection(subsection = {}) {
  const label = String(subsection?.label || '').toLowerCase();
  const slug = String(subsection?.slug || subsection?.id || '').toLowerCase();
  return label.includes('combo') || label.includes('bundle') || slug.includes('combo') || slug.includes('bundle');
}

/** Within an aisle, show Combos subsections before other shelves. */
export function prioritizeComboSubsections(sections = []) {
  return (Array.isArray(sections) ? sections : []).map((section) => {
    const subsections = [...(section.subsections || [])].sort((a, b) => {
      const aCombo = Number(isComboAisleSubsection(a));
      const bCombo = Number(isComboAisleSubsection(b));
      if (aCombo !== bCombo) return bCombo - aCombo;
      return (a.sortOrder || 0) - (b.sortOrder || 0) || String(a.label || '').localeCompare(String(b.label || ''));
    });
    return {
      ...section,
      products: prioritizeShopCombos(section.products || []),
      subsections: subsections.map((sub) => ({
        ...sub,
        products: prioritizeShopCombos(sub.products || []),
      })),
    };
  });
}
