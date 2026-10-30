/**
 * Place-of-supply engine — centralized CGST/SGST vs IGST decision.
 * Do not compare state strings ad-hoc in UI code; call resolvePlaceOfSupply().
 *
 * State codes are geographic reference data (GSTIN first two digits), not tax rates.
 */

import { SUPPLY_TAX_SPLIT } from './constants.js';

/** Official GST state codes (partial map for common states; extend via data later). */
export const GST_STATE_CODES = Object.freeze({
  '01': 'Jammu and Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
});

const NAME_TO_CODE = Object.freeze(
  Object.fromEntries(
    Object.entries(GST_STATE_CODES).map(([code, name]) => [normalizeStateKey(name), code]),
  ),
);

function normalizeStateKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalize a state input (code or name) to a 2-digit GST state code.
 * Returns null when unknown — never invent.
 */
export function normalizeGstStateCode(input) {
  if (input == null || input === '') return null;
  const raw = String(input).trim();
  if (/^\d{2}$/.test(raw) && GST_STATE_CODES[raw]) return raw;
  if (/^\d{1}$/.test(raw)) {
    const padded = raw.padStart(2, '0');
    if (GST_STATE_CODES[padded]) return padded;
  }
  // GSTIN: first 2 chars are state code
  if (/^[0-9]{2}[A-Z]{5}/i.test(raw)) {
    const code = raw.slice(0, 2);
    if (GST_STATE_CODES[code]) return code;
  }
  const byName = NAME_TO_CODE[normalizeStateKey(raw)];
  return byName || null;
}

/**
 * Resolve place of supply and tax split.
 *
 * @param {object} input
 * @param {string} [input.supplierState] - supplier/business state (code or name)
 * @param {string} [input.customerState] - customer billing/shipping state
 * @param {string} [input.placeOfSupply] - explicit PoS override (code or name)
 * @param {string} [input.transactionType] - informational (SALE, etc.)
 * @param {string} [input.customerGstStatus] - ACTIVE / NOT_REGISTERED / ...
 */
export function resolvePlaceOfSupply(input = {}) {
  const supplierCode = normalizeGstStateCode(input.supplierState);
  const explicitPos = normalizeGstStateCode(input.placeOfSupply);
  const customerCode = normalizeGstStateCode(input.customerState);

  const placeOfSupplyCode = explicitPos || customerCode || null;

  const reasons = [];
  if (!supplierCode) {
    reasons.push('Supplier/business state could not be normalized to a GST state code.');
  }
  if (!placeOfSupplyCode) {
    reasons.push('Place of supply could not be determined (missing customer state / PoS).');
  }

  if (!supplierCode || !placeOfSupplyCode) {
    return {
      ok: false,
      supplySplit: SUPPLY_TAX_SPLIT.UNKNOWN,
      supplierStateCode: supplierCode,
      placeOfSupplyCode,
      customerStateCode: customerCode,
      applyCgstSgst: false,
      applyIgst: false,
      reasons,
      explanation: reasons.join(' '),
    };
  }

  const intra = supplierCode === placeOfSupplyCode;
  const supplySplit = intra ? SUPPLY_TAX_SPLIT.INTRA_STATE : SUPPLY_TAX_SPLIT.INTER_STATE;

  const explanation = intra
    ? `Supplier state ${supplierCode} matches place of supply ${placeOfSupplyCode} → CGST + SGST.`
    : `Supplier state ${supplierCode} differs from place of supply ${placeOfSupplyCode} → IGST.`;

  return {
    ok: true,
    supplySplit,
    supplierStateCode: supplierCode,
    placeOfSupplyCode,
    customerStateCode: customerCode,
    applyCgstSgst: intra,
    applyIgst: !intra,
    customerGstStatus: input.customerGstStatus || null,
    transactionType: input.transactionType || 'SALE',
    reasons: [],
    explanation,
  };
}

/**
 * Split a total GST amount (paise) into CGST/SGST or IGST given supply resolution.
 * For INTRA_STATE, CGST and SGST each get half (odd paise → CGST gets +1).
 */
export function splitTaxComponents(totalTaxPaise, placeOfSupplyResult) {
  const total = Math.max(0, Math.round(Number(totalTaxPaise) || 0));
  if (!placeOfSupplyResult?.ok) {
    return {
      ok: false,
      cgstPaise: 0,
      sgstPaise: 0,
      igstPaise: 0,
      error: 'Cannot split tax without a resolved place of supply.',
    };
  }
  if (placeOfSupplyResult.applyIgst) {
    return { ok: true, cgstPaise: 0, sgstPaise: 0, igstPaise: total };
  }
  const cgstPaise = Math.ceil(total / 2);
  const sgstPaise = total - cgstPaise;
  return { ok: true, cgstPaise, sgstPaise, igstPaise: 0 };
}

/**
 * Resolve component rates (bp) from a total GST rate given supply split.
 * INTRA: CGST = SGST = half of gst_rate_bp (must be even for clean split; odd bp rejected).
 */
export function resolveComponentRatesBp(gstRateBp, placeOfSupplyResult) {
  const gst = Math.max(0, Math.round(Number(gstRateBp) || 0));
  if (!placeOfSupplyResult?.ok) {
    return {
      ok: false,
      cgstRateBp: 0,
      sgstRateBp: 0,
      igstRateBp: 0,
      error: 'Cannot resolve component rates without place of supply.',
    };
  }
  if (placeOfSupplyResult.applyIgst) {
    return { ok: true, cgstRateBp: 0, sgstRateBp: 0, igstRateBp: gst };
  }
  if (gst % 2 !== 0) {
    return {
      ok: false,
      cgstRateBp: 0,
      sgstRateBp: 0,
      igstRateBp: 0,
      error: `GST rate ${gst} bp is odd; cannot split evenly into CGST+SGST without inventing rates.`,
    };
  }
  const half = gst / 2;
  return { ok: true, cgstRateBp: half, sgstRateBp: half, igstRateBp: 0 };
}
