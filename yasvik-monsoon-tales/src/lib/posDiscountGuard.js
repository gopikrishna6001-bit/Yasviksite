import { extractPricingMetaFromVariants } from '@/lib/productPricingMeta';

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) && String(value ?? '').trim() !== '' ? n : null;
}

/**
 * Estimate landed cost (₹) for one cart unit: purchase content + packaging add-on.
 * Uses pricing meta already stored on the product. Returns null when unknown.
 */
export function estimateLineLandedCostRs(product, { packKg = null, variantLabel = null } = {}) {
  if (!product) return null;
  const meta = extractPricingMetaFromVariants(product.quick_variants || product.variants || []);
  const rate = num(meta.purchase_rate_per_kg ?? product.purchase_rate_per_kg);
  const pack = num(packKg);
  if (rate == null || rate <= 0 || pack == null || pack <= 0) return null;

  const packagingMap = meta.pack_packaging_rs && typeof meta.pack_packaging_rs === 'object'
    ? meta.pack_packaging_rs
    : {};
  const packaging = num(packagingMap[variantLabel]) || 0;
  return rate * pack + packaging;
}

/**
 * For a flat % bill discount, find lines that would sell below landed cost.
 * Discount is allocated pro-rata (same as POS percent off the bill).
 */
export function findDiscountFloorBreaches(cart = [], productsById = {}, discountPercent = 0) {
  const pct = Math.max(0, Number(discountPercent) || 0);
  if (!(pct > 0) || !cart.length) {
    return { breaches: [], maxSafePercent: 100, knownLineCount: 0 };
  }

  const factor = 1 - pct / 100;
  const breaches = [];
  let knownLineCount = 0;
  let maxSafePercent = 100;

  for (const item of cart) {
    if (item?.exclude_from_discount || item?.discount_excluded) continue;
    if (!item?.productId || item.type === 'custom') continue;
    const product = productsById[item.productId];
    const unitLanded = estimateLineLandedCostRs(product, {
      packKg: item.pack_kg,
      variantLabel: item.variant,
    });
    if (unitLanded == null) continue;
    knownLineCount += 1;

    const listUnit = Number(item.price) || 0;
    if (!(listUnit > 0)) continue;

    const paidUnit = listUnit * factor;
    const lineLanded = unitLanded * (Number(item.qty) || 1);
    const paidLine = paidUnit * (Number(item.qty) || 1);
    const contrib = paidLine - lineLanded;

    // Max % this line can take before hitting cost: (list - landed) / list * 100
    const lineSafe = Math.max(0, ((listUnit - unitLanded) / listUnit) * 100);
    maxSafePercent = Math.min(maxSafePercent, lineSafe);

    if (contrib < -0.5) {
      breaches.push({
        key: item.key,
        title: item.title,
        variant: item.variant,
        listUnit,
        paidUnit: Math.round(paidUnit * 100) / 100,
        unitLanded: Math.round(unitLanded * 100) / 100,
        lossRs: Math.round(contrib * 100) / 100,
        maxSafePercent: Math.floor(lineSafe),
      });
    }
  }

  if (knownLineCount === 0) maxSafePercent = 100;
  else maxSafePercent = Math.max(0, Math.floor(maxSafePercent));

  return { breaches, maxSafePercent, knownLineCount };
}
