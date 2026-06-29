/**
 * India Post pincode parsing — data via postalpincode.in (India Post directory).
 * @see https://www.indiapost.gov.in/
 */

export const POSTAL_API_BASE = 'https://api.postalpincode.in/pincode';
export const POSTAL_SOURCE = 'postalpincode.in';
export const POSTAL_SYNC_STALE_DAYS = 30;

/** Hyderabad metro districts Yasvik may service */
export const HYDERABAD_METRO_DISTRICTS = new Set([
  'hyderabad',
  'ranga reddy',
  'rangareddy',
  'sangareddy',
  'medchal-malkajgiri',
  'medchal malkajgiri',
  'malkajgiri',
]);

export function normalizePincode(value) {
  return String(value || '').trim();
}

export function isValidPincodeFormat(pincode) {
  return /^\d{6}$/.test(normalizePincode(pincode));
}

function pickPrimaryPostOffice(offices = []) {
  if (!offices.length) return null;
  const delivery = offices.filter((o) => String(o.DeliveryStatus || '').toLowerCase() === 'delivery');
  const pool = delivery.length ? delivery : offices;
  const withoutSuffix = pool.find((o) => !/\(delivery\)|\(nd\)/i.test(String(o.Name || '')));
  return withoutSuffix || pool[0];
}

/**
 * Parse postalpincode.in response payload.
 * @param {unknown} payload
 * @param {string} pincode
 */
export function parsePostalApiResponse(payload, pincode) {
  const rows = Array.isArray(payload) ? payload : [];
  const head = rows[0];
  if (!head || head.Status !== 'Success' || !Array.isArray(head.PostOffice) || !head.PostOffice.length) {
    return {
      valid: false,
      pincode,
      error: head?.Message || 'Pincode not found in India Post directory',
    };
  }

  const offices = head.PostOffice.map((office) => ({
    name: office.Name || '',
    branch_type: office.BranchType || '',
    delivery_status: office.DeliveryStatus || '',
    district: office.District || '',
    state: office.State || '',
    block: office.Block || '',
    division: office.Division || '',
    region: office.Region || '',
    circle: office.Circle || '',
    country: office.Country || 'India',
    pincode: office.Pincode || pincode,
  }));

  const primary = pickPrimaryPostOffice(head.PostOffice);
  const district = primary?.District || offices[0]?.district || '';
  const state = primary?.State || offices[0]?.state || '';

  return {
    valid: true,
    pincode,
    primary_name: primary?.Name || offices[0]?.name || '',
    district,
    state,
    block: primary?.Block || offices[0]?.block || '',
    offices,
    office_count: offices.length,
    source: POSTAL_SOURCE,
    synced_at: new Date().toISOString(),
  };
}

export function isHyderabadMetroDistrict(district, state) {
  const d = String(district || '').trim().toLowerCase();
  const s = String(state || '').trim().toLowerCase();
  if (s && s !== 'telangana' && s !== 'andhra pradesh') return false;
  return HYDERABAD_METRO_DISTRICTS.has(d) || d.includes('hyderabad');
}

export function formatPostalAreaLabel(postal) {
  if (!postal?.valid) return '';
  const parts = [postal.primary_name, postal.district].filter(Boolean);
  return parts.join(', ');
}

export function isPostalSyncStale(syncedAt, staleDays = POSTAL_SYNC_STALE_DAYS) {
  if (!syncedAt) return true;
  const ts = new Date(syncedAt).getTime();
  if (Number.isNaN(ts)) return true;
  const ageMs = Date.now() - ts;
  return ageMs > staleDays * 24 * 60 * 60 * 1000;
}
