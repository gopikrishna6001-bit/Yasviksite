/**
 * Live product → immutable catalogue snapshot.
 */

import { mergeOptions } from './templates.js';
import { resolveFormat } from './formats.js';
import {
  catalogueBadges,
  isOrganicProduct,
  productHasDealerPricing,
  resolveDealerVariantPricing,
  resolveVariantPricing,
} from './pricing.js';
import {
  SITE_ORIGIN,
  DEFAULT_LOGO_URL,
  asArray,
  availabilityLabel,
  cleanShortDescription,
  descriptionFingerprint,
  money,
  optimizeImage,
  productImage,
  productUrl,
  sellableVariants,
  slugify,
  text,
} from './utils.js';

function expandCategoryIds(categories, selection = {}) {
  const categoryIds = new Set(asArray(selection.category_ids).map(String));
  const categorySlugs = new Set(asArray(selection.category_slugs).map((s) => String(s).toLowerCase()));
  const slugToCategory = new Map(categories.map((c) => [String(c.slug || '').toLowerCase(), c]));

  for (const slug of categorySlugs) {
    const cat = slugToCategory.get(slug);
    if (cat?.id) categoryIds.add(String(cat.id));
  }

  if (selection.mode === 'hero_categories') {
    for (const cat of categories) {
      if (cat.is_hero_category || cat.show_on_homepage) categoryIds.add(String(cat.id));
    }
  }

  const childIdsByParent = new Map();
  for (const cat of categories) {
    if (!cat.parent_id) continue;
    const key = String(cat.parent_id);
    if (!childIdsByParent.has(key)) childIdsByParent.set(key, []);
    childIdsByParent.get(key).push(String(cat.id));
  }

  const expanded = new Set(categoryIds);
  for (const id of categoryIds) {
    for (const child of childIdsByParent.get(id) || []) expanded.add(child);
  }
  return expanded;
}

function filterEligible(products, options, categories) {
  const selection = options.selection || {};
  const mode = selection.mode || 'all_eligible';
  const productIds = new Set(asArray(selection.product_ids).map(String));
  const expandedCategoryIds = expandCategoryIds(categories, selection);

  return products.filter((product) => {
    if (product.exclude_from_catalogues === true) return false;
    if (product.show_in_public_catalogue === false && mode !== 'selected_products' && !options.dealer_mode) {
      return false;
    }
    if (product.is_published === false && mode !== 'selected_products') return false;

    if (options.dealer_mode || selection.require_dealer_flag) {
      if (product.show_in_dealer_catalogue !== true) return false;
    }
    if (mode === 'gifting' || options.catalogue_type === 'gifting') {
      if (product.show_in_gifting_catalogue !== true && !product.is_featured) return false;
    }
    if (mode === 'organic' && !isOrganicProduct(product)) return false;

    const variants = sellableVariants(product);
    if (!variants.length) return false;

    if (selection.in_stock_only) {
      if (availabilityLabel(product, variants) === 'Out of stock') return false;
    }

    if (mode === 'selected_products') return productIds.has(String(product.id));
    if (mode === 'featured') return product.is_featured === true || product.featured_in_hero === true;
    if (mode === 'selected_categories' || mode === 'hero_categories') {
      return expandedCategoryIds.has(String(product.category_id));
    }
    if (product.sell_online === false && mode === 'all_eligible' && !options.dealer_mode) return false;
    return true;
  });
}

