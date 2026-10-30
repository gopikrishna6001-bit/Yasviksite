/**
 * Coupon / discount helpers — client preview math; server is source of truth.
 */

export function normalizeCouponCode(code) {
  return String(code || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

export function formatDiscountLabel({
  discountType,
  discountValue,
  couponCode,
  manualPercent,
  manualFixedPaise,
} = {}) {
  if (couponCode) return normalizeCouponCode(couponCode);
  if (discountType === 'manual_percent' || manualPercent != null) {
    return `${Number(manualPercent || discountValue || 0)}%`;
  }
  if (discountType === 'manual_fixed' || manualFixedPaise != null) {
    const rs = (Number(manualFixedPaise) || Number(discountValue) || 0) / (manualFixedPaise != null ? 100 : 1);
    return `₹${Math.round(rs)} off`;
  }
  if (discountType === 'percent') return `${Number(discountValue || 0)}%`;
  if (discountType === 'fixed') return `₹${Number(discountValue || 0)} off`;
  return '';
}

/** Client-side estimate only — worker recomputes. */
export function computeDiscountPaise(subtotalPaise, { type, value, maxDiscountPaise } = {}) {
  const sub = Math.max(0, Math.round(Number(subtotalPaise) || 0));
  if (!sub || !type || !(Number(value) > 0)) return 0;
  let discount = 0;
  if (type === 'percent') {
    discount = Math.round(sub * (Number(value) / 100));
    if (maxDiscountPaise != null && Number(maxDiscountPaise) > 0) {
      discount = Math.min(discount, Math.round(Number(maxDiscountPaise)));
    }
  } else if (type === 'fixed') {
    // value in rupees for coupons; callers may pass paise via valuePaise
    discount = Math.round(Number(value) * 100);
  } else if (type === 'fixed_paise') {
    discount = Math.round(Number(value));
  }
  return Math.max(0, Math.min(discount, sub));
}

export const POS_QUICK_PERCENTS = [5, 10, 15];
