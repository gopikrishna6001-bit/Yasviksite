-- Supplier combo accuracy audit (2026-07-26)
-- Daily 17-item: lock exact 1600 g from component arithmetic.
-- Grand Variety 20-item: create draft parent + partial BOM; Roasted Seeds + Chikki unresolved.
-- Does not publish; does not change live individual prices/stock.

UPDATE product_bundles
SET
  total_net_weight_g = 1600,
  item_count = 17,
  has_unresolved_components = false,
  mapping_notes = 'Accuracy audit 2026-07-26: component line sum = 1600 g exactly (15×100 g + 2×50 g). Not a rounding of ~1.55 kg.',
  updated_at = now()
WHERE bundle_slug = 'yasvik-daily-nutrition-combo';

UPDATE products
SET
  bundle_net_weight_g = 1600,
  bundle_item_count = 17,
  is_published = false,
  sell_online = false,
  updated_at = now()
WHERE slug = 'yasvik-daily-nutrition-combo';

-- Grand Variety product + bundle + 18 linked items are applied via remote SQL in session;
-- see COMBO-POPULATION-REPORT.md for full mapping and unresolved notes.
