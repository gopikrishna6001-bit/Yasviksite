-- Phase 1A: Merchandising schema (inactive on storefront).
-- Adds inert product merchandising columns, story-world collections,
-- audit runs, and admin-only product proposals. No product tiers applied.
-- Safe / reversible via forward migrations; do not drop in production.

-- ─── 1. Inert columns on products ───────────────────────────────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS merchandising_tier text,
  ADD COLUMN IF NOT EXISTS merchandising_priority integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS show_in_yasvik_selection boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_in_local_store boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS content_readiness_status text NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS compare_price_display_mode text NOT NULL DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS requires_owner_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS owner_review_reason text;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_merchandising_tier_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_merchandising_tier_check
  CHECK (
    merchandising_tier IS NULL
    OR merchandising_tier IN ('hero', 'core', 'local_store', 'hidden')
  );

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_content_readiness_status_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_content_readiness_status_check
  CHECK (
    content_readiness_status IN (
      'not_started',
      'needs_source_information',
      'ready_for_copy',
      'ready_for_video',
      'complete'
    )
  );

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_compare_price_display_mode_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_compare_price_display_mode_check
  CHECK (compare_price_display_mode IN ('auto', 'suppress'));

COMMENT ON COLUMN public.products.merchandising_tier IS
  'Phase 1A inactive until storefront consumes it. NULL = not applied.';
COMMENT ON COLUMN public.products.show_in_yasvik_selection IS
  'Phase 1A inactive; storefront must not filter on this until Phase 1B+.';
COMMENT ON COLUMN public.products.show_in_local_store IS
  'Phase 1A inactive; storefront must not filter on this until Phase 1B+.';

CREATE INDEX IF NOT EXISTS idx_products_merchandising_tier
  ON public.products (merchandising_tier)
  WHERE merchandising_tier IS NOT NULL;

-- ─── 2. Merchandising collections (story worlds) ────────────────────────────
CREATE TABLE IF NOT EXISTS public.merchandising_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  title text NOT NULL,
  description text,
  collection_type text NOT NULL DEFAULT 'story_world',
  is_active boolean NOT NULL DEFAULT true,
  display_priority integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT merchandising_collections_slug_key UNIQUE (slug),
  CONSTRAINT merchandising_collections_type_check
    CHECK (collection_type IN ('story_world', 'campaign', 'other'))
);

CREATE TABLE IF NOT EXISTS public.merchandising_collection_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES public.merchandising_collections(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'supporting',
  display_priority integer NOT NULL DEFAULT 0,
  homepage_visible boolean NOT NULL DEFAULT false,
  selection_visible boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT merchandising_collection_items_unique UNIQUE (collection_id, product_id),
  CONSTRAINT merchandising_collection_items_role_check
    CHECK (role IN ('hero', 'supporting'))
);

CREATE INDEX IF NOT EXISTS idx_merch_collection_items_product
  ON public.merchandising_collection_items (product_id);
CREATE INDEX IF NOT EXISTS idx_merch_collection_items_collection_role
  ON public.merchandising_collection_items (collection_id, role);
CREATE INDEX IF NOT EXISTS idx_merch_collections_type_active
  ON public.merchandising_collections (collection_type, is_active, display_priority);

-- ─── 3. Audit runs ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.merchandising_audit_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_at timestamptz NOT NULL DEFAULT now(),
  generation_version text NOT NULL DEFAULT '1a.1',
  proposal_rule_version text NOT NULL DEFAULT '1a.1',
  catalogue_snapshot_ref text,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_merch_audit_runs_generated
  ON public.merchandising_audit_runs (generated_at DESC);

