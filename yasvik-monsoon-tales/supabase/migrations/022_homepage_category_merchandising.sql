-- 022: Homepage category merchandising + millet consolidation + display renames
-- Safe: preserves category IDs and product.category_id assignments; no product duplication.

-- ---------------------------------------------------------------------------
-- 1) Merchandising columns (independent of shop tree sort_order / is_active)
-- ---------------------------------------------------------------------------
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS show_on_homepage boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS homepage_order integer NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS is_featured_category boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_hero_category boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_seasonal_category boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS homepage_label text,
  ADD COLUMN IF NOT EXISTS homepage_image_override text,
  ADD COLUMN IF NOT EXISTS homepage_description text,
  ADD COLUMN IF NOT EXISTS homepage_cta_label text,
  ADD COLUMN IF NOT EXISTS homepage_cta_url text,
  ADD COLUMN IF NOT EXISTS homepage_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS seasonal_starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS seasonal_ends_at timestamptz;

ALTER TABLE categories
  DROP CONSTRAINT IF EXISTS categories_homepage_status_check;

ALTER TABLE categories
  ADD CONSTRAINT categories_homepage_status_check
  CHECK (homepage_status IN ('active', 'draft', 'hidden', 'seasonal'));

CREATE INDEX IF NOT EXISTS idx_categories_homepage_order
  ON categories (show_on_homepage, homepage_order)
  WHERE show_on_homepage = true;

-- Slug aliases for compatibility when roots are merged / renamed
CREATE TABLE IF NOT EXISTS category_slug_aliases (
  old_slug text PRIMARY KEY,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_category_slug_aliases_category
  ON category_slug_aliases (category_id);

-- ---------------------------------------------------------------------------
-- 2) Rename display labels (keep IDs + primary slugs stable where possible)
-- ---------------------------------------------------------------------------
UPDATE categories SET
  name = 'Homemade Snacks & Sweets',
  emotional_title = 'Homemade Snacks & Sweets',
  updated_at = now()
WHERE slug = 'snacks';

UPDATE categories SET
  name = 'Homemade Pickles',
  emotional_title = 'Homemade Pickles',
  updated_at = now()
WHERE slug = 'pickles';

UPDATE categories SET
  name = 'Spices, Powders & Podis',
  emotional_title = 'Spices, Powders & Podis',
  updated_at = now()
WHERE slug = 'spices';

UPDATE categories SET
  name = 'Dry Fruits, Nuts & Seeds',
  emotional_title = 'Dry Fruits, Nuts & Seeds',
  updated_at = now()
WHERE slug = 'dry-fruits';

UPDATE categories SET
  name = 'Millets & Millet Foods',
  emotional_title = 'Millets & Millet Foods',
  updated_at = now()
WHERE slug = 'millets';

UPDATE categories SET
  name = 'Millet Flours',
  emotional_title = 'Millet Flours',
  updated_at = now()
WHERE slug = 'millet-flours';

UPDATE categories SET
  slug = 'cold-pressed-oils',
  name = 'Cold Pressed Oils',
  emotional_title = 'Cold Pressed Oils',
  updated_at = now()
WHERE lower(slug) = 'cold-pressed-oils' OR slug = 'Cold-Pressed-Oils';

-- ---------------------------------------------------------------------------
-- 3) Consolidate millet parents under millets
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  millets_id uuid;
  mixes_id uuid;
BEGIN
  SELECT id INTO millets_id FROM categories WHERE slug = 'millets' LIMIT 1;
  SELECT id INTO mixes_id FROM categories WHERE slug = 'millet-mixes' LIMIT 1;
  IF millets_id IS NULL THEN
    RAISE NOTICE 'millets root missing — skip millet consolidation';
    RETURN;
  END IF;

  -- Reparent former millet-flours root under millets (same ID; products stay tagged)
  UPDATE categories
  SET parent_id = millets_id, sort_order = 20, updated_at = now()
  WHERE slug = 'millet-flours' AND (parent_id IS DISTINCT FROM millets_id);

  IF mixes_id IS NOT NULL THEN
    UPDATE categories
    SET parent_id = millets_id,
        sort_order = CASE slug
          WHEN 'millet-mixes-organic-flakes-and-rava' THEN 30
          WHEN 'millet-mixes-organic-instant-mixes' THEN 40
          WHEN 'millet-mixes-organic-noodles-and-pasta' THEN 50
          ELSE sort_order
        END,
        updated_at = now()
    WHERE parent_id = mixes_id;

    INSERT INTO category_slug_aliases (old_slug, category_id)
    VALUES ('millet-mixes', millets_id)
    ON CONFLICT (old_slug) DO UPDATE SET category_id = EXCLUDED.category_id;

    UPDATE categories
    SET is_active = false,
        show_on_homepage = false,
        homepage_status = 'hidden',
        updated_at = now()
    WHERE id = mixes_id;
  END IF;

  UPDATE categories
  SET sort_order = 10, updated_at = now()
  WHERE slug = 'millets-organic-millet-grains';

  INSERT INTO category_slug_aliases (old_slug, category_id)
  VALUES ('millet-flours', millets_id)
  ON CONFLICT (old_slug) DO UPDATE SET category_id = EXCLUDED.category_id;
