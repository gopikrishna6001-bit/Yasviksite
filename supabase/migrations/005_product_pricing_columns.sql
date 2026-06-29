-- Per-kg pricing and competitor reference (e.g. DMart Hyderabad manual benchmark)
ALTER TABLE IF EXISTS public.products
  ADD COLUMN IF NOT EXISTS selling_price_per_kg DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS compare_price_per_kg DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS competitor_mrp DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS competitor_mrp_per_kg DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS competitor_source VARCHAR(120);
