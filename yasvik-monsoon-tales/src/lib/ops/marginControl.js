/**
 * Yasvik Operations — Pricing & Margin Control (calibrated).
 *
 * Rules:
 * - Unit economics exclude full delivery cost (that is basket-level).
 * - Delivery subsidy = max(0, actual_porter − customer_fee), shared by revenue weight.
 * - Payment fee only when the scenario uses online/card payment.
 * - Bonus stress uses configured max redeem % of the line (default 5%).
 * - Safe price uses ₹ minimum contribution AND target % on contribution-before-delivery.
 * Recommend only — never writes shelf prices.
 */

import { parseOptionalNumber } from '@/lib/productPricingUtils';
import { parsePackKg, parsePackQuantity } from '@/lib/productVariantUtils';
import { resolveProductMeasureType } from '@/lib/productStockUtils';
import { isPricingMetaVariant, extractPricingMetaFromVariants } from '@/lib/productPricingMeta';
import {
  extractProductStrategy,
  resolvePackMarginPct,
  normalizePackMoneyMap,
  formatRupee,
  DEFAULT_PRICING_STRATEGY,
} from '@/lib/pricingStrategy';

export const OPS_MARGIN_SETTINGS_KEY = 'ops_margin_defaults';

/** Category wastage defaults (% of content cost). Owner can override globally. */
export const CATEGORY_WASTAGE_PCT = {
  oil: 1,
  pickle: 3,
  snack: 4,
  sweet: 3,
  honey: 1,
  ghee: 1,
  rice: 2,
  millet: 2,
  dry_fruit: 2,
  default: 2,
};

export const DEFAULT_OPS_MARGIN_ASSUMPTIONS = {
  payment_fee_pct: 2.0,
  payment_fee_flat_rs: 0,
  store_payment_fee_pct: 0,
  label_cost_rs: 2,
  /** Fallback when category unknown */
  content_wastage_pct: 2,
  target_margin_pct: 20,
  /** Commercial floor — ₹ contribution after product+pack+label+payment, before delivery */
  min_contribution_rs: 25,
  /** Align with bonus.max_redeem_percent (currently 5) */
  bonus_redeem_pct: 5,
  /** Typical Porter/Rapido actual cost when not recorded on order */
  typical_porter_cost_rs: 100,
  heavy_porter_cost_rs: 150,
  free_delivery_threshold_rs: 999,
  local_fee_below_299_rs: 30,
  local_fee_299_500_rs: 30,
  local_fee_500_999_rs: 49,
  /** Deprecated flat per-SKU subsidy — kept for settings migration, ignored by scenarios */
  delivery_subsidy_rs: 0,
};

export function normalizeOpsMarginAssumptions(raw = {}) {
  const base = { ...DEFAULT_OPS_MARGIN_ASSUMPTIONS };
  for (const key of Object.keys(base)) {
    if (raw[key] === '' || raw[key] == null) continue;
    const n = Number(raw[key]);
    if (Number.isFinite(n)) base[key] = n;
  }
  return base;
}

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

function normalizePackKey(label = '') {
  return String(label || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/litre|liter|ltr/g, 'l')
    .replace(/grams?|gms?/g, 'g')
    .replace(/millilitres?|milliliters?/g, 'ml');
}

function lookupPackMoney(map, label) {
  const normalized = normalizePackMoneyMap(map);
  const needle = normalizePackKey(label);
  const hit = Object.entries(normalized).find(([k]) => normalizePackKey(k) === needle);
  return hit ? Number(hit[1]) : 0;
}

export function inferProductFamily(product = {}) {
  const hay = `${product.slug || ''} ${product.name || ''} ${product.title || ''} ${product.category_name || ''}`.toLowerCase();
  if (/oil|sesame|groundnut|coconut oil|niger/.test(hay)) return 'oil';
  if (/pickle|avakaya|pachadi|pickle/.test(hay)) return 'pickle';
  if (/snack|murukku|chegodi|boondi|mixture|chips|namkeen/.test(hay)) return 'snack';
  if (/jaggery|sweet|laddu|halwa/.test(hay)) return 'sweet';
  if (/honey/.test(hay)) return 'honey';
  if (/ghee/.test(hay)) return 'ghee';
  if (/rice|kattuyanam|sona|basmati/.test(hay)) return 'rice';
  if (/millet|ragi|jowar|bajra|foxtail|kodo|barnyard|little millet/.test(hay)) return 'millet';
  if (/dry.?fruit|almond|cashew|pistachio|raisin|combo/.test(hay)) return 'dry_fruit';
  return 'default';
}

