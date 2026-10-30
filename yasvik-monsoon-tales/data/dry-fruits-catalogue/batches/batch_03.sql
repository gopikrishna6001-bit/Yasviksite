INSERT INTO products (
  name, slug, short_description, description, local_name, category_id,
  price, stock_quantity, shared_stock_kg, stock_measure_type, quick_variants,
  is_published, sell_online, is_featured, featured_in_hero,
  storage_note, seo_title, seo_description, seo_keywords,
  ingredients, allergen_info, subject_to_availability, product_group, purity_badges,
  sku, product_code
) VALUES (
  'Yasvik Everyday Dry Fruit Combo',
  'yasvik-everyday-dry-fruit-combo',
  'A simple starter selection of familiar dry fruits for everyday family snacking.',
  'A simple starter selection of familiar dry fruits for everyday family snacking.

Total net weight: 600 g
Number of items: 5

Contents:
• Almonds – 100 g
• Cashews – 100 g
• Golden Raisins – 100 g
• Dates – 200 g
• Makhana – 100 g

Contents may be packed separately when needed for freshness or packing workflow.
Suggested draft price band (not live): ₹599–₹699. Do not publish until component costs, packaging and margin are entered in Pricing Strategy.

Inventory note: this is a packaged combo SKU with its own stock — component SKUs are not auto-deducted by the current checkout architecture.
Subject to availability.',
  NULL,
  'e7a1c2d3-4b5e-6f70-8192-a3b4c5d6e706'::uuid,
  0,
  0,
  NULL,
  'units',
  '[{"sku":"__yasvik_pricing__","label":"__yasvik_pricing__","notes":"{\"purchase_rate_per_kg\":null,\"pricing_band\":\"mid\",\"store_tier\":\"mid\",\"web_tier\":\"wmid\",\"selling_price_per_kg\":null,\"store_selling_price_per_kg\":null,\"price_inflate_percent\":\"30\",\"store_price_inflate_percent\":\"30\",\"small_pack_margin_rs\":\"0\",\"pack_charm_mode\":\"nine\"}"},{"sku":"YAS-DF-C-EVDY-1PACK","label":"1 pack","pack_kg":1,"price":0,"stock":0,"image_url":"","image_urls":[],"notes":"Packaged combo unit stock. Draft — set cost before publish. Components are not auto-deducted."}]'::jsonb,
  false,
  false,
  false,
  false,
  'Store in a cool, dry place in an airtight container. Refrigeration is recommended after opening during warm or humid weather.',
  'Dry Fruits and Seeds Combo Packs in Hyderabad | Yasvik',
  'Yasvik Everyday Dry Fruit Combo from Yasvik — 600 g, 5 items. Draft listing pending cost review. Hyderabad delivery subject to availability.',
  'dry fruits combo, seeds combo, Yasvik Hyderabad, gift dry fruits',
  NULL,
  NULL,
  true,
  'combo',
  '["Value Combo"]'::jsonb,
  'YAS-DF-C-EVDY',
  'YAS-DF-C-EVDY'
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
  'Yasvik Seven Seeds & Nuts Combo',
  'yasvik-seven-superfoods-combo',
  'Seven familiar nuts, seeds and raisins packed for households that want variety without buying each item separately.',
  'Seven familiar nuts, seeds and raisins packed for households that want variety without buying each item separately.

Total net weight: 700 g
Number of items: 7

Contents:
• Almonds – 100 g
• Cashews – 100 g
• Salted Pistachios – 100 g
• Pumpkin Seeds – 100 g
• Sunflower Seeds – 100 g
• Flax Seeds – 100 g
• Black Raisins – 100 g

Contents may be packed separately when needed for freshness or packing workflow.
Suggested draft price band (not live): ₹699–₹799. Do not publish until component costs, packaging and margin are entered in Pricing Strategy.

Inventory note: this is a packaged combo SKU with its own stock — component SKUs are not auto-deducted by the current checkout architecture.
Subject to availability.',
  NULL,
  'e7a1c2d3-4b5e-6f70-8192-a3b4c5d6e706'::uuid,
  0,
  0,
  NULL,
  'units',
  '[{"sku":"__yasvik_pricing__","label":"__yasvik_pricing__","notes":"{\"purchase_rate_per_kg\":null,\"pricing_band\":\"mid\",\"store_tier\":\"mid\",\"web_tier\":\"wmid\",\"selling_price_per_kg\":null,\"store_selling_price_per_kg\":null,\"price_inflate_percent\":\"30\",\"store_price_inflate_percent\":\"30\",\"small_pack_margin_rs\":\"0\",\"pack_charm_mode\":\"nine\"}"},{"sku":"YAS-DF-C-SEVN-1PACK","label":"1 pack","pack_kg":1,"price":0,"stock":0,"image_url":"","image_urls":[],"notes":"Packaged combo unit stock. Draft — set cost before publish. Components are not auto-deducted."}]'::jsonb,
  false,
  false,
  false,
  false,
  'Store in a cool, dry place in an airtight container. Refrigeration is recommended after opening during warm or humid weather.',
  'Dry Fruits and Seeds Combo Packs in Hyderabad | Yasvik',
  'Yasvik Seven Seeds & Nuts Combo from Yasvik — 700 g, 7 items. Draft listing pending cost review. Hyderabad delivery subject to availability.',
  'dry fruits combo, seeds combo, Yasvik Hyderabad, gift dry fruits',
  NULL,
  NULL,
  true,
  'combo',
  '["Value Combo"]'::jsonb,
  'YAS-DF-C-SEVN',
  'YAS-DF-C-SEVN'
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
  'Yasvik Twelve Dry Fruit & Seeds Combo',
  'yasvik-twelve-superfoods-combo',
  'Twelve dry fruits and seeds in one curated selection for families that rotate through nuts and seeds regularly.',
  'Twelve dry fruits and seeds in one curated selection for families that rotate through nuts and seeds regularly.

Total net weight: 1.2 kg
Number of items: 12

Contents:
• Almonds – 100 g
• Cashews – 100 g
• Salted Pistachios – 100 g
• Dates – 100 g
• Black Raisins – 100 g
• Pumpkin Seeds – 100 g
• Sunflower Seeds – 100 g
• Watermelon Seeds – 100 g
• Flax Seeds – 100 g
• Chia Seeds – 100 g
• Sabja Seeds – 100 g
• White Sesame Seeds – 100 g

Contents may be packed separately when needed for freshness or packing workflow.
Suggested draft price band (not live): ₹1,099–₹1,299. Do not publish until component costs, packaging and margin are entered in Pricing Strategy.

Inventory note: this is a packaged combo SKU with its own stock — component SKUs are not auto-deducted by the current checkout architecture.
Subject to availability.',
  NULL,
  'e7a1c2d3-4b5e-6f70-8192-a3b4c5d6e706'::uuid,
  0,
  0,
  NULL,
  'units',
  '[{"sku":"__yasvik_pricing__","label":"__yasvik_pricing__","notes":"{\"purchase_rate_per_kg\":null,\"pricing_band\":\"mid\",\"store_tier\":\"mid\",\"web_tier\":\"wmid\",\"selling_price_per_kg\":null,\"store_selling_price_per_kg\":null,\"price_inflate_percent\":\"30\",\"store_price_inflate_percent\":\"30\",\"small_pack_margin_rs\":\"0\",\"pack_charm_mode\":\"nine\"}"},{"sku":"YAS-DF-C-TWLV-1PACK","label":"1 pack","pack_kg":1,"price":0,"stock":0,"image_url":"","image_urls":[],"notes":"Packaged combo unit stock. Draft — set cost before publish. Components are not auto-deducted."}]'::jsonb,
  false,
  false,
  false,
  false,
  'Store in a cool, dry place in an airtight container. Refrigeration is recommended after opening during warm or humid weather.',
  'Dry Fruits and Seeds Combo Packs in Hyderabad | Yasvik',
  'Yasvik Twelve Dry Fruit & Seeds Combo from Yasvik — 1.2 kg, 12 items. Draft listing pending cost review. Hyderabad delivery subject to availability.',
  'dry fruits combo, seeds combo, Yasvik Hyderabad, gift dry fruits',
  NULL,
  NULL,
  true,
  'combo',
  '["Value Combo"]'::jsonb,
  'YAS-DF-C-TWLV',
  'YAS-DF-C-TWLV'
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
  'Yasvik Daily Dry Fruit & Seeds Combo',
  'yasvik-daily-nutrition-combo',
  'A wide dry-fruit and seed assortment for households that want many pantry staples in one order.',
  'A wide dry-fruit and seed assortment for households that want many pantry staples in one order.

Total net weight: 1.6 kg
Number of items: 17

Contents:
• Almonds – 100 g
• Cashews – 100 g
• Salted Pistachios – 50 g
• Walnut Kernels – 50 g
• Dried Figs – 100 g
• Golden Raisins – 100 g
• Black Raisins – 100 g
• Dates – 100 g
• Makhana – 100 g
• Pumpkin Seeds – 100 g
• Sunflower Seeds – 100 g
• Watermelon Seeds – 100 g
• Flax Seeds – 100 g
• Chia Seeds – 100 g
• Sabja Seeds – 100 g
• Halim Seeds – 100 g
• White Sesame Seeds – 100 g

Contents may be packed separately when needed for freshness or packing workflow.
Suggested draft price band (not live): ₹1,299–₹1,499. Do not publish until component costs, packaging and margin are entered in Pricing Strategy.

Inventory note: this is a packaged combo SKU with its own stock — component SKUs are not auto-deducted by the current checkout architecture.
Subject to availability.',
  NULL,
  'e7a1c2d3-4b5e-6f70-8192-a3b4c5d6e706'::uuid,
  0,
  0,
  NULL,
  'units',
  '[{"sku":"__yasvik_pricing__","label":"__yasvik_pricing__","notes":"{\"purchase_rate_per_kg\":null,\"pricing_band\":\"mid\",\"store_tier\":\"mid\",\"web_tier\":\"wmid\",\"selling_price_per_kg\":null,\"store_selling_price_per_kg\":null,\"price_inflate_percent\":\"30\",\"store_price_inflate_percent\":\"30\",\"small_pack_margin_rs\":\"0\",\"pack_charm_mode\":\"nine\"}"},{"sku":"YAS-DF-C-DAILY-1PACK","label":"1 pack","pack_kg":1,"price":0,"stock":0,"image_url":"","image_urls":[],"notes":"Packaged combo unit stock. Draft — set cost before publish. Components are not auto-deducted."}]'::jsonb,
  false,
  false,
  false,
  false,
  'Store in a cool, dry place in an airtight container. Refrigeration is recommended after opening during warm or humid weather.',
  'Dry Fruits and Seeds Combo Packs in Hyderabad | Yasvik',
  'Yasvik Daily Dry Fruit & Seeds Combo from Yasvik — 1.6 kg, 17 items. Draft listing pending cost review. Hyderabad delivery subject to availability.',
  'dry fruits combo, seeds combo, Yasvik Hyderabad, gift dry fruits',
  NULL,
  NULL,
  true,
  'combo',
  '["Value Combo"]'::jsonb,
  'YAS-DF-C-DAILY',
  'YAS-DF-C-DAILY'
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
  'Yasvik Family Dry Fruit & Seeds Combo',
  'yasvik-family-dry-fruit-seeds-combo',
  'Larger family packs of nuts, dates, raisins, makhana and everyday seeds.',
  'Larger family packs of nuts, dates, raisins, makhana and everyday seeds.

Total net weight: 2.2 kg
Number of items: 10

Contents:
• Almonds – 250 g
• Cashews – 250 g
• Golden Raisins – 200 g
• Dates – 400 g
• Makhana – 100 g
• Pumpkin Seeds – 200 g
• Sunflower Seeds – 200 g
• Watermelon Seeds – 200 g
• Flax Seeds – 200 g
• Chia Seeds – 200 g

Contents may be packed separately when needed for freshness or packing workflow.
Suggested draft price band (not live): ₹1,399–₹1,699. Do not publish until component costs, packaging and margin are entered in Pricing Strategy.

Inventory note: this is a packaged combo SKU with its own stock — component SKUs are not auto-deducted by the current checkout architecture.
Subject to availability.',
  NULL,
  'e7a1c2d3-4b5e-6f70-8192-a3b4c5d6e706'::uuid,
  0,
  0,
  NULL,
  'units',
  '[{"sku":"__yasvik_pricing__","label":"__yasvik_pricing__","notes":"{\"purchase_rate_per_kg\":null,\"pricing_band\":\"mid\",\"store_tier\":\"mid\",\"web_tier\":\"wmid\",\"selling_price_per_kg\":null,\"store_selling_price_per_kg\":null,\"price_inflate_percent\":\"30\",\"store_price_inflate_percent\":\"30\",\"small_pack_margin_rs\":\"0\",\"pack_charm_mode\":\"nine\"}"},{"sku":"YAS-DF-C-FMLY-1PACK","label":"1 pack","pack_kg":1,"price":0,"stock":0,"image_url":"","image_urls":[],"notes":"Packaged combo unit stock. Draft — set cost before publish. Components are not auto-deducted."}]'::jsonb,
  false,
  false,
  false,
  false,
  'Store in a cool, dry place in an airtight container. Refrigeration is recommended after opening during warm or humid weather.',
  'Dry Fruits and Seeds Combo Packs in Hyderabad | Yasvik',
  'Yasvik Family Dry Fruit & Seeds Combo from Yasvik — 2.2 kg, 10 items. Draft listing pending cost review. Hyderabad delivery subject to availability.',
  'dry fruits combo, seeds combo, Yasvik Hyderabad, gift dry fruits',
  NULL,
  NULL,
  true,
  'combo',
  '["Value Combo"]'::jsonb,
  'YAS-DF-C-FMLY',
  'YAS-DF-C-FMLY'
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
  'Yasvik Premium Family Combo',
  'yasvik-premium-family-combo',
  'A premium dry-fruit selection for gifting and larger households. Optional seed add-on listed separately until costing is confirmed.',
  'A premium dry-fruit selection for gifting and larger households. Optional seed add-on listed separately until costing is confirmed.

Total net weight: 2.25 kg (2.75 kg with optional seed add-on)
Number of items: 8

Contents:
• Cashews – 250 g
• Almonds – 250 g
• Dried Figs – 250 g
• Salted Pistachios – 250 g
• Walnut Kernels – 250 g
• Makhana – 250 g
• Golden Raisins – 250 g
• Kimia Dates – 500 g
• Optional seed add-on: Pumpkin, Watermelon, Sunflower, Flax, Chia – 100 g each

Contents may be packed separately when needed for freshness or packing workflow.
Suggested draft price band (not live): ₹2,299–₹2,699. Do not publish until component costs, packaging and margin are entered in Pricing Strategy.

Inventory note: this is a packaged combo SKU with its own stock — component SKUs are not auto-deducted by the current checkout architecture.
Subject to availability.',
  NULL,
  'e7a1c2d3-4b5e-6f70-8192-a3b4c5d6e706'::uuid,
  0,
  0,
  NULL,
  'units',
  '[{"sku":"__yasvik_pricing__","label":"__yasvik_pricing__","notes":"{\"purchase_rate_per_kg\":null,\"pricing_band\":\"mid\",\"store_tier\":\"mid\",\"web_tier\":\"wmid\",\"selling_price_per_kg\":null,\"store_selling_price_per_kg\":null,\"price_inflate_percent\":\"30\",\"store_price_inflate_percent\":\"30\",\"small_pack_margin_rs\":\"0\",\"pack_charm_mode\":\"nine\"}"},{"sku":"YAS-DF-C-PREM-1PACK","label":"1 pack","pack_kg":1,"price":0,"stock":0,"image_url":"","image_urls":[],"notes":"Packaged combo unit stock. Draft — set cost before publish. Components are not auto-deducted."}]'::jsonb,
  false,
  false,
  false,
  false,
  'Store in a cool, dry place in an airtight container. Refrigeration is recommended after opening during warm or humid weather.',
  'Dry Fruits and Seeds Combo Packs in Hyderabad | Yasvik',
  'Yasvik Premium Family Combo from Yasvik — 2.25 kg (2.75 kg with optional seed add-on), 8 items. Draft listing pending cost review. Hyderabad delivery subject to availability.',
  'dry fruits combo, seeds combo, Yasvik Hyderabad, gift dry fruits',
  NULL,
  NULL,
  true,
  'combo',
  '["Value Combo"]'::jsonb,
  'YAS-DF-C-PREM',
  'YAS-DF-C-PREM'
)
ON CONFLICT (slug) DO NOTHING;