/**
 * Purchase tax line calculation.
 * Separates taxable purchase value, GST, invoice total, and existing product cost.
 * Never overwrites product cost — stores it as a snapshot only.
 */

import { resolvePlaceOfSupply, resolveComponentRatesBp } from './placeOfSupply.js';
import { taxOnTaxablePaise, toPaise } from './money.js';
import {
  ITC_STATUS,
  POTENTIAL_ITC_LABEL,
  PURCHASE_ERROR_CODE,
  PURCHASE_TYPE,
  RECONCILIATION_STATUS,
} from './purchaseConstants.js';

const ZERO_GST_TYPES = new Set([
  PURCHASE_TYPE.NON_GST_PURCHASE,
  PURCHASE_TYPE.FARMER_LOCAL,
  PURCHASE_TYPE.SAMPLE_FREE,
]);

function normalizePurchaseType(type) {
  return String(type || '').toUpperCase();
}

/**
 * Calculate a single purchase line.
 *
 * @param {object} input
 * @param {number} input.taxableValuePaise - purchase taxable value (ex-GST cost base)
 * @param {number} [input.gstRateBp] - required for GST_PURCHASE
 * @param {number} [input.existingProductCostPaise] - snapshot of current product cost; never mutated
 * @param {string} [input.hsnSac]
 * @param {object} [input.placeOfSupplyInput]
 * @param {boolean} [input.forceZeroGst]
 */
export function calculatePurchaseLineTax(input = {}) {
  const taxableValuePaise = Math.max(0, toPaise(input.taxableValuePaise));
  const existingProductCostPaise = input.existingProductCostPaise == null
    ? null
    : toPaise(input.existingProductCostPaise);
  const gstRateBp = Math.max(0, Number(input.gstRateBp) || 0);
  const forceZero = Boolean(input.forceZeroGst);

  if (forceZero || gstRateBp === 0) {
    return {
      ok: true,
      taxableValuePaise,
      gstRateBp: 0,
      cgstPaise: 0,
      sgstPaise: 0,
      igstPaise: 0,
      totalGstPaise: 0,
      lineTotalPaise: taxableValuePaise,
      existingProductCostPaise,
      costUnchanged: true,
      potentialItcPaise: 0,
      taxLines: [],
      explanation: {
        calculation: forceZero
          ? 'Non-GST / farmer / sample path: GST = 0, potential ITC = 0.'
          : 'GST rate 0 bp: no input tax.',
        existingProductCostPaise,
        note: 'Existing product cost is recorded as snapshot only and is not updated by this purchase.',
        potentialItcLabel: POTENTIAL_ITC_LABEL,
      },
    };
  }

  const pos = resolvePlaceOfSupply(input.placeOfSupplyInput || {});
  if (!pos.ok) {
    return {
      ok: false,
      code: PURCHASE_ERROR_CODE.PLACE_OF_SUPPLY_REQUIRED,
      message: 'Cannot determine CGST/SGST/IGST for GST purchase. Place of supply required.',
      details: pos,
    };
  }

  const rates = resolveComponentRatesBp(gstRateBp, pos);
  if (!rates.ok) {
    return {
      ok: false,
      code: PURCHASE_ERROR_CODE.PLACE_OF_SUPPLY_REQUIRED,
      message: rates.error,
    };
  }

  let cgstPaise = 0;
  let sgstPaise = 0;
  let igstPaise = 0;
  const taxLines = [];

  if (pos.applyIgst) {
    igstPaise = taxOnTaxablePaise(taxableValuePaise, rates.igstRateBp);
    taxLines.push({ tax_component: 'IGST', rate_bp: rates.igstRateBp, amount_paise: igstPaise });
  } else {
    cgstPaise = taxOnTaxablePaise(taxableValuePaise, rates.cgstRateBp);
    sgstPaise = taxOnTaxablePaise(taxableValuePaise, rates.sgstRateBp);
    taxLines.push({ tax_component: 'CGST', rate_bp: rates.cgstRateBp, amount_paise: cgstPaise });
    taxLines.push({ tax_component: 'SGST', rate_bp: rates.sgstRateBp, amount_paise: sgstPaise });
  }

  const totalGstPaise = cgstPaise + sgstPaise + igstPaise;
  const lineTotalPaise = taxableValuePaise + totalGstPaise;

  return {
    ok: true,
    taxableValuePaise,
    gstRateBp,
    cgstPaise,
    sgstPaise,
    igstPaise,
    totalGstPaise,
    lineTotalPaise,
    existingProductCostPaise,
    costUnchanged: true,
    potentialItcPaise: totalGstPaise,
    placeOfSupply: pos,
    taxLines,
    explanation: {
      calculation:
        `Taxable ${taxableValuePaise} + GST ${totalGstPaise} = invoice line ${lineTotalPaise}. `
        + `${POTENTIAL_ITC_LABEL}: ${totalGstPaise} paise (not claimed).`,
      supplySplit: pos.supplySplit,
      existingProductCostPaise,
      note: 'Existing product cost remains unchanged. Do not write purchase GST into products.quick_variants pricing meta.',
      potentialItcLabel: POTENTIAL_ITC_LABEL,
      why: pos.explanation,
    },
  };
}

