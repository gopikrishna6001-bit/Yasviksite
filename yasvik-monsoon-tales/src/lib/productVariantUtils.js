import { isPricingMetaVariant } from '@/lib/productPricingMeta';
import { normalizeProductSku } from '@/lib/productSku';

export function normalizeList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [trimmed];
    }
  }
  return [];
}

export function parsePackKg(value, fallbackLabel = '') {
  const direct = Number(value);
  if (Number.isFinite(direct) && direct > 0) return direct;

  const grams = Number(value?.weight_grams ?? value?.pack_grams ?? value?.grams);
  if (Number.isFinite(grams) && grams > 0) return grams / 1000;

  const text = String(value?.pack_size || value?.label || fallbackLabel || '').toLowerCase();

  const weightMatch = text.match(/(\d+(?:\.\d+)?)\s*(kg|g|gm|gram|grams)\b/);
  if (weightMatch) {
    const amount = Number(weightMatch[1]);
    if (Number.isFinite(amount) && amount > 0) {
      return weightMatch[2] === 'kg' ? amount : amount / 1000;
    }
  }

  // Liquids: treat L/ml as the same unit basis as kg for cost₹/kg (or ₹/L) pricing.
  const mlMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:ml|millilitre|milliliter)\b/);
  if (mlMatch) {
    const amount = Number(mlMatch[1]);
    if (Number.isFinite(amount) && amount > 0) return amount / 1000;
  }

  const litreMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:l|lt|ltr|litre|liter|litres|liters)\b/);
  if (litreMatch) {
    const amount = Number(litreMatch[1]);
    if (Number.isFinite(amount) && amount > 0) return amount;
  }

  return null;
}

/** Piece/count from pack_kg or label (1 pc, 6 pcs, pack of 12). */
export function parsePackPieces(value, fallbackLabel = '') {
  const direct = Number(value);
  if (Number.isFinite(direct) && direct > 0) {
    // Integer-ish counts stored in pack_kg for unit products
    if (Math.abs(direct - Math.round(direct)) < 0.001) return Math.round(direct);
  }

  const text = String(
    (value && typeof value === 'object' ? (value.pack_size || value.label) : null)
    || fallbackLabel
    || '',
  ).toLowerCase();

  const countMatch = text.match(/(\d+)\s*(?:pc|pcs|piece|pieces|pack|count|nos|no\.?)\b/);
  if (countMatch) {
    const amount = Number(countMatch[1]);
    if (Number.isFinite(amount) && amount > 0) return amount;
  }

  const bare = text.match(/^(\d+)\s*$/);
  if (bare) {
    const amount = Number(bare[1]);
    if (Number.isFinite(amount) && amount > 0) return amount;
  }

  // Single-piece SKUs: "Bar", "Soap", "Bottle" with no count → 1
  if (text.trim()) return 1;
  return null;
}

/**
 * Pack quantity in the product's pricing basis:
 * - kg → kilograms
 * - L → litres (stored in pack_kg)
 * - units → piece count (never treat as kg)
 */
export function parsePackQuantity(value, fallbackLabel = '', measureType = 'kg') {
  if (measureType === 'units') {
    return parsePackPieces(value, fallbackLabel);
  }
  return parsePackKg(value, fallbackLabel);
}

/** UI copy for cost rate by measure type. */
export function getPricingRateLabels(measureType = 'kg') {
  switch (measureType) {
    case 'L':
      return {
        measureType: 'L',
        rateSuffix: '/L',
        rateLabel: 'Cost ₹/L',
        rateHint: 'Invoice cost per litre',
        packHint: 'Bottle size (500ml, 1L)',
        exampleCost: 'Cost ₹100/L',
        missingCostHint: 'Add Cost ₹/L once, then set margin % on each bottle size.',
      };
    case 'units':
      return {
        measureType: 'units',
        rateSuffix: '/pc',
        rateLabel: 'Cost ₹/pc',
        rateHint: 'Invoice cost per piece',
        packHint: 'Piece count (1 pc, 6 pcs)',
        exampleCost: 'Cost ₹100/pc',
        missingCostHint: 'Add Cost ₹/pc once, then set margin % on each pack size.',
      };
    case 'kg':
    default:
      return {
        measureType: 'kg',
        rateSuffix: '/kg',
        rateLabel: 'Cost ₹/kg',
        rateHint: 'Invoice cost per kg',
        packHint: 'Pack weight (1kg, 500g)',
        exampleCost: 'Cost ₹100/kg',
        missingCostHint: 'Add Cost ₹/kg once, then set margin % on each pack size.',
      };
  }
}

