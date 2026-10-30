-- Owner-approved launch execution (2026-07-28)
-- 1) Gongura identity repair in place (stay unpublished)
-- 2) Dampudu identity repair in place (unpublish → repair → republish)
-- 3) Phase 1B2 Hero tiers + collection memberships (6 Favourites only)
-- Does NOT change prices, compare prices, stock, sell_online, checkout, POS, bundles, homepage.

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- GONGURA PICKLE — f27b8b1f-553a-4a34-be5a-17da9dbbe16c
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO public.product_slug_aliases (old_slug, product_id, note)
VALUES (
  'mixed-vegetable-pickle',
  'f27b8b1f-553a-4a34-be5a-17da9dbbe16c'::uuid,
  'Legacy slug before Gongura identity repair (2026-07-28). Redirects to gongura-pickle.'
)
ON CONFLICT (old_slug) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  note = EXCLUDED.note;

UPDATE public.products SET
  name = 'Gongura Pickle',
  slug = 'gongura-pickle',
  is_published = false,
  short_description = 'Gongura Pickle is meant for customers who want bold Andhra-style sorrel-leaf pickle with rice, curd rice and everyday meals. The focus is on tangy flavour, clean packing and a believable homemade feel — not a mass-market pickle story.',
  description = 'Yasvik Gongura Pickle is a traditional Andhra-style sorrel-leaf pickle for everyday meals. Made for customers who want that sharp, tangy side with rice, curd rice and simple lunches — packed carefully for shelf-stable delivery.',
  ingredients = 'Sorrel leaves (gongura), red chilli, mustard, fenugreek, salt, edible vegetable oil.',
  allergen_info = 'Contains mustard. May contain traces of other seeds and nuts used in the same kitchen.',
  process_method = 'Homemade-style pickle',
  processing_method = 'Homemade-style Andhra pickle',
  storage_note = 'Store in a cool, dry place. Refrigerate after opening and use a clean dry spoon.',
  origin_state = 'Andhra Pradesh',
  seo_title = 'Gongura Pickle (గోంగూర పచ్చడి) | Home-Style Pickle | Yasvik',
  seo_description = 'Gongura Pickle with bold Andhra-style tangy flavour for rice, curd rice and everyday meals. Carefully packed by Yasvik with honest quality.',
  seo_keywords = 'gongura pickle, gongura pachadi, Andhra pickle Hyderabad, buy gongura pickle online, Yasvik pickles',
  featured_image_url = 'https://media.yasvik.com/media-assets/products/yasvik-lemon-pickle-hero.webp',
  image_status = 'needs_correction',
  requires_owner_review = false,
  owner_review_reason = NULL,
  updated_at = now()
WHERE id = 'f27b8b1f-553a-4a34-be5a-17da9dbbe16c'::uuid;

DELETE FROM public.product_images
WHERE product_id = 'f27b8b1f-553a-4a34-be5a-17da9dbbe16c'::uuid;

INSERT INTO public.product_images (product_id, image_url, is_primary, sort_order, alt_text)
VALUES
  (
    'f27b8b1f-553a-4a34-be5a-17da9dbbe16c'::uuid,
    'https://media.yasvik.com/media-assets/products/yasvik-lemon-pickle-hero.webp',
    true,
    0,
    'Gongura Pickle — Yasvik Hyderabad'
  ),
  (
    'f27b8b1f-553a-4a34-be5a-17da9dbbe16c'::uuid,
    'https://media.yasvik.com/media-assets/products/yasvik-red-chilli-pickle-gallery.webp',
    false,
    1,
    'Gongura Pickle — gallery'
  ),
  (
    'f27b8b1f-553a-4a34-be5a-17da9dbbe16c'::uuid,
    'https://media.yasvik.com/media-assets/products/yasvik-red-chilli-pickle-gallery-2.webp',
    false,
    2,
    'Gongura Pickle — gallery'
  );

UPDATE public.media_assets SET
  name = 'yasvik-gongura-pickle-hero-pending.webp',
  slug = 'yasvik-gongura-pickle-hero-pending',
  alt_text = 'Gongura Pickle — dedicated photography pending',
  description = 'Interim hero reference after Mixed Vegetable identity repair (2026-07-28). Replace with true Gongura pack shot.',
  entity_id = 'f27b8b1f-553a-4a34-be5a-17da9dbbe16c'::uuid,
  updated_at = now()
WHERE id = '333254c3-5e9d-404b-b046-6fee5a1c1d6c'::uuid;

