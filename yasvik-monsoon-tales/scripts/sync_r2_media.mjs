#!/usr/bin/env node
/**
 * Sync Supabase public storage → R2, prune orphans & duplicate keys.
 * Does not block on full mirror — skips files already on CDN.
 *
 * Run: node scripts/sync_r2_media.mjs
 * Dry run: node scripts/sync_r2_media.mjs --dry-run
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'yasvik-r2-sync-'));

const dryRun = process.argv.includes('--dry-run');
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '41871e772a12ed19e7353a9c071aa5f0';
const R2_BUCKET = process.env.YASVIK_R2_BUCKET || 'yasvik-media';
const MEDIA_HOST = (process.env.YASVIK_MEDIA_DOMAIN || 'media.yasvik.com').replace(/^https?:\/\//, '');
const SUPABASE = (process.env.VITE_SUPABASE_URL || 'https://cpksnpuavywbmhrzglyh.supabase.co').replace(/\/$/, '');

const HERO_KEYS = [
  'hero/yasvik-hero-poster.webp',
  'hero/yasvik-hero-mobile.mp4',
  'hero/yasvik-hero-mobile.webm',
  'hero/yasvik-hero-desktop.mp4',
  'hero/yasvik-hero-desktop.webm',
];

const objects = JSON.parse(fs.readFileSync(path.join(__dirname, 'mirror-objects.json'), 'utf8'));
const allowlist = new Set([
  ...HERO_KEYS,
  ...objects.map(({ bucket_id, name }) => `${bucket_id}/${name}`),
]);

function readWranglerToken() {
  const configPath = path.join(os.homedir(), 'Library/Preferences/.wrangler/config/default.toml');
  if (!fs.existsSync(configPath)) {
    const alt = path.join(os.homedir(), '.wrangler/config/default.toml');
    if (!fs.existsSync(alt)) throw new Error('Run: npx wrangler login');
    return fs.readFileSync(alt, 'utf8').match(/oauth_token\s*=\s*"([^"]+)"/)?.[1];
  }
  return fs.readFileSync(configPath, 'utf8').match(/oauth_token\s*=\s*"([^"]+)"/)?.[1];
}

async function listR2Keys(token) {
  const keys = [];
  let cursor;
  do {
    const url = new URL(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets/${R2_BUCKET}/objects`);
    url.searchParams.set('per_page', '1000');
    if (cursor) url.searchParams.set('cursor', cursor);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const json = await res.json();
    if (!json.success) throw new Error(json.errors?.[0]?.message || 'R2 list failed');
    for (const obj of json.result || []) keys.push(obj.key);
    cursor = json.result_info?.cursor;
  } while (cursor);
  return keys;
}

function canonicalKey(key) {
  const normalized = key.replace(/^yasvik-media\//, '');
  const segments = normalized.split('/');
  if (segments.length >= 2) return normalized;
  return normalized;
}

function pickCanonicalKey(keys) {
  const scored = keys.map((key) => {
    const c = canonicalKey(key);
    let score = 0;
    if (allowlist.has(c)) score += 100;
    if (/^(media-assets|product-images|user-uploads)\//.test(c)) score += 50;
    if (key.includes('yasvik-media/')) score -= 10;
    return { key, c, score };
  });
  scored.sort((a, b) => b.score - a.score || a.key.length - b.key.length);
  return scored[0]?.key;
}

function publicUrl(bucket, name) {
  return `${SUPABASE}/storage/v1/object/public/${[bucket, ...name.split('/')].map(encodeURIComponent).join('/')}`;
}

function cdnUrl(key) {
  return `https://${MEDIA_HOST}/${key.split('/').map(encodeURIComponent).join('/')}`;
}

async function existsOnCdn(key) {
  try {
    const res = await fetch(cdnUrl(key), { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

function wranglerPut(key, file) {
  const remoteKey = `${R2_BUCKET}/${key}`;
  execSync(`npx wrangler r2 object put ${JSON.stringify(remoteKey)} --file=${JSON.stringify(file)} --remote`, {
    cwd: ROOT,
    stdio: 'pipe',
  });
}

function wranglerDelete(key) {
  execSync(`npx wrangler r2 object delete ${JSON.stringify(`${R2_BUCKET}/${key}`)} --remote`, { cwd: ROOT, stdio: 'pipe' });
}

async function main() {
  const token = readWranglerToken();
  if (!token) throw new Error('Missing wrangler oauth token');

  console.log(`\n=== R2 sync + cleanup (${R2_BUCKET}) ===\n`);
  console.log(`Allowlist: ${allowlist.size} canonical keys\n`);

  const r2Keys = await listR2Keys(token);
  console.log(`R2 inventory: ${r2Keys.length} objects`);

  const byBasename = new Map();
  for (const key of r2Keys) {
    const base = key.split('/').pop();
    if (!byBasename.has(base)) byBasename.set(base, []);
    byBasename.get(base).push(key);
  }

  const toDelete = new Set();
  for (const [, group] of byBasename) {
    if (group.length > 1) {
      const keep = pickCanonicalKey(group);
      for (const key of group) {
        if (key !== keep) toDelete.add(key);
      }
    }
  }

  for (const key of r2Keys) {
    const c = canonicalKey(key);
    if (!allowlist.has(c) && !HERO_KEYS.includes(c)) toDelete.add(key);
  }

  if (toDelete.size) {
    console.log(`Prune: ${toDelete.size} duplicate/unused keys`);
    for (const key of toDelete) {
      if (dryRun) console.log(`  [dry-run] delete ${key}`);
      else {
        try {
          wranglerDelete(key);
        } catch (err) {
          console.warn(`  delete failed ${key}: ${err.message}`);
        }
      }
    }
  } else {
    console.log('Prune: nothing to remove');
  }

  let mirrored = 0;
  let skipped = 0;
  for (const { bucket_id, name } of objects) {
    const key = `${bucket_id}/${name}`;
    if (await existsOnCdn(key)) {
      skipped += 1;
      continue;
    }
    if (dryRun) {
      console.log(`  [dry-run] mirror ${key}`);
      continue;
    }
    const tmp = path.join(TMP, key.replace(/[/\\]/g, '__'));
    try {
      const res = await fetch(publicUrl(bucket_id, name));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(tmp, buf);
      wranglerPut(key, tmp);
      mirrored += 1;
    } catch (err) {
      console.warn(`  mirror skip ${key}: ${err.message}`);
    }
  }

  console.log(`\nMirror: ${mirrored} uploaded, ${skipped} already on CDN`);
  if (!dryRun) fs.rmSync(TMP, { recursive: true, force: true });
  console.log('Done.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
