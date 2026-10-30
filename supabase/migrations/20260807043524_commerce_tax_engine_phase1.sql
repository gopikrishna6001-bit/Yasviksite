-- ============================================================================
-- Yasvik Commerce + Tax Engine — PHASE 1 (additive data model)
-- ============================================================================
-- Goals:
--   * Add GST/tax/sourcing/billing tables WITHOUT mutating commercial history
--   * Keep GST_LIVE_BILLING = false
--   * Default business registration to SUSPENDED (never assume ACTIVE)
--   * Classify existing orders as LEGACY_NO_GST (totals unchanged)
--   * Default product PRICE_TAX_MODE = TAX_NOT_APPLIED
--   * Do NOT seed authoritative GST rates / HSN schedules (data-driven later)
--   * Do NOT overwrite product costs, prices, margins, or inventory quantities
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0) Additive columns on live commercial tables (safe defaults only)
-- ---------------------------------------------------------------------------

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS price_tax_mode text NOT NULL DEFAULT 'TAX_NOT_APPLIED';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_price_tax_mode_check'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_price_tax_mode_check
      CHECK (price_tax_mode IN ('TAX_NOT_APPLIED', 'TAX_EXCLUSIVE', 'TAX_INCLUSIVE'));
  END IF;
END $$;

COMMENT ON COLUMN public.products.price_tax_mode IS
  'LEGACY default TAX_NOT_APPLIED until intentionally configured for GST billing. Does not change selling price.';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS invoice_tax_class text NOT NULL DEFAULT 'LEGACY_NO_GST',
  ADD COLUMN IF NOT EXISTS billing_document_type text NOT NULL DEFAULT 'LEGACY_INVOICE';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_invoice_tax_class_check'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_invoice_tax_class_check
      CHECK (invoice_tax_class IN (
        'LEGACY_NO_GST',
        'LEGACY',
        'NON_GST_RECORDED',
        'GST_TAX_INVOICE',
        'BILL_OF_SUPPLY',
        'PROFORMA',
        'ADJUSTMENT'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_billing_document_type_check'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_billing_document_type_check
      CHECK (billing_document_type IN (
        'LEGACY_INVOICE',
        'NORMAL_RECEIPT',
        'TAX_INVOICE',
        'BILL_OF_SUPPLY',
        'CREDIT_NOTE',
        'DEBIT_NOTE',
        'PROFORMA',
        'DELIVERY_NOTE'
      ));
  END IF;
END $$;

COMMENT ON COLUMN public.orders.invoice_tax_class IS
  'Historical classification only. LEGACY_NO_GST = GST was not separately collected/recorded. Never rewrite totals to fabricate GST.';
COMMENT ON COLUMN public.orders.billing_document_type IS
  'Document type label. Existing rows remain LEGACY_INVOICE. New GST tax invoices use parallel sales_invoices when live billing is enabled.';

-- No UPDATE on orders: ADD COLUMN ... DEFAULT classifies existing rows without firing
-- updated_at triggers or rewriting commercial totals.

ALTER TABLE public.stock_movements
  ADD COLUMN IF NOT EXISTS inventory_source_type text,
  ADD COLUMN IF NOT EXISTS source_document_type text,
  ADD COLUMN IF NOT EXISTS source_document_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stock_movements_inventory_source_type_check'
  ) THEN
    ALTER TABLE public.stock_movements
      ADD CONSTRAINT stock_movements_inventory_source_type_check
      CHECK (
        inventory_source_type IS NULL
        OR inventory_source_type IN (
          'GST_REGISTERED_SUPPLIER',
          'UNREGISTERED_SUPPLIER',
          'FARMER_DIRECT',
          'LOCAL_PRODUCER',
          'YASVIK_PRODUCTION',
          'CONTRACT_MANUFACTURER',
          'JOB_WORK',
          'CONSIGNMENT',
          'SAMPLE_FREE',
          'CUSTOMER_RETURN',
          'STOCK_TRANSFER',
          'OPENING_STOCK',
          'MANUAL_ADJUSTMENT',
          'SALE',
          'SUPPLIER_RETURN'
        )
      );
  END IF;
END $$;

COMMENT ON COLUMN public.stock_movements.inventory_source_type IS
  'Optional sourcing classification for inventory additions/returns. NULL on historical rows. Does not invent purchase GST.';

-- ---------------------------------------------------------------------------
-- 1) Business GST configuration (first-class; never assume ACTIVE)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.business_tax_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name text NOT NULL,
  trade_name text,
  gstin text,
  state_code text,
  state_name text,
  registration_type text,
  registration_status text NOT NULL DEFAULT 'UNKNOWN',
  effective_from date,
  suspended_from date,
  restored_from date,
  cancelled_from date,
  notes text,
  last_verified_at timestamptz,
  gst_ready_mode boolean NOT NULL DEFAULT false,
  gst_live_billing boolean NOT NULL DEFAULT false,
  gst_compliance_mode_start_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  CONSTRAINT business_tax_profile_registration_status_check
    CHECK (registration_status IN (
      'NOT_REGISTERED', 'ACTIVE', 'SUSPENDED', 'CANCELLED', 'UNKNOWN'
    )),
  CONSTRAINT business_tax_profile_live_requires_active CHECK (
    gst_live_billing = false
    OR (registration_status = 'ACTIVE' AND gst_compliance_mode_start_date IS NOT NULL)
  )
);

