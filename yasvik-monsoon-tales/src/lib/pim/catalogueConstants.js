/** PIM-lite Phase 1 constants — Excel is not the database. */

export const CATALOGUE_SCHEMA_VERSION = '2.0.0-simple';
export const CATALOGUE_MASTER_FILENAME = 'YASVIK_CATALOGUE_SIMPLE.xlsx';

export const PRODUCT_STATUS_VALUES = [
  'Draft',
  'Published',
  'Out of Stock',
  'Temporarily Unavailable',
  'Archived',
  'Discontinued',
];

export const VARIANT_STATUS_VALUES = ['Draft', 'Active', 'Out of Stock', 'Archived', 'Discontinued'];

export const PACK_UNIT_VALUES = ['g', 'kg', 'ml', 'L', 'pcs', 'pack'];

export const MEDIA_ENTITY_TYPES = ['Product', 'Variant', 'Category', 'Combo', 'Story'];
export const MEDIA_ROLES = ['Hero', 'Gallery', 'Variant', 'Thumbnail', 'Category', 'Social', 'Poster'];
export const MEDIA_ACTIONS = ['', 'ADD', 'REPLACE', 'DELETE', 'ARCHIVE'];

export const IMPORT_MODES = ['UPDATE_EXISTING', 'ADD_AND_UPDATE', 'CONTROLLED_FULL_SYNC'];

export const MASTER_SHEETS = [
  'INSTRUCTIONS',
  'IMPORT_CONTROL',
  'PRODUCTS',
  'VARIANTS',
  'CATEGORIES',
  'PRICING',
  'SUPPLIERS',
  'MEDIA',
  'COMBOS',
  'COMBO_COMPONENTS',
  'LABEL_DATA',
  'BATCHES',
  'SEO_CONTENT',
  'VALIDATION_LISTS',
  'ERROR_CHECK',
];
