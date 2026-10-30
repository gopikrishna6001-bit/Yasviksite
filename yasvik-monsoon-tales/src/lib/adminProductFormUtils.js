import { prepareVariantsForSave, findDefaultPricingVariant, deriveInflatePercent } from '@/lib/productPricingUtils';
import { extractPricingMetaFromVariants, isPricingMetaVariant, mergePricingMetaIntoQuickVariants } from '@/lib/productPricingMeta';
import { applyDuplicateIdentity, slugifyProduct } from '@/lib/productDuplicateUtils';
import { normalizeProductSku, suggestProductSku } from '@/lib/productSku';
import { resolveProductMeasureType, resolveProductStockForSave, usesBulkMeasureType } from '@/lib/productStockUtils';
import { STOCK_MEASURE_TYPE_OPTIONS } from '@/lib/stockMeasureTypes';

export { STOCK_MEASURE_TYPE_OPTIONS };

export const PRODUCT_EDITOR_EMPTY = {
  product_code: '',
  title: '',
  slug: '',
  short_description: '',
  story_description: '',
  local_name: '',
  processing_method: '',
  source_type: '',
  supplier_name: '',
  origin_state: '',
  process_method: '',
  shelf_life_text: '',
  best_for: '',
  storage_note: '',
  yasvik_mark: '',
  delivery_card: '',
  pack_info_card: '',
  sourcing_card: '',
  recipe_ids: '',
  recipe_titles: '',
  recipe_links: [],
  price: '',
  stock: '',
  stock_measure_type: 'kg',
  low_stock_threshold: 10,
  selling_price_per_kg: '',
  store_selling_price_per_kg: '',
  price_inflate_percent: '',
  store_price_inflate_percent: '',
  small_pack_margin_rs: '',
  pack_charm_mode: 'nine',
  hero_image: '',
  hero_video: '',
  images: [],
  category_id: '',
  journey_id: '',
  person_id: '',
  region_id: '',
  is_featured: false,
  featured_in_hero: false,
  is_published: false,
  sell_online: true,
  sort_order: 0,
  product_group: '',
  group_sort_order: 0,
  variants: [],
  sku: '',
  seo_title: '',
  seo_description: '',
  seo_keywords: '',
  harvest_date: '',
  batch_tested_at: '',
  purity_badges: [],
  hover_media: [],
  ingredients: '',
  allergen_info: '',
  primary_customer_benefit: '',
  natural_variation_note: '',
  subject_to_availability: false,
  launch_batch: 'later',
  inventory_mode: '',
  image_status: 'missing',
  image_source: '',
  image_accuracy_reviewed: false,
  image_approved_by: '',
  image_approved_at: '',
  product_kind: '',
  composition_status: '',
  composition_json: null,
  bundle_id: '',
  bundle_items: [],
  bundle_status: 'draft',
  bundle_inventory_mode: 'prepacked_stock',
  bundle_substitution_policy: '',
  bundle_total_net_weight_g: '',
  bundle_item_count: 0,
  bundle_outer_packaging_cost_paise: 0,
  bundle_has_unresolved_components: false,
  bundle_mapping_notes: '',
};

export function normalizeEditorList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return trimmed.split('\n').map((line) => line.trim()).filter(Boolean);
    }
  }
  return [];
}

function editorText(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join('\n');
  if (value === null || value === undefined) return '';
  return String(value);
}

function editorDate(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function nullableId(value) {
  const next = String(value || '').trim();
  return next || null;
}

function nullableDate(value) {
  const next = String(value || '').trim();
  return next || null;
}

function nullableNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
}

