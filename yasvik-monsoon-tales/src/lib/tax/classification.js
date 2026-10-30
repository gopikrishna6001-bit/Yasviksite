/**
 * Product tax classification gates.
 * AI may suggest; only VERIFIED (or explicit admin override) drives auto taxable billing.
 */

import {
  AUTO_BILLING_CLASSIFICATION_STATUSES,
  CLASSIFICATION_STATUS,
  TAX_ERROR_CODE,
} from './constants.js';

export function normalizeClassificationStatus(status) {
  const s = String(status || CLASSIFICATION_STATUS.UNCLASSIFIED).toUpperCase();
  return CLASSIFICATION_STATUS[s] || CLASSIFICATION_STATUS.UNCLASSIFIED;
}

export function canAutoApplyClassification(classification = {}, opts = {}) {
  const status = normalizeClassificationStatus(
    classification.classification_status || classification.classificationStatus,
  );

  if (AUTO_BILLING_CLASSIFICATION_STATUSES.includes(status)) {
    return { ok: true, status, requiresAdminConfirmation: false };
  }

  if (
    opts.allowManuallyReviewedWithAdminConfirm
    && status === CLASSIFICATION_STATUS.MANUALLY_REVIEWED
    && opts.adminConfirmed === true
  ) {
    return { ok: true, status, requiresAdminConfirmation: true };
  }

  if (status === CLASSIFICATION_STATUS.NEEDS_REVIEW) {
    return {
      ok: false,
      status,
      code: TAX_ERROR_CODE.CLASSIFICATION_NEEDS_REVIEW,
      message: 'Tax classification requires confirmation.',
    };
  }

  if (status === CLASSIFICATION_STATUS.AI_SUGGESTED) {
    return {
      ok: false,
      status,
      code: TAX_ERROR_CODE.CLASSIFICATION_NOT_VERIFIED,
      message: 'AI suggestion is not legal authority. Admin must confirm tax classification.',
    };
  }

  if (status === CLASSIFICATION_STATUS.UNCLASSIFIED || status === CLASSIFICATION_STATUS.RETIRED) {
    return {
      ok: false,
      status,
      code: TAX_ERROR_CODE.CLASSIFICATION_NOT_VERIFIED,
      message: 'Product tax classification is not verified for taxable GST billing.',
    };
  }

  if (status === CLASSIFICATION_STATUS.MANUALLY_REVIEWED && !opts.adminConfirmed) {
    return {
      ok: false,
      status,
      code: TAX_ERROR_CODE.ADMIN_OVERRIDE_REQUIRED,
      message: 'Manually reviewed classification requires explicit administrator confirmation before taxable invoicing.',
      requiresAdminConfirmation: true,
    };
  }

  return {
    ok: false,
    status,
    code: TAX_ERROR_CODE.CLASSIFICATION_NOT_VERIFIED,
    message: 'Product tax classification is not approved for automatic taxable GST billing.',
  };
}

export function assertClassificationHasHsn(classification = {}) {
  const hsn = String(classification.hsn_sac || classification.hsnSac || '').trim();
  if (!hsn) {
    return {
      ok: false,
      code: TAX_ERROR_CODE.MISSING_HSN,
      message: 'Cannot determine GST automatically. HSN required.',
    };
  }
  return { ok: true, hsnSac: hsn };
}

/**
 * Detect ambiguous candidate set (e.g. classifier returned multiple HIGH options).
 */
export function assessClassificationAmbiguity(candidates = []) {
  const list = Array.isArray(candidates) ? candidates : [];
  const high = list.filter((c) => String(c.confidence || '').toUpperCase() === 'HIGH');
  if (high.length > 1) {
    return {
      ambiguous: true,
      code: TAX_ERROR_CODE.AMBIGUOUS_CLASSIFICATION,
      message: 'Two possible classifications found. Admin review required.',
      candidates: high,
    };
  }
  if (list.length > 1 && high.length === 0) {
    const medium = list.filter((c) => String(c.confidence || '').toUpperCase() === 'MEDIUM');
    if (medium.length > 1) {
      return {
        ambiguous: true,
        code: TAX_ERROR_CODE.AMBIGUOUS_CLASSIFICATION,
        message: 'Multiple medium-confidence classifications. Admin review required.',
        candidates: medium,
      };
    }
  }
  return { ambiguous: false, candidates: list };
}
