import { parsePackKg } from '@/lib/productVariantUtils';
import { hydrateProductPricingFields, isPricingMetaVariant } from '@/lib/productPricingMeta';

export function parseOptionalNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Whole rupee rounding — standard for Indian grocery packs. */
export function roundRetailPrice(value) {
  if (!Number.isFinite(value)) return undefined;
  return Math.round(value);
}

export function priceFromPerKg(perKg, packKg, smallPackMarginRs = 0) {
  return variantSellingPrice(perKg, packKg, smallPackMarginRs);
}

/**
 * Selling price for a pack: rate × kg, plus optional margin on sub-1kg packs.
 */
export function variantSellingPrice(sellPerKg, packKg, smallPackMarginRs = 0) {
  const rate = parseOptionalNumber(sellPerKg);
  const kg = parseOptionalNumber(packKg);
  if (rate == null || kg == null || kg <= 0) return undefined;

  let price = rate * kg;
  const margin = parseOptionalNumber(smallPackMarginRs) || 0;
  if (kg < 1 && margin > 0) price += margin;

  return roundRetailPrice(price);
}

/** Inflated compare rate at ₹/kg. Only when inflate is set. */
export function comparePerKgFromInflate(sellPerKg, inflatePercent) {
  const rate = parseOptionalNumber(sellPerKg);
  const inflate = parseOptionalNumber(inflatePercent);
  if (rate == null || inflate == null || inflate <= 0) return undefined;
  return roundRetailPrice(rate * (1 + inflate / 100));
}

/**
 * Compare / MRP from flat selling price + inflate %. Only when inflate is set.
 * Used for single-pack products without per-kg rates.
 */
export function compareFromInflate(sellingPrice, inflatePercent) {
  const sell = parseOptionalNumber(sellingPrice);
  const inflate = parseOptionalNumber(inflatePercent);
  if (sell == null || inflate == null || inflate <= 0) return undefined;
  return roundRetailPrice(sell * (1 + inflate / 100));
}

/**
 * Compare for a pack: inflate applied at ₹/kg first, then × pack kg.
 * Small-pack margin is added to compare too so MRP stays above sell price.
 */
export function variantComparePrice(sellPerKg, packKg, inflatePercent, smallPackMarginRs = 0) {
  const comparePerKg = comparePerKgFromInflate(sellPerKg, inflatePercent);
  const kg = parseOptionalNumber(packKg);
  if (comparePerKg == null || kg == null || kg <= 0) return undefined;

  let compare = comparePerKg * kg;
  const margin = parseOptionalNumber(smallPackMarginRs) || 0;
  if (kg < 1 && margin > 0) compare += margin;

  return roundRetailPrice(compare);
}

/** Resolve compare for shop display when variant compare_price is missing. */
export function resolveVariantComparePrice(product = {}, variant = null, sellPrice = null) {
  const stored = parseOptionalNumber(variant?.compare_price ?? product?.compare_price ?? product?.discount_price);
  if (stored != null) return stored;

  const pricing = hydrateProductPricingFields(product);
  const sellPerKg = parseOptionalNumber(pricing.selling_price_per_kg);
  const inflate = parseOptionalNumber(pricing.price_inflate_percent);
  const margin = parseOptionalNumber(pricing.small_pack_margin_rs) || 0;
  const packKg = parsePackKg(variant?.pack_kg ?? variant?.packKg, variant?.label);

  if (sellPerKg != null && packKg && inflate != null && inflate > 0) {
    return variantComparePrice(sellPerKg, packKg, inflate, margin);
  }

  const sell = parseOptionalNumber(sellPrice ?? variant?.price ?? product?.price);
  return compareFromInflate(sell, inflate);
}

/** Back-fill inflate % when loading older products. */
export function deriveInflatePercent(comparePrice, sellingPrice, storedPercent) {
  const stored = parseOptionalNumber(storedPercent);
  if (stored != null && stored > 0) return stored;

  const compare = parseOptionalNumber(comparePrice);
  const sell = parseOptionalNumber(sellingPrice);
  if (compare == null || sell == null || sell <= 0 || compare <= sell) return '';

  return Math.round(((compare / sell) - 1) * 100);
}

