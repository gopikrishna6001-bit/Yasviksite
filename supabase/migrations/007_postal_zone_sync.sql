-- Postal authority metadata on delivery zones (India Post via sync)

ALTER TABLE delivery_zones
  ADD COLUMN IF NOT EXISTS district VARCHAR(100),
  ADD COLUMN IF NOT EXISTS state VARCHAR(100),
  ADD COLUMN IF NOT EXISTS block VARCHAR(100),
  ADD COLUMN IF NOT EXISTS post_offices JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS postal_source VARCHAR(50) DEFAULT 'postalpincode.in',
  ADD COLUMN IF NOT EXISTS postal_synced_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_delivery_zones_postal_sync ON delivery_zones(postal_synced_at);
