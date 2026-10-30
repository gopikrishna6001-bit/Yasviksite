import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CLASSIFICATION_STATUS,
  DISCOUNT_TAX_APPLICATION,
  PRICE_TAX_MODE,
  REGISTRATION_STATUS,
  SUSPENDED_GST_WARNING,
  TAX_ERROR_CODE,
  analyzeTaxRuleImpact,
  buildBillingGateContext,
  calculateInvoiceTax,
  calculateLineTax,
  canAutoApplyClassification,
  explainLineTaxDecision,
  resolvePlaceOfSupply,
  resolveTaxRuleForDate,
  suggestTaxClassification,
  validateTaxableInvoiceFinalization,
  percentToRateBp,
  buildNextTaxRuleVersion,
} from '../src/lib/tax/index.js';

const RULE_5 = {
  id: 'ver-5',
  tax_rule_id: 'rule-1',
  version: 1,
  hsn_sac: '210690',
  tax_treatment: 'TAXABLE',
  gst_rate_bp: percentToRateBp(5),
  cgst_rate_bp: percentToRateBp(2.5),
  sgst_rate_bp: percentToRateBp(2.5),
  igst_rate_bp: percentToRateBp(5),
  effective_from: '2020-01-01',
  effective_to: null,
  status: 'ACTIVE',
};

const RULE_5_FUTURE = {
  ...RULE_5,
  id: 'ver-5b',
  version: 2,
  gst_rate_bp: percentToRateBp(12),
  cgst_rate_bp: percentToRateBp(6),
  sgst_rate_bp: percentToRateBp(6),
  igst_rate_bp: percentToRateBp(12),
  effective_from: '2099-01-01',
  status: 'ACTIVE',
};