COMMENT ON TABLE public.business_tax_profile IS
  'Yasvik GST registration state. gst_live_billing must stay false until registration is ACTIVE and start date is set by authorized admin.';

CREATE UNIQUE INDEX IF NOT EXISTS business_tax_profile_singleton_idx
  ON public.business_tax_profile ((true));

INSERT INTO public.business_tax_profile (
  legal_name,
  trade_name,
  state_name,
  registration_status,
  suspended_from,
  notes,
  gst_ready_mode,
  gst_live_billing,
  gst_compliance_mode_start_date
)
SELECT
  'Yasvik Foods',
  'Yasvik',
  'Telangana',
  'SUSPENDED',
  CURRENT_DATE,
  'Seeded in Phase 1 as SUSPENDED per business instruction. GSTIN and effective dates must be entered by authorized admin after verification. Taxable GST invoicing remains blocked while gst_live_billing = false.',
  false,
  false,
  NULL
WHERE NOT EXISTS (SELECT 1 FROM public.business_tax_profile);

-- ---------------------------------------------------------------------------
-- 2) HSN master + versioned tax rules (no hard-coded legal rates)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.hsn_master (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hsn_sac text NOT NULL,
  description text,
  chapter text,
  is_active boolean NOT NULL DEFAULT true,
  source_type text NOT NULL DEFAULT 'ASSISTED',
  source_reference text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hsn_master_code_unique UNIQUE (hsn_sac),
  CONSTRAINT hsn_master_source_type_check
    CHECK (source_type IN ('AUTHORITATIVE', 'SECONDARY', 'ASSISTED'))
);

COMMENT ON TABLE public.hsn_master IS
  'HSN/SAC catalogue. Empty at Phase 1 — populate from official sources; never treat AI as legal authority.';

CREATE TABLE IF NOT EXISTS public.tax_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code text NOT NULL,
  hsn_sac text,
  description text,
  tax_treatment text NOT NULL DEFAULT 'TAXABLE',
  status text NOT NULL DEFAULT 'DRAFT',
  current_version integer NOT NULL DEFAULT 0,
  source_type text NOT NULL DEFAULT 'ASSISTED',
  source_reference text,
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  CONSTRAINT tax_rules_rule_code_unique UNIQUE (rule_code),
  CONSTRAINT tax_rules_tax_treatment_check
    CHECK (tax_treatment IN (
      'TAXABLE', 'EXEMPT', 'NIL_RATED', 'NON_GST', 'REVERSE_CHARGE', 'COMPOSITION'
    )),
  CONSTRAINT tax_rules_status_check
    CHECK (status IN ('DRAFT', 'ACTIVE', 'SUPERSEDED', 'RETIRED')),
  CONSTRAINT tax_rules_source_type_check
    CHECK (source_type IN ('AUTHORITATIVE', 'SECONDARY', 'ASSISTED'))
);

CREATE TABLE IF NOT EXISTS public.tax_rule_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_rule_id uuid NOT NULL REFERENCES public.tax_rules(id) ON DELETE CASCADE,
  version integer NOT NULL,
  hsn_sac text,
  description text,
  tax_treatment text NOT NULL,
  gst_rate_bp integer NOT NULL DEFAULT 0,
  cgst_rate_bp integer NOT NULL DEFAULT 0,
  sgst_rate_bp integer NOT NULL DEFAULT 0,
  igst_rate_bp integer NOT NULL DEFAULT 0,
  effective_from date NOT NULL,
  effective_to date,
  source_type text NOT NULL DEFAULT 'ASSISTED',
  source_reference text,
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'DRAFT',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  CONSTRAINT tax_rule_versions_unique UNIQUE (tax_rule_id, version),
  CONSTRAINT tax_rule_versions_status_check
    CHECK (status IN ('DRAFT', 'ACTIVE', 'SUPERSEDED', 'RETIRED')),
  CONSTRAINT tax_rule_versions_source_type_check
    CHECK (source_type IN ('AUTHORITATIVE', 'SECONDARY', 'ASSISTED')),
  CONSTRAINT tax_rule_versions_rates_nonneg CHECK (
    gst_rate_bp >= 0 AND cgst_rate_bp >= 0 AND sgst_rate_bp >= 0 AND igst_rate_bp >= 0
  ),
  CONSTRAINT tax_rule_versions_effective_range CHECK (
    effective_to IS NULL OR effective_to >= effective_from
  )
);

COMMENT ON COLUMN public.tax_rule_versions.gst_rate_bp IS
  'GST rate in basis points (500 = 5.00%). Stored as integers to avoid float drift. Not seeded with legal rates in Phase 1.';

