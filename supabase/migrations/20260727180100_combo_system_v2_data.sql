-- Yasvik Combo System V2 — seed merchandising categories + Five Dry Fruits options product.
-- Safe to re-run: uses upserts and slug-based lookups.

-- ─── Merchandising categories for published dry-fruit boxes ──────────────────
UPDATE product_bundles pb
SET
  combo_merch_category = v.category,
  purpose_label = COALESCE(pb.purpose_label, v.purpose_label),
  audience_tags = CASE
    WHEN cardinality(pb.audience_tags) > 0 THEN pb.audience_tags
    ELSE v.audience_tags
  END,
  updated_at = now()
FROM (
  VALUES
    ('yasvik-everyday-seeds-Combo', 'separate', 'Daily Nutrition', ARRAY['gym', 'monthly_grocery', 'natural_snacking']::text[]),
    ('yasvik-17-item-discovery-box', 'mixed', 'Healthy Snacking', ARRAY['kids', 'parents', 'natural_snacking']::text[]),
    ('yasvik-dry-fruit-essentials-box', 'free_gift', 'Premium Dry Fruits', ARRAY['parents', 'office', 'natural_snacking']::text[]),
    ('yasvik-family-pantry-box', 'free_gift', 'Perfect Family Box', ARRAY['parents', 'monthly_grocery', 'natural_snacking']::text[]),
    ('yasvik-premium-family-selection', 'free_gift', 'Monthly Wellness', ARRAY['parents', 'seniors', 'monthly_grocery']::text[])
) AS v(slug, category, purpose_label, audience_tags)
JOIN products p ON p.slug = v.slug
WHERE pb.parent_product_id = p.id;

-- Mark free gifts on family / premium boxes (display only; not deducted from stock yet).
UPDATE product_bundle_items AS pbi
SET
  item_role = 'free_gift',
  display_group = 'free_items',
  gift_worth_paise = 14900
FROM products AS comp, product_bundles AS pb, products AS parent
WHERE pbi.product_id = comp.id
  AND pbi.bundle_id = pb.id
  AND pb.parent_product_id = parent.id
  AND parent.slug IN ('yasvik-family-pantry-box', 'yasvik-premium-family-selection')
  AND comp.slug IN ('halim-seeds', 'chia-seeds')
  AND pbi.item_role = 'included';

-- Display groups for discovery box contents.
UPDATE product_bundle_items AS pbi
SET display_group = CASE
  WHEN comp.slug ~* '(seed|chia|flax|sabja|halim|sunflower|pumpkin|watermelon|sesame)' THEN 'seeds'
  WHEN comp.slug ~* '(almond|cashew|walnut|pista|makhana)' THEN 'nuts'
  WHEN comp.slug ~* '(raisin|anjeer|date)' THEN 'dry_fruits'
  ELSE 'other'
END
FROM products AS comp, product_bundles AS pb, products AS parent
WHERE pbi.product_id = comp.id
  AND pbi.bundle_id = pb.id
  AND pb.parent_product_id = parent.id
  AND parent.slug = 'yasvik-17-item-discovery-box'
  AND pbi.display_group IS NULL;

-- ─── Five Dry Fruits Combo — one sellable product, two customer options ──────
DO $$
DECLARE
  v_product_id uuid := 'a8c20001-b333-4333-8333-000000000006';
  v_bundle_id uuid := 'e8b20001-a222-4222-8222-000000000006';
  v_category_id uuid;
  v_group_id uuid;
  v_choice_a uuid;
  v_choice_b uuid;
