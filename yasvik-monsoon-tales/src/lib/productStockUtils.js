import { isPricingMetaVariant } from '@/lib/productPricingMeta';
import {
  formatStockAmount,
  getStockInputMeta,
  isValidStockMeasureType,
  usesBulkMeasureType,
} from '@/lib/stockMeasureTypes';

export { usesBulkMeasureType };

export function parseProductVariants(product = {}) {
  const raw = product?.quick_variants ?? product?.variants ?? [];
  if (Array.isArray(raw)) {
    return raw.filter((variant) => variant && typeof variant === 'object' && !isPricingMetaVariant(variant));
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter((variant) => variant && !isPricingMetaVariant(variant))
        : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Products with pack_kg variants use shared bulk pool (kg or litres). */
export function productUsesBulkStock(product = {}) {
  return parseProductVariants(product).some((variant) => Number(variant?.pack_kg) > 0);
}

/** Variant label/sku uses ml or litres (oils, honey, ghee, etc.). */
export function variantUsesVolume(variant = {}) {
  const label = String(variant.label || '').toLowerCase();
  const sku = String(variant.sku || '').toLowerCase();
  const text = `${label} ${sku}`;
  if (/\d+\s*ml\b|\d+ml\b|\d+\s*l\b|\d+l\b|litre|liter/.test(text)) return true;
  if (/\d+\s*(kg|g|gm|gram)\b/.test(text)) return false;
  return /litre|liter|\bml\b/.test(String(variant.notes || '').toLowerCase());
}

/** Bulk stock tracked in litres (stored in shared_stock_kg: 1 = 1L, 0.5 = 500ml). */
export function productUsesVolumeStock(product = {}) {
  const variants = parseProductVariants(product).filter((variant) => Number(variant?.pack_kg) > 0);
  if (!variants.length) return false;
  const volumeCount = variants.filter(variantUsesVolume).length;
  return volumeCount > 0 && volumeCount >= Math.ceil(variants.length / 2);
}

/** Explicit or inferred measure type: kg | L | units */
export function resolveProductMeasureType(product = {}) {
  const raw = product.stock_measure_type ?? product.stockMeasureType;
  if (isValidStockMeasureType(raw)) return raw;
  if (productUsesBulkStock(product)) return productUsesVolumeStock(product) ? 'L' : 'kg';
  return 'units';
}

export function getProductBulkStockUnit(product = {}) {
  const measureType = resolveProductMeasureType(product);
  if (measureType === 'L') return 'volume';
  if (measureType === 'kg') return 'weight';
  return 'units';
}

function trimAmount(value) {
  return String(Number(Number(value).toFixed(3)));
}

/** Display bulk amount with product measure type. */
export function formatBulkStockDisplay(value, unitOrMeasure = 'weight') {
  const measureType = unitOrMeasure === 'volume' ? 'L' : unitOrMeasure === 'weight' ? 'kg' : unitOrMeasure;
  return formatStockAmount(value, measureType);
}

export function formatVariantPackSize(variant = {}, measureType = null) {
  if (measureType === 'L' || (!measureType && variantUsesVolume(variant))) {
    return variant.label || formatStockAmount(variant.pack_kg, 'L');
  }
  if (Number(variant.pack_kg) > 0) return variant.label || `${variant.pack_kg} kg`;
  return variant.label || '';
}

export function getBulkStockInputMeta(unit = 'weight') {
  const measureType = unit === 'volume' ? 'L' : unit === 'weight' ? 'kg' : unit;
  return getStockInputMeta(measureType);
}

export function getVariantStockUnits(variant, product) {
  const vStock = Number(variant?.stock ?? variant?.visible_stock_units);
  if (Number.isFinite(vStock) && vStock >= 0) return vStock;
  const pStock = Number(product?.stock ?? product?.stock_quantity);
  return Number.isFinite(pStock) && pStock >= 0 ? pStock : 0;
}

/** Sellable stock for admin badges / filters. */
export function getProductEffectiveStock(product = {}) {
  const measureType = resolveProductMeasureType(product);
  if (usesBulkMeasureType(measureType)) {
    const bulk = Number(product.shared_stock_kg);
    return Number.isFinite(bulk) && bulk >= 0 ? bulk : 0;
  }

  const variants = parseProductVariants(product);
  const variantStocks = variants
    .map((variant) => {
      const n = Number(variant?.stock);
      return Number.isFinite(n) && n >= 0 ? n : null;
    })
    .filter((n) => n !== null);

  if (variantStocks.length > 0) {
    return variantStocks.reduce((sum, n) => sum + n, 0);
  }

  const productStock = Number(product?.stock ?? product?.stock_quantity);
  return Number.isFinite(productStock) && productStock >= 0 ? productStock : 0;
}

/** Human label for the products table stock column. */
export function getAdminStockLabel(product = {}) {
  const measureType = resolveProductMeasureType(product);
  if (usesBulkMeasureType(measureType)) {
    return formatStockAmount(product.shared_stock_kg, measureType);
  }
  return formatStockAmount(getProductEffectiveStock(product), 'units');
}

export function getAdminStockEditorState(product = {}) {
  const variants = parseProductVariants(product);
  const measureType = resolveProductMeasureType(product);

  if (usesBulkMeasureType(measureType)) {
    return {
      mode: 'bulk',
      measureType,
      bulkUnit: measureType === 'L' ? 'volume' : 'weight',
      bulkKg: Number(product.shared_stock_kg) || 0,
      inputMeta: getStockInputMeta(measureType),
      variants: variants.map((v) => ({
        key: v.sku || v.label,
        label: v.label || v.sku || 'Variant',
        packLabel: formatVariantPackSize(v, measureType),
        pack_kg: v.pack_kg,
        stock: Number(v.stock) || 0,
      })),
    };
  }
  if (variants.length > 0) {
    return {
      mode: 'variants',
      measureType,
      bulkKg: Number(product.stock_quantity ?? product.stock) || 0,
      inputMeta: getStockInputMeta('units'),
      variants: variants.map((v) => ({
        key: v.sku || v.label,
        label: v.label || v.sku || 'Variant',
        packLabel: formatVariantPackSize(v, measureType),
        pack_kg: v.pack_kg,
        stock: Number(v.stock ?? v.visible_stock_units) || 0,
      })),
    };
  }
  return {
    mode: 'units',
    measureType,
    bulkKg: Number(product.stock_quantity ?? product.stock) || 0,
    inputMeta: getStockInputMeta('units'),
    variants: [],
  };
}

export function resolveProductStockForSave(formStock, quickVariants = []) {
  const productStock = Number(formStock) || 0;
  const variantStocks = quickVariants
    .filter((variant) => variant && !isPricingMetaVariant(variant))
    .map((variant) => Number(variant.stock))
    .filter((n) => Number.isFinite(n) && n >= 0);

  if (!variantStocks.length) return productStock;
  const sum = variantStocks.reduce((total, n) => total + n, 0);
  return Math.max(productStock, sum);
}
