import { isPricingMetaVariant } from '@/lib/productPricingMeta';
import { parsePackKg } from '@/lib/productVariantUtils';

export function getSellableProductVariants(productOrList) {
  const raw = Array.isArray(productOrList)
    ? productOrList
    : (productOrList?.quick_variants ?? productOrList?.variants ?? []);
  return (Array.isArray(raw) ? raw : []).filter((v) => v && !isPricingMetaVariant(v));
}

/** Reference pack for value comparison — prefer 1kg, else smallest pack. */
export function getReferencePackVariant(variants = []) {
  const sellable = variants
    .map((v) => ({ ...v, _packKg: parsePackKg(v.pack_kg, v.label) }))
    .filter((v) => v._packKg);
  if (!sellable.length) return null;

  const oneKg = sellable.find((v) => v._packKg === 1);
  if (oneKg) return oneKg;

  return sellable.reduce((min, v) => (!min || v._packKg < min._packKg ? v : min), null);
}

export function getEffectivePerKg(variant) {
  const packKg = parsePackKg(variant?.pack_kg, variant?.label);
  const price = Number(variant?.price);
  if (!packKg || !Number.isFinite(price) || price <= 0) return null;
  return price / packKg;
}

/** Yasvik pack tiers — everyday kitchen language, not supermarket promos. */
export function getPackValueTier(packKg) {
  if (!packKg || packKg < 1) return null;
  if (packKg >= 5) return 'home';
  if (packKg >= 2) return 'kitchen';
  return null;
}

export function formatPackTierLabel(packKg) {
  const tier = getPackValueTier(packKg);
  if (tier === 'home') return 'Home stock';
  if (tier === 'kitchen') return 'Kitchen stock';
  return null;
}

/** Same fair pricing as market bulk; framed for Yasvik, not copied from competitors. */
export function computePackBulkSavings(variants, targetVariant) {
  const ref = getReferencePackVariant(variants);
  if (!ref || !targetVariant) return null;

  const refPackKg = parsePackKg(ref.pack_kg, ref.label);
  const packKg = parsePackKg(targetVariant.pack_kg, targetVariant.label);
  const refPerKg = getEffectivePerKg(ref);
  const price = Number(targetVariant.price);

  if (!refPackKg || !packKg || packKg <= refPackKg || !refPerKg || !Number.isFinite(price)) return null;

  const targetPerKg = price / packKg;
  const savingsPerKg = refPerKg - targetPerKg;
  if (!Number.isFinite(savingsPerKg) || savingsPerKg < 1) return null;

  return {
    packKg,
    tier: getPackValueTier(packKg),
    tierLabel: formatPackTierLabel(packKg),
    referenceLabel: ref.label,
    referencePerKg: Math.round(refPerKg),
    savingsPerKg: Math.round(savingsPerKg),
    savingsOnPack: Math.round(savingsPerKg * packKg),
    targetPerKg: Math.round(targetPerKg),
  };
}

/** Chip on pack selector — tier name only. */
export function formatBulkSavingsShort(savings) {
  if (!savings?.savingsPerKg) return '';
  return savings.tierLabel || 'Fair per kg';
}

/** Compact rate line for shop cards and list rows. */
export function formatPackRateLine(savings) {
  if (!savings?.targetPerKg) return '';
  if (savings.tierLabel) return `${savings.tierLabel} · ₹${savings.targetPerKg}/kg`;
  return `₹${savings.targetPerKg}/kg`;
}

/**
 * Value copy by surface:
 * - card / cart: short — tier + rate only
 * - detail: adds everyday-cooking context
 * - checkout: may mention line benefit when qty > 1
 */
export function formatBulkSavingsPack(savings, qty = 1, surface = 'detail') {
  if (!savings?.targetPerKg) return '';
  const head = formatPackRateLine(savings);
  if (!head) return '';

  if (surface === 'card' || surface === 'cart') return head;

  if (surface === 'checkout' && qty > 1 && savings.savingsOnPack) {
    const total = savings.savingsOnPack * qty;
    return `${head} — everyday fair pricing · ₹${total} on this line`;
  }

  return `${head} — fairer for everyday cooking`;
}

export function formatCartBulkSavingsTotal(total) {
  if (!total) return '';
  return `Everyday fair pricing on this order · ₹${total}`;
}

export function getLineItemBulkSavingsTotal(item = {}) {
  const perPack = Number(item?.bulk_savings?.savingsOnPack);
  if (!Number.isFinite(perPack) || perPack <= 0) return 0;
  return perPack * Math.max(1, Number(item.qty) || 1);
}

export function sumCartBulkSavings(items = []) {
  return items.reduce((sum, item) => sum + getLineItemBulkSavingsTotal(item), 0);
}
