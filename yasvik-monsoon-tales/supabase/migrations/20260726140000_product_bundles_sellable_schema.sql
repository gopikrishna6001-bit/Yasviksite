-- Dry-fruit / sellable bundle architecture on existing product_bundles tables.
-- Extends curated kits so a sellable parent product can own structured components.
-- Does not publish products. Does not change live prices/stock on individuals.

-- ─── Base tables (idempotent if 009 already applied) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.product_related (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  related_product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  relation_type text NOT NULL CHECK (
    relation_type IN ('frequently_bought', 'complete_basket', 'similar', 'recipe_pairing')
  ),
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_related_unique UNIQUE (product_id, related_product_id, relation_type),
  CONSTRAINT product_related_not_self CHECK (product_id <> related_product_id)
);

CREATE TABLE IF NOT EXISTS public.product_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_name text NOT NULL,
  bundle_slug text NOT NULL UNIQUE,
  bundle_description text,
  bundle_type text NOT NULL DEFAULT 'curated',
  display_locations text[] NOT NULL DEFAULT '{home,category,cart,product}',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_bundle_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid NOT NULL REFERENCES public.product_bundles(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  is_required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_bundle_items_unique UNIQUE (bundle_id, product_id)
);

CREATE INDEX IF NOT EXISTS product_related_product_type_idx
  ON public.product_related (product_id, relation_type, sort_order)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS product_bundles_active_sort_idx
  ON public.product_bundles (sort_order, bundle_name)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS product_bundle_items_bundle_idx
  ON public.product_bundle_items (bundle_id, sort_order);

-- ─── Sellable parent + inventory / packaging metadata ────────────────────────
ALTER TABLE public.product_bundles
  ADD COLUMN IF NOT EXISTS parent_product_id uuid UNIQUE REFERENCES public.products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS bundle_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS inventory_mode text NOT NULL DEFAULT 'prepacked_stock',
  ADD COLUMN IF NOT EXISTS packaging_mode text NOT NULL DEFAULT 'separately_packed',
  ADD COLUMN IF NOT EXISTS substitution_policy text,
  ADD COLUMN IF NOT EXISTS total_net_weight_g numeric(12, 3),
  ADD COLUMN IF NOT EXISTS item_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS outer_packaging_cost_paise integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_unresolved_components boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mapping_notes text;

ALTER TABLE public.product_bundles
  DROP CONSTRAINT IF EXISTS product_bundles_bundle_status_check;
ALTER TABLE public.product_bundles
  ADD CONSTRAINT product_bundles_bundle_status_check
  CHECK (bundle_status IN ('draft', 'active', 'archived', 'unresolved'));

ALTER TABLE public.product_bundles
  DROP CONSTRAINT IF EXISTS product_bundles_inventory_mode_check;
ALTER TABLE public.product_bundles
  ADD CONSTRAINT product_bundles_inventory_mode_check
  CHECK (inventory_mode IN ('prepacked_stock', 'made_to_order'));

ALTER TABLE public.product_bundles
  DROP CONSTRAINT IF EXISTS product_bundles_packaging_mode_check;
ALTER TABLE public.product_bundles
  ADD CONSTRAINT product_bundles_packaging_mode_check
  CHECK (
    packaging_mode IN (
      'separately_packed',
      'mixed_pouch',
      'gift_wrap',
      'unconfirmed'
    )
  );

ALTER TABLE public.product_bundles
  DROP CONSTRAINT IF EXISTS product_bundles_bundle_type_check;
ALTER TABLE public.product_bundles
  ADD CONSTRAINT product_bundles_bundle_type_check
  CHECK (
    bundle_type IN (
      'curated',
      'bundle_combo',
      'gift_box',
      'true_mix_reference'
    )
  );

CREATE INDEX IF NOT EXISTS product_bundles_parent_product_idx
  ON public.product_bundles (parent_product_id)
  WHERE parent_product_id IS NOT NULL;

-- ─── Bundle line quantity / pack fields ──────────────────────────────────────
ALTER TABLE public.product_bundle_items
  ADD COLUMN IF NOT EXISTS component_variant_sku text,
  ADD COLUMN IF NOT EXISTS component_title_snapshot text,
  ADD COLUMN IF NOT EXISTS quantity_value numeric(12, 3),
  ADD COLUMN IF NOT EXISTS quantity_unit text,
  ADD COLUMN IF NOT EXISTS pack_count integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS substitution_allowed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.product_bundle_items
  DROP CONSTRAINT IF EXISTS product_bundle_items_quantity_unit_check;
