INSERT INTO products (
  name, slug, short_description, description, local_name, category_id,
  price, stock_quantity, shared_stock_kg, stock_measure_type, quick_variants,
  is_published, sell_online, is_featured, featured_in_hero,
  storage_note, seo_title, seo_description, seo_keywords,
  ingredients, allergen_info, subject_to_availability, product_group, purity_badges,
  sku, product_code
) VALUES (
  'Halim Seeds',
  'halim-seeds',
  'Small garden cress seeds used in selected traditional recipes, drinks and homemade preparations.',
  'Halim (garden cress / aliv) seeds for selected traditional recipes, drinks and homemade preparations. Use according to your preferred recipe and soak where appropriate.

No medicinal claims. Subject to availability.',
  'అలివ్ / Garden Cress',
  '7db503f0-9dc7-43ee-beca-59fa06561ced'::uuid,
  0,
  0,
  0,
  'kg',
  '[{"sku":"__yasvik_pricing__","label":"__yasvik_pricing__","notes":"{\"purchase_rate_per_kg\":null,\"pricing_band\":\"mid\",\"store_tier\":\"mid\",\"web_tier\":\"wmid\",\"selling_price_per_kg\":null,\"store_selling_price_per_kg\":null,\"price_inflate_percent\":\"30\",\"store_price_inflate_percent\":\"30\",\"small_pack_margin_rs\":\"0\",\"pack_charm_mode\":\"nine\"}"},{"sku":"YAS-DF-HALIM-100G","label":"100g","pack_kg":0.1,"price":0,"stock":0,"image_url":"","image_urls":[],"notes":"Shared bulk stock — deduct website stock from bulk inventory. Draft — set cost in Pricing Strategy before publish."},{"sku":"YAS-DF-HALIM-200G","label":"200g","pack_kg":0.2,"price":0,"stock":0,"image_url":"","image_urls":[],"notes":"Shared bulk stock — deduct website stock from bulk inventory. Draft — set cost in Pricing Strategy before publish."},{"sku":"YAS-DF-HALIM-250G","label":"250g","pack_kg":0.25,"price":0,"stock":0,"image_url":"","image_urls":[],"notes":"Shared bulk stock — deduct website stock from bulk inventory. Draft — set cost in Pricing Strategy before publish."}]'::jsonb,
  false,
  false,
  false,
  false,
  'Store in a cool, dry place in an airtight container. Refrigeration is recommended after opening during warm or humid weather.',
  'Buy Halim Seeds Online in Hyderabad | Yasvik',
  'Shop halim (garden cress) seeds from Yasvik for traditional recipes and drinks. Use as per your preferred recipe. Subject to availability.',
  'halim seeds, aliv, garden cress seeds, Yasvik Hyderabad',
  NULL,
  NULL,
  true,
  NULL,
  '[]'::jsonb,
  'YAS-DF-HALIM',
  'YAS-DF-HALIM'
)
ON CONFLICT (slug) DO NOTHING;
