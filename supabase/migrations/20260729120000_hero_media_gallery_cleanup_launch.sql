-- Hero media gallery cleanup for launch readiness.
-- Removes incorrect/cross-SKU supporting galleries from oil Heroes.
-- Promotes existing same-SKU assets where available.
-- Does not invent or substitute unrelated product imagery.
-- Does not change prices, stock, sell_online, or publication.

-- Groundnut: remove sunflower + sesame galleries (wrong SKUs)
DELETE FROM product_images
WHERE product_id = '486919f8-f0e7-4911-8b8c-8471e6a6d795'
  AND (
    image_url ILIKE '%sunflower%'
    OR image_url ILIKE '%sesame-oil-gallery%'
  );

-- Sesame: remove sunflower gallery only
DELETE FROM product_images
WHERE product_id = '2f47f4cf-2002-4e8a-89ed-0400fc91a618'
  AND image_url ILIKE '%sunflower%';

-- Sesame: promote product-named sesame gallery to primary
UPDATE product_images
SET is_primary = false, sort_order = 1
WHERE product_id = '2f47f4cf-2002-4e8a-89ed-0400fc91a618'
  AND image_url ILIKE '%yasvik-asset-4%';

UPDATE product_images
SET is_primary = true, sort_order = 0
WHERE product_id = '2f47f4cf-2002-4e8a-89ed-0400fc91a618'
  AND image_url ILIKE '%cold-pressed-sesame-oil-gallery%';

UPDATE products
SET featured_image_url = 'https://media.yasvik.com/media-assets/products/yasvik-cold-pressed-sesame-oil-gallery.webp',
    image_status = 'needs_correction',
    updated_at = now()
WHERE id = '2f47f4cf-2002-4e8a-89ed-0400fc91a618';

-- Avakaya: promote product-named gallery over generic asset
UPDATE product_images
SET is_primary = false, sort_order = 2
WHERE product_id = '4c4396d8-c1e4-4359-90fb-778105fd2c3f'
  AND image_url ILIKE '%yasvik-asset-9%';

UPDATE product_images
SET is_primary = true, sort_order = 0
WHERE product_id = '4c4396d8-c1e4-4359-90fb-778105fd2c3f'
  AND image_url = 'https://media.yasvik.com/media-assets/products/yasvik-mango-pickle-avakaya-gallery.webp';

UPDATE product_images
SET is_primary = false, sort_order = 1
WHERE product_id = '4c4396d8-c1e4-4359-90fb-778105fd2c3f'
  AND image_url = 'https://media.yasvik.com/media-assets/products/yasvik-mango-pickle-avakaya-gallery-2.webp';

UPDATE products
SET featured_image_url = 'https://media.yasvik.com/media-assets/products/yasvik-mango-pickle-avakaya-gallery.webp',
    image_status = 'needs_correction',
    updated_at = now()
WHERE id = '4c4396d8-c1e4-4359-90fb-778105fd2c3f';

UPDATE products
SET image_status = 'needs_correction',
    updated_at = now()
WHERE id IN (
  '486919f8-f0e7-4911-8b8c-8471e6a6d795',
  '25873e11-436e-43e4-b2dd-acb9e1b9eb0e',
  '9bd19447-45d6-4c37-be1a-9849030365d0',
  '9153896a-27dd-47b9-a1a1-e608a8ef870a'
);

-- Remove leftover generic supporting images after primary promotion
DELETE FROM product_images
WHERE product_id = '2f47f4cf-2002-4e8a-89ed-0400fc91a618'
  AND image_url ILIKE '%yasvik-asset-4%';

DELETE FROM product_images
WHERE product_id = '4c4396d8-c1e4-4359-90fb-778105fd2c3f'
  AND image_url ILIKE '%yasvik-asset-9%';

-- Brand Story: attach Story World collection (not a single SKU)
UPDATE storefront_stories
SET related_collection_id = '5a683bfb-3a84-4ad3-883a-728b8e3f5543',
    updated_at = now()
WHERE slug = 'why-yasvik-goes-looking'
  AND related_collection_id IS NULL;

-- Never leave published Stories without approved video + poster
UPDATE storefront_stories
SET status = 'draft',
    published_at = NULL,
    updated_at = now()
WHERE status = 'published'
  AND (
    video_url IS NULL OR btrim(video_url) = ''
    OR poster_image_url IS NULL OR btrim(poster_image_url) = ''
  );
