INSERT INTO products (
  name, slug, short_description, description, local_name, category_id,
  price, stock_quantity, shared_stock_kg, stock_measure_type, quick_variants,
  is_published, sell_online, is_featured, featured_in_hero,
  storage_note, seo_title, seo_description, seo_keywords,
  ingredients, allergen_info, subject_to_availability, product_group, purity_badges,
  sku, product_code
) VALUES (
  'Dates',
  'dates',
  'Everyday dates for snacking, smoothies, sweets and natural sweetness in recipes.',
  'Everyday dates for snacking, smoothies, sweets and recipes that need natural sweetness. Practical packs for regular use.

Subject to availability.',
  'ఖర్జూరం',
  'e7a1c2d3-4b5e-6f70-8192-a3b4c5d6e702'::uuid,
  0,
  0,
  0,
  'kg',
  '[{"sku":"__yasvik_pricing__","label":"__yasvik_pricing__","notes":"{\"purchase_rate_per_kg\":null,\"pricing_band\":\"mid\",\"store_tier\":\"mid\",\"web_tier\":\"wmid\",\"selling_price_per_kg\":null,\"store_selling_price_per_kg\":null,\"price_inflate_percent\":\"30\",\"store_price_inflate_percent\":\"30\",\"small_pack_margin_rs\":\"0\",\"pack_charm_mode\":\"nine\"}"},{"sku":"YAS-DF-DATES-250G","label":"250g","pack_kg":0.25,"price":0,"stock":0,"image_url":"","image_urls":[],"notes":"Shared bulk stock — deduct website stock from bulk inventory. Draft — set cost in Pricing Strategy before publish."},{"sku":"YAS-DF-DATES-500G","label":"500g","pack_kg":0.5,"price":0,"stock":0,"image_url":"","image_urls":[],"notes":"Shared bulk stock — deduct website stock from bulk inventory. Draft — set cost in Pricing Strategy before publish."},{"sku":"YAS-DF-DATES-1KG","label":"1kg","pack_kg":null,"price":0,"stock":0,"image_url":"","image_urls":[],"notes":"Shared bulk stock — deduct website stock from bulk inventory. Draft — set cost in Pricing Strategy before publish."}]'::jsonb,
  false,
  false,
  false,
  false,
  'Store in a cool, dry place in an airtight container. Refrigeration is recommended after opening during warm or humid weather.',
  'Buy Dates Online in Hyderabad | Yasvik',
  'Shop everyday dates from Yasvik for snacking, smoothies and sweets. Hyderabad delivery subject to availability.',
  'dates, khajur, dry fruits, Yasvik Hyderabad',
  NULL,
  NULL,
  true,
  NULL,
  '[]'::jsonb,
  'YAS-DF-DATES',
  'YAS-DF-DATES'
)
ON CONFLICT (slug) DO NOTHING;
