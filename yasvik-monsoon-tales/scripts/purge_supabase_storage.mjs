#!/usr/bin/env node
/**
 * Remove legacy Supabase Storage objects after R2 mirror.
 * Verifies each file exists on media.yasvik.com before delete.
 *
 * Run: node scripts/purge_supabase_storage.mjs
 * Dry run: node scripts/purge_supabase_storage.mjs --dry-run
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dryRun = process.argv.includes('--dry-run');
const MEDIA_HOST = 'https://media.yasvik.com';
const SUPABASE_URL = 'https://cpksnpuavywbmhrzglyh.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const objects = JSON.parse(fs.readFileSync(path.join(__dirname, 'mirror-objects.json'), 'utf8'));
const PUBLIC_BUCKETS = new Set(['media-assets', 'product-images']);

async function onR2(key) {
  const url = `${MEDIA_HOST}/${key.split('/').map(encodeURIComponent).join('/')}`;
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

async function deleteFromSupabase(bucket, name) {
  const objectPath = `${bucket}/${name.split('/').map(encodeURIComponent).join('/')}`;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${objectPath}`, {
    method: 'DELETE',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
  });
  if (!res.ok && res.status !== 404) {
    const body = await res.text();
    throw new Error(`DELETE ${objectPath}: ${res.status} ${body}`);
  }
}

async function main() {
  const targets = objects.filter((o) => PUBLIC_BUCKETS.has(o.bucket_id));
  console.log(`\n=== Purge Supabase Storage (${targets.length} public objects) ===\n`);

  if (!dryRun && !SERVICE_KEY) {
    console.error('Set SUPABASE_SERVICE_ROLE_KEY to delete objects.');
    process.exit(1);
  }

  let deleted = 0;
  let skipped = 0;

  for (const { bucket_id, name } of targets) {
    const key = `${bucket_id}/${name}`;
    if (!(await onR2(key))) {
      skipped += 1;
      console.warn(`  skip (not on R2): ${key}`);
      continue;
    }
    if (dryRun) {
      console.log(`  [dry-run] delete ${key}`);
      deleted += 1;
      continue;
    }
    await deleteFromSupabase(bucket_id, name);
    deleted += 1;
    if (deleted % 20 === 0) console.log(`  … ${deleted} deleted`);
  }

  console.log(`\nDone: ${deleted} removed from Supabase, ${skipped} skipped (missing on R2)\n`);
  console.log('Supabase egress stops when nothing is served from storage — site now uses R2 only.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
