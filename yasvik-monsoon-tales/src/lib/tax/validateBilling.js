/**
 * Pre-finalization gates for taxable GST invoices.
 * Never silently fall back to a random rate.
 */

import {
  PRICE_TAX_MODE,
  REGISTRATION_STATUS,
  SUSPENDED_GST_WARNING,
  TAX_ERROR_CODE,
} from './constants.js';
import {
  assertClassificationHasHsn,
  canAutoApplyClassification,
} from './classification.js';
import { resolveTaxRuleForDate } from './taxRules.js';
import { resolvePlaceOfSupply } from './placeOfSupply.js';
import { parseIsoDate } from './money.js';

/**
 * Normalize business tax profile + app_settings flags into a gate context.
 */
export function buildBillingGateContext({
  businessTaxProfile = {},
  gstLiveBilling = null,
  gstReadyMode = null,
  adminOverride = false,
  adminOverrideReason = null,
} = {}) {
  const profile = businessTaxProfile || {};
  const live = gstLiveBilling != null
    ? Boolean(gstLiveBilling === true || gstLiveBilling === 'true')
    : Boolean(profile.gst_live_billing);
  const ready = gstReadyMode != null
    ? Boolean(gstReadyMode === true || gstReadyMode === 'true')
    : Boolean(profile.gst_ready_mode);
  const status = String(
    profile.registration_status || profile.registrationStatus || REGISTRATION_STATUS.UNKNOWN,
  ).toUpperCase();

  return {
    registrationStatus: status,
    gstLiveBilling: live,
    gstReadyMode: ready,
    gstComplianceModeStartDate:
      profile.gst_compliance_mode_start_date || profile.gstComplianceModeStartDate || null,
    supplierState: profile.state_code || profile.state_name || profile.stateCode || profile.stateName || null,
    adminOverride: Boolean(adminOverride),
    adminOverrideReason: adminOverrideReason || null,
    suspendedWarning: status === REGISTRATION_STATUS.SUSPENDED ? SUSPENDED_GST_WARNING : null,
  };
}

/**
 * Validate whether a taxable GST invoice may be finalized.
 * Returns { ok, blockers: [{ code, message }], warnings }.
 */
