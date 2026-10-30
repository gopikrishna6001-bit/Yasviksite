-- Packaging cost management: reusable materials, profiles, variant mapping

CREATE TABLE IF NOT EXISTS public.packaging_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  material_type TEXT NOT NULL DEFAULT 'other'
    CHECK (material_type IN (
      'pp_cover', 'kraft_pouch', 'plastic_container', 'oil_bottle',
      'lid', 'cap', 'seal', 'sticker', 'label', 'tape', 'carton', 'other'
    )),
  size_label TEXT,
  capacity_ml NUMERIC(12, 3),
  capacity_g NUMERIC(12, 3),
  purchase_quantity NUMERIC(14, 3) NOT NULL DEFAULT 1 CHECK (purchase_quantity > 0),
  total_purchase_cost_paise INTEGER NOT NULL DEFAULT 0 CHECK (total_purchase_cost_paise >= 0),
  cost_per_piece_paise INTEGER NOT NULL DEFAULT 0 CHECK (cost_per_piece_paise >= 0),
  supplier_name TEXT,
  stock_quantity NUMERIC(14, 3) NOT NULL DEFAULT 0,
  wastage_pct NUMERIC(6, 2) NOT NULL DEFAULT 0 CHECK (wastage_pct >= 0 AND wastage_pct <= 100),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_packaging_materials_type ON public.packaging_materials (material_type, is_active);
CREATE INDEX IF NOT EXISTS idx_packaging_materials_name ON public.packaging_materials (name);

COMMENT ON COLUMN public.packaging_materials.cost_per_piece_paise IS
  'Effective unit cost including wastage: round(total_purchase_cost_paise / purchase_quantity * (1 + wastage_pct/100))';

CREATE TABLE IF NOT EXISTS public.packaging_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  profile_family TEXT NOT NULL DEFAULT 'other'
    CHECK (profile_family IN (
      'pp_cover', 'kraft_pouch', 'plastic_container', 'oil_bottle', 'fulfilicomponent', 'other'
    )),
  size_label TEXT,
  pack_kg NUMERIC(10, 4),
  packing_labour_paise INTEGER NOT NULL DEFAULT 0 CHECK (packing_labour_paise >= 0),
  inward_transport_paise INTEGER NOT NULL DEFAULT 0 CHECK (inward_transport_paise >= 0),
  packaging_scope TEXT NOT NULL DEFAULT 'primary'
    CHECK (packaging_scope IN ('primary', 'fulfiliment')),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_packaging_profiles_family ON public.packaging_profiles (profile_family, is_active);
CREATE INDEX IF NOT EXISTS idx_packaging_profiles_scope ON public.packaging_profiles (packaging_scope, is_active);

COMMENT ON COLUMN public.packaging_profiles.packaging_scope IS
  'primary = product variant pack; fulfilment = order-level outer pack (carton/tape)';

CREATE TABLE IF NOT EXISTS public.packaging_profile_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.packaging_profiles(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.packaging_materials(id) ON DELETE RESTRICT,
  quantity NUMERIC(12, 4) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  component_role TEXT NOT NULL DEFAULT 'other'
    CHECK (component_role IN (
      'container', 'lid', 'cap', 'seal', 'logo_sticker', 'price_label', 'pouch', 'cover', 'other'
    )),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, material_id, component_role)
);

CREATE INDEX IF NOT EXISTS idx_packaging_profile_components_profile
  ON public.packaging_profile_components (profile_id);

CREATE TABLE IF NOT EXISTS public.product_variant_packaging (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_sku TEXT,
  variant_label TEXT,
  pack_kg NUMERIC(10, 4),
  profile_id UUID REFERENCES public.packaging_profiles(id) ON DELETE SET NULL,
  component_overrides JSONB NOT NULL DEFAULT '[]'::jsonb,
  packing_labour_override_paise INTEGER CHECK (packing_labour_override_paise IS NULL OR packing_labour_override_paise >= 0),
  inward_transport_override_paise INTEGER CHECK (inward_transport_override_paise IS NULL OR inward_transport_override_paise >= 0),
  wastage_override_pct NUMERIC(6, 2) CHECK (wastage_override_pct IS NULL OR (wastage_override_pct >= 0 AND wastage_override_pct <= 100)),
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_variant_packaging_sku
  ON public.product_variant_packaging (product_id, variant_sku)
  WHERE variant_sku IS NOT NULL AND variant_sku <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_variant_packaging_label_kg
  ON public.product_variant_packaging (product_id, COALESCE(variant_label, ''), COALESCE(pack_kg, 0))
  WHERE variant_sku IS NULL OR variant_sku = '';

CREATE INDEX IF NOT EXISTS idx_product_variant_packaging_product
  ON public.product_variant_packaging (product_id);
CREATE INDEX IF NOT EXISTS idx_product_variant_packaging_profile
  ON public.product_variant_packaging (profile_id);

COMMENT ON COLUMN public.product_variant_packaging.component_overrides IS
  'Optional [{material_id, quantity, component_role}] replacing or adding to profile BOM for this variant only';

-- Default labour / transport knobs (optional global)
INSERT INTO public.app_settings (setting_key, setting_value, data_type, description)
VALUES (
  'packaging_cost_defaults',
  '{"default_packing_labour_paise":100,"default_inward_transport_paise":0,"default_wastage_pct":2}',
  'json',
  'Global defaults for packaging landed-cost calculation'
)
ON CONFLICT (setting_key) DO NOTHING;

ALTER TABLE public.packaging_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packaging_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packaging_profile_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variant_packaging ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage packaging materials" ON public.packaging_materials;
CREATE POLICY "Staff manage packaging materials"
ON public.packaging_materials FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.role IN ('admin', 'staff')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.role IN ('admin', 'staff')
  )
);

DROP POLICY IF EXISTS "Staff manage packaging profiles" ON public.packaging_profiles;
CREATE POLICY "Staff manage packaging profiles"
ON public.packaging_profiles FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.role IN ('admin', 'staff')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.role IN ('admin', 'staff')
  )
);

DROP POLICY IF EXISTS "Staff manage packaging profile components" ON public.packaging_profile_components;
CREATE POLICY "Staff manage packaging profile components"
ON public.packaging_profile_components FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.role IN ('admin', 'staff')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.role IN ('admin', 'staff')
  )
);

DROP POLICY IF EXISTS "Staff manage product variant packaging" ON public.product_variant_packaging;
CREATE POLICY "Staff manage product variant packaging"
ON public.product_variant_packaging FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.role IN ('admin', 'staff')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.role IN ('admin', 'staff')
  )
);
