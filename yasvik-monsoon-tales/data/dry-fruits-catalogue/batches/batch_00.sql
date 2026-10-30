UPDATE categories SET
  name = 'Nuts',
  emotional_title = 'Nuts',
  sort_order = 10,
  is_active = true,
  updated_at = now()
WHERE id = 'c29eefa3-705b-4d61-8ecf-569996952057'::uuid;

UPDATE categories SET
  name = 'Edible Seeds',
  emotional_title = 'Edible Seeds',
  sort_order = 50,
  is_active = true,
  updated_at = now()
WHERE id = '7db503f0-9dc7-43ee-beca-59fa06561ced'::uuid;

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

UPDATE products SET name = 'Cashew Nuts', short_description = 'Creamy cashew nuts for everyday snacking, sweets, gravies and festive cooking.', description = 'Whole cashew nuts for snacking, sweets, gravies and festive cooking. Choose the pack size that matches how often your kitchen uses kaju.

Subject to availability.', storage_note = 'Store in a cool, dry place in an airtight container. Refrigeration is recommended after opening during warm or humid weather.', seo_title = 'Buy Cashew Nuts Online in Hyderabad | Yasvik', seo_description = 'Shop cashew nuts in useful pack sizes from Yasvik for snacking, sweets and cooking. Hyderabad delivery subject to availability.', seo_keywords = 'cashew, kaju, cashew nuts, nuts, dry fruits, Yasvik Hyderabad', category_id = 'c29eefa3-705b-4d61-8ecf-569996952057'::uuid, subject_to_availability = true, updated_at = now(), local_name = 'జీడిపప్పు / Kaju', allergen_info = 'Contains tree nuts (cashew).' WHERE slug = 'cashews';

UPDATE products SET name = 'Pistachios – Salted', short_description = 'Lightly salted pistachios in shell for relaxed snacking and serving guests.', description = 'Salted pistachios in shell for everyday snacking and guest trays. A savoury dry-fruit option in practical pack sizes.

Subject to availability.', storage_note = 'Store in a cool, dry place in an airtight container. Refrigeration is recommended after opening during warm or humid weather.', seo_title = 'Buy Salted Pistachios Online in Hyderabad | Yasvik', seo_description = 'Shop lightly salted pistachios in shell from Yasvik. Useful pack sizes for snacking and hosting, with Hyderabad delivery subject to availability.', seo_keywords = 'pistachio, pista, salted nuts, salted pistachios, Yasvik Hyderabad', category_id = 'c29eefa3-705b-4d61-8ecf-569996952057'::uuid, subject_to_availability = true, updated_at = now(), local_name = 'ఉప్పు పిస్తా', ingredients = 'Pistachios, salt.', allergen_info = 'Contains tree nuts (pistachio). May contain traces of other nuts.' WHERE slug = 'salted-pista';

UPDATE products SET name = 'Walnut Kernels', short_description = 'Walnut kernels with a naturally earthy flavour, suitable for snacking, baking and breakfast bowls.', description = 'Shelled walnut kernels for snacking, baking and breakfast bowls. Keep sealed and cool after opening to protect flavour.

Subject to availability.', storage_note = 'Store in a cool, dry place in an airtight container. Refrigeration is recommended after opening during warm or humid weather.', seo_title = 'Buy Walnut Kernels Online in Hyderabad | Yasvik', seo_description = 'Shop walnut kernels from Yasvik for snacking, baking and breakfast bowls. Pack sizes for Hyderabad households — subject to availability.', seo_keywords = 'walnut, akhrot, walnut kernels, nuts, Yasvik Hyderabad', category_id = 'c29eefa3-705b-4d61-8ecf-569996952057'::uuid, subject_to_availability = true, updated_at = now(), local_name = 'అఖ్రోట్ / Walnut', allergen_info = 'Contains tree nuts (walnut).' WHERE slug = 'walnuts';

UPDATE products SET name = 'Dried Figs', short_description = 'Naturally chewy dried figs for snacking, soaking, desserts and traditional preparations.', description = 'Dried figs (anjeer) with a soft, chewy bite for snacking, soaking, desserts and traditional recipes. Packed for everyday pantry use.

Subject to availability.', storage_note = 'Store in a cool, dry place in an airtight container. Refrigeration is recommended after opening during warm or humid weather.', seo_title = 'Buy Dried Figs (Anjeer) Online in Hyderabad | Yasvik', seo_description = 'Shop dried figs (anjeer) from Yasvik in useful pack sizes for snacking, soaking and desserts. Hyderabad delivery subject to availability.', seo_keywords = 'anjeer, dried figs, dried fruit, buy anjeer Hyderabad, Yasvik', category_id = 'e7a1c2d3-4b5e-6f70-8192-a3b4c5d6e701'::uuid, subject_to_availability = true, updated_at = now(), local_name = 'అంజీర్ / Anjeer', featured_image_url = NULL WHERE slug = 'anjeer-rvnea';