-- ═══════════════════════════════════════════════════════════════════════════
-- HANDPOUND DAMPUDU BIYYAM — 130cdfbf-ee5b-4650-bb24-09b17c162cad
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE public.products SET
  is_published = false,
  updated_at = now()
WHERE id = '130cdfbf-ee5b-4650-bb24-09b17c162cad'::uuid;

INSERT INTO public.product_slug_aliases (old_slug, product_id, note)
VALUES (
  'mysore-malliga-l52dq',
  '130cdfbf-ee5b-4650-bb24-09b17c162cad'::uuid,
  'Legacy slug before Dampudu identity repair (2026-07-28). Redirects to handpound-dampudu-biyyam.'
)
ON CONFLICT (old_slug) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  note = EXCLUDED.note;

UPDATE public.products SET
  name = 'Handpound Dampudu Biyyam',
  slug = 'handpound-dampudu-biyyam',
  description = 'Handpound Dampudu Biyyam (దంపుడు బియ్యం) is minimally processed rice where the grain is pounded rather than polished away. The bran and germ layers stay largely intact, so it keeps more fibre and B-vitamins than heavily milled white rice — with a satisfying, slightly chewy bite after cooking.',
  ingredients = 'Rice.',
  allergen_info = 'Packed in a facility that handles other grains, seeds and nuts.',
  process_method = 'Hand pound (dampudu) rice',
  processing_method = 'Minimally processed hand pound rice',
  storage_note = 'Store in a cool, dry place in an airtight container. Protect from moisture and pests.',
  seo_title = 'Handpound Dampudu Biyyam (దంపుడు బియ్యం) | Yasvik Hyderabad',
  seo_description = 'Hand pound (dampudu) rice retains bran and germ for more fibre and B-vitamins. A heritage Andhra staple from Yasvik — order online in Hyderabad.',
  seo_keywords = 'yasvik handpound dampudu biyyam, dampudu biyyam, hand pound rice Hyderabad, buy dampudu rice online, heritage rice Yasvik',
  featured_image_url = 'https://media.yasvik.com/media-assets/products/yasvik-organic-kaikuttal-rice-hero.webp',
  image_status = 'needs_correction',
  requires_owner_review = false,
  owner_review_reason = NULL,
  updated_at = now()
WHERE id = '130cdfbf-ee5b-4650-bb24-09b17c162cad'::uuid;

DELETE FROM public.product_images
WHERE product_id = '130cdfbf-ee5b-4650-bb24-09b17c162cad'::uuid;

INSERT INTO public.product_images (product_id, image_url, is_primary, sort_order, alt_text)
VALUES
  (
    '130cdfbf-ee5b-4650-bb24-09b17c162cad'::uuid,
    'https://media.yasvik.com/media-assets/products/yasvik-organic-kaikuttal-rice-hero.webp',
    true,
    0,
    'Handpound Dampudu Biyyam — Yasvik Hyderabad'
  );

INSERT INTO public.media_assets (
  name, slug, file_path, mime_type, media_type, entity_type, entity_id,
  alt_text, description, upload_url, is_active
)
SELECT
  'yasvik-handpound-dampudu-biyyam-hero-pending.webp',
  'yasvik-handpound-dampudu-biyyam-hero-pending',
  'media-assets/products/yasvik-organic-kaikuttal-rice-hero.webp',
  'image/webp',
  'image',
  'products',
  '130cdfbf-ee5b-4650-bb24-09b17c162cad'::uuid,
  'Handpound Dampudu Biyyam — dedicated photography pending',
  'Interim hero after Mysore Malliga identity repair (2026-07-28). Replace with true Dampudu pack shot.',
  'https://media.yasvik.com/media-assets/products/yasvik-organic-kaikuttal-rice-hero.webp',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.media_assets
  WHERE entity_type = 'products'
    AND entity_id = '130cdfbf-ee5b-4650-bb24-09b17c162cad'::uuid
);

-- Republish after identity fields aligned (PDP/SEO/structured-data gate passed in apply report)
UPDATE public.products SET
  is_published = true,
  updated_at = now()
WHERE id = '130cdfbf-ee5b-4650-bb24-09b17c162cad'::uuid
  AND slug = 'handpound-dampudu-biyyam'
  AND name = 'Handpound Dampudu Biyyam'
  AND description NOT ILIKE '%Mysore Malliga%'
  AND description NOT ILIKE '%Mysore Mallige%';

