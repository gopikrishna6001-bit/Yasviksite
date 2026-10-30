import { parsePackKg } from '@/lib/productVariantUtils';
import { hydrateProductPricingFields, isPricingMetaVariant } from '@/lib/productPricingMeta';
import { normalizeProductSku } from '@/lib/productSku';

export function parseOptionalNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Whole rupee rounding — for ₹/kg rates from cost. */
export function roundRetailPrice(value) {
  if (!Number.isFinite(value)) return undefined;
  return Math.round(value);
}

/**
 * Indian retail charm pricing: next price ending in 9 (₹69, ₹99, ₹249, ₹489, ₹569).
 * Always rounds UP to the next 9 so the charm ending can never fall below the
 * computed cost+markup price (protects thin-margin lines from rounding losses).
 * @param {'nine'|'whole'|'none'} mode
 */
export function charmRetailPrice(value, mode = 'nine') {
  if (!Number.isFinite(value)) return undefined;
  const n = Math.round(value);
  if (n <= 0) return undefined;
  if (mode === 'whole' || mode === 'none') return n;
  if (n <= 9) return 9;
  return Math.ceil((n + 1) / 10) * 10 - 1;
}

export function resolvePackCharmMode(bandCharm, globalCharm = 'nine') {
  if (bandCharm === 'whole' || bandCharm === 'none') return bandCharm;
  if (globalCharm === 'whole' || globalCharm === 'none') return globalCharm;
  return 'nine';
}

export function priceFromPerKg(perKg, packKg, _smallPackMarginRs = 0) {
  return variantSellingPrice(perKg, packKg, 0);
}

/**
 * Selling price for a pack: rate × kg (no flat small-pack add-on).
 * Third arg kept for call-site compatibility; ignored.
 */
