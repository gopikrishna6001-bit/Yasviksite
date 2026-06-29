export function slugifyProduct(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function uniqueCopySuffix() {
  return Date.now().toString(36).slice(-5);
}

/** Slug, SKU and product code from display name — used when duplicating. */
export function deriveProductIdentityFromTitle(title = '') {
  const cleanTitle = String(title || '').trim();
  const slugBase = slugifyProduct(cleanTitle) || 'product';
  const suffix = uniqueCopySuffix();
  const token = slugBase.replace(/-/g, '').toUpperCase().slice(0, 8) || suffix.toUpperCase();

  return {
    slug: `${slugBase}-${suffix}`,
    sku: `YAS-${token}-${suffix.toUpperCase()}`,
    product_code: `YAS-${token}`,
  };
}

export function deriveVariantSku(baseSku, variant = {}, index = 0) {
  const pack = slugifyProduct(variant.label || `pack-${index + 1}`) || `v${index + 1}`;
  return `${baseSku}-${pack}`.slice(0, 64);
}

export function applyDuplicateIdentity(form = {}) {
  const identity = deriveProductIdentityFromTitle(form.title);
  const variants = Array.isArray(form.variants)
    ? form.variants.map((variant, index) => ({
        ...variant,
        sku: deriveVariantSku(identity.sku, variant, index),
      }))
    : [];

  return {
    ...form,
    slug: identity.slug,
    sku: identity.sku,
    product_code: identity.product_code,
    seo_title: '',
    seo_description: '',
    seo_keywords: '',
    variants,
  };
}
