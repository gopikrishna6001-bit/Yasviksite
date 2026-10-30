import { categoryShopPath } from '@/lib/seoEntity';

export function getCategoryDisplayName(category) {
  return String(category?.emotional_title || category?.name || 'Category').trim();
}

/** Canonical crawlable shop URL for a category (slug path, not query param). */
export function getCategoryShopHref(category) {
  const slug = category?.slug || category?.name;
  return slug ? categoryShopPath(slug) : '/shop';
}
