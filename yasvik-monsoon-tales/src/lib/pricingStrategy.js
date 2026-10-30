import { parsePackQuantity } from '@/lib/productVariantUtils';
import { resolveProductMeasureType } from '@/lib/productStockUtils';
import { isPricingMetaVariant } from '@/lib/productPricingMeta';
import {
  charmRetailPrice,
  parseOptionalNumber,
  resolvePackCharmMode,
  roundRetailPrice,
} from '@/lib/productPricingUtils';

export const PRICING_STRATEGY_SETTING_KEY = 'pricing_strategy_defaults';

/** @deprecated Use getPricingBands(strategy) — kept for imports that expect min/mid/max */
export const PRICING_TIERS = ['min', 'mid', 'max', 'organic'];

export const DEFAULT_PRICING_BANDS = [
  { id: 'min', label: 'Min', margin_pct: 8, pack_charm: 'nine' },
  { id: 'mid', label: 'Mid', margin_pct: 15, pack_charm: 'nine' },
  { id: 'max', label: 'Max', margin_pct: 25, pack_charm: 'nine' },
  { id: 'organic', label: 'Organic', margin_pct: 35, pack_charm: 'nine' },
];

export const DEFAULT_PRICING_STRATEGY = {
  bands: DEFAULT_PRICING_BANDS,
  /** Legacy flat fields — migrated into bands on load */
  min_margin_pct: 8,
  mid_margin_pct: 15,
  max_margin_pct: 25,
  /** Website sells N band(s) above the product band in the bands list order. */
  web_tier_step: 1,
  /** @deprecated Unused — pack prices are sell₹/kg × weight only */
  small_pack_margin_rs: 0,
  price_inflate_percent: 15,
  /** Store shelf MRP inflate % — separate from web shop compare */
  store_price_inflate_percent: 15,
  /** Default pack rounding when a band has no pack_charm: nine → ₹249, ₹489 */
  pack_charm_mode: 'nine',
  /** @deprecated Single band per category — migrated to category_channel_defaults */
  category_band_defaults: {},
  /** category_id → { store: bandId, web: bandId } */
  category_channel_defaults: {},
};

