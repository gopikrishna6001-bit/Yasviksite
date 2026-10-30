/**
 * Versioned tax rule resolution.
 * An invoice dated D uses the rule version effective on D.
 * Never silently pick a random rate.
 */

import { dateInRange, parseIsoDate } from './money.js';
import { TAX_ERROR_CODE } from './constants.js';

function isActiveVersionStatus(status, { allowDraft = false } = {}) {
  const s = String(status || '').toUpperCase();
  if (s === 'ACTIVE') return true;
  if (s === 'DRAFT' && allowDraft) return true;
  return false;
}

/**
 * @param {object[]} versions - tax_rule_versions rows (or plain objects)
 * @param {string} invoiceDate - ISO date
 * @param {object} [opts]
 * @param {boolean} [opts.allowDraft=false]
 */
export function findEffectiveTaxRuleVersions(versions = [], invoiceDate, opts = {}) {
  const date = parseIsoDate(invoiceDate);
  if (!date) {
    return {
      ok: false,
      code: TAX_ERROR_CODE.MISSING_INVOICE_DATE,
      message: 'Cannot determine GST automatically. Invoice date required.',
      matches: [],
    };
  }

  const matches = (Array.isArray(versions) ? versions : []).filter((v) => {
    if (!v) return false;
    const status = String(v.status || '').toUpperCase();
    if (status === 'RETIRED' || status === 'SUPERSEDED') return false;
    if (status === 'DRAFT' && !opts.allowDraft) return false;
    if (status === 'ACTIVE' || (status === 'DRAFT' && opts.allowDraft)) {
      return dateInRange(date, v.effective_from || v.effectiveFrom, v.effective_to || v.effectiveTo);
    }
    // If status missing, only include when date range matches AND caller opts.insecureAllowMissingStatus
    if (!status && opts.insecureAllowMissingStatus) {
      return dateInRange(date, v.effective_from || v.effectiveFrom, v.effective_to || v.effectiveTo);
    }
    return false;
  });

  return { ok: true, date, matches };
}

/**
 * Resolve a single applicable version for a product classification + rule versions.
 * If multiple ACTIVE versions match the date → AMBIGUOUS (block).
 */
export function resolveTaxRuleForDate({
  invoiceDate,
  taxRuleVersions = [],
  preferredVersionId = null,
  hsnSac = null,
} = {}) {
  const dated = findEffectiveTaxRuleVersions(taxRuleVersions, invoiceDate);
  if (!dated.ok) return dated;

  let matches = dated.matches;
  if (hsnSac) {
    const hsn = String(hsnSac).trim();
    const hsnMatches = matches.filter((v) => {
      const vHsn = String(v.hsn_sac || v.hsnSac || '').trim();
      return !vHsn || vHsn === hsn;
    });
    if (hsnMatches.length) matches = hsnMatches;
  }

  if (preferredVersionId) {
    const preferred = matches.find(
      (v) => String(v.id) === String(preferredVersionId),
    );
    if (preferred) {
      return {
        ok: true,
        version: preferred,
        matches,
        explanation: `Using locked tax rule version ${preferred.id} (v${preferred.version}) effective on ${dated.date}.`,
      };
    }
  }

  if (matches.length === 0) {
    return {
      ok: false,
      code: TAX_ERROR_CODE.EXPIRED_TAX_RULE,
      message: 'No current tax rule available for this invoice date.',
      date: dated.date,
      matches: [],
    };
  }

  if (matches.length > 1) {
    return {
      ok: false,
      code: TAX_ERROR_CODE.AMBIGUOUS_CLASSIFICATION,
      message: 'Two or more tax rule versions apply on this date. Admin review required.',
      date: dated.date,
      matches,
    };
  }

  const version = matches[0];
  return {
    ok: true,
    version,
    matches,
    explanation: `Matched tax rule version ${version.id} (v${version.version}) for ${dated.date}; GST ${version.gst_rate_bp ?? version.gstRateBp} bp.`,
  };
}

/**
 * Build a new version payload without mutating the prior version.
 * Callers persist via INSERT — never UPDATE historical rate rows used by invoices.
 */
export function buildNextTaxRuleVersion(existingVersions = [], patch = {}) {
  const list = Array.isArray(existingVersions) ? existingVersions : [];
  const maxVersion = list.reduce((m, v) => Math.max(m, Number(v.version) || 0), 0);
  return {
    version: maxVersion + 1,
    status: patch.status || 'DRAFT',
    hsn_sac: patch.hsn_sac ?? patch.hsnSac ?? null,
    description: patch.description ?? null,
    tax_treatment: patch.tax_treatment ?? patch.taxTreatment ?? 'TAXABLE',
    gst_rate_bp: Number(patch.gst_rate_bp ?? patch.gstRateBp ?? 0),
    cgst_rate_bp: Number(patch.cgst_rate_bp ?? patch.cgstRateBp ?? 0),
    sgst_rate_bp: Number(patch.sgst_rate_bp ?? patch.sgstRateBp ?? 0),
    igst_rate_bp: Number(patch.igst_rate_bp ?? patch.igstRateBp ?? 0),
    effective_from: patch.effective_from ?? patch.effectiveFrom,
    effective_to: patch.effective_to ?? patch.effectiveTo ?? null,
    source_type: patch.source_type ?? patch.sourceType ?? 'ASSISTED',
    source_reference: patch.source_reference ?? patch.sourceReference ?? null,
    conditions: patch.conditions ?? {},
  };
}

export { isActiveVersionStatus };
