#!/usr/bin/env node
/**
 * Audit R2 media usage vs site references.
 *
 * Run: node scripts/audit_r2_media_usage.mjs
 * Delete orphans: node scripts/audit_r2_media_usage.mjs --delete-orphans
 * Dry run delete: node scripts/audit_r2_media_usage.mjs --delete-orphans --dry-run
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const dryRun = process.argv.includes('--dry-run');
const deleteOrphans = process.argv.includes('--delete-orphans');
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '41871e772a12ed19e7353a9c071aa5f0';
const R2_BUCKET = process.env.YASVIK_R2_BUCKET || 'yasvik-media';
const MEDIA_HOST = (process.env.YASVIK_MEDIA_DOMAIN || 'media.yasvik.com').replace(/^https?:\/\//, '');

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return Object.fromEntries(
    fs.readFileSync(filePath, 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const idx = line.indexOf('=');
        return [line.slice(0, idx).trim(), line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '')];
      }),
  );
}

function normalizeKey(input = '') {
  let value = String(input || '').trim();
  if (!value) return '';
  if (value.startsWith('http')) {
    try {
      value = decodeURIComponent(new URL(value).pathname.replace(/^\//, ''));
    } catch {
      return '';
    }
  }
  return value.replace(/^\/+/, '').replace(/^yasvik-media\//, '');
}

function formatBytes(bytes = 0) {
  const value = Number(bytes) || 0;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

function readWranglerToken() {
  const paths = [
    path.join(os.homedir(), 'Library/Preferences/.wrangler/config/default.toml'),
    path.join(os.homedir(), '.wrangler/config/default.toml'),
  ];
  for (const configPath of paths) {
    if (!fs.existsSync(configPath)) continue;
    const token = fs.readFileSync(configPath, 'utf8').match(/oauth_token\s*=\s*"([^"]+)"/)?.[1];
    if (token) return token;
  }
  throw new Error('Run: npx wrangler login');
}

async function listR2Objects(token) {
  const objects = [];
  let cursor;
  do {
    const url = new URL(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets/${R2_BUCKET}/objects`);
    url.searchParams.set('per_page', '1000');
    if (cursor) url.searchParams.set('cursor', cursor);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const json = await res.json();
    if (!json.success) throw new Error(json.errors?.[0]?.message || 'R2 list failed');
    for (const obj of json.result || []) objects.push(obj);
    cursor = json.result_info?.cursor;
  } while (cursor);
  return objects;
}

async function supabaseSelect(env, table, columns = '*', pageSize = 1000) {
  const rows = [];
  let offset = 0;
  while (true) {
    const url = `${env.SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(columns)}&limit=${pageSize}&offset=${offset}`;
    const res = await fetch(url, {
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });
    const batch = await res.json();
    if (!res.ok) throw new Error(batch?.message || `Supabase ${table} failed`);
    if (!Array.isArray(batch) || !batch.length) break;
    rows.push(...batch);
    if (batch.length < pageSize) break;
    offset += pageSize;
  }
  return rows;
}

async function wranglerDelete(key) {
  const { execSync } = await import('node:child_process');
  execSync(`npx wrangler r2 object delete ${JSON.stringify(`${R2_BUCKET}/${key}`)} --remote`, {
    cwd: ROOT,
    stdio: 'pipe',
  });
}

async function main() {
  const env = {
    ...readEnvFile(path.join(ROOT, '.env.local')),
    ...readEnvFile(path.join(ROOT, '.env.production')),
    ...process.env,
  };

  env.SUPABASE_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL/VITE_SUPABASE_URL or service/anon key in env');
  }

  const token = readWranglerToken();
  const r2Objects = await listR2Objects(token);
  const referenced = new Set();

  const [
    mediaAssets,
    products,
    productImages,
    categories,
    combos,
    stories,
    people,
    journeys,
    pageHeroes,
    settings,
  ] = await Promise.all([
    supabaseSelect(env, 'media_assets', 'file_path,upload_url'),
    supabaseSelect(env, 'products', 'featured_image_url'),
    supabaseSelect(env, 'product_images', 'image_url'),
    supabaseSelect(env, 'categories', 'cover_image,icon_url'),
    supabaseSelect(env, 'combos', 'featured_image_url'),
    supabaseSelect(env, 'stories', 'cover_image,featured_image_url'),
    supabaseSelect(env, 'people', 'portrait_image,image_url'),
    supabaseSelect(env, 'journeys', 'cover_image,featured_image_url'),
    supabaseSelect(env, 'page_heroes', 'media_url,hero_video,hero_video_poster'),
    supabaseSelect(env, 'app_settings', 'setting_value'),
  ]);

  for (const row of [
    ...mediaAssets,
    ...products,
    ...productImages,
    ...categories,
    ...combos,
    ...stories,
    ...people,
    ...journeys,
    ...pageHeroes,
  ]) {
    for (const value of Object.values(row || {})) {
      if (typeof value === 'string') {
        const key = normalizeKey(value);
        if (key) referenced.add(key);
      }
    }
  }

  for (const row of settings) {
    const text = String(row.setting_value || '');
    const matches = text.match(/https?:\/\/[^\s"'`]+\.(?:webp|jpg|jpeg|png|gif|mp4|webm|mov)/gi) || [];
    for (const url of matches) {
      const key = normalizeKey(url);
      if (key) referenced.add(key);
    }
    if (text.includes('media-assets/')) {
      const inline = text.match(/media-assets\/[^\s"'`]+/gi) || [];
      inline.forEach((part) => referenced.add(normalizeKey(part)));
    }
  }

  const used = [];
  const orphans = [];
  let usedBytes = 0;
  let orphanBytes = 0;

  for (const obj of r2Objects) {
    const key = normalizeKey(obj.key);
    const bytes = Number(obj.size || 0);
    if (referenced.has(key)) {
      used.push({ key, bytes });
      usedBytes += bytes;
    } else {
      orphans.push({ key, bytes });
      orphanBytes += bytes;
    }
  }

  console.log('\n=== Yasvik R2 media audit ===\n');
  console.log(`Bucket: ${R2_BUCKET}`);
  console.log(`CDN host: ${MEDIA_HOST}`);
  console.log(`R2 objects: ${r2Objects.length}`);
  console.log(`Referenced keys: ${referenced.size}`);
  console.log(`Used in R2: ${used.length} files · ${formatBytes(usedBytes)}`);
  console.log(`Orphans in R2: ${orphans.length} files · ${formatBytes(orphanBytes)}`);

  if (orphans.length) {
    console.log('\nTop orphan files:');
    orphans
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 25)
      .forEach((row) => console.log(`  ${formatBytes(row.bytes).padStart(9)}  ${row.key}`));
  }

  const reportPath = path.join(ROOT, 'import-preview/r2-media-audit.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify({ used, orphans, usedBytes, orphanBytes }, null, 2));
  console.log(`\nFull report: ${reportPath}`);

  if (deleteOrphans && orphans.length) {
    console.log(`\n${dryRun ? '[dry-run] ' : ''}Deleting ${orphans.length} orphan object(s)…`);
    for (const row of orphans) {
      if (dryRun) {
        console.log(`  [dry-run] delete ${row.key}`);
        continue;
      }
      try {
        await wranglerDelete(row.key);
        console.log(`  deleted ${row.key}`);
      } catch (err) {
        console.warn(`  failed ${row.key}: ${err.message}`);
      }
    }
  } else if (orphans.length) {
    console.log('\nTo remove orphan files from R2:');
    console.log('  node scripts/audit_r2_media_usage.mjs --delete-orphans --dry-run');
    console.log('  node scripts/audit_r2_media_usage.mjs --delete-orphans');
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
