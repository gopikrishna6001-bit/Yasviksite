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
  const match = text.match(/(\d+(?:\.\d+)?)\s*(kg|g|gm|gram|grams)\b/);
  if (!match) return null;

  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return match[2] === 'kg' ? amount : amount / 1000;
}

function numberOrUndefined(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function cleanString(value) {
  return String(value || '').trim();
}

export function normalizeProductVariant(variant = {}) {
  const label = cleanString(variant.label || variant.title || variant.name || variant.pack_size);
  if (!label) return null;

  const packKg = parsePackKg(variant.pack_kg ?? variant.packKg ?? variant.pack_weight_kg, label);

  return {
    ...variant,
    label,
    sku: cleanString(variant.sku || variant.SKU || variant.variant_sku),
    price: numberOrUndefined(variant.price),
    compare_price: numberOrUndefined(variant.compare_price ?? variant.comparePrice),
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
