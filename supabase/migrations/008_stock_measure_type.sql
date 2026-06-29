-- Per-product inventory measure: kg (weight), L (volume), units (pieces)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS stock_measure_type text NOT NULL DEFAULT 'kg'
  CHECK (stock_measure_type IN ('kg', 'L', 'units'));

COMMENT ON COLUMN products.stock_measure_type IS
  'How stock is counted: kg (bulk weight), L (bulk litres), units (piece count).';

-- Backfill liquids (oils, honey, ghee) from title/slug hints
UPDATE products
SET stock_measure_type = 'L'
WHERE stock_measure_type = 'kg'
  AND (
    title ILIKE '%oil%'
    OR title ILIKE '%honey%'
    OR title ILIKE '%ghee%'
    OR slug ILIKE '%oil%'
    OR slug ILIKE '%honey%'
    OR slug ILIKE '%ghee%'
  );
