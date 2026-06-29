import { getCachedSetting } from '@/services/settingsService';
import { STORE_GEOGRAPHY } from '@/brand/monsoonTokens';

export const FREE_DELIVERY_THRESHOLD_DEFAULT = 999;

export function resolveFreeDeliveryThreshold(settingsMap = {}, fallback = FREE_DELIVERY_THRESHOLD_DEFAULT) {
  const raw = settingsMap?.free_delivery_threshold ?? getCachedSetting('free_delivery_threshold', fallback);
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function formatFreeDeliveryNote(threshold, variant = 'hero') {
  const amount = Number(threshold);
  const reach = STORE_GEOGRAPHY.deliveryReach;

  if (!Number.isFinite(amount) || amount <= 0) {
    return variant === 'store'
      ? `Home delivery available ${reach}.`
      : `Home delivery available ${reach}.`;
  }

  if (variant === 'store') {
    return `Free delivery above ₹${amount} ${reach}. Visit our store in Ashok Nagar anytime.`;
  }

  return `Free home delivery above ₹${amount} on qualifying orders across ${STORE_GEOGRAPHY.city}.`;
}
