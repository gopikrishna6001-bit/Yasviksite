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
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'customer';

-- Ensure RLS enabled
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE combos ENABLE ROW LEVEL SECURITY;
ALTER TABLE combo_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_heroes ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;

-- Reset existing policies
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname='public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- Public read policies
CREATE POLICY public_read_categories ON categories FOR SELECT USING (true);
CREATE POLICY public_read_published_products ON products FOR SELECT USING (is_published = true OR auth.role() = 'authenticated');
CREATE POLICY public_read_product_images ON product_images FOR SELECT USING (true);
CREATE POLICY public_read_published_combos ON combos FOR SELECT USING (is_published = true OR auth.role() = 'authenticated');
CREATE POLICY public_read_combo_items ON combo_items FOR SELECT USING (true);
CREATE POLICY public_read_published_journeys ON journeys FOR SELECT USING (is_published = true OR auth.role() = 'authenticated');
CREATE POLICY public_read_published_stories ON stories FOR SELECT USING (is_published = true OR auth.role() = 'authenticated');
CREATE POLICY public_read_story_comments ON story_comments FOR SELECT USING (true);
CREATE POLICY public_read_published_people ON people FOR SELECT USING (is_published = true OR auth.role() = 'authenticated');
CREATE POLICY public_read_published_recipes ON recipes FOR SELECT USING (is_published = true OR auth.role() = 'authenticated');
CREATE POLICY public_read_collections ON collections FOR SELECT USING (true);
CREATE POLICY public_read_collection_items ON collection_items FOR SELECT USING (true);
CREATE POLICY public_read_regions ON regions FOR SELECT USING (true);
CREATE POLICY public_read_subscriptions ON subscriptions FOR SELECT USING (is_active = true OR auth.role() = 'authenticated');
CREATE POLICY public_read_app_settings ON app_settings FOR SELECT USING (true);
CREATE POLICY public_read_homepage_sections ON homepage_sections FOR SELECT USING (true);
CREATE POLICY public_read_page_heroes ON page_heroes FOR SELECT USING (true);
CREATE POLICY public_read_media_assets ON media_assets FOR SELECT USING (true);

-- Authenticated manage policies (admin panel bootstrap)
CREATE POLICY auth_manage_categories ON categories FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY auth_manage_products ON products FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY auth_manage_product_images ON product_images FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY auth_manage_combos ON combos FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY auth_manage_combo_items ON combo_items FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY auth_manage_journeys ON journeys FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY auth_manage_stories ON stories FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY auth_manage_story_comments ON story_comments FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY auth_manage_people ON people FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY auth_manage_recipes ON recipes FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY auth_manage_collections ON collections FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY auth_manage_collection_items ON collection_items FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY auth_manage_regions ON regions FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY auth_manage_orders ON orders FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY auth_manage_order_items ON order_items FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY auth_manage_subscriptions ON subscriptions FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY auth_manage_user_subscriptions ON user_subscriptions FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY auth_manage_reviews ON reviews FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY auth_manage_addresses ON addresses FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY auth_manage_app_settings ON app_settings FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY auth_manage_homepage_sections ON homepage_sections FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY auth_manage_page_heroes ON page_heroes FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY auth_manage_media_assets ON media_assets FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Per-user restrictions
CREATE POLICY own_profile_read ON user_profiles FOR SELECT USING (auth.uid() = id OR auth.role() = 'authenticated');
CREATE POLICY own_profile_update ON user_profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY own_profile_insert ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id OR auth.role() = 'authenticated');

CREATE POLICY own_orders_read ON orders FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'authenticated');
CREATE POLICY own_addresses_read ON addresses FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'authenticated');
CREATE POLICY own_addresses_manage ON addresses FOR ALL USING (auth.uid() = user_id OR auth.role() = 'authenticated') WITH CHECK (auth.uid() = user_id OR auth.role() = 'authenticated');

-- Storage policies reset (safe dev bootstrap)
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='storage' AND tablename='objects' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
  END LOOP;
END $$;

CREATE POLICY storage_public_read ON storage.objects FOR SELECT USING (
  bucket_id IN ('product-images','story-images','person-images','recipe-images','journey-images','media-assets')
);

CREATE POLICY storage_auth_insert_public ON storage.objects FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND bucket_id IN ('product-images','story-images','person-images','recipe-images','journey-images','media-assets')
);

CREATE POLICY storage_auth_update_public ON storage.objects FOR UPDATE USING (
  auth.role() = 'authenticated' AND bucket_id IN ('product-images','story-images','person-images','recipe-images','journey-images','media-assets')
);

CREATE POLICY storage_auth_delete_public ON storage.objects FOR DELETE USING (
  auth.role() = 'authenticated' AND bucket_id IN ('product-images','story-images','person-images','recipe-images','journey-images','media-assets')
);

