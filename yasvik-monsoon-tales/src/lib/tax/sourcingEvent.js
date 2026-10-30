/**
 * Inventory sourcing events — classify stock movements and whether a purchase applies.
 */

import { mapPurchaseTypeToInventorySource } from './purchaseCalculate.js';
import { PURCHASE_TYPE } from './purchaseConstants.js';
import {
  INVENTORY_SOURCE_TYPE,
  SOURCING_ERROR_CODE,
  SOURCING_MODEL,
  SOURCE_TYPES_NEVER_IMMEDIATE_PURCHASE,
  SOURCE_TYPES_THAT_MAY_CREATE_PURCHASE,
} from './sourcingConstants.js';

export function normalizeInventorySourceType(value) {
  const s = String(value || '').toUpperCase();
  return Object.values(INVENTORY_SOURCE_TYPE).includes(s) ? s : null;
}

export function resolveSourcingModel(sourceType) {
  const type = normalizeInventorySourceType(sourceType);
  if (!type) return null;
  switch (type) {
    case INVENTORY_SOURCE_TYPE.CONSIGNMENT:
      return SOURCING_MODEL.CONSIGNMENT;
    case INVENTORY_SOURCE_TYPE.JOB_WORK:
      return SOURCING_MODEL.JOB_WORK;
    case INVENTORY_SOURCE_TYPE.CONTRACT_MANUFACTURER:
      return SOURCING_MODEL.CONTRACT_MANUFACTURING;
    case INVENTORY_SOURCE_TYPE.YASVIK_PRODUCTION:
      return SOURCING_MODEL.PRODUCTION;
    case INVENTORY_SOURCE_TYPE.STOCK_TRANSFER:
      return SOURCING_MODEL.TRANSFER;
    case INVENTORY_SOURCE_TYPE.CUSTOMER_RETURN:
    case INVENTORY_SOURCE_TYPE.SUPPLIER_RETURN:
      return SOURCING_MODEL.RETURN;
    case INVENTORY_SOURCE_TYPE.MANUAL_ADJUSTMENT:
    case INVENTORY_SOURCE_TYPE.OPENING_STOCK:
      return SOURCING_MODEL.ADJUSTMENT;
    case INVENTORY_SOURCE_TYPE.GST_REGISTERED_SUPPLIER:
    case INVENTORY_SOURCE_TYPE.UNREGISTERED_SUPPLIER:
    case INVENTORY_SOURCE_TYPE.FARMER_DIRECT:
    case INVENTORY_SOURCE_TYPE.LOCAL_PRODUCER:
    case INVENTORY_SOURCE_TYPE.SAMPLE_FREE:
      return SOURCING_MODEL.PURCHASE;
    default:
      return SOURCING_MODEL.NON_PURCHASE_STOCK;
  }
}

/**
 * Suggest purchase type for a source (when purchase is applicable).
 */
export function suggestPurchaseTypeForSource(sourceType) {
  switch (normalizeInventorySourceType(sourceType)) {
    case INVENTORY_SOURCE_TYPE.GST_REGISTERED_SUPPLIER:
      return PURCHASE_TYPE.GST_PURCHASE;
    case INVENTORY_SOURCE_TYPE.CONTRACT_MANUFACTURER:
      return PURCHASE_TYPE.CONTRACT_MANUFACTURING;
    case INVENTORY_SOURCE_TYPE.UNREGISTERED_SUPPLIER:
      return PURCHASE_TYPE.NON_GST_PURCHASE;
    case INVENTORY_SOURCE_TYPE.FARMER_DIRECT:
    case INVENTORY_SOURCE_TYPE.LOCAL_PRODUCER:
      return PURCHASE_TYPE.FARMER_LOCAL;
    case INVENTORY_SOURCE_TYPE.SAMPLE_FREE:
      return PURCHASE_TYPE.SAMPLE_FREE;
    case INVENTORY_SOURCE_TYPE.JOB_WORK:
      return PURCHASE_TYPE.JOB_WORK_SERVICE; // service charge only — not material purchase
    default:
      return null;
  }
}

/**
 * Classify an inventory addition. Core Phase 4 rule: not all stock-in = purchase.
 */
