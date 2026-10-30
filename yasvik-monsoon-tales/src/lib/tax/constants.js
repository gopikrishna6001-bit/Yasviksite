/**
 * Yasvik tax engine — shared constants.
 * Rates are NEVER hard-coded here. Only statuses, treatments, and error codes.
 */

export const REGISTRATION_STATUS = Object.freeze({
  NOT_REGISTERED: 'NOT_REGISTERED',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  CANCELLED: 'CANCELLED',
  UNKNOWN: 'UNKNOWN',
});

export const PRICE_TAX_MODE = Object.freeze({
  TAX_NOT_APPLIED: 'TAX_NOT_APPLIED',
  TAX_EXCLUSIVE: 'TAX_EXCLUSIVE',
  TAX_INCLUSIVE: 'TAX_INCLUSIVE',
});

export const CLASSIFICATION_STATUS = Object.freeze({
  UNCLASSIFIED: 'UNCLASSIFIED',
  AI_SUGGESTED: 'AI_SUGGESTED',
  MANUALLY_REVIEWED: 'MANUALLY_REVIEWED',
  VERIFIED: 'VERIFIED',
  NEEDS_REVIEW: 'NEEDS_REVIEW',
  RETIRED: 'RETIRED',
});

/** Statuses allowed for automatic taxable GST billing (no admin override). */
export const AUTO_BILLING_CLASSIFICATION_STATUSES = Object.freeze([
  CLASSIFICATION_STATUS.VERIFIED,
]);

export const TAX_TREATMENT = Object.freeze({
  TAXABLE: 'TAXABLE',
  EXEMPT: 'EXEMPT',
  NIL_RATED: 'NIL_RATED',
  NON_GST: 'NON_GST',
  REVERSE_CHARGE: 'REVERSE_CHARGE',
  COMPOSITION: 'COMPOSITION',
});

export const SOURCE_TYPE = Object.freeze({
  AUTHORITATIVE: 'AUTHORITATIVE',
  SECONDARY: 'SECONDARY',
  ASSISTED: 'ASSISTED',
});

export const DISCOUNT_KIND = Object.freeze({
  LINE: 'LINE',
  ORDER: 'ORDER',
  PROMOTIONAL: 'PROMOTIONAL',
  COUPON: 'COUPON',
  LOYALTY: 'LOYALTY',
  FREE_ITEM: 'FREE_ITEM',
  COMBO: 'COMBO',
  OTHER: 'OTHER',
});

/**
 * How a discount interacts with tax base.
 * Callers must choose explicitly — the engine does not invent legal treatment.
 */
export const DISCOUNT_TAX_APPLICATION = Object.freeze({
  /** Discount reduces taxable value before GST (common taxable-supply pattern). */
  REDUCE_TAXABLE_BASE: 'REDUCE_TAXABLE_BASE',
  /** Discount applied after tax on payable only — tax unchanged. Requires explicit choice. */
  POST_TAX_PAYABLE_ONLY: 'POST_TAX_PAYABLE_ONLY',
  /** Engine cannot proceed without an explicit application mode. */
  UNSPECIFIED: 'UNSPECIFIED',
});

export const SUPPLY_TAX_SPLIT = Object.freeze({
  INTRA_STATE: 'INTRA_STATE', // CGST + SGST
  INTER_STATE: 'INTER_STATE', // IGST
  UNKNOWN: 'UNKNOWN',
});

export const TAX_ERROR_CODE = Object.freeze({
  GST_LIVE_BILLING_OFF: 'GST_LIVE_BILLING_OFF',
  REGISTRATION_NOT_ACTIVE: 'REGISTRATION_NOT_ACTIVE',
  REGISTRATION_SUSPENDED: 'REGISTRATION_SUSPENDED',
  REGISTRATION_UNKNOWN: 'REGISTRATION_UNKNOWN',
  MISSING_HSN: 'MISSING_HSN',
  MISSING_TAX_RULE: 'MISSING_TAX_RULE',
  EXPIRED_TAX_RULE: 'EXPIRED_TAX_RULE',
  AMBIGUOUS_CLASSIFICATION: 'AMBIGUOUS_CLASSIFICATION',
  CLASSIFICATION_NOT_VERIFIED: 'CLASSIFICATION_NOT_VERIFIED',
  CLASSIFICATION_NEEDS_REVIEW: 'CLASSIFICATION_NEEDS_REVIEW',
  MISSING_PLACE_OF_SUPPLY: 'MISSING_PLACE_OF_SUPPLY',
  UNKNOWN_CUSTOMER_TAX_PROFILE: 'UNKNOWN_CUSTOMER_TAX_PROFILE',
  DISCOUNT_TREATMENT_UNSPECIFIED: 'DISCOUNT_TREATMENT_UNSPECIFIED',
  PRICE_TAX_MODE_LEGACY: 'PRICE_TAX_MODE_LEGACY',
  MISSING_INVOICE_DATE: 'MISSING_INVOICE_DATE',
  MISSING_TAXABLE_VALUE: 'MISSING_TAXABLE_VALUE',
  ADMIN_OVERRIDE_REQUIRED: 'ADMIN_OVERRIDE_REQUIRED',
});

export const SUSPENDED_GST_WARNING =
  'GST registration is currently suspended. Taxable GST invoicing is restricted during the suspension period. Resolve registration status before issuing taxable GST invoices.';
