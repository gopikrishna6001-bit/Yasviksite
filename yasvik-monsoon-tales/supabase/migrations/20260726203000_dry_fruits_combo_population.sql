-- Dry-fruit combo population from supplier catalogue contents.
-- Source of truth: yasvik-monsoon-tales/data/dry-fruits-catalogue/chunks/part_030–038.sql
-- Does NOT create products, change prices/stock/SEO/images, or publish.

-- ─── 1) Ensure parents classified as packaged combos (remain unpublished) ────
UPDATE products SET
  product_kind = 'bundle_combo',
  composition_status = 'n_a',
  product_group = 'packaged_combo',
  inventory_mode = 'prepacked_stock',
  is_published = false,
  sell_online = false,
  updated_at = now()
WHERE slug IN (
  'yasvik-everyday-dry-fruit-combo',
  'yasvik-seven-superfoods-combo',
  'yasvik-five-seeds-combo',
  'yasvik-family-dry-fruit-seeds-combo',
  'yasvik-premium-family-combo',
  'yasvik-twelve-superfoods-combo',
  'yasvik-daily-nutrition-combo',
  'yasvik-kids-snack-combo',
  'yasvik-office-snack-combo'
);

-- ─── 2) Upsert all nine combo bundle parents ─────────────────────────────────
INSERT INTO public.product_bundles (
  id, bundle_name, bundle_slug, bundle_description, bundle_type,
  display_locations, is_active, sort_order, parent_product_id,
  bundle_status, inventory_mode, packaging_mode, substitution_policy,
  total_net_weight_g, item_count, outer_packaging_cost_paise,
  has_unresolved_components, mapping_notes
)
SELECT
  v.id::uuid,
  v.bundle_name,
  v.bundle_slug,
  v.bundle_description,
  'bundle_combo',
  ARRAY['product', 'category']::text[],
  true,
  v.sort_order,
  p.id,
  'draft',
  'prepacked_stock',
  'separately_packed',
  'If a listed item is temporarily unavailable, Yasvik may substitute with an equivalent grade of the same product type after confirming with you where required.',
  v.total_net_weight_g,
  v.item_count,
  0,
  false,
  v.mapping_notes