function sortProducts(products, categoriesById, sortMode, salesRankById = new Map()) {
  const list = [...products];
  const byCategoryThen = (a, b, next) => {
    const ca = categoriesById.get(String(a.category_id));
    const cb = categoriesById.get(String(b.category_id));
    const sa = Number(ca?.sort_order ?? 9999);
    const sb = Number(cb?.sort_order ?? 9999);
    if (sa !== sb) return sa - sb;
    return next();
  };

  if (sortMode === 'alphabetical') {
    return list.sort((a, b) => text(a.name).localeCompare(text(b.name)));
  }
  if (sortMode === 'newest') {
    return list.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  }
  if (sortMode === 'manual' || sortMode === 'admin_priority') {
    return list.sort((a, b) => byCategoryThen(a, b, () => (
      Number(a.catalogue_priority ?? 100) - Number(b.catalogue_priority ?? 100)
      || Number(a.sort_order ?? 9999) - Number(b.sort_order ?? 9999)
      || text(a.name).localeCompare(text(b.name))
    )));
  }
  if (sortMode === 'bestsellers' || sortMode === 'most_ordered') {
    return list.sort((a, b) => byCategoryThen(a, b, () => {
      const ra = salesRankById.has(String(a.id)) ? salesRankById.get(String(a.id)) : 99999;
      const rb = salesRankById.has(String(b.id)) ? salesRankById.get(String(b.id)) : 99999;
      if (ra !== rb) return ra - rb;
      return Number(a.catalogue_priority ?? 100) - Number(b.catalogue_priority ?? 100)
        || text(a.name).localeCompare(text(b.name));
    }));
  }
  if (sortMode === 'homepage_order') {
    return list.sort((a, b) => {
      const ca = categoriesById.get(String(a.category_id));
      const cb = categoriesById.get(String(b.category_id));
      const ha = Number(ca?.homepage_order ?? 9999);
      const hb = Number(cb?.homepage_order ?? 9999);
      if (ha !== hb) return ha - hb;
      return Number(a.catalogue_priority ?? 100) - Number(b.catalogue_priority ?? 100)
        || text(a.name).localeCompare(text(b.name));
    });
  }
  if (sortMode === 'price_low_high' || sortMode === 'price_high_low') {
    const dir = sortMode === 'price_low_high' ? 1 : -1;
    return list.sort((a, b) => {
      const ap = money(sellableVariants(a)[0]?.price) || 0;
      const bp = money(sellableVariants(b)[0]?.price) || 0;
      return (ap - bp) * dir;
    });
  }
  // category_order default
  return list.sort((a, b) => byCategoryThen(a, b, () => (
    Number(a.catalogue_priority ?? 100) - Number(b.catalogue_priority ?? 100)
    || Number(a.group_sort_order ?? 9999) - Number(b.group_sort_order ?? 9999)
    || Number(a.sort_order ?? 9999) - Number(b.sort_order ?? 9999)
    || text(a.name).localeCompare(text(b.name))
  )));
}

function categoryBlurb(category) {
  return text(
    category?.homepage_description
    || category?.description
    || `Thoughtfully sourced ${text(category?.name, 'products').toLowerCase()} for modern homes.`,
  );
}