CREATE INDEX IF NOT EXISTS tax_rule_versions_rule_effective_idx
  ON public.tax_rule_versions (tax_rule_id, effective_from, effective_to);

-- ---------------------------------------------------------------------------
-- 3) Product tax identity (separate from commercial category/price)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.product_tax_classifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_sku text,
  hsn_sac text,
  tax_rule_id uuid REFERENCES public.tax_rules(id) ON DELETE SET NULL,
  tax_rule_version_id uuid REFERENCES public.tax_rule_versions(id) ON DELETE SET NULL,
  tax_treatment text,
  gst_rate_bp integer,
  cgst_rate_bp integer,
  sgst_rate_bp integer,
  igst_rate_bp integer,
  effective_from date,
  effective_to date,
  classification_status text NOT NULL DEFAULT 'UNCLASSIFIED',
  classification_confidence text,
  classification_source text NOT NULL DEFAULT 'MANUAL',
  ai_suggestion jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text,
  last_verified_at timestamptz,
  last_verified_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_tax_classifications_status_check
    CHECK (classification_status IN (
      'UNCLASSIFIED', 'AI_SUGGESTED', 'MANUALLY_REVIEWED', 'VERIFIED', 'NEEDS_REVIEW', 'RETIRED'
    )),
  CONSTRAINT product_tax_classifications_confidence_check
    CHECK (
      classification_confidence IS NULL
      OR classification_confidence IN ('HIGH', 'MEDIUM', 'LOW')
    ),
  CONSTRAINT product_tax_classifications_source_check
    CHECK (classification_source IN ('MANUAL', 'AI_ASSISTED', 'IMPORT', 'SYSTEM'))
);

CREATE UNIQUE INDEX IF NOT EXISTS product_tax_classifications_product_active_uidx
  ON public.product_tax_classifications (product_id, COALESCE(variant_sku, ''))
  WHERE classification_status <> 'RETIRED';

CREATE INDEX IF NOT EXISTS product_tax_classifications_status_idx
  ON public.product_tax_classifications (classification_status);

COMMENT ON TABLE public.product_tax_classifications IS
  'Tax identity for products. Independent of shopping category. Only VERIFIED (or explicitly approved) classifications should drive automatic taxable GST billing.';

-- ---------------------------------------------------------------------------
-- 4) Vendors / suppliers
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name text NOT NULL,
  trade_name text,
  contact_name text,
  phone text,
  email text,
  address_line1 text,
  address_line2 text,
  city text,
  state_name text,
  state_code text,
  postal_code text,
  country text NOT NULL DEFAULT 'IN',
  supplier_type text NOT NULL DEFAULT 'OTHER',
  invoice_capability text NOT NULL DEFAULT 'UNKNOWN',
  e_invoice_applicable boolean,
  notes text,
  source_location text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  CONSTRAINT vendors_supplier_type_check
    CHECK (supplier_type IN (
      'GST_REGISTERED', 'UNREGISTERED', 'FARMER', 'LOCAL_PRODUCER',
      'MANUFACTURER', 'DISTRIBUTOR', 'JOB_WORKER', 'OTHER'
    )),
  CONSTRAINT vendors_invoice_capability_check
    CHECK (invoice_capability IN (
      'GST_INVOICE', 'NON_GST', 'SERVICE_INVOICE', 'NONE', 'UNKNOWN'
    ))
);

CREATE TABLE IF NOT EXISTS public.vendor_tax_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  gstin text,
  gst_registration_status text NOT NULL DEFAULT 'UNKNOWN',
  legal_name_on_gst text,
  state_code text,
  state_name text,
  notes text,
  last_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vendor_tax_profiles_vendor_unique UNIQUE (vendor_id),
  CONSTRAINT vendor_tax_profiles_status_check
    CHECK (gst_registration_status IN (
      'NOT_REGISTERED', 'ACTIVE', 'SUSPENDED', 'CANCELLED', 'UNKNOWN'
    )),
  CONSTRAINT vendor_tax_profiles_gstin_when_registered CHECK (
    gst_registration_status <> 'ACTIVE' OR (gstin IS NOT NULL AND length(trim(gstin)) > 0)
  )
);

COMMENT ON TABLE public.vendor_tax_profiles IS
  'GSTIN is optional for unregistered / farmer / local producers. Do not require GSTIN for non-GST suppliers.';

