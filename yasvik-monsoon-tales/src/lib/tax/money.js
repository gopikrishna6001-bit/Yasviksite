/** Money helpers for the tax engine. Amounts in paise; rates in basis points (100 bp = 1%). */

export function toPaise(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

export function rupeesToPaise(rupees) {
  const n = Number(rupees);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export function paiseToRupees(paise) {
  return toPaise(paise) / 100;
}

/** 500 bp = 5.00% */
export function rateBpToDecimal(rateBp) {
  const n = Number(rateBp);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n / 10000;
}

export function percentToRateBp(percent) {
  const n = Number(percent);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

/** Half-up to nearest paise. */
export function roundPaise(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
}

/**
 * Apply GST rate (bp) to a taxable amount in paise.
 * tax = round(taxable * rateBp / 10000)
 */
export function taxOnTaxablePaise(taxablePaise, rateBp) {
  const taxable = Math.max(0, toPaise(taxablePaise));
  const bp = Math.max(0, Number(rateBp) || 0);
  return roundPaise((taxable * bp) / 10000);
}

/**
 * Extract tax from tax-inclusive amount.
 * taxable = round(inclusive * 10000 / (10000 + rateBp))
 * tax = inclusive - taxable
 */
export function extractTaxFromInclusivePaise(inclusivePaise, rateBp) {
  const inclusive = Math.max(0, toPaise(inclusivePaise));
  const bp = Math.max(0, Number(rateBp) || 0);
  if (bp === 0) {
    return { taxablePaise: inclusive, taxPaise: 0 };
  }
  const taxablePaise = roundPaise((inclusive * 10000) / (10000 + bp));
  const taxPaise = inclusive - taxablePaise;
  return { taxablePaise, taxPaise };
}

export function parseIsoDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export function dateInRange(isoDate, effectiveFrom, effectiveTo) {
  const d = parseIsoDate(isoDate);
  if (!d) return false;
  const from = parseIsoDate(effectiveFrom);
  const to = parseIsoDate(effectiveTo);
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}
