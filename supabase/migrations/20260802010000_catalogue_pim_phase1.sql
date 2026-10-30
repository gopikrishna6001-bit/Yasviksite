-- Phase 1 PIM-lite foundation: version stamps, normalized variant shadow, export audit.
-- Does NOT replace products.quick_variants (storefront / POS / pricing still read JSON).
-- Additive only.

CREATE TABLE IF NOT EXISTS public.catalogue_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_number bigint NOT NULL,
  schema_version text NOT NULL DEFAULT '1.0.0',
  label text,
  source text NOT NULL DEFAULT 'stabilize',
  notes text,
  product_count integer,
  variant_count integer,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalogue_versions_version_number_key UNIQUE (version_number)
);

CREATE TABLE IF NOT EXISTS public.catalogue_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalogue_version_id uuid REFERENCES public.catalogue_versions(id) ON DELETE SET NULL,
  catalogue_version_number bigint,
  schema_version text NOT NULL DEFAULT '1.0.0',
  filename text NOT NULL,
  workbook_hash text,
  exported_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  exported_at timestamptz NOT NULL DEFAULT now(),
  product_count integer,
  variant_count integer,
  sheet_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text
);

CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku text NOT NULL,
  label text,
  pack_quantity numeric,
  pack_unit text,
  display_pack text,
  pack_kg numeric,
  barcode text,
  shipping_weight numeric,
  stock_tracking_enabled boolean NOT NULL DEFAULT true,
  low_stock_level numeric,
  status text NOT NULL DEFAULT 'Active',
  default_variant boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 100,
  price numeric,
  compare_price numeric,
  store_price numeric,
  store_compare_price numeric,
  stock numeric,
  source text NOT NULL DEFAULT 'quick_variants',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_variants_sku_key UNIQUE (sku)
);

CREATE INDEX IF NOT EXISTS product_variants_product_id_idx
  ON public.product_variants (product_id);

CREATE INDEX IF NOT EXISTS product_variants_active_idx
  ON public.product_variants (is_active)
  WHERE is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS products_product_code_unique_idx
  ON public.products (product_code)
  WHERE product_code IS NOT NULL AND btrim(product_code) <> '';

-- Seed current version if empty
INSERT INTO public.catalogue_versions (version_number, schema_version, label, source, notes)
SELECT 1, '1.0.0', 'Phase 1 foundation', 'migration', 'Initial catalogue version stamp'
WHERE NOT EXISTS (SELECT 1 FROM public.catalogue_versions);

ALTER TABLE public.catalogue_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogue_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS catalogue_versions_admin_all ON public.catalogue_versions;
CREATE POLICY catalogue_versions_admin_all
  ON public.catalogue_versions
  FOR ALL
  TO authenticated
  USING (private.has_admin_role(ARRAY['admin', 'manager']))
  WITH CHECK (private.has_admin_role(ARRAY['admin', 'manager']));

DROP POLICY IF EXISTS catalogue_exports_admin_all ON public.catalogue_exports;
CREATE POLICY catalogue_exports_admin_all
  ON public.catalogue_exports
  FOR ALL
  TO authenticated
  USING (private.has_admin_role(ARRAY['admin', 'manager']))
  WITH CHECK (private.has_admin_role(ARRAY['admin', 'manager']));

DROP POLICY IF EXISTS product_variants_admin_all ON public.product_variants;
CREATE POLICY product_variants_admin_all
  ON public.product_variants
  FOR ALL
  TO authenticated
  USING (private.has_admin_role(ARRAY['admin', 'manager']))
  WITH CHECK (private.has_admin_role(ARRAY['admin', 'manager']));

-- Read-only for anon not required — storefront still uses products.quick_variants.
REVOKE ALL ON public.catalogue_versions FROM anon, public;
REVOKE ALL ON public.catalogue_exports FROM anon, public;
REVOKE ALL ON public.product_variants FROM anon, public;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalogue_versions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalogue_exports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;