FROM (
  VALUES
    (
      'e8b10001-a111-4111-8111-000000000001',
      'Yasvik Everyday Dry Fruit Combo',
      'yasvik-everyday-dry-fruit-combo',
      'Separately packed everyday dry fruits and makhana.',
      10, 600::numeric, 5,
      'Populated from supplier catalogue: Almonds 100g, Cashews 100g, Golden Raisins 100g, Dates 200g, Makhana 100g.',
      'yasvik-everyday-dry-fruit-combo'
    ),
    (
      'e8b10001-a111-4111-8111-000000000002',
      'Yasvik Seven Seeds & Nuts Combo',
      'yasvik-seven-superfoods-combo',
      'Seven separately packed nuts, seeds and raisins.',
      20, 700::numeric, 7,
      'Populated from supplier catalogue (Seven Seeds & Nuts).',
      'yasvik-seven-superfoods-combo'
    ),
    (
      'e8b10001-a111-4111-8111-000000000003',
      'Yasvik Five Seeds Combo',
      'yasvik-five-seeds-combo',
      'Five seeds assortment from supplier catalogue (1 kg).',
      30, 1000::numeric, 5,
      'Populated from supplier catalogue contents (Pumpkin/Sunflower/Watermelon/Flax/Chia @ 200g). Packaging format (separate packs vs mixed pouch) still confirm before publish; contents now linked.',
      'yasvik-five-seeds-combo'
    ),
    (
      'e8b10001-a111-4111-8111-000000000004',
      'Yasvik Family Dry Fruit & Seeds Combo',
      'yasvik-family-dry-fruit-seeds-combo',
      'Family assortment of separately packed dry fruits and seeds.',
      40, 2200::numeric, 10,
      'Populated from supplier catalogue. Dates mapped to Regular Dates (slug dates) @ 400g.',
      'yasvik-family-dry-fruit-seeds-combo'
    ),
    (
      'e8b10001-a111-4111-8111-000000000005',
      'Yasvik Premium Family Combo',
      'yasvik-premium-family-combo',
      'Premium separately packed dry fruits. Optional seed add-on excluded until costing approved.',
      50, 2250::numeric, 8,
      'Populated from supplier catalogue core 8 items. Optional 100g×5 seed add-on NOT included (not inventing optional lines into sellable BOM).',
      'yasvik-premium-family-combo'
    ),
    (
      'e8b10001-a111-4111-8111-000000000006',
      'Yasvik Twelve Dry Fruit & Seeds Combo',
      'yasvik-twelve-superfoods-combo',
      'Twelve dry fruits and seeds from supplier catalogue.',
      60, 1200::numeric, 12,
      'Populated from supplier catalogue (Twelve Dry Fruit & Seeds).',
      'yasvik-twelve-superfoods-combo'
    ),
    (
      'e8b10001-a111-4111-8111-000000000007',
      'Yasvik Daily Dry Fruit & Seeds Combo',
      'yasvik-daily-nutrition-combo',
      'Seventeen-item dry fruit and seed assortment from supplier catalogue.',
      70, 1600::numeric, 17,
      'Populated from supplier catalogue (Daily / 17 items). No separate 20-item SKU exists in catalogue.',
      'yasvik-daily-nutrition-combo'
    ),
    (
      'e8b10001-a111-4111-8111-000000000008',
      'Yasvik Kids Snack Combo',
      'yasvik-kids-snack-combo',
      'Kids snack dry-fruit selection from supplier catalogue.',
      80, 600::numeric, 5,
      'Populated from supplier catalogue (same composition family as Everyday).',
      'yasvik-kids-snack-combo'
    ),
    (
      'e8b10001-a111-4111-8111-000000000009',
      'Yasvik Office Snack Combo',
      'yasvik-office-snack-combo',
      'Office snack dry-fruit selection from supplier catalogue.',
      90, 500::numeric, 5,
      'Populated from supplier catalogue.',
      'yasvik-office-snack-combo'
    )
) AS v(
  id, bundle_name, bundle_slug, bundle_description,
  sort_order, total_net_weight_g, item_count, mapping_notes, parent_slug
)
JOIN products p ON p.slug = v.parent_slug
ON CONFLICT (id) DO UPDATE SET
  bundle_name = EXCLUDED.bundle_name,
  bundle_slug = EXCLUDED.bundle_slug,
  bundle_description = EXCLUDED.bundle_description,
  sort_order = EXCLUDED.sort_order,
  parent_product_id = EXCLUDED.parent_product_id,
  bundle_status = 'draft',
  inventory_mode = 'prepacked_stock',
  packaging_mode = 'separately_packed',
  substitution_policy = EXCLUDED.substitution_policy,
  total_net_weight_g = EXCLUDED.total_net_weight_g,
  item_count = EXCLUDED.item_count,
  has_unresolved_components = false,
  mapping_notes = EXCLUDED.mapping_notes,
  is_active = true,
  updated_at = now();

UPDATE products p
SET
  bundle_id = b.id,
  updated_at = now()
FROM product_bundles b
WHERE b.parent_product_id = p.id
  AND p.slug IN (
    'yasvik-everyday-dry-fruit-combo',
    'yasvik-seven-superfoods-combo',
    'yasvik-five-seeds-combo',
    'yasvik-family-dry-fruit-seeds-combo',
    'yasvik-premium-family-combo',
    'yasvik-twelve-superfoods-combo',
    'yasvik-daily-nutrition-combo',
    'yasvik-kids-snack-combo',
    'yasvik-office-snack-combo'
  );

-- ─── 3) Replace all bundle items from supplier compositions ──────────────────
DELETE FROM product_bundle_items
WHERE bundle_id IN (
  'e8b10001-a111-4111-8111-000000000001'::uuid,
  'e8b10001-a111-4111-8111-000000000002'::uuid,
  'e8b10001-a111-4111-8111-000000000003'::uuid,
  'e8b10001-a111-4111-8111-000000000004'::uuid,
  'e8b10001-a111-4111-8111-000000000005'::uuid,
  'e8b10001-a111-4111-8111-000000000006'::uuid,
  'e8b10001-a111-4111-8111-000000000007'::uuid,
  'e8b10001-a111-4111-8111-000000000008'::uuid,
  'e8b10001-a111-4111-8111-000000000009'::uuid
);

INSERT INTO product_bundle_items (
  bundle_id, product_id, sort_order, is_required,
  component_variant_sku, component_title_snapshot,
  quantity_value, quantity_unit, pack_count, substitution_allowed, is_active
)
SELECT
  x.bundle_id::uuid,
  c.id,
  x.sort_order,
  true,
  x.variant_sku,
  c.name,
  x.qty,
  'g',
  1,
  x.sub_ok,
  true
