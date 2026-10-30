import { isPricingMetaVariant } from '@/lib/productPricingMeta';
import { parsePackKg } from '@/lib/productVariantUtils';
import { buildProductLookupMaps, resolveProductIdFromRef, slugifyBundleName } from '@/lib/productRelationUtils';

export const LAUNCH_SHEETS = {
  PRODUCTS: 'Cursor_Product_Import',
  VARIANTS: 'Variant_Import',
  CATEGORIES: 'Category_Config',
  COMBOS: 'Curated_Combos',
  HOMEPAGE: 'Homepage_Sections',
  STORE_ONLY: 'Store_Only_Hidden',
};

const PRODUCT_CATEGORY_SLUG_ALIASES = {
  'organic millet mixes': 'millet-mixes',
  'organic millet flours': 'millet-flours',
  'rice': 'heritage-rice',
  'millets & grains': 'millets',
  'jaggery & sweeteners': 'jaggery',
  'oils, ghee & honey': 'cold-pressed-oils',
  'cold pressed oils': 'cold-pressed-oils',
  'ghee': 'ghee',
  'honey': 'honey',
  'pickles & condiments': 'pickles',
  'spices, masalas & pantry': 'spices',
  'snacks & sweets': 'snacks',
  'dry fruits, nuts & seeds': 'dry-fruits',
  'pooja essentials': 'pooja',
  'natural care': 'natural-care',
  'store staples': 'store-staples',
};

const DISPLAY_CATEGORY_SLUG_ALIASES = {
  organic: 'organic',
  millets: 'millets',
  'millet flours': 'millet-flours',
  'millet mixes': 'millet-mixes',
  'heritage rice': 'heritage-rice',
  'oils & ghee': 'cold-pressed-oils',
  'cold pressed oils': 'cold-pressed-oils',
  ghee: 'ghee',
  honey: 'honey',
  jaggery: 'jaggery',
  pickles: 'pickles',
  spices: 'spices',
  snacks: 'snacks',
  'dry fruits': 'dry-fruits',
  pooja: 'pooja',
  'natural care': 'natural-care',
  'store staples': 'store-staples',
};

export function parseBoolean(value) {
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  const text = String(value ?? '').trim().toLowerCase();
  if (!text) return null;
  if (['true', 'yes', 'y', '1'].includes(text)) return true;
  if (['false', 'no', 'n', '0'].includes(text)) return false;
  return null;
}

export function slugify(value = '') {
  return slugifyBundleName(value);
}

export function parsePurityBadges(value) {
  const text = String(value ?? '').trim();
  if (!text) return [];
  return text.split(/[,;|]/).map((part) => part.trim()).filter(Boolean);
}

export function parseDelimitedList(value, separators = /[;|]/) {
  const text = String(value ?? '').trim();
  if (!text) return [];
  return text.split(separators).map((part) => part.trim()).filter(Boolean);
}

export function parseVariantsJsonFixed(value) {
  const text = String(value ?? '').trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeLabel(label = '') {
  return String(label || '').trim().toLowerCase();
}

function numberOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function integerStock(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.round(parsed));
}