UPDATE products SET name = 'Golden Raisins', short_description = 'Sweet golden raisins for snacking, pulao, sweets, baking and breakfast dishes.', description = 'Golden raisins (kishmish) for snacking, pulao, sweets, baking and breakfast dishes. A familiar dry fruit in practical pack sizes.

Subject to availability.', storage_note = 'Store in a cool, dry place in an airtight container. Refrigeration is recommended after opening during warm or humid weather.', seo_title = 'Buy Golden Raisins Online in Hyderabad | Yasvik', seo_description = 'Shop golden raisins (kishmish) from Yasvik for snacking, cooking and sweets. Useful packs with Hyderabad delivery subject to availability.', seo_keywords = 'raisins, kishmish, golden raisins, green raisins, dried fruit, Yasvik', category_id = 'e7a1c2d3-4b5e-6f70-8192-a3b4c5d6e701'::uuid, subject_to_availability = true, updated_at = now(), local_name = 'కిస్మిస్ / Kishmish' WHERE slug = 'green-raisins';

UPDATE products SET name = 'Black Raisins', short_description = 'Soft, naturally sweet black raisins suited to soaking, snacking and traditional recipes.', description = 'Black raisins for soaking, snacking and traditional recipes. Soft texture with natural sweetness — choose the pack that matches how you cook.

Subject to availability.', storage_note = 'Store in a cool, dry place in an airtight container. Refrigeration is recommended after opening during warm or humid weather.', seo_title = 'Buy Black Raisins Online in Hyderabad | Yasvik', seo_description = 'Shop black raisins from Yasvik for soaking, snacking and traditional recipes. Hyderabad delivery subject to availability.', seo_keywords = 'black raisins, black kishmish, dried fruit, Yasvik Hyderabad', category_id = 'e7a1c2d3-4b5e-6f70-8192-a3b4c5d6e701'::uuid, subject_to_availability = true, updated_at = now(), local_name = 'నల్ల కిస్మిస్' WHERE slug = 'black-raisins';

UPDATE products SET name = 'Dry Dates', short_description = 'Firm dried dates traditionally used in drinks, sweets and slow-cooked preparations.', description = 'Dry dates (chuhara) with a firm texture for drinks, sweets and slow-cooked preparations. A traditional dry fruit for the pantry.

Subject to availability.', storage_note = 'Store in a cool, dry place in an airtight container. Refrigeration is recommended after opening during warm or humid weather.', seo_title = 'Buy Dry Dates (Chuhara) Online in Hyderabad | Yasvik', seo_description = 'Shop dry dates (chuhara) from Yasvik for drinks, sweets and traditional recipes. Pack sizes for Hyderabad kitchens — subject to availability.', seo_keywords = 'dry dates, chuhara, khajur, dates, Yasvik Hyderabad', category_id = 'e7a1c2d3-4b5e-6f70-8192-a3b4c5d6e702'::uuid, subject_to_availability = true, updated_at = now(), local_name = 'చుహారా / Chuhara' WHERE slug = 'dry-dates';

UPDATE products SET name = 'Fard Dates', short_description = 'Soft Fard dates for direct snacking, gifting bowls and natural sweetness in recipes.', description = 'Fard dates with a soft bite for snacking and gifting. Use as a natural sweetener in drinks and desserts when you want dates on hand.

Subject to availability.', storage_note = 'Store in a cool, dry place in an airtight container. Refrigeration is recommended after opening during warm or humid weather.', seo_title = 'Buy Fard Dates Online in Hyderabad | Yasvik', seo_description = 'Shop Fard dates from Yasvik for snacking and gifting. Useful pack sizes — Hyderabad delivery subject to availability.', seo_keywords = 'fard dates, dates, khajur, Yasvik Hyderabad', category_id = 'e7a1c2d3-4b5e-6f70-8192-a3b4c5d6e702'::uuid, subject_to_availability = true, updated_at = now(), local_name = 'ఫర్ద్ ఖర్జూరం' WHERE slug = 'fard-dates';

UPDATE products SET name = 'Pumpkin Seeds', short_description = 'Mild, crunchy pumpkin seeds for breakfast bowls, salads, baking and direct snacking.', description = 'Pumpkin seeds for breakfast bowls, salads, baking and direct snacking. Keep them sealed after opening.

