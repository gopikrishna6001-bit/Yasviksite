/** Published for store/POS (labels, counter, inventory). */
export function isStoreSellable(product) {
  return product?.is_published !== false;
}

/** Visible on shop, search, cart, and online checkout. */
export function isSellableOnline(product) {
  return isStoreSellable(product) && product?.sell_online !== false;
}

export function filterOnlineProducts(products = []) {
  return (Array.isArray(products) ? products : []).filter(isSellableOnline);
}
