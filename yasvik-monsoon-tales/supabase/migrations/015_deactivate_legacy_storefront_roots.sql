-- Keep only launch-ready root aisles active on the storefront.
UPDATE categories
SET is_active = false,
    updated_at = NOW()
WHERE parent_id IS NULL
  AND is_active = true
  AND lower(replace(slug, '_', '-')) NOT IN (
    'organic',
    'millets',
    'millet-flours',
    'millet-mixes',
    'heritage-rice',
    'oils-ghee',
    'jaggery',
    'pickles',
    'spices',
    'snacks',
    'dry-fruits',
    'pooja',
    'natural-care'
  );
