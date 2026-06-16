import { Client } from 'pg';

const client = new Client({
  host: 'db.cpksnpuavywbmhrzglyh.supabase.co',
  port: 5432,
  user: 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
});

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

INSERT INTO app_settings (setting_key, setting_value, data_type, description)
VALUES
('free_delivery_threshold', '799', 'number', 'Minimum cart value for free delivery'),
('support_whatsapp', '+919999999999', 'string', 'Primary support contact')
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO homepage_sections (title, description, section_type, sort_order, is_active, content_json)
VALUES
('From Real Farms to Real Kitchens', 'Traceable ingredients, cinematic stories, and seasonal produce.', 'hero', 1, true, '{}'::jsonb),
('Featured Picks', 'Heritage staples and everyday essentials.', 'products', 2, true, '{}'::jsonb)
ON CONFLICT DO NOTHING;

INSERT INTO page_heroes (page_slug, title, subtitle, image_url, cta_text, cta_link, is_active)
VALUES
('shop', 'Shop with Context', 'Every product carries the story of origin.', 'https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=1200&q=80', 'Explore Products', '/shop', true),
('stories', 'Stories from the Fields', 'People, practices, and place.', 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=1200&q=80', 'Read Stories', '/stories', true)
ON CONFLICT DO NOTHING;
`;

await client.connect();
await client.query(seed);

const checks = ['categories','regions','people','journeys','products','stories','app_settings','homepage_sections','page_heroes'];
for (const t of checks) {
  const { rows } = await client.query(`SELECT COUNT(*)::int AS c FROM ${t}`);
  console.log(`${t}: ${rows[0].c}`);
}
await client.end();
console.log('Seed complete.');
