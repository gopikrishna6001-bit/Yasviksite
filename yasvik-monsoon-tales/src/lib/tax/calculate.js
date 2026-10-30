/**
 * Explainable line/invoice tax calculation.
 * Stores enough detail to answer: "Why did this invoice calculate X%?"
 */

import {
  DISCOUNT_TAX_APPLICATION,
  PRICE_TAX_MODE,
  TAX_ERROR_CODE,
  TAX_TREATMENT,
} from './constants.js';
import {
  extractTaxFromInclusivePaise,
  taxOnTaxablePaise,
  toPaise,
} from './money.js';
import { resolveComponentRatesBp, resolvePlaceOfSupply, splitTaxComponents } from './placeOfSupply.js';

function treatmentZeroRated(treatment) {
  const t = String(treatment || '').toUpperCase();
  return (
    t === TAX_TREATMENT.EXEMPT
    || t === TAX_TREATMENT.NIL_RATED
    || t === TAX_TREATMENT.NON_GST
  );
}

/**
 * Calculate tax for a single line.
 *
 * @param {object} input
 * @param {number} input.grossPaise - line gross before discount
 * @param {number} [input.discountPaise=0]
 * @param {string} input.priceTaxMode
 * @param {string} input.discountTaxApplication - required when discountPaise > 0
 * @param {object} input.taxRuleVersion - { gst_rate_bp, tax_treatment, id, version, hsn_sac, ... }
 * @param {object} input.placeOfSupplyInput - passed to resolvePlaceOfSupply
 * @param {object} [input.classification]
 * @param {string} [input.productId]
 * @param {string} [input.discountKind]
 */
