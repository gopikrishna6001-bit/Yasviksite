const FREQUENT_KEY = 'yasvik_pos_frequent';
const FAVORITES_KEY = 'yasvik_pos_favorites';

function readMap(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeMap(key, map) {
  try {
    localStorage.setItem(key, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function cartItemKey(productId, variantSku, variantLabel, customKey) {
  if (customKey) return customKey;
  return `${productId || 'custom'}__${variantSku || variantLabel || 'default'}`;
}

export function recordFrequentSale(items = []) {
  const map = readMap(FREQUENT_KEY);
  const now = Date.now();
  for (const item of items) {
    if (item.type === 'custom') continue;
    const key = cartItemKey(item.productId, item.sku, item.variant, item.key);
    map[key] = {
      key,
      productId: item.productId,
      title: item.title,
      variant: item.variant,
      sku: item.sku,
      count: (map[key]?.count || 0) + (item.qty || 1),
      lastAt: now,
    };
  }
  writeMap(FREQUENT_KEY, map);
}

export function getFrequentItems(limit = 16) {
  const map = readMap(FREQUENT_KEY);
  return Object.values(map)
    .sort((a, b) => (b.lastAt || 0) - (a.lastAt || 0) || (b.count || 0) - (a.count || 0))
    .slice(0, limit);
}

export function getFavoriteKeys() {
  const map = readMap(FAVORITES_KEY);
  return Object.keys(map);
}

export function isFavorite(key) {
  const map = readMap(FAVORITES_KEY);
  return Boolean(map[key]);
}

export function toggleFavorite(key, meta = {}) {
  const map = readMap(FAVORITES_KEY);
  if (map[key]) {
    delete map[key];
  } else {
    map[key] = { ...meta, key, pinnedAt: Date.now() };
  }
  writeMap(FAVORITES_KEY, map);
  return Boolean(map[key]);
}

export function getFavoriteItems(limit = 24) {
  const map = readMap(FAVORITES_KEY);
  return Object.values(map)
    .sort((a, b) => (b.pinnedAt || 0) - (a.pinnedAt || 0))
    .slice(0, limit);
}
