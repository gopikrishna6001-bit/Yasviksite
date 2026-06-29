#!/usr/bin/env node
/**
 * Sync delivery_zones area names from India Post directory (postalpincode.in).
 * Run: SUPABASE_SERVICE_ROLE_KEY=… VITE_SUPABASE_URL=… node scripts/sync_delivery_zones.mjs
 * Options: --pincode=500050  --force
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envLocal = join(root, '.env.local');
try {
  const text = readFileSync(envLocal, 'utf8');
  for (const line of text.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* optional */ }

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const POSTAL_API = 'https://api.postalpincode.in/pincode';
const STALE_DAYS = Number(process.env.POSTAL_SYNC_STALE_DAYS || 30);

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

function pickPrimary(offices) {
  const delivery = offices.filter((o) => String(o.DeliveryStatus || '').toLowerCase() === 'delivery');
  const pool = delivery.length ? delivery : offices;
  const withoutSuffix = pool.find((o) => !/\(delivery\)|\(nd\)/i.test(String(o.Name || '')));
  return withoutSuffix || pool[0];
}

function isStale(syncedAt) {
  if (!syncedAt) return true;
  const ts = new Date(syncedAt).getTime();
  return Number.isNaN(ts) || Date.now() - ts > STALE_DAYS * 86400000;
}

async function supabase(path, init = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || `Supabase ${res.status}`);
  return data;
}

async function fetchPostal(pincode) {
  const res = await fetch(`${POSTAL_API}/${pincode}`);
  const data = await res.json();
  const head = Array.isArray(data) ? data[0] : null;
  if (!head || head.Status !== 'Success' || !head.PostOffice?.length) {
    return { valid: false, error: head?.Message || 'Not found' };
  }
  const offices = head.PostOffice.map((o) => ({
    name: o.Name,
    branch_type: o.BranchType,
    delivery_status: o.DeliveryStatus,
    district: o.District,
    state: o.State,
    block: o.Block,
    pincode: o.Pincode || pincode,
  }));
  const primary = pickPrimary(head.PostOffice);
  return {
    valid: true,
    primary_name: primary?.Name || offices[0]?.name,
    district: primary?.District || offices[0]?.district,
    state: primary?.State || offices[0]?.state,
    block: primary?.Block || offices[0]?.block,
    offices,
  };
}

async function main() {
  const pinFilter = args.pincode ? String(args.pincode) : null;
  const force = Boolean(args.force);
  const path = pinFilter
    ? `delivery_zones?select=*&pincode=eq.${pinFilter}`
    : 'delivery_zones?select=*&is_active=eq.true&order=pincode.asc';
  const zones = await supabase(path);
  console.log(`Syncing ${zones.length} zone(s) from India Post (${POSTAL_API})…`);

  let synced = 0;
  let skipped = 0;
  let failed = 0;

  for (const zone of zones) {
    if (!force && !isStale(zone.postal_synced_at)) {
      console.log(`  skip ${zone.pincode} (${zone.area_name}) — synced ${zone.postal_synced_at}`);
      skipped += 1;
      continue;
    }
    try {
      const postal = await fetchPostal(zone.pincode);
      if (!postal.valid) {
        console.log(`  fail ${zone.pincode}: ${postal.error}`);
        failed += 1;
        continue;
      }
      const now = new Date().toISOString();
      await supabase(`delivery_zones?id=eq.${zone.id}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          area_name: postal.primary_name,
          district: postal.district,
          state: postal.state,
          block: postal.block,
          post_offices: postal.offices,
          postal_source: 'postalpincode.in',
          postal_synced_at: now,
          updated_at: now,
        }),
      });
      console.log(`  ok   ${zone.pincode}: ${postal.primary_name}, ${postal.district}`);
      synced += 1;
      await new Promise((r) => setTimeout(r, 300));
    } catch (err) {
      console.log(`  fail ${zone.pincode}: ${err.message}`);
      failed += 1;
    }
  }

  console.log(`\nDone — synced: ${synced}, skipped: ${skipped}, failed: ${failed}`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