export function classifyInventorySourcing(input = {}) {
  const sourceType = normalizeInventorySourceType(
    input.inventorySourceType || input.inventory_source_type || input.sourceType,
  );
  if (!sourceType) {
    return {
      ok: false,
      code: SOURCING_ERROR_CODE.INVALID_SOURCE_TYPE,
      message: 'Valid inventory_source_type is required for sourced stock movements.',
    };
  }

  const model = resolveSourcingModel(sourceType);
  const mayCreatePurchase = SOURCE_TYPES_THAT_MAY_CREATE_PURCHASE.includes(sourceType)
    && !SOURCE_TYPES_NEVER_IMMEDIATE_PURCHASE.includes(sourceType);
  // CONSIGNMENT is in NEVER list — mayCreatePurchase false
  const immediatePurchase = mayCreatePurchase && input.createPurchase !== false;
  const purchaseType = immediatePurchase ? suggestPurchaseTypeForSource(sourceType) : null;

  return {
    ok: true,
    inventorySourceType: sourceType,
    sourcingModel: model,
    isPurchase: Boolean(immediatePurchase && purchaseType),
    mayCreatePurchaseLater: sourceType === INVENTORY_SOURCE_TYPE.CONSIGNMENT,
    purchaseType,
    stockReason: inferStockReason(sourceType, input.reason),
    notes: explainSourcing(sourceType, model),
  };
}

function inferStockReason(sourceType, explicitReason) {
  if (explicitReason) return explicitReason;
  switch (sourceType) {
    case INVENTORY_SOURCE_TYPE.CUSTOMER_RETURN:
    case INVENTORY_SOURCE_TYPE.SUPPLIER_RETURN:
      return 'return';
    case INVENTORY_SOURCE_TYPE.STOCK_TRANSFER:
      return 'transfer';
    case INVENTORY_SOURCE_TYPE.MANUAL_ADJUSTMENT:
    case INVENTORY_SOURCE_TYPE.OPENING_STOCK:
      return 'adjustment';
    case INVENTORY_SOURCE_TYPE.SALE:
      return 'sale_pos';
    default:
      return 'purchase'; // legacy reason label on ledger — source_type carries true meaning
  }
}

function explainSourcing(sourceType, model) {
  if (model === SOURCING_MODEL.CONSIGNMENT) {
    return 'Consignment receipt: inventory may increase, but no normal purchase invoice until settled/sold.';
  }
  if (model === SOURCING_MODEL.JOB_WORK) {
    return 'Job work: Yasvik owns material; third party processes. Do not treat as finished-goods purchase.';
  }
  if (model === SOURCING_MODEL.CONTRACT_MANUFACTURING) {
    return 'Contract manufacturing: third party owns/makes finished goods sold to Yasvik — use supplier purchase + GST invoice when applicable.';
  }
  if (model === SOURCING_MODEL.PRODUCTION) {
    return 'Yasvik production output — not a vendor purchase. Input GST stays on input purchases.';
  }
  if (model === SOURCING_MODEL.PURCHASE) {
    return `Purchase-eligible source (${sourceType}). Optional linked purchase document.`;
  }
  return `Non-purchase stock movement (${sourceType}).`;
}

/**
 * Build a stock_movements row payload with sourcing metadata.
 * Does not write product cost.
 */
export function buildSourcedStockMovementPayload(input = {}) {
  const classification = classifyInventorySourcing(input);
  if (!classification.ok) return classification;

  const productId = input.productId || input.product_id;
  if (!productId) {
    return {
      ok: false,
      code: SOURCING_ERROR_CODE.MISSING_PRODUCT,
      message: 'product_id is required for stock movement.',
    };
  }

  const deltaUnits = Number(input.deltaUnits ?? input.delta_units ?? 0) || 0;
  const deltaKg = Number(input.deltaKg ?? input.delta_kg ?? 0) || 0;
  if (!deltaUnits && !deltaKg) {
    return {
      ok: false,
      code: SOURCING_ERROR_CODE.MISSING_QUANTITY,
      message: 'Provide delta_units or delta_kg.',
    };
  }

  return {
    ok: true,
    classification,
    stockMovement: {
      product_id: productId,
      variant_sku: input.variantSku || input.variant_sku || null,
      delta_units: deltaUnits,
      delta_kg: deltaKg,
      reason: classification.stockReason,
      notes: input.notes || classification.notes,
      reference_type: input.referenceType || input.reference_type || classification.sourcingModel.toLowerCase(),
      reference_id: input.referenceId || input.reference_id || null,
      inventory_source_type: classification.inventorySourceType,
      source_document_type: input.sourceDocumentType || input.source_document_type || null,
      source_document_id: input.sourceDocumentId || input.source_document_id || null,
      warehouse_id: input.warehouseId || input.warehouse_id || null,
    },
    /** Hint for callers — whether to also build a Phase 3 purchase payload */
    purchaseHint: classification.isPurchase
      ? {
        shouldCreatePurchase: true,
        purchaseType: classification.purchaseType,
        inventorySourceType: mapPurchaseTypeToInventorySource(classification.purchaseType),
      }
      : {
        shouldCreatePurchase: false,
        reason: classification.notes,
      },
  };
}
