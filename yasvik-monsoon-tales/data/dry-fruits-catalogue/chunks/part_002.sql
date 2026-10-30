INSERT INTO categories (id, name, slug, emotional_title, parent_id, sort_order, is_active, short_intro, seo_title, seo_description)
VALUES
  ('e7a1c2d3-4b5e-6f70-8192-a3b4c5d6e701'::uuid, 'Dried Fruits', 'dry-fruits-dried-fruits', 'Dried Fruits', 'bdba5b32-71e3-4f05-b852-c7902860effb'::uuid, 20, true, 'Raisins, figs and other dried fruits for snacking and cooking.', 'Dried Fruits in Hyderabad | Yasvik', 'Shop dried fruits from Yasvik in Hyderabad.'),
  ('e7a1c2d3-4b5e-6f70-8192-a3b4c5d6e702'::uuid, 'Dates', 'dry-fruits-dates', 'Dates', 'bdba5b32-71e3-4f05-b852-c7902860effb'::uuid, 30, true, 'Soft and dry dates for snacking, gifting and recipes.', 'Dates in Hyderabad | Yasvik', 'Shop dates from Yasvik in Hyderabad.'),
  ('e7a1c2d3-4b5e-6f70-8192-a3b4c5d6e703'::uuid, 'Makhana', 'dry-fruits-makhana', 'Makhana', 'bdba5b32-71e3-4f05-b852-c7902860effb'::uuid, 40, true, 'Plain fox nuts for home roasting and seasoning.', 'Makhana in Hyderabad | Yasvik', 'Shop makhana from Yasvik in Hyderabad.'),
  ('e7a1c2d3-4b5e-6f70-8192-a3b4c5d6e704'::uuid, 'Flavoured & Roasted Nuts', 'dry-fruits-flavoured-roasted', 'Flavoured & Roasted Nuts', 'bdba5b32-71e3-4f05-b852-c7902860effb'::uuid, 60, true, 'Roasted and seasoned nuts for tea-time and serving.', 'Roasted & Flavoured Nuts in Hyderabad | Yasvik', 'Shop roasted and flavoured nuts from Yasvik.'),
  ('e7a1c2d3-4b5e-6f70-8192-a3b4c5d6e705'::uuid, 'Mixed Seeds & Trail Mixes', 'dry-fruits-mixed-seeds', 'Mixed Seeds & Trail Mixes', 'bdba5b32-71e3-4f05-b852-c7902860effb'::uuid, 70, true, 'Ready seed mixes for bowls and snack jars.', 'Seed Mixes in Hyderabad | Yasvik', 'Shop seed mixes from Yasvik in Hyderabad.'),
  ('e7a1c2d3-4b5e-6f70-8192-a3b4c5d6e706'::uuid, 'Dry Fruit & Seed Combos', 'dry-fruits-combos', 'Dry Fruit & Seed Combos', 'bdba5b32-71e3-4f05-b852-c7902860effb'::uuid, 80, true, 'Curated combinations packed for family and gifting use.', 'Dry Fruit Combos in Hyderabad | Yasvik', 'Shop dry fruit and seed combos from Yasvik.'),
  ('e7a1c2d3-4b5e-6f70-8192-a3b4c5d6e707'::uuid, 'Gift Boxes', 'dry-fruits-gift-boxes', 'Gift Boxes', 'bdba5b32-71e3-4f05-b852-c7902860effb'::uuid, 90, true, 'Gift-ready dry fruit selections (activate when packaging is ready).', 'Dry Fruit Gift Boxes in Hyderabad | Yasvik', 'Dry fruit gift boxes from Yasvik — coming as packaging is ready.')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  emotional_title = EXCLUDED.emotional_title,
  parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  short_intro = EXCLUDED.short_intro,
  seo_title = EXCLUDED.seo_title,
  seo_description = EXCLUDED.seo_description,
  updated_at = now();
