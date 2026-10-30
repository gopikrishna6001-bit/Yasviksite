/**
 * Thin mappers from Phase 1 DB rows → tax engine inputs.
 * Does not write. Safe while GST_LIVE_BILLING is OFF.
 */

export function mapTaxRuleVersionRow(row = {}) {
  if (!row) return null;
  return {
    id: row.id,
    tax_rule_id: row.tax_rule_id,
    version: row.version,
    hsn_sac: row.hsn_sac,
    description: row.description,
    tax_treatment: row.tax_treatment,
    gst_rate_bp: row.gst_rate_bp,
    cgst_rate_bp: row.cgst_rate_bp,
    sgst_rate_bp: row.sgst_rate_bp,
    igst_rate_bp: row.igst_rate_bp,
    effective_from: row.effective_from,
    effective_to: row.effective_to,
    source_type: row.source_type,
    source_reference: row.source_reference,
    conditions: row.conditions || {},
    status: row.status,
  };
}

export function mapClassificationRow(row = {}) {
  if (!row) return null;
  return {
    id: row.id,
    product_id: row.product_id,
    variant_sku: row.variant_sku,
    hsn_sac: row.hsn_sac,
    tax_rule_id: row.tax_rule_id,
    tax_rule_version_id: row.tax_rule_version_id,
    tax_treatment: row.tax_treatment,
    gst_rate_bp: row.gst_rate_bp,
    cgst_rate_bp: row.cgst_rate_bp,
    sgst_rate_bp: row.sgst_rate_bp,
    igst_rate_bp: row.igst_rate_bp,
    classification_status: row.classification_status,
    classification_confidence: row.classification_confidence,
    classification_source: row.classification_source,
    ai_suggestion: row.ai_suggestion || {},
  };
}

export function mapBusinessTaxProfileRow(row = {}) {
  if (!row) return null;
  return {
    id: row.id,
    legal_name: row.legal_name,
    gstin: row.gstin,
    state_code: row.state_code,
    state_name: row.state_name,
    registration_status: row.registration_status,
    gst_ready_mode: row.gst_ready_mode,
    gst_live_billing: row.gst_live_billing,
    gst_compliance_mode_start_date: row.gst_compliance_mode_start_date,
    suspended_from: row.suspended_from,
    notes: row.notes,
  };
}

export function parseSettingFlag(value) {
  if (value === true || value === false) return value;
  const s = String(value ?? '').trim().toLowerCase();
  if (s === 'true' || s === '1' || s === 'yes') return true;
  if (s === 'false' || s === '0' || s === 'no' || s === '') return false;
  return false;
}