-- ---------------------------------------------------------------------------
-- 5) Purchases + potential ITC (never fabricate GST)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.purchase_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_type text NOT NULL,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  vendor_gstin text,
  supplier_name text,
  invoice_number text,
  invoice_date date,
  purchase_date date NOT NULL DEFAULT CURRENT_DATE,
  document_storage_path text,
  taxable_value_paise bigint NOT NULL DEFAULT 0,
  cgst_paise bigint NOT NULL DEFAULT 0,
  sgst_paise bigint NOT NULL DEFAULT 0,
  igst_paise bigint NOT NULL DEFAULT 0,
  total_gst_paise bigint NOT NULL DEFAULT 0,
  invoice_total_paise bigint NOT NULL DEFAULT 0,
  cost_total_paise bigint NOT NULL DEFAULT 0,
  itc_status text NOT NULL DEFAULT 'NOT_APPLICABLE',
  reconciliation_status text NOT NULL DEFAULT 'NOT_CHECKED',
  place_of_supply_state text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  CONSTRAINT purchase_invoices_type_check
    CHECK (purchase_type IN (
      'GST_PURCHASE', 'NON_GST_PURCHASE', 'FARMER_LOCAL', 'SAMPLE_FREE',
      'CONTRACT_MANUFACTURING', 'JOB_WORK_SERVICE', 'OTHER'
    )),
  CONSTRAINT purchase_invoices_itc_status_check
    CHECK (itc_status IN (
      'NOT_APPLICABLE', 'PENDING_REVIEW', 'MATCHED', 'ELIGIBLE_PENDING_CLAIM',
      'CLAIMED', 'NOT_ELIGIBLE', 'REVERSED', 'RECONCILIATION_REQUIRED'
    )),
  CONSTRAINT purchase_invoices_recon_status_check
    CHECK (reconciliation_status IN (
      'NOT_CHECKED', 'MATCHED', 'NOT_FOUND', 'MISMATCH', 'DUPLICATE', 'BLOCKED', 'REVIEW_REQUIRED'
    )),
  CONSTRAINT purchase_invoices_nonneg CHECK (
    taxable_value_paise >= 0 AND cgst_paise >= 0 AND sgst_paise >= 0
    AND igst_paise >= 0 AND total_gst_paise >= 0 AND invoice_total_paise >= 0
    AND cost_total_paise >= 0
  )
);

COMMENT ON TABLE public.purchase_invoices IS
  'Purchase documents. NON_GST / farmer / sample: GST=0, ITC=NOT_APPLICABLE. Does not overwrite products.purchase_rate_per_kg.';
COMMENT ON COLUMN public.purchase_invoices.total_gst_paise IS
  'Potential input GST amount only. Eligibility is separate (itc_status).';

CREATE TABLE IF NOT EXISTS public.purchase_invoice_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_invoice_id uuid NOT NULL REFERENCES public.purchase_invoices(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  variant_sku text,
  description text,
  hsn_sac text,
  quantity numeric,
  unit text,
  taxable_value_paise bigint NOT NULL DEFAULT 0,
  gst_rate_bp integer,
  cgst_paise bigint NOT NULL DEFAULT 0,
  sgst_paise bigint NOT NULL DEFAULT 0,
  igst_paise bigint NOT NULL DEFAULT 0,
  line_total_paise bigint NOT NULL DEFAULT 0,
  existing_product_cost_paise bigint,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.purchase_tax_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_invoice_id uuid NOT NULL REFERENCES public.purchase_invoices(id) ON DELETE CASCADE,
  purchase_invoice_line_id uuid REFERENCES public.purchase_invoice_lines(id) ON DELETE CASCADE,
  tax_component text NOT NULL,
  rate_bp integer NOT NULL DEFAULT 0,
  amount_paise bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT purchase_tax_lines_component_check
    CHECK (tax_component IN ('CGST', 'SGST', 'IGST', 'CESS', 'OTHER'))
);

CREATE TABLE IF NOT EXISTS public.input_tax_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_invoice_id uuid NOT NULL REFERENCES public.purchase_invoices(id) ON DELETE CASCADE,
  purchase_invoice_line_id uuid REFERENCES public.purchase_invoice_lines(id) ON DELETE SET NULL,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  vendor_gstin text,
  invoice_number text,
  invoice_date date,
  taxable_value_paise bigint NOT NULL DEFAULT 0,
  cgst_paise bigint NOT NULL DEFAULT 0,
  sgst_paise bigint NOT NULL DEFAULT 0,
  igst_paise bigint NOT NULL DEFAULT 0,
  total_gst_paise bigint NOT NULL DEFAULT 0,
  itc_status text NOT NULL DEFAULT 'PENDING_REVIEW',
  potential_itc_paise bigint NOT NULL DEFAULT 0,
  claimed_itc_paise bigint NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT input_tax_ledger_itc_status_check
    CHECK (itc_status IN (
      'NOT_APPLICABLE', 'PENDING_REVIEW', 'MATCHED', 'ELIGIBLE_PENDING_CLAIM',
      'CLAIMED', 'NOT_ELIGIBLE', 'REVERSED', 'RECONCILIATION_REQUIRED'
    ))
);

COMMENT ON COLUMN public.input_tax_ledger.potential_itc_paise IS
  'POTENTIAL INPUT TAX CREDIT only — not a legal claim until reconciliation/eligibility confirmed.';

