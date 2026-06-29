export const RELATION_TYPES = {
  FREQUENTLY_BOUGHT: 'frequently_bought',
  COMPLETE_BASKET: 'complete_basket',
  SIMILAR: 'similar',
  RECIPE_PAIRING: 'recipe_pairing',
};

export const BUNDLE_DISPLAY_LOCATIONS = ['home', 'category', 'cart', 'product'];

export function slugifyBundleName(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function parseRelatedProductNames(raw = '') {
  return String(raw || '')
    .split(/[,;|]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function buildProductLookupMaps(products = []) {
  const bySku = new Map();
  const bySlug = new Map();
  const byTitle = new Map();
  const byCode = new Map();

  products.forEach((product) => {
    const id = product.id;
    const sku = String(product.sku || '').trim().toLowerCase();
    const slug = String(product.slug || '').trim().toLowerCase();
    const title = String(product.title || product.name || '').trim().toLowerCase();
    const code = String(product.product_code || '').trim().toLowerCase();

    if (sku) bySku.set(sku, id);
    if (slug) bySlug.set(slug, id);
    if (title) byTitle.set(title, id);
    if (code) byCode.set(code, id);
  });

  return { bySku, bySlug, byTitle, byCode };
}

export function resolveProductIdFromRef(ref, maps) {
  const text = String(ref || '').trim();
  if (!text) return null;

  const lower = text.toLowerCase();
  if (maps.bySku.has(lower)) return maps.bySku.get(lower);
  if (maps.byCode.has(lower)) return maps.byCode.get(lower);

  const slug = slugifyBundleName(text);
  if (maps.bySlug.has(slug)) return maps.bySlug.get(slug);

  if (maps.byTitle.has(lower)) return maps.byTitle.get(lower);

  for (const [title, id] of maps.byTitle.entries()) {
    if (title.includes(lower) || lower.includes(title)) return id;
  }

  return null;
}

export function orderProductsByIds(products = [], ids = []) {
  const byId = new Map(products.map((product) => [product.id, product]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
}