FROM (
  VALUES
    -- Everyday (600 g / 5)
    ('e8b10001-a111-4111-8111-000000000001', 'badam-almonds', 1, 100::numeric, 'YAS-PREMIUMB-TWFYF-100G', false),
    ('e8b10001-a111-4111-8111-000000000001', 'cashews', 2, 100::numeric, 'YAS-PREMIUMC-100G', false),
    ('e8b10001-a111-4111-8111-000000000001', 'green-raisins', 3, 100::numeric, 'YAS-034-100G', false),
    ('e8b10001-a111-4111-8111-000000000001', 'dates', 4, 200::numeric, NULL, true),
    ('e8b10001-a111-4111-8111-000000000001', 'makhana', 5, 100::numeric, 'YAS-DF-MAKH-100G', false),

    -- Seven (700 g / 7)
    ('e8b10001-a111-4111-8111-000000000002', 'badam-almonds', 1, 100::numeric, 'YAS-PREMIUMB-TWFYF-100G', false),
    ('e8b10001-a111-4111-8111-000000000002', 'cashews', 2, 100::numeric, 'YAS-PREMIUMC-100G', false),
    ('e8b10001-a111-4111-8111-000000000002', 'salted-pista', 3, 100::numeric, NULL, false),
    ('e8b10001-a111-4111-8111-000000000002', 'pumpkin-seeds', 4, 100::numeric, NULL, false),
    ('e8b10001-a111-4111-8111-000000000002', 'sunflower-seeds', 5, 100::numeric, NULL, false),
    ('e8b10001-a111-4111-8111-000000000002', 'flax-seeds-yas-007', 6, 100::numeric, NULL, false),
    ('e8b10001-a111-4111-8111-000000000002', 'black-raisins', 7, 100::numeric, NULL, false),

    -- Five Seeds (1000 g / 5) — supplier catalogue contents
    ('e8b10001-a111-4111-8111-000000000003', 'pumpkin-seeds', 1, 200::numeric, NULL, false),
    ('e8b10001-a111-4111-8111-000000000003', 'sunflower-seeds', 2, 200::numeric, NULL, false),
    ('e8b10001-a111-4111-8111-000000000003', 'watermelon-seeds', 3, 200::numeric, NULL, false),
    ('e8b10001-a111-4111-8111-000000000003', 'flax-seeds-yas-007', 4, 200::numeric, NULL, false),
    ('e8b10001-a111-4111-8111-000000000003', 'chia-seeds', 5, 200::numeric, NULL, false),

    -- Family (2200 g / 10)
    ('e8b10001-a111-4111-8111-000000000004', 'badam-almonds', 1, 250::numeric, 'YAS-PREMIUMB-TWFYF-250G', false),
    ('e8b10001-a111-4111-8111-000000000004', 'cashews', 2, 250::numeric, 'YAS-PREMIUMC-250G', false),
    ('e8b10001-a111-4111-8111-000000000004', 'green-raisins', 3, 200::numeric, NULL, false),
    ('e8b10001-a111-4111-8111-000000000004', 'dates', 4, 400::numeric, NULL, true),
    ('e8b10001-a111-4111-8111-000000000004', 'makhana', 5, 100::numeric, 'YAS-DF-MAKH-100G', false),
    ('e8b10001-a111-4111-8111-000000000004', 'pumpkin-seeds', 6, 200::numeric, NULL, false),
    ('e8b10001-a111-4111-8111-000000000004', 'sunflower-seeds', 7, 200::numeric, NULL, false),
    ('e8b10001-a111-4111-8111-000000000004', 'watermelon-seeds', 8, 200::numeric, NULL, false),
    ('e8b10001-a111-4111-8111-000000000004', 'flax-seeds-yas-007', 9, 200::numeric, NULL, false),
    ('e8b10001-a111-4111-8111-000000000004', 'chia-seeds', 10, 200::numeric, NULL, false),

    -- Premium core (2250 g / 8) — optional seed add-on excluded
    ('e8b10001-a111-4111-8111-000000000005', 'cashews', 1, 250::numeric, 'YAS-PREMIUMC-250G', false),
    ('e8b10001-a111-4111-8111-000000000005', 'badam-almonds', 2, 250::numeric, 'YAS-PREMIUMB-TWFYF-250G', false),
    ('e8b10001-a111-4111-8111-000000000005', 'anjeer-rvnea', 3, 250::numeric, NULL, false),
    ('e8b10001-a111-4111-8111-000000000005', 'salted-pista', 4, 250::numeric, NULL, false),
    ('e8b10001-a111-4111-8111-000000000005', 'walnuts', 5, 250::numeric, NULL, false),
    ('e8b10001-a111-4111-8111-000000000005', 'makhana', 6, 250::numeric, 'YAS-DF-MAKH-250G', false),
    ('e8b10001-a111-4111-8111-000000000005', 'green-raisins', 7, 250::numeric, 'YAS-034-250G', false),
    ('e8b10001-a111-4111-8111-000000000005', 'kimia-dates', 8, 500::numeric, 'YAS-DF-KIMIA-500G', false),

    -- Twelve (1200 g / 12)
    ('e8b10001-a111-4111-8111-000000000006', 'badam-almonds', 1, 100::numeric, 'YAS-PREMIUMB-TWFYF-100G', false),
    ('e8b10001-a111-4111-8111-000000000006', 'cashews', 2, 100::numeric, 'YAS-PREMIUMC-100G', false),
    ('e8b10001-a111-4111-8111-000000000006', 'salted-pista', 3, 100::numeric, NULL, false),
    ('e8b10001-a111-4111-8111-000000000006', 'dates', 4, 100::numeric, NULL, true),
    ('e8b10001-a111-4111-8111-000000000006', 'black-raisins', 5, 100::numeric, NULL, false),
    ('e8b10001-a111-4111-8111-000000000006', 'pumpkin-seeds', 6, 100::numeric, NULL, false),
    ('e8b10001-a111-4111-8111-000000000006', 'sunflower-seeds', 7, 100::numeric, NULL, false),
    ('e8b10001-a111-4111-8111-000000000006', 'watermelon-seeds', 8, 100::numeric, NULL, false),
    ('e8b10001-a111-4111-8111-000000000006', 'flax-seeds-yas-007', 9, 100::numeric, NULL, false),
    ('e8b10001-a111-4111-8111-000000000006', 'chia-seeds', 10, 100::numeric, NULL, false),
    ('e8b10001-a111-4111-8111-000000000006', 'sabja-seeds', 11, 100::numeric, NULL, false),
    ('e8b10001-a111-4111-8111-000000000006', 'white-sesame-seeds', 12, 100::numeric, NULL, false),

    -- Daily / 17 items (1600 g)
    ('e8b10001-a111-4111-8111-000000000007', 'badam-almonds', 1, 100::numeric, 'YAS-PREMIUMB-TWFYF-100G', false),
    ('e8b10001-a111-4111-8111-000000000007', 'cashews', 2, 100::numeric, 'YAS-PREMIUMC-100G', false),
    ('e8b10001-a111-4111-8111-000000000007', 'salted-pista', 3, 50::numeric, NULL, false),
    ('e8b10001-a111-4111-8111-000000000007', 'walnuts', 4, 50::numeric, NULL, false),
    ('e8b10001-a111-4111-8111-000000000007', 'anjeer-rvnea', 5, 100::numeric, NULL, false),
    ('e8b10001-a111-4111-8111-000000000007', 'green-raisins', 6, 100::numeric, 'YAS-034-100G', false),
    ('e8b10001-a111-4111-8111-000000000007', 'black-raisins', 7, 100::numeric, NULL, false),
    ('e8b10001-a111-4111-8111-000000000007', 'dates', 8, 100::numeric, NULL, true),
    ('e8b10001-a111-4111-8111-000000000007', 'makhana', 9, 100::numeric, 'YAS-DF-MAKH-100G', false),
    ('e8b10001-a111-4111-8111-000000000007', 'pumpkin-seeds', 10, 100::numeric, NULL, false),
    ('e8b10001-a111-4111-8111-000000000007', 'sunflower-seeds', 11, 100::numeric, NULL, false),
    ('e8b10001-a111-4111-8111-000000000007', 'watermelon-seeds', 12, 100::numeric, NULL, false),
    ('e8b10001-a111-4111-8111-000000000007', 'flax-seeds-yas-007', 13, 100::numeric, NULL, false),
    ('e8b10001-a111-4111-8111-000000000007', 'chia-seeds', 14, 100::numeric, NULL, false),
    ('e8b10001-a111-4111-8111-000000000007', 'sabja-seeds', 15, 100::numeric, NULL, false),
    ('e8b10001-a111-4111-8111-000000000007', 'halim-seeds', 16, 100::numeric, NULL, false),
    ('e8b10001-a111-4111-8111-000000000007', 'white-sesame-seeds', 17, 100::numeric, NULL, false),

    -- Kids (600 g / 5)
    ('e8b10001-a111-4111-8111-000000000008', 'badam-almonds', 1, 100::numeric, 'YAS-PREMIUMB-TWFYF-100G', false),
    ('e8b10001-a111-4111-8111-000000000008', 'cashews', 2, 100::numeric, 'YAS-PREMIUMC-100G', false),
    ('e8b10001-a111-4111-8111-000000000008', 'green-raisins', 3, 100::numeric, 'YAS-034-100G', false),
    ('e8b10001-a111-4111-8111-000000000008', 'dates', 4, 200::numeric, NULL, true),
    ('e8b10001-a111-4111-8111-000000000008', 'makhana', 5, 100::numeric, 'YAS-DF-MAKH-100G', false),

    -- Office (500 g / 5)
    ('e8b10001-a111-4111-8111-000000000009', 'badam-almonds', 1, 100::numeric, 'YAS-PREMIUMB-TWFYF-100G', false),
    ('e8b10001-a111-4111-8111-000000000009', 'cashews', 2, 100::numeric, 'YAS-PREMIUMC-100G', false),
    ('e8b10001-a111-4111-8111-000000000009', 'salted-pista', 3, 100::numeric, NULL, false),
    ('e8b10001-a111-4111-8111-000000000009', 'green-raisins', 4, 100::numeric, 'YAS-034-100G', false),
    ('e8b10001-a111-4111-8111-000000000009', 'dates', 5, 100::numeric, NULL, true)
) AS x(bundle_id, component_slug, sort_order, qty, variant_sku, sub_ok)
JOIN products c ON c.slug = x.component_slug;

