/**
 * Job work vs contract manufacturing — must not be merged.
 *
 * JOB WORK: Yasvik owns raw material; third party processes.
 * CONTRACT MANUFACTURING: third party owns/makes finished goods and sells to Yasvik (normal purchase).
 */

import {
  INVENTORY_SOURCE_TYPE,
  JOB_WORK_STATUS,
  SOURCING_ERROR_CODE,
  SOURCING_MODEL,
} from './sourcingConstants.js';
import { buildSourcedStockMovementPayload } from './sourcingEvent.js';
import { PURCHASE_TYPE } from './purchaseConstants.js';

const JOB_WORK_TRANSITIONS = Object.freeze({
  [JOB_WORK_STATUS.DRAFT]: [JOB_WORK_STATUS.MATERIALS_SENT, JOB_WORK_STATUS.CANCELLED],
  [JOB_WORK_STATUS.MATERIALS_SENT]: [JOB_WORK_STATUS.IN_PROCESS, JOB_WORK_STATUS.RETURNED, JOB_WORK_STATUS.CANCELLED],
  [JOB_WORK_STATUS.IN_PROCESS]: [JOB_WORK_STATUS.RETURNED, JOB_WORK_STATUS.CLOSED, JOB_WORK_STATUS.CANCELLED],
  [JOB_WORK_STATUS.RETURNED]: [JOB_WORK_STATUS.CLOSED, JOB_WORK_STATUS.IN_PROCESS],
  [JOB_WORK_STATUS.CLOSED]: [],
  [JOB_WORK_STATUS.CANCELLED]: [],
});

export function assertNotMergedModels(requestedModel, conflictingModel) {
  if (
    (requestedModel === SOURCING_MODEL.JOB_WORK && conflictingModel === SOURCING_MODEL.CONTRACT_MANUFACTURING)
    || (requestedModel === SOURCING_MODEL.CONTRACT_MANUFACTURING && conflictingModel === SOURCING_MODEL.JOB_WORK)
  ) {
    return {
      ok: false,
      code: SOURCING_ERROR_CODE.MODEL_MERGE_FORBIDDEN,
      message:
        'Job work and contract manufacturing are separate models. Yasvik-owned material processing ≠ buying finished goods from a contract manufacturer.',
    };
  }
  return { ok: true };
}

export function canTransitionJobWorkStatus(fromStatus, toStatus) {
  const from = String(fromStatus || JOB_WORK_STATUS.DRAFT).toUpperCase();
  const to = String(toStatus || '').toUpperCase();
  return (JOB_WORK_TRANSITIONS[from] || []).includes(to);
}

/**
 * Create a job-work order payload (Yasvik owns materials).
 */
export function buildJobWorkOrderPayload(input = {}) {
  const mergeGuard = assertNotMergedModels(
    SOURCING_MODEL.JOB_WORK,
    input.asContractManufacturing ? SOURCING_MODEL.CONTRACT_MANUFACTURING : null,
  );
  if (!mergeGuard.ok) return mergeGuard;

  const jobCode = String(input.jobCode || input.job_code || '').trim();
  if (!jobCode) {
    return {
      ok: false,
      code: SOURCING_ERROR_CODE.MISSING_VENDOR,
      message: 'job_code is required.',
    };
  }

  const materials = Array.isArray(input.materials) ? input.materials : [];
  const jobWorkOrder = {
    job_code: jobCode,
    vendor_id: input.vendorId || input.vendor_id || null,
    status: JOB_WORK_STATUS.DRAFT,
    material_sent_at: null,
    material_returned_at: null,
    wastage_qty: input.wastageQty ?? input.wastage_qty ?? null,
    processing_charge_paise: Math.max(0, Number(input.processingChargePaise ?? input.processing_charge_paise) || 0),
    service_purchase_invoice_id: null,
    production_batch_id: input.productionBatchId || input.production_batch_id || null,
    materials,
    notes: input.notes || 'Job work: Yasvik owns raw material; processor provides service.',
  };

  return {
    ok: true,
    model: SOURCING_MODEL.JOB_WORK,
    createsFinishedGoodsPurchase: false,
    jobWorkOrder,
    disclaimer: 'Do not record job-work output as a contract-manufacturing purchase of finished goods.',
  };
}

export function buildJobWorkMaterialsSentPayload(order = {}, input = {}) {
  const from = order.status || JOB_WORK_STATUS.DRAFT;
  if (!canTransitionJobWorkStatus(from, JOB_WORK_STATUS.MATERIALS_SENT)) {
    return {
      ok: false,
      code: SOURCING_ERROR_CODE.JOB_WORK_INVALID_TRANSITION,
      message: `Cannot move job work from ${from} to MATERIALS_SENT.`,
    };
  }

  const materials = Array.isArray(input.materials) ? input.materials : (order.materials || []);
  const stockMovements = [];
  for (const m of materials) {
    const movement = buildSourcedStockMovementPayload({
      productId: m.productId || m.product_id,
      variantSku: m.variantSku || m.variant_sku,
      deltaUnits: -(Number(m.quantity) || 0),
      deltaKg: -(Number(m.quantityKg || m.quantity_kg) || 0),
      inventorySourceType: INVENTORY_SOURCE_TYPE.JOB_WORK,
      notes: `Job work materials sent (${order.job_code || input.jobCode})`,
      sourceDocumentType: 'job_work_order',
      sourceDocumentId: order.id || null,
      createPurchase: false,
    });
    if (!movement.ok) return movement;
    stockMovements.push(movement.stockMovement);
  }

  return {
    ok: true,
    model: SOURCING_MODEL.JOB_WORK,
    createsFinishedGoodsPurchase: false,
    orderUpdate: {
      status: JOB_WORK_STATUS.MATERIALS_SENT,
      material_sent_at: input.sentAt || new Date().toISOString(),
      materials,
    },
    stockMovements,
  };
}

