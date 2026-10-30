import { getCachedSetting } from '@/services/settingsService';

export const FREE_DELIVERY_THRESHOLD_DEFAULT = 999;

/** Smaller orders: store pickup only (arranged on WhatsApp). */
export const MIN_DELIVERY_ORDER_RS = 499;

/** Customer-facing delivery line — no free-delivery threshold promises. */
export const DELIVERY_OFFER_LINE = `Home delivery on orders from ₹${MIN_DELIVERY_ORDER_RS} (standard delivery charges extra) • Free store pickup`;

export const DELIVERY_RATE_CALCULATOR_URL = 'https://www.delhivery.com/rate-calculator/business-shipment';

/** Checkout does not collect the delivery charge — the customer pays the delivery partner.
 * Keep in sync with `COLLECT_DELIVERY_FEE_AT_CHECKOUT` in cloudflare/worker.js.
 * When true, `delivery_fee_paise` and `delivery_fee_charged_paise` are set at checkout.
 * When false, use Admin Delivery board to record `delivery_fee_charged_paise` + `delivery_cost_actual_paise`. */
export const DELIVERY_FEE_AT_CHECKOUT = false;

export const DELIVERY_FEE_CHECKOUT_LABEL = 'Extra · standard rates';

export const CHECKOUT_DELIVERY_EXPLAINER =
  'Delivery charges are extra and not included in this total. Within Hyderabad, standard Porter / Rapido delivery charges apply — we pick the best slot to avoid surcharges and peak city traffic.';

export const CHECKOUT_DELIVERY_PAYMENT_NOTE =
  'Outside Hyderabad, standard courier charges apply — we choose the best partner for safe delivery at a reasonable charge.';

export const CHECKOUT_DELIVERY_SAVINGS_TIPS = [
  'Charges are based on weight, package size and distance.',
];

export const CHECKOUT_DELIVERY_OUTSIDE_NOTE =
  'Outside our regular delivery area, we will confirm courier options and cost before dispatch.';

export function resolveFreeDeliveryThreshold(settingsMap = {}, fallback = FREE_DELIVERY_THRESHOLD_DEFAULT) {
  const raw = settingsMap?.free_delivery_threshold ?? getCachedSetting('free_delivery_threshold', fallback);
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function formatFreeDeliveryNote() {
  return DELIVERY_OFFER_LINE;
}
