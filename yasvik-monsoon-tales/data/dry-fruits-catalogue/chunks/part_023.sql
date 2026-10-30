INSERT INTO products (
  name, slug, short_description, description, local_name, category_id,
  price, stock_quantity, shared_stock_kg, stock_measure_type, quick_variants,
  is_published, sell_online, is_featured, featured_in_hero,
  storage_note, seo_title, seo_description, seo_keywords,
  ingredients, allergen_info, subject_to_availability, product_group, purity_badges,
  sku, product_code
) VALUES (
  'Sabja Seeds',
  'sabja-seeds',
  'Basil seeds traditionally soaked before being added to drinks, falooda and cooling desserts.',
  'Sabja (basil) seeds are traditionally soaked before adding to drinks, falooda and desserts. Follow your preferred recipe for soak time.

Subject to availability.',
  'తుక్మరియా / Basil Seeds',
  '7db503f0-9dc7-43ee-beca-59fa06561ced'::uuid,
  0,
  0,
  0,
  'kg',
  '[{"sku":"__yasvik_pricing__","label":"__yasvik_pricing__","notes":"{\"purchase_rate_per_kg\":null,\"pricing_band\":\"mid\",\"store_tier\":\"mid\",\"web_tier\":\"wmid\",\"selling_price_per_kg\":null,\"store_selling_price_per_kg\":null,\"price_inflate_percent\":\"30\",\"store_price_inflate_percent\":\"30\",\"small_pack_margin_rs\":\"0\",\"pack_charm_mode\":\"nine\"}"},{"sku":"YAS-DF-SABJA-100G","label":"100g","pack_kg":0.1,"price":0,"stock":0,"image_url":"","image_urls":[],"notes":"Shared bulk stock — deduct website stock from bulk inventory. Draft — set cost in Pricing Strategy before publish."},{"sku":"YAS-DF-SABJA-200G","label":"200g","pack_kg":0.2,"price":0,"stock":0,"image_url":"","image_urls":[],"notes":"Shared bulk stock — deduct website stock from bulk inventory. Draft — set cost in Pricing Strategy before publish."},{"sku":"YAS-DF-SABJA-250G","label":"250g","pack_kg":0.25,"price":0,"stock":0,"image_url":"","image_urls":[],"notes":"Shared bulk stock — deduct website stock from bulk inventory. Draft — set cost in Pricing Strategy before publish."},{"sku":"YAS-DF-SABJA-500G","label":"500g","pack_kg":0.5,"price":0,"stock":0,"image_url":"","image_urls":[],"notes":"Shared bulk stock — deduct website stock from bulk inventory. Draft — set cost in Pricing Strategy before publish."}]'::jsonb,
  false,
  false,
  false,
  false,
  'Store in a cool, dry place in an airtight container. Refrigeration is recommended after opening during warm or humid weather.',
  'Buy Sabja Seeds Online in Hyderabad | Yasvik',
  'Shop sabja (basil) seeds from Yasvik for drinks and desserts. Soak before use as per your recipe. Hyderabad delivery subject to availability.',
  'sabja, basil seeds, tukmaria, Yasvik Hyderabad',
  NULL,
  NULL,
  true,
  NULL,
  '[]'::jsonb,
  'YAS-DF-SABJA',
  'YAS-DF-SABJA'
)
ON CONFLICT (slug) DO NOTHING;
