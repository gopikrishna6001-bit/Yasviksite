import { parsePackKg } from '@/lib/productVariantUtils';
import { isPricingMetaVariant } from '@/lib/productPricingMeta';
import {
  parseOptionalNumber,
  roundRetailPrice,
  variantComparePrice,
  variantSellingPrice,
} from '@/lib/productPricingUtils';

export const PRICING_STRATEGY_SETTING_KEY = 'pricing_strategy_defaults';

export const PRICING_TIERS = ['min', 'mid', 'max'];

export const DEFAULT_PRICING_STRATEGY = {
  min_margin_pct: 8,
  mid_margin_pct: 15,
  max_margin_pct: 25,
  /** Website sells one band above the product band (min→mid, mid→max, max→max). */
  web_tier_step: 1,
  small_pack_margin_rs: 10,
  price_inflate_percent: 15,
  /** category_id → default band for new / unassigned products */
  category_band_defaults: {},
};

export function normalizePricingStrategy(raw = {}) {
  const next = { ...DEFAULT_PRICING_STRATEGY, ...(raw && typeof raw === 'object' ? raw : {}) };
  next.min_margin_pct = parseOptionalNumber(next.min_margin_pct) ?? DEFAULT_PRICING_STRATEGY.min_margin_pct;
  next.mid_margin_pct = parseOptionalNumber(next.mid_margin_pct) ?? DEFAULT_PRICING_STRATEGY.mid_margin_pct;
  next.max_margin_pct = parseOptionalNumber(next.max_margin_pct) ?? DEFAULT_PRICING_STRATEGY.max_margin_pct;
  next.small_pack_margin_rs = parseOptionalNumber(next.small_pack_margin_rs) ?? DEFAULT_PRICING_STRATEGY.small_pack_margin_rs;
  next.price_inflate_percent = parseOptionalNumber(next.price_inflate_percent) ?? DEFAULT_PRICING_STRATEGY.price_inflate_percent;
  next.web_tier_step = parseOptionalNumber(next.web_tier_step) ?? DEFAULT_PRICING_STRATEGY.web_tier_step;
  if (!next.category_band_defaults || typeof next.category_band_defaults !== 'object') {
    next.category_band_defaults = {};
  }
  return next;
}

export function bumpTier(tier, steps = 1) {
  const idx = PRICING_TIERS.indexOf(tier);
  if (idx < 0) return 'mid';
  return PRICING_TIERS[Math.min(idx + Math.max(0, steps), PRICING_TIERS.length - 1)];
}

/** Store uses product band; web steps up by global web_tier_step. */
export function resolveChannelTiers(productBand, strategy = DEFAULT_PRICING_STRATEGY) {
  const normalized = normalizePricingStrategy(strategy);
  const band = PRICING_TIERS.includes(productBand) ? productBand : 'mid';
  return {
    store: band,
    web: bumpTier(band, normalized.web_tier_step),
  };
}

export function defaultBandForCategory(categoryId, strategy = DEFAULT_PRICING_STRATEGY) {
  const normalized = normalizePricingStrategy(strategy);
  const band = normalized.category_band_defaults?.[categoryId];
  return PRICING_TIERS.includes(band) ? band : 'mid';
}

export function marginPctForTier(tier, strategy = DEFAULT_PRICING_STRATEGY) {
  const normalized = normalizePricingStrategy(strategy);
  if (tier === 'min') return normalized.min_margin_pct;
  if (tier === 'max') return normalized.max_margin_pct;
  return normalized.mid_margin_pct;
}

/** Sell ₹/kg from purchase cost + markup %. */
export function sellPerKgFromPurchase(purchasePerKg, marginPct) {
  const purchase = parseOptionalNumber(purchasePerKg);
  const margin = parseOptionalNumber(marginPct);
  if (purchase == null || purchase <= 0 || margin == null) return null;
  return roundRetailPrice(purchase * (1 + margin / 100));
}

export function computeTierSellRates(purchasePerKg, strategy = DEFAULT_PRICING_STRATEGY) {
  const normalized = normalizePricingStrategy(strategy);
  return {
    min: sellPerKgFromPurchase(purchasePerKg, normalized.min_margin_pct),
    mid: sellPerKgFromPurchase(purchasePerKg, normalized.mid_margin_pct),
    max: sellPerKgFromPurchase(purchasePerKg, normalized.max_margin_pct),
  };
}