export function productToEditorForm(item = {}) {
  const rawVariants = normalizeEditorList(item.variants ?? item.quick_variants).filter(
    (variant) => variant && typeof variant === 'object'
  );
  const pricingMeta = extractPricingMetaFromVariants(rawVariants);
  const variants = rawVariants.filter((variant) => !isPricingMetaVariant(variant)).map((variant) => ({
    ...variant,
    image_urls: normalizeEditorList(variant.image_urls ?? (variant.image_url ? [variant.image_url] : [])),
  }));
  const measureType = item.stock_measure_type || resolveProductMeasureType(item);
  const {
    name: _name,
    description: _description,
    discount_price: _discountPrice,
    stock_quantity: _stockQuantity,
    featured_image_url: _featuredImageUrl,
    ...rest
  } = item;

  return {
    ...PRODUCT_EDITOR_EMPTY,
    ...rest,
    title: item.title || item.name || '',
    story_description: item.story_description || item.description || '',
    hero_image: item.hero_image || item.featured_image_url || '',
    stock: usesBulkMeasureType(measureType)
      ? (item.shared_stock_kg ?? item.stock ?? item.stock_quantity ?? '')
      : (item.stock ?? item.stock_quantity ?? ''),
    stock_measure_type: measureType,
    price_inflate_percent: deriveInflatePercent(
      (item.selling_price_per_kg ?? pricingMeta.selling_price_per_kg)
        ? (item.compare_price ?? item.discount_price)
        : (item.compare_price ?? item.discount_price),
      item.selling_price_per_kg ?? pricingMeta.selling_price_per_kg ?? item.price,
      item.price_inflate_percent ?? pricingMeta.price_inflate_percent
    ),
    store_price_inflate_percent: item.store_price_inflate_percent ?? pricingMeta.store_price_inflate_percent ?? '',
    small_pack_margin_rs: item.small_pack_margin_rs ?? pricingMeta.small_pack_margin_rs ?? '',
    pack_charm_mode: item.pack_charm_mode ?? pricingMeta.pack_charm_mode ?? 'nine',
    variants,
    images: (() => {
      const gallery = normalizeEditorList(item.images);
      const hero = String(item.hero_image || item.featured_image_url || '').trim();
      if (!hero) return gallery;
      return [hero, ...gallery.filter((url) => url !== hero)];
    })(),
    purity_badges: normalizeEditorList(item.purity_badges),
    hover_media: normalizeEditorList(item.hover_media),
    recipe_links: normalizeEditorList(item.recipe_links),
    recipe_ids: editorText(item.recipe_ids),
    recipe_titles: editorText(item.recipe_titles),
    harvest_date: editorDate(item.harvest_date),
    batch_tested_at: editorDate(item.batch_tested_at),
    selling_price_per_kg: item.selling_price_per_kg ?? pricingMeta.selling_price_per_kg ?? '',
    store_selling_price_per_kg: item.store_selling_price_per_kg ?? pricingMeta.store_selling_price_per_kg ?? '',
    category_id: item.category_id || '',
    journey_id: item.journey_id || '',
    person_id: item.person_id || '',
    region_id: item.region_id || '',
    sell_online: item.sell_online !== false,
    ingredients: item.ingredients || '',
    allergen_info: item.allergen_info || item.allergens || '',
    primary_customer_benefit: item.primary_customer_benefit || '',
    natural_variation_note: item.natural_variation_note || '',
    subject_to_availability: item.subject_to_availability === true,
    launch_batch: item.launch_batch === '1' ? '1' : 'later',
    inventory_mode: item.inventory_mode || '',
    image_status: item.image_status || 'missing',
    image_source: item.image_source || '',
    image_accuracy_reviewed: item.image_accuracy_reviewed === true,
    image_approved_by: item.image_approved_by || '',
    image_approved_at: item.image_approved_at || '',
    product_kind: item.product_kind || '',
    composition_status: item.composition_status || '',
    composition_json: item.composition_json || null,
    bundle_id: item.bundle_id || '',
    bundle_items: Array.isArray(item.bundle_items) ? item.bundle_items : [],
    bundle_status: item.bundle_status || 'draft',
    bundle_inventory_mode: item.bundle_inventory_mode || item.inventory_mode || 'prepacked_stock',
    bundle_substitution_policy: item.bundle_substitution_policy || '',
    bundle_total_net_weight_g: item.bundle_total_net_weight_g ?? item.bundle_net_weight_g ?? '',
    bundle_item_count: item.bundle_item_count || 0,
    bundle_outer_packaging_cost_paise: item.bundle_outer_packaging_cost_paise || 0,
    bundle_has_unresolved_components: item.bundle_has_unresolved_components === true,
    bundle_mapping_notes: item.bundle_mapping_notes || '',
  };
}

export function validateProductVariantsForSave(form = {}) {
  const variants = normalizeEditorList(form.variants).filter((variant) => variant && typeof variant === 'object');
  for (const variant of variants) {
    if (isPricingMetaVariant(variant)) continue;
    const label = String(variant.label || '').trim();
    const hasOtherFields = variant.price || variant.pack_kg || variant.sku || variant.stock;
    if (!label && hasOtherFields) {
      return 'Each variant needs a label (e.g. 500g or 1kg) before saving.';
    }
  }
  return null;
}

