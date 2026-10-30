-- Split Oils/Ghee/Honey into separate shop aisles; create store-staples subs; retag products.

-- Normalize / create three oil-related roots
UPDATE categories
SET parent_id = NULL,
    slug = 'cold-pressed-oils',
    name = 'Cold Pressed Oils',
    emotional_title = 'Cold Pressed Oils',
    is_active = true,
    sort_order = 64,
    updated_at = NOW()
WHERE lower(replace(slug, '_', '-')) = 'cold-pressed-oils';

INSERT INTO categories (name, slug, emotional_title, is_active, sort_order)
SELECT 'Cold Pressed Oils', 'cold-pressed-oils', 'Cold Pressed Oils', true, 64
WHERE NOT EXISTS (
  SELECT 1 FROM categories WHERE lower(replace(slug, '_', '-')) = 'cold-pressed-oils' AND parent_id IS NULL
);

UPDATE categories
SET parent_id = NULL,
    slug = 'ghee',
    name = 'Ghee',
    emotional_title = 'Ghee',
    is_active = true,
    sort_order = 65,
    updated_at = NOW()
WHERE lower(replace(slug, '_', '-')) IN ('oils-ghee-ghee', 'ghee');

INSERT INTO categories (name, slug, emotional_title, is_active, sort_order)
SELECT 'Ghee', 'ghee', 'Ghee', true, 65
WHERE NOT EXISTS (
  SELECT 1 FROM categories WHERE lower(replace(slug, '_', '-')) = 'ghee' AND parent_id IS NULL
);

UPDATE categories
SET parent_id = NULL,
    slug = 'honey',
    name = 'Honey',
    emotional_title = 'Honey',
    is_active = true,
    sort_order = 66,
    updated_at = NOW()
WHERE lower(replace(slug, '_', '-')) IN ('oils-ghee-honey', 'honey');

INSERT INTO categories (name, slug, emotional_title, is_active, sort_order)
SELECT 'Honey', 'honey', 'Honey', true, 66
WHERE NOT EXISTS (
  SELECT 1 FROM categories WHERE lower(replace(slug, '_', '-')) = 'honey' AND parent_id IS NULL
);

UPDATE categories
SET is_active = false, updated_at = NOW()
WHERE lower(replace(slug, '_', '-')) = 'oils-ghee' AND parent_id IS NULL;

-- Retag products still on combined oils-ghee root
UPDATE products p
SET category_id = (SELECT id FROM categories WHERE lower(replace(slug, '_', '-')) = 'ghee' AND parent_id IS NULL LIMIT 1),
    updated_at = NOW()
WHERE category_id IN (SELECT id FROM categories WHERE lower(replace(slug, '_', '-')) = 'oils-ghee')
  AND lower(p.name) LIKE '%ghee%';

UPDATE products p
SET category_id = (SELECT id FROM categories WHERE lower(replace(slug, '_', '-')) = 'honey' AND parent_id IS NULL LIMIT 1),
    updated_at = NOW()
WHERE category_id IN (SELECT id FROM categories WHERE lower(replace(slug, '_', '-')) = 'oils-ghee')
  AND lower(p.name) LIKE '%honey%';

UPDATE products p
SET category_id = (SELECT id FROM categories WHERE lower(replace(slug, '_', '-')) = 'cold-pressed-oils' AND parent_id IS NULL LIMIT 1),
    updated_at = NOW()
WHERE category_id IN (SELECT id FROM categories WHERE lower(replace(slug, '_', '-')) = 'oils-ghee');

-- Store staples subcategories for POS / admin (hidden from online nav)
INSERT INTO categories (name, slug, emotional_title, parent_id, is_active, sort_order)
SELECT 'Dals & Pulses', 'store-staples-dals-and-pulses', 'Dals & Pulses', ss.id, true, 10
FROM categories ss
WHERE lower(replace(ss.slug, '_', '-')) = 'store-staples' AND ss.parent_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM categories c WHERE lower(replace(c.slug, '_', '-')) = 'store-staples-dals-and-pulses'
  );

