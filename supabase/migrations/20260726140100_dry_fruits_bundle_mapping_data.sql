-- Dry-fruit bundle mapping data.
-- Retains combo product IDs/slugs. Keeps drafts unpublished.
-- Does NOT change live individual prices or stock.
-- Yasvik Five Seeds Combo left unresolved (packaging format unconfirmed).

-- ─── 1) Classify individuals ─────────────────────────────────────────────────
UPDATE products SET
  product_kind = 'individual_product',
  composition_status = 'n_a',
  updated_at = now()
WHERE slug IN (
  'badam-almonds',
  'cashews',
  'salted-pista',
  'walnuts',
  'anjeer-rvnea',
  'green-raisins',
  'black-raisins',
  'kimia-dates',
  'dates',
  'dry-dates',
  'fard-dates',
  'makhana',
  'pumpkin-seeds',
  'sunflower-seeds',
  'watermelon-seeds',
  'flax-seeds-yas-007',
  'chia-seeds',
  'sabja-seeds',
  'halim-seeds',
  'white-sesame-seeds'
)
AND (product_kind IS NULL OR product_kind IS DISTINCT FROM 'individual_product');

-- ─── 2) Classify confirmed / unresolved combos (remain unpublished) ──────────
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
  'yasvik-family-dry-fruit-seeds-combo',
  'yasvik-premium-family-combo',
  'yasvik-five-seeds-combo'
);

-- Other draft combos: classify as bundle_combo placeholders (no items yet).
UPDATE products SET
  product_kind = 'bundle_combo',
  composition_status = 'n_a',
  product_group = COALESCE(product_group, 'packaged_combo'),
  inventory_mode = COALESCE(inventory_mode, 'prepacked_stock'),
  updated_at = now()
WHERE slug IN (
  'yasvik-daily-nutrition-combo',
  'yasvik-kids-snack-combo',
  'yasvik-office-snack-combo',
  'yasvik-twelve-superfoods-combo'
)
AND is_published = false;

-- ─── 3) Upsert bundle parents ────────────────────────────────────────────────
INSERT INTO public.product_bundles (
  id,
  bundle_name,
  bundle_slug,
  bundle_description,
  bundle_type,
  display_locations,
  is_active,
  sort_order,
  parent_product_id,
  bundle_status,
  inventory_mode,
  packaging_mode,
  substitution_policy,
  total_net_weight_g,
  item_count,
  outer_packaging_cost_paise,
  has_unresolved_components,
  mapping_notes
)
SELECT
  v.id::uuid,
  v.bundle_name,
  v.bundle_slug,
  v.bundle_description,
  v.bundle_type,
  ARRAY['product', 'category']::text[],
  true,
  v.sort_order,
  p.id,
  v.bundle_status,
  'prepacked_stock',
  v.packaging_mode,
  v.substitution_policy,
  v.total_net_weight_g,
  v.item_count,
  0,
  v.has_unresolved_components,
  v.mapping_notes
