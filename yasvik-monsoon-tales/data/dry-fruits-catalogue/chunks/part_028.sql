INSERT INTO products (
  name, slug, short_description, description, local_name, category_id,
  price, stock_quantity, shared_stock_kg, stock_measure_type, quick_variants,
  is_published, sell_online, is_featured, featured_in_hero,
  storage_note, seo_title, seo_description, seo_keywords,
  ingredients, allergen_info, subject_to_availability, product_group, purity_badges,
  sku, product_code
) VALUES (
  'Everyday Seed Mix',
  'everyday-seed-mix',
  'Draft seed mix placeholder — activate only after exact recipe and weight proportions are confirmed.',
  'Proposed contents (not final):
Pumpkin, sunflower, watermelon, flax, chia, white sesame and sabja seeds.

Do not publish until recipe and proportions are confirmed.

Subject to availability.',
  NULL,
  'e7a1c2d3-4b5e-6f70-8192-a3b4c5d6e705'::uuid,
  0,
  0,
  0,
  'kg',
  '[{"sku":"__yasvik_pricing__","label":"__yasvik_pricing__","notes":"{\"purchase_rate_per_kg\":null,\"pricing_band\":\"mid\",\"store_tier\":\"mid\",\"web_tier\":\"wmid\",\"selling_price_per_kg\":null,\"store_selling_price_per_kg\":null,\"price_inflate_percent\":\"30\",\"store_price_inflate_percent\":\"30\",\"small_pack_margin_rs\":\"0\",\"pack_charm_mode\":\"nine\"}"},{"sku":"YAS-DF-ESEED-250G","label":"250g","pack_kg":0.25,"price":0,"stock":0,"image_url":"","image_urls":[],"notes":"Shared bulk stock — deduct website stock from bulk inventory. Draft — set cost in Pricing Strategy before publish."},{"sku":"YAS-DF-ESEED-500G","label":"500g","pack_kg":0.5,"price":0,"stock":0,"image_url":"","image_urls":[],"notes":"Shared bulk stock — deduct website stock from bulk inventory. Draft — set cost in Pricing Strategy before publish."},{"sku":"YAS-DF-ESEED-1KG","label":"1kg","pack_kg":null,"price":0,"stock":0,"image_url":"","image_urls":[],"notes":"Shared bulk stock — deduct website stock from bulk inventory. Draft — set cost in Pricing Strategy before publish."}]'::jsonb,
  false,
  false,
  false,
  false,
  'Store in a cool, dry place in an airtight container. Refrigeration is recommended after opening during warm or humid weather.',
  'Everyday Seed Mix | Yasvik (Draft)',
  'Draft Yasvik everyday seed mix — recipe pending confirmation.',
  'seed mix, Yasvik',
  NULL,
  NULL,
  true,
  'mix',
  '[]'::jsonb,
  'YAS-DF-ESEED',
  'YAS-DF-ESEED'
)
ON CONFLICT (slug) DO NOTHING;