export function resolveTierSellPerKg(purchasePerKg, tier, strategy = DEFAULT_PRICING_STRATEGY) {
  const rates = computeTierSellRates(purchasePerKg, strategy);
  return rates[tier] ?? rates.mid ?? null;
}

export function grossMarginPct(purchasePerKg, sellPerKg) {
  const purchase = parseOptionalNumber(purchasePerKg);
  const sell = parseOptionalNumber(sellPerKg);
  if (purchase == null || sell == null || sell <= 0) return null;
  return Math.round(((sell - purchase) / sell) * 100);
}

export function markupPct(purchasePerKg, sellPerKg) {
  const purchase = parseOptionalNumber(purchasePerKg);
  const sell = parseOptionalNumber(sellPerKg);
  if (purchase == null || purchase <= 0 || sell == null) return null;
  return Math.round(((sell - purchase) / purchase) * 100);
}

function readMetaNotes(variant) {
  try {
    return typeof variant?.notes === 'string' ? JSON.parse(variant.notes) : variant?.notes || {};
  } catch {
    return {};
  }
}

/** Full pricing strategy fields from product + meta row. */
export function extractProductStrategy(product = {}, strategy = DEFAULT_PRICING_STRATEGY) {
  const normalized = normalizePricingStrategy(strategy);
  const variants = product.quick_variants ?? product.variants ?? [];
  const metaRow = (Array.isArray(variants) ? variants : []).find(isPricingMetaVariant);
  const meta = metaRow ? readMetaNotes(metaRow) : {};

  const purchaseRate = parseOptionalNumber(
    meta.purchase_rate_per_kg ?? product.purchase_rate_per_kg
  );

  const productBand = PRICING_TIERS.includes(meta.pricing_band)
    ? meta.pricing_band
    : PRICING_TIERS.includes(meta.store_tier)
      ? meta.store_tier
      : defaultBandForCategory(product.category_id, normalized);

  const channels = resolveChannelTiers(productBand, normalized);
  const storeTier = channels.store;
  const webTier = channels.web;

  const tierRates = purchaseRate != null ? computeTierSellRates(purchaseRate, normalized) : { min: null, mid: null, max: null };

  const hasStoreOverride = meta.use_store_override === true
    && meta.store_selling_price_per_kg != null && meta.store_selling_price_per_kg !== '';
  const hasWebOverride = meta.use_web_override === true
    && meta.selling_price_per_kg != null && meta.selling_price_per_kg !== '';

  const storeSellPerKg = hasStoreOverride
    ? parseOptionalNumber(meta.store_selling_price_per_kg)
    : resolveTierSellPerKg(purchaseRate, storeTier, normalized);

  const webSellPerKg = hasWebOverride
    ? parseOptionalNumber(meta.selling_price_per_kg)
    : resolveTierSellPerKg(purchaseRate, webTier, normalized);

  const smallPackMargin = parseOptionalNumber(
    meta.small_pack_margin_rs ?? product.small_pack_margin_rs
  ) ?? normalized.small_pack_margin_rs;

  const inflate = parseOptionalNumber(
    meta.price_inflate_percent ?? product.price_inflate_percent
  ) ?? normalized.price_inflate_percent;

  return {
    purchase_rate_per_kg: purchaseRate,
    pricing_band: productBand,
    store_tier: storeTier,
    web_tier: webTier,
    store_selling_price_per_kg: storeSellPerKg,
    web_selling_price_per_kg: webSellPerKg,
    store_override: hasStoreOverride,
    web_override: hasWebOverride,
    small_pack_margin_rs: smallPackMargin,
    price_inflate_percent: inflate,
    tier_rates: tierRates,
    store_margin_pct: grossMarginPct(purchaseRate, storeSellPerKg),
    web_margin_pct: grossMarginPct(purchaseRate, webSellPerKg),
  };
}

export function resolvePosVariantPrice(variant, product = {}) {
  const store = parseOptionalNumber(variant?.store_price);
  if (store != null && store > 0) return store;
  return parseOptionalNumber(variant?.price ?? product?.price) ?? 0;
}

export function resolveWebVariantPrice(variant, product = {}) {
  return parseOptionalNumber(variant?.price ?? product?.price) ?? 0;
}

function getSellableVariants(product = {}) {
  const raw = product.quick_variants ?? product.variants ?? [];
  return (Array.isArray(raw) ? raw : []).filter((v) => v && !isPricingMetaVariant(v));
}

/**
 * Apply strategy row to product variants + pricing meta.
 * Web price → variant.price (shop). Store price → variant.store_price (POS).
 */