CREATE TABLE IF NOT EXISTS public.itc_reconciliation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_invoice_id uuid REFERENCES public.purchase_invoices(id) ON DELETE SET NULL,
  input_tax_ledger_id uuid REFERENCES public.input_tax_ledger(id) ON DELETE SET NULL,
  supplier_gstin text,
  invoice_number text,
  invoice_date date,
  taxable_value_paise bigint,
  gst_paise bigint,
  reconciliation_status text NOT NULL DEFAULT 'NOT_CHECKED',
  external_source text,
  external_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  reviewed_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT itc_reconciliation_status_check
    CHECK (reconciliation_status IN (
      'NOT_CHECKED', 'MATCHED', 'NOT_FOUND', 'MISMATCH', 'DUPLICATE', 'BLOCKED', 'REVIEW_REQUIRED'
    ))
);

-- ---------------------------------------------------------------------------
-- 6) Production / job work / consignment scaffolding
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.production_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_code text NOT NULL,
  finished_product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  finished_variant_sku text,
  recipe_name text,
  recipe jsonb NOT NULL DEFAULT '{}'::jsonb,
  input_cost_paise bigint NOT NULL DEFAULT 0,
  wastage_qty numeric,
  yield_qty numeric,
  finished_qty numeric,
  packaging_cost_paise bigint NOT NULL DEFAULT 0,
  labour_overhead_paise bigint NOT NULL DEFAULT 0,
  batch_cost_paise bigint NOT NULL DEFAULT 0,
  cost_per_unit_paise bigint,
  status text NOT NULL DEFAULT 'DRAFT',
  produced_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  CONSTRAINT production_batches_batch_code_unique UNIQUE (batch_code),
  CONSTRAINT production_batches_status_check
    CHECK (status IN ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'))
);

COMMENT ON TABLE public.production_batches IS
  'Homemade / Yasvik production. Input GST stays on input purchases; finished goods get independent tax classification. Never copy input GST rate to finished product.';

CREATE TABLE IF NOT EXISTS public.production_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_batch_id uuid NOT NULL REFERENCES public.production_batches(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  variant_sku text,
  description text,
  quantity numeric NOT NULL DEFAULT 0,
  unit text,
  input_cost_paise bigint NOT NULL DEFAULT 0,
  purchase_invoice_id uuid REFERENCES public.purchase_invoices(id) ON DELETE SET NULL,
  purchase_invoice_line_id uuid REFERENCES public.purchase_invoice_lines(id) ON DELETE SET NULL,
  input_gst_reference_paise bigint NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.production_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_batch_id uuid NOT NULL REFERENCES public.production_batches(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  variant_sku text,
  quantity numeric NOT NULL DEFAULT 0,
  unit text,
  cost_per_unit_paise bigint,
  stock_movement_id uuid REFERENCES public.stock_movements(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.job_work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_code text NOT NULL,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'DRAFT',
  material_sent_at timestamptz,
  material_returned_at timestamptz,
  wastage_qty numeric,
  processing_charge_paise bigint NOT NULL DEFAULT 0,
  service_purchase_invoice_id uuid REFERENCES public.purchase_invoices(id) ON DELETE SET NULL,
  production_batch_id uuid REFERENCES public.production_batches(id) ON DELETE SET NULL,
  materials jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  CONSTRAINT job_work_orders_job_code_unique UNIQUE (job_code),
  CONSTRAINT job_work_orders_status_check
    CHECK (status IN ('DRAFT', 'MATERIALS_SENT', 'IN_PROCESS', 'RETURNED', 'CLOSED', 'CANCELLED'))
);

COMMENT ON TABLE public.job_work_orders IS
  'Yasvik owns raw material; third party processes. Distinct from contract manufacturing (treated as supplier purchase).';

CREATE TABLE IF NOT EXISTS public.consignment_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  variant_sku text,
  quantity_received numeric NOT NULL DEFAULT 0,
  quantity_sold numeric NOT NULL DEFAULT 0,
  quantity_returned numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'OPEN',
  received_at timestamptz NOT NULL DEFAULT now(),
  settled_purchase_invoice_id uuid REFERENCES public.purchase_invoices(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT consignment_lots_status_check
    CHECK (status IN ('OPEN', 'PARTIAL', 'SETTLED', 'RETURNED', 'CANCELLED'))
);

COMMENT ON TABLE public.consignment_lots IS
  'Consignment stock is not a normal purchase until settled/sold.';

-- ---------------------------------------------------------------------------
-- 7) Customer tax profiles + GST-ready sales invoices (parallel to orders)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.customer_tax_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  customer_type text NOT NULL DEFAULT 'RETAIL_CUSTOMER',
  gstin text,
  legal_name text,
  billing_address jsonb NOT NULL DEFAULT '{}'::jsonb,
  state_name text,
  state_code text,
  place_of_supply_state text,
  gst_registration_status text NOT NULL DEFAULT 'NOT_REGISTERED',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_tax_profiles_customer_unique UNIQUE (customer_id),
  CONSTRAINT customer_tax_profiles_type_check
    CHECK (customer_type IN (
      'RETAIL_CUSTOMER', 'BUSINESS_UNREGISTERED', 'BUSINESS_REGISTERED', 'EXPORT_OTHER'
    )),
  CONSTRAINT customer_tax_profiles_status_check
    CHECK (gst_registration_status IN (
      'NOT_REGISTERED', 'ACTIVE', 'SUSPENDED', 'CANCELLED', 'UNKNOWN'
    ))
);

