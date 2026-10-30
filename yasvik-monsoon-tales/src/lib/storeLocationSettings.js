import {
  YASVIK_GOOGLE_MAPS_URL,
  YASVIK_STORE_ADDRESS_LINES,
  YASVIK_STORE_GEO,
  YASVIK_STORE_HOURS,
  YASVIK_STORE_NAME,
  YASVIK_STORE_PHOTO_PLACEHOLDER,
  YASVIK_SUPPORT_EMAIL,
  YASVIK_SUPPORT_PHONE_DISPLAY,
  YASVIK_SUPPORT_PHONE_TEL,
} from '@/lib/storeLocation';
import { safeMedia } from '@/lib/mediaUrl';

export function buildGoogleMapsEmbedUrl(lat = YASVIK_STORE_GEO.latitude, lng = YASVIK_STORE_GEO.longitude) {
  return `https://maps.google.com/maps?q=${lat},${lng}&hl=en&z=16&output=embed`;
}

export function resolveStoreLocationSettings(settingsMap = {}) {
  const get = (key, fallback = '') => {
    const value = settingsMap[key];
    return value === undefined || value === null || String(value).trim() === '' ? fallback : String(value).trim();
  };

  const photoUrl = safeMedia(
    get('store_photo_url', get('contact_store_photo_url', YASVIK_STORE_PHOTO_PLACEHOLDER)),
    'hero',
  );
  const mapsEmbedUrl = get('store_google_maps_embed_url', buildGoogleMapsEmbedUrl());
  const mapsLink = get('store_google_maps_url', YASVIK_GOOGLE_MAPS_URL);
  const storeName = get('store_display_name', YASVIK_STORE_NAME);
  const hoursText = get('store_hours_text', '9:00 AM – 9:00 PM · Open daily');

  const addressLines = get('store_address_text', '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    photoUrl,
    mapsEmbedUrl,
    mapsLink,
    storeName,
    hoursText,
    addressLines: addressLines.length ? addressLines : YASVIK_STORE_ADDRESS_LINES,
    phoneDisplay: get('support_phone', YASVIK_SUPPORT_PHONE_DISPLAY),
    phoneTel: get('support_phone_tel', YASVIK_SUPPORT_PHONE_TEL),
    email: get('support_email', YASVIK_SUPPORT_EMAIL),
    schemaHours: YASVIK_STORE_HOURS,
  };
}
