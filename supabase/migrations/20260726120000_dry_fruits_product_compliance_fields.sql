-- Dry Fruits catalogue: optional compliance fields (non-breaking).
-- Does not alter existing product prices, stock, or publish state.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS ingredients text,
  ADD COLUMN IF NOT EXISTS allergen_info text,
  ADD COLUMN IF NOT EXISTS subject_to_availability boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.products.ingredients IS
  'Customer-facing ingredients when required (flavoured/roasted/sweetened products).';
COMMENT ON COLUMN public.products.allergen_info IS
  'Allergen statement for PDP / labels when applicable.';
COMMENT ON COLUMN public.products.subject_to_availability IS
  'When true, storefront may show Subject to Availability (supplier stock).';