function parseQuickVariants(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function indexCategories(categories = []) {
  const byId = new Map();
  const bySlug = new Map();
  const byName = new Map();

  categories.forEach((cat) => {
    byId.set(cat.id, cat);
    const slug = String(cat.slug || '').trim().toLowerCase();
    const name = String(cat.name || '').trim().toLowerCase();
    const emotional = String(cat.emotional_title || '').trim().toLowerCase();
    if (slug) bySlug.set(slug, cat);
    if (name) byName.set(name, cat);
    if (emotional) byName.set(emotional, cat);
  });

  return { byId, bySlug, byName };
}

function resolveParentSlugFromProductRow(row = {}) {
  const productCategory = String(row.product_category || '').trim().toLowerCase();
  const displayCategory = String(row.display_category || '').trim().toLowerCase();

  if (PRODUCT_CATEGORY_SLUG_ALIASES[productCategory]) {
    return PRODUCT_CATEGORY_SLUG_ALIASES[productCategory];
  }
  if (DISPLAY_CATEGORY_SLUG_ALIASES[displayCategory]) {
    return DISPLAY_CATEGORY_SLUG_ALIASES[displayCategory];
  }
  return slugify(row.product_category || row.display_category || '');
}

export function sheetRowsFromWorkbook(workbook, sheetName, sheetToJson) {
  const names = workbook.SheetNames || [];
  const resolved = names.find((label) => String(label).trim() === sheetName);
  if (!resolved || !workbook.Sheets?.[resolved]) return [];
  return sheetToJson(workbook.Sheets[resolved], { defval: '' });
}

export function mergeLaunchProductRows(productRows = [], storeOnlyRows = []) {
  const bySlug = new Map();

  productRows.forEach((row) => {
    const slug = String(row.slug || '').trim().toLowerCase();
    const title = String(row.title || '').trim().toLowerCase();
    const key = slug || title;
    if (!key) return;
    bySlug.set(key, row);
  });

  storeOnlyRows.forEach((row) => {
    const slug = String(row.slug || '').trim().toLowerCase();
    const title = String(row.title || '').trim().toLowerCase();
    const key = slug || title;
    if (!key) return;
    bySlug.set(key, row);
  });

  return [...bySlug.values()];
}

export function planCategoryCorrections(configRows = [], productRows = [], existingCategories = []) {
  const index = indexCategories(existingCategories);
  const roots = [];
  const subcategories = [];
  const skipped = [];

  configRows.forEach((row) => {
    const slug = slugify(row.slug || row.full_category);
    if (!slug) {
      skipped.push({ type: 'category', reason: 'missing slug', row });
      return;
    }

    const fullName = String(row.full_category || '').trim().toLowerCase();
    const homeName = String(row.homepage_display || '').trim().toLowerCase();
    const existing = index.bySlug.get(slug)
      || index.byName.get(fullName)
      || index.byName.get(homeName)
      || existingCategories.find((cat) => slugify(cat.slug || cat.name) === slug);
    roots.push({
      action: existing ? 'update' : 'create',
      id: existing?.id || null,
      slug,
      payload: {
        name: String(row.full_category || row.homepage_display || '').trim(),
        emotional_title: String(row.homepage_display || row.full_category || '').trim(),
        slug,
        color_accent: String(row.accent_color || '').trim() || existing?.color_accent || '#5B7A4B',
        color_hex: String(row.soft_background || '').trim() || existing?.color_hex || '#F5F0E8',
        sort_order: Number(row.sort_order) || 0,
        is_active: parseBoolean(row.show_on_home) ?? true,
        parent_id: null,
      },
    });
  });

  const subcategoryKeys = new Set();
  productRows.forEach((row) => {
    const subcategory = String(row.subcategory || '').trim();
    if (!subcategory) return;

    const parentSlug = resolveParentSlugFromProductRow(row);
    const parent = index.bySlug.get(parentSlug)
      || roots.find((item) => item.slug === parentSlug)
      || null;
    const parentSlugKey = parent?.slug || parentSlug;
    const subSlug = slugify(`${parentSlugKey}-${subcategory}`);
    const key = `${parentSlugKey}::${subcategory.toLowerCase()}`;
    if (subcategoryKeys.has(key)) return;
    subcategoryKeys.add(key);

    const existing = index.bySlug.get(subSlug);
    subcategories.push({
      action: existing ? 'update' : 'create',
      id: existing?.id || null,
      slug: subSlug,
      parentSlug: parentSlugKey,
      payload: {
        name: subcategory,
        emotional_title: subcategory,
        slug: subSlug,
        sort_order: Number(row.category_sort_order) || 0,
        is_active: true,
        parent_id: existing?.parent_id || parent?.id || null,
        parentSlug: parentSlugKey,
      },
    });
  });

  return { roots, subcategories, skipped };
}

function findProductMatch(row, maps, productsById) {
  const slug = String(row.slug || '').trim().toLowerCase();
  const code = String(row.product_code || '').trim().toLowerCase();
  const sku = String(row.sku || '').trim().toLowerCase();
  const title = String(row.title || '').trim().toLowerCase();

  if (slug && maps.bySlug.has(slug)) {
    return { id: maps.bySlug.get(slug), match: 'slug' };
  }
  if (code && maps.byCode.has(code)) {
    return { id: maps.byCode.get(code), match: 'product_code' };
  }
  if (sku && maps.bySku.has(sku)) {
    return { id: maps.bySku.get(sku), match: 'sku' };
  }
  if (title && maps.byTitle.has(title)) {
    return { id: maps.byTitle.get(title), match: 'title' };
  }

  const fuzzy = [];
  for (const [existingTitle, id] of maps.byTitle.entries()) {
    if (existingTitle === title) continue;
    const distance = Math.abs(existingTitle.length - title.length);
    if (
      title
      && existingTitle
      && distance <= 3
      && (existingTitle.includes(title) || title.includes(existingTitle))
    ) {
      fuzzy.push({ id, title: productsById.get(id)?.name || existingTitle });
    }
  }

  if (fuzzy.length === 1) {
    return { id: fuzzy[0].id, match: 'fuzzy_title', warning: fuzzy[0].title };
  }
  if (fuzzy.length > 1) {
    return { fuzzyCandidates: fuzzy };
  }

  return null;
}

function groupVariantRows(variantRows = []) {
  const byTitle = new Map();
  const byCode = new Map();

  variantRows.forEach((row) => {
    const title = String(row.title || '').trim().toLowerCase();
    const code = String(row.product_code || '').trim().toLowerCase();
    if (title) {
      const list = byTitle.get(title) || [];
      list.push(row);
      byTitle.set(title, list);
    }
    if (code) {
      const list = byCode.get(code) || [];
      list.push(row);
      byCode.set(code, list);
    }
  });

  return { byTitle, byCode };
}

function mergeVariantLists(sheetVariants = [], existingVariants = []) {
  const meta = existingVariants.find(isPricingMetaVariant) || null;
  const sellableExisting = existingVariants.filter((v) => v && !isPricingMetaVariant(v));

  const byLabel = new Map();
  const byPackKg = new Map();
  sellableExisting.forEach((variant) => {
    const labelKey = normalizeLabel(variant.label);
    if (labelKey) byLabel.set(labelKey, variant);
    const packKg = parsePackKg(variant.pack_kg, variant.label);
    if (packKg != null) byPackKg.set(String(packKg), variant);
  });

  const seen = new Set();
  const merged = [];

  sheetVariants.forEach((row) => {
    const label = String(row.label || '').trim();
    if (!label) return;
    const labelKey = normalizeLabel(label);
    if (seen.has(labelKey)) return;
    seen.add(labelKey);

    const packKg = parsePackKg(row.pack_kg, label);
    const prev = byLabel.get(labelKey)
      || (packKg != null ? byPackKg.get(String(packKg)) : null)
      || {};

    merged.push({
      ...prev,
      label,
      sku: String(row.sku || prev.sku || '').trim(),
      pack_kg: packKg != null ? packKg : prev.pack_kg,
      price: numberOrNull(row.price) ?? prev.price,
      compare_price: numberOrNull(row.compare_price) ?? prev.compare_price,
      notes: String(row.notes || prev.notes || '').trim(),
      stock: prev.stock ?? '',
      image_url: prev.image_url || '',
      image_urls: prev.image_urls || [],
    });
  });

  return meta ? [meta, ...merged] : merged;
}

function resolveCategorySlugForProduct(row) {
  const subcategory = String(row.subcategory || '').trim();
  const parentSlug = resolveParentSlugFromProductRow(row);
  if (subcategory) return slugify(`${parentSlug}-${subcategory}`);
  return parentSlug;
}

function resolveCategoryIdForProduct(row, categoryIndex) {
  const categorySlug = resolveCategorySlugForProduct(row);
  const cat = categoryIndex.bySlug.get(categorySlug);
  return cat?.id || null;
}

function pickPrimaryVariant(variants = [], primaryLabel = '') {
  const sellable = variants.filter((v) => v && !isPricingMetaVariant(v));
  if (!sellable.length) return null;
  const wanted = normalizeLabel(primaryLabel);
  if (wanted) {
    const match = sellable.find((v) => normalizeLabel(v.label) === wanted);
    if (match) return match;
  }
  return sellable.find((v) => numberOrNull(v.price) != null) || sellable[0];
}

export function planProductCorrections({
  productRows = [],
  variantRows = [],
  categoryPlans = { roots: [], subcategories: [] },
  existingProducts = [],
  existingCategories = [],
} = {}) {
  const maps = buildProductLookupMaps(existingProducts);
  const productsById = new Map(existingProducts.map((p) => [p.id, p]));
  const variantGroups = groupVariantRows(variantRows);

  const categoryIndex = indexCategories(existingCategories);
  [...categoryPlans.roots, ...categoryPlans.subcategories].forEach((plan) => {
    if (plan.slug && plan.payload) {
      categoryIndex.bySlug.set(plan.slug, {
        id: plan.id,
        slug: plan.slug,
        ...plan.payload,
      });
    }
  });

  const planned = [];
  const created = [];
  const skipped = [];

  productRows.forEach((row) => {
    const title = String(row.title || '').trim();
    if (!title) {
      skipped.push({ type: 'product', reason: 'missing title', row });
      return;
    }

    const match = findProductMatch(row, maps, productsById);
    if (match?.fuzzyCandidates?.length) {
      skipped.push({
        type: 'product',
        reason: 'ambiguous title match',
        title,
        candidates: match.fuzzyCandidates,
      });
      return;
    }

    const titleKey = title.toLowerCase();
    const codeKey = String(row.product_code || '').trim().toLowerCase();
    const sheetVariants = parseVariantsJsonFixed(row.variants_json_fixed);
    const importVariants = [
      ...(variantGroups.byTitle.get(titleKey) || []),
      ...(codeKey ? (variantGroups.byCode.get(codeKey) || []) : []),
    ];
    const variantSource = sheetVariants.length ? sheetVariants : importVariants;

    const existing = match?.id ? productsById.get(match.id) : null;
    const existingQuickVariants = parseQuickVariants(existing?.quick_variants);
    const quickVariants = mergeVariantLists(variantSource, existingQuickVariants);
    const primaryVariant = pickPrimaryVariant(quickVariants, row.primary_variant);
    const sellOnline = parseBoolean(row.sell_online_final);
    const isPublished = parseBoolean(row.is_published_final);
    const isFeatured = parseBoolean(row.is_featured_final) ?? parseBoolean(row.homepage_featured);
    const featuredInHero = parseBoolean(row.featured_in_hero_final);

    const categorySlug = resolveCategorySlugForProduct(row);
    const categoryId = resolveCategoryIdForProduct(row, categoryIndex) || existing?.category_id || null;

    const payload = {
      product_code: String(row.product_code || existing?.product_code || '').trim() || null,
      name: title,
      slug: String(row.slug || existing?.slug || slugify(title)).trim(),
      local_name: String(row.local_name || existing?.local_name || '').trim() || null,
      sku: String(row.sku || existing?.sku || row.product_code || '').trim() || null,
      category_id: categoryId,
      category_slug: categorySlug,
      short_description: String(row.short_description || existing?.short_description || '').trim() || null,
      best_for: String(row.best_for || existing?.best_for || '').trim() || null,
      storage_note: String(row.storage_note || existing?.storage_note || '').trim() || null,
      purity_badges: parsePurityBadges(row.purity_badges).length
        ? parsePurityBadges(row.purity_badges)
        : parseQuickVariants(existing?.purity_badges),
      seo_title: String(row.seo_title || existing?.seo_title || '').trim() || null,
      seo_description: String(row.seo_description || existing?.seo_description || '').trim() || null,
      stock_measure_type: String(row.stock_measure_type || existing?.stock_measure_type || 'kg').trim(),
      stock_quantity: integerStock(row.stock, existing?.stock_quantity ?? 0),
      price: numberOrNull(primaryVariant?.price) ?? numberOrNull(existing?.price) ?? 0,
      discount_price: numberOrNull(primaryVariant?.compare_price) ?? numberOrNull(existing?.discount_price),
      quick_variants: quickVariants,
      is_published: isPublished ?? existing?.is_published ?? false,
      is_featured: isFeatured ?? existing?.is_featured ?? false,
      featured_in_hero: featuredInHero ?? existing?.featured_in_hero ?? false,
      sell_online: sellOnline ?? existing?.sell_online ?? true,
      sort_order: Number(row.product_sort_order) || existing?.sort_order || 0,
    };

    if (!payload.category_id && !payload.category_slug) {
      skipped.push({ type: 'product', reason: 'unresolved category', title, row });
      return;
    }

    if (existing) {
      planned.push({
        action: 'update',
        id: existing.id,
        title,
        match: match.match,
        warning: match.warning,
        payload,
        preserveFeaturedImage: true,
      });
      return;
    }

    const shouldCreate = (sellOnline !== false) && (isPublished !== false);
    if (!existing && !shouldCreate) {
      skipped.push({ type: 'product', reason: 'store-only/hidden and not in catalog — skipped create', title });
      return;
    }
    if (!existing && shouldCreate) {
      created.push({
        action: 'create',
        title,
        payload,
      });
      return;
    }

    if (!existing) {
      skipped.push({ type: 'product', reason: 'missing product — skipped create', title });
    }
  });

  return { updates: planned, creates: created, skipped };
}

export function planComboCorrections(comboRows = [], existingProducts = [], existingCombos = []) {
  const maps = buildProductLookupMaps(existingProducts);
  const bySlug = new Map(
    existingCombos.map((combo) => [String(combo.slug || '').trim().toLowerCase(), combo]),
  );
  const byName = new Map(
    existingCombos.map((combo) => [String(combo.name || combo.title || '').trim().toLowerCase(), combo]),
  );

  const updates = [];
  const creates = [];
  const skipped = [];

  comboRows.forEach((row) => {
    const name = String(row.bundle_name || '').trim();
    const slug = String(row.bundle_slug || slugify(name)).trim().toLowerCase();
    if (!name || !slug) {
      skipped.push({ type: 'combo', reason: 'missing name/slug', row });
      return;
    }

    const productRefs = parseDelimitedList(row.products_included, /[;|]/);
    const productIds = [];
    const missing = [];

    productRefs.forEach((ref) => {
      const id = resolveProductIdFromRef(ref, maps);
      if (id) productIds.push(id);
      else missing.push(ref);
    });

    if (!productIds.length) {
      skipped.push({ type: 'combo', reason: 'no resolvable products', name, missing });
      return;
    }

    const bundlePrice = numberOrNull(row.bundle_price);
    const comparePrice = numberOrNull(row.compare_price);
    const discountPct = comparePrice && bundlePrice && comparePrice > bundlePrice
      ? Math.round(((comparePrice - bundlePrice) / comparePrice) * 100)
      : numberOrNull(row.visible_discount_pct);

    const payload = {
      name,
      slug,
      description: String(row.notes || row.strategy || `Curated Yasvik combo: ${name}.`).trim(),
      combo_price: bundlePrice ?? 0,
      regular_price: comparePrice,
      discount_percentage: discountPct,
      is_published: parseBoolean(row.show_on_home) ?? true,
      is_featured: parseBoolean(row.show_on_home) ?? false,
      sort_order: Number(row.bundle_sort) || 0,
      product_ids: productIds,
    };

    const existing = bySlug.get(slug) || byName.get(name.toLowerCase());
    if (existing) {
      updates.push({ action: 'update', id: existing.id, name, payload, missing });
    } else {
      creates.push({ action: 'create', name, payload, missing });
    }
  });

  return { updates, creates, skipped };
}

export function planHomepageSettings(productPlans = { updates: [], creates: [] }, productRows = [], homepageSections = []) {
  const candidateOrder = new Map();
  productRows.forEach((row) => {
    if (!parseBoolean(row.best_seller_candidate)) return;
    const title = String(row.title || '').trim().toLowerCase();
    if (!title) return;
    candidateOrder.set(title, Number(row.product_sort_order) || 99999);
  });

  const bestSellerRows = productPlans.updates
    .filter((item) => item.id && item.payload?.sell_online !== false && item.payload?.is_published !== false)
    .filter((item) => item._bestSeller || candidateOrder.has(String(item.title || '').toLowerCase()))
    .sort((a, b) => {
      const aOrder = candidateOrder.get(String(a.title || '').toLowerCase()) ?? Number(a.payload?.sort_order) ?? 99999;
      const bOrder = candidateOrder.get(String(b.title || '').toLowerCase()) ?? Number(b.payload?.sort_order) ?? 99999;
      return aOrder - bOrder;
    });

  const bestSellerPicks = bestSellerRows
    .slice(0, 12)
    .map((item, index) => ({
      product_id: item.id,
      variant_label: String(
        productRows.find((row) => String(row.title || '').trim().toLowerCase() === String(item.title || '').toLowerCase())?.primary_variant || '',
      ).trim(),
      order: index + 1,
    }));

  return {
    home_best_sellers: bestSellerPicks,
    homepage_sections: homepageSections,
  };
}

export function annotateBestSellerCandidates(productPlans, productRows = []) {
  const candidates = new Set(
    productRows
      .filter((row) => parseBoolean(row.best_seller_candidate))
      .map((row) => String(row.title || '').trim().toLowerCase()),
  );

  productPlans.updates = productPlans.updates.map((item) => ({
    ...item,
    _bestSeller: candidates.has(String(item.title || '').toLowerCase()),
    payload: {
      ...item.payload,
      is_featured: item.payload.is_featured || candidates.has(String(item.title || '').toLowerCase()),
    },
  }));

  productPlans.creates = productPlans.creates.map((item) => ({
    ...item,
    _bestSeller: candidates.has(String(item.title || '').toLowerCase()),
    payload: {
      ...item.payload,
      is_featured: item.payload.is_featured || candidates.has(String(item.title || '').toLowerCase()),
    },
  }));

  return productPlans;
}

export function planLaunchCatalogCorrections({
  productRows = [],
  storeOnlyRows = [],
  variantRows = [],
  categoryRows = [],
  comboRows = [],
  homepageSections = [],
  existingCategories = [],
  existingProducts = [],
  existingCombos = [],
} = {}) {
  const mergedProducts = mergeLaunchProductRows(productRows, storeOnlyRows);
  const categoryPlans = planCategoryCorrections(categoryRows, mergedProducts, existingCategories);
  let productPlans = planProductCorrections({
    productRows: mergedProducts,
    variantRows,
    categoryPlans,
    existingProducts,
    existingCategories,
  });
  productPlans = annotateBestSellerCandidates(productPlans, mergedProducts);

  const comboPlans = planComboCorrections(comboRows, existingProducts, existingCombos);
  const homepageSettings = planHomepageSettings(productPlans, mergedProducts, homepageSections);

  return {
    categories: categoryPlans,
    products: productPlans,
    combos: comboPlans,
    homepage: homepageSettings,
    summary: {
      categoryRoots: categoryPlans.roots.length,
      categorySubcategories: categoryPlans.subcategories.length,
      productUpdates: productPlans.updates.length,
      productCreates: productPlans.creates.length,
      productSkipped: productPlans.skipped.length,
      comboUpdates: comboPlans.updates.length,
      comboCreates: comboPlans.creates.length,
      comboSkipped: comboPlans.skipped.length,
    },
  };
}
