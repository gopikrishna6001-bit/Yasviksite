import {
  buildProductSavePayload,
  normalizeEditorList,
  productToEditorForm,
} from '@/lib/adminProductFormUtils';
import { isPricingMetaVariant } from '@/lib/productPricingMeta';
import { productToQuickOpsDraft } from '@/lib/productQuickOpsUtils';
import { usesBulkMeasureType } from '@/lib/stockMeasureTypes';
import { hasTeluguScript } from '@/lib/teluguProductNames';

const SPREADSHEET_HEADER_ALIASES = {
  telugu: 'local_name',
  telugu_name: 'local_name',
  name_te: 'local_name',
  product_name_te: 'local_name',
  category: 'category_name',
  category_title: 'category_name',
};

const LOCAL_NAME_PLACEHOLDERS = new Set([
  'yasvik spl',
  'yasvik special',
  'yasvik',
  'yasvik quality assured',
]);

/** Workbook category labels → canonical catalog category name. */
const CATEGORY_NAME_ALIASES = {
  'dals and pulses': 'Dals & Pulses',
  'pulses and legumes': 'Dals & Pulses',
  'pulses & legumes': 'Dals & Pulses',
  'dals & lentils': 'Dals & Pulses',
  'flours breakfast and ready mixes': 'Flours, Breakfast & Ready Mixes',
  'flours, breakfast & ready mixes': 'Flours, Breakfast & Ready Mixes',
  'breakfast essentials': 'Flours, Breakfast & Ready Mixes',
  'staples and grains': 'Flours, Breakfast & Ready Mixes',
  'staples & grains': 'Flours, Breakfast & Ready Mixes',
  'rice and millets': 'Rice, Millets & Grains',
  'rice & millets': 'Rice, Millets & Grains',
  'rice millets and grains': 'Rice, Millets & Grains',
  'rice, millets & grains': 'Rice, Millets & Grains',
  'spices and masalas': 'Spices, Masalas & Pantry',
  'spices & masalas': 'Spices, Masalas & Pantry',
  'spices, masalas & pantry': 'Spices, Masalas & Pantry',
  'snacks and cooking essentials': 'Snacks & Sweets',
  'snacks & cooking essentials': 'Snacks & Sweets',
  'homemade snacks': 'Snacks & Sweets',
  'snacks & sweets': 'Snacks & Sweets',
  'seeds and superfoods': 'Dry Fruits, Nuts & Seeds',
  'seeds & superfoods': 'Dry Fruits, Nuts & Seeds',
  'dry fruits nuts and seeds': 'Dry Fruits, Nuts & Seeds',
  'dry fruits, nuts & seeds': 'Dry Fruits, Nuts & Seeds',
  'cold pressed oils': 'Oils, Ghee & Honey',
  'oils ghee and honey': 'Oils, Ghee & Honey',
  'oils, ghee & honey': 'Oils, Ghee & Honey',
  'ghee': 'Oils, Ghee & Honey',
  'honey': 'Oils, Ghee & Honey',
  'homemade pickles': 'Pickles & Condiments',
  'pickles and condiments': 'Pickles & Condiments',
  'pickles & condiments': 'Pickles & Condiments',
  'staples and sweeteners': 'Jaggery & Sweeteners',
  'staples & sweeteners': 'Jaggery & Sweeteners',
  'sugar and sweeteners': 'Jaggery & Sweeteners',
  'sugar & sweeteners': 'Jaggery & Sweeteners',
  'jaggery and sweeteners': 'Jaggery & Sweeteners',
  'jaggery & sweeteners': 'Jaggery & Sweeteners',
  'organic essentials': 'Natural Care',
  'natural care': 'Natural Care',
};