export function calculateLineTax(input = {}) {
  const grossPaise = Math.max(0, toPaise(input.grossPaise));
  const discountPaise = Math.max(0, toPaise(input.discountPaise || 0));
  const priceTaxMode = String(input.priceTaxMode || PRICE_TAX_MODE.TAX_NOT_APPLIED).toUpperCase();
  const version = input.taxRuleVersion || {};
  const treatment = String(version.tax_treatment || version.taxTreatment || TAX_TREATMENT.TAXABLE).toUpperCase();
  const gstRateBp = Math.max(0, Number(version.gst_rate_bp ?? version.gstRateBp ?? 0));
  const hsnSac = version.hsn_sac || version.hsnSac || input.classification?.hsn_sac || input.classification?.hsnSac || null;

  const baseExplanation = {
    productId: input.productId || null,
    hsnSac,
    taxRuleId: version.tax_rule_id || version.taxRuleId || null,
    taxRuleVersionId: version.id || null,
    taxRuleVersionNumber: version.version ?? null,
    taxRateBp: gstRateBp,
    effectiveFrom: version.effective_from || version.effectiveFrom || null,
    effectiveTo: version.effective_to || version.effectiveTo || null,
    taxTreatment: treatment,
    priceTaxMode,
    discountKind: input.discountKind || null,
    discountPaise,
    grossPaise,
  };

  if (priceTaxMode === PRICE_TAX_MODE.TAX_NOT_APPLIED) {
    const taxable = Math.max(0, grossPaise - discountPaise);
    return {
      ok: true,
      skippedTax: true,
      grossPaise,
      discountPaise,
      taxableValuePaise: taxable,
      taxPaise: 0,
      cgstPaise: 0,
      sgstPaise: 0,
      igstPaise: 0,
      lineTotalPaise: taxable,
      explanation: {
        ...baseExplanation,
        placeOfSupply: null,
        calculation: 'TAX_NOT_APPLIED / LEGACY — no GST computed; payable = gross − discount.',
        why: 'Price tax mode is TAX_NOT_APPLIED. Historical/legacy pricing path.',
      },
    };
  }

  if (discountPaise > 0) {
    const app = String(input.discountTaxApplication || DISCOUNT_TAX_APPLICATION.UNSPECIFIED).toUpperCase();
    if (app === DISCOUNT_TAX_APPLICATION.UNSPECIFIED) {
      return {
        ok: false,
        code: TAX_ERROR_CODE.DISCOUNT_TREATMENT_UNSPECIFIED,
        message: 'Discount tax treatment must be specified explicitly. Engine will not assume pre- or post-tax discount rules.',
        explanation: baseExplanation,
      };
    }
  }

  const discountApp = String(
    input.discountTaxApplication || DISCOUNT_TAX_APPLICATION.REDUCE_TAXABLE_BASE,
  ).toUpperCase();

  if (treatmentZeroRated(treatment)) {
    let payableBase = Math.max(0, grossPaise - discountPaise);
    return {
      ok: true,
      skippedTax: false,
      grossPaise,
      discountPaise,
      taxableValuePaise: payableBase,
      taxPaise: 0,
      cgstPaise: 0,
      sgstPaise: 0,
      igstPaise: 0,
      lineTotalPaise: payableBase,
      explanation: {
        ...baseExplanation,
        placeOfSupply: null,
        calculation: `${treatment}: taxable recorded, GST = 0.`,
        why: `Tax treatment ${treatment} yields zero GST.`,
      },
    };
  }

  const pos = resolvePlaceOfSupply(input.placeOfSupplyInput || {});
  if (!pos.ok) {
    return {
      ok: false,
      code: TAX_ERROR_CODE.MISSING_PLACE_OF_SUPPLY,
      message: 'Cannot determine CGST/SGST/IGST.',
      details: pos,
      explanation: { ...baseExplanation, placeOfSupply: pos },
    };
  }

  const rates = resolveComponentRatesBp(gstRateBp, pos);
  if (!rates.ok) {
    return {
      ok: false,
      code: TAX_ERROR_CODE.MISSING_TAX_RULE,
      message: rates.error,
      explanation: { ...baseExplanation, placeOfSupply: pos },
    };
  }

  // Prefer explicit component rates on the version when present and consistent with split
  let cgstRateBp = rates.cgstRateBp;
  let sgstRateBp = rates.sgstRateBp;
  let igstRateBp = rates.igstRateBp;
  const vCgst = Number(version.cgst_rate_bp ?? version.cgstRateBp);
  const vSgst = Number(version.sgst_rate_bp ?? version.sgstRateBp);
  const vIgst = Number(version.igst_rate_bp ?? version.igstRateBp);
  if (pos.applyCgstSgst && Number.isFinite(vCgst) && Number.isFinite(vSgst) && (vCgst > 0 || vSgst > 0)) {
    cgstRateBp = vCgst;
    sgstRateBp = vSgst;
    igstRateBp = 0;
  }
  if (pos.applyIgst && Number.isFinite(vIgst) && vIgst > 0) {
    igstRateBp = vIgst;
    cgstRateBp = 0;
    sgstRateBp = 0;
  }

  let taxableValuePaise = 0;
  let taxPaise = 0;
  let calculation = '';

  if (priceTaxMode === PRICE_TAX_MODE.TAX_EXCLUSIVE) {
    if (discountApp === DISCOUNT_TAX_APPLICATION.POST_TAX_PAYABLE_ONLY) {
      taxableValuePaise = grossPaise;
      taxPaise = taxOnTaxablePaise(taxableValuePaise, gstRateBp);
      calculation = `TAX_EXCLUSIVE + POST_TAX discount: tax on gross ${grossPaise}; discount ${discountPaise} reduces payable only.`;
    } else {
      taxableValuePaise = Math.max(0, grossPaise - discountPaise);
      taxPaise = taxOnTaxablePaise(taxableValuePaise, gstRateBp);
      calculation = `TAX_EXCLUSIVE: taxable = gross ${grossPaise} − discount ${discountPaise} = ${taxableValuePaise}; tax = round(taxable × ${gstRateBp}/10000) = ${taxPaise}.`;
    }
  } else if (priceTaxMode === PRICE_TAX_MODE.TAX_INCLUSIVE) {
    const inclusiveBase = discountApp === DISCOUNT_TAX_APPLICATION.POST_TAX_PAYABLE_ONLY
      ? grossPaise
      : Math.max(0, grossPaise - discountPaise);
    const extracted = extractTaxFromInclusivePaise(inclusiveBase, gstRateBp);
    taxableValuePaise = extracted.taxablePaise;
    taxPaise = extracted.taxPaise;
    calculation = `TAX_INCLUSIVE: inclusive base ${inclusiveBase}; taxable = ${taxableValuePaise}; tax = ${taxPaise} at ${gstRateBp} bp.`;
  } else {
    return {
      ok: false,
      code: TAX_ERROR_CODE.PRICE_TAX_MODE_LEGACY,
      message: `Unsupported price tax mode: ${priceTaxMode}`,
      explanation: baseExplanation,
    };
  }

  // Compute components from rates on taxable (more accurate than splitting rounded total when rates known)
  let cgstPaise = 0;
  let sgstPaise = 0;
  let igstPaise = 0;
  if (pos.applyIgst) {
    igstPaise = taxOnTaxablePaise(taxableValuePaise, igstRateBp);
    taxPaise = igstPaise;
  } else {
    cgstPaise = taxOnTaxablePaise(taxableValuePaise, cgstRateBp);
    sgstPaise = taxOnTaxablePaise(taxableValuePaise, sgstRateBp);
    taxPaise = cgstPaise + sgstPaise;
  }

  let lineTotalPaise;
  if (priceTaxMode === PRICE_TAX_MODE.TAX_INCLUSIVE) {
    lineTotalPaise = discountApp === DISCOUNT_TAX_APPLICATION.POST_TAX_PAYABLE_ONLY
      ? Math.max(0, grossPaise - discountPaise)
      : Math.max(0, grossPaise - discountPaise);
  } else if (discountApp === DISCOUNT_TAX_APPLICATION.POST_TAX_PAYABLE_ONLY) {
    lineTotalPaise = Math.max(0, grossPaise + taxPaise - discountPaise);
  } else {
    lineTotalPaise = taxableValuePaise + taxPaise;
  }

  return {
    ok: true,
    skippedTax: false,
    grossPaise,
    discountPaise,
    taxableValuePaise,
    taxPaise,
    cgstPaise,
    sgstPaise,
    igstPaise,
    cgstRateBp,
    sgstRateBp,
    igstRateBp,
    gstRateBp,
    lineTotalPaise,
    explanation: {
      ...baseExplanation,
      placeOfSupply: pos,
      cgstRateBp,
      sgstRateBp,
      igstRateBp,
      taxableValuePaise,
      cgstPaise,
      sgstPaise,
      igstPaise,
      discountTaxApplication: discountApp,
      calculation,
      why: `Applied rule version ${version.id || 'n/a'} at ${gstRateBp} bp on ${pos.supplySplit} supply (${pos.explanation})`,
    },
  };
}

