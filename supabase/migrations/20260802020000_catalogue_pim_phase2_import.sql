-- Phase 2 PIM-lite: import runs, snapshots for rollback, field diffs.
-- Excel upload never auto-publishes; status flows draft → approved → published / rolled_back.

CREATE TABLE IF NOT EXISTS public.catalogue_import_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_mode text NOT NULL DEFAULT 'UPDATE_EXISTING'
    CHECK (import_mode IN ('UPDATE_EXISTING', 'ADD_AND_UPDATE', 'CONTROLLED_FULL_SYNC')),
  status text NOT NULL DEFAULT 'uploaded'
    CHECK (status IN (
      'uploaded', 'validated', 'draft', 'approved', 'publishing', 'published',
      'failed', 'cancelled', 'rolled_back'
    )),
  schema_version text,
  workbook_catalogue_version bigint,
  catalogue_version_before bigint,
  catalogue_version_after bigint,
  workbook_filename text,
  workbook_hash text,
  stale_workbook boolean NOT NULL DEFAULT false,
  error_count integer NOT NULL DEFAULT 0,
  warning_count integer NOT NULL DEFAULT 0,
  change_count integer NOT NULL DEFAULT 0,
  product_count integer NOT NULL DEFAULT 0,
  variant_count integer NOT NULL DEFAULT 0,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  parsed_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  validation_report jsonb NOT NULL DEFAULT '{}'::jsonb,
  diff_report jsonb NOT NULL DEFAULT '{}'::jsonb,
  snapshot_before jsonb,
  imported_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  published_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rollback_of_import_id uuid REFERENCES public.catalogue_import_runs(id) ON DELETE SET NULL,
  imported_at timestamptz NOT NULL DEFAULT now(),
  validated_at timestamptz,
  approved_at timestamptz,
  published_at timestamptz,
  rolled_back_at timestamptz,
  notes text
);

CREATE INDEX IF NOT EXISTS catalogue_import_runs_status_idx
  ON public.catalogue_import_runs (status, imported_at DESC);

CREATE TABLE IF NOT EXISTS public.catalogue_import_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id uuid NOT NULL REFERENCES public.catalogue_import_runs(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('product', 'pack', 'category', 'settings', 'batch')),
  entity_key text NOT NULL,
  product_code text,
  sku text,
  change_type text NOT NULL CHECK (change_type IN ('add', 'update', 'archive', 'skip', 'error')),
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error')),
  field_diffs jsonb NOT NULL DEFAULT '[]'::jsonb,
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS catalogue_import_changes_import_idx
  ON public.catalogue_import_changes (import_id, change_type);

ALTER TABLE public.catalogue_import_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogue_import_changes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS catalogue_import_runs_admin_all ON public.catalogue_import_runs;
CREATE POLICY catalogue_import_runs_admin_all
  ON public.catalogue_import_runs
  FOR ALL
  TO authenticated
  USING (private.has_admin_role(ARRAY['admin', 'manager']))
  WITH CHECK (private.has_admin_role(ARRAY['admin', 'manager']));

DROP POLICY IF EXISTS catalogue_import_changes_admin_all ON public.catalogue_import_changes;
CREATE POLICY catalogue_import_changes_admin_all
  ON public.catalogue_import_changes
  FOR ALL
  TO authenticated
  USING (private.has_admin_role(ARRAY['admin', 'manager']))
  WITH CHECK (private.has_admin_role(ARRAY['admin', 'manager']));

REVOKE ALL ON public.catalogue_import_runs FROM anon, public;
REVOKE ALL ON public.catalogue_import_changes FROM anon, public;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalogue_import_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalogue_import_changes TO authenticated;