/** Full product export columns — keep `id` unchanged when re-importing. */
export const PRODUCT_SPREADSHEET_COLUMNS = [
  { key: 'id', label: 'id', hint: 'Do not edit — required to match product on import' },
  { key: 'product_code', label: 'product_code', hint: 'Internal product code' },
  { key: 'title', label: 'title', hint: 'Product name (English)' },
  { key: 'slug', label: 'slug', hint: 'URL slug' },
  { key: 'sku', label: 'sku', hint: 'Counter barcode SKU' },
  { key: 'local_name', label: 'local_name', hint: 'Telugu / local name' },
  { key: 'category_id', label: 'category_id', hint: 'Category UUID' },
  { key: 'category_name', label: 'category_name', hint: 'Reference only — or use instead of category_id' },
  { key: 'journey_id', label: 'journey_id', hint: 'Linked journey UUID' },
  { key: 'person_id', label: 'person_id', hint: 'Linked farmer/person UUID' },
  { key: 'region_id', label: 'region_id', hint: 'Region UUID' },
  { key: 'stock_measure_type', label: 'stock_measure_type', hint: 'kg | L | units' },
  { key: 'stock', label: 'stock', hint: 'Bulk stock (kg / L / units)' },
  { key: 'variant_stocks', label: 'variant_stocks', hint: 'Quick stock: 500g=12; 1kg=8' },
  { key: 'variants_json', label: 'variants_json', hint: 'Pack sizes JSON — label, sku, pack_kg, price, stock' },
  { key: 'price', label: 'price', hint: 'Default selling price (₹)' },
  { key: 'compare_price', label: 'compare_price', hint: 'MRP / compare-at (₹)' },
  { key: 'selling_price_per_kg', label: 'selling_price_per_kg', hint: '₹/kg rate for pack pricing' },
  { key: 'price_inflate_percent', label: 'price_inflate_percent', hint: 'MRP inflate % over sell rate' },
  { key: 'small_pack_margin_rs', label: 'small_pack_margin_rs', hint: 'Extra ₹ on sub-1kg packs' },
  { key: 'low_stock_threshold', label: 'low_stock_threshold', hint: 'Low-stock alert threshold' },
  { key: 'weight_grams', label: 'weight_grams', hint: 'Default pack weight (grams)' },
  { key: 'short_description', label: 'short_description', hint: 'Short blurb' },
  { key: 'story_description', label: 'story_description', hint: 'Full story / description' },
  { key: 'processing_method', label: 'processing_method', hint: 'How it is processed' },
  { key: 'best_for', label: 'best_for', hint: 'Best for / usage' },
  { key: 'storage_note', label: 'storage_note', hint: 'Storage guidance' },
  { key: 'yasvik_mark', label: 'yasvik_mark', hint: 'Yasvik mark copy' },
  { key: 'delivery_card', label: 'delivery_card', hint: 'Delivery card text' },
  { key: 'pack_info_card', label: 'pack_info_card', hint: 'Pack info card text' },
  { key: 'sourcing_card', label: 'sourcing_card', hint: 'Sourcing card text' },
  { key: 'seo_title', label: 'seo_title', hint: 'SEO page title' },
  { key: 'seo_description', label: 'seo_description', hint: 'SEO meta description' },
  { key: 'seo_keywords', label: 'seo_keywords', hint: 'SEO keywords (comma-separated)' },
  { key: 'hero_image', label: 'hero_image', hint: 'Main product image URL' },
  { key: 'hero_video', label: 'hero_video', hint: 'Hero video URL' },
  { key: 'images', label: 'images', hint: 'Gallery URLs — pipe | separated' },
  { key: 'hover_media', label: 'hover_media', hint: 'Hover media URLs — pipe | separated' },
  { key: 'purity_badges', label: 'purity_badges', hint: 'Badge labels — pipe | separated' },
  { key: 'recipe_ids', label: 'recipe_ids', hint: 'Recipe IDs — newline or comma' },
  { key: 'recipe_titles', label: 'recipe_titles', hint: 'Recipe titles — newline or comma' },
  { key: 'recipe_links_json', label: 'recipe_links_json', hint: 'JSON array of recipe link objects' },
  { key: 'is_published', label: 'is_published', hint: 'yes | no' },
  { key: 'is_featured', label: 'is_featured', hint: 'yes | no' },
  { key: 'featured_in_hero', label: 'featured_in_hero', hint: 'yes | no' },
  { key: 'sort_order', label: 'sort_order', hint: 'Lower = shown first within group' },
  { key: 'product_group', label: 'product_group', hint: 'Group label, e.g. Oils, Ghee, Rice' },
  { key: 'group_sort_order', label: 'group_sort_order', hint: 'Group sequence in category (lower = first)' },
  { key: 'harvest_date', label: 'harvest_date', hint: 'YYYY-MM-DD' },
  { key: 'batch_tested_at', label: 'batch_tested_at', hint: 'YYYY-MM-DD' },
];

