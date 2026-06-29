/**
 * Product-level SKU helpers for counter barcodes (one SKU per product, not per variant).
 */

const SKU_MAX_LEN = 32;

function cleanToken(value = '') {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function suggestProductSku(title = '', existingSkus = new Set()) {
  const words = String(title || '')
    .replace(/\(.*?\)/g, ' ')
    .split(/\s+/)
    .map(cleanToken)
    .filter(Boolean);

  let base = '';
  if (words.length >= 2) {
    base = `${words[0]}-${words[1]}`.slice(0, SKU_MAX_LEN);
  } else if (words.length === 1) {
    base = words[0].slice(0, SKU_MAX_LEN);
  } else {
    base = 'PRODUCT';
  }

  const taken = new Set([...existingSkus].map((s) => String(s).toLowerCase()));
  if (!taken.has(base.toLowerCase())) return base;

  for (let i = 2; i < 100; i += 1) {
    const candidate = `${base}-${i}`.slice(0, SKU_MAX_LEN);
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }

  return `${base}-${Date.now().toString(36).slice(-4).toUpperCase()}`.slice(0, SKU_MAX_LEN);
}

export function collectExistingProductSkus(products = []) {
  const set = new Set();
  for (const product of products) {
    const sku = String(product?.sku || '').trim();
    if (sku) set.add(sku.toLowerCase());
  }
  return set;
}

export function assignMissingProductSkus(products = []) {
  const taken = collectExistingProductSkus(products);
  const updates = [];

  for (const product of products) {
    if (String(product?.sku || '').trim()) continue;
    const title = product.title || product.name || 'Product';
    const sku = suggestProductSku(title, taken);
    taken.add(sku.toLowerCase());
    updates.push({ id: product.id, sku, title });
  }

  return updates;
}
