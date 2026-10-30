INSERT INTO products (
  name, slug, short_description, description, local_name, category_id,
  price, stock_quantity, shared_stock_kg, stock_measure_type, quick_variants,
  is_published, sell_online, is_featured, featured_in_hero,
  storage_note, seo_title, seo_description, seo_keywords,
  ingredients, allergen_info, subject_to_availability, product_group, purity_badges,
  sku, product_code
) VALUES (
  'Yasvik Five Seeds Combo',
  'yasvik-five-seeds-combo',
  'One-kilogram seed assortment for breakfast bowls, mixes and regular kitchen use.',
  'One-kilogram seed assortment for breakfast bowls, mixes and regular kitchen use.

Total net weight: 1 kg
Number of items: 5

Contents:
• Pumpkin Seeds – 200 g
• Sunflower Seeds – 200 g
• Watermelon Seeds – 200 g
• Flax Seeds – 200 g
• Chia Seeds – 200 g

Contents may be packed separately when needed for freshness or packing workflow.
Suggested draft price band (not live): ₹549–₹699. Do not publish until component costs, packaging and margin are entered in Pricing Strategy.

Inventory note: this is a packaged combo SKU with its own stock — component SKUs are not auto-deducted by the current checkout architecture.
Subject to availability.',
  NULL,
  'e7a1c2d3-4b5e-6f70-8192-a3b4c5d6e706'::uuid,
  0,
  0,
  NULL,
  'units',
  '[{"sku":"__yasvik_pricing__","label":"__yasvik_pricing__","notes":"{\"purchase_rate_per_kg\":null,\"pricing_band\":\"mid\",\"store_tier\":\"mid\",\"web_tier\":\"wmid\",\"selling_price_per_kg\":null,\"store_selling_price_per_kg\":null,\"price_inflate_percent\":\"30\",\"store_price_inflate_percent\":\"30\",\"small_pack_margin_rs\":\"0\",\"pack_charm_mode\":\"nine\"}"},{"sku":"YAS-DF-C-5KG-1PACK","label":"1 pack","pack_kg":1,"price":0,"stock":0,"image_url":"","image_urls":[],"notes":"Packaged combo unit stock. Draft — set cost before publish. Components are not auto-deducted."}]'::jsonb,
  false,
  false,
  false,
  false,
  'Store in a cool, dry place in an airtight container. Refrigeration is recommended after opening during warm or humid weather.',
  'Dry Fruits and Seeds Combo Packs in Hyderabad | Yasvik',
  'Yasvik Five Seeds Combo from Yasvik — 1 kg, 5 items. Draft listing pending cost review. Hyderabad delivery subject to availability.',
  'dry fruits combo, seeds combo, Yasvik Hyderabad, gift dry fruits',
  NULL,
  NULL,
  true,
  'combo',
  '["Value Combo"]'::jsonb,
  'YAS-DF-C-5KG',
  'YAS-DF-C-5KG'
)
ON CONFLICT (slug) DO NOTHING;
