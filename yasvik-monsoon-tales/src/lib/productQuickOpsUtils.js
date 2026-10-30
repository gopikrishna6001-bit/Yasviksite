import { buildProductSavePayload, productToEditorForm } from '@/lib/adminProductFormUtils';
import { getAdminStockEditorState, resolveProductMeasureType } from '@/lib/productStockUtils';
import { usesBulkMeasureType } from '@/lib/stockMeasureTypes';

export const ADMIN_PRODUCT_SORT_OPTIONS = [
  { id: 'recent', label: 'Recently added' },
  { id: 'name_asc', label: 'Name A → Z' },
  { id: 'name_desc', label: 'Name Z → A' },
  { id: 'price_asc', label: 'Price low → high' },
  { id: 'price_desc', label: 'Price high → low' },
  { id: 'sort_order', label: 'Shop display order' },
];

function normalizeList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function productTitle(product = {}) {
  return String(product.title || product.name || '').trim().toLowerCase();
}

function productPrice(product = {}) {
  return Number(product.price) || 0;
}

function productCreatedAt(product = {}) {
  const stamp = product.created_at || product.created_date;
  const time = stamp ? new Date(stamp).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

export function sortAdminProducts(products = [], sortBy = 'recent') {
  const list = [...products];
  switch (sortBy) {
    case 'name_asc':
      return list.sort((a, b) => productTitle(a).localeCompare(productTitle(b)));
    case 'name_desc':
      return list.sort((a, b) => productTitle(b).localeCompare(productTitle(a)));
    case 'price_asc':
      return list.sort((a, b) => productPrice(a) - productPrice(b));
    case 'price_desc':
      return list.sort((a, b) => productPrice(b) - productPrice(a));
    case 'sort_order':
      return list.sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0));
    case 'recent':
    default:
      return list.sort((a, b) => productCreatedAt(b) - productCreatedAt(a));
  }
}

function formatRupeeAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (Number.isInteger(amount) || Math.abs(amount - Math.round(amount)) < 0.001) {
    return Math.round(amount);
  }
  return amount.toFixed(2);
}

export function getAdminProductPriceLabel(product = {}) {
  const variants = [
    ...normalizeList(product.variants),
    ...normalizeList(product.quick_variants),
  ].filter((variant) => variant && typeof variant === 'object');

  const prices = variants
    .map((variant) => formatRupeeAmount(variant.price))
    .filter((value) => value != null);

  const unique = [...new Set(prices)].sort((a, b) => Number(a) - Number(b));
  if (unique.length > 1) {
    return `₹${unique[0]} – ₹${unique[unique.length - 1]}`;
  }
  if (unique.length === 1) return `₹${unique[0]}`;

  const base = formatRupeeAmount(product.price);
  return base != null ? `₹${base}` : '—';
}

export function getAdminPackPriceSummary(product = {}) {
  const variants = [
    ...normalizeList(product.variants),
    ...normalizeList(product.quick_variants),
  ].filter((variant) => variant && typeof variant === 'object' && variant.label && variant.label !== '__yasvik_pricing__');

  const seen = new Set();
  return variants
    .map((variant) => {
      const label = String(variant.label || variant.packLabel || '').trim();
      const amount = formatRupeeAmount(variant.price);
      if (!label || amount == null) return null;
      const key = `${label}:${amount}`;
      if (seen.has(key)) return null;
      seen.add(key);
      return { label, price: `₹${amount}`, web: `₹${amount}`, store: `₹${amount}` };
    })
    .filter(Boolean);
}

export function getAdminVariantPriceLabels(product = {}) {
  const variants = [
    ...normalizeList(product.variants),
    ...normalizeList(product.quick_variants),
  ].filter((variant) => variant && typeof variant === 'object' && variant.label);

  const seen = new Set();
  return variants
    .map((variant) => {
      const label = String(variant.label || variant.packLabel || '').trim();
      const amount = formatRupeeAmount(variant.price);
      if (!label || amount == null) return null;
      const key = `${label}:${amount}`;
      if (seen.has(key)) return null;
      seen.add(key);
      return { label, amount: `₹${amount}` };
    })
    .filter(Boolean);
}

export function productToQuickOpsDraft(product = {}) {
  const editor = getAdminStockEditorState(product);
  return {
    stock_measure_type: resolveProductMeasureType(product),
    category_id: product.category_id || '',
    local_name: product.local_name || product.telugu_name || '',
    sku: product.sku || '',
    sort_order: product.sort_order ?? 0,
    is_published: !!product.is_published,
    is_featured: !!product.is_featured,
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
    || String(a.sort_order) !== String(b.sort_order)
    || a.is_published !== b.is_published
    || a.is_featured !== b.is_featured
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

export function isQuickOpsStockDirty(product, draft) {
  const baseline = productToQuickOpsDraft(product);
  if (baseline.bulkStock !== draft.bulkStock) return true;
  const keys = new Set([...Object.keys(baseline.variantStocks || {}), ...Object.keys(draft.variantStocks || {})]);
  for (const key of keys) {
    if ((baseline.variantStocks?.[key] ?? '') !== (draft.variantStocks?.[key] ?? '')) return true;
  }
  return false;
}

export function isQuickOpsNonStockDirty(product, draft) {
  const baseline = productToQuickOpsDraft(product);
  return (
    baseline.stock_measure_type !== draft.stock_measure_type
    || baseline.category_id !== draft.category_id
    || baseline.local_name !== draft.local_name
    || baseline.sku !== draft.sku
    || String(baseline.sort_order) !== String(draft.sort_order)
    || baseline.is_published !== draft.is_published
    || baseline.is_featured !== draft.is_featured
  );
}

export function buildQuickOpsPayload(product, draft, { includeStock = true } = {}) {
  const form = productToEditorForm(product);
  form.stock_measure_type = draft.stock_measure_type || 'kg';
  form.category_id = draft.category_id || '';
  form.local_name = draft.local_name || '';
  form.sku = draft.sku || '';
  form.sort_order = Number(draft.sort_order) || 0;
  form.is_published = !!draft.is_published;
  form.is_featured = !!draft.is_featured;
  form.featured_in_hero = !!draft.is_featured;

  if (includeStock) {
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
  }

  const payload = buildProductSavePayload(form, { includeMedia: false });
  return payload;
}

/** Quick-ops fields excluding stock — stock goes through stock_movements ledger. */
export function buildQuickOpsNonStockPayload(product, draft) {
  return buildQuickOpsPayload(product, draft, { includeStock: false });
}
