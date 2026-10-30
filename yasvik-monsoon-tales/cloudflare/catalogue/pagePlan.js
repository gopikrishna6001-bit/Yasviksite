/**
 * Builds an explicit page plan from a catalogue snapshot.
 * Never splits a product card across pages. Keeps categories together when possible.
 */

export function buildPagePlan(snapshot) {
  const options = snapshot.options || {};
  const format = snapshot.format || {};
  const requestedPerPage = Number(options.products_per_page) || Number(format.productsPerPage) || 4;
  const designLimits = {
    classic: 4,
    whatsapp_compact: 6,
    premium_magazine: 2,
    festival_specials: 4,
    dealer_price_list: 14,
  };
  const safeLimit = designLimits[options.design] || Number(format.productsPerPage) || 4;
  // A catalogue is customer-facing, so never accept a density that makes
  // images, descriptions, or pack-wise pricing overflow the physical page.
  const perPage = Math.max(1, Math.min(requestedPerPage, safeLimit));
  options.products_per_page = perPage;
  const pages = [];
  let pageNumber = 0;

  const push = (page) => {
    pageNumber += 1;
    pages.push({ ...page, page_number: pageNumber });
  };

  if (options.include_cover !== false) {
    push({
      type: 'cover',
      title: snapshot.catalogue?.name,
      product_count: snapshot.stats?.product_count || 0,
      cover_image: snapshot.cover?.image_optimized || snapshot.cover?.image_url || '',
    });
  }

  if (options.include_intro !== false && !options.dealer_mode) {
    push({ type: 'about' });
  }

  if (snapshot.dealer_gated) {
    push({
      type: 'dealer_gated',
      message: 'Dealer pricing is not configured yet. This catalogue cannot be generated until dealer price and MOQ fields are available.',
    });
    snapshot.stats = { ...(snapshot.stats || {}), page_count: pages.length };
    return { ...snapshot, pages };
  }

  const categories = snapshot.categories || [];
  for (const category of categories) {
    const products = category.products || [];
    if (!products.length) continue;

    if (options.include_category_heroes !== false && options.content?.category_hero !== false && !options.dealer_mode) {
      push({
        type: 'category_hero',
        category_id: category.id,
        category_name: category.name,
        category_blurb: category.blurb,
        category_image: category.image,
        product_count: products.length,
      });
    }

    // Pack products without splitting cards; prefer keeping leftover with category
    let remaining = [...products];
    while (remaining.length) {
      const chunk = remaining.splice(0, perPage);
      push({
        type: options.dealer_mode || format.dealer || options.design === 'dealer_price_list'
          ? 'dealer_list'
          : 'product_grid',
        category_id: category.id,
        category_name: category.name,
        products: chunk,
        columns: format.columns || 2,
      });
    }
  }

  if (options.include_final !== false) {
    push({ type: 'contact' });
  }

  snapshot.stats = { ...(snapshot.stats || {}), page_count: pages.length };
  return { ...snapshot, pages };
}