-- ─── 4) Recompute item_count / weight from linked items ──────────────────────
UPDATE product_bundles b
SET
  item_count = sub.cnt,
  total_net_weight_g = sub.weight_g,
  has_unresolved_components = false,
  bundle_status = 'draft',
  packaging_mode = 'separately_packed',
  updated_at = now()
FROM (
  SELECT
    bundle_id,
    count(*)::integer AS cnt,
    coalesce(sum(
      CASE
        WHEN quantity_unit = 'kg' THEN quantity_value * 1000 * pack_count
        WHEN quantity_unit = 'g' THEN quantity_value * pack_count
        ELSE 0
      END
    ), 0) AS weight_g
  FROM product_bundle_items
  WHERE is_active IS DISTINCT FROM false
    AND bundle_id IN (
      'e8b10001-a111-4111-8111-000000000001'::uuid,
      'e8b10001-a111-4111-8111-000000000002'::uuid,
      'e8b10001-a111-4111-8111-000000000003'::uuid,
      'e8b10001-a111-4111-8111-000000000004'::uuid,
      'e8b10001-a111-4111-8111-000000000005'::uuid,
      'e8b10001-a111-4111-8111-000000000006'::uuid,
      'e8b10001-a111-4111-8111-000000000007'::uuid,
      'e8b10001-a111-4111-8111-000000000008'::uuid,
      'e8b10001-a111-4111-8111-000000000009'::uuid
    )
  GROUP BY bundle_id
) sub
WHERE b.id = sub.bundle_id;

UPDATE products p
SET
  bundle_item_count = b.item_count,
  bundle_net_weight_g = b.total_net_weight_g,
  updated_at = now()
FROM product_bundles b
WHERE b.parent_product_id = p.id
  AND p.slug IN (
    'yasvik-everyday-dry-fruit-combo',
    'yasvik-seven-superfoods-combo',
    'yasvik-five-seeds-combo',
    'yasvik-family-dry-fruit-seeds-combo',
    'yasvik-premium-family-combo',
    'yasvik-twelve-superfoods-combo',
    'yasvik-daily-nutrition-combo',
    'yasvik-kids-snack-combo',
    'yasvik-office-snack-combo'
  );

-- Safety: never publish combo parents via this script.
UPDATE products SET
  is_published = false,
  sell_online = false,
  updated_at = now()
WHERE slug IN (
  'yasvik-everyday-dry-fruit-combo',
  'yasvik-seven-superfoods-combo',
  'yasvik-five-seeds-combo',
  'yasvik-family-dry-fruit-seeds-combo',
  'yasvik-premium-family-combo',
  'yasvik-twelve-superfoods-combo',
  'yasvik-daily-nutrition-combo',
  'yasvik-kids-snack-combo',
  'yasvik-office-snack-combo'
);
