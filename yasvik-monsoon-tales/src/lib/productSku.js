/**
 * Product-level SKU helpers for counter barcodes (one short code per product).
 * Format: YAS-001, YAS-002, … — compact for thermal labels and USB scanners.
 */

const SKU_MAX_LEN = 32;
export const YAS_SKU_PREFIX = 'YAS';
const YAS_SKU_PAD = 3;

export function formatYasProductSku(sequence) {
  const n = Math.max(1, Number(sequence) || 1);
  return `${YAS_SKU_PREFIX}-${String(n).padStart(YAS_SKU_PAD, '0')}`;
}

/** Parse YAS-001 (or yas-1) → 1; returns null if not a Yasvik sequence SKU. */
export function parseYasProductSkuNumber(value = '') {
  const match = String(value || '')
    .trim()
    .toUpperCase()
    .match(/^YAS-(\d+)$/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function isYasProductSku(value = '') {
  return parseYasProductSkuNumber(value) != null;
}

/** Normalize SKU for storage and barcodes. Yasvik codes → YAS-00N; legacy codes uppercased. */
export function normalizeProductSku(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const yasNumber = parseYasProductSkuNumber(raw);
  if (yasNumber != null) return formatYasProductSku(yasNumber);

  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, SKU_MAX_LEN);
}

export function collectYasSkuNumbers(products = []) {
  const numbers = new Set();
  for (const product of products) {
    const fromSku = parseYasProductSkuNumber(product?.sku);
    if (fromSku != null) numbers.add(fromSku);
    const fromCode = parseYasProductSkuNumber(product?.product_code);
    if (fromCode != null) numbers.add(fromCode);
  }
  return numbers;
}

export function collectExistingProductSkus(products = []) {
  const set = new Set();
  for (const product of products) {
    const sku = String(product?.sku || '').trim();
    if (sku) set.add(sku.toLowerCase());
  }
  return set;
}

export function nextYasProductSkuNumber(products = [], reserved = new Set()) {
  const used = collectYasSkuNumbers(products);
  for (const n of reserved) {
    if (Number.isFinite(n) && n > 0) used.add(n);
  }
  let candidate = 1;
  while (used.has(candidate)) candidate += 1;
  return candidate;
}

/** Suggest the next unused YAS-00N code. Pass full product catalog when possible. */
export function suggestProductSku(_title = '', catalogProducts = []) {
  const products = Array.isArray(catalogProducts) ? catalogProducts : [];
  return formatYasProductSku(nextYasProductSkuNumber(products));
}

export function assignMissingProductSkus(products = []) {
  const taken = collectExistingProductSkus(products);
  const reserved = new Set();
  const updates = [];

  for (const product of products) {
    if (String(product?.sku || '').trim()) continue;
    const n = nextYasProductSkuNumber(products, reserved);
    reserved.add(n);
    const sku = formatYasProductSku(n);
    taken.add(sku.toLowerCase());
    updates.push({
      id: product.id,
      sku,
      title: product.title || product.name || 'Product',
    });
  }

  return updates;
}

/** Stable sort for bulk renumber — title A→Z, then id. */
export function sortProductsForSkuRenumber(products = []) {
  return [...products].sort((a, b) => {
    const titleA = String(a.title || a.name || '').trim().toLowerCase();
    const titleB = String(b.title || b.name || '').trim().toLowerCase();
    if (titleA !== titleB) return titleA.localeCompare(titleB);
    return String(a.id || '').localeCompare(String(b.id || ''));
  });
}

/** Renumber every product to YAS-001, YAS-002, … (overwrites existing SKUs). */
export function reassignAllProductSkus(products = []) {
  return sortProductsForSkuRenumber(products).map((product, index) => {
    const sku = formatYasProductSku(index + 1);
    return {
      id: product.id,
      sku,
      product_code: sku,
      title: product.title || product.name || 'Product',
      previousSku: String(product.sku || '').trim() || null,
    };
  });
}