export function buildJobWorkMaterialsReturnedPayload(order = {}, input = {}) {
  const from = order.status || JOB_WORK_STATUS.MATERIALS_SENT;
  if (!canTransitionJobWorkStatus(from, JOB_WORK_STATUS.RETURNED)) {
    return {
      ok: false,
      code: SOURCING_ERROR_CODE.JOB_WORK_INVALID_TRANSITION,
      message: `Cannot move job work from ${from} to RETURNED.`,
    };
  }

  const returned = Array.isArray(input.returnedMaterials) ? input.returnedMaterials : [];
  const stockMovements = [];
  for (const m of returned) {
    const movement = buildSourcedStockMovementPayload({
      productId: m.productId || m.product_id,
      variantSku: m.variantSku || m.variant_sku,
      deltaUnits: Number(m.quantity) || 0,
      deltaKg: Number(m.quantityKg || m.quantity_kg) || 0,
      inventorySourceType: INVENTORY_SOURCE_TYPE.JOB_WORK,
      notes: `Job work materials/finished return (${order.job_code})`,
      sourceDocumentType: 'job_work_order',
      sourceDocumentId: order.id || null,
      createPurchase: false,
    });
    if (!movement.ok) return movement;
    stockMovements.push(movement.stockMovement);
  }

  return {
    ok: true,
    model: SOURCING_MODEL.JOB_WORK,
    createsFinishedGoodsPurchase: false,
    orderUpdate: {
      status: JOB_WORK_STATUS.RETURNED,
      material_returned_at: input.returnedAt || new Date().toISOString(),
      wastage_qty: input.wastageQty ?? order.wastage_qty ?? null,
    },
    stockMovements,
    /** Service charge may later link to JOB_WORK_SERVICE purchase (GST on service only). */
    servicePurchaseHint: Number(order.processing_charge_paise) > 0
      ? {
        purchaseType: PURCHASE_TYPE.JOB_WORK_SERVICE,
        taxableValuePaise: Number(order.processing_charge_paise) || 0,
        notes: 'Processing charge only — not material purchase.',
      }
      : null,
  };
}

/**
 * Contract manufacturing = normal supplier purchase of finished goods.
 * Explicitly separated from job work.
 */
export function buildContractManufacturingReceivePayload(input = {}) {
  const mergeGuard = assertNotMergedModels(
    SOURCING_MODEL.CONTRACT_MANUFACTURING,
    input.asJobWork ? SOURCING_MODEL.JOB_WORK : null,
  );
  if (!mergeGuard.ok) return mergeGuard;

  const movement = buildSourcedStockMovementPayload({
    productId: input.productId || input.product_id,
    variantSku: input.variantSku || input.variant_sku,
    deltaUnits: input.deltaUnits ?? input.delta_units ?? input.quantity,
    deltaKg: input.deltaKg ?? input.delta_kg,
    inventorySourceType: INVENTORY_SOURCE_TYPE.CONTRACT_MANUFACTURER,
    notes: input.notes || 'Contract manufacturing finished goods receipt',
    createPurchase: true,
  });
  if (!movement.ok) return movement;

  return {
    ok: true,
    model: SOURCING_MODEL.CONTRACT_MANUFACTURING,
    createsFinishedGoodsPurchase: true,
    stockMovement: movement.stockMovement,
    purchaseHint: {
      purchaseType: PURCHASE_TYPE.CONTRACT_MANUFACTURING,
      vendorId: input.vendorId || input.vendor_id || null,
      vendorGstin: input.vendorGstin || input.vendor_gstin || null,
      invoiceNumber: input.invoiceNumber || input.invoice_number || null,
      invoiceDate: input.invoiceDate || input.invoice_date || null,
      lines: [
        {
          productId: input.productId || input.product_id,
          variantSku: input.variantSku || input.variant_sku,
          quantity: input.quantity ?? input.deltaUnits ?? input.delta_units,
          taxableValuePaise: input.taxableValuePaise ?? input.taxable_value_paise,
          gstRateBp: input.gstRateBp ?? input.gst_rate_bp,
          description: input.description || 'Contract manufactured goods',
          existingProductCostPaise: input.existingProductCostPaise,
        },
      ],
    },
    disclaimer: 'Contract manufacturing is a finished-goods purchase — not job work.',
  };
}