CREATE POLICY storage_auth_private_rw ON storage.objects FOR ALL USING (
  auth.role() = 'authenticated' AND bucket_id IN ('user-uploads','order-receipts')
) WITH CHECK (
  auth.role() = 'authenticated' AND bucket_id IN ('user-uploads','order-receipts')
);
`;

const seed = `
INSERT INTO categories (name, slug, description, sort_order, is_active) VALUES
('Heritage Grains', 'heritage-grains', 'Traditional grains from regenerative farms', 1, true),
('Cold-Pressed Oils', 'cold-pressed-oils', 'Nutrient-dense oils made in small batches', 2, true),
('Forest Honey', 'forest-honey', 'Wild and raw honey from native landscapes', 3, true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO regions (name, code, description, sort_order) VALUES
('Western Ghats', 'WG', 'Biodiverse mountain ecosystem', 1),
('Deccan Plateau', 'DP', 'Dryland farming belt', 2)
ON CONFLICT (name) DO NOTHING;

INSERT INTO people (name, slug, bio, image_url, role, specialties, is_published, is_featured, sort_order) VALUES
('Farmer Meera', 'farmer-meera', 'Custodian of seed diversity and soil-first farming.', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&q=80', 'Farmer', 'Millets, regenerative agriculture', true, true, 1),
('Raghav Nair', 'raghav-nair', 'Small-batch producer focused on traceable ingredients.', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&q=80', 'Producer', 'Cold-pressed oils, quality control', true, true, 2)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO journeys (title, slug, description, featured_image_url, is_published, is_featured, sort_order) VALUES
('From Seed to Soil', 'from-seed-to-soil', 'How heritage seeds are selected and cultivated.', 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=900&q=80', true, true, 1),
('Oil Pressed by Hand', 'oil-pressed-by-hand', 'Traditional extraction preserving flavor and nutrition.', 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=900&q=80', true, true, 2)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (
  name, slug, description, short_description, sku, category_id, journey_id, person_id, region_id,
  price, currency, is_published, is_featured, featured_in_hero, stock_quantity, featured_image_url,
  seo_title, seo_description
)
SELECT
  'Heritage Little Millet', 'heritage-little-millet',
  'Stone-cleaned, unpolished little millet sourced from rain-fed fields.',
  'Unpolished, nutrient-rich millet',
  'YAS-MIL-001',
  c.id, j.id, p.id, r.id,
  179.00, 'INR', true, true, true, 120,
  'https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=900&q=80',
  'Heritage Little Millet | Yasvik',
  'Unpolished heritage millet from regenerative farms.'
FROM categories c, journeys j, people p, regions r
WHERE c.slug='heritage-grains' AND j.slug='from-seed-to-soil' AND p.slug='farmer-meera' AND r.code='DP'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO products (
  name, slug, description, short_description, sku, category_id, journey_id, person_id, region_id,
  price, currency, is_published, is_featured, featured_in_hero, stock_quantity, featured_image_url,
  seo_title, seo_description
)
SELECT
  'Wood-Pressed Groundnut Oil', 'wood-pressed-groundnut-oil',
  'Slow, low-heat wood-pressed oil retaining native aroma.',
  'Traditional wood-pressed oil',
  'YAS-OIL-001',
  c.id, j.id, p.id, r.id,
  399.00, 'INR', true, true, true, 60,
  'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=900&q=80',
  'Wood-Pressed Groundnut Oil | Yasvik',
  'Small-batch wood-pressed groundnut oil from trusted producers.'
FROM categories c, journeys j, people p, regions r
WHERE c.slug='cold-pressed-oils' AND j.slug='oil-pressed-by-hand' AND p.slug='raghav-nair' AND r.code='WG'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO stories (title, slug, content, journey_id, person_id, featured_image_url, is_published, is_featured, sort_order)
SELECT
  'Why Soil Texture Changes Taste',
  'why-soil-texture-changes-taste',
  'Soil is not just a medium; it is a living system that shapes nutrition, aroma, and flavor.',
  j.id,
  p.id,
  'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=900&q=80',
  true, true, 1
FROM journeys j, people p
WHERE j.slug='from-seed-to-soil' AND p.slug='farmer-meera'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO app_settings (key, value, description)
VALUES
('free_delivery_threshold', '799', 'Minimum cart value for free delivery'),
('support_whatsapp', '+919999999999', 'Primary support contact')
ON CONFLICT (key) DO NOTHING;

INSERT INTO homepage_sections (section_type, title, subtitle, content, sort_order, is_active)
VALUES
('hero', 'From Real Farms to Real Kitchens', 'Traceable ingredients, cinematic stories, and seasonal produce.', '{}', 1, true),
('products', 'Featured Picks', 'Heritage staples and everyday essentials.', '{}', 2, true)
ON CONFLICT DO NOTHING;

INSERT INTO page_heroes (page_key, title, subtitle, image_url, cta_label, cta_link, sort_order, is_active)
VALUES
('shop', 'Shop with Context', 'Every product carries the story of origin.', 'https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=1200&q=80', 'Explore Products', '/shop', 1, true),
('stories', 'Stories from the Fields', 'People, practices, and place.', 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=1200&q=80', 'Read Stories', '/stories', 1, true)
ON CONFLICT DO NOTHING;
`;

await client.connect();
await client.query(sql);
await client.query(seed);
await client.end();
console.log('Policies applied and seed data inserted.');