END $$;

-- ---------------------------------------------------------------------------
-- 4) Promote Ghee & Honey to parent aisles; retire combined oils-ghee root
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  oils_ghee_id uuid;
  ghee_id uuid;
  honey_id uuid;
BEGIN
  SELECT id INTO oils_ghee_id FROM categories WHERE slug = 'oils-ghee' LIMIT 1;
  SELECT id INTO ghee_id FROM categories WHERE slug IN ('oils-ghee-ghee', 'ghee') ORDER BY CASE WHEN slug = 'ghee' THEN 0 ELSE 1 END LIMIT 1;
  SELECT id INTO honey_id FROM categories WHERE slug IN ('oils-ghee-honey', 'honey') ORDER BY CASE WHEN slug = 'honey' THEN 0 ELSE 1 END LIMIT 1;

  IF ghee_id IS NOT NULL THEN
    UPDATE categories SET
      parent_id = NULL,
      slug = 'ghee',
      name = 'Ghee',
      emotional_title = 'Ghee',
      is_active = true,
      sort_order = 50,
      updated_at = now()
    WHERE id = ghee_id;
    INSERT INTO category_slug_aliases (old_slug, category_id)
    VALUES ('oils-ghee-ghee', ghee_id)
    ON CONFLICT (old_slug) DO UPDATE SET category_id = EXCLUDED.category_id;
  END IF;

  IF honey_id IS NOT NULL THEN
    UPDATE categories SET
      parent_id = NULL,
      slug = 'honey',
      name = 'Honey',
      emotional_title = 'Honey',
      is_active = true,
      sort_order = 60,
      updated_at = now()
    WHERE id = honey_id;
    INSERT INTO category_slug_aliases (old_slug, category_id)
    VALUES ('oils-ghee-honey', honey_id)
    ON CONFLICT (old_slug) DO UPDATE SET category_id = EXCLUDED.category_id;
  END IF;

  IF oils_ghee_id IS NOT NULL THEN
    UPDATE categories SET
      is_active = false,
      show_on_homepage = false,
      homepage_status = 'hidden',
      updated_at = now()
    WHERE id = oils_ghee_id;
    -- Point old combined root slug at cold-pressed oils for storefront resolution
    INSERT INTO category_slug_aliases (old_slug, category_id)
    SELECT 'oils-ghee', id FROM categories WHERE slug = 'cold-pressed-oils' LIMIT 1
    ON CONFLICT (old_slug) DO UPDATE SET category_id = EXCLUDED.category_id;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5) Spice powders split (rename + new empty/known-type children; no dup products)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  spices_id uuid;
  powders_id uuid;
  whole_id uuid;
  pantry_id uuid;
  podis_id uuid;