export function validateTaxableInvoiceFinalization({
  businessTaxProfile,
  gstLiveBilling,
  gstReadyMode,
  invoiceDate,
  lines = [],
  placeOfSupplyInput = {},
  customerTaxProfile = null,
  adminOverride = false,
  adminOverrideReason = null,
} = {}) {
  const ctx = buildBillingGateContext({
    businessTaxProfile,
    gstLiveBilling,
    gstReadyMode,
    adminOverride,
    adminOverrideReason,
  });
  const blockers = [];
  const warnings = [];

  if (ctx.suspendedWarning) {
    warnings.push({ code: TAX_ERROR_CODE.REGISTRATION_SUSPENDED, message: ctx.suspendedWarning });
  }

  if (!ctx.gstLiveBilling) {
    blockers.push({
      code: TAX_ERROR_CODE.GST_LIVE_BILLING_OFF,
      message:
        'GST calculation capability may exist, but Yasvik is not currently permitted to issue taxable GST invoices (GST_LIVE_BILLING is OFF).',
    });
  }

  if (ctx.registrationStatus === REGISTRATION_STATUS.SUSPENDED) {
    if (!(ctx.adminOverride && adminOverrideReason)) {
      blockers.push({
        code: TAX_ERROR_CODE.REGISTRATION_SUSPENDED,
        message: SUSPENDED_GST_WARNING,
      });
    } else {
      warnings.push({
        code: TAX_ERROR_CODE.ADMIN_OVERRIDE_REQUIRED,
        message: `Admin override used during suspension. Reason: ${adminOverrideReason}`,
      });
    }
  } else if (ctx.registrationStatus !== REGISTRATION_STATUS.ACTIVE) {
    blockers.push({
      code: TAX_ERROR_CODE.REGISTRATION_NOT_ACTIVE,
      message: `Taxable GST invoicing unavailable while registration status is ${ctx.registrationStatus}.`,
    });
  }

  if (ctx.gstLiveBilling && !ctx.gstComplianceModeStartDate) {
    blockers.push({
      code: TAX_ERROR_CODE.REGISTRATION_NOT_ACTIVE,
      message: 'GST compliance mode start date must be set by authorized admin before live billing.',
    });
  }

  const date = parseIsoDate(invoiceDate);
  if (!date) {
    blockers.push({
      code: TAX_ERROR_CODE.MISSING_INVOICE_DATE,
      message: 'Invoice date is required.',
    });
  }

  const posInput = {
    supplierState: placeOfSupplyInput.supplierState || ctx.supplierState,
    customerState: placeOfSupplyInput.customerState,
    placeOfSupply: placeOfSupplyInput.placeOfSupply,
    customerGstStatus:
      placeOfSupplyInput.customerGstStatus
      || customerTaxProfile?.gst_registration_status
      || customerTaxProfile?.gstRegistrationStatus,
    transactionType: placeOfSupplyInput.transactionType || 'SALE',
  };
  const pos = resolvePlaceOfSupply(posInput);
  if (!pos.ok) {
    blockers.push({
      code: TAX_ERROR_CODE.MISSING_PLACE_OF_SUPPLY,
      message: 'Cannot determine CGST/SGST/IGST.',
      details: pos,
    });
  }

  if (customerTaxProfile) {
    const ctype = String(customerTaxProfile.customer_type || customerTaxProfile.customerType || '');
    const cStatus = String(
      customerTaxProfile.gst_registration_status || customerTaxProfile.gstRegistrationStatus || '',
    ).toUpperCase();
    if (ctype === 'BUSINESS_REGISTERED' && cStatus === 'UNKNOWN') {
      blockers.push({
        code: TAX_ERROR_CODE.UNKNOWN_CUSTOMER_TAX_PROFILE,
        message: 'Customer tax profile incomplete.',
      });
    }
    if (ctype === 'BUSINESS_REGISTERED' && !String(customerTaxProfile.gstin || '').trim()) {
      blockers.push({
        code: TAX_ERROR_CODE.UNKNOWN_CUSTOMER_TAX_PROFILE,
        message: 'Customer GSTIN required for BUSINESS_REGISTERED taxable invoices.',
      });
    }
  }

  (Array.isArray(lines) ? lines : []).forEach((line, index) => {
    const mode = String(line.priceTaxMode || PRICE_TAX_MODE.TAX_EXCLUSIVE).toUpperCase();
    if (mode === PRICE_TAX_MODE.TAX_NOT_APPLIED) {
      blockers.push({
        index,
        code: TAX_ERROR_CODE.PRICE_TAX_MODE_LEGACY,
        message: `Line ${index + 1}: product still on TAX_NOT_APPLIED / LEGACY — configure price tax mode before taxable GST invoice.`,
      });
    }

    const classification = line.classification || {};
    const classGate = canAutoApplyClassification(classification, {
      allowManuallyReviewedWithAdminConfirm: true,
      adminConfirmed: Boolean(line.adminConfirmedClassification),
    });
    if (!classGate.ok) {
      blockers.push({ index, code: classGate.code, message: `Line ${index + 1}: ${classGate.message}` });
    }

    const hsnGate = assertClassificationHasHsn(classification);
    if (!hsnGate.ok) {
      blockers.push({ index, code: hsnGate.code, message: `Line ${index + 1}: ${hsnGate.message}` });
    }

    const ruleResolve = resolveTaxRuleForDate({
      invoiceDate: date,
      taxRuleVersions: line.taxRuleVersions || [],
      preferredVersionId: classification.tax_rule_version_id || classification.taxRuleVersionId,
      hsnSac: hsnGate.hsnSac,
    });
    if (!ruleResolve.ok) {
      blockers.push({
        index,
        code: ruleResolve.code,
        message: `Line ${index + 1}: ${ruleResolve.message}`,
        matches: ruleResolve.matches,
      });
    }
  });

  return {
    ok: blockers.length === 0,
    blockers,
    warnings,
    context: ctx,
    placeOfSupply: pos,
  };
}

/**
 * Preview / soft validate — allows calculation when live billing is off
 * (for admin sandbox), but labels result as NOT FINALIZABLE.
 */
export function canPreviewTaxCalculation(gateContext) {
  return {
    ok: true,
    finalizable: Boolean(gateContext?.gstLiveBilling)
      && gateContext?.registrationStatus === REGISTRATION_STATUS.ACTIVE,
    note: 'Preview allowed. Finalization still requires GST_LIVE_BILLING and ACTIVE registration.',
  };
}
