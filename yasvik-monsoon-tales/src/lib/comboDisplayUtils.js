import { formatDisplayTitle } from '@/lib/formatDisplayTitle';
import { isPricingMetaVariant } from '@/lib/productPricingMeta';
import { productCardImageUrl } from '@/lib/mediaUrl';
import { parseProductVariants } from '@/lib/productStockUtils';
import { normalizeProductVariant, sortVariantsForShop } from '@/lib/productVariantUtils';

export function getComboProductTitle(product = {}) {
  return formatDisplayTitle(product?.title || product?.name, 'Yasvik product');
}

/** Default pack shown for a bundle line item (lowest price / smallest sellable variant). */
export function getComboPrimaryVariant(product = {}) {
  const variants = sortVariantsForShop(
    parseProductVariants(product).filter((row) => row && !isPricingMetaVariant(row)),
  );
  return normalizeProductVariant(variants[0]) || null;
}

export function getComboLinePrice(product = {}, variant = null) {
  const value = Number(variant?.price ?? product?.price ?? 0);
  return Number.isFinite(value) ? value : 0;
}

export function getComboLineImage(product = {}, variant = null) {
  return productCardImageUrl(product, variant, 'thumb');
}

/** Preserve bundle order; aggregate duplicate product ids. */
export function buildComboLineItems(productIds = [], products = []) {
  const byId = new Map((Array.isArray(products) ? products : []).map((row) => [row.id, row]));
  const order = [];
  const counts = new Map();

  (Array.isArray(productIds) ? productIds : []).forEach((id) => {
    if (!id || !byId.has(id)) return;
    counts.set(id, (counts.get(id) || 0) + 1);
    if (!order.includes(id)) order.push(id);
  });

  return order.map((id) => {
    const product = byId.get(id);
    const variant = getComboPrimaryVariant(product);
    return {
      product,
      productId: id,
      quantity: counts.get(id) || 1,
      variant,
      title: getComboProductTitle(product),
      packLabel: variant?.label || product?.unit || product?.pack_size || '',
      price: getComboLinePrice(product, variant),
      imageUrl: getComboLineImage(product, variant),
    };
  });
}

export function sumComboLineTotals(lineItems = []) {
  return lineItems.reduce((sum, row) => sum + row.price * row.quantity, 0);
}

export function isComboLineUnavailable(product = {}) {
  if (product?.sell_online === false) return true;
  const stock = Number(product?.stock_quantity ?? product?.stock);
  if (Number.isFinite(stock) && stock <= 0) return true;
  if (product?.availability === 'out_of_stock') return true;
  return false;
}
