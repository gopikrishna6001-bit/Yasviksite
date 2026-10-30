import { productToQuickOpsDraft } from '@/lib/productQuickOpsUtils';
import { getAdminStockEditorState, parseProductVariants } from '@/lib/productStockUtils';
import { usesBulkMeasureType } from '@/lib/stockMeasureTypes';

function roundKg(value) {
  return Number(Number(value).toFixed(3));
}

/**
 * Compute delta-based stock adjustments for quick-ops draft vs current product.
 * Returns entries suitable for recordStockAdjustment (reason: count).
 */
export function computeQuickOpsStockAdjustments(product = {}, draft = {}) {
  const baseline = productToQuickOpsDraft(product);
  const editor = getAdminStockEditorState(product);
  const adjustments = [];

  if (usesBulkMeasureType(draft.stock_measure_type ?? editor.measureType)) {
    const prev = Number(baseline.bulkStock) || 0;
    const next = Number(draft.bulkStock) || 0;
    const delta = roundKg(next - prev);
    if (delta !== 0) {
      adjustments.push({
        product_id: product.id,
        delta_kg: delta,
        delta_units: 0,
        reason: 'count',
        notes: `Quick ops stock count (${prev} → ${next})`,
      });
    }
    return adjustments;
  }

  if (editor.variants.length > 0) {
    const catalogVariants = parseProductVariants(product);
    for (const variant of editor.variants) {
      const prev = Number(baseline.variantStocks?.[variant.key]) || 0;
      const next = Number(draft.variantStocks?.[variant.key]) || 0;
      const delta = next - prev;
      if (delta === 0) continue;
      const match = catalogVariants.find((v) => (v.sku || v.label) === variant.key);
      adjustments.push({
        product_id: product.id,
        delta_units: delta,
        delta_kg: 0,
        variant_sku: match?.sku || null,
        variant_label: match?.label || variant.label || variant.key,
        reason: 'count',
        notes: `Quick ops variant count (${variant.label || variant.key}: ${prev} → ${next})`,
      });
    }
    return adjustments;
  }

  const prev = Number(baseline.bulkStock) || 0;
  const next = Number(draft.bulkStock) || 0;
  const delta = next - prev;
  if (delta !== 0) {
    adjustments.push({
      product_id: product.id,
      delta_units: delta,
      delta_kg: 0,
      reason: 'count',
      notes: `Quick ops stock count (${prev} → ${next})`,
    });
  }
  return adjustments;
}

/** Single bulk-refill adjustment for one product. */
export function computeBulkStockAdjustment(product = {}, targetLevel) {
  const editor = getAdminStockEditorState(product);
  const next = Number(targetLevel);
  if (!Number.isFinite(next) || next < 0) return null;

  if (usesBulkMeasureType(editor.measureType)) {
    const prev = Number(editor.bulkKg) || 0;
    const delta = roundKg(next - prev);
    if (delta === 0) return null;
    return {
      product_id: product.id,
      delta_kg: delta,
      delta_units: 0,
      reason: 'count',
      notes: `Bulk stock refill (${prev} → ${next})`,
    };
  }

  if (editor.variants.length > 0) {
    return null;
  }

  const prev = Number(editor.bulkKg) || 0;
  const delta = next - prev;
  if (delta === 0) return null;
  return {
    product_id: product.id,
    delta_units: delta,
    delta_kg: 0,
    reason: 'count',
    notes: `Bulk stock refill (${prev} → ${next})`,
  };
}
