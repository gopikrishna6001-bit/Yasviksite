export const DEFAULT_STORE_OFFLINE_MESSAGE =
  'Our shop is taking a short break while we restock and prepare the next harvest. Everything else on Yasvik is open — stories, farmers, and our roots.';

export function parseStoreOfflineEnabled(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

export function getStoreOfflineConfig(settingsMap = {}) {
  const message = String(settingsMap.store_offline_message || '').trim();
  return {
    enabled: parseStoreOfflineEnabled(settingsMap.store_offline_enabled),
    message: message || DEFAULT_STORE_OFFLINE_MESSAGE,
  };
}