ALTER TABLE public.product_bundle_items
  ADD CONSTRAINT product_bundle_items_quantity_unit_check
  CHECK (
    quantity_unit IS NULL
    OR quantity_unit IN ('g', 'kg', 'ml', 'l', 'unit', 'pack')
  );

ALTER TABLE public.product_bundle_items
  DROP CONSTRAINT IF EXISTS product_bundle_items_pack_count_check;
ALTER TABLE public.product_bundle_items
  ADD CONSTRAINT product_bundle_items_pack_count_check
  CHECK (pack_count >= 1);

COMMENT ON COLUMN public.product_bundles.parent_product_id IS
  'Sellable catalogue product that owns this structured bundle (e.g. dry-fruit combo SKU).';
COMMENT ON COLUMN public.product_bundles.inventory_mode IS
  'prepacked_stock = parent stock only (no component deduction). made_to_order = future BOM deduction.';
COMMENT ON COLUMN public.product_bundle_items.quantity_value IS
  'Included net quantity per pack (e.g. 100 with unit g).';

-- ─── Product classification ──────────────────────────────────────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_kind text,
  ADD COLUMN IF NOT EXISTS composition_status text,
  ADD COLUMN IF NOT EXISTS composition_json jsonb,
  ADD COLUMN IF NOT EXISTS bundle_id uuid REFERENCES public.product_bundles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS bundle_item_count integer,
  ADD COLUMN IF NOT EXISTS bundle_net_weight_g numeric(12, 3);

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_product_kind_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_product_kind_check
  CHECK (
    product_kind IS NULL
    OR product_kind IN (
      'individual_product',
      'true_mix',
      'bundle_combo',
      'gift_box'
    )
  );

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_composition_status_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_composition_status_check
  CHECK (
    composition_status IS NULL
    OR composition_status IN ('confirmed', 'unconfirmed', 'n_a')
  );

-- Allow made_to_order on products.inventory_mode (future-ready).
ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_inventory_mode_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_inventory_mode_check
  CHECK (
    inventory_mode IS NULL
    OR inventory_mode IN ('standard', 'prepacked_stock', 'made_to_order')
  );

COMMENT ON COLUMN public.products.product_kind IS
  'individual_product | true_mix | bundle_combo | gift_box';
COMMENT ON COLUMN public.products.composition_status IS
  'For true_mix: confirmed vs unconfirmed ingredient proportions.';
COMMENT ON COLUMN public.products.bundle_id IS
  'Denormalized link to product_bundles when this product is a sellable bundle parent.';

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.product_related ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_bundle_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_related_public_read ON public.product_related;
CREATE POLICY product_related_public_read ON public.product_related
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS product_bundles_public_read ON public.product_bundles;
CREATE POLICY product_bundles_public_read ON public.product_bundles
  FOR SELECT USING (is_active = true OR parent_product_id IS NOT NULL);

DROP POLICY IF EXISTS product_bundle_items_public_read ON public.product_bundle_items;
CREATE POLICY product_bundle_items_public_read ON public.product_bundle_items
  FOR SELECT USING (
    is_active = true
    OR EXISTS (
      SELECT 1 FROM public.product_bundles b
      WHERE b.id = bundle_id
    )
  );

DROP POLICY IF EXISTS product_bundles_admin_write ON public.product_bundles;
CREATE POLICY product_bundles_admin_write ON public.product_bundles
  FOR ALL TO authenticated
  USING (private.has_admin_role(ARRAY['admin', 'manager']))
  WITH CHECK (private.has_admin_role(ARRAY['admin', 'manager']));

DROP POLICY IF EXISTS product_bundle_items_admin_write ON public.product_bundle_items;
CREATE POLICY product_bundle_items_admin_write ON public.product_bundle_items
  FOR ALL TO authenticated
  USING (private.has_admin_role(ARRAY['admin', 'manager']))
  WITH CHECK (private.has_admin_role(ARRAY['admin', 'manager']));

DROP POLICY IF EXISTS product_related_admin_write ON public.product_related;
CREATE POLICY product_related_admin_write ON public.product_related
  FOR ALL TO authenticated
  USING (private.has_admin_role(ARRAY['admin', 'manager']))
  WITH CHECK (private.has_admin_role(ARRAY['admin', 'manager']));
