/** Virtual shop category key for the Bundles tab (not a DB category). */
export const BUNDLES_SHOP_CATEGORY_KEY = '__bundles__';

export const BUNDLES_SHOP_PATH = `/shop?category=${BUNDLES_SHOP_CATEGORY_KEY}`;

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
