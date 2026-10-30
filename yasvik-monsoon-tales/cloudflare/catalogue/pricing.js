/**
 * Customer-facing price display helpers.
 * Never invents discounts. Never exposes cost/margin.
 */

import { money, text } from './utils.js';

export function resolveVariantPricing(variant = {}, product = {}, options = {}) {
  const price = money(variant.price ?? variant.store_price ?? product.price);
  const mrp = money(
    variant.compare_price
    ?? variant.store_compare_price
    ?? product.compare_price
    ?? product.discount_price,
  );

  const showMrp = options.price_mode === 'mrp_and_selling'
    || options.content?.mrp
    || options.content?.savings;

  const genuine = showMrp && mrp != null && price != null && mrp > price;
  const savingsAmount = genuine ? mrp - price : null;
  const savingsPct = genuine ? Math.round((savingsAmount / mrp) * 100) : null;

  return {
    label: text(variant.label, 'Pack'),
    sku: text(variant.sku),
    weight: text(variant.label, 'Pack'),
    price,
    mrp: genuine ? mrp : null,
    savings_amount: savingsAmount,
    savings_pct: savingsPct,
    has_discount: genuine,
  };
}

export function productHasDealerPricing(product = {}) {
  return asHasDealer(product);
}

function asHasDealer(product) {
  const variants = Array.isArray(product.quick_variants) ? product.quick_variants : [];
  return variants.some((v) => {
    if (!v) return false;
    const dealer = money(v.dealer_price ?? v.wholesale_price ?? v.bulk_price);
    return dealer != null;
  });
}

export function resolveDealerVariantPricing(variant = {}) {
  const dealerPrice = money(variant.dealer_price ?? variant.wholesale_price ?? variant.bulk_price);
  const moq = Number(variant.moq ?? variant.minimum_order_qty ?? variant.min_qty);
  return {
    label: text(variant.label, 'Pack'),
    sku: text(variant.sku),
    dealer_price: dealerPrice,
    moq: Number.isFinite(moq) && moq > 0 ? moq : null,
    configured: dealerPrice != null,
  };
}

export function catalogueBadges(product = {}, salesRank = null, options = {}) {
  if (options.content?.badges === false) return [];
  const purity = Array.isArray(product.purity_badges) ? product.purity_badges : [];
  const lowerPurity = purity.map((b) => String(b).toLowerCase());

  // A single, meaningful badge keeps cards readable. "Fresh batch" and a
  // time-based "New" matched almost every product (the catalogue was bulk
  // imported), so they were noise. Only data-driven, sparse labels remain.
  if (salesRank != null && salesRank <= 8) return ['BESTSELLER'];
  if (lowerPurity.some((b) => b.includes('organic'))) return ['ORGANIC'];
  if (lowerPurity.some((b) => b.includes('limited'))) return ['LIMITED'];

  return [];
}

export function isOrganicProduct(product = {}) {
  const badges = Array.isArray(product.purity_badges) ? product.purity_badges : [];
  if (badges.some((b) => String(b).toLowerCase().includes('organic'))) return true;
  const hay = `${product.name || ''} ${product.short_description || ''}`.toLowerCase();
  return hay.includes('organic');
}
