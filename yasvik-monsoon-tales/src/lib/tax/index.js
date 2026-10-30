/**
 * Yasvik explainable, versioned, auditable tax engine (Phase 2).
 *
 * GST is a rules layer around transactions — not the center of the product model.
 * Never invent tax. Never fabricate historical GST. Never treat AI as legal authority.
 */

export * from './constants.js';
export * from './money.js';
export * from './placeOfSupply.js';
export * from './taxRules.js';
export * from './classification.js';
export * from './classifierAssist.js';
export * from './calculate.js';
export * from './validateBilling.js';
export * from './impactAnalysis.js';
export * from './dbMap.js';
export * from './purchaseConstants.js';
export * from './purchaseCalculate.js';
export * from './purchaseBuild.js';
export * from './itcWorkflow.js';
export * from './purchaseDbMap.js';
export * from './sourcingConstants.js';
export * from './vendorBuild.js';
export * from './sourcingEvent.js';
export * from './consignment.js';
export * from './jobWork.js';

import { calculateInvoiceTax, calculateLineTax } from './calculate.js';
import { suggestTaxClassification } from './classifierAssist.js';
import { canAutoApplyClassification } from './classification.js';
import { resolveTaxRuleForDate } from './taxRules.js';
import { resolvePlaceOfSupply } from './placeOfSupply.js';
import {
  buildBillingGateContext,
  validateTaxableInvoiceFinalization,
} from './validateBilling.js';
import { analyzeTaxRuleImpact } from './impactAnalysis.js';
import { DISCOUNT_TAX_APPLICATION, PRICE_TAX_MODE } from './constants.js';
import {
  buildGstPurchasePayload,
  buildNonGstPurchasePayload,
  buildPurchasePersistPayload,
} from './purchaseBuild.js';
import { calculatePurchaseDocument } from './purchaseCalculate.js';
import { buildItcReconciliationReview, transitionItcStatus } from './itcWorkflow.js';
import { classifyInventorySourcing, buildSourcedStockMovementPayload } from './sourcingEvent.js';
import { buildConsignmentReceivePayload, buildConsignmentSettlementPayload } from './consignment.js';
import {
  buildContractManufacturingReceivePayload,
  buildJobWorkOrderPayload,
  assertNotMergedModels,
} from './jobWork.js';
import { buildVendorPayload } from './vendorBuild.js';

/**
 * End-to-end line decision: resolve rule → place of supply → calculate → explain.
 * Does not finalize or persist. Safe to call while GST_LIVE_BILLING is OFF.
 */
export function explainLineTaxDecision(input = {}) {
  const rule = resolveTaxRuleForDate({
    invoiceDate: input.invoiceDate,
    taxRuleVersions: input.taxRuleVersions || [],
    preferredVersionId: input.preferredVersionId,
    hsnSac: input.hsnSac || input.classification?.hsn_sac || input.classification?.hsnSac,
  });
  if (!rule.ok) {
    return { ok: false, stage: 'tax_rule', ...rule };
  }

  const classGate = canAutoApplyClassification(input.classification || {}, {
    allowManuallyReviewedWithAdminConfirm: true,
    adminConfirmed: Boolean(input.adminConfirmedClassification),
  });

  const calc = calculateLineTax({
    grossPaise: input.grossPaise,
    discountPaise: input.discountPaise,
    priceTaxMode: input.priceTaxMode || PRICE_TAX_MODE.TAX_EXCLUSIVE,
    discountTaxApplication:
      input.discountTaxApplication
      || (
        Number(input.discountPaise) > 0
          ? DISCOUNT_TAX_APPLICATION.UNSPECIFIED
          : DISCOUNT_TAX_APPLICATION.REDUCE_TAXABLE_BASE
      ),
    taxRuleVersion: rule.version,
    placeOfSupplyInput: input.placeOfSupplyInput,
    classification: input.classification,
    productId: input.productId,
    discountKind: input.discountKind,
  });

  return {
    ok: calc.ok,
    stage: calc.ok ? 'complete' : 'calculate',
    rule,
    classificationGate: classGate,
    ...calc,
  };
}

export const taxEngine = {
  calculateLineTax,
  calculateInvoiceTax,
  resolvePlaceOfSupply,
  resolveTaxRuleForDate,
  suggestTaxClassification,
  canAutoApplyClassification,
  buildBillingGateContext,
  validateTaxableInvoiceFinalization,
  analyzeTaxRuleImpact,
  explainLineTaxDecision,
  calculatePurchaseDocument,
  buildPurchasePersistPayload,
  buildGstPurchasePayload,
  buildNonGstPurchasePayload,
  buildItcReconciliationReview,
  transitionItcStatus,
  classifyInventorySourcing,
  buildSourcedStockMovementPayload,
  buildConsignmentReceivePayload,
  buildConsignmentSettlementPayload,
  buildJobWorkOrderPayload,
  buildContractManufacturingReceivePayload,
  assertNotMergedModels,
  buildVendorPayload,
};

export default taxEngine;
