/**
 * Shared helpers for the Yasvik catalogue publishing engine.
 * Never mutates live product prices.
 */

export const PRICING_META_LABEL = '__yasvik_pricing__';
export const SITE_ORIGIN = 'https://www.yasvik.com';
export const DEFAULT_LOGO_URL = 'https://www.yasvik.com/media/brand/logo-horizontal.png';

export function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function text(value, fallback = '') {
  const next = String(value ?? '').trim();
  return next || fallback;
}

export function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

export function slugify(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\w]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'catalogue';
}

/** Repeated marketing boilerplate that adds no value on a product card. */
const DESCRIPTION_BOILERPLATE = [
  /we keep it as a curated yasvik snack[.,][^.]*\.?/i,
  /focused on taste,?\s*freshness and honest packing\.?/i,
];

/** Clean a short description for a card: strip boilerplate, collapse space, clamp length. */
export function cleanShortDescription(value, maxLength = 150) {
  let next = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!next) return '';
  for (const pattern of DESCRIPTION_BOILERPLATE) next = next.replace(pattern, '').trim();
  next = next.replace(/\s+/g, ' ').replace(/[\s,]+$/, '').trim();
  if (next.length > maxLength) {
    const clipped = next.slice(0, maxLength);
    const lastSpace = clipped.lastIndexOf(' ');
    next = `${clipped.slice(0, lastSpace > 60 ? lastSpace : maxLength).trim()}…`;
  }
  return next;
}

/** Normalized key for detecting duplicated/templated copy across products. */
export function descriptionFingerprint(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

export function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatRupee(value) {
  const n = money(value);
  if (n == null) return '—';
  return `₹${n.toLocaleString('en-IN')}`;
}

export function monthYear(iso) {
  try {
    return new Date(iso || Date.now()).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
}

export function isPricingMetaVariant(variant = {}) {
  return variant?.label === PRICING_META_LABEL || variant?.sku === PRICING_META_LABEL;
}

export function sellableVariants(product = {}) {
  return asArray(product.quick_variants).filter((variant) => {
    if (!variant || isPricingMetaVariant(variant)) return false;
    return money(variant.price ?? variant.store_price) != null;
  });
}

export function productImage(product = {}) {
  return (
    text(product.catalogue_image_override) ||
    text(product.featured_image_url) ||
    text(product.hero_image) ||
    text(asArray(product.image_urls)[0]) ||
    ''
  );
}

export function productPath(product = {}) {
  const slug = text(product.slug);
  if (slug) return `/product/${encodeURIComponent(slug)}`;
  if (product.id) return `/product/${encodeURIComponent(product.id)}`;
  return '/shop';
}

export function productUrl(product = {}) {
  return `${SITE_ORIGIN}${productPath(product)}`;
}

export function qrImageUrl(targetUrl, size = 160) {
  const data = encodeURIComponent(targetUrl);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${data}`;
}

/** Bulk-pool products (oils, snacks by kg/L) ignore per-variant stock counters. */
export function usesBulkStockPool(product = {}, variants = []) {
  const measure = String(product.stock_measure_type || '').toLowerCase();
  if (measure === 'kg' || measure === 'l') return true;
  if (measure === 'units') return false;
  return variants.some((v) => Number(v?.pack_kg) > 0);
}

/** null/undefined/'' mean "not tracked", unlike an explicit 0. */
function trackedNumber(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function availabilityLabel(product, variants) {
  if (usesBulkStockPool(product, variants)) {
    const shared = trackedNumber(product.shared_stock_kg);
    if (shared == null) return 'Available';
    if (shared <= 0) return 'Out of stock';
    if (shared <= 1) return 'Low stock';
    return 'In stock';
  }

  const stocks = variants.map((v) => trackedNumber(v.stock)).filter((n) => n != null);
  const effective = stocks.length
    ? stocks.reduce((sum, n) => sum + Math.max(n, 0), 0)
    : trackedNumber(product.stock_quantity);

  if (effective == null) return 'Available';
  if (effective <= 0) return 'Out of stock';
  if (effective <= 3) return 'Low stock';
  return 'In stock';
}

export function optimizeImage(url, width = 900) {
  const src = text(url);
  if (!src) return '';
  // media.yasvik.com currently serves R2 objects directly and does not have
  // Cloudflare Image Resizing enabled. Rewriting these URLs to /cdn-cgi/image
  // returns 404, leaving catalogue cards blank. Keep the verified source URL.
  void width;
  return src;
}