export function applyStrategyToProduct(product = {}, row = {}, strategy = DEFAULT_PRICING_STRATEGY) {
  const normalized = normalizePricingStrategy(strategy);
  const purchaseRate = parseOptionalNumber(row.purchase_rate_per_kg);
  const productBand = PRICING_TIERS.includes(row.pricing_band)
    ? row.pricing_band
    : defaultBandForCategory(product.category_id, normalized);
  const channels = resolveChannelTiers(productBand, normalized);

  const storeSellPerKg = row.store_override && row.store_selling_price_per_kg !== ''
    ? parseOptionalNumber(row.store_selling_price_per_kg)
    : resolveTierSellPerKg(purchaseRate, channels.store, normalized);

  const webSellPerKg = row.web_override && row.web_selling_price_per_kg !== ''
    ? parseOptionalNumber(row.web_selling_price_per_kg)
    : resolveTierSellPerKg(purchaseRate, channels.web, normalized);

  const smallPackMargin = parseOptionalNumber(row.small_pack_margin_rs) ?? normalized.small_pack_margin_rs;
  const inflate = parseOptionalNumber(row.price_inflate_percent) ?? normalized.price_inflate_percent;

  const variants = getSellableVariants(product).map((variant) => {
    const packKg = parsePackKg(variant.pack_kg, variant.label);
    const next = { ...variant };

    if (packKg && webSellPerKg != null) {
      next.price = variantSellingPrice(webSellPerKg, packKg, smallPackMargin);
    }
    if (packKg && storeSellPerKg != null) {
      next.store_price = variantSellingPrice(storeSellPerKg, packKg, smallPackMargin);
    } else if (storeSellPerKg == null) {
      delete next.store_price;
    }

    if (packKg && webSellPerKg != null && inflate != null && inflate > 0) {
      next.compare_price = variantComparePrice(webSellPerKg, packKg, inflate, smallPackMargin);
    }

    return next;
  });

  const defaultVariant = variants.find((v) => parsePackKg(v.pack_kg, v.label) === 1)
    || variants[0];

  const productPrice = defaultVariant
    ? parseOptionalNumber(defaultVariant.price)
    : (webSellPerKg != null ? webSellPerKg : parseOptionalNumber(product.price));

  const comparePrice = defaultVariant
    ? parseOptionalNumber(defaultVariant.compare_price)
    : null;

  const pricingMeta = {
    purchase_rate_per_kg: purchaseRate != null ? String(purchaseRate) : null,
    pricing_band: productBand,
    store_tier: channels.store,
    web_tier: channels.web,
    selling_price_per_kg: row.web_override && row.web_selling_price_per_kg !== ''
      ? String(row.web_selling_price_per_kg)
      : (webSellPerKg != null ? String(webSellPerKg) : null),
    store_selling_price_per_kg: row.store_override && row.store_selling_price_per_kg !== ''
      ? String(row.store_selling_price_per_kg)
      : (storeSellPerKg != null ? String(storeSellPerKg) : null),
    use_web_override: Boolean(row.web_override),
    use_store_override: Boolean(row.store_override),
    price_inflate_percent: inflate != null ? String(inflate) : null,
    small_pack_margin_rs: smallPackMargin != null ? String(smallPackMargin) : null,
  };

  return {
    variants,
    quick_variants: variants,
    price: productPrice ?? 0,
    compare_price: comparePrice,
    pricingMeta,
    store_selling_price_per_kg: storeSellPerKg,
    web_selling_price_per_kg: webSellPerKg,
  };
}

export function buildProductUpdateFromStrategy(product, row, strategy = DEFAULT_PRICING_STRATEGY) {
  const applied = applyStrategyToProduct(product, row, strategy);
  const metaVariant = {
    label: '__yasvik_pricing__',
    sku: '__yasvik_pricing__',
    notes: JSON.stringify(applied.pricingMeta),
  };

  return {
    price: applied.price,
    compare_price: applied.compare_price,
    quick_variants: [metaVariant, ...applied.quick_variants],
  };
}

export function formatRupee(value) {
  const n = parseOptionalNumber(value);
  if (n == null) return '—';
  return `₹${n}`;
}

export function formatMargin(value) {
  const n = parseOptionalNumber(value);
  if (n == null) return '—';
  const tone = n < 5 ? 'text-red-600' : n < 10 ? 'text-amber-600' : 'text-forest-canopy';
  return { text: `${n}%`, tone };
}
