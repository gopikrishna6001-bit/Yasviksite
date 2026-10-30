import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CONSIGNMENT_STATUS,
  INVENTORY_SOURCE_TYPE,
  JOB_WORK_STATUS,
  PURCHASE_TYPE,
  SOURCING_ERROR_CODE,
  SOURCING_MODEL,
  SUPPLIER_TYPE,
  assertNotMergedModels,
  buildConsignmentReceivePayload,
  buildConsignmentSettlementPayload,
  buildContractManufacturingReceivePayload,
  buildFarmerVendorPayload,
  buildGstRegisteredVendorPayload,
  buildJobWorkMaterialsReturnedPayload,
  buildJobWorkMaterialsSentPayload,
  buildJobWorkOrderPayload,
  buildSourcedStockMovementPayload,
  classifyInventorySourcing,
  applyConsignmentSale,
} from '../src/lib/tax/index.js';

describe('Phase 4 sourcing engine', () => {
  it('does not treat every inventory addition as a purchase', () => {
    const transfer = classifyInventorySourcing({
      inventorySourceType: INVENTORY_SOURCE_TYPE.STOCK_TRANSFER,
    });
    assert.equal(transfer.ok, true);
    assert.equal(transfer.isPurchase, false);
    assert.equal(transfer.sourcingModel, SOURCING_MODEL.TRANSFER);

    const opening = classifyInventorySourcing({
      inventorySourceType: INVENTORY_SOURCE_TYPE.OPENING_STOCK,
    });
    assert.equal(opening.isPurchase, false);

    const gstSupplier = classifyInventorySourcing({
      inventorySourceType: INVENTORY_SOURCE_TYPE.GST_REGISTERED_SUPPLIER,
    });
    assert.equal(gstSupplier.isPurchase, true);
    assert.equal(gstSupplier.purchaseType, PURCHASE_TYPE.GST_PURCHASE);
  });

  it('consignment receive increases stock hint but does not create purchase', () => {
    const received = buildConsignmentReceivePayload({
      productId: 'prod-1',
      vendorId: 'vendor-1',
      quantity: 25,
    });
    assert.equal(received.ok, true);
    assert.equal(received.createsPurchaseInvoice, false);
    assert.equal(received.consignmentLot.status, CONSIGNMENT_STATUS.OPEN);
    assert.equal(received.stockMovement.inventory_source_type, INVENTORY_SOURCE_TYPE.CONSIGNMENT);
    assert.equal(received.stockMovement.delta_units, 25);
  });

  it('consignment sale does not auto-purchase; settlement does', () => {
    const lot = {
      vendor_id: 'vendor-1',
      product_id: 'prod-1',
      quantity_received: 25,
      quantity_sold: 0,
      quantity_returned: 0,
      status: CONSIGNMENT_STATUS.OPEN,
    };
    const sold = applyConsignmentSale(lot, 10);
    assert.equal(sold.ok, true);
    assert.equal(sold.createsPurchaseInvoice, false);
    assert.equal(sold.lotUpdate.quantity_sold, 10);

    const settle = buildConsignmentSettlementPayload({
      lot: { ...lot, quantity_sold: 10 },
      settleQuantity: 10,
      taxableValuePaise: 50000,
      vendorGstin: '36AAAAA0000A1Z5',
    });
    assert.equal(settle.ok, true);
    assert.equal(settle.createsPurchaseInvoice, true);
    assert.equal(settle.lotUpdate.status, CONSIGNMENT_STATUS.SETTLED);
    assert.equal(settle.purchaseHint.purchaseType, PURCHASE_TYPE.GST_PURCHASE);
  });

  it('job work and contract manufacturing must not be merged', () => {
    const merged = assertNotMergedModels(
      SOURCING_MODEL.JOB_WORK,
      SOURCING_MODEL.CONTRACT_MANUFACTURING,
    );
    assert.equal(merged.ok, false);
    assert.equal(merged.code, SOURCING_ERROR_CODE.MODEL_MERGE_FORBIDDEN);

    const job = buildJobWorkOrderPayload({
      jobCode: 'JW-001',
      vendorId: 'jw-1',
      materials: [{ product_id: 'raw-1', quantity: 5 }],
      processingChargePaise: 20000,
    });
    assert.equal(job.ok, true);
    assert.equal(job.createsFinishedGoodsPurchase, false);

    const sent = buildJobWorkMaterialsSentPayload(job.jobWorkOrder, {
      materials: [{ product_id: 'raw-1', quantity: 5 }],
    });
    assert.equal(sent.ok, true);
    assert.equal(sent.orderUpdate.status, JOB_WORK_STATUS.MATERIALS_SENT);
    assert.equal(sent.stockMovements[0].delta_units, -5);
    assert.equal(sent.createsFinishedGoodsPurchase, false);

    const returned = buildJobWorkMaterialsReturnedPayload(
      { ...job.jobWorkOrder, ...sent.orderUpdate, id: 'jw-row' },
      { returnedMaterials: [{ product_id: 'finished-1', quantity: 4 }] },
    );
    assert.equal(returned.ok, true);
    assert.equal(returned.servicePurchaseHint.purchaseType, PURCHASE_TYPE.JOB_WORK_SERVICE);

    const contract = buildContractManufacturingReceivePayload({
      productId: 'finished-1',
      quantity: 10,
      taxableValuePaise: 100000,
      vendorGstin: '36AAAAA0000A1Z5',
      invoiceNumber: 'CM-1',
      invoiceDate: '2026-08-07',
    });
    assert.equal(contract.ok, true);
    assert.equal(contract.createsFinishedGoodsPurchase, true);
    assert.equal(contract.purchaseHint.purchaseType, PURCHASE_TYPE.CONTRACT_MANUFACTURING);

    const badContract = buildContractManufacturingReceivePayload({
      productId: 'finished-1',
      quantity: 1,
      asJobWork: true,
    });
    assert.equal(badContract.ok, false);
  });

  it('farmer vendor does not require GSTIN; GST-registered does', () => {
    const farmer = buildFarmerVendorPayload({
      legalName: 'Ravi',
      village: 'Nalgonda',
      phone: '9876543210',
    });
    assert.equal(farmer.ok, true);
    assert.equal(farmer.vendor.supplier_type, SUPPLIER_TYPE.FARMER);
    assert.equal(farmer.taxProfile.gstin, null);
    assert.equal(farmer.taxProfile.gst_registration_status, 'NOT_REGISTERED');

    const gstMissing = buildGstRegisteredVendorPayload({ legalName: 'Acme Foods' });
    assert.equal(gstMissing.ok, false);
    assert.equal(gstMissing.code, SOURCING_ERROR_CODE.GSTIN_REQUIRED);

    const gstOk = buildGstRegisteredVendorPayload({
      legalName: 'Acme Foods',
      gstin: '36AAAAA0000A1Z5',
      stateCode: '36',
    });
    assert.equal(gstOk.ok, true);
    assert.equal(gstOk.vendor.invoice_capability, 'GST_INVOICE');
  });

  it('sourced stock movement payload carries inventory_source_type', () => {
    const movement = buildSourcedStockMovementPayload({
      productId: 'prod-9',
      deltaUnits: 3,
      inventorySourceType: INVENTORY_SOURCE_TYPE.SAMPLE_FREE,
    });
    assert.equal(movement.ok, true);
    assert.equal(movement.stockMovement.inventory_source_type, INVENTORY_SOURCE_TYPE.SAMPLE_FREE);
    assert.equal(movement.purchaseHint.shouldCreatePurchase, true);
    assert.equal(movement.purchaseHint.purchaseType, PURCHASE_TYPE.SAMPLE_FREE);

    const production = buildSourcedStockMovementPayload({
      productId: 'prod-9',
      deltaUnits: 12,
      inventorySourceType: INVENTORY_SOURCE_TYPE.YASVIK_PRODUCTION,
    });
    assert.equal(production.purchaseHint.shouldCreatePurchase, false);
  });

  it('customer return / supplier return are non-purchase stock events', () => {
    const customerReturn = buildSourcedStockMovementPayload({
      productId: 'prod-2',
      deltaUnits: 1,
      inventorySourceType: INVENTORY_SOURCE_TYPE.CUSTOMER_RETURN,
    });
    assert.equal(customerReturn.ok, true);
    assert.equal(customerReturn.classification.isPurchase, false);
    assert.equal(customerReturn.stockMovement.reason, 'return');
  });
});