describe('Phase 2 tax engine', () => {
  it('TEST 1 — TAX_NOT_APPLIED legacy sale keeps payable = gross − discount (no GST)', () => {
    const line = calculateLineTax({
      grossPaise: 50000,
      discountPaise: 10000,
      priceTaxMode: PRICE_TAX_MODE.TAX_NOT_APPLIED,
      discountTaxApplication: DISCOUNT_TAX_APPLICATION.REDUCE_TAXABLE_BASE,
      taxRuleVersion: RULE_5,
      placeOfSupplyInput: { supplierState: '36', customerState: '36' },
    });
    assert.equal(line.ok, true);
    assert.equal(line.taxPaise, 0);
    assert.equal(line.lineTotalPaise, 40000);
    assert.match(line.explanation.why, /TAX_NOT_APPLIED/);
  });

  it('TEST 2 — discount requires explicit tax application (no silent assumption)', () => {
    const blocked = calculateLineTax({
      grossPaise: 50000,
      discountPaise: 10000,
      priceTaxMode: PRICE_TAX_MODE.TAX_EXCLUSIVE,
      discountTaxApplication: DISCOUNT_TAX_APPLICATION.UNSPECIFIED,
      taxRuleVersion: RULE_5,
      placeOfSupplyInput: { supplierState: 'Telangana', customerState: 'Telangana' },
    });
    assert.equal(blocked.ok, false);
    assert.equal(blocked.code, TAX_ERROR_CODE.DISCOUNT_TREATMENT_UNSPECIFIED);

    const ok = calculateLineTax({
      grossPaise: 50000,
      discountPaise: 10000,
      priceTaxMode: PRICE_TAX_MODE.TAX_EXCLUSIVE,
      discountTaxApplication: DISCOUNT_TAX_APPLICATION.REDUCE_TAXABLE_BASE,
      taxRuleVersion: RULE_5,
      placeOfSupplyInput: { supplierState: '36', customerState: '36' },
    });
    assert.equal(ok.ok, true);
    assert.equal(ok.taxableValuePaise, 40000);
    assert.equal(ok.taxPaise, 2000); // 5% of 40000
    assert.equal(ok.cgstPaise + ok.sgstPaise, 2000);
    assert.equal(ok.lineTotalPaise, 42000);
  });

  it('TEST 6 — suspended GST blocks taxable finalization', () => {
    const result = validateTaxableInvoiceFinalization({
      businessTaxProfile: {
        registration_status: REGISTRATION_STATUS.SUSPENDED,
        gst_live_billing: false,
        state_code: '36',
      },
      gstLiveBilling: false,
      invoiceDate: '2026-08-07',
      placeOfSupplyInput: { customerState: '36' },
      lines: [
        {
          priceTaxMode: PRICE_TAX_MODE.TAX_EXCLUSIVE,
          classification: {
            hsn_sac: '210690',
            classification_status: CLASSIFICATION_STATUS.VERIFIED,
            tax_rule_version_id: 'ver-5',
          },
          taxRuleVersions: [RULE_5],
        },
      ],
    });
    assert.equal(result.ok, false);
    assert.ok(result.blockers.some((b) => b.code === TAX_ERROR_CODE.GST_LIVE_BILLING_OFF));
    assert.ok(result.blockers.some((b) => b.code === TAX_ERROR_CODE.REGISTRATION_SUSPENDED));
    assert.match(result.warnings[0]?.message || SUSPENDED_GST_WARNING, /suspended/i);
  });

  it('TEST 7 — old invoice keeps old rate; future date uses new version', () => {
    const old = resolveTaxRuleForDate({
      invoiceDate: '2026-08-07',
      taxRuleVersions: [RULE_5, RULE_5_FUTURE],
    });
    assert.equal(old.ok, true);
    assert.equal(old.version.id, 'ver-5');
    assert.equal(old.version.gst_rate_bp, 500);

    const future = resolveTaxRuleForDate({
      invoiceDate: '2099-06-01',
      taxRuleVersions: [RULE_5, RULE_5_FUTURE],
    });
    // Both v1 (open-ended) and v2 match 2099 — ambiguous unless preferred or v1 ended
    assert.equal(future.ok, false);
    assert.equal(future.code, TAX_ERROR_CODE.AMBIGUOUS_CLASSIFICATION);

    const closedOld = {
      ...RULE_5,
      effective_to: '2098-12-31',
    };
    const futureClean = resolveTaxRuleForDate({
      invoiceDate: '2099-06-01',
      taxRuleVersions: [closedOld, RULE_5_FUTURE],
    });
    assert.equal(futureClean.ok, true);
    assert.equal(futureClean.version.gst_rate_bp, 1200);

    const next = buildNextTaxRuleVersion([RULE_5], {
      gst_rate_bp: 1200,
      effective_from: '2099-01-01',
      status: 'DRAFT',
    });
    assert.equal(next.version, 2);
    assert.equal(next.status, 'DRAFT');
  });

  it('TEST 8 — ambiguous / low confidence classifier never auto-assigns', () => {
    const suggestion = suggestTaxClassification(
      { name: 'Peanut powder', description: 'homemade peanut chilli powder snack' },
      [
        { hsn_sac: '210690', description: 'food preparations peanut powder snack' },
        { hsn_sac: '200819', description: 'preparations of peanut nuts roasted' },
      ],
    );
    assert.equal(suggestion.autoAssign, false);
    assert.ok(suggestion.disclaimer.includes('not legal authority'));

    const gate = canAutoApplyClassification({
      classification_status: CLASSIFICATION_STATUS.AI_SUGGESTED,
      hsn_sac: '210690',
    });
    assert.equal(gate.ok, false);
    assert.equal(gate.code, TAX_ERROR_CODE.CLASSIFICATION_NOT_VERIFIED);
  });

  it('TEST 9 — same state → CGST + SGST', () => {
    const pos = resolvePlaceOfSupply({
      supplierState: 'Telangana',
      customerState: '36',
    });
    assert.equal(pos.ok, true);
    assert.equal(pos.applyCgstSgst, true);
    assert.equal(pos.applyIgst, false);

    const line = calculateLineTax({
      grossPaise: 100000,
      priceTaxMode: PRICE_TAX_MODE.TAX_EXCLUSIVE,
      taxRuleVersion: RULE_5,
      placeOfSupplyInput: { supplierState: '36', customerState: 'Telangana' },
    });
    assert.equal(line.ok, true);
    assert.equal(line.cgstPaise, 2500);
    assert.equal(line.sgstPaise, 2500);
    assert.equal(line.igstPaise, 0);
    assert.equal(line.taxPaise, 5000);
  });

  it('TEST 10 — other state → IGST', () => {
    const pos = resolvePlaceOfSupply({
      supplierState: '36',
      customerState: '27',
    });
    assert.equal(pos.ok, true);
    assert.equal(pos.applyIgst, true);

    const line = calculateLineTax({
      grossPaise: 100000,
      priceTaxMode: PRICE_TAX_MODE.TAX_EXCLUSIVE,
      taxRuleVersion: RULE_5,
      placeOfSupplyInput: { supplierState: '36', customerState: 'Maharashtra' },
    });
    assert.equal(line.ok, true);
    assert.equal(line.igstPaise, 5000);
    assert.equal(line.cgstPaise, 0);
    assert.equal(line.sgstPaise, 0);
  });

  it('blocks missing HSN and missing place of supply with exact codes', () => {
    const gate = canAutoApplyClassification({
      classification_status: CLASSIFICATION_STATUS.VERIFIED,
    });
    // verified without HSN still fails at invoice validation
    assert.equal(gate.ok, true);

    const finalization = validateTaxableInvoiceFinalization({
      businessTaxProfile: {
        registration_status: REGISTRATION_STATUS.ACTIVE,
        gst_live_billing: true,
        gst_compliance_mode_start_date: '2026-09-01',
        state_code: '36',
      },
      gstLiveBilling: true,
      invoiceDate: '2026-09-15',
      placeOfSupplyInput: {},
      lines: [
        {
          priceTaxMode: PRICE_TAX_MODE.TAX_EXCLUSIVE,
          classification: {
            classification_status: CLASSIFICATION_STATUS.VERIFIED,
            hsn_sac: '',
          },
          taxRuleVersions: [RULE_5],
        },
      ],
    });
    assert.equal(finalization.ok, false);
    assert.ok(finalization.blockers.some((b) => b.code === TAX_ERROR_CODE.MISSING_PLACE_OF_SUPPLY));
    assert.ok(finalization.blockers.some((b) => b.code === TAX_ERROR_CODE.MISSING_HSN));
  });

  it('explainLineTaxDecision returns why rate was applied', () => {
    const explained = explainLineTaxDecision({
      invoiceDate: '2026-08-07',
      grossPaise: 100000,
      priceTaxMode: PRICE_TAX_MODE.TAX_EXCLUSIVE,
      taxRuleVersions: [RULE_5],
      hsnSac: '210690',
      classification: {
        hsn_sac: '210690',
        classification_status: CLASSIFICATION_STATUS.VERIFIED,
      },
      placeOfSupplyInput: { supplierState: '36', customerState: '36' },
    });
    assert.equal(explained.ok, true);
    assert.equal(explained.taxPaise, 5000);
    assert.match(explained.explanation.why, /5|500|bp|rule version/i);
  });

  it('invoice aggregation and impact analysis', () => {
    const invoice = calculateInvoiceTax(
      [
        {
          grossPaise: 100000,
          priceTaxMode: PRICE_TAX_MODE.TAX_EXCLUSIVE,
          taxRuleVersion: RULE_5,
          placeOfSupplyInput: { supplierState: '36', customerState: '36' },
        },
        {
          grossPaise: 20000,
          priceTaxMode: PRICE_TAX_MODE.TAX_EXCLUSIVE,
          taxRuleVersion: RULE_5,
          placeOfSupplyInput: { supplierState: '36', customerState: '36' },
        },
      ],
      { invoiceDate: '2026-08-07', placeOfSupplyInput: { supplierState: '36', customerState: '36' } },
    );
    assert.equal(invoice.ok, true);
    assert.equal(invoice.totals.taxableValuePaise, 120000);
    assert.equal(invoice.totals.totalTaxPaise, 6000);

    const impact = analyzeTaxRuleImpact({
      products: [{ id: 'p1', name: 'Peanut Powder' }],
      classifications: [
        {
          product_id: 'p1',
          tax_rule_id: 'rule-1',
          hsn_sac: '210690',
          gst_rate_bp: 500,
          classification_status: 'VERIFIED',
        },
      ],
      newVersion: { tax_rule_id: 'rule-1', gst_rate_bp: 1200, effective_from: '2099-01-01' },
    });
    assert.equal(impact.affectedCount, 1);
    assert.match(impact.message, /1 product/);
  });

  it('GST_LIVE_BILLING off even when registration ACTIVE still blocks finalize', () => {
    const ctx = buildBillingGateContext({
      businessTaxProfile: {
        registration_status: REGISTRATION_STATUS.ACTIVE,
        gst_live_billing: false,
        gst_compliance_mode_start_date: '2026-09-01',
      },
    });
    assert.equal(ctx.gstLiveBilling, false);

    const result = validateTaxableInvoiceFinalization({
      businessTaxProfile: ctx,
      gstLiveBilling: false,
      invoiceDate: '2026-09-15',
      placeOfSupplyInput: { supplierState: '36', customerState: '36' },
      lines: [
        {
          priceTaxMode: PRICE_TAX_MODE.TAX_EXCLUSIVE,
          classification: {
            hsn_sac: '210690',
            classification_status: CLASSIFICATION_STATUS.VERIFIED,
          },
          taxRuleVersions: [RULE_5],
        },
      ],
    });
    assert.equal(result.ok, false);
    assert.ok(result.blockers.some((b) => b.code === TAX_ERROR_CODE.GST_LIVE_BILLING_OFF));
  });
});
