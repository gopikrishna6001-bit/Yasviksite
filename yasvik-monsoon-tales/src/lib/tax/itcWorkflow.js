/**
 * ITC status workflow + reconciliation helpers.
 * Never auto-claim ITC from an uploaded vendor invoice alone.
 */

import {
  ITC_STATUS,
  ITC_STATUS_TRANSITIONS,
  POTENTIAL_ITC_LABEL,
  PURCHASE_ERROR_CODE,
  RECONCILIATION_STATUS,
} from './purchaseConstants.js';

export function canTransitionItcStatus(fromStatus, toStatus) {
  const from = String(fromStatus || '').toUpperCase();
  const to = String(toStatus || '').toUpperCase();
  const allowed = ITC_STATUS_TRANSITIONS[from] || [];
  return allowed.includes(to);
}

export function transitionItcStatus({
  fromStatus,
  toStatus,
  reason = null,
  actorId = null,
} = {}) {
  const from = String(fromStatus || ITC_STATUS.PENDING_REVIEW).toUpperCase();
  const to = String(toStatus || '').toUpperCase();

  if (!Object.values(ITC_STATUS).includes(to)) {
    return {
      ok: false,
      code: PURCHASE_ERROR_CODE.ITC_TRANSITION_INVALID,
      message: `Unknown ITC status: ${toStatus}`,
    };
  }

  if (!canTransitionItcStatus(from, to)) {
    return {
      ok: false,
      code: PURCHASE_ERROR_CODE.ITC_TRANSITION_INVALID,
      message: `ITC status cannot move from ${from} to ${to}.`,
    };
  }

  if (to === ITC_STATUS.CLAIMED && !reason) {
    return {
      ok: false,
      code: PURCHASE_ERROR_CODE.ITC_TRANSITION_INVALID,
      message: 'Claiming ITC requires an explicit reason / reconciliation reference.',
    };
  }

  return {
    ok: true,
    fromStatus: from,
    toStatus: to,
    reason,
    actorId,
    audit: {
      entity_type: 'input_tax_ledger',
      action: 'itc_status_change',
      field_name: 'itc_status',
      previous_value: { itc_status: from },
      new_value: { itc_status: to },
      reason,
    },
    disclaimer:
      to === ITC_STATUS.CLAIMED
        ? 'Marked claimed in Yasvik records only — does not constitute a filed GST return.'
        : `${POTENTIAL_ITC_LABEL} workflow update.`,
  };
}

/**
 * Build a reconciliation review row from a purchase + optional external GSTR-2B-like match.
 * Does not auto-set ITC to CLAIMED.
 */
export function buildItcReconciliationReview({
  purchaseHeader = {},
  potentialItcPaise = 0,
  externalMatch = null,
} = {}) {
  let reconciliationStatus = RECONCILIATION_STATUS.NOT_CHECKED;
  let notes = null;

  if (externalMatch == null) {
    reconciliationStatus = RECONCILIATION_STATUS.NOT_CHECKED;
    notes = 'No official GST return data attached. Manual / GSTR-2B check still required.';
  } else if (externalMatch.notFound) {
    reconciliationStatus = RECONCILIATION_STATUS.NOT_FOUND;
    notes = 'Invoice not found in provided external GST data.';
  } else if (externalMatch.duplicate) {
    reconciliationStatus = RECONCILIATION_STATUS.DUPLICATE;
    notes = 'Possible duplicate vendor invoice.';
  } else {
    const extTaxable = Number(externalMatch.taxableValuePaise);
    const extGst = Number(externalMatch.gstPaise);
    const ourTaxable = Number(purchaseHeader.taxable_value_paise || 0);
    const ourGst = Number(purchaseHeader.total_gst_paise || potentialItcPaise || 0);
    const taxableOk = !Number.isFinite(extTaxable) || extTaxable === ourTaxable;
    const gstOk = !Number.isFinite(extGst) || extGst === ourGst;
    if (taxableOk && gstOk) {
      reconciliationStatus = RECONCILIATION_STATUS.MATCHED;
      notes = 'Amounts match external data. ITC still requires eligibility confirmation before claim.';
    } else {
      reconciliationStatus = RECONCILIATION_STATUS.MISMATCH;
      notes = 'Amounts differ from external GST data. Review required.';
    }
  }

  const suggestedItcStatus = reconciliationStatus === RECONCILIATION_STATUS.MATCHED
    ? ITC_STATUS.MATCHED
    : reconciliationStatus === RECONCILIATION_STATUS.MISMATCH
      || reconciliationStatus === RECONCILIATION_STATUS.NOT_FOUND
      || reconciliationStatus === RECONCILIATION_STATUS.DUPLICATE
      ? ITC_STATUS.RECONCILIATION_REQUIRED
      : ITC_STATUS.PENDING_REVIEW;

  return {
    reconciliation_status: reconciliationStatus,
    suggested_itc_status: suggestedItcStatus,
    supplier_gstin: purchaseHeader.vendor_gstin || null,
    invoice_number: purchaseHeader.invoice_number || null,
    invoice_date: purchaseHeader.invoice_date || null,
    taxable_value_paise: purchaseHeader.taxable_value_paise || 0,
    gst_paise: purchaseHeader.total_gst_paise || potentialItcPaise || 0,
    notes,
    autoClaimed: false,
    disclaimer:
      'Reconciliation review only. Never auto-claim ITC solely from an uploaded vendor invoice.',
  };
}
