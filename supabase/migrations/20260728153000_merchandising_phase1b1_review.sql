-- Phase 1B1: owner review fields on merchandising proposals only.
-- Does NOT write products.merchandising_tier or collection memberships.

ALTER TABLE public.merchandising_product_proposals
  ADD COLUMN IF NOT EXISTS owner_inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS identity_assessment jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS readiness_scorecard jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS demand_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS hidden_reason_code text,
  ADD COLUMN IF NOT EXISTS pending_reason_group text,
  ADD COLUMN IF NOT EXISTS special_oil_recommendation text,
  ADD COLUMN IF NOT EXISTS review_phase text NOT NULL DEFAULT '1a',
  ADD COLUMN IF NOT EXISTS owner_decision_action text;

ALTER TABLE public.merchandising_product_proposals
  DROP CONSTRAINT IF EXISTS merch_proposals_hidden_reason_check;
ALTER TABLE public.merchandising_product_proposals
  ADD CONSTRAINT merch_proposals_hidden_reason_check
  CHECK (
    hidden_reason_code IS NULL
    OR hidden_reason_code IN (
      'duplicate',
      'draft',
      'zero_price',
      'missing_valid_variant',
      'discontinued',
      'incorrect_product_identity',
      'incomplete_catalogue_record',
      'unsuitable_for_public_sale',
      'intentionally_unpublished',
      'other'
    )
  );

ALTER TABLE public.merchandising_product_proposals
  DROP CONSTRAINT IF EXISTS merch_proposals_pending_group_check;
ALTER TABLE public.merchandising_product_proposals
  ADD CONSTRAINT merch_proposals_pending_group_check
  CHECK (
    pending_reason_group IS NULL
    OR pending_reason_group IN (
      'special_use_oil',
      'unclear_intended_use',
      'missing_pricing',
      'missing_product_identity',
      'missing_images',
      'draft',
      'supply_uncertainty',
      'catalogue_conflict',
      'requires_business_decision',
      'bundle_combo'
    )
  );

ALTER TABLE public.merchandising_product_proposals
  DROP CONSTRAINT IF EXISTS merch_proposals_decision_action_check;
ALTER TABLE public.merchandising_product_proposals
  ADD CONSTRAINT merch_proposals_decision_action_check
  CHECK (
    owner_decision_action IS NULL
    OR owner_decision_action IN (
      'approve_as_hero',
      'change_to_core',
      'change_to_local_store',
      'change_to_hidden',
      'keep_pending',
      'reject_proposal',
      'confirm_hidden',
      'approve_as_core'
    )
  );

COMMENT ON COLUMN public.merchandising_product_proposals.owner_inputs IS
  'Phase 1B1 owner-entered supply/cost/ops fields. Not written to products.';
COMMENT ON COLUMN public.merchandising_product_proposals.identity_assessment IS
  'Phase 1B1 identity verification findings (slug/title/copy conflicts).';
COMMENT ON COLUMN public.merchandising_product_proposals.readiness_scorecard IS
  'Phase 1B1 supply/commercial/demand/brand/ops/content scores. Missing costs = needs_owner_input.';

CREATE INDEX IF NOT EXISTS idx_merch_proposals_identity_conflict
  ON public.merchandising_product_proposals ((identity_assessment->>'has_conflict'))
  WHERE (identity_assessment->>'has_conflict') = 'true';
