/**
 * Strip heavy fields from product rows returned in list/grid API calls.
 */
const PRODUCT_LIST_OMIT_KEYS = [
  'story_description',
  'description',
  'seo_title',
  'seo_description',
  'seo_keywords',
  'recipe_ids',
  'recipe_titles',
  'recipe_links',
  'delivery_card',
  'pack_info_card',
  'sourcing_card',
  'yasvik_mark',
  'storage_note',
  'best_for',
  'processing_method',
  'batch_tested_at',
  'harvest_date',
];

export function slimProductForList(row = {}) {
  const slim = { ...row };
  PRODUCT_LIST_OMIT_KEYS.forEach((key) => {
    delete slim[key];
  });
  slim.hover_media = [];
  return slim;
}
