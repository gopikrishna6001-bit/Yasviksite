-- S1 MVP: warehouse, guest checkout, zone tiers, order events, notifications, review stats, blog stories, staff RBAC

-- ============================================================================
-- WAREHOUSES — multi-store ready (single Ashok Nagar seed for MVP)
-- ============================================================================

CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  address_text TEXT,
  city VARCHAR(100),
  state VARCHAR(100) DEFAULT 'Telangana',
  pincode VARCHAR(6),
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  google_maps_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO warehouses (id, code, name, address_text, city, pincode, is_default, is_active)
VALUES (
  'a1111111-1111-4111-a111-111111111111',
  'ashok-nagar',
  'Yasvik — Ashok Nagar',
  'Ashok Nagar, Hyderabad, Telangana',
  'Hyderabad',
  '500020',
  TRUE,
  TRUE
) ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- ORDERS — guest checkout + warehouse attribution
-- ============================================================================

ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS guest_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS guest_phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_guest_email ON orders(guest_email);
CREATE INDEX IF NOT EXISTS idx_orders_guest_phone ON orders(guest_phone);
CREATE INDEX IF NOT EXISTS idx_orders_warehouse ON orders(warehouse_id);

UPDATE orders
SET warehouse_id = 'a1111111-1111-4111-a111-111111111111'
WHERE warehouse_id IS NULL;

-- ============================================================================
-- DELIVERY ZONES — express / same-day tiers
-- ============================================================================

ALTER TABLE delivery_zones
  ADD COLUMN IF NOT EXISTS zone_tier VARCHAR(20) DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS express_eta_label VARCHAR(100),
  ADD COLUMN IF NOT EXISTS same_day_cutoff_hour INTEGER DEFAULT 14;

UPDATE delivery_zones
SET
  zone_tier = 'express',
  express_eta_label = COALESCE(express_eta_label, '2–4 hours'),
  eta_label = COALESCE(eta_label, 'Same-day evening')
WHERE pincode IN ('500020', '500019', '500018', '500029', '500003', '500004', '500008', '500032');

UPDATE delivery_zones
SET zone_tier = 'same_day'
WHERE zone_tier = 'standard'
  AND pincode IN ('500034', '500016', '500028', '500033', '500081', '500084', '500072', '500050', '500038', '500073');

-- ============================================================================
-- ORDER STATUS EVENTS — auditable timeline
-- ============================================================================

CREATE TABLE IF NOT EXISTS order_status_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  note TEXT,
  actor_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  actor_type VARCHAR(20) DEFAULT 'system',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_status_events_order ON order_status_events(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_events_created ON order_status_events(created_at);

-- ============================================================================
-- NOTIFICATION LOG — email / WhatsApp delivery audit
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  channel VARCHAR(20) NOT NULL,
  recipient VARCHAR(255),
  template_key VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending',
  payload JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_log_order ON notification_log(order_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_channel ON notification_log(channel);

-- ============================================================================
-- REVIEW STATS — aggregate for PDP / home
-- ============================================================================

CREATE OR REPLACE VIEW product_review_stats AS
SELECT
  product_id,
  COUNT(*) FILTER (WHERE COALESCE(is_approved, TRUE)) AS review_count,
  ROUND(AVG(rating) FILTER (WHERE COALESCE(is_approved, TRUE)), 1) AS avg_rating
FROM reviews
GROUP BY product_id;

GRANT SELECT ON product_review_stats TO anon, authenticated;

-- ============================================================================
-- STORIES — blog / educational content on home
-- ============================================================================

ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS content_category VARCHAR(50) DEFAULT 'story',
  ADD COLUMN IF NOT EXISTS show_on_home BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS excerpt TEXT;

CREATE INDEX IF NOT EXISTS idx_stories_show_on_home ON stories(show_on_home) WHERE show_on_home = TRUE;
CREATE INDEX IF NOT EXISTS idx_stories_content_category ON stories(content_category);

-- ============================================================================
-- PRODUCTS — trust / sourcing metadata
-- ============================================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS source_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS origin_state VARCHAR(100),
  ADD COLUMN IF NOT EXISTS process_method VARCHAR(255),
  ADD COLUMN IF NOT EXISTS shelf_life_text VARCHAR(100);

-- ============================================================================
-- STOCK MOVEMENTS — warehouse attribution
-- ============================================================================

ALTER TABLE stock_movements
  ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL;

-- ============================================================================
-- STAFF PROFILES — RBAC scaffold beyond JWT role claim
-- ============================================================================

CREATE TABLE IF NOT EXISTS staff_profiles (
  id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'staff',
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  display_name VARCHAR(255),
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_profiles_role ON staff_profiles(role);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_warehouse ON staff_profiles(warehouse_id);

-- ============================================================================
-- RLS — helper + new tables
-- Note: auth.is_admin() lives in auth schema and requires dashboard/owner access.
-- Public policies use is_admin() below (includes staff_profiles lookup).
-- ============================================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT (auth.jwt()->>'app_metadata')::jsonb->>'role' IN ('admin', 'staff')
    OR EXISTS (
      SELECT 1 FROM staff_profiles
      WHERE id = auth.uid()
      AND is_active = TRUE
      AND role IN ('admin', 'staff', 'ops')
    )
$$ LANGUAGE sql SECURITY DEFINER;

ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active warehouses"
ON warehouses FOR SELECT
USING (is_active = TRUE);

CREATE POLICY "Admins manage warehouses"
ON warehouses FOR ALL
USING (is_admin());

CREATE POLICY "Admins read order status events"
ON order_status_events FOR SELECT
USING (is_admin());

CREATE POLICY "Admins read notification log"
ON notification_log FOR SELECT
USING (is_admin());

CREATE POLICY "Staff can read own profile"
ON staff_profiles FOR SELECT
USING (auth.uid() = id OR is_admin());

CREATE POLICY "Admins manage staff profiles"
ON staff_profiles FOR ALL
USING (is_admin());
