/** Normalize a media URL or R2 path to the object key used in the bucket. */
export function normalizeMediaStorageKey(input = '') {
  let value = String(input || '').trim();
  if (!value) return '';

  if (value.startsWith('http://') || value.startsWith('https://')) {
    try {
      const url = new URL(value);
      value = decodeURIComponent(url.pathname.replace(/^\//, ''));
    } catch {
      return '';
    }
  }

  return value.replace(/^\/+/, '').replace(/^yasvik-media\//, '');
}

export function isManagedMediaKey(key = '') {
  const value = normalizeMediaStorageKey(key);
  if (!value) return false;
  const allowedPrefixes = [
    'media-assets/',
    'product-images/',
    'story-images/',
    'person-images/',
    'journey-images/',
    'recipe-images/',
    'user-uploads/',
    'hero/',
  ];
  return allowedPrefixes.some((prefix) => value.startsWith(prefix));
}