const COLUMN_KEYS = PRODUCT_SPREADSHEET_COLUMNS.map((col) => col.key);
const READ_ONLY_COMPARE_KEYS = new Set(['id', 'category_name']);

function escapeCsvField(value) {
  const text = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || (char === '\r' && next === '\n')) {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      if (char === '\r') i += 1;
    } else if (char !== '\r') {
      field += char;
    }
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function normalizeCategoryKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function canonicalCategoryName(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  return CATEGORY_NAME_ALIASES[normalizeCategoryKey(text)] || text;
}

export function parseSeoKeywordsMeta(raw = '') {
  const parts = String(raw || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 3) {
    return { telugu: '', categoryName: '' };
  }

  const telugu = hasTeluguScript(parts[1]) ? parts[1] : '';
  const yasvikIndex = parts.findIndex((part) => /^yasvik$/i.test(part));
  const categoryParts = yasvikIndex > 2
    ? parts.slice(2, yasvikIndex)
    : parts.slice(2, Math.min(parts.length, 4));
  const categoryName = canonicalCategoryName(categoryParts.join(', '));

  return { telugu, categoryName };
}

function isPlaceholderLocalName(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return true;
  if (LOCAL_NAME_PLACEHOLDERS.has(text)) return true;
  return !hasTeluguScript(text) && text.length <= 16 && /yasvik/i.test(text);
}

export function coalesceSpreadsheetLocalName(row = {}) {
  const candidates = [
    row.local_name,
    row.telugu,
    row.telugu_name,
    row.name_te,
  ]
    .map((value) => String(value ?? '').trim())
    .filter(Boolean);

  const preferred = candidates.find((value) => hasTeluguScript(value) && !isPlaceholderLocalName(value));
  if (preferred) return preferred;

  const seoMeta = parseSeoKeywordsMeta(row.seo_keywords);
  if (seoMeta.telugu) return seoMeta.telugu;

  const fallback = candidates.find((value) => !isPlaceholderLocalName(value));
  return fallback || '';
}

function resolveSpreadsheetCategoryName(row = {}) {
  const direct = canonicalCategoryName(row.category_name);
  if (direct) return direct;

  const seoMeta = parseSeoKeywordsMeta(row.seo_keywords);
  return seoMeta.categoryName || '';
}

function parseBoolean(value) {
  const text = String(value ?? '').trim().toLowerCase();
  if (!text) return null;
  if (['yes', 'y', 'true', '1', 'published', 'live'].includes(text)) return true;
  if (['no', 'n', 'false', '0', 'draft', 'hidden'].includes(text)) return false;
  return null;
}

function normalizeMeasureType(value) {
  const text = String(value || '').trim();
  if (text === 'L' || text.toLowerCase() === 'l' || text.toLowerCase() === 'litre' || text.toLowerCase() === 'liter') {
    return 'L';
  }
  if (text.toLowerCase() === 'units' || text.toLowerCase() === 'unit' || text.toLowerCase() === 'pcs') {
    return 'units';
  }
  if (text.toLowerCase() === 'kg' || text.toLowerCase() === 'kgs') return 'kg';
  return null;
}

function serializePipeList(value) {
  return normalizeEditorList(value).join(' | ');
}

function parsePipeList(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return [];
  if (text.startsWith('[')) {
    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      /* fall through */
    }
  }
  return text.split('|').map((part) => part.trim()).filter(Boolean);
}

function serializeMultilineText(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join('\n');
  return String(value ?? '');
}

function serializeVariantsForExport(variants = []) {
  const list = (variants || [])
    .filter((variant) => variant && typeof variant === 'object' && !isPricingMetaVariant(variant))
    .map((variant) => ({
      label: variant.label || '',
      sku: variant.sku || '',
      pack_kg: variant.pack_kg ?? '',
      price: variant.price ?? '',
      compare_price: variant.compare_price ?? '',
      stock: variant.stock ?? variant.visible_stock_units ?? '',
      notes: variant.notes || '',
    }));
  return list.length ? JSON.stringify(list) : '';
}