/** Sortable size in base units (g or ml) — larger packs sort first. */
export function parseVariantSortValue(variant = {}) {
  const packKg = parsePackKg(variant.pack_kg ?? variant.packKg ?? variant.pack_weight_kg, variant.label);
  if (packKg != null) return packKg * 1000;

  const text = String(variant.label || variant.pack_size || variant.title || '').toLowerCase();

  const mlMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:ml|millilitre|milliliter)\b/);
  if (mlMatch) {
    const amount = Number(mlMatch[1]);
    if (Number.isFinite(amount) && amount > 0) return amount;
  }

  const litreMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:l|lt|ltr|litre|liter|litres|liters)\b/);
  if (litreMatch) {
    const amount = Number(litreMatch[1]);
    if (Number.isFinite(amount) && amount > 0) return amount * 1000;
  }

  const gramMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:g|gm|gram|grams)\b/);
  if (gramMatch) {
    const amount = Number(gramMatch[1]);
    if (Number.isFinite(amount) && amount > 0) return amount;
  }

  const kgMatch = text.match(/(\d+(?:\.\d+)?)\s*kg\b/);
  if (kgMatch) {
    const amount = Number(kgMatch[1]);
    if (Number.isFinite(amount) && amount > 0) return amount * 1000;
  }

  const countMatch = text.match(/(\d+)\s*(?:pc|pcs|piece|pieces|pack|count)\b/);
  if (countMatch) {
    const amount = Number(countMatch[1]);
    if (Number.isFinite(amount) && amount > 0) return amount;
  }

  return null;
}

/** Largest pack / bottle first (1kg before 500g, 1L before 500ml). */
export function sortVariantsBySizeDesc(variants = []) {
  return [...variants].sort((a, b) => {
    const aSize = parseVariantSortValue(a);
    const bSize = parseVariantSortValue(b);
    if (aSize != null && bSize != null && bSize !== aSize) return bSize - aSize;
    if (aSize != null && bSize == null) return -1;
    if (aSize == null && bSize != null) return 1;
    return String(a?.label || '').localeCompare(String(b?.label || ''));
  });
}

/**
 * Shop / PDP order: lowest shelf price first, then smallest pack.
 * So 100g / 250ml is selected by default instead of 1kg / 1L.
 */
export function sortVariantsForShop(variants = []) {
  return [...variants].sort((a, b) => {
    const aPrice = Number(a?.price);
    const bPrice = Number(b?.price);
    const aHasPrice = Number.isFinite(aPrice) && aPrice > 0;
    const bHasPrice = Number.isFinite(bPrice) && bPrice > 0;
    if (aHasPrice && bHasPrice && aPrice !== bPrice) return aPrice - bPrice;
    if (aHasPrice && !bHasPrice) return -1;
    if (!aHasPrice && bHasPrice) return 1;

    const aSize = parseVariantSortValue(a);
    const bSize = parseVariantSortValue(b);
    if (aSize != null && bSize != null && aSize !== bSize) return aSize - bSize;
    if (aSize != null && bSize == null) return -1;
    if (aSize == null && bSize != null) return 1;
    return String(a?.label || '').localeCompare(String(b?.label || ''));
  });
}