COMMENT ON TABLE public.customer_tax_profiles IS
  'GSTIN not required for ordinary retail customers.';

CREATE TABLE IF NOT EXISTS public.invoice_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_code text NOT NULL,
  financial_year text NOT NULL,
  invoice_type text NOT NULL,
  branch_code text NOT NULL DEFAULT 'MAIN',
  prefix text NOT NULL,
  next_sequence bigint NOT NULL DEFAULT 1,
  pad_width integer NOT NULL DEFAULT 5,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invoice_sequences_unique UNIQUE (series_code, financial_year, invoice_type, branch_code),
  CONSTRAINT invoice_sequences_next_positive CHECK (next_sequence >= 1)
);

COMMENT ON TABLE public.invoice_sequences IS
  'Configurable GST invoice numbering. Does not renumber historical LEGACY order_number values.';

CREATE TABLE IF NOT EXISTS public.sales_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_type text NOT NULL DEFAULT 'TAX_INVOICE',
  invoice_number text,
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  financial_year text,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_gstin text,
  customer_legal_name text,
  place_of_supply_state text,
  supplier_state text,
  billing_document_status text NOT NULL DEFAULT 'DRAFT',
  price_tax_mode text NOT NULL DEFAULT 'TAX_EXCLUSIVE',
  gross_value_paise bigint NOT NULL DEFAULT 0,
  discount_paise bigint NOT NULL DEFAULT 0,
  taxable_value_paise bigint NOT NULL DEFAULT 0,
  cgst_paise bigint NOT NULL DEFAULT 0,
  sgst_paise bigint NOT NULL DEFAULT 0,
  igst_paise bigint NOT NULL DEFAULT 0,
  total_tax_paise bigint NOT NULL DEFAULT 0,
  round_off_paise bigint NOT NULL DEFAULT 0,
  net_payable_paise bigint NOT NULL DEFAULT 0,
  tax_decision jsonb NOT NULL DEFAULT '{}'::jsonb,
  irn text,
  irn_ack_number text,
  irn_ack_date timestamptz,
  signed_qr_data text,
  e_invoice_status text NOT NULL DEFAULT 'NOT_APPLICABLE',
  e_invoice_error jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  finalized_at timestamptz,
  finalized_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  CONSTRAINT sales_invoices_type_check
    CHECK (invoice_type IN (
      'LEGACY_INVOICE', 'NORMAL_RECEIPT', 'TAX_INVOICE', 'BILL_OF_SUPPLY',
      'CREDIT_NOTE', 'DEBIT_NOTE', 'PROFORMA', 'DELIVERY_NOTE'
    )),
  CONSTRAINT sales_invoices_status_check
    CHECK (billing_document_status IN (
      'DRAFT', 'VALIDATED', 'FINALIZED', 'CANCELLED', 'BLOCKED'
    )),
  CONSTRAINT sales_invoices_price_tax_mode_check
    CHECK (price_tax_mode IN ('TAX_NOT_APPLIED', 'TAX_EXCLUSIVE', 'TAX_INCLUSIVE')),
  CONSTRAINT sales_invoices_einvoice_status_check
    CHECK (e_invoice_status IN (
      'NOT_APPLICABLE', 'PENDING', 'GENERATED', 'CANCELLED', 'ERROR'
    ))
);

CREATE UNIQUE INDEX IF NOT EXISTS sales_invoices_number_unique_idx
  ON public.sales_invoices (invoice_number)
  WHERE invoice_number IS NOT NULL AND billing_document_status <> 'CANCELLED';

CREATE INDEX IF NOT EXISTS sales_invoices_order_id_idx
  ON public.sales_invoices (order_id);

COMMENT ON TABLE public.sales_invoices IS
  'GST-ready billing documents. Parallel to legacy orders. Finalization must respect business_tax_profile.gst_live_billing and registration_status.';

CREATE TABLE IF NOT EXISTS public.sales_invoice_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_invoice_id uuid NOT NULL REFERENCES public.sales_invoices(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  variant_sku text,
  description text,
  hsn_sac text,
  quantity numeric NOT NULL DEFAULT 0,
  unit text,
  gross_value_paise bigint NOT NULL DEFAULT 0,
  discount_paise bigint NOT NULL DEFAULT 0,
  taxable_value_paise bigint NOT NULL DEFAULT 0,
  tax_rule_id uuid REFERENCES public.tax_rules(id) ON DELETE SET NULL,
  tax_rule_version_id uuid REFERENCES public.tax_rule_versions(id) ON DELETE SET NULL,
  gst_rate_bp integer,
  cgst_paise bigint NOT NULL DEFAULT 0,
  sgst_paise bigint NOT NULL DEFAULT 0,
  igst_paise bigint NOT NULL DEFAULT 0,
  line_total_paise bigint NOT NULL DEFAULT 0,
  tax_explanation jsonb NOT NULL DEFAULT '{}'::jsonb,
  discount_kind text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_invoice_lines_discount_kind_check
    CHECK (
      discount_kind IS NULL
      OR discount_kind IN (
        'LINE', 'ORDER', 'PROMOTIONAL', 'COUPON', 'LOYALTY', 'FREE_ITEM', 'COMBO', 'OTHER'
      )
    )
);