-- ─── 4. Product proposals (admin-only dry-run) ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.merchandising_product_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_run_id uuid NOT NULL REFERENCES public.merchandising_audit_runs(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  proposed_tier text,
  proposed_collection_id uuid REFERENCES public.merchandising_collections(id) ON DELETE SET NULL,
  proposed_collection_role text,
  classification_reason text,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence text,
  match_status text NOT NULL DEFAULT 'matched',
  candidate_product_ids uuid[] DEFAULT ARRAY[]::uuid[],
  unmatched_label text,
  report_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  content_readiness_recommendation text,
  owner_decision_status text NOT NULL DEFAULT 'pending',
  owner_selected_tier text,
  owner_selected_collection_id uuid REFERENCES public.merchandising_collections(id) ON DELETE SET NULL,
  owner_selected_collection_role text,
  decision_note text,
  generated_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT merch_proposals_audit_product_unique UNIQUE (audit_run_id, product_id),
  CONSTRAINT merch_proposals_tier_check
    CHECK (
      proposed_tier IS NULL
      OR proposed_tier IN ('hero', 'core', 'local_store', 'hidden')
    ),
  CONSTRAINT merch_proposals_role_check
    CHECK (
      proposed_collection_role IS NULL
      OR proposed_collection_role IN ('hero', 'supporting')
    ),
  CONSTRAINT merch_proposals_owner_role_check
    CHECK (
      owner_selected_collection_role IS NULL
      OR owner_selected_collection_role IN ('hero', 'supporting')
    ),
  CONSTRAINT merch_proposals_owner_tier_check
    CHECK (
      owner_selected_tier IS NULL
      OR owner_selected_tier IN ('hero', 'core', 'local_store', 'hidden')
    ),
  CONSTRAINT merch_proposals_confidence_check
    CHECK (confidence IS NULL OR confidence IN ('high', 'medium', 'low')),
  CONSTRAINT merch_proposals_decision_check
    CHECK (owner_decision_status IN ('pending', 'approved', 'rejected', 'changed')),
  CONSTRAINT merch_proposals_match_status_check
    CHECK (match_status IN ('matched', 'ambiguous', 'unmatched', 'special_review'))
);

-- Allow unmatched rows without product_id (one per unmatched label per run)
CREATE UNIQUE INDEX IF NOT EXISTS idx_merch_proposals_unmatched_label
  ON public.merchandising_product_proposals (audit_run_id, unmatched_label)
  WHERE product_id IS NULL AND unmatched_label IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_merch_proposals_run_tier
  ON public.merchandising_product_proposals (audit_run_id, proposed_tier);
CREATE INDEX IF NOT EXISTS idx_merch_proposals_run_decision
  ON public.merchandising_product_proposals (audit_run_id, owner_decision_status);
CREATE INDEX IF NOT EXISTS idx_merch_proposals_product
  ON public.merchandising_product_proposals (product_id);

-- ─── 5. Seed three story-world collections (no items) ───────────────────────
INSERT INTO public.merchandising_collections (
  slug, title, description, collection_type, is_active, display_priority
) VALUES
  (
    'from-seed-to-oil',
    'From Seed to Oil',
    'Cold-pressed oils selected for their seed, traditional flavour, aroma and everyday kitchen use.',
    'story_world',
    true,
    10
  ),
  (
    'homemade-andhra-kitchen',
    'Homemade Andhra Kitchen',
    'Pickles, podis, snacks and sweets that bring familiar regional taste into busy modern homes.',
    'story_world',
    true,
    20
  ),
  (
    'heritage-and-natural-everyday-foods',
    'Heritage and Natural Everyday Foods',
    'Traditional grains, jaggery, honey and selected everyday foods with a distinct origin, process or way of use.',
    'story_world',
    true,
    30
  )
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  collection_type = EXCLUDED.collection_type,
  is_active = EXCLUDED.is_active,
  display_priority = EXCLUDED.display_priority,
  updated_at = now();

-- ─── 6. RLS — admin/manager only ────────────────────────────────────────────
ALTER TABLE public.merchandising_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchandising_collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchandising_audit_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchandising_product_proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage merchandising collections" ON public.merchandising_collections;
CREATE POLICY "Admins manage merchandising collections"
  ON public.merchandising_collections
  FOR ALL
  USING (private.has_admin_role(ARRAY['admin', 'manager']))
  WITH CHECK (private.has_admin_role(ARRAY['admin', 'manager']));

DROP POLICY IF EXISTS "Admins manage merchandising collection items" ON public.merchandising_collection_items;
CREATE POLICY "Admins manage merchandising collection items"
  ON public.merchandising_collection_items
  FOR ALL
  USING (private.has_admin_role(ARRAY['admin', 'manager']))
  WITH CHECK (private.has_admin_role(ARRAY['admin', 'manager']));

DROP POLICY IF EXISTS "Admins manage merchandising audit runs" ON public.merchandising_audit_runs;
CREATE POLICY "Admins manage merchandising audit runs"
  ON public.merchandising_audit_runs
  FOR ALL
  USING (private.has_admin_role(ARRAY['admin', 'manager']))
  WITH CHECK (private.has_admin_role(ARRAY['admin', 'manager']));

DROP POLICY IF EXISTS "Admins manage merchandising proposals" ON public.merchandising_product_proposals;
CREATE POLICY "Admins manage merchandising proposals"
  ON public.merchandising_product_proposals
  FOR ALL
  USING (private.has_admin_role(ARRAY['admin', 'manager']))
  WITH CHECK (private.has_admin_role(ARRAY['admin', 'manager']));

-- No public SELECT policies — storefront must not read these in Phase 1A.