function parseVariantsJson(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return [];
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error('variants_json must be a JSON array');
  return parsed
    .filter((variant) => variant && typeof variant === 'object')
    .map((variant) => ({
      label: String(variant.label || '').trim(),
      sku: String(variant.sku || '').trim(),
      pack_kg: variant.pack_kg ?? '',
      price: variant.price ?? '',
      compare_price: variant.compare_price ?? '',
      stock: variant.stock ?? variant.visible_stock_units ?? '',
      notes: variant.notes || '',
      image_urls: Array.isArray(variant.image_urls) ? variant.image_urls : [],
    }))
    .filter((variant) => variant.label);
}

function formatVariantStocksForExport(draft) {
  if (usesBulkMeasureType(draft.stock_measure_type) || !draft.variants?.length) return '';
  return draft.variants
    .map((variant) => {
      const key = variant.key || variant.label;
      const qty = draft.variantStocks?.[key] ?? variant.stock ?? 0;
      return `${key}=${qty}`;
    })
    .join('; ');
}

function parseVariantStocks(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return null;

  if (text.startsWith('{')) {
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch {
      /* fall through */
    }
  }

  const result = {};
  text.split(/[;|]/).forEach((part) => {
    const segment = part.trim();
    if (!segment) return;
    const eq = segment.indexOf('=');
    if (eq <= 0) return;
    const key = segment.slice(0, eq).trim();
    const value = segment.slice(eq + 1).trim();
    if (key) result[key] = value;
  });

  return Object.keys(result).length ? result : null;
}

function resolveCategoryId(row, categories = []) {
  const direct = String(row.category_id || '').trim();
  if (direct) return direct;

  const name = resolveSpreadsheetCategoryName(row);
  if (!name) return '';

  const normalizedTarget = normalizeCategoryKey(name);
  const match = categories.find((category) => {
    const candidates = [category.name, category.emotional_title, category.slug]
      .filter(Boolean)
      .flatMap((value) => [String(value).trim(), canonicalCategoryName(value)])
      .map((value) => normalizeCategoryKey(value));
    return candidates.includes(normalizedTarget);
  });

  return match?.id || '';
}

function spreadsheetValuesEqual(a, b) {
  return String(a ?? '').trim() === String(b ?? '').trim();
}

function rowHasImportableFields(row) {
  return Object.keys(row).some((key) => !READ_ONLY_COMPARE_KEYS.has(key) && COLUMN_KEYS.includes(key));
}

function isSpreadsheetRowChanged(product, row, categories = []) {
  const current = productToSpreadsheetRow(product, categories);
  const keys = Object.keys(row).filter((key) => COLUMN_KEYS.includes(key) && !READ_ONLY_COMPARE_KEYS.has(key));
  return keys.some((key) => !spreadsheetValuesEqual(row[key], current[key]));
}

function hasRowField(row, key) {
  return Object.prototype.hasOwnProperty.call(row, key);
}

function applyVariantStocks(form, variantStocks) {
  if (!variantStocks || !form.variants?.length) return;
  form.variants = form.variants.map((variant) => {
    const key = variant.sku || variant.label;
    if (variantStocks[key] === undefined) return variant;
    return { ...variant, stock: Number(variantStocks[key]) || 0 };
  });
}

