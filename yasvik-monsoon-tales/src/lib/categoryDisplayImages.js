import { productPrimaryImageUrl } from '@/lib/mediaUrl';

/**
 * Pick the best display image for a category: cover_image, then first published product in category.
 */
export function resolveCategoryDisplayImage(category, productsByCategoryId = {}) {
  const cover = String(category?.cover_image || category?.image_url || '').trim();
  if (cover) return cover;

  const fromMap = productsByCategoryId[category?.id];
  if (fromMap) return fromMap;

  return '';
}

export function buildCategoryProductImageMap(products = []) {
  const map = {};
  for (const product of products) {
    const categoryId = product?.category_id;
    if (!categoryId || map[categoryId]) continue;
    const url = productPrimaryImageUrl(product);
    if (url) map[categoryId] = url;
  }
  return map;
}
