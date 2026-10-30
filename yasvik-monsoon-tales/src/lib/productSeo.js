export {
  buildProductSeoMeta,
  buildProductJsonLd,
  buildProductBreadcrumbJsonLd,
  buildProductAltText,
  getProductCanonicalUrl,
  getProductPath,
  getProductImageUrls,
  resolveAbsoluteMediaUrl,
} from '../../lib/productSeoCore.mjs';

import { getProductImageUrls } from '../../lib/productSeoCore.mjs';

function slugify(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getProductImage(product = {}) {
  return getProductImageUrls(product).primary;
}

export function buildSeoImageFileName(product = {}) {
  const title = String(product.title || product.name || 'everyday-food').trim();
  return `yasvik-${slugify(title) || 'everyday-food'}-product.webp`;
}