export function wastagePctForProduct(product, assumptions = DEFAULT_OPS_MARGIN_ASSUMPTIONS) {
  const family = inferProductFamily(product);
  if (assumptions.content_wastage_pct != null && assumptions._forceGlobalWastage) {
    return Number(assumptions.content_wastage_pct);
  }
  return CATEGORY_WASTAGE_PCT[family] ?? assumptions.content_wastage_pct ?? CATEGORY_WASTAGE_PCT.default;
}

/**
 * Basket-level delivery economics → line share of Yasvik subsidy.
 * subsidy = max(0, actualCost − customerFee)
 */
export function allocateDeliverySubsidy({
  lineRevenueRs,
  basketRevenueRs,
  customerFeeRs = 0,
  actualDeliveryCostRs = 0,
  lineCount = 1,
} = {}) {
  const basket = Math.max(0, Number(basketRevenueRs) || 0);
  const line = Math.max(0, Number(lineRevenueRs) || 0);
  const fee = Math.max(0, Number(customerFeeRs) || 0);
  const actual = Math.max(0, Number(actualDeliveryCostRs) || 0);
  const orderSubsidy = Math.max(0, actual - fee);
  if (orderSubsidy <= 0) {
    return { orderSubsidy: 0, lineSubsidy: 0, share: 0 };
  }
  let share = 0;
  if (basket > 0 && line > 0) share = line / basket;
  else if (lineCount > 0) share = 1 / lineCount;
  else share = 1;
  return {
    orderSubsidy: round2(orderSubsidy),
    lineSubsidy: round2(orderSubsidy * share),
    share: round2(share),
  };
}

function localCustomerFee(basketRs, assumptions) {
  const a = assumptions;
  if (basketRs < 299) return a.local_fee_below_299_rs;
  if (basketRs < 500) return a.local_fee_299_500_rs;
  if (basketRs < a.free_delivery_threshold_rs) return a.local_fee_500_999_rs;
  return 0;
}

/**
 * Built-in order scenarios. Delivery is never assigned 100% to every SKU.
 */
export function buildOrderScenarios(lineSellRs, assumptions = DEFAULT_OPS_MARGIN_ASSUMPTIONS) {
  const a = normalizeOpsMarginAssumptions(assumptions);
  const line = Math.max(0, Number(lineSellRs) || 0);
  const threshold = a.free_delivery_threshold_rs;
  const porter = a.typical_porter_cost_rs;
  const heavyPorter = a.heavy_porter_cost_rs;

  const scenarios = [
    {
      id: 'store',
      label: 'Store / POS',
      applyPaymentFee: false,
      paymentChannel: 'store',
      basketRevenueRs: line,
      customerFeeRs: 0,
      actualDeliveryCostRs: 0,
      lineCount: 1,
      note: 'No delivery · cash/UPI at counter',
    },
    {
      id: 'local_below',
      label: 'Local below free threshold',
      applyPaymentFee: true,
      paymentChannel: 'online',
      basketRevenueRs: Math.max(line, 400),
      customerFeeRs: localCustomerFee(Math.max(line, 400), a),
      actualDeliveryCostRs: porter,
      lineCount: line >= 350 ? 1 : 2,
      note: `Customer pays fee · Porter ~₹${porter} · subsidy shared`,
    },
    {
      id: 'local_free',
      label: 'Local above free threshold',
      applyPaymentFee: true,
      paymentChannel: 'online',
      basketRevenueRs: Math.max(line, threshold + 50),
      customerFeeRs: 0,
      actualDeliveryCostRs: porter,
      lineCount: Math.max(2, Math.round(Math.max(line, threshold + 50) / Math.max(line, 1))),
      note: `Customer fee ₹0 · Yasvik bears Porter ~₹${porter}`,
    },
    {
      id: 'heavy',
      label: 'Heavy / fragile basket',
      applyPaymentFee: true,
      paymentChannel: 'online',
      basketRevenueRs: Math.max(line, 800),
      customerFeeRs: localCustomerFee(Math.max(line, 800), a),
      actualDeliveryCostRs: heavyPorter,
      lineCount: 2,
      note: `Higher Porter ~₹${heavyPorter} · oils/rice risk`,
    },
    {
      id: 'multi',
      label: 'Multi-item basket (4 lines)',
      applyPaymentFee: true,
      paymentChannel: 'online',
      basketRevenueRs: Math.max(line * 4, threshold),
      customerFeeRs: localCustomerFee(Math.max(line * 4, threshold), a),
      actualDeliveryCostRs: porter,
      lineCount: 4,
      note: 'Subsidy split across 4 lines by revenue share',
    },
  ];

  // Force multi-item share to ~1/4 when we invent companion revenue
  scenarios.forEach((s) => {
    if (s.id === 'multi') {
      s.basketRevenueRs = line * 4;
      s.customerFeeRs = localCustomerFee(s.basketRevenueRs, a);
    }
    if (s.id === 'local_free' && line < threshold) {
      // Companions make up the threshold basket
      s.basketRevenueRs = threshold + 50;
      s.lineCount = Math.max(2, Math.ceil(s.basketRevenueRs / Math.max(line, 1)));
    }
  });

  return scenarios;
}

