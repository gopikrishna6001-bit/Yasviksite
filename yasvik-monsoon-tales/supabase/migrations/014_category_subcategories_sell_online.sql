-- Subcategories (e.g. Grocery › Organic) and per-product online visibility
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS sell_online BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_products_sell_online ON products(sell_online)
  WHERE is_published = TRUE;

COMMENT ON COLUMN categories.parent_id IS 'Optional parent category — products usually sit on child rows (e.g. Organic under Pulses).';
COMMENT ON COLUMN products.sell_online IS 'When false, product stays in catalog/POS but is hidden from shop, search, and cart.';