export function buildCatalogueSnapshot({
  catalogue,
  products,
  categories,
  settings = {},
  salesRanks = [],
  generatedBy = null,
}) {
  const options = mergeOptions(catalogue.catalogue_type, {
    ...(catalogue.options || {}),
    selection: catalogue.selection || catalogue.options?.selection,
    catalogue_type: catalogue.catalogue_type,
  });

  const format = resolveFormat(options.format, options.design_template);
  if (options.products_per_page == null) options.products_per_page = format.productsPerPage;

  const salesRankById = new Map();
  (salesRanks || []).forEach((row, index) => {
    if (row?.product_id) salesRankById.set(String(row.product_id), index + 1);
  });

  const categoriesById = new Map(categories.map((c) => [String(c.id), c]));
  const filtered = filterEligible(products, options, categories);
  const sorted = sortProducts(filtered, categoriesById, options.sort, salesRankById);

  const warnings = [];
  const items = [];

  if (options.dealer_mode && !options.dealer_pricing_configured) {
    warnings.push({
      code: 'dealer_pricing_not_configured',
      name: 'Dealer pricing',
      message: 'Dealer catalogues are gated until dedicated dealer price and MOQ fields are configured.',
    });
  }

  for (const product of sorted) {
    const variants = sellableVariants(product);
    const image = productImage(product);
    const shortDescription = text(
      product.catalogue_short_description_override || product.short_description || product.description,
    );
    const category = categoriesById.get(String(product.category_id));
    const salesRank = salesRankById.get(String(product.id)) ?? null;

    if (!image) warnings.push({ code: 'missing_image', product_id: product.id, name: product.name });
    if (!text(product.local_name)) warnings.push({ code: 'missing_telugu_name', product_id: product.id, name: product.name });

    if (options.dealer_mode) {
      if (!productHasDealerPricing(product)) {
        warnings.push({ code: 'missing_dealer_price', product_id: product.id, name: product.name });
        continue;
      }
      const dealerRows = variants.map((v) => resolveDealerVariantPricing(v)).filter((v) => v.configured);
      if (!dealerRows.length) continue;
      items.push({
        id: product.id,
        name: text(product.name),
        local_name: text(product.local_name),
        short_description: '',
        badges: [],
        image_url: image,
        image_optimized: optimizeImage(image, format.imageWidth),
        category_id: category?.id || null,
        category_name: text(category?.homepage_label || category?.name, 'Products'),
        category_image: text(category?.homepage_image_override || category?.cover_image || category?.icon_url),
        category_blurb: categoryBlurb(category),
        product_url: productUrl(product),
        availability: availabilityLabel(product, variants),
        variants: dealerRows,
        hide_price: false,
        dealer: true,
        sales_rank: salesRank,
      });
      continue;
    }

    if (!variants.some((v) => money(v.price ?? v.store_price) != null)) {
      warnings.push({ code: 'missing_selling_price', product_id: product.id, name: product.name });
      continue;
    }

    const variantRows = variants.map((variant) => resolveVariantPricing(variant, product, options));
    const missingMrp = variantRows.every((v) => !v.mrp);
    if (options.content?.mrp && missingMrp) {
      warnings.push({ code: 'missing_mrp', product_id: product.id, name: product.name });
    }

    items.push({
      id: product.id,
      name: text(product.name),
      local_name: text(product.local_name),
      short_description: options.content?.short_description ? cleanShortDescription(shortDescription) : '',
      badges: catalogueBadges(product, salesRank, options),
      image_url: image,
      image_optimized: optimizeImage(image, format.imageWidth),
      category_id: category?.id || null,
      category_name: text(category?.homepage_label || category?.name, 'Products'),
      category_image: text(category?.homepage_image_override || category?.cover_image || category?.icon_url),
      category_blurb: categoryBlurb(category),
      product_url: productUrl(product),
      availability: availabilityLabel(product, variants),
      variants: variantRows,
      hide_price: options.price_mode === 'hide',
      dealer: false,
      sales_rank: salesRank,
    });
  }

  // Suppress templated/duplicated short descriptions: when the same copy is
  // reused across several products it is placeholder text, and showing it makes
  // the catalogue misleading (e.g. papads described as "ragi murukulu").
  if (options.content?.short_description) {
    const fingerprintCounts = new Map();
    for (const item of items) {
      const fp = descriptionFingerprint(item.short_description);
      if (!fp) continue;
      fingerprintCounts.set(fp, (fingerprintCounts.get(fp) || 0) + 1);
    }
    const duplicatedNames = [];
    for (const item of items) {
      const fp = descriptionFingerprint(item.short_description);
      if (fp && (fingerprintCounts.get(fp) || 0) >= 3) {
        item.short_description = '';
        duplicatedNames.push(item.name);
      }
    }
    if (duplicatedNames.length) {
      warnings.push({
        code: 'duplicate_description',
        name: 'Repeated descriptions',
        message: `${duplicatedNames.length} products share templated descriptions, which were hidden. Add unique copy in the product editor.`,
        products: duplicatedNames.slice(0, 20),
      });
    }
  }

  // Optional category order override
  const categoryOrder = asArray(options.category_order).map(String);
  const grouped = new Map();
  for (const item of items) {
    const key = item.category_id || 'uncategorized';
    if (!grouped.has(key)) {
      grouped.set(key, {
        id: key,
        name: item.category_name,
        image: item.category_image,
        blurb: item.category_blurb,
        products: [],
      });
    }
    grouped.get(key).products.push(item);
  }

  let categoryList = [...grouped.values()];
  if (categoryOrder.length) {
    categoryList.sort((a, b) => {
      const ia = categoryOrder.indexOf(String(a.id));
      const ib = categoryOrder.indexOf(String(b.id));
      const sa = ia === -1 ? 9999 : ia;
      const sb = ib === -1 ? 9999 : ib;
      if (sa !== sb) return sa - sb;
      return text(a.name).localeCompare(text(b.name));
    });
  }

  const coverImage = text(
    options.cover_image_url
    || catalogue.cover_image_url
    || categoryList.find((c) => c.image)?.image
    || items.find((p) => p.image_url)?.image_url,
  );

  return {
    template_version: '2',
    generated_at: new Date().toISOString(),
    generated_by: generatedBy,
    catalogue: {
      id: catalogue.id || null,
      name: text(catalogue.name, 'Yasvik Catalogue'),
      type: catalogue.catalogue_type || 'customer',
      slug: text(catalogue.slug) || slugify(catalogue.name),
    },
    options,
    format,
    brand: {
      title: 'Yasvik',
      tagline: 'Conscious foods for modern living',
      story_line: 'Traditional foods. Responsible sourcing. Delivered across Hyderabad.',
      website: SITE_ORIGIN,
      whatsapp: text(settings.whatsapp_number, '7842938998'),
      phone: text(settings.support_phone, '78429 38998'),
      store_name: text(settings.store_display_name, 'Yasvik Natural Foods'),
      store_address: text(settings.store_address_text, 'Hyderabad'),
      maps_url: text(settings.store_maps_url, 'https://maps.google.com/?q=Yasvik+Natural+Foods+Hyderabad'),
      logo_url: text(settings.brand_logo_horizontal_url, DEFAULT_LOGO_URL),
      colour: text(options.brand_colour, '#1f2a1e'),
    },
    cover: {
      image_url: coverImage,
      image_optimized: optimizeImage(coverImage, 1400),
    },
    stats: {
      product_count: items.length,
      category_count: categoryList.length,
      page_count: null, // filled by page planner
      estimated_bytes: Math.round(items.length * 120000 + 400000),
    },
    warnings,
    categories: categoryList,
    products: items,
    dealer_gated: Boolean(options.dealer_mode && !options.dealer_pricing_configured),
  };
}
