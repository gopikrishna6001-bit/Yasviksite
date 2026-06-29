function sortOrderValue(product = {}) {
  const value = Number(product.sort_order);
  return Number.isFinite(value) ? value : 0;
}

function groupSortOrderValue(product = {}) {
  const value = Number(product.group_sort_order);
  return Number.isFinite(value) ? value : 0;
}

function groupLabel(product = {}) {
  return String(product.product_group || '').trim().toLowerCase();
}

function titleValue(product = {}) {
  return String(product.title || product.name || '').trim().toLowerCase();
}

function createdAtValue(product = {}) {
  const stamp = product.created_at || product.created_date;
  const time = stamp ? new Date(stamp).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

/**
 * Default catalog sort for shop/category grids:
 * group order → product order → title → newest.
 */
export function sortCatalogProducts(products = []) {
  return [...products].sort((a, b) => {
    const groupOrderDiff = groupSortOrderValue(a) - groupSortOrderValue(b);
    if (groupOrderDiff !== 0) return groupOrderDiff;

    const groupLabelDiff = groupLabel(a).localeCompare(groupLabel(b));
    if (groupLabelDiff !== 0) return groupLabelDiff;

    const orderDiff = sortOrderValue(a) - sortOrderValue(b);
    if (orderDiff !== 0) return orderDiff;

    const titleDiff = titleValue(a).localeCompare(titleValue(b));
    if (titleDiff !== 0) return titleDiff;

    return createdAtValue(b) - createdAtValue(a);
  });
}

/** Featured carousel / hero picks: sort_order only, then title, then newest. */
export function sortFeaturedProducts(products = []) {
  return [...products].sort((a, b) => {
    const orderDiff = sortOrderValue(a) - sortOrderValue(b);
    if (orderDiff !== 0) return orderDiff;

    const titleDiff = titleValue(a).localeCompare(titleValue(b));
    if (titleDiff !== 0) return titleDiff;

    return createdAtValue(b) - createdAtValue(a);
  });
}
