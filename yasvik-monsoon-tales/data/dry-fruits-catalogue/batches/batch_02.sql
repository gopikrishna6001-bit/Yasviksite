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

INSERT INTO products (
  name, slug, short_description, description, local_name, category_id,
  price, stock_quantity, shared_stock_kg, stock_measure_type, quick_variants,
  is_published, sell_online, is_featured, featured_in_hero,
  storage_note, seo_title, seo_description, seo_keywords,
  ingredients, allergen_info, subject_to_availability, product_group, purity_badges,
  sku, product_code
) VALUES (
  'White Sesame Seeds',
  'white-sesame-seeds',
  'Nutty white sesame seeds for chutneys, laddus, seasoning, baking and traditional cooking.',
  'White sesame seeds for chutneys, laddus, seasoning, baking and traditional cooking. A staple seed for Indian kitchens.

Note: Native Sesame Seeds may already exist elsewhere in the catalog — review before publishing both.

Subject to availability.',
  'తెల్ల నువ్వులు',
  '7db503f0-9dc7-43ee-beca-59fa06561ced'::uuid,
  0,
  0,
  0,
  'kg',
  '[{"sku":"__yasvik_pricing__","label":"__yasvik_pricing__","notes":"{\"purchase_rate_per_kg\":null,\"pricing_band\":\"mid\",\"store_tier\":\"mid\",\"web_tier\":\"wmid\",\"selling_price_per_kg\":null,\"store_selling_price_per_kg\":null,\"price_inflate_percent\":\"30\",\"store_price_inflate_percent\":\"30\",\"small_pack_margin_rs\":\"0\",\"pack_charm_mode\":\"nine\"}"},{"sku":"YAS-DF-WSES-100G","label":"100g","pack_kg":0.1,"price":0,"stock":0,"image_url":"","image_urls":[],"notes":"Shared bulk stock — deduct website stock from bulk inventory. Draft — set cost in Pricing Strategy before publish."},{"sku":"YAS-DF-WSES-200G","label":"200g","pack_kg":0.2,"price":0,"stock":0,"image_url":"","image_urls":[],"notes":"Shared bulk stock — deduct website stock from bulk inventory. Draft — set cost in Pricing Strategy before publish."},{"sku":"YAS-DF-WSES-250G","label":"250g","pack_kg":0.25,"price":0,"stock":0,"image_url":"","image_urls":[],"notes":"Shared bulk stock — deduct website stock from bulk inventory. Draft — set cost in Pricing Strategy before publish."},{"sku":"YAS-DF-WSES-500G","label":"500g","pack_kg":0.5,"price":0,"stock":0,"image_url":"","image_urls":[],"notes":"Shared bulk stock — deduct website stock from bulk inventory. Draft — set cost in Pricing Strategy before publish."}]'::jsonb,
  false,
  false,
  false,
  false,
  'Store in a cool, dry place in an airtight container. Refrigeration is recommended after opening during warm or humid weather.',
  'Buy White Sesame Seeds Online in Hyderabad | Yasvik',
  'Shop white sesame seeds from Yasvik for chutneys, laddus and cooking. Hyderabad delivery subject to availability.',
  'white sesame seeds, nuvvulu, edible seeds, Yasvik',
  NULL,
  'Contains sesame.',
  true,
  NULL,
  '[]'::jsonb,
  'YAS-DF-WSES',
  'YAS-DF-WSES'
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
  'Roasted Cashews',
  'roasted-cashews',
  'Roasted cashews with a crisp bite, suitable for serving, travel and everyday snacking.',
  'Roasted cashews for serving, travel and everyday snacking. Ingredients to be confirmed with the production batch before publishing.

Subject to availability.',
  NULL,
  'e7a1c2d3-4b5e-6f70-8192-a3b4c5d6e704'::uuid,
  0,
  0,
  0,
  'kg',
  '[{"sku":"__yasvik_pricing__","label":"__yasvik_pricing__","notes":"{\"purchase_rate_per_kg\":null,\"pricing_band\":\"mid\",\"store_tier\":\"mid\",\"web_tier\":\"wmid\",\"selling_price_per_kg\":null,\"store_selling_price_per_kg\":null,\"price_inflate_percent\":\"30\",\"store_price_inflate_percent\":\"30\",\"small_pack_margin_rs\":\"0\",\"pack_charm_mode\":\"nine\"}"},{"sku":"YAS-DF-RCSW-100G","label":"100g","pack_kg":0.1,"price":0,"stock":0,"image_url":"","image_urls":[],"notes":"Shared bulk stock — deduct website stock from bulk inventory. Draft — set cost in Pricing Strategy before publish."},{"sku":"YAS-DF-RCSW-250G","label":"250g","pack_kg":0.25,"price":0,"stock":0,"image_url":"","image_urls":[],"notes":"Shared bulk stock — deduct website stock from bulk inventory. Draft — set cost in Pricing Strategy before publish."},{"sku":"YAS-DF-RCSW-500G","label":"500g","pack_kg":0.5,"price":0,"stock":0,"image_url":"","image_urls":[],"notes":"Shared bulk stock — deduct website stock from bulk inventory. Draft — set cost in Pricing Strategy before publish."},{"sku":"YAS-DF-RCSW-1KG","label":"1kg","pack_kg":null,"price":0,"stock":0,"image_url":"","image_urls":[],"notes":"Shared bulk stock — deduct website stock from bulk inventory. Draft — set cost in Pricing Strategy before publish."}]'::jsonb,
  false,
  false,
  false,
  false,
  'Store in a cool, dry place in an airtight container. Refrigeration is recommended after opening during warm or humid weather.',
  'Buy Roasted Cashews Online in Hyderabad | Yasvik',
  'Shop roasted cashews from Yasvik for snacking and serving. Hyderabad delivery subject to availability.',
  'roasted cashews, kaju, flavoured nuts, Yasvik',
  'Cashew nuts, edible oil (to be confirmed with batch).',
  'Contains tree nuts (cashew).',
  true,
  NULL,
  '[]'::jsonb,
  'YAS-DF-RCSW',
  'YAS-DF-RCSW'
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
  'Five Seed Mix',
  'five-seed-mix',
  'A practical mix of five everyday seeds for breakfast bowls, salads, homemade granola and snack jars.',
  'Contents (equal parts unless otherwise noted on pack):
• Pumpkin Seeds
• Sunflower Seeds
• Watermelon Seeds
• Flax Seeds
• Chia Seeds

Contents may be packed separately when required for freshness. Exact blend ratios to be confirmed before publishing.

Subject to availability.',
  NULL,
  'e7a1c2d3-4b5e-6f70-8192-a3b4c5d6e705'::uuid,
  0,
  0,
  0,
  'kg',
  '[{"sku":"__yasvik_pricing__","label":"__yasvik_pricing__","notes":"{\"purchase_rate_per_kg\":null,\"pricing_band\":\"mid\",\"store_tier\":\"mid\",\"web_tier\":\"wmid\",\"selling_price_per_kg\":null,\"store_selling_price_per_kg\":null,\"price_inflate_percent\":\"30\",\"store_price_inflate_percent\":\"30\",\"small_pack_margin_rs\":\"0\",\"pack_charm_mode\":\"nine\"}"},{"sku":"YAS-DF-5SEED-250G","label":"250g","pack_kg":0.25,"price":0,"stock":0,"image_url":"","image_urls":[],"notes":"Shared bulk stock — deduct website stock from bulk inventory. Draft — set cost in Pricing Strategy before publish."},{"sku":"YAS-DF-5SEED-500G","label":"500g","pack_kg":0.5,"price":0,"stock":0,"image_url":"","image_urls":[],"notes":"Shared bulk stock — deduct website stock from bulk inventory. Draft — set cost in Pricing Strategy before publish."},{"sku":"YAS-DF-5SEED-1KG","label":"1kg","pack_kg":null,"price":0,"stock":0,"image_url":"","image_urls":[],"notes":"Shared bulk stock — deduct website stock from bulk inventory. Draft — set cost in Pricing Strategy before publish."}]'::jsonb,
  false,
  false,
  false,
  false,
  'Store in a cool, dry place in an airtight container. Refrigeration is recommended after opening during warm or humid weather.',
  'Buy Five Seed Mix Online in Hyderabad | Yasvik',
  'Shop Yasvik five seed mix for breakfast bowls, salads and snack jars. Hyderabad delivery subject to availability.',
  'five seed mix, seed mix, pumpkin sunflower flax chia, Yasvik',
  'Pumpkin seeds, sunflower seeds, watermelon seeds, flax seeds, chia seeds. Confirm proportions before publish.',
  NULL,
  true,
  'mix',
  '[]'::jsonb,
  'YAS-DF-5SEED',
  'YAS-DF-5SEED'
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

INSERT INTO products (
  name, slug, short_description, description, local_name, category_id,
  price, stock_quantity, shared_stock_kg, stock_measure_type, quick_variants,
  is_published, sell_online, is_featured, featured_in_hero,
  storage_note, seo_title, seo_description, seo_keywords,
  ingredients, allergen_info, subject_to_availability, product_group, purity_badges,
  sku, product_code
) VALUES (
  'Roasted Seed Mix',
  'roasted-seed-mix',
  'Draft roasted seed mix — ingredients and seasoning must be confirmed before publishing.',
  'Draft product only. Ingredients and seasoning must be confirmed with production before any customer-facing publish.

Subject to availability.',
  NULL,
  'e7a1c2d3-4b5e-6f70-8192-a3b4c5d6e705'::uuid,
  0,
  0,
  0,
  'kg',
  '[{"sku":"__yasvik_pricing__","label":"__yasvik_pricing__","notes":"{\"purchase_rate_per_kg\":null,\"pricing_band\":\"mid\",\"store_tier\":\"mid\",\"web_tier\":\"wmid\",\"selling_price_per_kg\":null,\"store_selling_price_per_kg\":null,\"price_inflate_percent\":\"30\",\"store_price_inflate_percent\":\"30\",\"small_pack_margin_rs\":\"0\",\"pack_charm_mode\":\"nine\"}"},{"sku":"YAS-DF-RSEED-250G","label":"250g","pack_kg":0.25,"price":0,"stock":0,"image_url":"","image_urls":[],"notes":"Shared bulk stock — deduct website stock from bulk inventory. Draft — set cost in Pricing Strategy before publish."},{"sku":"YAS-DF-RSEED-500G","label":"500g","pack_kg":0.5,"price":0,"stock":0,"image_url":"","image_urls":[],"notes":"Shared bulk stock — deduct website stock from bulk inventory. Draft — set cost in Pricing Strategy before publish."}]'::jsonb,
  false,
  false,
  false,
  false,
  'Store in a cool, dry place in an airtight container. Refrigeration is recommended after opening during warm or humid weather.',
  'Roasted Seed Mix | Yasvik (Draft)',
  'Draft roasted seed mix — seasoning pending confirmation.',
  'roasted seed mix, Yasvik',
  NULL,
  NULL,
  true,
  'mix',
  '[]'::jsonb,
  'YAS-DF-RSEED',
  'YAS-DF-RSEED'
)
ON CONFLICT (slug) DO NOTHING;