/**
 * Consignment sourcing — stock without immediate purchase.
 * Ownership/payment is not a normal purchase until settled/sold.
 */

import {
  CONSIGNMENT_STATUS,
  INVENTORY_SOURCE_TYPE,
  SOURCING_ERROR_CODE,
} from './sourcingConstants.js';
import { buildSourcedStockMovementPayload } from './sourcingEvent.js';
import { PURCHASE_TYPE } from './purchaseConstants.js';

function qty(n) {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

/**
 * Receive consignment stock. Creates consignment_lots row + stock movement hint.
 * Does NOT create a purchase invoice.
 */
export function buildConsignmentReceivePayload(input = {}) {
  const productId = input.productId || input.product_id;
  const quantity = qty(input.quantity ?? input.quantityReceived ?? input.quantity_received);
  if (!productId) {
    return { ok: false, code: SOURCING_ERROR_CODE.MISSING_PRODUCT, message: 'product_id required.' };
  }
  if (quantity <= 0) {
    return { ok: false, code: SOURCING_ERROR_CODE.MISSING_QUANTITY, message: 'quantity_received must be > 0.' };
  }

  const lot = {
    vendor_id: input.vendorId || input.vendor_id || null,
    product_id: productId,
    variant_sku: input.variantSku || input.variant_sku || null,
    quantity_received: quantity,
    quantity_sold: 0,
    quantity_returned: 0,
    status: CONSIGNMENT_STATUS.OPEN,
    received_at: input.receivedAt || input.received_at || new Date().toISOString(),
    settled_purchase_invoice_id: null,
    notes: input.notes || 'Consignment receipt — not a purchase until settled.',
  };

  const movement = buildSourcedStockMovementPayload({
    productId,
    variantSku: lot.variant_sku,
    deltaUnits: input.trackAsUnits === false ? 0 : quantity,
    deltaKg: input.deltaKg || input.delta_kg || 0,
    inventorySourceType: INVENTORY_SOURCE_TYPE.CONSIGNMENT,
    notes: lot.notes,
    sourceDocumentType: 'consignment_lot',
    createPurchase: false,
  });

  if (!movement.ok) return movement;

  return {
    ok: true,
    model: 'CONSIGNMENT',
    createsPurchaseInvoice: false,
    consignmentLot: lot,
    stockMovement: movement.stockMovement,
    disclaimer: 'Consignment stock must not create a normal purchase invoice on receipt.',
  };
}

/**
 * Record sold quantity against an open consignment lot (in-memory calc).
 */
export function applyConsignmentSale(lot = {}, soldQty = 0) {
  const sold = qty(soldQty);
  if (sold <= 0) {
    return { ok: false, code: SOURCING_ERROR_CODE.MISSING_QUANTITY, message: 'sold quantity must be > 0.' };
  }
  if (String(lot.status) === CONSIGNMENT_STATUS.SETTLED) {
    return {
      ok: false,
      code: SOURCING_ERROR_CODE.CONSIGNMENT_ALREADY_SETTLED,
      message: 'Cannot sell against a settled consignment lot.',
    };
  }
  if (String(lot.status) === CONSIGNMENT_STATUS.CANCELLED || String(lot.status) === CONSIGNMENT_STATUS.RETURNED) {
    return {
      ok: false,
      code: SOURCING_ERROR_CODE.CONSIGNMENT_NOT_SETTLED,
      message: `Consignment lot status ${lot.status} does not allow sales.`,
    };
  }

  const received = qty(lot.quantity_received);
  const alreadySold = qty(lot.quantity_sold);
  const returned = qty(lot.quantity_returned);
  const available = received - alreadySold - returned;
  if (sold > available + 1e-9) {
    return {
      ok: false,
      code: SOURCING_ERROR_CODE.MISSING_QUANTITY,
      message: `Sold qty ${sold} exceeds available consignment qty ${available}.`,
    };
  }

  const quantity_sold = alreadySold + sold;
  const remaining = received - quantity_sold - returned;

  return {
    ok: true,
    lotUpdate: {
      quantity_sold,
      status: remaining > 0 ? CONSIGNMENT_STATUS.OPEN : CONSIGNMENT_STATUS.PARTIAL,
    },
    remaining,
    createsPurchaseInvoice: false,
    note: 'Sale against consignment does not auto-create purchase; settle explicitly.',
  };
}

/**
 * Settle consignment → create purchase hint (Phase 3), optionally mark lot SETTLED.
 */
export function buildConsignmentSettlementPayload(input = {}) {
  const lot = input.lot || {};
  if (String(lot.status) === CONSIGNMENT_STATUS.SETTLED) {
    return {
      ok: false,
      code: SOURCING_ERROR_CODE.CONSIGNMENT_ALREADY_SETTLED,
      message: 'Consignment lot already settled.',
    };
  }

  const settleQty = qty(
    input.settleQuantity
      ?? input.settle_quantity
      ?? (qty(lot.quantity_sold) || qty(lot.quantity_received) - qty(lot.quantity_returned)),
  );
  if (settleQty <= 0) {
    return {
      ok: false,
      code: SOURCING_ERROR_CODE.MISSING_QUANTITY,
      message: 'Settlement quantity must be > 0.',
    };
  }

  const purchaseType = input.purchaseType
    || (input.vendorGstin || input.vendor_gstin
      ? PURCHASE_TYPE.GST_PURCHASE
      : PURCHASE_TYPE.NON_GST_PURCHASE);

  return {
    ok: true,
    model: 'CONSIGNMENT',
    createsPurchaseInvoice: true,
    settleQuantity: settleQty,
    lotUpdate: {
      status: CONSIGNMENT_STATUS.SETTLED,
      settled_purchase_invoice_id: input.purchaseInvoiceId || null, // filled after insert
    },
    purchaseHint: {
      purchaseType,
      vendorId: lot.vendor_id || input.vendorId || null,
      vendorGstin: input.vendorGstin || input.vendor_gstin || null,
      lines: [
        {
          productId: lot.product_id,
          variantSku: lot.variant_sku,
          quantity: settleQty,
          taxableValuePaise: input.taxableValuePaise ?? input.taxable_value_paise,
          gstRateBp: input.gstRateBp ?? input.gst_rate_bp,
          description: input.description || 'Consignment settlement',
        },
      ],
      inventorySourceType: INVENTORY_SOURCE_TYPE.CONSIGNMENT,
      notes: 'Purchase created on consignment settlement — not on original receipt.',
    },
    disclaimer: 'Settlement is the first point a normal purchase invoice is appropriate for consignment stock.',
  };
}

export function buildConsignmentReturnPayload(lot = {}, returnQty = 0) {
  const returnedAdd = qty(returnQty);
  if (returnedAdd <= 0) {
    return { ok: false, code: SOURCING_ERROR_CODE.MISSING_QUANTITY, message: 'return qty must be > 0.' };
  }
  const available = qty(lot.quantity_received) - qty(lot.quantity_sold) - qty(lot.quantity_returned);
  if (returnedAdd > available + 1e-9) {
    return {
      ok: false,
      code: SOURCING_ERROR_CODE.MISSING_QUANTITY,
      message: `Return qty exceeds available ${available}.`,
    };
  }
  const quantity_returned = qty(lot.quantity_returned) + returnedAdd;
  const remaining = qty(lot.quantity_received) - qty(lot.quantity_sold) - quantity_returned;
  return {
    ok: true,
    createsPurchaseInvoice: false,
    lotUpdate: {
      quantity_returned,
      status: remaining <= 0 ? CONSIGNMENT_STATUS.RETURNED : CONSIGNMENT_STATUS.OPEN,
    },
    stockMovementHint: buildSourcedStockMovementPayload({
      productId: lot.product_id,
      variantSku: lot.variant_sku,
      deltaUnits: -returnedAdd,
      inventorySourceType: INVENTORY_SOURCE_TYPE.SUPPLIER_RETURN,
      notes: 'Consignment return to supplier',
      createPurchase: false,
    }),
  };
}