function slugifyBandId(label, index = 0) {
  const base = String(label || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  return base || `band_${index + 1}`;
}

function migrateLegacyBands(raw = {}) {
  if (Array.isArray(raw.bands) && raw.bands.length > 0) {
    return raw.bands.map((band, index) => ({
      id: String(band.id || slugifyBandId(band.label, index)).trim(),
      label: String(band.label || band.id || `Band ${index + 1}`).trim(),
      margin_pct: parseOptionalNumber(band.margin_pct) ?? 15,
      pack_charm: band.pack_charm === 'whole' ? 'whole' : 'nine',
      channel: band.channel === 'store' || band.channel === 'web' ? band.channel : '',
    })).filter((band) => band.id);
  }

  const charm = raw.pack_charm_mode === 'whole' ? 'whole' : 'nine';
  const bands = [
    { id: 'min', label: 'Min', margin_pct: parseOptionalNumber(raw.min_margin_pct) ?? 8, pack_charm: charm },
    { id: 'mid', label: 'Mid', margin_pct: parseOptionalNumber(raw.mid_margin_pct) ?? 15, pack_charm: charm },
    { id: 'max', label: 'Max', margin_pct: parseOptionalNumber(raw.max_margin_pct) ?? 25, pack_charm: charm },
  ];
  const organicMargin = parseOptionalNumber(raw.organic_margin_pct) ?? 35;
  if (!bands.some((band) => band.id === 'organic')) {
    bands.push({ id: 'organic', label: 'Organic', margin_pct: organicMargin, pack_charm: charm });
  }
  return bands;
}

function bumpBandInList(bandId, steps = 1, bands = DEFAULT_PRICING_BANDS) {
  const list = Array.isArray(bands) && bands.length ? bands : DEFAULT_PRICING_BANDS;
  const idx = list.findIndex((band) => band.id === bandId);
  const fallbackIdx = list.findIndex((band) => band.id === 'mid');
  const safeIdx = idx >= 0 ? idx : (fallbackIdx >= 0 ? fallbackIdx : 0);
  const nextIdx = Math.min(safeIdx + Math.max(0, steps), list.length - 1);
  return list[nextIdx]?.id || bandId || 'mid';
}

function normalizeBandIdInList(bandId, bands = DEFAULT_PRICING_BANDS) {
  const list = Array.isArray(bands) && bands.length ? bands : DEFAULT_PRICING_BANDS;
  if (list.some((band) => band.id === bandId)) return bandId;
  return list.find((band) => band.id === 'mid')?.id || list[0]?.id || 'mid';
}

function migrateCategoryChannelDefaults(strategy, bands = DEFAULT_PRICING_BANDS) {
  const normalized = { ...strategy };
  const existing = normalized.category_channel_defaults;
  if (existing && typeof existing === 'object' && Object.keys(existing).length > 0) {
    const next = {};
    for (const [catId, value] of Object.entries(existing)) {
      if (value && typeof value === 'object') {
        next[catId] = {
          store: String(value.store || value.store_band || 'mid'),
          web: String(value.web || value.web_band || 'mid'),
        };
      }
    }
    return next;
  }

  const legacy = normalized.category_band_defaults || {};
  const migrated = {};
  const webStep = parseOptionalNumber(normalized.web_tier_step) ?? 1;
  for (const [catId, band] of Object.entries(legacy)) {
    const store = normalizeBandIdInList(String(band || 'mid'), bands);
    migrated[catId] = {
      store,
      web: bumpBandInList(store, webStep, bands),
    };
  }
  return migrated;
}

export function normalizePricingStrategy(raw = {}) {
  const next = { ...DEFAULT_PRICING_STRATEGY, ...(raw && typeof raw === 'object' ? raw : {}) };
  next.bands = migrateLegacyBands(next);
  next.web_tier_step = parseOptionalNumber(next.web_tier_step) ?? DEFAULT_PRICING_STRATEGY.web_tier_step;
  next.small_pack_margin_rs = 0;
  next.price_inflate_percent = parseOptionalNumber(next.price_inflate_percent) ?? DEFAULT_PRICING_STRATEGY.price_inflate_percent;
  next.store_price_inflate_percent = parseOptionalNumber(next.store_price_inflate_percent) ?? next.price_inflate_percent ?? DEFAULT_PRICING_STRATEGY.store_price_inflate_percent;
  next.pack_charm_mode = next.pack_charm_mode === 'whole' ? 'whole' : 'nine';
  if (!next.category_band_defaults || typeof next.category_band_defaults !== 'object') {
    next.category_band_defaults = {};
  }
  next.category_channel_defaults = migrateCategoryChannelDefaults(next, next.bands);
  return next;
}

export function getPricingBands(strategy = DEFAULT_PRICING_STRATEGY) {
  if (Array.isArray(strategy?.bands) && strategy.bands.length > 0) {
    return strategy.bands;
  }
  return migrateLegacyBands(strategy);
}

export function getBandById(bandId, strategy = DEFAULT_PRICING_STRATEGY) {
  const bands = getPricingBands(strategy);
  return bands.find((band) => band.id === bandId)
    || bands.find((band) => band.id === 'mid')
    || bands[0]
    || null;
}

export function getBandLabel(bandId, strategy = DEFAULT_PRICING_STRATEGY) {
  return getBandById(bandId, strategy)?.label || bandId || '—';
}

export function normalizeBandId(bandId, strategy = DEFAULT_PRICING_STRATEGY) {
  return normalizeBandIdInList(bandId, getPricingBands(strategy));
}

export function packCharmForBand(bandId, strategy = DEFAULT_PRICING_STRATEGY) {
  const bands = getPricingBands(strategy);
  const band = bands.find((row) => row.id === bandId)
    || bands.find((row) => row.id === 'mid')
    || bands[0];
  const packCharmMode = strategy?.pack_charm_mode === 'whole' ? 'whole' : 'nine';
  return resolvePackCharmMode(band?.pack_charm, packCharmMode);
}

/** @deprecated Use bumpBand */
export function bumpTier(tier, steps = 1, strategy = DEFAULT_PRICING_STRATEGY) {
  return bumpBand(tier, steps, strategy);
}

export function bumpBand(bandId, steps = 1, strategy = DEFAULT_PRICING_STRATEGY) {
  const bands = getPricingBands(strategy);
  const safeId = normalizeBandIdInList(bandId, bands);
  return bumpBandInList(safeId, steps, bands);
}

/** Store uses product band; web steps up by global web_tier_step — legacy when web band not set explicitly. */
export function resolveChannelTiers(productBandId, strategy = DEFAULT_PRICING_STRATEGY) {
  const normalized = normalizePricingStrategy(strategy);
  const bandId = normalizeBandId(productBandId, normalized);
  return {
    store: bandId,
    web: bumpBand(bandId, normalized.web_tier_step, normalized),
  };
}

/** Single default margin band for a category (store/web kept in sync for legacy settings). */
export function defaultBandsForCategory(categoryId, strategy = DEFAULT_PRICING_STRATEGY) {
  const normalized = normalizePricingStrategy(strategy);
  const entry = normalized.category_channel_defaults?.[categoryId];
  if (entry && typeof entry === 'object') {
    const band = normalizeBandId(entry.store || entry.web || entry.band || 'mid', normalized);
    return { store: band, web: band, band };
  }
  const legacyBand = normalized.category_band_defaults?.[categoryId];
  if (legacyBand) {
    const band = normalizeBandId(legacyBand, normalized);
    return { store: band, web: band, band };
  }
  const fallback = normalizeBandId('mid', normalized);
  return { store: fallback, web: fallback, band: fallback };
}

/** @deprecated Use defaultBandsForCategory().band */
export function defaultBandForCategory(categoryId, strategy = DEFAULT_PRICING_STRATEGY) {
  return defaultBandsForCategory(categoryId, strategy).band;
}

export function filterBandsForChannel(bands, channel) {
  const list = Array.isArray(bands) ? bands : [];
  if (!channel || channel === 'all') return list;
  if (!list.length) return list;

  const needle = channel === 'store' ? 'store' : 'web';
  const shared = list.filter((band) => band.channel !== 'store' && band.channel !== 'web');
  const byChannel = list.filter((band) => band.channel === channel);
  const byPrefix = list.filter((band) => {
    const id = String(band.id || '').toLowerCase();
    const label = String(band.label || '').toLowerCase();
    return id.startsWith(`${needle}_`) || id === needle || label.includes(needle);
  });

  const merged = [...byChannel, ...byPrefix, ...shared];
  const deduped = merged.filter((band, index, arr) => arr.findIndex((b) => b.id === band.id) === index);
  return deduped.length > 0 ? deduped : list;
}

/** Pick a <select> value that exists in channelBands (maps mid ↔ store_mid / web_mid). */
export function resolveBandSelectValue(value, channelBands, allBands = channelBands, channel = 'all') {
  const options = Array.isArray(channelBands) && channelBands.length ? channelBands : allBands;
  const full = Array.isArray(allBands) && allBands.length ? allBands : options;
  const list = options.length ? options : DEFAULT_PRICING_BANDS;

  if (value && list.some((band) => band.id === value)) return value;

  const normalized = normalizeBandIdInList(value, full);

  if (channel === 'store' || channel === 'web') {
    const prefix = channel === 'store' ? 'store_' : 'web_';
    const prefixed = `${prefix}${normalized}`;
    if (list.some((band) => band.id === prefixed)) return prefixed;

    const stripped = String(value || '').replace(/^(store_|web_)/i, '');
    const fromStripped = normalizeBandIdInList(stripped, full);
    const altPrefixed = `${prefix}${fromStripped}`;
    if (list.some((band) => band.id === altPrefixed)) return altPrefixed;

    const bySuffix = list.find((band) => {
      const id = String(band.id || '');
      return id === normalized || id.endsWith(`_${normalized}`);
    });
    if (bySuffix) return bySuffix.id;
  }

  if (list.some((band) => band.id === normalized)) return normalized;
  return list[0]?.id || normalized;
}

/** Resolve the single margin band for a product row (legacy store/web fields collapse to one). */
export function resolveProductChannelBands(row = {}, product = {}, strategy = DEFAULT_PRICING_STRATEGY) {
  const normalized = normalizePricingStrategy(strategy);
  const categoryDefaults = defaultBandsForCategory(product.category_id, normalized);
  const band = normalizeBandId(
    row.pricing_band
      || row.store_band
      || row.web_band
      || row.store_tier
      || row.web_tier
      || categoryDefaults.band,
    normalized,
  );
  return { store: band, web: band, band };
}

/** @deprecated Use marginPctForBand */
export function marginPctForTier(tier, strategy = DEFAULT_PRICING_STRATEGY) {
  return marginPctForBand(tier, strategy);
}

export function marginPctForBand(bandId, strategy = DEFAULT_PRICING_STRATEGY) {
  return getBandById(bandId, strategy)?.margin_pct ?? 15;
}

/** Sell ₹/kg from purchase cost + markup %. Whole-rupee rate (not charm). */
export function sellPerKgFromPurchase(purchasePerKg, marginPct) {
  const purchase = parseOptionalNumber(purchasePerKg);
  const margin = parseOptionalNumber(marginPct);
  if (purchase == null || purchase <= 0 || margin == null) return null;
  return roundRetailPrice(purchase * (1 + margin / 100));
}

export function computeTierSellRates(purchasePerKg, strategy = DEFAULT_PRICING_STRATEGY) {
  const bands = getPricingBands(strategy);
  const purchase = parseOptionalNumber(purchasePerKg);
  if (purchase == null || purchase <= 0) {
    return Object.fromEntries(bands.map((band) => [band.id, null]));
  }
  return Object.fromEntries(
    bands.map((band) => [band.id, sellPerKgFromPurchase(purchase, band.margin_pct)]),
  );
}

export function resolveTierSellPerKg(purchasePerKg, bandId, strategy = DEFAULT_PRICING_STRATEGY) {
  const margin = marginPctForBand(bandId, strategy);
  return sellPerKgFromPurchase(purchasePerKg, margin);
}

/** Normalize label → string number map (margins, packaging ₹, price overrides). */
export function normalizePackMargins(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const next = {};
  for (const [label, value] of Object.entries(raw)) {
    const key = String(label || '').trim();
    if (!key) continue;
    const pct = parseOptionalNumber(value);
    next[key] = pct != null ? String(pct) : (value === '' || value == null ? '' : String(value));
  }
  return next;
}

export const normalizePackMoneyMap = normalizePackMargins;

/** Look up a numeric map value by pack label (case-insensitive). */
export function lookupPackMapValue(label, map) {
  const normalized = normalizePackMoneyMap(map);
  const needle = String(label || '').trim().toLowerCase();
  if (!needle) return null;
  for (const [key, value] of Object.entries(normalized)) {
    if (String(key).trim().toLowerCase() !== needle) continue;
    return parseOptionalNumber(value);
  }
  return null;
}

/** Look up margin % for a pack label; empty → product band margin. */
export function resolvePackMarginPct(label, packMargins, bandId, strategy = DEFAULT_PRICING_STRATEGY) {
  const fromMap = lookupPackMapValue(label, packMargins);
  if (fromMap != null) return fromMap;
  return marginPctForBand(bandId, strategy);
}

/**
 * Suggested shelf ₹ for a pack:
 * (cost rate × pack qty + packaging₹) × (1 + margin%) → charm.
 * packQty is kg, litres, or pieces depending on product measure type.
 */
export function computeSuggestedPackShelfPrice({
  purchasePerKg,
  packKg,
  packagingRs = 0,
  marginPct,
  packCharm = 'nine',
}) {
  const purchase = parseOptionalNumber(purchasePerKg);
  const qty = parseOptionalNumber(packKg);
  const packaging = parseOptionalNumber(packagingRs) ?? 0;
  const margin = parseOptionalNumber(marginPct);
  if (purchase == null || purchase < 0 || qty == null || qty <= 0 || margin == null) return null;
  const landed = purchase * qty + Math.max(0, packaging);
  return charmRetailPrice(landed * (1 + margin / 100), packCharm);
}

/** Web / label MRP from shelf selling price + inflate % (for strikethrough discount). */
export function computeMrpFromShelfPrice(shelfPrice, inflatePercent, packCharm = 'nine') {
  const shelf = parseOptionalNumber(shelfPrice);
  const inflate = parseOptionalNumber(inflatePercent);
  if (shelf == null || shelf <= 0 || inflate == null || inflate <= 0) return null;
  return charmRetailPrice(shelf * (1 + inflate / 100), packCharm);
}

/**
 * Pack gross profit ₹ = shelf − (cost rate × pack qty + packaging).
 * Returns null when inputs are incomplete.
 */
export function computePackGrossProfit({
  purchasePerKg,
  packKg,
  packagingRs = 0,
  shelfPrice,
}) {
  const purchase = parseOptionalNumber(purchasePerKg);
  const qty = parseOptionalNumber(packKg);
  const packaging = parseOptionalNumber(packagingRs) ?? 0;
  const shelf = parseOptionalNumber(shelfPrice);
  if (purchase == null || purchase < 0 || qty == null || qty <= 0 || shelf == null) return null;
  const landed = purchase * qty + Math.max(0, packaging);
  return Math.round((shelf - landed) * 100) / 100;
}

/**
 * Keep margin % entries aligned with pack size labels.
 * New packs inherit defaultMarginPct (usually the product band %).
 */
export function syncPackMarginsForLabels(labels = [], existingMargins = {}, defaultMarginPct = 15) {
  const prev = normalizePackMargins(existingMargins);
  const fallback = parseOptionalNumber(defaultMarginPct) ?? 15;
  const next = {};
  for (const raw of labels) {
    const label = String(raw || '').trim();
    if (!label) continue;
    const needle = label.toLowerCase();
    const prevEntry = Object.entries(prev).find(([key]) => String(key).trim().toLowerCase() === needle);
    if (prevEntry && prevEntry[1] !== '' && prevEntry[1] != null) {
      next[label] = String(prevEntry[1]);
    } else {
      next[label] = String(fallback);
    }
  }
  return next;
}

/** Keep money maps aligned with labels; new packs get defaultValue (often ''). */
export function syncPackMoneyMapForLabels(labels = [], existing = {}, defaultValue = '') {
  const prev = normalizePackMoneyMap(existing);
  const next = {};
  for (const raw of labels) {
    const label = String(raw || '').trim();
    if (!label) continue;
    const needle = label.toLowerCase();
    const prevEntry = Object.entries(prev).find(([key]) => String(key).trim().toLowerCase() === needle);
    if (prevEntry && prevEntry[1] !== '' && prevEntry[1] != null) {
      next[label] = String(prevEntry[1]);
    } else if (defaultValue !== '' && defaultValue != null) {
      next[label] = String(defaultValue);
    }
  }
  return next;
}

export function packMarginsDifferFromBand(packMargins, bandId, strategy = DEFAULT_PRICING_STRATEGY) {
  const bandPct = marginPctForBand(bandId, strategy);
  const map = normalizePackMargins(packMargins);
  return Object.values(map).some((value) => {
    const pct = parseOptionalNumber(value);
    return pct != null && pct !== bandPct;
  });
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

/** Empty string = use global strategy default; any number = product-specific override. */
export function readProductPackRuleOverride(product = {}, field) {
  const variants = product.quick_variants ?? product.variants ?? [];
  const metaRow = (Array.isArray(variants) ? variants : []).find(isPricingMetaVariant);
  const meta = metaRow ? readMetaNotes(metaRow) : {};
  if (meta[field] !== '' && meta[field] != null) return String(meta[field]);
  if (product[field] !== '' && product[field] != null) return String(product[field]);
  return '';
}

export function hasProductPackRuleOverrides(product = {}) {
  return Boolean(
    readProductPackRuleOverride(product, 'price_inflate_percent')
    || readProductPackRuleOverride(product, 'store_price_inflate_percent'),
  );
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

  const categoryDefaults = defaultBandsForCategory(product.category_id, normalized);

  const band = normalizeBandId(
    meta.pricing_band || meta.store_tier || meta.web_tier || categoryDefaults.band,
    normalized,
  );

  const tierRates = purchaseRate != null ? computeTierSellRates(purchaseRate, normalized) : {};

  const hasOverride = (meta.use_web_override === true || meta.use_store_override === true)
    && (
      (meta.selling_price_per_kg != null && meta.selling_price_per_kg !== '')
      || (meta.store_selling_price_per_kg != null && meta.store_selling_price_per_kg !== '')
    );

  const sellPerKg = hasOverride
    ? parseOptionalNumber(meta.selling_price_per_kg ?? meta.store_selling_price_per_kg)
    : resolveTierSellPerKg(purchaseRate, band, normalized);

  const inflate = parseOptionalNumber(
    meta.price_inflate_percent ?? product.price_inflate_percent
      ?? meta.store_price_inflate_percent ?? product.store_price_inflate_percent
  ) ?? normalized.price_inflate_percent;

  return {
    purchase_rate_per_kg: purchaseRate,
    pricing_band: band,
    store_band: band,
    web_band: band,
    store_tier: band,
    web_tier: band,
    store_selling_price_per_kg: sellPerKg,
    web_selling_price_per_kg: sellPerKg,
    store_override: hasOverride,
    web_override: hasOverride,
    price_inflate_percent: inflate,
    store_price_inflate_percent: inflate,
    price_inflate_override: readProductPackRuleOverride(product, 'price_inflate_percent'),
    store_price_inflate_override: '',
    pack_margins: normalizePackMargins(meta.pack_margins),
    pack_packaging_rs: normalizePackMoneyMap(meta.pack_packaging_rs),
    pack_price_overrides: normalizePackMoneyMap(meta.pack_price_overrides),
    tier_rates: tierRates,
    store_margin_pct: grossMarginPct(purchaseRate, sellPerKg),
    web_margin_pct: grossMarginPct(purchaseRate, sellPerKg),
  };
}

/** Single shared selling price for POS, shop, and labels. */
export function resolvePosVariantPrice(variant, product = {}) {
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
 * Pack shelf price = override if set, else (cost×qty + packaging) × (1+margin%) charm.
 * qty is kg, L, or pieces based on stock_measure_type.
 */
export function applyStrategyToProduct(product = {}, row = {}, strategy = DEFAULT_PRICING_STRATEGY) {
  const normalized = normalizePricingStrategy(strategy);
  const measureType = resolveProductMeasureType(product);
  const purchaseRate = parseOptionalNumber(row.purchase_rate_per_kg);
  const { band } = resolveProductChannelBands(row, product, normalized);
  const packCharm = packCharmForBand(band, normalized);
  const packMargins = normalizePackMargins(row.pack_margins);
  const packPackaging = normalizePackMoneyMap(row.pack_packaging_rs);
  const packPriceOverrides = normalizePackMoneyMap(row.pack_price_overrides);

  const inflate = parseOptionalNumber(row.price_inflate_percent)
    ?? parseOptionalNumber(row.store_price_inflate_percent)
    ?? normalized.price_inflate_percent;

  const metaInflate = parseOptionalNumber(row.price_inflate_percent)
    ?? parseOptionalNumber(row.store_price_inflate_percent);

  let referenceSellPerUnit = null;

  const variants = getSellableVariants(product).map((variant) => {
    const packQty = parsePackQuantity(variant.pack_kg, variant.label, measureType);
    const next = { ...variant };
    const marginPct = resolvePackMarginPct(variant.label, packMargins, band, normalized);
    const packagingRs = lookupPackMapValue(variant.label, packPackaging) ?? 0;
    const priceOverride = lookupPackMapValue(variant.label, packPriceOverrides);

    let shelfPrice = priceOverride;
    if (shelfPrice == null && packQty) {
      shelfPrice = computeSuggestedPackShelfPrice({
        purchasePerKg: purchaseRate,
        packKg: packQty,
        packagingRs,
        marginPct,
        packCharm,
      });
    }

    if (packQty && shelfPrice != null) {
      next.price = shelfPrice;
      delete next.store_price;
      // Persist pack size in measure-native units (L for oils, pieces for units)
      if (measureType === 'units' || measureType === 'L') {
        next.pack_kg = packQty;
      }
    }

    if (packQty === 1 && shelfPrice != null) {
      referenceSellPerUnit = shelfPrice;
    } else if (packQty && shelfPrice != null && referenceSellPerUnit == null) {
      referenceSellPerUnit = Math.round(shelfPrice / packQty);
    }

    if (shelfPrice != null && inflate != null && inflate > 0) {
      next.compare_price = computeMrpFromShelfPrice(shelfPrice, inflate, packCharm);
      delete next.store_compare_price;
    } else {
      delete next.compare_price;
      delete next.store_compare_price;
    }

    return next;
  });

  const defaultVariant = variants.find((v) => parsePackQuantity(v.pack_kg, v.label, measureType) === 1)
    || variants[0];

  const productPrice = defaultVariant
    ? parseOptionalNumber(defaultVariant.price)
    : (referenceSellPerUnit != null ? referenceSellPerUnit : parseOptionalNumber(product.price));

  const comparePrice = defaultVariant
    ? parseOptionalNumber(defaultVariant.compare_price)
    : null;

  const pricingMeta = {
    purchase_rate_per_kg: purchaseRate != null ? String(purchaseRate) : null,
    pricing_band: band,
    store_tier: band,
    web_tier: band,
    selling_price_per_kg: referenceSellPerUnit != null ? String(referenceSellPerUnit) : null,
    store_selling_price_per_kg: referenceSellPerUnit != null ? String(referenceSellPerUnit) : null,
    use_web_override: false,
    use_store_override: false,
    price_inflate_percent: metaInflate != null ? String(metaInflate) : null,
    store_price_inflate_percent: null,
    small_pack_margin_rs: null,
    pack_charm_mode: packCharm,
    pack_margins: Object.keys(packMargins).length ? packMargins : null,
    pack_packaging_rs: Object.keys(packPackaging).length ? packPackaging : null,
    pack_price_overrides: Object.keys(packPriceOverrides).length ? packPriceOverrides : null,
  };

  return {
    variants,
    quick_variants: variants,
    price: productPrice ?? 0,
    compare_price: comparePrice,
    pricingMeta,
    store_selling_price_per_kg: referenceSellPerUnit,
    web_selling_price_per_kg: referenceSellPerUnit,
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
  const rounded = Math.round(n * 100) / 100;
  if (Number.isInteger(rounded) || Math.abs(rounded - Math.round(rounded)) < 0.001) {
    return `₹${Math.round(rounded)}`;
  }
  return `₹${rounded.toFixed(2)}`;
}

export function formatMargin(value) {
  const n = parseOptionalNumber(value);
  if (n == null) return { text: '—', tone: 'text-rain-cloud/40' };
  const tone = n < 5 ? 'text-red-600' : n < 10 ? 'text-amber-600' : 'text-forest-canopy';
  return { text: `${n}%`, tone };
}

/** Pack-level shelf prices from a pricing row (preview before Apply). */
export function computePackPricePreviews(product = {}, row = {}, strategy = DEFAULT_PRICING_STRATEGY) {
  const normalized = normalizePricingStrategy(strategy);
  const { band } = resolveProductChannelBands(row, product, normalized);
  const packMargins = normalizePackMargins(row.pack_margins);
  const applied = applyStrategyToProduct(product, row, strategy);
  return getSellableVariants(applied).map((variant) => {
    const label = variant.label || variant.packLabel || 'Pack';
    return {
      label,
      price: parseOptionalNumber(variant.price),
      web: parseOptionalNumber(variant.price),
      store: parseOptionalNumber(variant.price),
      margin_pct: resolvePackMarginPct(label, packMargins, band, normalized),
    };
  }).filter((item) => item.price != null);
}

export function formatPackPricePreviewLine(packs = [], { max = 3 } = {}) {
  if (!packs.length) return '—';
  const slice = packs.slice(0, max);
  const parts = slice.map((pack) => {
    const amount = pack.price ?? pack.web ?? pack.store;
    const margin = parseOptionalNumber(pack.margin_pct);
    const priceText = amount != null ? `₹${amount}` : '—';
    const marginText = margin != null ? ` ${margin}%` : '';
    return `${pack.label} ${priceText}${marginText}`;
  });
  const suffix = packs.length > max ? ` +${packs.length - max} more` : '';
  return `${parts.join(' · ')}${suffix}`;
}

/** Whether row edits are saved to the product (shop / POS / labels). */
export function getPricingRowStatus(product = {}, row = {}, strategy = DEFAULT_PRICING_STRATEGY) {
  if (row?.dirty) return 'pending';

  const purchase = parseOptionalNumber(row.purchase_rate_per_kg);
  if (purchase == null || purchase <= 0) return 'missing_cost';

  const preview = applyStrategyToProduct(product, row, strategy);
  const current = getSellableVariants(product);
  const next = getSellableVariants(preview);

  if (next.length !== current.length) return 'pending';

  for (let i = 0; i < next.length; i += 1) {
    const a = next[i];
    const b = current.find((v) => (v.label || v.packLabel) === (a.label || a.packLabel)) || current[i];
    if (!b) return 'pending';
    if (parseOptionalNumber(a.price) !== parseOptionalNumber(b.price)) return 'pending';
  }

  return 'synced';
}