BEGIN
  SELECT id INTO spices_id FROM categories WHERE slug = 'spices' LIMIT 1;
  IF spices_id IS NULL THEN RETURN; END IF;

  SELECT id INTO powders_id FROM categories WHERE slug = 'spices-spice-powders-and-pantry' LIMIT 1;
  SELECT id INTO whole_id FROM categories WHERE slug = 'spices-premium-whole-spices' LIMIT 1;

  IF powders_id IS NOT NULL THEN
    UPDATE categories SET
      name = 'Homemade Spice Powders',
      emotional_title = 'Homemade Spice Powders',
      sort_order = 20,
      updated_at = now()
    WHERE id = powders_id;
  END IF;

  IF whole_id IS NOT NULL THEN
    UPDATE categories SET sort_order = 10, updated_at = now() WHERE id = whole_id;
  END IF;

  SELECT id INTO pantry_id FROM categories WHERE slug = 'spices-pantry-spices' LIMIT 1;
  IF pantry_id IS NULL THEN
    INSERT INTO categories (name, slug, emotional_title, parent_id, sort_order, is_active, homepage_status)
    VALUES ('Pantry Spices', 'spices-pantry-spices', 'Pantry Spices', spices_id, 40, true, 'active')
    RETURNING id INTO pantry_id;
  END IF;

  SELECT id INTO podis_id FROM categories WHERE slug = 'spices-traditional-podis' LIMIT 1;
  IF podis_id IS NULL THEN
    INSERT INTO categories (name, slug, emotional_title, parent_id, sort_order, is_active, homepage_status)
    VALUES ('Traditional Podis', 'spices-traditional-podis', 'Traditional Podis', spices_id, 30, true, 'active')
    RETURNING id INTO podis_id;
  END IF;

  -- Known whole-seed products → Premium Whole Spices
  IF whole_id IS NOT NULL THEN
    UPDATE products SET category_id = whole_id, updated_at = now()
    WHERE category_id = powders_id
      AND lower(name) IN ('coriander seeds', 'cumin seeds', 'fenugreek seeds', 'mustard seeds');
  END IF;

  -- Known pantry items → Pantry Spices
  IF pantry_id IS NOT NULL THEN
    UPDATE products SET category_id = pantry_id, updated_at = now()
    WHERE (
      (powders_id IS NOT NULL AND category_id = powders_id)
      OR category_id = spices_id
    )
    AND lower(name) IN ('tamarind', 'tadka mix', 'sabudana');
  END IF;

  -- Known powders left on Homemade Spice Powders; also parent-tagged chilli powder
  IF powders_id IS NOT NULL THEN
    UPDATE products SET category_id = powders_id, updated_at = now()
    WHERE category_id = spices_id
      AND lower(name) IN ('red chilli powder', 'homemade turmeric powder', 'curry chilli powder', 'moringa chilli powder');
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 6) Add Functional Food Powders parent (draft until products assigned)
-- ---------------------------------------------------------------------------
INSERT INTO categories (
  name, slug, emotional_title, parent_id, sort_order, is_active,
  show_on_homepage, homepage_order, is_featured_category, is_hero_category,
  homepage_status, homepage_description, homepage_cta_label
)
SELECT
  'Functional Food Powders',
  'functional-food-powders',
  'Functional Food Powders',
  NULL,
  90,
  true,
  false,
  90,
  true,
  false,
  'draft',
  'Edible wellness powders chosen for everyday cooking and nourishment',
  'Shop powders'
WHERE NOT EXISTS (
  SELECT 1 FROM categories WHERE slug = 'functional-food-powders'
);

-- ---------------------------------------------------------------------------
-- 7) Shop tree sort_order (catalogue hierarchy — not homepage merchandising)
-- ---------------------------------------------------------------------------
UPDATE categories SET sort_order = 10, updated_at = now() WHERE slug = 'snacks' AND parent_id IS NULL;
UPDATE categories SET sort_order = 20, updated_at = now() WHERE slug = 'pickles' AND parent_id IS NULL;
UPDATE categories SET sort_order = 30, updated_at = now() WHERE slug = 'spices' AND parent_id IS NULL;
UPDATE categories SET sort_order = 40, updated_at = now() WHERE slug = 'cold-pressed-oils' AND parent_id IS NULL;
UPDATE categories SET sort_order = 50, updated_at = now() WHERE slug = 'ghee' AND parent_id IS NULL;
UPDATE categories SET sort_order = 60, updated_at = now() WHERE slug = 'honey' AND parent_id IS NULL;
UPDATE categories SET sort_order = 70, updated_at = now() WHERE slug = 'jaggery' AND parent_id IS NULL;
UPDATE categories SET sort_order = 80, updated_at = now() WHERE slug = 'dry-fruits' AND parent_id IS NULL;
UPDATE categories SET sort_order = 90, updated_at = now() WHERE slug = 'functional-food-powders' AND parent_id IS NULL;
UPDATE categories SET sort_order = 100, updated_at = now() WHERE slug = 'heritage-rice' AND parent_id IS NULL;
UPDATE categories SET sort_order = 110, updated_at = now() WHERE slug = 'millets' AND parent_id IS NULL;
UPDATE categories SET sort_order = 120, updated_at = now() WHERE slug = 'pooja' AND parent_id IS NULL;
UPDATE categories SET sort_order = 130, updated_at = now() WHERE slug = 'natural-care' AND parent_id IS NULL;

-- ---------------------------------------------------------------------------
-- 8) Homepage merchandising defaults (marketing order ≠ shop sort_order)
-- ---------------------------------------------------------------------------
-- Reset homepage flags for roots first
UPDATE categories SET
  show_on_homepage = false,
  is_hero_category = false,
  is_featured_category = false,
  is_seasonal_category = false,
  homepage_status = CASE WHEN homepage_status = 'draft' THEN 'draft' ELSE 'active' END
