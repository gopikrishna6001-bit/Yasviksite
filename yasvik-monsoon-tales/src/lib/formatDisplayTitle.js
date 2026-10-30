/** Present product/category names without shouty ALL CAPS from legacy imports. */
export function formatDisplayTitle(value = '', fallback = '') {
  const raw = String(value || '').trim();
  if (!raw) return fallback;

  const letters = raw.replace(/[^a-zA-Z]/g, '');
  if (letters.length >= 4 && letters === letters.toUpperCase()) {
    return raw
      .toLowerCase()
      .replace(/(^|[\s(/\-])([a-z])/g, (_, prefix, char) => `${prefix}${char.toUpperCase()}`);
  }

  return raw;
}