/**
 * Unit stack + scenario overlays.
 */
export function computeVariantMargin({
  purchasePerKg,
  packKg,
  packagingRs = 0,
  labelCostRs = 0,
  sellingPrice,
  comparePrice = null,
  assumptions = DEFAULT_OPS_MARGIN_ASSUMPTIONS,
  wastagePct = null,
  product = null,
} = {}) {
  const purchase = parseOptionalNumber(purchasePerKg);
  const qty = parseOptionalNumber(packKg);
  const packaging = Math.max(0, parseOptionalNumber(packagingRs) ?? 0);
  const a = normalizeOpsMarginAssumptions(assumptions);
  // If pack packaging map already has a cost, treat it as full primary pack BOM (pouch/bottle/cap/seal/label).
  // Only apply default label_cost_rs when packaging is missing.
  const label = packaging > 0
    ? 0
    : Math.max(0, parseOptionalNumber(labelCostRs) ?? a.label_cost_rs ?? 0);
  const sell = parseOptionalNumber(sellingPrice);
  const wastePct = wastagePct != null
    ? Number(wastagePct)
    : wastagePctForProduct(product || {}, a);

  if (purchase == null || purchase < 0 || qty == null || qty <= 0 || sell == null || sell <= 0) {
    return null;
  }

  const contentCost = purchase * qty;
  const wastageOnContent = contentCost * (Math.max(0, wastePct) / 100);
  const productLanded = contentCost + wastageOnContent;
  const packAndLabel = packaging + label;

  // Contribution before delivery / payment — the commercial unit truth
  const contributionBeforeFeesAndDelivery = round2(sell - productLanded - packAndLabel);

  const onlineFeeRate = Math.max(0, a.payment_fee_pct) / 100;
  const storeFeeRate = Math.max(0, a.store_payment_fee_pct) / 100;
  const onlinePaymentFee = sell * onlineFeeRate + Math.max(0, a.payment_fee_flat_rs);
  const contributionAfterOnlineFee = round2(contributionBeforeFeesAndDelivery - onlinePaymentFee);
  const contributionAfterStoreFee = round2(
    contributionBeforeFeesAndDelivery - (sell * storeFeeRate),
  );

  const targetMarginPct = Math.max(0, a.target_margin_pct);
  const minContribution = Math.max(0, a.min_contribution_rs);

  // Safe price ignores delivery (basket-level). Includes online payment fee.
  // P - packCosts - feeRate*P >= max(minContribution, targetMargin% * P)
  const unitFixed = productLanded + packAndLabel + Math.max(0, a.payment_fee_flat_rs);
  const denomPct = 1 - onlineFeeRate - targetMarginPct / 100;
  const safeFromPct = denomPct > 0.05 ? unitFixed / denomPct : null;
  const denomFloor = 1 - onlineFeeRate;
  const safeFromFloor = denomFloor > 0.05
    ? (unitFixed + minContribution) / denomFloor
    : unitFixed + minContribution;
  const minSafePrice = round2(Math.max(safeFromPct ?? 0, safeFromFloor));

  const bonusHit = sell * (Math.max(0, a.bonus_redeem_pct) / 100);
  const contributionAfterBonusNoDelivery = round2(contributionAfterOnlineFee - bonusHit);

  const scenarios = buildOrderScenarios(sell, a).map((scenario) => {
    const feeRate = scenario.applyPaymentFee ? onlineFeeRate : storeFeeRate;
    const paymentFee = sell * feeRate + (scenario.applyPaymentFee ? Math.max(0, a.payment_fee_flat_rs) : 0);
    const alloc = allocateDeliverySubsidy({
      lineRevenueRs: sell,
      basketRevenueRs: scenario.basketRevenueRs,
      customerFeeRs: scenario.customerFeeRs,
      actualDeliveryCostRs: scenario.actualDeliveryCostRs,
      lineCount: scenario.lineCount,
    });
    const beforeDelivery = round2(sell - productLanded - packAndLabel - paymentFee);
    const afterDelivery = round2(beforeDelivery - alloc.lineSubsidy);
    const afterBonus = round2(afterDelivery - bonusHit);
    return {
      id: scenario.id,
      label: scenario.label,
      note: scenario.note,
      basketRevenueRs: scenario.basketRevenueRs,
      customerFeeRs: scenario.customerFeeRs,
      actualDeliveryCostRs: scenario.actualDeliveryCostRs,
      orderSubsidy: alloc.orderSubsidy,
      lineDeliverySubsidy: alloc.lineSubsidy,
      revenueShare: alloc.share,
      paymentFee: round2(paymentFee),
      contributionBeforeDelivery: beforeDelivery,
      contributionAfterDelivery: afterDelivery,
      contributionAfterBonus: afterBonus,
      meetsMinContribution: afterDelivery >= minContribution,
    };
  });

  const storeScenario = scenarios.find((s) => s.id === 'store');
  const localBelow = scenarios.find((s) => s.id === 'local_below');
  const localFree = scenarios.find((s) => s.id === 'local_free');
  const multi = scenarios.find((s) => s.id === 'multi');

  const maxSafeDiscountRs = round2(Math.max(0, sell - minSafePrice));
  const maxSafeDiscountPct = sell > 0 ? round2((maxSafeDiscountRs / sell) * 100) : 0;
  const belowSafe = sell + 0.001 < minSafePrice;
  const thinUnit = !belowSafe && contributionAfterOnlineFee < minContribution;
  const thinVsTarget = !belowSafe
    && !thinUnit
    && sell > 0
    && (contributionAfterOnlineFee / sell) * 100 < targetMarginPct;

  let channelAdvice = 'online_ok';
  if (belowSafe || thinUnit) channelAdvice = 'review_price';
  else if (localFree && localFree.contributionAfterDelivery < minContribution) {
    channelAdvice = localBelow && localBelow.contributionAfterDelivery >= minContribution
      ? 'prefer_store_or_bundle'
      : 'local_only_or_bundle';
  } else if (multi && multi.contributionAfterDelivery < minContribution) {
    channelAdvice = 'prefer_bundle_mates';
  }

  return {
    packKg: qty,
    sellingPrice: sell,
    mrp: parseOptionalNumber(comparePrice),
    family: inferProductFamily(product || {}),
    wastagePct: wastePct,
    costs: {
      content: round2(contentCost),
      wastage: round2(wastageOnContent),
      packaging: round2(packaging),
      label: round2(label),
      productLanded: round2(productLanded + packAndLabel),
      onlinePaymentFee: round2(onlinePaymentFee),
    },
    contributionBeforeDelivery: contributionBeforeFeesAndDelivery,
    contributionAfterOnlineFee,
    contributionAfterStoreFee,
    contributionAfterBonusNoDelivery,
    minSafePrice,
    recommendedPrice: minSafePrice,
    maxSafeDiscountRs,
    maxSafeDiscountPct,
    minContributionRs: minContribution,
    belowSafe,
    thinUnit,
    thinVsTarget,
    status: belowSafe ? 'below_safe' : (thinUnit || thinVsTarget) ? 'thin' : 'ok',
    channelAdvice,
    scenarios,
    store: storeScenario,
    localBelow,
    localFree,
    multi,
  };
}

