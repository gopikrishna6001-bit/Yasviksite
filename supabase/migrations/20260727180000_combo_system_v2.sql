-- Yasvik Combo System V2 — normalized options, gifts, and merchandising metadata.
-- Extends product_bundles (sellable parent) without duplicating combo products.

-- ─── Bundle merchandising metadata ───────────────────────────────────────────
ALTER TABLE public.product_bundles
  ADD COLUMN IF NOT EXISTS combo_merch_category text,
  ADD COLUMN IF NOT EXISTS purpose_label text,
  ADD COLUMN IF NOT EXISTS audience_tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS worth_paise integer,
  ADD COLUMN IF NOT EXISTS has_customer_options boolean NOT NULL DEFAULT false;

ALTER TABLE public.product_bundles
  DROP CONSTRAINT IF EXISTS product_bundles_combo_merch_category_check;
ALTER TABLE public.product_bundles
  ADD CONSTRAINT product_bundles_combo_merch_category_check
  CHECK (
    combo_merch_category IS NULL
    OR combo_merch_category IN ('separate', 'mixed', 'free_gift')
  );

COMMENT ON COLUMN public.product_bundles.combo_merch_category IS
  'Storefront section: separate (focused category), mixed (variety boxes), free_gift (gift-forward combos).';
COMMENT ON COLUMN public.product_bundles.purpose_label IS
  'Short purpose badge shown on combo cards, e.g. Daily Nutrition, Perfect Family Box.';
COMMENT ON COLUMN public.product_bundles.audience_tags IS
  'Who is this for? office, kids, gym, parents, seniors, travellers, monthly_grocery, natural_snacking';
COMMENT ON COLUMN public.product_bundles.worth_paise IS
  'Optional declared retail worth in paise for savings messaging.';
COMMENT ON COLUMN public.product_bundles.has_customer_options IS
  'When true, storefront uses combo_option_groups instead of flat product_bundle_items.';

-- ─── Bundle line roles (fixed combos without customer options) ───────────────
ALTER TABLE public.product_bundle_items
  ADD COLUMN IF NOT EXISTS item_role text NOT NULL DEFAULT 'included',
  ADD COLUMN IF NOT EXISTS display_group text,
  ADD COLUMN IF NOT EXISTS gift_worth_paise integer;

ALTER TABLE public.product_bundle_items
  DROP CONSTRAINT IF EXISTS product_bundle_items_item_role_check;
ALTER TABLE public.product_bundle_items
  ADD CONSTRAINT product_bundle_items_item_role_check
  CHECK (item_role IN ('included', 'optional', 'free_gift'));

ALTER TABLE public.product_bundle_items
  DROP CONSTRAINT IF EXISTS product_bundle_items_display_group_check;
ALTER TABLE public.product_bundle_items
  ADD CONSTRAINT product_bundle_items_display_group_check
  CHECK (
    display_group IS NULL
    OR display_group IN ('dry_fruits', 'seeds', 'nuts', 'snacks', 'free_items', 'other')
  );

-- ─── Customer option groups (one product, many selectable configurations) ────
CREATE TABLE IF NOT EXISTS public.combo_option_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid NOT NULL REFERENCES public.product_bundles(id) ON DELETE CASCADE,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS combo_option_groups_bundle_idx
  ON public.combo_option_groups (bundle_id, sort_order);

CREATE TABLE IF NOT EXISTS public.combo_option_choices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.combo_option_groups(id) ON DELETE CASCADE,
  label text NOT NULL,
  slug text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  description text,
  hero_image_url text,
  gallery_urls text[] NOT NULL DEFAULT '{}',
  price_override_paise integer,
  net_weight_g numeric(12, 3),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT combo_option_choices_group_slug_unique UNIQUE (group_id, slug)
);

CREATE INDEX IF NOT EXISTS combo_option_choices_group_idx
  ON public.combo_option_choices (group_id, sort_order)
  WHERE is_active = true;

