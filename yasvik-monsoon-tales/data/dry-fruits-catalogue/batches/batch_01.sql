UPDATE products SET name = 'Cashew Pieces', short_description = 'Broken cashew pieces for sweets, gravies and cooking where whole kernels are not required.', description = 'Cashew pieces for sweets, gravies and cooking. A practical grade when you need kaju flavour without whole kernels.

Subject to availability.', storage_note = 'Store in a cool, dry place in an airtight container. Refrigeration is recommended after opening during warm or humid weather.', seo_title = 'Buy Cashew Pieces Online in Hyderabad | Yasvik', seo_description = 'Shop cashew pieces from Yasvik for sweets and cooking. Hyderabad delivery subject to availability.', seo_keywords = 'cashew pieces, kaju, cooking cashews, Yasvik', category_id = 'c29eefa3-705b-4d61-8ecf-569996952057'::uuid, subject_to_availability = true, updated_at = now(), allergen_info = 'Contains tree nuts (cashew).' WHERE slug = 'cashews-pieces-ax2o7';

UPDATE products SET name = 'Cashew Split', short_description = 'Split cashews for sweets, garnishes and recipes that call for halved kernels.', description = 'Split cashews for sweets, garnishes and recipes that use halved kernels. Packed for kitchen use.

Subject to availability.', storage_note = 'Store in a cool, dry place in an airtight container. Refrigeration is recommended after opening during warm or humid weather.', seo_title = 'Buy Split Cashews Online in Hyderabad | Yasvik', seo_description = 'Shop split cashews from Yasvik for sweets and garnishes. Hyderabad delivery subject to availability.', seo_keywords = 'split cashews, kaju, Yasvik Hyderabad', category_id = 'c29eefa3-705b-4d61-8ecf-569996952057'::uuid, subject_to_availability = true, updated_at = now(), allergen_info = 'Contains tree nuts (cashew).' WHERE slug = 'cashews-split-avag5';

UPDATE products SET name = 'Salted Pistachios (Premium)', short_description = 'Premium-grade salted pistachios in shell for snacking and serving.', description = 'Premium salted pistachios in shell for snacking and serving guests. Subject to availability.', storage_note = 'Store in a cool, dry place in an airtight container. Refrigeration is recommended after opening during warm or humid weather.', seo_title = 'Buy Premium Salted Pistachios Online in Hyderabad | Yasvik', seo_description = 'Shop premium salted pistachios from Yasvik. Hyderabad delivery subject to availability.', seo_keywords = 'salted pista, premium pistachio, Yasvik', category_id = 'c29eefa3-705b-4d61-8ecf-569996952057'::uuid, subject_to_availability = true, updated_at = now(), ingredients = 'Pistachios, salt.', allergen_info = 'Contains tree nuts (pistachio).' WHERE slug = 'salted-pista-premium-bjn3c';

INSERT INTO products (
  name, slug, short_description, description, local_name, category_id,
  price, stock_quantity, shared_stock_kg, stock_measure_type, quick_variants,
  is_published, sell_online, is_featured, featured_in_hero,
  storage_note, seo_title, seo_description, seo_keywords,
  ingredients, allergen_info, subject_to_availability, product_group, purity_badges,
  sku, product_code
) VALUES (
  'Kimia Dates',
  'kimia-dates',
  'Soft Kimia dates with a rich, caramel-like sweetness for direct snacking and gifting.',
  'Soft Kimia dates for direct snacking and gifting bowls. A richer date option for households that prefer a softer texture.

Subject to availability.',
  NULL,
  'e7a1c2d3-4b5e-6f70-8192-a3b4c5d6e702'::uuid,
  0,
  0,
  0,
  'kg',
  '[{"sku":"__yasvik_pricing__","label":"__yasvik_pricing__","notes":"{\"purchase_rate_per_kg\":null,\"pricing_band\":\"mid\",\"store_tier\":\"mid\",\"web_tier\":\"wmid\",\"selling_price_per_kg\":null,\"store_selling_price_per_kg\":null,\"price_inflate_percent\":\"30\",\"store_price_inflate_percent\":\"30\",\"small_pack_margin_rs\":\"0\",\"pack_charm_mode\":\"nine\"}"},{"sku":"YAS-DF-KIMIA-250G","label":"250g","pack_kg":0.25,"price":0,"stock":0,"image_url":"","image_urls":[],"notes":"Shared bulk stock — deduct website stock from bulk inventory. Draft — set cost in Pricing Strategy before publish."},{"sku":"YAS-DF-KIMIA-500G","label":"500g","pack_kg":0.5,"price":0,"stock":0,"image_url":"","image_urls":[],"notes":"Shared bulk stock — deduct website stock from bulk inventory. Draft — set cost in Pricing Strategy before publish."},{"sku":"YAS-DF-KIMIA-1KG","label":"1kg","pack_kg":null,"price":0,"stock":0,"image_url":"","image_urls":[],"notes":"Shared bulk stock — deduct website stock from bulk inventory. Draft — set cost in Pricing Strategy before publish."}]'::jsonb,
  false,
  false,
  false,
  false,
  'Store in a cool, dry place in an airtight container. Refrigeration is recommended after opening during warm or humid weather.',
  'Buy Kimia Dates Online in Hyderabad | Yasvik',
  'Shop Kimia dates from Yasvik for snacking and gifting. Useful pack sizes — Hyderabad delivery subject to availability.',
  'kimia dates, dates, khajur, Yasvik Hyderabad',
  NULL,
  NULL,
  true,
  NULL,
  '[]'::jsonb,
  'YAS-DF-KIMIA',
  'YAS-DF-KIMIA'
)
ON CONFLICT (slug) DO NOTHING;

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

