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
-- People
ALTER TABLE people ADD COLUMN IF NOT EXISTS portrait_image TEXT;
ALTER TABLE people ADD COLUMN IF NOT EXISTS location_label VARCHAR(255);
ALTER TABLE people ADD COLUMN IF NOT EXISTS short_bio TEXT;
ALTER TABLE people ADD COLUMN IF NOT EXISTS long_story TEXT;
ALTER TABLE people ADD COLUMN IF NOT EXISTS quote TEXT;
UPDATE people SET portrait_image = COALESCE(portrait_image, image_url);
UPDATE people SET short_bio = COALESCE(short_bio, bio);

-- Journeys
ALTER TABLE journeys ADD COLUMN IF NOT EXISTS cover_image TEXT;
ALTER TABLE journeys ADD COLUMN IF NOT EXISTS location_label VARCHAR(255);
ALTER TABLE journeys ADD COLUMN IF NOT EXISTS tagline TEXT;
ALTER TABLE journeys ADD COLUMN IF NOT EXISTS long_narrative TEXT;
ALTER TABLE journeys ADD COLUMN IF NOT EXISTS hero_video TEXT;
UPDATE journeys SET cover_image = COALESCE(cover_image, featured_image_url);
UPDATE journeys SET tagline = COALESCE(tagline, title);

-- Stories
ALTER TABLE stories ADD COLUMN IF NOT EXISTS cover_image TEXT;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS excerpt TEXT;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS body TEXT;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS read_time_minutes INTEGER;
UPDATE stories SET cover_image = COALESCE(cover_image, featured_image_url);
UPDATE stories SET body = COALESCE(body, content);

-- Categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS emotional_title VARCHAR(255);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS short_intro TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS cover_image TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS color_accent VARCHAR(20);
UPDATE categories SET emotional_title = COALESCE(emotional_title, name);
UPDATE categories SET short_intro = COALESCE(short_intro, description);
UPDATE categories SET cover_image = COALESCE(cover_image, icon_url);

-- Regions
ALTER TABLE regions ADD COLUMN IF NOT EXISTS state VARCHAR(255);
ALTER TABLE regions ADD COLUMN IF NOT EXISTS emotional_label VARCHAR(255);
ALTER TABLE regions ADD COLUMN IF NOT EXISTS short_description TEXT;
ALTER TABLE regions ADD COLUMN IF NOT EXISTS cover_image TEXT;
UPDATE regions SET short_description = COALESCE(short_description, description);

-- Collections
ALTER TABLE collections ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE collections ADD COLUMN IF NOT EXISTS cover_image TEXT;
ALTER TABLE collections ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
UPDATE collections SET title = COALESCE(title, name);

-- Combos
ALTER TABLE combos ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE combos ADD COLUMN IF NOT EXISTS hero_image TEXT;
ALTER TABLE combos ADD COLUMN IF NOT EXISTS product_ids JSONB DEFAULT '[]'::jsonb;
ALTER TABLE combos ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
UPDATE combos SET title = COALESCE(title, name);
UPDATE combos SET hero_image = COALESCE(hero_image, featured_image_url);

-- Recipes
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS hero_image TEXT;
UPDATE recipes SET hero_image = COALESCE(hero_image, featured_image_url);

-- Homepage sections
ALTER TABLE homepage_sections ADD COLUMN IF NOT EXISTS subtitle TEXT;
ALTER TABLE homepage_sections ADD COLUMN IF NOT EXISTS body_text TEXT;
ALTER TABLE homepage_sections ADD COLUMN IF NOT EXISTS cta_label VARCHAR(255);
ALTER TABLE homepage_sections ADD COLUMN IF NOT EXISTS cta_url VARCHAR(500);
ALTER TABLE homepage_sections ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE homepage_sections ADD COLUMN IF NOT EXISTS media_type VARCHAR(30) DEFAULT 'image';
ALTER TABLE homepage_sections ADD COLUMN IF NOT EXISTS background_style VARCHAR(80) DEFAULT 'rain_mist';
UPDATE homepage_sections SET subtitle = COALESCE(subtitle, description);
`;

await client.connect();
await client.query(sql);
await client.end();
console.log('Phase 3 admin media compatibility columns created and backfilled.');