function numberOrUndefined(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function cleanString(value) {
  return String(value || '').trim();
}

export function normalizeProductVariant(variant = {}) {
  if (!variant || typeof variant !== 'object') return null;
  if (isPricingMetaVariant(variant)) return null;

  const label = cleanString(variant.label || variant.title || variant.name || variant.pack_size);
  if (!label) return null;

  const packKg = parsePackKg(variant.pack_kg ?? variant.packKg ?? variant.pack_weight_kg, label);

  return {
    ...variant,
    label,
    sku: normalizeProductSku(variant.sku || variant.SKU || variant.variant_sku) || undefined,
    price: numberOrUndefined(variant.price),
    compare_price: numberOrUndefined(variant.compare_price ?? variant.comparePrice),
    store_compare_price: numberOrUndefined(variant.store_compare_price),
    image_url: cleanString(variant.image_url),
    image_urls: normalizeList(variant.image_urls).map(cleanString).filter(Boolean),
    pack_kg: packKg ?? undefined,
    packKg: packKg ?? undefined,
    weight_grams: packKg ? Math.round(packKg * 1000) : numberOrUndefined(variant.weight_grams),
    visible_stock_units: numberOrUndefined(variant.visible_stock_units),
    stock_source_kg: numberOrUndefined(variant.stock_source_kg),
    stock: numberOrUndefined(variant.stock),
    notes: cleanString(variant.notes),
  };
}

export function parsePackSizeList(text) {
  return String(text || '')
    .split(/[,;\n]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Build variant rows from comma-separated pack labels (1kg, 500g, …). Preserves prices/SKU/stock when label matches. */
export function mergeVariantsFromPackList(tokens = [], existing = []) {
  const list = Array.isArray(existing) ? existing.filter((v) => v && !isPricingMetaVariant(v)) : [];
  const byLabel = new Map();
  const byPackKg = new Map();

  for (const variant of list) {
    const labelKey = String(variant.label || '').trim().toLowerCase();
    if (labelKey) byLabel.set(labelKey, variant);
    const kg = parsePackKg(variant.pack_kg, variant.label);
    if (kg != null) byPackKg.set(String(kg), variant);
  }

  return tokens.map((rawLabel) => {
    const label = String(rawLabel).trim();
    const packKg = parsePackKg(null, label);
    const labelKey = label.toLowerCase();
    const prev = byLabel.get(labelKey)
      || (packKg != null ? byPackKg.get(String(packKg)) : null)
      || {};

    return {
      ...prev,
      label,
      pack_kg: packKg != null ? String(packKg) : (prev.pack_kg || ''),
      sku: prev.sku || '',
      stock: prev.stock ?? '',
      image_urls: prev.image_urls || [],
      price: prev.price,
      store_price: prev.store_price,
      compare_price: prev.compare_price,
      store_compare_price: prev.store_compare_price,
    };
  });
}

export function packLabelsFromVariants(variants = []) {
  return (Array.isArray(variants) ? variants : [])
    .filter((v) => v && !isPricingMetaVariant(v))
    .map((v) => String(v.label || '').trim())
    .filter(Boolean)
    .join(', ');
}

export function getVariantCartKey(productId, variant = null, comboKey = null) {
  const variantKey = variant?.sku || variant?.label || 'default';
  return comboKey ? `${comboKey}__${productId}__${variantKey}` : `${productId}__${variantKey}`;
}

export function getLineItemStockKg(item = {}) {
  const packKg = Number(item.pack_kg ?? item.packKg ?? item.variantMeta?.pack_kg);
  const qty = Number(item.qty || 0);
  if (!Number.isFinite(packKg) || packKg <= 0 || !Number.isFinite(qty) || qty <= 0) return 0;
  return Number((packKg * qty).toFixed(3));
}

/** Sellable pack rows for a product (no pricing meta duplicate labels). */
export function listSellableVariants(product = {}) {
  const seen = new Set();
  const rows = [];
  [...normalizeList(product?.quick_variants), ...normalizeList(product?.variants)].forEach((variant) => {
    const normalized = normalizeProductVariant(variant);
    if (!normalized) return;
    const key = normalized.sku || normalized.label;
    if (seen.has(key)) return;
    seen.add(key);
    rows.push(normalized);
  });
  return sortVariantsForShop(rows);
}
