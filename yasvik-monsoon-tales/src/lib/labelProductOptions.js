import { getProductTeluguName } from '@/lib/teluguProductNames';
import { normalizeList, normalizeProductVariant } from '@/lib/productVariantUtils';
import { getProductNetWt } from '@/lib/priceLabelGenerator';

export function getProductVariants(product = {}) {
  const raw = product.quick_variants ?? product.variants ?? [];
  return normalizeList(raw)
    .map(normalizeProductVariant)
    .filter(Boolean);
}

export function getProductNameEn(product = {}) {
  return String(product.name_en || product.title || product.name || 'Product').trim();
}

export function getProductNameTe(product = {}) {
  return String(
    product.name_te ||
      product.telugu_name ||
      getProductTeluguName(product) ||
      ''
  ).trim();
}

export function getVariantWeightLabel(variant, product = {}) {
  if (variant?.label) return variant.label;
  return getProductNetWt(product);
}

/** Always returns at least one selectable pack option for labels. */
export function buildVariantOptions(product = {}) {
  const variants = getProductVariants(product);
  if (variants.length > 0) {
    return variants.map((variant, index) => ({
      ...variant,
      optionKey: variant.sku || variant.label || `variant-${index}`,
    }));
  }

  const weight = getProductNetWt(product);
  return [{
    label: weight !== '—' ? weight : 'Standard pack',
    sku: product.sku || '',
    price: product.price,
    compare_price: product.compare_price ?? product.discount_price,
    optionKey: 'default',
    isDefault: true,
  }];
}

export function resolveVariantPricing(product, variant) {
  const sellingPrice = variant?.price ?? product.price;
  const mrp = variant?.compare_price ?? product.compare_price ?? product.discount_price;
  return { sellingPrice, mrp };
}

export function formatVariantOptionLabel(variant, product = null) {
  const parts = [variant.label || 'Standard pack'];
  if (variant.price != null && variant.price !== '') {
    parts.push(`₹${variant.price}`);
  }
  return parts.join(' · ');
}
