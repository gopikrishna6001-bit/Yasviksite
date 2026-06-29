/**
 * Local colony delivery rules (Bhavanipuram / nearby).
 * Applies to pincodes listed in local_colony_pincodes app setting.
 */

export const LOCAL_COLONY_PINCODES_DEFAULT = ['500050', '500020', '500019', '500032', '500018'];

export function parseLocalColonyPincodes(settingsMap = {}) {
  const raw = settingsMap?.local_colony_pincodes;
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      return raw.split(/[,\s]+/).filter(Boolean);
    }
  }
  return LOCAL_COLONY_PINCODES_DEFAULT;
}

export function isLocalColonyPincode(pincode, settingsMap = {}) {
  const pin = String(pincode || '').trim();
  return parseLocalColonyPincodes(settingsMap).includes(pin);
}

/**
 * @returns {object} feePaise, mode ('delivery'|'pickup_only'), notes[], warnings[]
 */
export function computeLocalColonyDelivery({
  subtotalRs,
  totalWeightKg = 0,
  hasFragileItems = false,
  pincode,
  settingsMap = {},
}) {
  const subtotal = Number(subtotalRs) || 0;
  const weightKg = Number(totalWeightKg) || 0;
  const notes = [];
  const warnings = [];

  if (!isLocalColonyPincode(pincode, settingsMap)) {
    return null;
  }

  notes.push('Local colony delivery rates apply');

  if (subtotal < 299) {
    return {
      feePaise: 3000,
      mode: 'pickup_or_delivery',
      pickupRecommended: true,
      eta_label: 'Same-day / next-day (local)',
      notes: [
        'Orders below ₹299: store pickup recommended, or ₹30 delivery',
        ...notes,
      ],
      warnings,
    };
  }

  if (subtotal < 999) {
    const feeRs = subtotal < 500 ? 30 : 49;
    return {
      feePaise: feeRs * 100,
      mode: 'delivery',
      pickupRecommended: false,
      eta_label: 'Same-day / next-day (local)',
      notes: [`₹299–₹999 orders: ₹${feeRs} local delivery`, ...notes],
      warnings,
    };
  }

  let feePaise = 0;
  notes.push('Free delivery above ₹999');

  if (weightKg > 10) {
    warnings.push('Heavy order (10 kg+): additional delivery charge may apply — we will confirm before dispatch');
  }
  if (hasFragileItems) {
    warnings.push('Oils / glass items packed carefully; extra charge may apply for distant or heavy delivery');
  }

  return {
    feePaise,
    mode: 'delivery',
    pickupRecommended: false,
    eta_label: 'Same-day / next-day (local)',
    notes,
    warnings,
  };
}