Subject to availability.', storage_note = 'Store in a cool, dry place in an airtight container. Refrigeration is recommended after opening during warm or humid weather.', seo_title = 'Buy Pumpkin Seeds Online in Hyderabad | Yasvik', seo_description = 'Shop pumpkin seeds from Yasvik for bowls, salads, baking and snacking. Useful packs with Hyderabad delivery subject to availability.', seo_keywords = 'pumpkin seeds, edible seeds, Yasvik Hyderabad', category_id = '7db503f0-9dc7-43ee-beca-59fa06561ced'::uuid, subject_to_availability = true, updated_at = now(), local_name = 'గుమ్మడి గింజలు' WHERE slug = 'pumpkin-seeds';

UPDATE products SET name = 'Sunflower Seeds', short_description = 'Nutty sunflower kernels that can be added to salads, granola, bread and snack mixes.', description = 'Sunflower seed kernels for salads, granola, bread and snack mixes. A pantry seed with a mild nutty flavour.

Subject to availability.', storage_note = 'Store in a cool, dry place in an airtight container. Refrigeration is recommended after opening during warm or humid weather.', seo_title = 'Buy Sunflower Seeds Online in Hyderabad | Yasvik', seo_description = 'Shop sunflower seeds from Yasvik for salads, granola and snack mixes. Hyderabad delivery subject to availability.', seo_keywords = 'sunflower seeds, edible seeds, Yasvik Hyderabad', category_id = '7db503f0-9dc7-43ee-beca-59fa06561ced'::uuid, subject_to_availability = true, updated_at = now(), local_name = 'పొద్దుతిరుగుడు గింజలు' WHERE slug = 'sunflower-seeds';

UPDATE products SET name = 'Watermelon Seeds', short_description = 'Creamy watermelon seed kernels for snacking, sweets, seed mixes and home recipes.', description = 'Watermelon seed kernels for snacking, sweets, seed mixes and home recipes. Pack sizes suited to regular pantry use.

Subject to availability.', storage_note = 'Store in a cool, dry place in an airtight container. Refrigeration is recommended after opening during warm or humid weather.', seo_title = 'Buy Watermelon Seeds Online in Hyderabad | Yasvik', seo_description = 'Shop watermelon seeds from Yasvik for snacking, sweets and seed mixes. Hyderabad delivery subject to availability.', seo_keywords = 'watermelon seeds, edible seeds, Yasvik Hyderabad', category_id = '7db503f0-9dc7-43ee-beca-59fa06561ced'::uuid, subject_to_availability = true, updated_at = now(), local_name = 'పుచ్చకాయ గింజలు' WHERE slug = 'watermelon-seeds';

UPDATE products SET name = 'Flax Seeds', short_description = 'Whole flax seeds with a nutty flavour, suitable for roasting, grinding and adding to everyday meals.', description = 'Whole flax seeds (alsi) for roasting, grinding and adding to everyday meals. Use according to your preferred recipe.

Subject to availability.', storage_note = 'Store in a cool, dry place in an airtight container. Refrigeration is recommended after opening during warm or humid weather.', seo_title = 'Buy Flax Seeds Online in Hyderabad | Yasvik', seo_description = 'Shop flax seeds (alsi) from Yasvik for roasting, grinding and everyday meals. Pack sizes for Hyderabad kitchens — subject to availability.', seo_keywords = 'flax seeds, alsi, edible seeds, Yasvik Hyderabad', category_id = '7db503f0-9dc7-43ee-beca-59fa06561ced'::uuid, subject_to_availability = true, updated_at = now(), local_name = 'అలసి / Alsi', is_published = false, sell_online = false WHERE slug = 'flax-seeds-yas-007';

UPDATE products SET name = 'Masala Cashews', short_description = 'Crunchy cashews coated with savoury Indian-style seasoning for tea-time and party snacking.', description = 'Cashews with savoury Indian-style seasoning for tea-time and party snacking. Ingredients and allergen details are listed for this flavoured product.

Subject to availability.', storage_note = 'Store in a cool, dry place in an airtight container. Refrigeration is recommended after opening during warm or humid weather.', seo_title = 'Buy Masala Cashews Online in Hyderabad | Yasvik', seo_description = 'Shop masala cashews from Yasvik for tea-time and party snacking. Hyderabad delivery subject to availability.', seo_keywords = 'masala cashews, roasted cashews, flavoured nuts, Yasvik Hyderabad', category_id = 'e7a1c2d3-4b5e-6f70-8192-a3b4c5d6e704'::uuid, subject_to_availability = true, updated_at = now(), local_name = 'మసాలా కాజు', ingredients = 'Cashew nuts, edible oil, spices and condiments. Exact seasoning blend to be confirmed before reprinting labels.', allergen_info = 'Contains tree nuts (cashew). May contain traces of other nuts and sesame.' WHERE slug = 'cashews-fried-masala-b5nzo';