/**
 * Build a full purchase document calculation from header + lines.
 */
export function calculatePurchaseDocument(input = {}) {
  const purchaseType = normalizePurchaseType(input.purchaseType);
  if (!Object.values(PURCHASE_TYPE).includes(purchaseType)) {
    return {
      ok: false,
      code: PURCHASE_ERROR_CODE.INVALID_PURCHASE_TYPE,
      message: `Unsupported purchase type: ${input.purchaseType}`,
    };
  }

  const linesIn = Array.isArray(input.lines) ? input.lines : [];
  if (!linesIn.length) {
    return {
      ok: false,
      code: PURCHASE_ERROR_CODE.LINE_REQUIRED,
      message: 'At least one purchase line is required.',
    };
  }

  const zeroGst = ZERO_GST_TYPES.has(purchaseType);
  const isGstPurchase = purchaseType === PURCHASE_TYPE.GST_PURCHASE
    || purchaseType === PURCHASE_TYPE.CONTRACT_MANUFACTURING
    || purchaseType === PURCHASE_TYPE.JOB_WORK_SERVICE;

  if (isGstPurchase && !zeroGst) {
    if (!String(input.vendorGstin || input.vendor_gstin || '').trim() && !input.allowMissingVendorGstin) {
      return {
        ok: false,
        code: PURCHASE_ERROR_CODE.MISSING_VENDOR_GSTIN,
        message: 'GST purchase requires vendor GSTIN (or explicit allowMissingVendorGstin for controlled correction workflows).',
      };
    }
    if (!String(input.invoiceNumber || input.invoice_number || '').trim()) {
      return {
        ok: false,
        code: PURCHASE_ERROR_CODE.MISSING_INVOICE_NUMBER,
        message: 'GST purchase requires vendor invoice number.',
      };
    }
    if (!String(input.invoiceDate || input.invoice_date || '').trim()) {
      return {
        ok: false,
        code: PURCHASE_ERROR_CODE.MISSING_INVOICE_DATE,
        message: 'GST purchase requires invoice date.',
      };
    }
  }

  const lines = [];
  const errors = [];

  linesIn.forEach((line, index) => {
    const taxable = toPaise(line.taxableValuePaise ?? line.taxable_value_paise ?? line.costPaise ?? line.amountPaise);
    if (taxable <= 0 && purchaseType !== PURCHASE_TYPE.SAMPLE_FREE) {
      errors.push({
        index,
        code: PURCHASE_ERROR_CODE.MISSING_TAXABLE_VALUE,
        message: `Line ${index + 1}: taxable purchase value required.`,
      });
      return;
    }

    // Never fabricate GST on non-GST paths
    const lineRate = zeroGst ? 0 : Math.max(0, Number(line.gstRateBp ?? line.gst_rate_bp) || 0);
    if (zeroGst && (Number(line.cgstPaise) > 0 || Number(line.sgstPaise) > 0 || Number(line.igstPaise) > 0)) {
      errors.push({
        index,
        code: PURCHASE_ERROR_CODE.GST_FABRICATED,
        message: `Line ${index + 1}: cannot attach GST to ${purchaseType}.`,
      });
      return;
    }

    const result = calculatePurchaseLineTax({
      taxableValuePaise: taxable,
      gstRateBp: lineRate,
      existingProductCostPaise: line.existingProductCostPaise ?? line.existing_product_cost_paise,
      hsnSac: line.hsnSac || line.hsn_sac,
      forceZeroGst: zeroGst,
      placeOfSupplyInput: line.placeOfSupplyInput || input.placeOfSupplyInput,
    });

    if (!result.ok) {
      errors.push({ index, ...result });
      return;
    }

    lines.push({
      index,
      product_id: line.productId || line.product_id || null,
      variant_sku: line.variantSku || line.variant_sku || null,
      description: line.description || null,
      hsn_sac: line.hsnSac || line.hsn_sac || null,
      quantity: line.quantity ?? null,
      unit: line.unit || null,
      notes: line.notes || null,
      sort_order: index,
      ...result,
    });
  });

  if (errors.length) {
    return { ok: false, errors, purchaseType };
  }

  const sum = (key) => lines.reduce((s, l) => s + (l[key] || 0), 0);
  const taxableValuePaise = sum('taxableValuePaise');
  const cgstPaise = sum('cgstPaise');
  const sgstPaise = sum('sgstPaise');
  const igstPaise = sum('igstPaise');
  const totalGstPaise = sum('totalGstPaise');
  const invoiceTotalPaise = sum('lineTotalPaise');
  // cost_total = taxable purchase value (ex-GST), not invoice total
  const costTotalPaise = taxableValuePaise;
  const potentialItcPaise = zeroGst ? 0 : totalGstPaise;

  const itcStatus = zeroGst || potentialItcPaise === 0
    ? ITC_STATUS.NOT_APPLICABLE
    : ITC_STATUS.PENDING_REVIEW;

  const reconciliationStatus = zeroGst || potentialItcPaise === 0
    ? RECONCILIATION_STATUS.NOT_CHECKED
    : RECONCILIATION_STATUS.NOT_CHECKED;

  // Guard: if caller tried to pass updateProductCost, reject
  if (input.updateProductCost === true || input.overwriteProductCost === true) {
    return {
      ok: false,
      code: PURCHASE_ERROR_CODE.PRODUCT_COST_MUTATION_FORBIDDEN,
      message: 'Purchase engine will not overwrite existing product cost / margin fields. Update cost only via Pricing Strategy with explicit admin intent.',
    };
  }

  return {
    ok: true,
    purchaseType,
    header: {
      purchase_type: purchaseType,
      vendor_id: input.vendorId || input.vendor_id || null,
      vendor_gstin: input.vendorGstin || input.vendor_gstin || null,
      supplier_name: input.supplierName || input.supplier_name || null,
      invoice_number: input.invoiceNumber || input.invoice_number || null,
      invoice_date: input.invoiceDate || input.invoice_date || null,
      purchase_date: input.purchaseDate || input.purchase_date || input.invoiceDate || input.invoice_date || null,
      document_storage_path: input.documentStoragePath || input.document_storage_path || null,
      taxable_value_paise: taxableValuePaise,
      cgst_paise: cgstPaise,
      sgst_paise: sgstPaise,
      igst_paise: igstPaise,
      total_gst_paise: totalGstPaise,
      invoice_total_paise: invoiceTotalPaise,
      cost_total_paise: costTotalPaise,
      itc_status: itcStatus,
      reconciliation_status: reconciliationStatus,
      place_of_supply_state: input.placeOfSupplyInput?.placeOfSupply
        || input.placeOfSupplyInput?.customerState
        || input.placeOfSupplyState
        || null,
      notes: input.notes || null,
    },
    lines,
    taxLines: lines.flatMap((l) => (l.taxLines || []).map((t) => ({
      ...t,
      line_index: l.index,
    }))),
    potentialItc: {
      label: POTENTIAL_ITC_LABEL,
      potential_itc_paise: potentialItcPaise,
      itc_status: itcStatus,
      claimed_itc_paise: 0,
      disclaimer:
        'Potential input tax credit only. Do not treat a vendor GST invoice as guaranteed ITC. GSTR-2B reconciliation is a separate confirmation layer.',
    },
    productCostPolicy: {
      overwriteProductCost: false,
      costUnchanged: true,
      message: 'Existing product cost fields are not modified by this purchase document.',
    },
    inventoryHint: {
      inventory_source_type: mapPurchaseTypeToInventorySource(purchaseType),
      note: 'Stock-in remains optional and separate — link via stock_movements.source_document_id when recording inventory.',
    },
  };
}

export function mapPurchaseTypeToInventorySource(purchaseType) {
  switch (normalizePurchaseType(purchaseType)) {
    case PURCHASE_TYPE.GST_PURCHASE:
    case PURCHASE_TYPE.CONTRACT_MANUFACTURING:
      return 'GST_REGISTERED_SUPPLIER';
    case PURCHASE_TYPE.NON_GST_PURCHASE:
      return 'UNREGISTERED_SUPPLIER';
    case PURCHASE_TYPE.FARMER_LOCAL:
      return 'FARMER_DIRECT';
    case PURCHASE_TYPE.SAMPLE_FREE:
      return 'SAMPLE_FREE';
    case PURCHASE_TYPE.JOB_WORK_SERVICE:
      return 'JOB_WORK';
    default:
      return 'MANUAL_ADJUSTMENT';
  }
}
