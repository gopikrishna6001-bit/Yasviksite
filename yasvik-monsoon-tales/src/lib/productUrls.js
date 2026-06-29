const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isProductUuid(value = '') {
  return UUID_RE.test(String(value || '').trim());
}

/** Public product path — prefers SEO slug, falls back to id. */
export function getProductPath(product = {}) {
  const slug = String(product?.slug || '').trim();
  if (slug) return `/product/${slug}`;
  const id = String(product?.id || '').trim();
  return id ? `/product/${id}` : '/shop';
}

export function getProductCanonicalUrl(product = {}, origin = '') {
  const base = String(origin || (typeof window !== 'undefined' ? window.location.origin : 'https://www.yasvik.com')).replace(/\/$/, '');
  return `${base}${getProductPath(product)}`;
}
