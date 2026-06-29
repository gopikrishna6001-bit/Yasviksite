/** Slugify text for SEO-friendly media paths and filenames. */
export function slugifyMediaName(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\w.\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'asset';
}

const BRAND_PREFIX_FOLDERS = new Set(['products', 'categories', 'combos', 'brand', 'customers']);

/**
 * Build a readable media filename stem, e.g. yasvik-buffalo-ghee-hero
 */
export function buildSeoMediaBaseName({
  seoName = '',
  assetRole = '',
  folder = 'general',
  entityTitle = '',
  fallbackName = '',
} = {}) {
  const subject = slugifyMediaName(seoName || entityTitle || fallbackName.replace(/\.[^.]+$/, ''));
  const role = slugifyMediaName(assetRole);
  const parts = [];

  if (BRAND_PREFIX_FOLDERS.has(String(folder || '').toLowerCase())) {
    parts.push('yasvik');
  }

  if (subject) parts.push(subject);
  if (role && role !== subject && !subject.endsWith(`-${role}`)) parts.push(role);

  return parts.join('-') || 'yasvik-asset';
}

export function buildSeoMediaFileName(options = {}, ext = 'webp') {
  const safeExt = String(ext || 'webp').replace(/[^\w]+/g, '') || 'webp';
  return `${buildSeoMediaBaseName(options)}.${safeExt}`;
}
