import { deriveInflatePercent, prepareVariantsForSave, resolveProductComparePrice } from '@/lib/productPricingUtils';
import { extractPricingMetaFromVariants, isPricingMetaVariant, mergePricingMetaIntoQuickVariants } from '@/lib/productPricingMeta';
import { applyDuplicateIdentity, slugifyProduct } from '@/lib/productDuplicateUtils';
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
  price_inflate_percent: '',
  small_pack_margin_rs: '',
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
  const variants = rawVariants.filter((variant) => !isPricingMetaVariant(variant));
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
    small_pack_margin_rs: item.small_pack_margin_rs ?? pricingMeta.small_pack_margin_rs ?? '',
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
    category_id: item.category_id || '',
    journey_id: item.journey_id || '',
    person_id: item.person_id || '',
    region_id: item.region_id || '',
  };
}

export function buildProductSavePayload(form, { isDuplicating = false } = {}) {
  const workingForm = isDuplicating ? applyDuplicateIdentity(form) : form;
  const { variants, quickVariants } = prepareVariantsForSave(workingForm);
  const quickVariantsWithMeta = mergePricingMetaIntoQuickVariants(quickVariants, {
    selling_price_per_kg: workingForm.selling_price_per_kg,
    price_inflate_percent: workingForm.price_inflate_percent,
    small_pack_margin_rs: workingForm.small_pack_margin_rs,
  });
  const stock = resolveProductStockForSave(workingForm.stock, quickVariantsWithMeta);
  const measureType = workingForm.stock_measure_type || 'kg';
  const sharedStockKg = usesBulkMeasureType(measureType) && Number.isFinite(Number(workingForm.stock))
    ? Number(workingForm.stock)
    : nullableNumber(workingForm.shared_stock_kg);

  return {
    product_code: workingForm.product_code,
    title: workingForm.title,
    slug: workingForm.slug || slugifyProduct(workingForm.title) || '',
    short_description: workingForm.short_description,
    story_description: workingForm.story_description,
    local_name: workingForm.local_name,
    processing_method: workingForm.processing_method,
    best_for: workingForm.best_for,
    storage_note: workingForm.storage_note,
    yasvik_mark: workingForm.yasvik_mark,
    delivery_card: workingForm.delivery_card,
    pack_info_card: workingForm.pack_info_card,
    sourcing_card: workingForm.sourcing_card,
    recipe_ids: workingForm.recipe_ids,
    recipe_titles: workingForm.recipe_titles,
    recipe_links: normalizeEditorList(workingForm.recipe_links),
    price: Number(workingForm.price) || 0,
    compare_price: resolveProductComparePrice(workingForm),
    stock,
    stock_measure_type: measureType,
    shared_stock_kg: sharedStockKg,
    low_stock_threshold: Number(workingForm.low_stock_threshold) || 10,
    sku: workingForm.sku,
    hero_image: workingForm.hero_image,
    hero_video: workingForm.hero_video,
    images: normalizeEditorList(workingForm.images),
    category_id: nullableId(workingForm.category_id),
    journey_id: nullableId(workingForm.journey_id),
    person_id: nullableId(workingForm.person_id),
    region_id: nullableId(workingForm.region_id),
    weight_grams: nullableNumber(workingForm.weight_grams),
    is_featured: !!workingForm.is_featured,
    featured_in_hero: !!workingForm.featured_in_hero,
    is_published: !!workingForm.is_published,
    sort_order: Number(workingForm.sort_order) || 0,
    product_group: String(workingForm.product_group || '').trim() || null,
    group_sort_order: Number(workingForm.group_sort_order) || 0,
    harvest_date: nullableDate(workingForm.harvest_date),
    batch_tested_at: nullableDate(workingForm.batch_tested_at),
    seo_title: workingForm.seo_title,
    seo_description: workingForm.seo_description,
    seo_keywords: workingForm.seo_keywords,
    variants,
    quick_variants: quickVariantsWithMeta,
    hover_media: normalizeEditorList(form.hover_media),
    purity_badges: normalizeEditorList(form.purity_badges),
  };
}
