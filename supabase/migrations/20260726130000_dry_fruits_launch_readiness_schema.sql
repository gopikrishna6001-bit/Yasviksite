-- Dry Fruits launch-readiness: launch batch, image workflow, combo inventory mode,
-- product slug aliases (for retiring native-sesame-seeds without breaking old URLs).

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS launch_batch text NOT NULL DEFAULT 'later',
  ADD COLUMN IF NOT EXISTS inventory_mode text,
  ADD COLUMN IF NOT EXISTS image_status text NOT NULL DEFAULT 'missing',
  ADD COLUMN IF NOT EXISTS image_source text,
  ADD COLUMN IF NOT EXISTS image_accuracy_reviewed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS image_approved_by text,
  ADD COLUMN IF NOT EXISTS image_approved_at timestamptz;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_launch_batch_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_launch_batch_check
  CHECK (launch_batch IN ('1', 'later'));

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_inventory_mode_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_inventory_mode_check
  CHECK (
    inventory_mode IS NULL
    OR inventory_mode IN ('standard', 'prepacked_stock')
  );

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_image_status_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_image_status_check
  CHECK (
    image_status IN (
      'missing',
      'brief_ready',
      'generated',
      'needs_correction',
      'approved',
      'uploaded'
    )
  );

COMMENT ON COLUMN public.products.launch_batch IS
  'Dry fruits / catalogue launch grouping. 1 = launch batch 1; later = not in current launch.';
COMMENT ON COLUMN public.products.inventory_mode IS
  'prepacked_stock = packaged combo with independent units (no BOM deduction).';
COMMENT ON COLUMN public.products.image_status IS
  'Image production workflow: missing → brief_ready → generated → needs_correction → approved → uploaded.';

CREATE TABLE IF NOT EXISTS public.product_slug_aliases (
  old_slug text PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_slug_aliases_product_id
  ON public.product_slug_aliases (product_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_slug_aliases_old_slug_lower
  ON public.product_slug_aliases (lower(old_slug));

ALTER TABLE public.product_slug_aliases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read product slug aliases" ON public.product_slug_aliases;
CREATE POLICY "Public read product slug aliases"
ON public.product_slug_aliases
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Admins manage product slug aliases" ON public.product_slug_aliases;
CREATE POLICY "Admins manage product slug aliases"
ON public.product_slug_aliases
FOR ALL
TO authenticated
USING (private.has_admin_role(ARRAY['admin', 'manager']))
WITH CHECK (private.has_admin_role(ARRAY['admin', 'manager']));

COMMENT ON TABLE public.product_slug_aliases IS
  'Legacy product URL slugs → canonical product_id (e.g. retired native-sesame-seeds).';