export function productToSpreadsheetRow(product = {}, categories = []) {
  const form = productToEditorForm(product);
  const draft = productToQuickOpsDraft(product);
  const category = categories.find((item) => item.id === product.category_id);
  const bulkByMeasure = usesBulkMeasureType(draft.stock_measure_type);
  const showBulkStock = bulkByMeasure || (!bulkByMeasure && draft.variants.length === 0);

  return {
    id: product.id || '',
    product_code: form.product_code || '',
    title: form.title || '',
    slug: form.slug || '',
    sku: form.sku || '',
    local_name: form.local_name || product.telugu_name || '',
    category_id: form.category_id || '',
    category_name: category?.emotional_title || category?.name || '',
    journey_id: form.journey_id || '',
    person_id: form.person_id || '',
    region_id: form.region_id || '',
    stock_measure_type: form.stock_measure_type || 'kg',
    stock: showBulkStock ? form.stock : '',
    variant_stocks: formatVariantStocksForExport(draft),
    variants_json: serializeVariantsForExport(form.variants),
    price: form.price ?? '',
    compare_price: product.compare_price ?? product.discount_price ?? '',
    selling_price_per_kg: form.selling_price_per_kg ?? '',
    price_inflate_percent: form.price_inflate_percent ?? '',
    small_pack_margin_rs: form.small_pack_margin_rs ?? '',
    low_stock_threshold: form.low_stock_threshold ?? 10,
    weight_grams: product.weight_grams ?? '',
    short_description: form.short_description || '',
    story_description: form.story_description || '',
    processing_method: form.processing_method || '',
    best_for: form.best_for || '',
    storage_note: form.storage_note || '',
    yasvik_mark: form.yasvik_mark || '',
    delivery_card: form.delivery_card || '',
    pack_info_card: form.pack_info_card || '',
    sourcing_card: form.sourcing_card || '',
    seo_title: form.seo_title || '',
    seo_description: form.seo_description || '',
    seo_keywords: form.seo_keywords || '',
    hero_image: form.hero_image || '',
    hero_video: form.hero_video || '',
    images: serializePipeList(form.images),
    hover_media: serializePipeList(form.hover_media),
    purity_badges: serializePipeList(form.purity_badges),
    recipe_ids: serializeMultilineText(form.recipe_ids),
    recipe_titles: serializeMultilineText(form.recipe_titles),
    recipe_links_json: form.recipe_links?.length ? JSON.stringify(form.recipe_links) : '',
    is_published: form.is_published ? 'yes' : 'no',
    is_featured: form.is_featured ? 'yes' : 'no',
    featured_in_hero: form.featured_in_hero ? 'yes' : 'no',
    sort_order: form.sort_order ?? 0,
    product_group: form.product_group || '',
    group_sort_order: form.group_sort_order ?? 0,
    harvest_date: form.harvest_date || '',
    batch_tested_at: form.batch_tested_at || '',
  };
}

