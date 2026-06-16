function getItemTimestamp(item) {
  const raw =
    item?.updated_date ||
    item?.updated_at ||
    item?.created_date ||
    item?.created_at ||
    null;
  if (!raw) return Number.NEGATIVE_INFINITY;
  const ts = new Date(raw).getTime();
  return Number.isFinite(ts) ? ts : Number.NEGATIVE_INFINITY;
}

export function getLatestSettingRecord(settings = [], key) {
  let best = null;
  for (const item of settings) {
    if (!item || item.key !== key) continue;
    if (!best) {
      best = item;
      continue;
    }
    const currentTs = getItemTimestamp(item);
    const bestTs = getItemTimestamp(best);
    if (currentTs >= bestTs) {
      best = item;
    }
  }
  return best;
}

export function getLatestSettingValue(settings = [], key, fallback = undefined) {
  const record = getLatestSettingRecord(settings, key);
  const value = record?.value;
  if (value === undefined || value === null || value === '') return fallback;
  return value;
}

export function buildLatestSettingsValueMap(settings = []) {
  const bestByKey = {};
  for (const item of settings) {
    if (!item?.key) continue;
    const existing = bestByKey[item.key];
    if (!existing) {
      bestByKey[item.key] = item;
      continue;
    }
    const currentTs = getItemTimestamp(item);
    const bestTs = getItemTimestamp(existing);
    if (currentTs >= bestTs) {
      bestByKey[item.key] = item;
    }
  }
  return Object.fromEntries(Object.entries(bestByKey).map(([key, value]) => [key, value?.value]));
}

