import { buildVariantOptions } from '@/lib/labelProductOptions';

export function todayInputValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function newLabelQueueRowId() {
  return `row_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function defaultLabelPickerDraft() {
  return { variantIndex: 0, quantity: 1 };
}

export function mergeLabelQueueRows(rows, productsById) {
  const merged = new Map();
  rows.forEach((row) => {
    const qty = Math.max(0, Number(row.quantity) || 0);
    if (!qty) return;
    const product = productsById[row.productId];
    if (!product) return;
    const key = `${row.productId}:${row.variantIndex}`;
    const variant = buildVariantOptions(product)[row.variantIndex];
    const existing = merged.get(key);
    if (existing) {
      existing.quantity += qty;
    } else {
      merged.set(key, {
        productId: row.productId,
        variantIndex: row.variantIndex,
        quantity: qty,
        variant,
      });
    }
  });
  return [...merged.values()];
}