/**
 * Aggregate line results into invoice totals.
 */
export function calculateInvoiceTax(linesInput = [], invoiceMeta = {}) {
  const lines = [];
  const errors = [];

  (Array.isArray(linesInput) ? linesInput : []).forEach((line, index) => {
    const result = calculateLineTax({
      ...line,
      placeOfSupplyInput: line.placeOfSupplyInput || invoiceMeta.placeOfSupplyInput,
    });
    if (!result.ok) {
      errors.push({ index, ...result });
      return;
    }
    lines.push({ index, ...result });
  });

  if (errors.length) {
    return { ok: false, errors, lines };
  }

  const sum = (key) => lines.reduce((s, l) => s + (l[key] || 0), 0);
  const grossValuePaise = sum('grossPaise');
  const discountPaise = sum('discountPaise');
  const taxableValuePaise = sum('taxableValuePaise');
  const cgstPaise = sum('cgstPaise');
  const sgstPaise = sum('sgstPaise');
  const igstPaise = sum('igstPaise');
  const totalTaxPaise = sum('taxPaise');
  const netPayablePaise = sum('lineTotalPaise');

  return {
    ok: true,
    lines,
    totals: {
      grossValuePaise,
      discountPaise,
      taxableValuePaise,
      cgstPaise,
      sgstPaise,
      igstPaise,
      totalTaxPaise,
      roundOffPaise: 0,
      netPayablePaise,
    },
    taxDecision: {
      invoiceDate: invoiceMeta.invoiceDate || null,
      placeOfSupply: invoiceMeta.placeOfSupplyInput
        ? resolvePlaceOfSupply(invoiceMeta.placeOfSupplyInput)
        : null,
      lineExplanations: lines.map((l) => l.explanation),
    },
  };
}

export { splitTaxComponents };