BEGIN
  SELECT id INTO v_category_id FROM categories WHERE slug = 'dry-fruits-combos' LIMIT 1;

  INSERT INTO products (
    id, name, slug, sku, price, stock_quantity,
    short_description, description, category_id,
    product_kind, product_group, inventory_mode,
    is_published, sell_online, is_featured, yasvik_mark,
    subject_to_availability, sort_order, featured_image_url
  ) VALUES (
    v_product_id,
    'Yasvik Five Dry Fruits Combo',
    'yasvik-five-dry-fruits-combo',
    'YAS-DF-C-FIVE-DRY-FRUITS',
    899,
    0,
    'Choose your five dry-fruit combination — each pack includes a free seed gift.',
    'One Yasvik combo, two curated dry-fruit paths. Pick Classic Nuts or Premium Wellness and the contents, weight, hero image and free gift update instantly.',
    v_category_id,
    'bundle_combo',
    'packaged_combo',
    'prepacked_stock',
    true,
    true,
    false,
    'Premium Dry Fruits',
    true,
    1,
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    price = EXCLUDED.price,
    short_description = EXCLUDED.short_description,
    description = EXCLUDED.description,
    is_published = true,
    sell_online = true,
    yasvik_mark = EXCLUDED.yasvik_mark,
    subject_to_availability = true,
    updated_at = now();

  INSERT INTO product_bundles (
    id, bundle_name, bundle_slug, bundle_description, bundle_type,
    display_locations, is_active, sort_order, parent_product_id,
    bundle_status, inventory_mode, packaging_mode,
    item_count, total_net_weight_g,
    combo_merch_category, purpose_label, audience_tags,
    has_customer_options
  ) VALUES (
    v_bundle_id,
    'Yasvik Five Dry Fruits Combo',
    'yasvik-five-dry-fruits-combo',
    'Choose Classic Nuts or Premium Wellness — includes a free seed gift.',
    'bundle_combo',
    ARRAY['home', 'category', 'product'],
    true,
    1,
    v_product_id,
    'active',
    'prepacked_stock',
    'separately_packed',
    5,
    450,
    'separate',
    'Premium Dry Fruits',
    ARRAY['parents', 'office', 'natural_snacking']::text[],
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    parent_product_id = EXCLUDED.parent_product_id,
    combo_merch_category = EXCLUDED.combo_merch_category,
    purpose_label = EXCLUDED.purpose_label,
    audience_tags = EXCLUDED.audience_tags,
    has_customer_options = true,
    bundle_status = 'active',
    is_active = true,
    updated_at = now();

  UPDATE products SET bundle_id = v_bundle_id WHERE id = v_product_id;

  DELETE FROM combo_option_groups WHERE bundle_id = v_bundle_id;

  INSERT INTO combo_option_groups (bundle_id, label, sort_order, is_required)
  VALUES (v_bundle_id, 'Choose your Dry Fruit Combo', 0, true)
  RETURNING id INTO v_group_id;

  INSERT INTO combo_option_choices (
    group_id, label, slug, sort_order, is_default, description, net_weight_g, is_active
  ) VALUES (
    v_group_id,
    'Classic Nuts',
    'classic-nuts',
    0,
    true,
    'Cashew, almond, pista, golden raisins — with free halim seeds.',
    450,
    true
  ) RETURNING id INTO v_choice_a;

  INSERT INTO combo_option_choices (
    group_id, label, slug, sort_order, is_default, description, net_weight_g, is_active
  ) VALUES (
    v_group_id,
    'Premium Wellness',
    'premium-wellness',
    1,
    false,
    'Anjeer, black raisins, walnuts, makhana — with free sabja seeds.',
    450,
    true
  ) RETURNING id INTO v_choice_b;

  -- Classic Nuts items
  INSERT INTO combo_option_choice_items (
    choice_id, product_id, quantity_value, quantity_unit, pack_count, sort_order, item_role, display_group, component_variant_sku
  )
  SELECT v_choice_a, p.id, v.qty, 'g', 1, v.sort_order, v.role, v.display_group, v.sku
  FROM (VALUES
    ('cashews', 100::numeric, 0, 'included', 'nuts', 'YAS-PREMIUMC-100G'),
    ('badam-almonds', 100::numeric, 1, 'included', 'nuts', 'YAS-PREMIUMB-TWFYF-100G'),
    ('salted-pista', 50::numeric, 2, 'included', 'nuts', 'YAS-104-50G'),
    ('green-raisins', 100::numeric, 3, 'included', 'dry_fruits', 'YAS-034-100G'),
    ('halim-seeds', 200::numeric, 4, 'free_gift', 'free_items', 'YAS-DF-HALIM-200G')
  ) AS v(slug, qty, sort_order, role, display_group, sku)
  JOIN products p ON p.slug = v.slug;

  -- Premium Wellness items
  INSERT INTO combo_option_choice_items (
    choice_id, product_id, quantity_value, quantity_unit, pack_count, sort_order, item_role, display_group, component_variant_sku
  )
  SELECT v_choice_b, p.id, v.qty, 'g', 1, v.sort_order, v.role, v.display_group, v.sku
  FROM (VALUES
    ('anjeer-rvnea', 100::numeric, 0, 'included', 'dry_fruits', 'YAS-137-100G'),
    ('black-raisins', 100::numeric, 1, 'included', 'dry_fruits', 'YAS-PREMIUMB-JGOHK-100G'),
    ('walnuts', 50::numeric, 2, 'included', 'nuts', 'YAS-120-50G'),
    ('makhana', 50::numeric, 3, 'included', 'nuts', 'YAS-DF-MAKH-50G'),
    ('sabja-seeds', 200::numeric, 4, 'free_gift', 'free_items', 'YAS-DF-SABJA-200G')
  ) AS v(slug, qty, sort_order, role, display_group, sku)
  JOIN products p ON p.slug = v.slug;
END $$;