CREATE TABLE IF NOT EXISTS public.combo_option_choice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  choice_id uuid NOT NULL REFERENCES public.combo_option_choices(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  component_variant_sku text,
  component_title_snapshot text,
  quantity_value numeric(12, 3),
  quantity_unit text,
  pack_count integer NOT NULL DEFAULT 1,
  sort_order integer NOT NULL DEFAULT 0,
  item_role text NOT NULL DEFAULT 'included',
  display_group text,
  gift_worth_paise integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT combo_option_choice_items_role_check
    CHECK (item_role IN ('included', 'optional', 'free_gift')),
  CONSTRAINT combo_option_choice_items_display_group_check
    CHECK (
      display_group IS NULL
      OR display_group IN ('dry_fruits', 'seeds', 'nuts', 'snacks', 'free_items', 'other')
    ),
  CONSTRAINT combo_option_choice_items_qty_unit_check
    CHECK (
      quantity_unit IS NULL
      OR quantity_unit IN ('g', 'kg', 'ml', 'l', 'unit', 'pack')
    ),
  CONSTRAINT combo_option_choice_items_pack_count_check
    CHECK (pack_count >= 1)
);

CREATE INDEX IF NOT EXISTS combo_option_choice_items_choice_idx
  ON public.combo_option_choice_items (choice_id, sort_order)
  WHERE is_active = true;

-- ─── Free gift engine (bundle-level or per-option) ───────────────────────────
CREATE TABLE IF NOT EXISTS public.combo_gift_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid REFERENCES public.product_bundles(id) ON DELETE CASCADE,
  choice_id uuid REFERENCES public.combo_option_choices(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  component_variant_sku text,
  quantity_value numeric(12, 3) DEFAULT 1,
  quantity_unit text DEFAULT 'pack',
  pack_count integer NOT NULL DEFAULT 1,
  worth_paise integer,
  campaign_name text,
  badge_text text NOT NULL DEFAULT 'FREE',
  show_on_card boolean NOT NULL DEFAULT true,
  show_on_pdp boolean NOT NULL DEFAULT true,
  show_on_checkout boolean NOT NULL DEFAULT true,
  is_enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT combo_gift_rules_target_check CHECK (
    (bundle_id IS NOT NULL AND choice_id IS NULL)
    OR (bundle_id IS NULL AND choice_id IS NOT NULL)
  ),
  CONSTRAINT combo_gift_rules_pack_count_check CHECK (pack_count >= 1)
);

CREATE INDEX IF NOT EXISTS combo_gift_rules_bundle_idx
  ON public.combo_gift_rules (bundle_id, sort_order)
  WHERE is_enabled = true AND bundle_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS combo_gift_rules_choice_idx
  ON public.combo_gift_rules (choice_id, sort_order)
  WHERE is_enabled = true AND choice_id IS NOT NULL;

-- ─── RLS (public read, staff write via existing admin patterns) ──────────────
ALTER TABLE public.combo_option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combo_option_choices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combo_option_choice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combo_gift_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS combo_option_groups_public_read ON public.combo_option_groups;
CREATE POLICY combo_option_groups_public_read ON public.combo_option_groups
  FOR SELECT USING (true);

DROP POLICY IF EXISTS combo_option_choices_public_read ON public.combo_option_choices;
CREATE POLICY combo_option_choices_public_read ON public.combo_option_choices
  FOR SELECT USING (true);

DROP POLICY IF EXISTS combo_option_choice_items_public_read ON public.combo_option_choice_items;
CREATE POLICY combo_option_choice_items_public_read ON public.combo_option_choice_items
  FOR SELECT USING (true);

DROP POLICY IF EXISTS combo_gift_rules_public_read ON public.combo_gift_rules;
CREATE POLICY combo_gift_rules_public_read ON public.combo_gift_rules
  FOR SELECT USING (true);
