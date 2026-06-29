export function adminProductEditPath(productId) {
  if (!productId) return '/admin/products';
  return `/admin/products?edit=${encodeURIComponent(productId)}`;
}
