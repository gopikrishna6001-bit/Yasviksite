/**
 * Yasvik online pack ladders — category-based, not copied from competitors.
 * pack_kg stores kg for weight; litres for oils/ghee/honey (see productStockUtils).
 */

export const YASVIK_PACK_TEMPLATES = {
  /** Dals, pulses, rice, atta, jaggery — 500g through 5kg */
  weight_staple: {
    unit: 'weight',
    packs: [
      { label: '500g', pack_kg: 0.5 },
      { label: '1kg', pack_kg: 1 },
      { label: '2kg', pack_kg: 2 },
      { label: '5kg', pack_kg: 5 },
    ],
  },
  /** Oils, ghee, honey — 500ml through 5L */
  volume_liquid: {
    unit: 'volume',
    packs: [
      { label: '500ml', pack_kg: 0.5 },
      { label: '1L', pack_kg: 1 },
      { label: '2L', pack_kg: 2 },
      { label: '5L', pack_kg: 5 },
    ],
  },
  /** Dry fruits, spices, pickles — 100g through 1kg */
  weight_small: {
    unit: 'weight',
    packs: [
      { label: '100g', pack_kg: 0.1 },
      { label: '250g', pack_kg: 0.25 },
      { label: '500g', pack_kg: 0.5 },
      { label: '1kg', pack_kg: 1 },
    ],
  },
};

const CATEGORY_TEMPLATE_KEY = {
  'dals-and-pulses': 'weight_staple',
  'pulses-and-legumes': 'weight_staple',
  'dals-and-lentils': 'weight_staple',
  'rice-millets-and-grains': 'weight_staple',
  'rice-and-millets': 'weight_staple',
  'staples-and-grains': 'weight_staple',
  'flours-breakfast-ready-mixes': 'weight_staple',
  'breakfast-essentials': 'weight_staple',
  'jaggery-and-sweeteners': 'weight_staple',
  'staples-and-sweeteners': 'weight_staple',
  'oils-ghee-and-honey': 'volume_liquid',
  'cold-pressed-oils': 'volume_liquid',
  ghee: 'volume_liquid',
  honey: 'volume_liquid',
  'dry-fruits-nuts-and-seeds': 'weight_small',
  'seeds-and-superfoods': 'weight_small',
  'spices-masalas-and-pantry': 'weight_small',
  'spices-and-masalas': 'weight_small',
  'pickles-and-condiments': 'weight_small',
  'homemade-pickles': 'weight_small',
  'snacks-and-sweets': 'weight_small',
  'homemade-snacks': 'weight_small',
  'snacks-and-cooking-essentials': 'weight_small',
};

const VOLUME_PRODUCT_PATTERN = /\b(oil|ghee|honey|nectar|sirup|syrup)\b/i;
const STAPLE_PRODUCT_PATTERN = /\b(dal|pappu|rice|rava|atta|flour|sugar|jowar|bajra|ragi|sabudana|vermicelli|semiya|lobia|rajma|chana|gram|peas|toor|moong|urad|masoor)\b/i;

export function resolveProductCategorySlug(product = {}) {
  return String(
    product.category_slug
    || product.category?.slug
    || product.categories?.slug
    || '',
  ).toLowerCase();
}

export function resolvePackTemplateKey(product = {}) {
  const categorySlug = resolveProductCategorySlug(product);
  const slug = String(product.slug || '').toLowerCase();
  const name = String(product.name || product.title || '').toLowerCase();
  const hay = `${slug} ${name}`;

  if (categorySlug && CATEGORY_TEMPLATE_KEY[categorySlug]) {
    const key = CATEGORY_TEMPLATE_KEY[categorySlug];
    if (key === 'volume_liquid') return 'volume_liquid';
    if (key === 'weight_staple') return 'weight_staple';
    return key;
  }

  if (VOLUME_PRODUCT_PATTERN.test(hay) || slug.includes('cold-pressed')) return 'volume_liquid';
  if (/pickle|murukku|mixture|laddu|biscuit|snack/i.test(hay)) return 'weight_small';
  if (STAPLE_PRODUCT_PATTERN.test(hay)) return 'weight_staple';
  if (/almond|cashew|walnut|pista|raisin|dates|nut|seed|pepper|cardamom|clove|spice|masala|powder/i.test(hay)) {
    return 'weight_small';
  }

  return null;
}

export function getPackTemplate(product = {}) {
  const key = resolvePackTemplateKey(product);
  return key ? YASVIK_PACK_TEMPLATES[key] : null;
}

export function isPicklesAndCondimentsCategory(product = {}) {
  const slug = resolveProductCategorySlug(product);
  return slug === 'pickles-and-condiments' || slug === 'homemade-pickles' || /pickle/i.test(String(product.slug || ''));
}

export function buildVariantSkuFromTemplate(productSku, packKg, label, unit = 'weight') {
  const base = String(productSku || '').trim();
  if (!base) return undefined;

  if (unit === 'volume') {
    if (packKg === 0.5) return `${base}-500ML`;
    if (packKg === 1) return `${base}-1L`;
    if (packKg === 2) return `${base}-2L`;
    if (packKg === 5) return `${base}-5L`;
  }

  if (packKg === 1) return `${base}-1KG`;
  if (packKg === 0.5) return `${base}-500G`;
  if (packKg === 0.25) return `${base}-250G`;
  if (packKg === 0.1) return `${base}-100G`;
  if (packKg === 2) return `${base}-2KG`;
  if (packKg === 5) return `${base}-5KG`;
  const compact = String(label || '').replace(/[^a-z0-9]/gi, '').toUpperCase();
  return compact ? `${base}-${compact}` : undefined;
}