INSERT INTO products (
  name, slug, short_description, description, local_name, category_id,
  price, stock_quantity, shared_stock_kg, stock_measure_type, quick_variants,
  is_published, sell_online, is_featured, featured_in_hero,
  storage_note, seo_title, seo_description, seo_keywords,
  ingredients, allergen_info, subject_to_availability, product_group, purity_badges,
  sku, product_code
) VALUES (
  'Chia Seeds',
  'chia-seeds',
  'Tiny absorbent seeds commonly used in soaked drinks, puddings, smoothies and breakfast bowls.',
  'Chia seeds for soaked drinks, puddings, smoothies and breakfast bowls. Soak before use when your recipe calls for it.

Subject to availability.',
  NULL,
  '7db503f0-9dc7-43ee-beca-59fa06561ced'::uuid,
  0,
  0,
  0,
  'kg',
  '[{"sku":"__yasvik_pricing__","label":"__yasvik_pricing__","notes":"{\"purchase_rate_per_kg\":null,\"pricing_band\":\"mid\",\"store_tier\":\"mid\",\"web_tier\":\"wmid\",\"selling_price_per_kg\":null,\"store_selling_price_per_kg\":null,\"price_inflate_percent\":\"30\",\"store_price_inflate_percent\":\"30\",\"small_pack_margin_rs\":\"0\",\"pack_charm_mode\":\"nine\"}"},{"sku":"YAS-DF-CHIA-100G","label":"100g","pack_kg":0.1,"price":0,"stock":0,"image_url":"","image_urls":[],"notes":"Shared bulk stock — deduct website stock from bulk inventory. Draft — set cost in Pricing Strategy before publish."},{"sku":"YAS-DF-CHIA-200G","label":"200g","pack_kg":0.2,"price":0,"stock":0,"image_url":"","image_urls":[],"notes":"Shared bulk stock — deduct website stock from bulk inventory. Draft — set cost in Pricing Strategy before publish."},{"sku":"YAS-DF-CHIA-250G","label":"250g","pack_kg":0.25,"price":0,"stock":0,"image_url":"","image_urls":[],"notes":"Shared bulk stock — deduct website stock from bulk inventory. Draft — set cost in Pricing Strategy before publish."},{"sku":"YAS-DF-CHIA-500G","label":"500g","pack_kg":0.5,"price":0,"stock":0,"image_url":"","image_urls":[],"notes":"Shared bulk stock — deduct website stock from bulk inventory. Draft — set cost in Pricing Strategy before publish."}]'::jsonb,
  false,
  false,
  false,
  false,
  'Store in a cool, dry place in an airtight container. Refrigeration is recommended after opening during warm or humid weather.',
  'Buy Chia Seeds Online in Hyderabad | Yasvik',
  'Shop chia seeds from Yasvik for soaked drinks, puddings and breakfast bowls. Hyderabad delivery subject to availability.',
  'chia seeds, edible seeds, Yasvik Hyderabad',
  NULL,
  NULL,
  true,
  NULL,
  '[]'::jsonb,
  'YAS-DF-CHIA',
  'YAS-DF-CHIA'
)
ON CONFLICT (slug) DO NOTHING;

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