-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE 1B2 — Hero tiers (6 Favourites) — storefront consumption still disabled
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE public.products SET
  merchandising_tier = 'hero',
  merchandising_priority = v.priority,
  show_in_yasvik_selection = false,
  show_in_local_store = false,
  updated_at = now()
FROM (VALUES
  ('486919f8-f0e7-4911-8b8c-8471e6a6d795'::uuid, 10),
  ('2f47f4cf-2002-4e8a-89ed-0400fc91a618'::uuid, 20),
  ('4c4396d8-c1e4-4359-90fb-778105fd2c3f'::uuid, 30),
  ('9bd19447-45d6-4c37-be1a-9849030365d0'::uuid, 40),
  ('25873e11-436e-43e4-b2dd-acb9e1b9eb0e'::uuid, 50),
  ('9153896a-27dd-47b9-a1a1-e608a8ef870a'::uuid, 60)
) AS v(id, priority)
WHERE products.id = v.id;

INSERT INTO public.merchandising_collection_items (
  collection_id, product_id, role, display_priority, homepage_visible, selection_visible
)
VALUES
  ('5a683bfb-3a84-4ad3-883a-728b8e3f5543'::uuid, '486919f8-f0e7-4911-8b8c-8471e6a6d795'::uuid, 'hero', 10, false, false),
  ('5a683bfb-3a84-4ad3-883a-728b8e3f5543'::uuid, '2f47f4cf-2002-4e8a-89ed-0400fc91a618'::uuid, 'hero', 20, false, false),
  ('fe18ddb1-e3bf-4f83-a58f-9daa1d26b428'::uuid, '4c4396d8-c1e4-4359-90fb-778105fd2c3f'::uuid, 'hero', 10, false, false),
  ('207a0bca-31d8-4fca-9ca2-783a0d9eff36'::uuid, '9bd19447-45d6-4c37-be1a-9849030365d0'::uuid, 'hero', 10, false, false),
  ('207a0bca-31d8-4fca-9ca2-783a0d9eff36'::uuid, '25873e11-436e-43e4-b2dd-acb9e1b9eb0e'::uuid, 'hero', 20, false, false),
  ('207a0bca-31d8-4fca-9ca2-783a0d9eff36'::uuid, '9153896a-27dd-47b9-a1a1-e608a8ef870a'::uuid, 'hero', 30, false, false)
ON CONFLICT (collection_id, product_id) DO UPDATE SET
  role = EXCLUDED.role,
  display_priority = EXCLUDED.display_priority,
  homepage_visible = false,
  selection_visible = false,
  updated_at = now();

-- Record owner decisions on proposals (audit run 89da3a53…)
UPDATE public.merchandising_product_proposals SET
  owner_decision_status = 'approved',
  owner_decision_action = 'approve_as_hero',
  owner_selected_tier = 'hero',
  decision_note = 'Owner final approval — Phase 1B2 apply (2026-07-28)',
  decided_at = now(),
  updated_at = now()
WHERE audit_run_id = '89da3a53-92a5-44e1-9fcc-5fe2ec7015eb'::uuid
  AND product_id IN (
    '486919f8-f0e7-4911-8b8c-8471e6a6d795',
    '2f47f4cf-2002-4e8a-89ed-0400fc91a618',
    '4c4396d8-c1e4-4359-90fb-778105fd2c3f',
    '9bd19447-45d6-4c37-be1a-9849030365d0',
    '25873e11-436e-43e4-b2dd-acb9e1b9eb0e',
    '9153896a-27dd-47b9-a1a1-e608a8ef870a'
  );

UPDATE public.merchandising_product_proposals SET
  owner_decision_status = 'pending',
  owner_decision_action = NULL,
  decision_note = 'Hold — identity/media repair required before Hero apply (owner 2026-07-28)',
  updated_at = now()
WHERE audit_run_id = '89da3a53-92a5-44e1-9fcc-5fe2ec7015eb'::uuid
  AND product_id IN (
    '068c0cb6-8c29-4c53-a648-6bdc43cc0967',
    '20133192-15f7-43ba-b6af-944d3458bd8b'
  );

INSERT INTO public.merchandising_audit_runs (
  id,
  generated_at,
  generation_version,
  proposal_rule_version,
  notes
)
VALUES (
  gen_random_uuid(),
  now(),
  '1b2.apply',
  '1b2.favourites',
  'Phase 1B2 favourites apply — hero tiers + collection memberships (storefront consumption disabled).'
);

COMMIT;
