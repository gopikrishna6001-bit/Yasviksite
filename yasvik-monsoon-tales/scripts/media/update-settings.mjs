#!/usr/bin/env node
/**
 * Update app_settings via Supabase REST (service role).
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/media/update-settings.mjs \
 *     home_hero_desktop_media_url=https://media.yasvik.com/...
 */
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://cpksnpuavywbmhrzglyh.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function upsertSetting(key, value) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/app_settings?setting_key=eq.${encodeURIComponent(key)}`, {
    method: 'PATCH',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ setting_value: value, value, updated_at: new Date().toISOString() }),
  });
  if (res.ok) {
    const rows = await res.json();
    if (rows.length) return rows[0];
  }

  const insert = await fetch(`${SUPABASE_URL}/rest/v1/app_settings`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      setting_key: key,
      key,
      setting_value: value,
      value,
      data_type: 'text',
    }),
  });
  if (!insert.ok) {
    const err = await insert.text();
    throw new Error(`Failed to set ${key}: ${err}`);
  }
  return insert.json();
}

async function main() {
  if (!SERVICE_KEY) {
    console.error('Set SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  const pairs = process.argv.slice(2);
  if (!pairs.length) {
    console.error('Usage: node update-settings.mjs key=value ...');
    process.exit(1);
  }
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx < 1) continue;
    const key = pair.slice(0, idx);
    const value = pair.slice(idx + 1);
    await upsertSetting(key, value);
    console.log(`✓ ${key}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
