#!/usr/bin/env node
/**
 * Batch-import images from media-inbox/ → R2 → optional product/category DB update.
 *
 * Folder layout:
 *   media-inbox/
 *     products/{slug}.webp          → sets products.featured_image_url by slug
 *     categories/{slug}.webp        → sets categories.cover_image + icon_url
 *     hero/desktop.webp             → home_hero_desktop_media_url
 *     hero/mobile.webp              → home_hero_mobile_media_url
 *     general/                      → upload only, prints URLs
 *
 * Usage:
 *   node scripts/media/import-inbox.mjs --dry-run
 *   node scripts/media/import-inbox.mjs
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/media/import-inbox.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const INBOX = path.join(ROOT, 'media-inbox');
const R2_BUCKET = 'yasvik-media';
const MEDIA_BASE = 'https://media.yasvik.com';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://cpksnpuavywbmhrzglyh.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dryRun = process.argv.includes('--dry-run');

const IMAGE_EXT = new Set(['.webp', '.png', '.jpg', '.jpeg', '.gif']);

function slugify(value = '') {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function extFor(filePath) {
  return path.extname(filePath).replace(/^\./, '').toLowerCase() || 'webp';
}

function guessMime(filePath) {
  const map = { webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg' };
  return map[extFor(filePath)] || 'application/octet-stream';
}

function wranglerPut(objectKey, filePath) {
  if (dryRun) return;
  execSync(
    `npx wrangler r2 object put ${R2_BUCKET}/${objectKey} --file=${JSON.stringify(filePath)} --remote --content-type=${JSON.stringify(guessMime(filePath))}`,
    { cwd: ROOT, stdio: 'pipe' },
  );
}

function publish(filePath, folder, name) {
  const stem = slugify(name);
  const objectKey = `media-assets/${folder}/${stem}.${extFor(filePath)}`;
  wranglerPut(objectKey, filePath);
  return `${MEDIA_BASE}/${objectKey}`;
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (IMAGE_EXT.has(path.extname(entry.name).toLowerCase())) out.push(full);
  }
  return out;
}

async function patch(table, matchCol, matchVal, fields) {
  if (dryRun || !SERVICE_KEY) {
    console.log(`  [dry-run] ${table} ${matchCol}=${matchVal} →`, fields);
    return;
  }
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?${matchCol}=eq.${encodeURIComponent(matchVal)}`,
    {
      method: 'PATCH',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ ...fields, updated_at: new Date().toISOString() }),
    },
  );
  if (!res.ok) throw new Error(`${table} patch failed: ${await res.text()}`);
}

async function upsertSetting(key, value) {
  if (dryRun || !SERVICE_KEY) {
    console.log(`  [dry-run] setting ${key}=${value}`);
    return;
  }
  const patchRes = await fetch(
    `${SUPABASE_URL}/rest/v1/app_settings?setting_key=eq.${encodeURIComponent(key)}`,
    {
      method: 'PATCH',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ setting_value: value, value, updated_at: new Date().toISOString() }),
    },
  );
  if (patchRes.ok) return;
  await fetch(`${SUPABASE_URL}/rest/v1/app_settings`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ setting_key: key, key, setting_value: value, value, data_type: 'text' }),
  });
}

function relInbox(filePath) {
  return path.relative(INBOX, filePath).replace(/\\/g, '/');
}

async function processFile(filePath) {
  const rel = relInbox(filePath);
  const parts = rel.split('/');
  const baseName = path.basename(filePath, path.extname(filePath));

  if (parts[0] === 'products' && parts.length >= 2) {
    const slug = slugify(baseName);
    const url = publish(filePath, 'products', `yasvik-${slug}-hero`);
    await patch('products', 'slug', slug, { featured_image_url: url });
    console.log(`✓ product ${slug} → ${url}`);
    return;
  }

  if (parts[0] === 'categories' && parts.length >= 2) {
    const slug = slugify(baseName);
    const url = publish(filePath, 'categories', `yasvik-${slug}-icon`);
    await patch('categories', 'slug', slug, { icon_url: url, cover_image: url });
    console.log(`✓ category ${slug} → ${url}`);
    return;
  }

  if (parts[0] === 'hero') {
    const url = publish(filePath, 'hero', `yasvik-home-hero-${baseName}`);
    if (/mobile/i.test(baseName)) await upsertSetting('home_hero_mobile_media_url', url);
    else await upsertSetting('home_hero_desktop_media_url', url);
    console.log(`✓ hero ${baseName} → ${url}`);
    return;
  }

  const url = publish(filePath, 'general', slugify(baseName));
  console.log(`✓ uploaded ${rel} → ${url}`);
}

async function main() {
  for (const sub of ['products', 'categories', 'hero', 'general']) {
    fs.mkdirSync(path.join(INBOX, sub), { recursive: true });
  }

  const files = walk(INBOX);
  if (!files.length) {
    console.log(`No images in ${INBOX}. Drop files and re-run.`);
    console.log('  products/badam.webp  → product slug "badam"');
    console.log('  categories/oils-ghee-and-honey.webp');
    console.log('  hero/desktop.webp / hero/mobile.webp');
    return;
  }

  console.log(`${dryRun ? 'Dry run' : 'Importing'} ${files.length} file(s)...`);
  if (!SERVICE_KEY && !dryRun) {
    console.warn('No SUPABASE_SERVICE_ROLE_KEY — will upload to R2 only, no DB updates.');
  }

  for (const filePath of files) {
    await processFile(filePath);
  }
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
