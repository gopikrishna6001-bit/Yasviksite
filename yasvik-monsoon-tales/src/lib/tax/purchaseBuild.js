/**
 * Build DB-ready insert payloads from a calculated purchase document.
 * Does not perform writes — callers persist via Supabase/worker.
 */

import { calculatePurchaseDocument } from './purchaseCalculate.js';
import { ITC_STATUS, RECONCILIATION_STATUS } from './purchaseConstants.js';

/**
 * @returns {{ ok, invoice, lines, taxLines, inputTaxLedger, itcReconciliation, stockMovementHints, productCostPolicy, errors? }}
 */
export function buildPurchasePersistPayload(input = {}) {
  const calc = calculatePurchaseDocument(input);
  if (!calc.ok) return calc;

  const invoice = { ...calc.header };

  const lines = calc.lines.map((line) => ({
    product_id: line.product_id,
    variant_sku: line.variant_sku,
    description: line.description,
    hsn_sac: line.hsn_sac,
    quantity: line.quantity,
    unit: line.unit,
    taxable_value_paise: line.taxableValuePaise,
    gst_rate_bp: line.gstRateBp,
    cgst_paise: line.cgstPaise,
    sgst_paise: line.sgstPaise,
    igst_paise: line.igstPaise,
    line_total_paise: line.lineTotalPaise,
    existing_product_cost_paise: line.existingProductCostPaise,
    notes: line.notes,
    sort_order: line.sort_order,
  }));

  const taxLines = calc.taxLines.map((t) => ({
    line_index: t.line_index,
    tax_component: t.tax_component,
    rate_bp: t.rate_bp,
    amount_paise: t.amount_paise,
  }));

  const inputTaxLedger = calc.potentialItc.potential_itc_paise > 0
    ? {
      vendor_id: invoice.vendor_id,
      vendor_gstin: invoice.vendor_gstin,
      invoice_number: invoice.invoice_number,
      invoice_date: invoice.invoice_date,
      taxable_value_paise: invoice.taxable_value_paise,
      cgst_paise: invoice.cgst_paise,
      sgst_paise: invoice.sgst_paise,
      igst_paise: invoice.igst_paise,
      total_gst_paise: invoice.total_gst_paise,
      itc_status: ITC_STATUS.PENDING_REVIEW,
      potential_itc_paise: calc.potentialItc.potential_itc_paise,
      claimed_itc_paise: 0,
      notes: calc.potentialItc.disclaimer,
    }
    : {
      vendor_id: invoice.vendor_id,
      vendor_gstin: invoice.vendor_gstin,
      invoice_number: invoice.invoice_number,
      invoice_date: invoice.invoice_date,
      taxable_value_paise: invoice.taxable_value_paise,
      cgst_paise: 0,
      sgst_paise: 0,
      igst_paise: 0,
      total_gst_paise: 0,
      itc_status: ITC_STATUS.NOT_APPLICABLE,
      potential_itc_paise: 0,
      claimed_itc_paise: 0,
      notes: 'No potential ITC on this purchase type / amount.',
    };

  const itcReconciliation = {
    supplier_gstin: invoice.vendor_gstin,
    invoice_number: invoice.invoice_number,
    invoice_date: invoice.invoice_date,
    taxable_value_paise: invoice.taxable_value_paise,
    gst_paise: invoice.total_gst_paise,
    reconciliation_status: RECONCILIATION_STATUS.NOT_CHECKED,
    external_source: null,
    external_payload: {},
    notes: 'Awaiting GSTR-2B / official reconciliation. Not auto-matched.',
  };

  const stockMovementHints = calc.lines
    .filter((l) => l.product_id && Number(l.quantity) > 0)
    .map((l) => ({
      product_id: l.product_id,
      variant_sku: l.variant_sku,
      quantity: l.quantity,
      reason: 'purchase',
      inventory_source_type: calc.inventoryHint.inventory_source_type,
      source_document_type: 'purchase_invoice',
      notes: `Linked purchase ${invoice.invoice_number || calc.purchaseType}`,
    }));

  return {
    ok: true,
    purchaseType: calc.purchaseType,
    invoice,
    lines,
    taxLines,
    inputTaxLedger,
    itcReconciliation,
    stockMovementHints,
    potentialItc: calc.potentialItc,
    productCostPolicy: calc.productCostPolicy,
    explanations: calc.lines.map((l) => l.explanation),
  };
}

/** Convenience builders for common Yasvik sourcing scenarios. */
export function buildGstPurchasePayload(input) {
  return buildPurchasePersistPayload({ ...input, purchaseType: 'GST_PURCHASE' });
}

export function buildNonGstPurchasePayload(input) {
  return buildPurchasePersistPayload({ ...input, purchaseType: 'NON_GST_PURCHASE' });
}

export function buildFarmerLocalPurchasePayload(input) {
  return buildPurchasePersistPayload({
    ...input,
    purchaseType: 'FARMER_LOCAL',
    vendorGstin: null,
  });
}

export function buildSampleFreeStockPayload(input) {
  return buildPurchasePersistPayload({
    ...input,
    purchaseType: 'SAMPLE_FREE',
    vendorGstin: null,
  });
}
