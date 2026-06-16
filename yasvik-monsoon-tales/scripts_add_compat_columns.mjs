import { Client } from 'pg';

const client = new Client({
  host: 'db.cpksnpuavywbmhrzglyh.supabase.co',
  port: 5432,
  user: 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
});

const sql = `
-- Page settings table expected by admin visibility UI
CREATE TABLE IF NOT EXISTS page_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_key VARCHAR(120) UNIQUE NOT NULL,
  label VARCHAR(255),
  is_visible BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE page_settings ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- App settings legacy-compatible columns
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS key VARCHAR(255);
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS value TEXT;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS label VARCHAR(255);

UPDATE app_settings SET key = COALESCE(key, setting_key);
UPDATE app_settings SET value = COALESCE(value, setting_value);

-- Homepage sections legacy content alias
ALTER TABLE homepage_sections ADD COLUMN IF NOT EXISTS content JSONB;
UPDATE homepage_sections SET content = COALESCE(content, content_json);

-- Page hero legacy fields used by UI/editor
ALTER TABLE page_heroes ADD COLUMN IF NOT EXISTS page_key VARCHAR(120);
ALTER TABLE page_heroes ADD COLUMN IF NOT EXISTS label VARCHAR(120);
ALTER TABLE page_heroes ADD COLUMN IF NOT EXISTS hero_mode VARCHAR(30) DEFAULT 'single';
ALTER TABLE page_heroes ADD COLUMN IF NOT EXISTS media_type VARCHAR(30) DEFAULT 'image';
ALTER TABLE page_heroes ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE page_heroes ADD COLUMN IF NOT EXISTS hero_video TEXT;
ALTER TABLE page_heroes ADD COLUMN IF NOT EXISTS hero_video_poster TEXT;
ALTER TABLE page_heroes ADD COLUMN IF NOT EXISTS slide_urls JSONB DEFAULT '[]'::jsonb;
ALTER TABLE page_heroes ADD COLUMN IF NOT EXISTS slideshow_interval_ms INTEGER DEFAULT 5000;
ALTER TABLE page_heroes ADD COLUMN IF NOT EXISTS background_style VARCHAR(80) DEFAULT 'rain-mist';
ALTER TABLE page_heroes ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE page_heroes ADD COLUMN IF NOT EXISTS cta_label VARCHAR(255);
ALTER TABLE page_heroes ADD COLUMN IF NOT EXISTS cta_url VARCHAR(255);

UPDATE page_heroes SET page_key = COALESCE(page_key, page_slug);
UPDATE page_heroes SET cta_label = COALESCE(cta_label, cta_text);
UPDATE page_heroes SET cta_url = COALESCE(cta_url, cta_link);
UPDATE page_heroes SET media_url = COALESCE(media_url, image_url);

-- Address legacy fields used in profile UI
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS user_email VARCHAR(255);
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS label VARCHAR(120);
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS building_name VARCHAR(255);
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS street TEXT;
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS landmark VARCHAR(255);
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS area VARCHAR(255);
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS district VARCHAR(255);
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS pin_code VARCHAR(20);
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

UPDATE addresses
SET
  pin_code = COALESCE(pin_code, postal_code),
  phone = COALESCE(phone, phone_number),
  building_name = COALESCE(building_name, name),
  street = COALESCE(street, address_line_1),
  area = COALESCE(area, address_line_2),
  label = COALESCE(label, type);

-- Subscription compat fields
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS product_ids JSONB DEFAULT '[]'::jsonb;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS razorpay_plan_id VARCHAR(255);

-- User subscriptions compat fields
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS user_email VARCHAR(255);
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMPTZ;

-- Orders compat fields
ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS timeline JSONB DEFAULT '[]'::jsonb;

-- Backfill user_email based on user_profiles
UPDATE addresses a
SET user_email = up.email
FROM user_profiles up
WHERE a.user_id = up.id AND (a.user_email IS NULL OR a.user_email = '');

UPDATE user_subscriptions us
SET user_email = up.email
FROM user_profiles up
WHERE us.user_id = up.id AND (us.user_email IS NULL OR us.user_email = '');

UPDATE orders o
SET created_by = up.email
FROM user_profiles up
WHERE o.user_id = up.id AND (o.created_by IS NULL OR o.created_by = '');
`;

await client.connect();
await client.query(sql);
await client.end();
console.log('Compatibility columns/tables created and backfilled.');