CREATE TABLE IF NOT EXISTS public.sales_tax_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_invoice_id uuid NOT NULL REFERENCES public.sales_invoices(id) ON DELETE CASCADE,
  sales_invoice_line_id uuid REFERENCES public.sales_invoice_lines(id) ON DELETE CASCADE,
  tax_component text NOT NULL,
  rate_bp integer NOT NULL DEFAULT 0,
  amount_paise bigint NOT NULL DEFAULT 0,
  tax_rule_version_id uuid REFERENCES public.tax_rule_versions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_tax_lines_component_check
    CHECK (tax_component IN ('CGST', 'SGST', 'IGST', 'CESS', 'OTHER'))
);

CREATE TABLE IF NOT EXISTS public.credit_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_number text,
  original_sales_invoice_id uuid NOT NULL REFERENCES public.sales_invoices(id) ON DELETE RESTRICT,
  reason text,
  credit_date date NOT NULL DEFAULT CURRENT_DATE,
  returned_quantity numeric,
  taxable_value_adjustment_paise bigint NOT NULL DEFAULT 0,
  cgst_adjustment_paise bigint NOT NULL DEFAULT 0,
  sgst_adjustment_paise bigint NOT NULL DEFAULT 0,
  igst_adjustment_paise bigint NOT NULL DEFAULT 0,
  total_tax_adjustment_paise bigint NOT NULL DEFAULT 0,
  refund_amount_paise bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'DRAFT',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  CONSTRAINT credit_notes_status_check
    CHECK (status IN ('DRAFT', 'FINALIZED', 'CANCELLED'))
);

CREATE TABLE IF NOT EXISTS public.debit_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  debit_note_number text,
  original_sales_invoice_id uuid NOT NULL REFERENCES public.sales_invoices(id) ON DELETE RESTRICT,
  reason text,
  debit_date date NOT NULL DEFAULT CURRENT_DATE,
  taxable_value_adjustment_paise bigint NOT NULL DEFAULT 0,
  cgst_adjustment_paise bigint NOT NULL DEFAULT 0,
  sgst_adjustment_paise bigint NOT NULL DEFAULT 0,
  igst_adjustment_paise bigint NOT NULL DEFAULT 0,
  total_tax_adjustment_paise bigint NOT NULL DEFAULT 0,
  amount_paise bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'DRAFT',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  CONSTRAINT debit_notes_status_check
    CHECK (status IN ('DRAFT', 'FINALIZED', 'CANCELLED'))
);

COMMENT ON TABLE public.credit_notes IS
  'References original sales invoice; never deletes or rewrites the original.';
COMMENT ON TABLE public.debit_notes IS
  'References original sales invoice; never deletes or rewrites the original.';

-- ---------------------------------------------------------------------------
-- 8) Tax source documents + audit trail
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tax_source_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  source_type text NOT NULL DEFAULT 'ASSISTED',
  authority text,
  reference_url text,
  document_storage_path text,
  effective_from date,
  effective_to date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  CONSTRAINT tax_source_documents_source_type_check
    CHECK (source_type IN ('AUTHORITATIVE', 'SECONDARY', 'ASSISTED'))
);

CREATE TABLE IF NOT EXISTS public.tax_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  field_name text,
  previous_value jsonb,
  new_value jsonb,
  reason text,
  actor_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tax_audit_log_entity_idx
  ON public.tax_audit_log (entity_type, entity_id, created_at DESC);

COMMENT ON TABLE public.tax_audit_log IS
  'Append-only style audit for tax-sensitive changes. Application must insert; do not silently overwrite tax fields.';

-- ---------------------------------------------------------------------------
-- 9) Feature flags in app_settings (GST live OFF; start date not invented)
-- ---------------------------------------------------------------------------

INSERT INTO public.app_settings (setting_key, setting_value, data_type, description, key, value)
VALUES
  (
    'gst_live_billing',
    'false',
    'boolean',
    'When false, taxable GST invoices cannot be finalized for normal sales. Phase 1 default.',
    'gst_live_billing',
    'false'
  ),
  (
    'gst_ready_mode',
    'false',
    'boolean',
    'True when tax engine services are ready. Schema-only Phase 1 leaves this false.',
    'gst_ready_mode',
    'false'
  ),
  (
    'gst_compliance_mode_start_date',
    '',
    'string',
    'Authorized admin sets actual GST compliance start date. Empty until confirmed — do not invent.',
    'gst_compliance_mode_start_date',
    ''
  ),
  (
    'commerce_tax_schema_phase',
    '1',
    'string',
    'Commerce/tax engine schema phase marker.',
    'commerce_tax_schema_phase',
    '1'
  )