export function variantSellingPrice(sellPerKg, packKg, _smallPackMarginRs = 0, packCharm = 'nine') {
  const rate = parseOptionalNumber(sellPerKg);
  const kg = parseOptionalNumber(packKg);
  if (rate == null || kg == null || kg <= 0) return undefined;

  return charmRetailPrice(rate * kg, packCharm);
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
 * Fourth arg kept for call-site compatibility; ignored (no small-pack add-on).
 */
export function variantComparePrice(sellPerKg, packKg, inflatePercent, _smallPackMarginRs = 0, packCharm = 'nine') {
  const comparePerKg = comparePerKgFromInflate(sellPerKg, inflatePercent);
  const kg = parseOptionalNumber(packKg);
  if (comparePerKg == null || kg == null || kg <= 0) return undefined;

  return charmRetailPrice(comparePerKg * kg, packCharm);
}

/** Resolve compare for shop display when variant compare_price is missing. */
export function resolveVariantComparePrice(product = {}, variant = null, sellPrice = null) {
  const p = product || {};
  const stored = parseOptionalNumber(variant?.compare_price ?? p?.compare_price ?? p?.discount_price);
  if (stored != null) return stored;

  const pricing = hydrateProductPricingFields(p);
  const sellPerKg = parseOptionalNumber(pricing.selling_price_per_kg);
  const inflate = parseOptionalNumber(pricing.price_inflate_percent);
  const packKg = parsePackKg(variant?.pack_kg ?? variant?.packKg, variant?.label);

  if (sellPerKg != null && packKg && inflate != null && inflate > 0) {
    return variantComparePrice(sellPerKg, packKg, inflate, 0);
  }

  const sell = parseOptionalNumber(sellPrice ?? variant?.price ?? p?.price);
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

export function findDefaultPricingVariant(variants = []) {
  const sellable = (Array.isArray(variants) ? variants : []).filter(
    (variant) => variant && !isPricingMetaVariant(variant),
  );
  return sellable.find((variant) => parsePackKg(variant.pack_kg, variant.label) === 1)
    || sellable[0]
    || null;
}

function usesChannelPricing(form = {}) {
  return Boolean(
    String(form.selling_price_per_kg || '').trim()
    || String(form.store_selling_price_per_kg || '').trim(),
  );
}

export function resolveProductComparePrice(form = {}) {
  const sellPerKg = parseOptionalNumber(form.selling_price_per_kg);
  const inflate = parseOptionalNumber(form.price_inflate_percent);
  const defaultVariant = findDefaultPricingVariant(form.variants);

  if (defaultVariant) {
    const packKg = parsePackKg(defaultVariant.pack_kg, defaultVariant.label);
    const stored = parseOptionalNumber(defaultVariant.compare_price);
    if (stored != null) return stored;
    if (packKg && sellPerKg != null && inflate != null && inflate > 0) {
      return variantComparePrice(sellPerKg, packKg, inflate, 0) ?? null;
    }
  }

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
 * Single source of truth: online ₹/kg + store ₹/kg → variant prices + product.price.
 */
export function applyChannelPricingToForm(form = {}) {
  const sellPerKgWeb = parseOptionalNumber(form.selling_price_per_kg);
  const sellPerKgStore = parseOptionalNumber(form.store_selling_price_per_kg);
  const productPrice = parseOptionalNumber(form.price);
  const inflate = parseOptionalNumber(form.price_inflate_percent);
  const packCharm = form.pack_charm_mode === 'whole' ? 'whole' : 'nine';
  const channelMode = usesChannelPricing(form);

  const rawVariants = (Array.isArray(form.variants) ? form.variants : [])
    .filter((variant) => variant && typeof variant === 'object');

  const syncedVariants = rawVariants.map((variant, index) => {
    if (isPricingMetaVariant(variant)) return variant;

    const packKg = parsePackKg(variant.pack_kg, variant.label);
    const next = { ...variant };
    let sellPrice;

    if (packKg && sellPerKgWeb != null) {
      sellPrice = variantSellingPrice(sellPerKgWeb, packKg, 0, packCharm);
      next.price = sellPrice;
    } else if (productPrice != null && index === 0 && !channelMode) {
      sellPrice = productPrice;
      next.price = productPrice;
    } else if (parseOptionalNumber(variant.price) != null) {
      sellPrice = parseOptionalNumber(variant.price);
    } else if (productPrice != null && !channelMode) {
      sellPrice = productPrice;
      next.price = productPrice;
    }

    if (packKg && sellPerKgStore != null) {
      next.store_price = variantSellingPrice(sellPerKgStore, packKg, 0, packCharm);
    }

    const webInflate = parseOptionalNumber(form.price_inflate_percent);
    const storeInflate = parseOptionalNumber(form.store_price_inflate_percent) ?? webInflate;

    let compare;
    if (packKg && sellPerKgWeb != null && webInflate != null && webInflate > 0) {
      compare = variantComparePrice(sellPerKgWeb, packKg, webInflate, 0, packCharm);
    } else {
      compare = compareFromInflate(sellPrice ?? parseOptionalNumber(next.price), webInflate);
    }

    if (compare != null) next.compare_price = compare;
    else delete next.compare_price;

    if (packKg && sellPerKgStore != null && storeInflate != null && storeInflate > 0) {
      next.store_compare_price = variantComparePrice(sellPerKgStore, packKg, storeInflate, 0, packCharm);
    } else {
      delete next.store_compare_price;
    }

    return next;
  });

  const defaultVariant = findDefaultPricingVariant(syncedVariants);
  const nextPrice = channelMode
    ? (parseOptionalNumber(defaultVariant?.price) ?? productPrice ?? '')
    : (productPrice ?? parseOptionalNumber(defaultVariant?.price) ?? '');

  return {
    ...form,
    variants: syncedVariants,
    price: nextPrice === '' ? '' : nextPrice,
  };
}

/** Sync variant selling + compare from product fields on save. */
export function syncVariantPricesFromProduct(variants = [], form = {}) {
  return applyChannelPricingToForm({ ...form, variants }).variants.filter(
    (variant) => variant && !isPricingMetaVariant(variant),
  );
}

function formatPackLabel(packKg) {
  if (packKg == null || packKg <= 0) return '';
  if (packKg >= 1) {
    const rounded = Math.round(packKg * 100) / 100;
    return Number.isInteger(rounded) ? `${rounded}kg` : `${rounded}kg`;
  }
  return `${Math.round(packKg * 1000)}g`;
}

function resolveVariantLabelForSave(variant) {
  const label = String(variant?.label || '').trim();
  if (label) return label;
  const packKg = parsePackKg(variant?.pack_kg, '');
  if (packKg != null) return formatPackLabel(packKg);
  return String(variant?.sku || '').trim();
}

/**
 * Prepare variants for save: sync prices from product, then quick_variants payload shape.
 */
export function prepareVariantsForSave(form = {}, { preservePrices = false } = {}) {
  const rawVariants = Array.isArray(form.variants)
    ? form.variants
        .map((variant) => {
          if (!variant || isPricingMetaVariant(variant)) return null;
          const hasData = variant.label || variant.price || variant.pack_kg || variant.sku || variant.stock;
          if (!hasData) return null;
          const label = resolveVariantLabelForSave(variant);
          if (!label) return null;
          return { ...variant, label };
        })
        .filter(Boolean)
    : [];

  const withPrices = preservePrices
    ? rawVariants
    : syncVariantPricesFromProduct(rawVariants, form);
  const inflate = parseOptionalNumber(form.price_inflate_percent);
  const sellPerKg = parseOptionalNumber(form.selling_price_per_kg);

  const quickVariants = withPrices.map((variant) => {
    const sell = parseOptionalNumber(variant.price);
    const store = parseOptionalNumber(variant.store_price);
    const packKg = parsePackKg(variant.pack_kg, variant.label);
    let compare = parseOptionalNumber(variant.compare_price);
    let storeCompare = parseOptionalNumber(variant.store_compare_price);

    if (!preservePrices && compare == null && inflate != null && inflate > 0) {
      if (packKg && sellPerKg != null) {
        compare = variantComparePrice(sellPerKg, packKg, inflate, 0);
      } else {
        compare = compareFromInflate(sell, inflate);
      }
    }

    return {
      label: variant.label,
      sku: variant.sku ? normalizeProductSku(variant.sku) || undefined : undefined,
      price: sell ?? undefined,
      store_price: store ?? undefined,
      compare_price: compare ?? undefined,
      store_compare_price: storeCompare ?? undefined,
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