WHERE parent_id IS NULL;

-- Hero 1–8
UPDATE categories SET
  show_on_homepage = true, is_hero_category = true, is_featured_category = false,
  homepage_order = 10, homepage_status = 'active',
  homepage_label = 'Homemade Snacks & Sweets',
  homepage_description = 'Traditional favourites for tea time and celebrations',
  homepage_cta_label = 'Shop snacks'
WHERE slug = 'snacks' AND parent_id IS NULL;

UPDATE categories SET
  show_on_homepage = true, is_hero_category = true, homepage_order = 20, homepage_status = 'active',
  homepage_label = 'Homemade Pickles',
  homepage_description = 'Regional recipes with bold, familiar flavours',
  homepage_cta_label = 'Shop pickles'
WHERE slug = 'pickles' AND parent_id IS NULL;

UPDATE categories SET
  show_on_homepage = true, is_hero_category = true, homepage_order = 30, homepage_status = 'active',
  homepage_label = 'Spices, Powders & Podis',
  homepage_description = 'Everyday flavour, prepared with care',
  homepage_cta_label = 'Shop spices'
WHERE slug = 'spices' AND parent_id IS NULL;

UPDATE categories SET
  show_on_homepage = true, is_hero_category = true, homepage_order = 40, homepage_status = 'active',
  homepage_label = 'Cold Pressed Oils',
  homepage_description = 'Traditional oils for everyday cooking',
  homepage_cta_label = 'Shop oils'
WHERE slug = 'cold-pressed-oils' AND parent_id IS NULL;

UPDATE categories SET
  show_on_homepage = true, is_hero_category = true, homepage_order = 50, homepage_status = 'active',
  homepage_label = 'Ghee',
  homepage_description = 'Carefully chosen cow and buffalo ghee',
  homepage_cta_label = 'Shop ghee'
WHERE slug = 'ghee' AND parent_id IS NULL;

UPDATE categories SET
  show_on_homepage = true, is_hero_category = true, homepage_order = 60, homepage_status = 'active',
  homepage_label = 'Honey',
  homepage_description = 'Distinct varieties for everyday use',
  homepage_cta_label = 'Shop honey'
WHERE slug = 'honey' AND parent_id IS NULL;

UPDATE categories SET
  show_on_homepage = true, is_hero_category = true, homepage_order = 70, homepage_status = 'active',
  homepage_label = 'Jaggery',
  homepage_description = 'Traditional sweeteners in familiar forms',
  homepage_cta_label = 'Shop jaggery'
WHERE slug = 'jaggery' AND parent_id IS NULL;

UPDATE categories SET
  show_on_homepage = true, is_hero_category = true, homepage_order = 80, homepage_status = 'active',
  homepage_label = 'Dry Fruits, Nuts & Seeds',
  homepage_description = 'Everyday nourishment and gifting favourites',
  homepage_cta_label = 'Shop dry fruits'
WHERE slug = 'dry-fruits' AND parent_id IS NULL;

-- Featured 9–11 (millet last among featured; functional draft stays off home until stocked)
UPDATE categories SET
  show_on_homepage = true, is_hero_category = false, is_featured_category = true,
  homepage_order = 100, homepage_status = 'active',
  homepage_label = 'Heritage Rice',
  homepage_description = 'Distinct grains with regional character',
  homepage_cta_label = 'Shop rice'
WHERE slug = 'heritage-rice' AND parent_id IS NULL;

UPDATE categories SET
  show_on_homepage = true, is_hero_category = false, is_featured_category = true,
  homepage_order = 110, homepage_status = 'active',
  homepage_label = 'Millets & Millet Foods',
  homepage_description = 'Grains, flours, flakes, mixes and more',
  homepage_cta_label = 'Shop millets'
WHERE slug = 'millets' AND parent_id IS NULL;

UPDATE categories SET
  show_on_homepage = false, is_hero_category = false, is_featured_category = true,
  homepage_order = 90, homepage_status = 'draft',
  homepage_label = 'Functional Food Powders',
  homepage_description = 'Edible wellness powders for everyday cooking',
  homepage_cta_label = 'Shop powders'
WHERE slug = 'functional-food-powders' AND parent_id IS NULL;

-- Supporting aisles: shop/POS only
UPDATE categories SET
  show_on_homepage = false, is_hero_category = false, is_featured_category = false,
  homepage_order = 200, homepage_status = 'active'
WHERE slug IN ('pooja', 'natural-care') AND parent_id IS NULL;
