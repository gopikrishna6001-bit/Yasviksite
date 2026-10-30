-- Dry Fruits launch-readiness data:
-- 1) Retire native-sesame-seeds (soft-remove from shop/search; preserve row for integrity)
-- 2) Alias old slug → white-sesame-seeds
-- 3) Mark launch_batch = 1 for approved Batch 1 SKUs; everything else stays later
-- 4) Packaged combo inventory mode + stock 0
-- 5) Image status brief_ready for Batch 1
--
-- Does NOT publish any draft products.
-- Does NOT change prices or stock on live individual products.

-- ─── 1) Sesame duplicate retirement ─────────────────────────────────────────
-- Soft-remove live duplicate so shop/search stop showing it.
-- Order/stock FKs remain intact (no hard delete). Prices/stock on this row unchanged.

UPDATE products SET
  is_published = false,
  sell_online = false,
  indexable = false,
  slug = 'native-sesame-seeds-archived-20260726',
  seo_title = coalesce(seo_title, 'Native Sesame Seeds | Yasvik (Archived)'),
  updated_at = now()
WHERE slug = 'native-sesame-seeds'
  AND id = '12ad6e99-93de-442e-adaa-e4c1a7cd53ea'::uuid;

-- Canonical draft retained; enrich search keywords for continuity (still unpublished).
UPDATE products SET
  seo_keywords = CASE
    WHEN coalesce(seo_keywords, '') ILIKE '%native sesame%' THEN seo_keywords
    WHEN coalesce(seo_keywords, '') = '' THEN 'white sesame seeds, nuvvulu, native sesame seeds, edible seeds, Yasvik'
    ELSE seo_keywords || ', native sesame seeds, nuvvulu'
  END,
  updated_at = now()
WHERE slug = 'white-sesame-seeds';

INSERT INTO public.product_slug_aliases (old_slug, product_id, note)
SELECT
  'native-sesame-seeds',
  p.id,
  'Retired duplicate of white-sesame-seeds (2026-07-26 launch readiness). Soft-archived native row; old URL aliases here.'
FROM products p
WHERE p.slug = 'white-sesame-seeds'
ON CONFLICT (old_slug) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  note = EXCLUDED.note;

-- ─── 2) Launch batch flags ──────────────────────────────────────────────────
UPDATE products SET launch_batch = 'later' WHERE launch_batch IS DISTINCT FROM 'later';

UPDATE products SET
  launch_batch = '1',
  image_status = CASE
    WHEN image_status IN ('approved', 'uploaded', 'generated', 'needs_correction') THEN image_status
    ELSE 'brief_ready'
  END,
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
  'makhana',
  'pumpkin-seeds',
  'sunflower-seeds',
  'watermelon-seeds',
  'flax-seeds-yas-007',
  'chia-seeds',
  'sabja-seeds',
  'yasvik-everyday-dry-fruit-combo',
  'yasvik-seven-superfoods-combo',
  'yasvik-five-seeds-combo',
  'yasvik-family-dry-fruit-seeds-combo',
  'yasvik-premium-family-combo'
);

-- ─── 3) Packaged combo inventory (no BOM) ───────────────────────────────────
UPDATE products SET
  product_group = 'packaged_combo',
  inventory_mode = 'prepacked_stock',
  stock_quantity = 0,
  shared_stock_kg = NULL,
  updated_at = now()
WHERE slug IN (
  'yasvik-everyday-dry-fruit-combo',
  'yasvik-seven-superfoods-combo',
  'yasvik-twelve-superfoods-combo',
  'yasvik-daily-nutrition-combo',
  'yasvik-family-dry-fruit-seeds-combo',
  'yasvik-premium-family-combo',
  'yasvik-five-seeds-combo',
  'yasvik-kids-snack-combo',
  'yasvik-office-snack-combo'
);

-- Explicitly keep all Batch 1 drafts unpublished (safety).
UPDATE products SET
  is_published = false,
  sell_online = false,
  updated_at = now()
WHERE slug IN (
  'kimia-dates',
  'makhana',
  'chia-seeds',
  'sabja-seeds',
  'flax-seeds-yas-007',
  'yasvik-everyday-dry-fruit-combo',
  'yasvik-seven-superfoods-combo',
  'yasvik-five-seeds-combo',
  'yasvik-family-dry-fruit-seeds-combo',
  'yasvik-premium-family-combo'
)
AND (is_published = true OR sell_online = true);
-- Note: flax was already draft; combos/draft seeds stay draft. Live Batch 1 individuals keep publish state.
-- The statement above only forces unpublished for known draft SKUs if somehow flipped.

-- Re-assert live Batch 1 individuals keep their existing publish flags (no-op safety).
-- (Intentionally no UPDATE of is_published for live nuts/seeds/raisins.)
