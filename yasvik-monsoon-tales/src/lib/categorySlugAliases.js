import { normalizeCategorySlug } from './storefrontCategories.js';

/**
 * Resolve a category by id or slug, including slug aliases from merges/renames.
 */
export function resolveCategoryByIdOrSlug(key, categories = [], aliases = []) {
  const needle = String(key || '').trim();
  if (!needle) return null;
  const list = Array.isArray(categories) ? categories : [];

  const byId = list.find((cat) => cat.id === needle);
  if (byId) return byId;

  const slug = normalizeCategorySlug(needle);
  const bySlug = list.find((cat) => normalizeCategorySlug(cat.slug) === slug);
  if (bySlug) return bySlug;

  const aliasRows = Array.isArray(aliases) ? aliases : [];
  const alias = aliasRows.find((row) => normalizeCategorySlug(row.old_slug) === slug);
  if (!alias?.category_id) return null;
  return list.find((cat) => cat.id === alias.category_id) || null;
}

export function buildAliasMap(aliases = []) {
  const map = new Map();
  (Array.isArray(aliases) ? aliases : []).forEach((row) => {
    const oldSlug = normalizeCategorySlug(row.old_slug);
    if (!oldSlug || !row.category_id) return;
    map.set(oldSlug, row.category_id);
  });
  return map;
}
