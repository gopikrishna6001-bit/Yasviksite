/**
 * Whether a category (or any ancestor) is excluded from bill / coupon discounts.
 */
export function categoryExcludesBillDiscount(categoryId, categories = []) {
  if (!categoryId) return false;
  const byId = new Map((categories || []).map((c) => [c.id, c]));
  let id = categoryId;
  const seen = new Set();
  while (id && !seen.has(id)) {
    seen.add(id);
    const cat = byId.get(id);
    if (!cat) break;
    if (cat.exclude_from_bill_discount) return true;
    id = cat.parent_id || null;
  }
  return false;
}

export function productExcludesBillDiscount(product, categories = []) {
  return categoryExcludesBillDiscount(product?.category_id, categories);
}
