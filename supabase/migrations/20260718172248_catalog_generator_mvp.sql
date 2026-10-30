-- Catalog Generator MVP: eligibility flags + catalogue definitions, templates, generations.
-- Does not duplicate product catalogue data — snapshots reference live product IDs.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS show_in_public_catalogue boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_in_dealer_catalogue boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_in_gifting_catalogue boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS exclude_from_catalogues boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS catalogue_priority integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS catalogue_image_override text,
  ADD COLUMN IF NOT EXISTS catalogue_short_description_override text;

CREATE INDEX IF NOT EXISTS idx_products_catalogue_public
  ON public.products (exclude_from_catalogues, show_in_public_catalogue, is_published, sell_online);

CREATE TABLE IF NOT EXISTS public.catalogue_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  catalogue_type text NOT NULL CHECK (catalogue_type IN (
    'customer', 'whatsapp', 'dealer', 'gifting', 'lookbook'
  )),
  description text,
  design_template text NOT NULL DEFAULT 'editorial'
    CHECK (design_template IN ('editorial', 'compact', 'price_list', 'premium_lookbook', 'dealer_table', 'gifting')),
  default_options jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_system boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.catalogues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES public.catalogue_templates(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  catalogue_type text NOT NULL CHECK (catalogue_type IN (
    'customer', 'whatsapp', 'dealer', 'gifting', 'lookbook'
  )),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  is_public boolean NOT NULL DEFAULT false,
  is_latest_public boolean NOT NULL DEFAULT false,
  summary text,
  cover_image_url text,
  options jsonb NOT NULL DEFAULT '{}'::jsonb,
  selection jsonb NOT NULL DEFAULT '{}'::jsonb,
  latest_generation_id uuid,
  published_at timestamptz,
  created_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalogues_public_customer_only CHECK (
    NOT is_public OR catalogue_type IN ('customer', 'lookbook', 'whatsapp')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_catalogues_one_latest_public
  ON public.catalogues (is_latest_public)
  WHERE is_latest_public = true AND is_public = true AND status = 'published';

CREATE INDEX IF NOT EXISTS idx_catalogues_status_type
  ON public.catalogues (status, catalogue_type, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.catalogue_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalogue_id uuid NOT NULL REFERENCES public.catalogues(id) ON DELETE CASCADE,
  template_version text NOT NULL DEFAULT '1',
  status text NOT NULL DEFAULT 'ready' CHECK (status IN ('pending', 'ready', 'failed')),
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  page_count integer,
  estimated_bytes integer,
  file_key text,
  file_url text,
  file_name text,
  file_size bigint,
  mime_type text NOT NULL DEFAULT 'application/pdf',
  html_preview text,
  error_message text,
  generated_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_catalogue_generations_catalogue
  ON public.catalogue_generations (catalogue_id, generated_at DESC);

ALTER TABLE public.catalogues
  DROP CONSTRAINT IF EXISTS catalogues_latest_generation_id_fkey;
ALTER TABLE public.catalogues
  ADD CONSTRAINT catalogues_latest_generation_id_fkey
  FOREIGN KEY (latest_generation_id) REFERENCES public.catalogue_generations(id) ON DELETE SET NULL;

ALTER TABLE public.catalogue_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogue_generations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage catalogue templates" ON public.catalogue_templates;
CREATE POLICY "Staff manage catalogue templates"
ON public.catalogue_templates FOR ALL TO authenticated
USING (private.has_admin_role(ARRAY['admin', 'manager']))
WITH CHECK (private.has_admin_role(ARRAY['admin', 'manager']));

DROP POLICY IF EXISTS "Public read active catalogue templates" ON public.catalogue_templates;
CREATE POLICY "Public read active catalogue templates"
ON public.catalogue_templates FOR SELECT TO anon, authenticated
USING (is_active = true AND is_system = true);

DROP POLICY IF EXISTS "Staff manage catalogues" ON public.catalogues;
CREATE POLICY "Staff manage catalogues"
ON public.catalogues FOR ALL TO authenticated
USING (private.has_admin_role(ARRAY['admin', 'manager']))
WITH CHECK (private.has_admin_role(ARRAY['admin', 'manager']));

DROP POLICY IF EXISTS "Public read published catalogues" ON public.catalogues;
CREATE POLICY "Public read published catalogues"
ON public.catalogues FOR SELECT TO anon, authenticated
USING (
  status = 'published'
  AND is_public = true
  AND catalogue_type IN ('customer', 'lookbook', 'whatsapp')
  AND (published_at IS NULL OR published_at <= now())
);

DROP POLICY IF EXISTS "Staff manage catalogue generations" ON public.catalogue_generations;
CREATE POLICY "Staff manage catalogue generations"
ON public.catalogue_generations FOR ALL TO authenticated
USING (private.has_admin_role(ARRAY['admin', 'manager']))
WITH CHECK (private.has_admin_role(ARRAY['admin', 'manager']));

DROP POLICY IF EXISTS "Public read published catalogue generations" ON public.catalogue_generations;
CREATE POLICY "Public read published catalogue generations"
ON public.catalogue_generations FOR SELECT TO anon, authenticated
USING (
  status = 'ready'
  AND EXISTS (
    SELECT 1 FROM public.catalogues c
    WHERE c.id = catalogue_id
      AND c.status = 'published'
      AND c.is_public = true
      AND c.catalogue_type IN ('customer', 'lookbook', 'whatsapp')
  )
);

INSERT INTO public.catalogue_templates (key, name, catalogue_type, description, design_template, default_options, is_system, sort_order)
VALUES
(
  'yasvik-complete-customer',
  'Yasvik Complete Customer Catalogue',
  'customer',
  'All public catalogue products, grouped by category, selling price, Telugu names, variants, QR codes.',
  'editorial',
  '{
    "price_mode": "selling_only",
    "variant_mode": "group_under_product",
    "products_per_page": 4,
    "content": {
      "product_image": true,
      "telugu_name": true,
      "short_description": true,
      "badges": true,
      "variant_prices": true,
      "mrp": false,
      "savings": false,
      "qr_code": true,
      "stock_status": true
    },
    "sort": "category_order",
    "selection": { "mode": "all_eligible", "in_stock_only": false },
    "include_cover": true,
    "include_intro": true,
    "include_final": true
  }'::jsonb,
  true,
  10
),
(
  'yasvik-whatsapp-compact',
  'Yasvik WhatsApp Catalogue',
  'whatsapp',
  'Compact mobile-friendly price list for WhatsApp sharing.',
  'compact',
  '{
    "price_mode": "selling_only",
    "variant_mode": "group_under_product",
    "products_per_page": 6,
    "content": {
      "product_image": true,
      "telugu_name": true,
      "short_description": false,
      "badges": false,
      "variant_prices": true,
      "mrp": false,
      "savings": false,
      "qr_code": true,
      "stock_status": false
    },
    "sort": "homepage_order",
    "selection": { "mode": "hero_categories", "in_stock_only": true },
    "include_cover": true,
    "include_intro": false,
    "include_final": true
  }'::jsonb,
  true,
  20
),
(
  'yasvik-snacks-pickles',
  'Yasvik Snacks & Pickles Catalogue',
  'customer',
  'Homemade snacks, pickles, spices and podis.',
  'editorial',
  '{
    "price_mode": "selling_only",
    "variant_mode": "group_under_product",
    "products_per_page": 4,
    "content": {
      "product_image": true,
      "telugu_name": true,
      "short_description": true,
      "badges": true,
      "variant_prices": true,
      "mrp": false,
      "savings": false,
      "qr_code": true,
      "stock_status": true
    },
    "sort": "category_order",
    "selection": {
      "mode": "selected_categories",
      "category_slugs": ["homemade-snacks-sweets", "homemade-pickles", "spices-powders-podis"],
      "in_stock_only": false
    },
    "include_cover": true,
    "include_intro": true,
    "include_final": true
  }'::jsonb,
  true,
  30
)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  design_template = EXCLUDED.design_template,
  default_options = EXCLUDED.default_options,
  is_active = true,
  updated_at = now();