export function buildSpreadsheetImportPayload(product = {}, row = {}, categories = []) {
  const form = productToEditorForm(product);

  if (hasRowField(row, 'product_code')) form.product_code = String(row.product_code ?? '');
  if (hasRowField(row, 'title')) form.title = String(row.title ?? '');
  if (hasRowField(row, 'slug')) form.slug = String(row.slug ?? '');
  if (hasRowField(row, 'sku')) form.sku = String(row.sku ?? '');
  if (hasRowField(row, 'local_name') || hasRowField(row, 'telugu') || hasRowField(row, 'telugu_name') || hasRowField(row, 'seo_keywords')) {
    form.local_name = coalesceSpreadsheetLocalName(row);
  }

  if (
    hasRowField(row, 'category_id')
    || hasRowField(row, 'category_name')
    || hasRowField(row, 'category')
    || hasRowField(row, 'seo_keywords')
  ) {
    form.category_id = resolveCategoryId(row, categories) || form.category_id;
  }

  if (hasRowField(row, 'journey_id')) form.journey_id = String(row.journey_id ?? '');
  if (hasRowField(row, 'person_id')) form.person_id = String(row.person_id ?? '');
  if (hasRowField(row, 'region_id')) form.region_id = String(row.region_id ?? '');

  const measureType = hasRowField(row, 'stock_measure_type')
    ? normalizeMeasureType(row.stock_measure_type)
    : null;
  if (measureType) form.stock_measure_type = measureType;

  if (hasRowField(row, 'variants_json') && String(row.variants_json ?? '').trim()) {
    form.variants = parseVariantsJson(row.variants_json);
  }

  if (hasRowField(row, 'variant_stocks')) {
    applyVariantStocks(form, parseVariantStocks(row.variant_stocks));
  }

  if (hasRowField(row, 'stock')) form.stock = String(row.stock ?? '');

  if (hasRowField(row, 'price')) form.price = row.price;
  if (hasRowField(row, 'selling_price_per_kg')) form.selling_price_per_kg = row.selling_price_per_kg;
  if (hasRowField(row, 'price_inflate_percent')) form.price_inflate_percent = row.price_inflate_percent;
  if (hasRowField(row, 'small_pack_margin_rs')) form.small_pack_margin_rs = row.small_pack_margin_rs;
  if (hasRowField(row, 'low_stock_threshold')) form.low_stock_threshold = row.low_stock_threshold;
  if (hasRowField(row, 'weight_grams')) form.weight_grams = row.weight_grams;

  if (hasRowField(row, 'short_description')) form.short_description = String(row.short_description ?? '');
  if (hasRowField(row, 'story_description')) form.story_description = String(row.story_description ?? '');
  if (hasRowField(row, 'processing_method')) form.processing_method = String(row.processing_method ?? '');
  if (hasRowField(row, 'best_for')) form.best_for = String(row.best_for ?? '');
  if (hasRowField(row, 'storage_note')) form.storage_note = String(row.storage_note ?? '');
  if (hasRowField(row, 'yasvik_mark')) form.yasvik_mark = String(row.yasvik_mark ?? '');
  if (hasRowField(row, 'delivery_card')) form.delivery_card = String(row.delivery_card ?? '');
  if (hasRowField(row, 'pack_info_card')) form.pack_info_card = String(row.pack_info_card ?? '');
  if (hasRowField(row, 'sourcing_card')) form.sourcing_card = String(row.sourcing_card ?? '');

  if (hasRowField(row, 'seo_title')) form.seo_title = String(row.seo_title ?? '');
  if (hasRowField(row, 'seo_description')) form.seo_description = String(row.seo_description ?? '');
  if (hasRowField(row, 'seo_keywords')) form.seo_keywords = String(row.seo_keywords ?? '');

  if (hasRowField(row, 'hero_image')) form.hero_image = String(row.hero_image ?? '');
  if (hasRowField(row, 'hero_video')) form.hero_video = String(row.hero_video ?? '');
  if (hasRowField(row, 'images')) form.images = parsePipeList(row.images);
  if (hasRowField(row, 'hover_media')) form.hover_media = parsePipeList(row.hover_media);
  if (hasRowField(row, 'purity_badges')) form.purity_badges = parsePipeList(row.purity_badges);

  if (hasRowField(row, 'recipe_ids')) form.recipe_ids = String(row.recipe_ids ?? '');
  if (hasRowField(row, 'recipe_titles')) form.recipe_titles = String(row.recipe_titles ?? '');
  if (hasRowField(row, 'recipe_links_json') && String(row.recipe_links_json ?? '').trim()) {
    form.recipe_links = JSON.parse(String(row.recipe_links_json));
  } else if (hasRowField(row, 'recipe_links_json')) {
    form.recipe_links = [];
  }

  if (hasRowField(row, 'is_published')) {
    const published = parseBoolean(row.is_published);
    if (published !== null) form.is_published = published;
  }
  if (hasRowField(row, 'is_featured')) {
    const featured = parseBoolean(row.is_featured);
    if (featured !== null) form.is_featured = featured;
  }
  if (hasRowField(row, 'featured_in_hero')) {
    const featuredInHero = parseBoolean(row.featured_in_hero);
    if (featuredInHero !== null) form.featured_in_hero = featuredInHero;
  }
  if (hasRowField(row, 'sort_order')) form.sort_order = Number(row.sort_order) || 0;
  if (hasRowField(row, 'product_group')) form.product_group = String(row.product_group ?? '').trim();
  if (hasRowField(row, 'group_sort_order')) form.group_sort_order = Number(row.group_sort_order) || 0;

  if (hasRowField(row, 'harvest_date')) form.harvest_date = String(row.harvest_date ?? '').slice(0, 10);
  if (hasRowField(row, 'batch_tested_at')) form.batch_tested_at = String(row.batch_tested_at ?? '').slice(0, 10);

  const payload = buildProductSavePayload(form);

  if (hasRowField(row, 'compare_price') && String(row.compare_price).trim() !== '') {
    payload.compare_price = Number(row.compare_price) || 0;
  }

  if (hasRowField(row, 'weight_grams') && String(row.weight_grams).trim() !== '') {
    payload.weight_grams = Number(row.weight_grams) || null;
  }

  return payload;
}

export function rowsToSpreadsheetObjects(rows) {
  if (!rows.length) return [];

  const headers = rows[0].map(normalizeHeader);
  return rows.slice(1)
    .filter((cells) => cells.some((cell) => String(cell || '').trim()))
    .map((cells) => {
      const row = {};
      headers.forEach((header, index) => {
        if (!header) return;
        row[header] = cells[index] ?? '';
      });
      return row;
    });
}

