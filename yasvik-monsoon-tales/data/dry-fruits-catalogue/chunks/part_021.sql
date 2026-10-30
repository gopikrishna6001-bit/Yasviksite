INSERT INTO products (
  name, slug, short_description, description, local_name, category_id,
  price, stock_quantity, shared_stock_kg, stock_measure_type, quick_variants,
  is_published, sell_online, is_featured, featured_in_hero,
  storage_note, seo_title, seo_description, seo_keywords,
  ingredients, allergen_info, subject_to_availability, product_group, purity_badges,
  sku, product_code
) VALUES (
  'Makhana',
  'makhana',
  'Light fox nuts suitable for roasting at home with spices, ghee or seasoning.',
  'Plain makhana (fox nuts) for roasting at home with spices, ghee or seasoning. A light pantry snack base in useful pack sizes.

Subject to availability.',
  'ఫాక్స్ నట్స్ / Fox Nuts',
  'e7a1c2d3-4b5e-6f70-8192-a3b4c5d6e703'::uuid,
  0,
  0,
  0,
  'kg',
  '[{"sku":"__yasvik_pricing__","label":"__yasvik_pricing__","notes":"{\"purchase_rate_per_kg\":null,\"pricing_band\":\"mid\",\"store_tier\":\"mid\",\"web_tier\":\"wmid\",\"selling_price_per_kg\":null,\"store_selling_price_per_kg\":null,\"price_inflate_percent\":\"30\",\"store_price_inflate_percent\":\"30\",\"small_pack_margin_rs\":\"0\",\"pack_charm_mode\":\"nine\"}"},{"sku":"YAS-DF-MAKH-50G","label":"50g","pack_kg":0.05,"price":0,"stock":0,"image_url":"","image_urls":[],"notes":"Shared bulk stock — deduct website stock from bulk inventory. Draft — set cost in Pricing Strategy before publish."},{"sku":"YAS-DF-MAKH-100G","label":"100g","pack_kg":0.1,"price":0,"stock":0,"image_url":"","image_urls":[],"notes":"Shared bulk stock — deduct website stock from bulk inventory. Draft — set cost in Pricing Strategy before publish."},{"sku":"YAS-DF-MAKH-250G","label":"250g","pack_kg":0.25,"price":0,"stock":0,"image_url":"","image_urls":[],"notes":"Shared bulk stock — deduct website stock from bulk inventory. Draft — set cost in Pricing Strategy before publish."},{"sku":"YAS-DF-MAKH-500G","label":"500g","pack_kg":0.5,"price":0,"stock":0,"image_url":"","image_urls":[],"notes":"Shared bulk stock — deduct website stock from bulk inventory. Draft — set cost in Pricing Strategy before publish."}]'::jsonb,
  false,
  false,
  false,
  false,
  'Store in a cool, dry place in an airtight container. Refrigeration is recommended after opening during warm or humid weather.',
  'Buy Makhana (Fox Nuts) Online in Hyderabad | Yasvik',
  'Shop plain makhana from Yasvik for home roasting and seasoning. Hyderabad delivery subject to availability.',
  'makhana, fox nuts, Yasvik Hyderabad',
  NULL,
  NULL,
  true,
  NULL,
  '[]'::jsonb,
  'YAS-DF-MAKH',
  'YAS-DF-MAKH'
)
ON CONFLICT (slug) DO NOTHING;