export function formatMarginStatus(status) {
  if (status === 'below_safe') return { label: 'Below safe price', tone: 'danger' };
  if (status === 'thin') return { label: 'Thin contribution', tone: 'warn' };
  if (status === 'ok') return { label: 'OK', tone: 'ok' };
  if (status === 'incomplete') return { label: 'Missing cost data', tone: 'muted' };
  return { label: status || '—', tone: 'muted' };
}

export function formatChannelAdvice(advice) {
  switch (advice) {
    case 'review_price':
      return 'Raise price or cut cost before pushing online';
    case 'prefer_store_or_bundle':
      return 'OK in store / paid-delivery; weak when Yasvik funds free delivery alone';
    case 'local_only_or_bundle':
      return 'Prefer local/store or sell inside a stronger basket';
    case 'prefer_bundle_mates':
      return 'Fine with companions; weak as a lone online line';
    case 'online_ok':
      return 'Viable online across typical baskets';
    default:
      return '—';
  }
}

export function buildProductMarginRows(product, assumptions, strategy = DEFAULT_PRICING_STRATEGY) {
  const extracted = extractProductStrategy(product, strategy);
  const meta = extractPricingMetaFromVariants(product.quick_variants || product.variants || []);
  const packagingMap = normalizePackMoneyMap(meta.pack_packaging_rs || extracted.pack_packaging_rs);
  const purchase = extracted.purchase_rate_per_kg;
  const measureType = resolveProductMeasureType(product);
  const wastePct = wastagePctForProduct(product, assumptions);
  const variants = (product.quick_variants || product.variants || [])
    .filter((v) => v && !isPricingMetaVariant(v));

  const rows = [];
  for (const variant of variants) {
    const label = String(variant.label || variant.packLabel || '').trim() || 'Pack';
    const packKg = parsePackKg(variant, label)
      || parsePackQuantity(variant, label, measureType)
      || parseOptionalNumber(variant.quantity_value)
      || parseOptionalNumber(variant.pack_kg)
      || null;
    const packagingRs = lookupPackMoney(packagingMap, label);

    const onlinePrice = parseOptionalNumber(variant.price ?? product.price);
    const margin = computeVariantMargin({
      purchasePerKg: purchase,
      packKg,
      packagingRs,
      labelCostRs: assumptions.label_cost_rs,
      sellingPrice: onlinePrice,
      comparePrice: variant.compare_price ?? product.compare_at_price ?? product.compare_price,
      assumptions,
      wastagePct: wastePct,
      product,
    });

    rows.push({
      productId: product.id,
      productName: product.name || product.title,
      slug: product.slug,
      merchandisingTier: product.merchandising_tier,
      sellOnline: product.sell_online !== false,
      family: inferProductFamily(product),
      wastagePct: wastePct,
      variantId: variant.id || variant.variant_id || label,
      packLabel: label,
      purchasePerKg: purchase,
      packagingRs,
      packagingSource: packagingRs > 0 ? 'pack_packaging_rs' : 'missing',
      online: margin,
      // Back-compat aliases used by older UI bits
      store: margin?.store || null,
      status: margin?.status || 'incomplete',
      incomplete: !margin,
    });
  }

  if (!rows.length && purchase != null) {
    const margin = computeVariantMargin({
      purchasePerKg: purchase,
      packKg: 1,
      packagingRs: 0,
      sellingPrice: product.price,
      assumptions,
      wastagePct: wastePct,
      product,
    });
    rows.push({
      productId: product.id,
      productName: product.name || product.title,
      slug: product.slug,
      merchandisingTier: product.merchandising_tier,
      sellOnline: product.sell_online !== false,
      family: inferProductFamily(product),
      wastagePct: wastePct,
      variantId: 'base',
      packLabel: '1 unit (1kg basis assumed)',
      purchasePerKg: purchase,
      packagingRs: 0,
      packagingSource: 'missing',
      online: margin,
      store: margin?.store || null,
      status: margin?.status || 'incomplete',
      incomplete: !margin,
    });
  }

  return rows;
}

export { formatRupee, resolvePackMarginPct };
