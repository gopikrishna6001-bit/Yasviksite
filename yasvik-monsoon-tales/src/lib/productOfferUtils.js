import { resolveVariantComparePrice } from '@/lib/productPricingUtils';
import { normalizeList, normalizeProductVariant } from '@/lib/productVariantUtils';

export function getProductOfferMeta(product, variant = null) {
  const normalized = variant ? normalizeProductVariant(variant) : null;
  const price = Number(normalized?.price ?? product?.price ?? 0);
  const compare = Number(resolveVariantComparePrice(product, normalized, price) ?? 0);
  if (!Number.isFinite(price) || !Number.isFinite(compare) || compare <= price) return null;
  const discountPct = Math.round(((compare - price) / compare) * 100);
  if (discountPct < 1) return null;
  return {
    price,
    comparePrice: compare,
    discountPct,
    savings: compare - price,
  };
}

export function getBestProductOffer(product) {
  const variants = normalizeList(product?.quick_variants ?? product?.variants).filter(Boolean);
  let best = getProductOfferMeta(product);
  for (const variant of variants) {
    const offer = getProductOfferMeta(product, variant);
    if (!offer) continue;
    if (!best || offer.discountPct > best.discountPct) best = offer;
  }
  return best;
}

export function filterOfferProducts(products = [], limit = 8) {
  return products
    .map((product) => ({ product, offer: getBestProductOffer(product) }))
    .filter(({ offer }) => offer && offer.discountPct >= 3)
    .sort((a, b) => b.offer.discountPct - a.offer.discountPct)
    .slice(0, limit)
    .map(({ product }) => product);
}
