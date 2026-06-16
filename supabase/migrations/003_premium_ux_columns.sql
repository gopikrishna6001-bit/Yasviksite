-- Yasvik premium UX fields for trust and conversion features
ALTER TABLE IF EXISTS public.products
  ADD COLUMN IF NOT EXISTS batch_tested_at DATE,
  ADD COLUMN IF NOT EXISTS hover_media JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS quick_variants JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS purity_badges JSONB DEFAULT '[]'::jsonb;

