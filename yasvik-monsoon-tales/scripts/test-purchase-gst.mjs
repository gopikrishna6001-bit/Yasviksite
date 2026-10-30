import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ITC_STATUS,
  PURCHASE_ERROR_CODE,
  PURCHASE_TYPE,
  RECONCILIATION_STATUS,
  buildFarmerLocalPurchasePayload,
  buildGstPurchasePayload,
  buildItcReconciliationReview,
  buildNonGstPurchasePayload,
  buildPurchasePersistPayload,
  buildSampleFreeStockPayload,
  calculatePurchaseDocument,
  percentToRateBp,
  transitionItcStatus,
} from '../src/lib/tax/index.js';

describe('Phase 3 purchase GST engine', () => {
  it('TEST 3 — GST purchase: taxable 1000, 18% GST → total 1180, potential ITC 180, cost unchanged', () => {
    const existingCostPaise = 100000; // ₹1000 existing product cost snapshot
    const result = buildGstPurchasePayload({
      vendorGstin: '36AAAAA0000A1Z5',
      invoiceNumber: 'V-1001',
      invoiceDate: '2026-08-07',
      placeOfSupplyInput: { supplierState: '27', customerState: '36' }, // vendor MH → Yasvik TG = IGST
      lines: [
        {
          productId: 'prod-1',
          description: 'Raw peanuts',
          hsnSac: '1202',
          quantity: 10,
          unit: 'kg',
          taxableValuePaise: 100000, // ₹1,000
          gstRateBp: percentToRateBp(18),
          existingProductCostPaise: existingCostPaise,
        },
      ],
    });

    assert.equal(result.ok, true);
    assert.equal(result.invoice.taxable_value_paise, 100000);
    assert.equal(result.invoice.total_gst_paise, 18000);
    assert.equal(result.invoice.igst_paise, 18000);
    assert.equal(result.invoice.cgst_paise, 0);
    assert.equal(result.invoice.sgst_paise, 0);
    assert.equal(result.invoice.invoice_total_paise, 118000);
    assert.equal(result.invoice.cost_total_paise, 100000);
    assert.equal(result.potentialItc.potential_itc_paise, 18000);
    assert.equal(result.potentialItc.itc_status, ITC_STATUS.PENDING_REVIEW);
    assert.match(result.potentialItc.label, /POTENTIAL/i);
    assert.equal(result.productCostPolicy.overwriteProductCost, false);
    assert.equal(result.lines[0].existing_product_cost_paise, existingCostPaise);
    assert.equal(result.inputTaxLedger.claimed_itc_paise, 0);
    assert.equal(result.itcReconciliation.reconciliation_status, RECONCILIATION_STATUS.NOT_CHECKED);
  });

  it('TEST 3b — same-state GST purchase uses CGST+SGST', () => {
    const result = calculatePurchaseDocument({
      purchaseType: PURCHASE_TYPE.GST_PURCHASE,
      vendorGstin: '36AAAAA0000A1Z5',
      invoiceNumber: 'V-1002',
      invoiceDate: '2026-08-07',
      placeOfSupplyInput: { supplierState: '36', customerState: '36' },
      lines: [
        {
          taxableValuePaise: 100000,
          gstRateBp: percentToRateBp(18),
          existingProductCostPaise: 95000,
        },
      ],
    });
    assert.equal(result.ok, true);
    assert.equal(result.header.cgst_paise, 9000);
    assert.equal(result.header.sgst_paise, 9000);
    assert.equal(result.header.igst_paise, 0);
    assert.equal(result.header.invoice_total_paise, 118000);
  });

  it('TEST 4 — Non-GST purchase: GST=0, ITC=0', () => {
    const result = buildNonGstPurchasePayload({
      supplierName: 'Local kirana supplier',
      purchaseDate: '2026-08-07',
      lines: [
        {
          productId: 'prod-2',
          taxableValuePaise: 100000,
          existingProductCostPaise: 100000,
        },
      ],
    });
    assert.equal(result.ok, true);
    assert.equal(result.invoice.total_gst_paise, 0);
    assert.equal(result.invoice.invoice_total_paise, 100000);
    assert.equal(result.potentialItc.potential_itc_paise, 0);
    assert.equal(result.invoice.itc_status, ITC_STATUS.NOT_APPLICABLE);
    assert.equal(result.inputTaxLedger.itc_status, ITC_STATUS.NOT_APPLICABLE);
  });

  it('rejects fabricating GST onto non-GST purchase', () => {
    const result = calculatePurchaseDocument({
      purchaseType: PURCHASE_TYPE.NON_GST_PURCHASE,
      lines: [
        {
          taxableValuePaise: 100000,
          cgstPaise: 9000,
          sgstPaise: 9000,
        },
      ],
    });
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.code === PURCHASE_ERROR_CODE.GST_FABRICATED));
  });

  it('farmer / local producer: GST not mandatory, ITC not applicable', () => {
    const result = buildFarmerLocalPurchasePayload({
      supplierName: 'Ravi — village producer',
      notes: 'Village: Nalgonda; phone: 9876543210',
      lines: [
        {
          description: 'Groundnuts',
          quantity: 50,
          unit: 'kg',
          taxableValuePaise: 250000,
          existingProductCostPaise: 4000,
        },
      ],
    });
    assert.equal(result.ok, true);
    assert.equal(result.invoice.purchase_type, PURCHASE_TYPE.FARMER_LOCAL);
    assert.equal(result.invoice.total_gst_paise, 0);
    assert.equal(result.invoice.itc_status, ITC_STATUS.NOT_APPLICABLE);
    assert.equal(result.productCostPolicy.costUnchanged, true);
  });

  it('sample / free stock: no fabricated GST', () => {
    const result = buildSampleFreeStockPayload({
      supplierName: 'Brand sample',
      notes: 'Free sample for tasting',
      lines: [
        {
          description: 'Sample jar',
          quantity: 2,
          taxableValuePaise: 0,
          existingProductCostPaise: 5000,
        },
      ],
    });
    assert.equal(result.ok, true);
    assert.equal(result.invoice.total_gst_paise, 0);
    assert.equal(result.potentialItc.potential_itc_paise, 0);
  });

  it('refuses overwriteProductCost flag', () => {
    const result = buildPurchasePersistPayload({
      purchaseType: PURCHASE_TYPE.NON_GST_PURCHASE,
      overwriteProductCost: true,
      lines: [{ taxableValuePaise: 10000 }],
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, PURCHASE_ERROR_CODE.PRODUCT_COST_MUTATION_FORBIDDEN);
  });

  it('GST purchase requires invoice fields', () => {
    const result = buildGstPurchasePayload({
      lines: [{ taxableValuePaise: 10000, gstRateBp: 1800 }],
      placeOfSupplyInput: { supplierState: '36', customerState: '36' },
    });
    assert.equal(result.ok, false);
    assert.ok(
      result.code === PURCHASE_ERROR_CODE.MISSING_VENDOR_GSTIN
      || result.errors?.length,
    );
  });

  it('ITC transition: cannot jump to CLAIMED from PENDING without workflow; CLAIMED needs reason', () => {
    const bad = transitionItcStatus({
      fromStatus: ITC_STATUS.PENDING_REVIEW,
      toStatus: ITC_STATUS.CLAIMED,
    });
    assert.equal(bad.ok, false);

    const matched = transitionItcStatus({
      fromStatus: ITC_STATUS.PENDING_REVIEW,
      toStatus: ITC_STATUS.MATCHED,
    });
    assert.equal(matched.ok, true);

    const claimNoReason = transitionItcStatus({
      fromStatus: ITC_STATUS.ELIGIBLE_PENDING_CLAIM,
      toStatus: ITC_STATUS.CLAIMED,
    });
    assert.equal(claimNoReason.ok, false);

    const claim = transitionItcStatus({
      fromStatus: ITC_STATUS.ELIGIBLE_PENDING_CLAIM,
      toStatus: ITC_STATUS.CLAIMED,
      reason: 'Matched GSTR-2B period 2026-08; eligibility reviewed by admin',
    });
    assert.equal(claim.ok, true);
    assert.equal(claim.audit.action, 'itc_status_change');
  });

  it('reconciliation never auto-claims ITC', () => {
    const review = buildItcReconciliationReview({
      purchaseHeader: {
        vendor_gstin: '36AAAAA0000A1Z5',
        invoice_number: 'V-1001',
        invoice_date: '2026-08-07',
        taxable_value_paise: 100000,
        total_gst_paise: 18000,
      },
      potentialItcPaise: 18000,
      externalMatch: { taxableValuePaise: 100000, gstPaise: 18000 },
    });
    assert.equal(review.reconciliation_status, RECONCILIATION_STATUS.MATCHED);
    assert.equal(review.suggested_itc_status, ITC_STATUS.MATCHED);
    assert.equal(review.autoClaimed, false);
    assert.match(review.disclaimer, /Never auto-claim/i);
  });
});