ON CONFLICT (setting_key) DO UPDATE
SET
  setting_value = EXCLUDED.setting_value,
  data_type = EXCLUDED.data_type,
  description = EXCLUDED.description,
  key = EXCLUDED.key,
  value = EXCLUDED.value,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 10) Private storage for tax / vendor GST documents
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tax-documents',
  'tax-documents',
  false,
  15728640,
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "tax_documents_admin_select" ON storage.objects;
CREATE POLICY "tax_documents_admin_select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'tax-documents'
  AND private.has_admin_role(ARRAY['admin', 'manager'])
);

DROP POLICY IF EXISTS "tax_documents_admin_insert" ON storage.objects;
CREATE POLICY "tax_documents_admin_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'tax-documents'
  AND private.has_admin_role(ARRAY['admin', 'manager'])
);

DROP POLICY IF EXISTS "tax_documents_admin_update" ON storage.objects;
CREATE POLICY "tax_documents_admin_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'tax-documents'
  AND private.has_admin_role(ARRAY['admin', 'manager'])
)
WITH CHECK (
  bucket_id = 'tax-documents'
  AND private.has_admin_role(ARRAY['admin', 'manager'])
);

DROP POLICY IF EXISTS "tax_documents_admin_delete" ON storage.objects;
CREATE POLICY "tax_documents_admin_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'tax-documents'
  AND private.has_admin_role(ARRAY['admin'])
);

-- ---------------------------------------------------------------------------
-- 11) RLS — tax admin surfaces (no anon access; do not weaken existing RLS)
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'business_tax_profile',
    'hsn_master',
    'tax_rules',
    'tax_rule_versions',
    'product_tax_classifications',
    'vendors',
    'vendor_tax_profiles',
    'purchase_invoices',
    'purchase_invoice_lines',
    'purchase_tax_lines',
    'input_tax_ledger',
    'itc_reconciliation',
    'production_batches',
    'production_inputs',
    'production_outputs',
    'job_work_orders',
    'consignment_lots',
    'customer_tax_profiles',
    'invoice_sequences',
    'sales_invoices',
    'sales_invoice_lines',
    'sales_tax_lines',
    'credit_notes',
    'debit_notes',
    'tax_source_documents',
    'tax_audit_log'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, public', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
  END LOOP;
END $$;

-- business_tax_profile: admin-only writes (registration / live switch)
DROP POLICY IF EXISTS business_tax_profile_admin_select ON public.business_tax_profile;
CREATE POLICY business_tax_profile_admin_select
  ON public.business_tax_profile FOR SELECT TO authenticated
  USING (private.has_admin_role(ARRAY['admin', 'manager']));

DROP POLICY IF EXISTS business_tax_profile_admin_write ON public.business_tax_profile;
CREATE POLICY business_tax_profile_admin_write
  ON public.business_tax_profile FOR ALL TO authenticated
  USING (private.has_admin_role(ARRAY['admin']))
  WITH CHECK (private.has_admin_role(ARRAY['admin']));

-- Generic admin+manager manage for remaining tax tables
DO $$
DECLARE
  t text;
  pol text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'hsn_master',
    'tax_rules',
    'tax_rule_versions',
    'product_tax_classifications',
    'vendors',
    'vendor_tax_profiles',
    'purchase_invoices',
    'purchase_invoice_lines',
    'purchase_tax_lines',
    'input_tax_ledger',
    'itc_reconciliation',
    'production_batches',
    'production_inputs',
    'production_outputs',
    'job_work_orders',
    'consignment_lots',
    'customer_tax_profiles',
    'invoice_sequences',
    'sales_invoices',
    'sales_invoice_lines',
    'sales_tax_lines',
    'credit_notes',
    'debit_notes',
    'tax_source_documents',
    'tax_audit_log'
  ]
  LOOP
    pol := t || '_admin_all';
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (private.has_admin_role(ARRAY[''admin'', ''manager''])) WITH CHECK (private.has_admin_role(ARRAY[''admin'', ''manager'']))',
      pol, t
    );
  END LOOP;
END $$;

-- Cashier read-only on classifications (POS will need later; no write)
DROP POLICY IF EXISTS product_tax_classifications_cashier_select ON public.product_tax_classifications;
CREATE POLICY product_tax_classifications_cashier_select
  ON public.product_tax_classifications FOR SELECT TO authenticated
  USING (private.has_admin_role(ARRAY['admin', 'manager', 'cashier']));

DROP POLICY IF EXISTS business_tax_profile_cashier_select ON public.business_tax_profile;
CREATE POLICY business_tax_profile_cashier_select
  ON public.business_tax_profile FOR SELECT TO authenticated
  USING (private.has_admin_role(ARRAY['admin', 'manager', 'cashier']));
