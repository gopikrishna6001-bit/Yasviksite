-- Hyderabad door delivery + ops: orders alignment, delivery zones, stock ledger

-- ============================================================================
-- ORDERS — align with admin UI + worker pipeline
-- ============================================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS amount_paise INTEGER,
  ADD COLUMN IF NOT EXISTS subtotal_paise INTEGER,
  ADD COLUMN IF NOT EXISTS delivery_fee_paise INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS receipt_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS items_snapshot JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS timeline JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS address_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS delivery_instructions TEXT,
  ADD COLUMN IF NOT EXISTS delivery_slot VARCHAR(100),
  ADD COLUMN IF NOT EXISTS eta_label VARCHAR(100),
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS tracking_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS carrier VARCHAR(100),
  ADD COLUMN IF NOT EXISTS rider_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS rider_phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS order_channel VARCHAR(20) DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_receipt ON orders(receipt_id);
CREATE INDEX IF NOT EXISTS idx_orders_razorpay_order ON orders(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_channel ON orders(order_channel);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);

-- Backfill amount_paise from legacy total_amount where missing
UPDATE orders
SET amount_paise = ROUND(COALESCE(total_amount, 0) * 100)::INTEGER
WHERE amount_paise IS NULL AND total_amount IS NOT NULL;

-- ============================================================================
-- ORDER ITEMS — variant-level snapshots
-- ============================================================================

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS variant_label VARCHAR(255),
  ADD COLUMN IF NOT EXISTS sku VARCHAR(100),
  ADD COLUMN IF NOT EXISTS pack_kg NUMERIC(10, 3),
  ADD COLUMN IF NOT EXISTS product_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS unit_price_paise INTEGER,
  ADD COLUMN IF NOT EXISTS line_total_paise INTEGER;

CREATE INDEX IF NOT EXISTS idx_order_items_sku ON order_items(sku);

-- ============================================================================
-- DELIVERY ZONES — Hyderabad pincode service area
-- ============================================================================

CREATE TABLE IF NOT EXISTS delivery_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pincode VARCHAR(6) NOT NULL UNIQUE,
  area_name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  delivery_fee_paise INTEGER NOT NULL DEFAULT 4000,
  min_order_paise INTEGER DEFAULT 0,
  eta_label VARCHAR(100) DEFAULT 'Same-day / next-day delivery',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_zones_pincode ON delivery_zones(pincode);
CREATE INDEX IF NOT EXISTS idx_delivery_zones_active ON delivery_zones(is_active) WHERE is_active = TRUE;

-- Seed Hyderabad service pincodes (Ashok Nagar, Lingampally, surrounding)
INSERT INTO delivery_zones (pincode, area_name, delivery_fee_paise, eta_label) VALUES
  ('500020', 'Ashok Nagar', 4000, 'Same-day evening'),
  ('500032', 'Lingampally', 4000, 'Same-day evening'),
  ('500019', 'Chikkadpally', 4000, 'Same-day evening'),
  ('500018', 'Himayatnagar', 4000, 'Same-day evening'),
  ('500029', 'Himayatnagar East', 4000, 'Same-day evening'),
  ('500034', 'Begumpet', 4000, 'Next-day delivery'),
  ('500016', 'Secunderabad', 5000, 'Next-day delivery'),
  ('500003', 'Abids', 4000, 'Same-day evening'),
  ('500004', 'Koti', 4000, 'Same-day evening'),
  ('500028', 'Banjara Hills', 5000, 'Next-day delivery'),
  ('500033', 'Jubilee Hills', 5000, 'Next-day delivery'),
  ('500081', 'Nanakramguda', 5000, 'Next-day delivery'),
  ('500084', 'Kondapur', 5000, 'Next-day delivery'),
  ('500072', 'Miyapur', 5000, 'Next-day delivery'),
  ('500050', 'Chandanagar', 5000, 'Next-day delivery'),
  ('500008', 'Ameerpet', 4000, 'Same-day evening'),
  ('500038', 'Banjara Hills West', 5000, 'Next-day delivery'),
  ('500073', 'Gachibowli', 5000, 'Next-day delivery')
ON CONFLICT (pincode) DO NOTHING;

-- ============================================================================
-- STOCK MOVEMENTS — inventory ledger
-- ============================================================================

CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_sku VARCHAR(100),
  delta_units INTEGER DEFAULT 0,
  delta_kg NUMERIC(12, 3) DEFAULT 0,
  reason VARCHAR(50) NOT NULL,
  reference_type VARCHAR(50),
  reference_id UUID,
  notes TEXT,
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON stock_movements(created_at);

-- ============================================================================
-- RLS — delivery zones (public read) + stock movements (admin only)
-- ============================================================================

ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can read active delivery zones"
  ON delivery_zones FOR SELECT
  USING (is_active = TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage delivery zones"
  ON delivery_zones FOR ALL
  USING ((auth.jwt()->>'app_metadata')::jsonb->>'role' IN ('admin', 'staff'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can read stock movements"
  ON stock_movements FOR SELECT
  USING ((auth.jwt()->>'app_metadata')::jsonb->>'role' IN ('admin', 'staff'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
