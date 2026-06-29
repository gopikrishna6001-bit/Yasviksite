import { supabase } from '@/api/supabaseClient';
import { appClient } from '@/api/appClient';
import { getCachedSetting } from '@/services/settingsService';
import { FREE_DELIVERY_THRESHOLD_DEFAULT } from '@/lib/commerceCopy';
import { formatPostalAreaLabel } from '@/lib/postalPincode';
import { computeLocalColonyDelivery } from '@/lib/storeDeliveryRules';

const zoneCache = new Map();
const resolveCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

function cacheGet(map, key) {
  const cached = map.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.value;
  return null;
}

function cacheSet(map, key, value) {
  map.set(key, { value, ts: Date.now() });
}

export async function lookupDeliveryZone(pincode) {
  const pin = String(pincode || '').trim();
  if (!/^\d{6}$/.test(pin)) return null;

  const hit = cacheGet(zoneCache, pin);
  if (hit) return hit;

  const { data, error } = await supabase
    .from('delivery_zones')
    .select('*')
    .eq('pincode', pin)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw error;
  cacheSet(zoneCache, pin, data);
  return data;
}

/**
 * Resolve pincode via worker: India Post directory + Yasvik service zone.
 * Returns official post office names and whether we deliver there.
 */
export async function resolvePincodeDelivery(pincode) {
  const pin = String(pincode || '').trim();
  if (!/^\d{6}$/.test(pin)) {
    return {
      serviceable: false,
      error: 'Enter a valid 6-digit pincode',
      postal: null,
      zone: null,
    };
  }

  const hit = cacheGet(resolveCache, pin);
  if (hit) return hit;

  const res = await appClient.functions.invoke('validateDeliveryPincode', { pincode: pin });
  const data = res.data || {};
  cacheSet(resolveCache, pin, data);
  return data;
}

export function zoneDisplayName(result) {
  if (!result) return '';
  const postalLabel = formatPostalAreaLabel(result.postal);
  if (postalLabel) return postalLabel;
  return result.zone?.area_name || '';
}

export function computeDeliveryFeePaise(subtotalPaise, zone, freeThresholdRs) {
  const threshold = Number(freeThresholdRs);
  const freeAbove = Number.isFinite(threshold) && threshold > 0
    ? threshold * 100
    : FREE_DELIVERY_THRESHOLD_DEFAULT * 100;

  if (!zone) return null;
  if (subtotalPaise >= freeAbove) return 0;
  return Number(zone.delivery_fee_paise) || 0;
}

export function resolveFreeThreshold(settingsMap = {}) {
  const raw = settingsMap?.free_delivery_threshold ?? getCachedSetting('free_delivery_threshold');
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : FREE_DELIVERY_THRESHOLD_DEFAULT;
}

export function formatDeliveryFee(feePaise) {
  if (!feePaise) return 'FREE';
  return `₹${(feePaise / 100).toFixed(0)}`;
}

/**
 * Resolve delivery fee + notes (local colony tiers override zone table).
 */
export function resolveDeliveryQuote({
  subtotalPaise,
  zone,
  pincode,
  settingsMap = {},
  totalWeightKg = 0,
  hasFragileItems = false,
}) {
  const local = computeLocalColonyDelivery({
    subtotalRs: subtotalPaise / 100,
    totalWeightKg,
    hasFragileItems,
    pincode,
    settingsMap,
  });

  if (local) {
    return {
      feePaise: local.feePaise,
      eta_label: local.eta_label || zone?.eta_label,
      notes: local.notes || [],
      warnings: local.warnings || [],
      pickupRecommended: local.pickupRecommended,
      mode: local.mode,
      source: 'local_colony',
    };
  }

  return {
    feePaise: computeDeliveryFeePaise(subtotalPaise, zone, resolveFreeThreshold(settingsMap)),
    eta_label: zone?.eta_label,
    notes: [],
    warnings: [],
    pickupRecommended: false,
    mode: 'delivery',
    source: 'zone',
  };
}

export function clearDeliveryZoneCache() {
  zoneCache.clear();
  resolveCache.clear();
}