export function buildProductSavePayload(form, { isDuplicating = false, includeMedia = true, allProducts = [] } = {}) {
  const workingForm = isDuplicating ? applyDuplicateIdentity(form, allProducts) : form;
  const catalog = Array.isArray(allProducts) ? allProducts : [];
  let sku = normalizeProductSku(workingForm.sku);
  if (!sku && catalog.length) {
    sku = suggestProductSku('', catalog);
  }

  const existingVariants = [
    ...normalizeEditorList(workingForm.variants),
    ...normalizeEditorList(workingForm.quick_variants),
  ];
  const existingMeta = extractPricingMetaFromVariants(existingVariants);
  const { variants, quickVariants } = prepareVariantsForSave(workingForm, { preservePrices: true });
  const quickVariantsWithMeta = mergePricingMetaIntoQuickVariants(quickVariants, existingMeta, existingVariants);
  const stock = resolveProductStockForSave(workingForm.stock, quickVariantsWithMeta);
  const measureType = workingForm.stock_measure_type || 'kg';
  const sharedStockKg = usesBulkMeasureType(measureType) && Number.isFinite(Number(workingForm.stock))
    ? Number(workingForm.stock)
    : nullableNumber(workingForm.shared_stock_kg);

  const defaultVariant = findDefaultPricingVariant(quickVariantsWithMeta);
  const productPrice = Number(defaultVariant?.price) || Number(workingForm.price) || 0;
  const comparePrice = nullableNumber(defaultVariant?.compare_price)
    ?? nullableNumber(workingForm.compare_price);

  return {
    product_code: String(workingForm.product_code || '').trim() || sku || null,
    title: workingForm.title,
    slug: workingForm.slug || slugifyProduct(workingForm.title) || '',
    short_description: workingForm.short_description,
    story_description: workingForm.story_description,
    local_name: workingForm.local_name,
    processing_method: workingForm.processing_method,
    source_type: String(workingForm.source_type || '').trim() || null,
    supplier_name: String(workingForm.supplier_name || '').trim() || null,
    origin_state: String(workingForm.origin_state || '').trim() || null,
    process_method: String(workingForm.process_method || workingForm.processing_method || '').trim() || null,
    shelf_life_text: String(workingForm.shelf_life_text || '').trim() || null,
    best_for: workingForm.best_for,
    storage_note: workingForm.storage_note,
    yasvik_mark: workingForm.yasvik_mark,
    delivery_card: workingForm.delivery_card,
    pack_info_card: workingForm.pack_info_card,
    sourcing_card: workingForm.sourcing_card,
    recipe_ids: workingForm.recipe_ids,
    recipe_titles: workingForm.recipe_titles,
    recipe_links: normalizeEditorList(workingForm.recipe_links),
    price: productPrice,
    compare_price: comparePrice,
    stock,
    stock_measure_type: measureType,
    shared_stock_kg: sharedStockKg,
    low_stock_threshold: Number(workingForm.low_stock_threshold) || 10,
    sku: sku || null,
    ...(includeMedia
      ? {
          hero_image: workingForm.hero_image,
          hero_video: workingForm.hero_video,
          images: normalizeEditorList(workingForm.images),
        }
      : {}),
    category_id: nullableId(workingForm.category_id),
    journey_id: nullableId(workingForm.journey_id),
    person_id: nullableId(workingForm.person_id),
    region_id: nullableId(workingForm.region_id),
    weight_grams: nullableNumber(workingForm.weight_grams),
    is_featured: !!workingForm.is_featured,
    featured_in_hero: !!workingForm.featured_in_hero,
    is_published: !!workingForm.is_published,
    sell_online: workingForm.sell_online !== false,
    sort_order: Number(workingForm.sort_order) || 0,
    product_group: String(workingForm.product_group || '').trim() || null,
    group_sort_order: Number(workingForm.group_sort_order) || 0,
    harvest_date: nullableDate(workingForm.harvest_date),
    batch_tested_at: nullableDate(workingForm.batch_tested_at),
    seo_title: workingForm.seo_title,
    seo_description: workingForm.seo_description,
    seo_keywords: workingForm.seo_keywords,
    ingredients: String(workingForm.ingredients || '').trim() || null,
    allergen_info: String(workingForm.allergen_info || '').trim() || null,
    primary_customer_benefit: String(workingForm.primary_customer_benefit || '').trim() || null,
    natural_variation_note: String(workingForm.natural_variation_note || '').trim() || null,
    subject_to_availability: workingForm.subject_to_availability === true,
    launch_batch: workingForm.launch_batch === '1' ? '1' : 'later',
    inventory_mode: String(workingForm.inventory_mode || '').trim() || null,
    image_status: String(workingForm.image_status || 'missing').trim() || 'missing',
    image_source: String(workingForm.image_source || '').trim() || null,
    image_accuracy_reviewed: workingForm.image_accuracy_reviewed === true,
    image_approved_by: String(workingForm.image_approved_by || '').trim() || null,
    image_approved_at: nullableDate(workingForm.image_approved_at),
    product_kind: String(workingForm.product_kind || '').trim() || null,
    composition_status: String(workingForm.composition_status || '').trim() || null,
    composition_json: workingForm.composition_json || null,
    bundle_id: nullableId(workingForm.bundle_id),
    bundle_item_count: Number(workingForm.bundle_item_count) || null,
    bundle_net_weight_g: nullableNumber(workingForm.bundle_total_net_weight_g),
    variants,
    quick_variants: quickVariantsWithMeta,
    hover_media: normalizeEditorList(form.hover_media),
    purity_badges: normalizeEditorList(form.purity_badges),
  };
}

/** Packaged combo with independent (non-BOM) inventory. */
export function isPrepackedComboInventory(formOrProduct = {}) {
  const mode = String(formOrProduct.inventory_mode || '').trim();
  const group = String(formOrProduct.product_group || '').trim();
  return mode === 'prepacked_stock' || group === 'packaged_combo';
}