FROM (
  VALUES
    (
      'e8b10001-a111-4111-8111-000000000001',
      'Yasvik Everyday Dry Fruit Combo',
      'yasvik-everyday-dry-fruit-combo',
      'Separately packed everyday dry fruits and makhana.',
      'bundle_combo',
      10,
      'draft',
      'separately_packed',
      'If a listed item is temporarily unavailable, Yasvik may substitute with an equivalent grade of the same product type after confirming with you where required.',
      600::numeric,
      5,
      false,
      'Dates component mapped to Regular Dates (slug dates). 200 g pack has no exact variant SKU yet — quantity stored as 200 g × 1 pack.',
      'yasvik-everyday-dry-fruit-combo'
    ),
    (
      'e8b10001-a111-4111-8111-000000000002',
      'Yasvik Seven Seeds & Nuts Combo',
      'yasvik-seven-superfoods-combo',
      'Seven separately packed nuts, seeds and raisins.',
      'bundle_combo',
      20,
      'draft',
      'separately_packed',
      'If a listed item is temporarily unavailable, Yasvik may substitute with an equivalent grade of the same product type after confirming with you where required.',
      700::numeric,
      7,
      false,
      NULL,
      'yasvik-seven-superfoods-combo'
    ),
    (
      'e8b10001-a111-4111-8111-000000000003',
      'Yasvik Five Seeds Combo',
      'yasvik-five-seeds-combo',
      'Packaging format unconfirmed — may be separately packed OR a true mixed pouch. Do not publish until confirmed.',
      'bundle_combo',
      30,
      'unresolved',
      'unconfirmed',
      NULL,
      NULL::numeric,
      0,
      true,
      'UNRESOLVED: Confirm whether five seeds are separately packed (bundle_combo) or mixed in one pouch (true_mix). Provisional 200 g × 5 = 1 kg mapping held in docs only — no bundle_items until confirmed.',
      'yasvik-five-seeds-combo'
    ),
    (
      'e8b10001-a111-4111-8111-000000000004',
      'Yasvik Family Dry Fruit & Seeds Combo',
      'yasvik-family-dry-fruit-seeds-combo',
      'Family assortment of separately packed dry fruits and seeds.',
      'bundle_combo',
      40,
      'draft',
      'separately_packed',
      'If a listed item is temporarily unavailable, Yasvik may substitute with an equivalent grade of the same product type after confirming with you where required.',
      2200::numeric,
      10,
      false,
      'Dates component mapped to Regular Dates (slug dates). 400 g has no exact variant SKU — quantity stored as 400 g × 1 pack.',
      'yasvik-family-dry-fruit-seeds-combo'
    ),
    (
      'e8b10001-a111-4111-8111-000000000005',
      'Yasvik Premium Family Combo',
      'yasvik-premium-family-combo',
      'Premium separately packed dry fruits and seeds. Optional seed add-ons not included until approved.',
      'bundle_combo',
      50,
      'draft',
      'separately_packed',
      'If a listed item is temporarily unavailable, Yasvik may substitute with an equivalent grade of the same product type after confirming with you where required.',
      2250::numeric,
      8,
      false,
      'Kimia Dates used for Dates line (500 g). No optional seed add-ons.',
      'yasvik-premium-family-combo'
    )
) AS v(
  id,
  bundle_name,
  bundle_slug,
  bundle_description,
  bundle_type,
  sort_order,
  bundle_status,
  packaging_mode,
  substitution_policy,
  total_net_weight_g,
  item_count,
  has_unresolved_components,
  mapping_notes,
  parent_slug
)
JOIN products p ON p.slug = v.parent_slug
ON CONFLICT (id) DO UPDATE SET
  bundle_name = EXCLUDED.bundle_name,
  bundle_slug = EXCLUDED.bundle_slug,
  bundle_description = EXCLUDED.bundle_description,
  bundle_type = EXCLUDED.bundle_type,
  sort_order = EXCLUDED.sort_order,
  parent_product_id = EXCLUDED.parent_product_id,
  bundle_status = EXCLUDED.bundle_status,
  inventory_mode = EXCLUDED.inventory_mode,
  packaging_mode = EXCLUDED.packaging_mode,
  substitution_policy = EXCLUDED.substitution_policy,
  total_net_weight_g = EXCLUDED.total_net_weight_g,
  item_count = EXCLUDED.item_count,
  has_unresolved_components = EXCLUDED.has_unresolved_components,
  mapping_notes = EXCLUDED.mapping_notes,
  updated_at = now();

-- Also resolve conflict on unique bundle_slug if id differs.
UPDATE product_bundles b
SET
  parent_product_id = p.id,
  updated_at = now()
FROM products p
WHERE b.bundle_slug = p.slug
  AND b.parent_product_id IS DISTINCT FROM p.id;

UPDATE products p
SET
  bundle_id = b.id,
  updated_at = now()
FROM product_bundles b
WHERE b.parent_product_id = p.id
  AND p.bundle_id IS DISTINCT FROM b.id;

-- ─── 4) Bundle items (delete+insert for the four confirmed combos) ────────────
DELETE FROM product_bundle_items
WHERE bundle_id IN (
  'e8b10001-a111-4111-8111-000000000001'::uuid,
  'e8b10001-a111-4111-8111-000000000002'::uuid,
  'e8b10001-a111-4111-8111-000000000004'::uuid,
  'e8b10001-a111-4111-8111-000000000005'::uuid
);