INSERT INTO categories (name, slug, emotional_title, parent_id, is_active, sort_order)
SELECT 'Regular Flours & Rava', 'store-staples-regular-flours-and-rava', 'Regular Flours & Rava', ss.id, true, 20
FROM categories ss
WHERE lower(replace(ss.slug, '_', '-')) = 'store-staples' AND ss.parent_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM categories c WHERE lower(replace(c.slug, '_', '-')) = 'store-staples-regular-flours-and-rava'
  );

INSERT INTO categories (name, slug, emotional_title, parent_id, is_active, sort_order)
SELECT 'Regular Rice & Grains', 'store-staples-regular-rice-and-grains', 'Regular Rice & Grains', ss.id, true, 30
FROM categories ss
WHERE lower(replace(ss.slug, '_', '-')) = 'store-staples' AND ss.parent_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM categories c WHERE lower(replace(c.slug, '_', '-')) = 'store-staples-regular-rice-and-grains'
  );

UPDATE categories SET is_active = true, updated_at = NOW()
WHERE lower(replace(slug, '_', '-')) = 'store-staples' AND parent_id IS NULL;

-- Retag store-only products on store-staples root → dals sub
UPDATE products p
SET category_id = sub.id, updated_at = NOW()
FROM categories sub
WHERE p.sell_online = false
  AND p.category_id IN (SELECT id FROM categories WHERE lower(replace(slug, '_', '-')) = 'store-staples' AND parent_id IS NULL)
  AND lower(replace(sub.slug, '_', '-')) = 'store-staples-dals-and-pulses'
  AND (
    lower(p.name) LIKE '%dal%'
    OR lower(p.name) LIKE '%chana%'
    OR lower(p.name) LIKE '%rajma%'
    OR lower(p.name) LIKE '%gram%'
    OR lower(p.name) LIKE '%peas%'
    OR lower(p.name) LIKE '%lobia%'
    OR lower(p.name) LIKE '%urad%'
    OR lower(p.name) LIKE '%moong%'
    OR lower(p.name) LIKE '%toor%'
    OR lower(p.name) LIKE '%putnalu%'
    OR lower(p.name) LIKE '%groundnut%'
  );

-- Retag store-only flours/rava on wrong online aisles
UPDATE products p
SET category_id = sub.id, updated_at = NOW()
FROM categories sub
WHERE p.sell_online = false
  AND lower(replace(sub.slug, '_', '-')) = 'store-staples-regular-flours-and-rava'
  AND (
    lower(p.name) LIKE '%rava%'
    OR lower(p.name) LIKE '%sooji%'
    OR lower(p.name) LIKE '%besan%'
    OR lower(p.name) LIKE '%flour%'
    OR lower(p.name) LIKE '%semiya%'
    OR lower(p.name) LIKE '%vermicelli%'
    OR lower(p.name) LIKE '%poha%'
    OR lower(p.name) LIKE '%idly%'
  );

-- Retag store-only rice/grains
UPDATE products p
SET category_id = sub.id, updated_at = NOW()
FROM categories sub
WHERE p.sell_online = false
  AND lower(replace(sub.slug, '_', '-')) = 'store-staples-regular-rice-and-grains'
  AND (
    lower(p.name) LIKE '%jowar%'
    OR lower(p.name) LIKE '%wheat%'
  );

-- Remove stale best-seller pick pointing at missing product
UPDATE app_settings
SET setting_value = (
  SELECT jsonb_agg(elem ORDER BY (elem->>'order')::int)
  FROM app_settings s,
       jsonb_array_elements(s.setting_value::jsonb) elem
  WHERE s.setting_key = 'home_best_sellers'
    AND EXISTS (SELECT 1 FROM products p WHERE p.id = (elem->>'product_id')::uuid)
)::text,
    value = (
  SELECT jsonb_agg(elem ORDER BY (elem->>'order')::int)
  FROM app_settings s,
       jsonb_array_elements(s.setting_value::jsonb) elem
  WHERE s.setting_key = 'home_best_sellers'
    AND EXISTS (SELECT 1 FROM products p WHERE p.id = (elem->>'product_id')::uuid)
)::text,
    updated_at = NOW()
WHERE setting_key = 'home_best_sellers';
