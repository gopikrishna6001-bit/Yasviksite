import { buildProductSavePayload, productToEditorForm } from '@/lib/adminProductFormUtils';
import { getAdminStockEditorState, resolveProductMeasureType } from '@/lib/productStockUtils';
import { usesBulkMeasureType } from '@/lib/stockMeasureTypes';

export function productToQuickOpsDraft(product = {}) {
  const editor = getAdminStockEditorState(product);
  return {
    stock_measure_type: resolveProductMeasureType(product),
    category_id: product.category_id || '',
    local_name: product.local_name || product.telugu_name || '',
    sku: product.sku || '',
    price: product.price ?? '',
    sort_order: product.sort_order ?? 0,
    is_published: !!product.is_published,
    bulkStock: String(editor.bulkKg),
    variantStocks: Object.fromEntries(editor.variants.map((v) => [v.key, String(v.stock)])),
    editorMode: editor.mode,
    variants: editor.variants,
  };
}

function draftsEqual(a, b) {
  if (!a || !b) return false;
  if (
    a.stock_measure_type !== b.stock_measure_type
    || a.category_id !== b.category_id
    || a.local_name !== b.local_name
    || a.sku !== b.sku
    || String(a.price) !== String(b.price)
    || String(a.sort_order) !== String(b.sort_order)
    || a.is_published !== b.is_published
    || a.bulkStock !== b.bulkStock
  ) {
    return false;
  }
  const keys = new Set([...Object.keys(a.variantStocks || {}), ...Object.keys(b.variantStocks || {})]);
  for (const key of keys) {
    if ((a.variantStocks?.[key] ?? '') !== (b.variantStocks?.[key] ?? '')) return false;
  }
  return true;
}

export function isQuickOpsDirty(product, draft) {
  const baseline = productToQuickOpsDraft(product);
  return !draftsEqual(baseline, draft);
}

export function buildQuickOpsPayload(product, draft) {
  const form = productToEditorForm(product);
  form.stock_measure_type = draft.stock_measure_type || 'kg';
  form.category_id = draft.category_id || '';
  form.local_name = draft.local_name || '';
  form.sku = draft.sku || '';
  form.price = draft.price;
  form.sort_order = Number(draft.sort_order) || 0;
  form.is_published = !!draft.is_published;

  const baseline = productToQuickOpsDraft(product);
  if (String(draft.price) !== String(baseline.price)) {
    form.selling_price_per_kg = '';
  }

  if (usesBulkMeasureType(draft.stock_measure_type)) {
    form.stock = Number(draft.bulkStock) || 0;
  } else if (!draft.variants?.length) {
    form.stock = Number(draft.bulkStock) || 0;
  }

  if (form.variants?.length && draft.variantStocks) {
    form.variants = form.variants.map((variant) => {
      const key = variant.sku || variant.label;
      if (draft.variantStocks[key] === undefined) return variant;
      return { ...variant, stock: Number(draft.variantStocks[key]) || 0 };
    });
  }

  const payload = buildProductSavePayload(form);
  return payload;
}