-- Helper inline inserts via joins on slug.
INSERT INTO product_bundle_items (
  bundle_id,
  product_id,
  sort_order,
  is_required,
  component_variant_sku,
  component_title_snapshot,
  quantity_value,
  quantity_unit,
  pack_count,
  substitution_allowed,
  is_active
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
  x.packs,
  x.sub_ok,
  true
FROM (
  VALUES
    -- Everyday
    ('e8b10001-a111-4111-8111-000000000001', 'badam-almonds', 1, 100::numeric, 1, 'YAS-PREMIUMB-TWFYF-100G', false),
    ('e8b10001-a111-4111-8111-000000000001', 'cashews', 2, 100::numeric, 1, 'YAS-PREMIUMC-100G', false),
    ('e8b10001-a111-4111-8111-000000000001', 'green-raisins', 3, 100::numeric, 1, 'YAS-034-100G', false),
    ('e8b10001-a111-4111-8111-000000000001', 'dates', 4, 200::numeric, 1, NULL, true),
    ('e8b10001-a111-4111-8111-000000000001', 'makhana', 5, 100::numeric, 1, 'YAS-DF-MAKH-100G', false),
    -- Seven
    ('e8b10001-a111-4111-8111-000000000002', 'badam-almonds', 1, 100::numeric, 1, 'YAS-PREMIUMB-TWFYF-100G', false),
    ('e8b10001-a111-4111-8111-000000000002', 'cashews', 2, 100::numeric, 1, 'YAS-PREMIUMC-100G', false),
    ('e8b10001-a111-4111-8111-000000000002', 'salted-pista', 3, 100::numeric, 1, NULL, false),
    ('e8b10001-a111-4111-8111-000000000002', 'pumpkin-seeds', 4, 100::numeric, 1, NULL, false),
    ('e8b10001-a111-4111-8111-000000000002', 'sunflower-seeds', 5, 100::numeric, 1, NULL, false),
    ('e8b10001-a111-4111-8111-000000000002', 'flax-seeds-yas-007', 6, 100::numeric, 1, NULL, false),
    ('e8b10001-a111-4111-8111-000000000002', 'black-raisins', 7, 100::numeric, 1, NULL, false),
    -- Family
    ('e8b10001-a111-4111-8111-000000000004', 'badam-almonds', 1, 250::numeric, 1, 'YAS-PREMIUMB-TWFYF-250G', false),
    ('e8b10001-a111-4111-8111-000000000004', 'cashews', 2, 250::numeric, 1, 'YAS-PREMIUMC-250G', false),
    ('e8b10001-a111-4111-8111-000000000004', 'green-raisins', 3, 200::numeric, 1, NULL, false),
    ('e8b10001-a111-4111-8111-000000000004', 'dates', 4, 400::numeric, 1, NULL, true),
    ('e8b10001-a111-4111-8111-000000000004', 'makhana', 5, 100::numeric, 1, 'YAS-DF-MAKH-100G', false),
    ('e8b10001-a111-4111-8111-000000000004', 'pumpkin-seeds', 6, 200::numeric, 1, NULL, false),
    ('e8b10001-a111-4111-8111-000000000004', 'sunflower-seeds', 7, 200::numeric, 1, NULL, false),
    ('e8b10001-a111-4111-8111-000000000004', 'watermelon-seeds', 8, 200::numeric, 1, NULL, false),
    ('e8b10001-a111-4111-8111-000000000004', 'flax-seeds-yas-007', 9, 200::numeric, 1, NULL, false),
    ('e8b10001-a111-4111-8111-000000000004', 'chia-seeds', 10, 200::numeric, 1, NULL, false),
    -- Premium
    ('e8b10001-a111-4111-8111-000000000005', 'cashews', 1, 250::numeric, 1, 'YAS-PREMIUMC-250G', false),
    ('e8b10001-a111-4111-8111-000000000005', 'badam-almonds', 2, 250::numeric, 1, 'YAS-PREMIUMB-TWFYF-250G', false),
    ('e8b10001-a111-4111-8111-000000000005', 'anjeer-rvnea', 3, 250::numeric, 1, NULL, false),
    ('e8b10001-a111-4111-8111-000000000005', 'salted-pista', 4, 250::numeric, 1, NULL, false),
    ('e8b10001-a111-4111-8111-000000000005', 'walnuts', 5, 250::numeric, 1, NULL, false),
    ('e8b10001-a111-4111-8111-000000000005', 'makhana', 6, 250::numeric, 1, 'YAS-DF-MAKH-250G', false),
    ('e8b10001-a111-4111-8111-000000000005', 'green-raisins', 7, 250::numeric, 1, 'YAS-034-250G', false),
    ('e8b10001-a111-4111-8111-000000000005', 'kimia-dates', 8, 500::numeric, 1, 'YAS-DF-KIMIA-500G', false)
) AS x(bundle_id, component_slug, sort_order, qty, packs, variant_sku, sub_ok)
JOIN products c ON c.slug = x.component_slug;

-- Ensure Five Seeds has no provisional items.
DELETE FROM product_bundle_items
WHERE bundle_id = 'e8b10001-a111-4111-8111-000000000003'::uuid;

-- Recompute item_count / weight from items for confirmed bundles.
UPDATE product_bundles b
SET
  item_count = sub.cnt,
  total_net_weight_g = sub.weight_g,
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
  WHERE is_active = true
    AND bundle_id IN (
      'e8b10001-a111-4111-8111-000000000001'::uuid,
      'e8b10001-a111-4111-8111-000000000002'::uuid,
      'e8b10001-a111-4111-8111-000000000004'::uuid,
      'e8b10001-a111-4111-8111-000000000005'::uuid
    )
  GROUP BY bundle_id
) sub
WHERE b.id = sub.bundle_id;

-- Denormalize summary fields for collection cards.
UPDATE products p
SET
  bundle_item_count = b.item_count,
  bundle_net_weight_g = b.total_net_weight_g,
  updated_at = now()
FROM product_bundles b
WHERE b.parent_product_id = p.id;

-- Safety: never publish affected combo parents in this migration.
UPDATE products SET
  is_published = false,
  sell_online = false,
  updated_at = now()
WHERE slug IN (
  'yasvik-everyday-dry-fruit-combo',
  'yasvik-seven-superfoods-combo',
  'yasvik-five-seeds-combo',
  'yasvik-family-dry-fruit-seeds-combo',
  'yasvik-premium-family-combo'
)
AND (is_published = true OR sell_online = true);