export function parseProductSpreadsheetCsv(text) {
  const cleaned = String(text || '').replace(/^\uFEFF/, '');
  const rows = parseCsv(cleaned);
  if (!rows.length) {
    throw new Error('The file is empty.');
  }

  const headers = rows[0].map(normalizeHeader);
  if (!headers.includes('id')) {
    throw new Error('Missing required "id" column. Export products first, then edit that file.');
  }

  return rowsToSpreadsheetObjects(rows);
}

export const PRODUCTS_UPLOAD_SHEET = 'Products Upload';

export function normalizeSpreadsheetRow(row = {}) {
  const out = {};
  Object.entries(row).forEach(([key, value]) => {
    const normalized = normalizeHeader(key);
    if (!normalized) return;
    const canonicalKey = SPREADSHEET_HEADER_ALIASES[normalized] || normalized;
    if (out[canonicalKey] === undefined || out[canonicalKey] === '') {
      out[canonicalKey] = value;
    }
  });
  return out;
}

export function parseProductsUploadRows(rawRows = []) {
  const rows = rawRows.map(normalizeSpreadsheetRow);
  if (!rows.length) {
    throw new Error('Products Upload sheet is empty.');
  }
  if (!rows.some((row) => String(row.id || '').trim())) {
    throw new Error('Products Upload sheet is missing the required id column.');
  }
  return rows;
}

/** Parse .xlsx (Products Upload sheet) or .csv for admin / script import. */
export async function parseProductSpreadsheetFile(file) {
  const name = String(file?.name || '').toLowerCase();

  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const XLSX = await import('xlsx');
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames.find(
      (label) => normalizeHeader(label) === 'products_upload',
    ) || workbook.SheetNames[0];
    const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
    return {
      rows: parseProductsUploadRows(rawRows),
      sheetName,
    };
  }

  const text = await file.text();
  return {
    rows: parseProductSpreadsheetCsv(text),
    sheetName: 'csv',
  };
}

export function buildProductSpreadsheetCsv(products = [], categories = []) {
  const headerLine = COLUMN_KEYS.join(',');
  const dataLines = products.map((product) => {
    const row = productToSpreadsheetRow(product, categories);
    return COLUMN_KEYS.map((key) => escapeCsvField(row[key])).join(',');
  });

  return `\uFEFF${headerLine}\n${dataLines.join('\n')}`;
}

export function downloadProductSpreadsheet(products = [], categories = [], fileName) {
  const csv = buildProductSpreadsheetCsv(products, categories);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName || `yasvik-products-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function planProductSpreadsheetImport(rows = [], products = [], categories = []) {
  const productsById = new Map(products.map((product) => [product.id, product]));
  const planned = [];
  const skipped = [];

  rows.forEach((row, index) => {
    const id = String(row.id || '').trim();
    if (!id) {
      skipped.push({ row: index + 2, reason: 'Missing id' });
      return;
    }

    const product = productsById.get(id);
    if (!product) {
      skipped.push({ row: index + 2, id, reason: 'Product not found (id may be wrong)' });
      return;
    }

    if (!rowHasImportableFields(row)) {
      skipped.push({ row: index + 2, id, title: product.title, reason: 'No editable columns' });
      return;
    }

    if (!isSpreadsheetRowChanged(product, row, categories)) {
      skipped.push({ row: index + 2, id, title: product.title, reason: 'No changes detected' });
      return;
    }

    try {
      planned.push({
        row: index + 2,
        id,
        title: product.title,
        payload: buildSpreadsheetImportPayload(product, row, categories),
      });
    } catch (error) {
      skipped.push({
        row: index + 2,
        id,
        title: product.title,
        reason: error?.message || 'Invalid row',
      });
    }
  });

  return { planned, skipped };
}

export async function applyProductSpreadsheetImport(planned = [], updateFn, { onProgress } = {}) {
  const results = { updated: 0, failed: [] };

  for (let index = 0; index < planned.length; index += 1) {
    const item = planned[index];
    onProgress?.(index + 1, planned.length, item);
    try {
      await updateFn(item.id, item.payload);
      results.updated += 1;
    } catch (error) {
      results.failed.push({
        row: item.row,
        id: item.id,
        title: item.title,
        reason: error?.message || 'Update failed',
      });
    }
  }

  return results;
}