export function resolveProductComparePrice(form = {}) {
  const sellPerKg = parseOptionalNumber(form.selling_price_per_kg);
  const inflate = parseOptionalNumber(form.price_inflate_percent);

  if (sellPerKg != null && inflate != null && inflate > 0) {
    return comparePerKgFromInflate(sellPerKg, inflate) ?? null;
  }

  return compareFromInflate(form.price, inflate) ?? null;
}

export function resolveProductComparePerKg(form = {}) {
  const sellPerKg = parseOptionalNumber(form.selling_price_per_kg);
  const inflate = parseOptionalNumber(form.price_inflate_percent);
  if (sellPerKg == null || inflate == null || inflate <= 0) return null;
  return comparePerKgFromInflate(sellPerKg, inflate) ?? null;
}

/**
 * Sync variant selling + compare from product fields on save.
 * Compare is inflated at ₹/kg when per-kg rate is set.
 */
export function syncVariantPricesFromProduct(variants = [], form = {}) {
  const sellPerKg = parseOptionalNumber(form.selling_price_per_kg);
  const productPrice = parseOptionalNumber(form.price);
  const inflate = parseOptionalNumber(form.price_inflate_percent);
  const smallPackMargin = parseOptionalNumber(form.small_pack_margin_rs) || 0;

  return variants.map((variant, index) => {
    const packKg = parsePackKg(variant.pack_kg, variant.label);
    const next = { ...variant };

    let sellPrice;
    if (packKg && sellPerKg != null) {
      sellPrice = variantSellingPrice(sellPerKg, packKg, smallPackMargin);
      next.price = sellPrice;
    } else if (productPrice != null && index === 0) {
      // Flat price mode: main Selling Price (₹) drives the default pack on shop.
      sellPrice = productPrice;
      next.price = productPrice;
    } else if (parseOptionalNumber(variant.price) != null) {
      sellPrice = parseOptionalNumber(variant.price);
    } else if (productPrice != null) {
      sellPrice = productPrice;
      next.price = productPrice;
    }

    let compare;
    if (packKg && sellPerKg != null && inflate != null && inflate > 0) {
      compare = variantComparePrice(sellPerKg, packKg, inflate, smallPackMargin);
    } else {
      compare = compareFromInflate(sellPrice ?? parseOptionalNumber(next.price), inflate);
    }

    if (compare != null) next.compare_price = compare;
    else delete next.compare_price;

    return next;
  });
}

/**
 * Prepare variants for save: sync prices from product, then quick_variants payload shape.
 */
export function prepareVariantsForSave(form = {}) {
  const rawVariants = Array.isArray(form.variants)
    ? form.variants.filter((variant) => variant && String(variant.label || '').trim() && !isPricingMetaVariant(variant))
    : [];

  const withPrices = syncVariantPricesFromProduct(rawVariants, form);
  const inflate = parseOptionalNumber(form.price_inflate_percent);
  const sellPerKg = parseOptionalNumber(form.selling_price_per_kg);
  const smallPackMargin = parseOptionalNumber(form.small_pack_margin_rs) || 0;

  const quickVariants = withPrices.map((variant) => {
    const sell = parseOptionalNumber(variant.price);
    const packKg = parsePackKg(variant.pack_kg, variant.label);
    let compare = parseOptionalNumber(variant.compare_price);

    if (compare == null && inflate != null && inflate > 0) {
      if (packKg && sellPerKg != null) {
        compare = variantComparePrice(sellPerKg, packKg, inflate, smallPackMargin);
      } else {
        compare = compareFromInflate(sell, inflate);
      }
    }

    return {
      label: variant.label,
      sku: variant.sku || undefined,
      price: sell ?? undefined,
      compare_price: compare ?? undefined,
      image_url: variant.image_url || variant.image_urls?.[0] || '',
      image_urls: Array.isArray(variant.image_urls) ? variant.image_urls.filter(Boolean) : [],
      pack_kg: parseOptionalNumber(variant.pack_kg) ?? undefined,
      weight_grams: parseOptionalNumber(variant.weight_grams) ?? undefined,
      visible_stock_units: parseOptionalNumber(variant.visible_stock_units) ?? undefined,
      stock_source_kg: parseOptionalNumber(variant.stock_source_kg) ?? undefined,
      stock: parseOptionalNumber(variant.stock) ?? undefined,
      notes: variant.notes || undefined,
    };
  });

  return { variants: withPrices, quickVariants };
}
