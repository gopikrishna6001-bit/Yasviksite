#!/usr/bin/env node
/**
 * Mirror Supabase Storage → Cloudflare R2 and rewrite DB URLs to media.yasvik.com
 *
 * Stops Supabase Cached Egress billing for product images, hero, etc.
 *
 * Prerequisites:
 *   - R2 bucket yasvik-media + media.yasvik.com custom domain (live)
 *   - npx wrangler login
 *
 * Run:
 *   SUPABASE_DB_PASSWORD=… VITE_SUPABASE_URL=… node scripts/mirror_supabase_storage_to_r2.mjs
 *
 * Dry run (list only):
 *   node scripts/mirror_supabase_storage_to_r2.mjs --dry-run
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'yasvik-r2-mirror-'));

const dryRun = process.argv.includes('--dry-run');
const skipDb = process.argv.includes('--skip-db');
const BUCKET = process.env.YASVIK_R2_BUCKET || 'yasvik-media';
const MEDIA_BASE = (process.env.YASVIK_MEDIA_DOMAIN || 'media.yasvik.com').replace(/^https?:\/\//, '');
const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/$/, '');
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;
const PROJECT_REF = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

function fmt(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let n = Number(bytes);
  let i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i += 1; }
  return `${n.toFixed(i ? 1 : 0)} ${units[i]}`;
}

function supabasePublicUrl(bucket, name) {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${name}`;
}

function r2PublicUrl(bucket, name) {
  return `https://${MEDIA_BASE}/${bucket}/${name}`;
}

function wrangler(args) {
  return execSync(`npx wrangler ${args}`, { cwd: ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
}

async function main() {
  if (!PROJECT_REF) {
    console.error('Set VITE_SUPABASE_URL');
    process.exit(1);
  }

  const client = new pg.Client({
    host: `db.${PROJECT_REF}.supabase.co`,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
  });

  if (!dryRun && !DB_PASSWORD) {
    console.error('Set SUPABASE_DB_PASSWORD (or pass --dry-run)');
    process.exit(1);
  }

  if (!dryRun) await client.connect();

  const objects = dryRun
    ? []
    : (await client.query(`
        SELECT bucket_id, name, (metadata->>'size')::bigint AS bytes
        FROM storage.objects
        ORDER BY (metadata->>'size')::bigint DESC NULLS LAST
      `)).rows;

  console.log(`\n=== Mirror Supabase Storage → R2 (${BUCKET}) ===\n`);
  console.log(`Objects: ${objects.length} · CDN: https://${MEDIA_BASE}`);
  if (dryRun) {
    console.log('Dry run — pass SUPABASE_DB_PASSWORD to copy files.\n');
    process.exit(0);
  }

  let copied = 0;
  let skipped = 0;
  let bytes = 0n;

  for (const row of objects) {
    const key = `${row.bucket_id}/${row.name}`;
    const sourceUrl = supabasePublicUrl(row.bucket_id, row.name);
    const tmpFile = path.join(TMP, key.replace(/\//g, '__'));

    try {
      const res = await fetch(sourceUrl);
      if (!res.ok) {
        console.warn(`  skip (fetch ${res.status}): ${key}`);
        skipped += 1;
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      fs.mkdirSync(path.dirname(tmpFile), { recursive: true });
      fs.writeFileSync(tmpFile, buf);

      wrangler(`r2 object put ${BUCKET}/${key} --file=${JSON.stringify(tmpFile)} --remote`);
      copied += 1;
      bytes += BigInt(buf.length);
      if (copied % 25 === 0) console.log(`  … ${copied} files (${fmt(bytes)})`);
    } catch (err) {
      console.warn(`  skip: ${key} — ${err.message}`);
      skipped += 1;
    }
  }

  console.log(`\nCopied ${copied} files (${fmt(bytes)}), skipped ${skipped}\n`);

  if (!skipDb) {
    console.log('Rewriting database URLs to R2 CDN…');
    const from = `${SUPABASE_URL}/storage/v1/object/public/`;
    const to = `https://${MEDIA_BASE}/`;

    const tables = [
      ['products', 'featured_image_url'],
      ['products', 'hero_image'],
      ['categories', 'featured_image_url'],
      ['categories', 'hero_image'],
      ['journeys', 'featured_image_url'],
      ['journeys', 'cover_image'],
      ['stories', 'featured_image_url'],
      ['stories', 'cover_image'],
      ['people', 'portrait_image'],
      ['people', 'featured_image_url'],
      ['page_heroes', 'media_url'],
      ['media_assets', 'file_url'],
    ];

    for (const [table, column] of tables) {
      try {
        const result = await client.query(
          `UPDATE ${table}
           SET ${column} = REPLACE(${column}, $1, $2)
           WHERE ${column} LIKE $3`,
          [from, to, `${from}%`]
        );
        if (result.rowCount) console.log(`  ${table}.${column}: ${result.rowCount} rows`);
      } catch {
        /* column/table may not exist */
      }
    }

    const settings = await client.query(
      `UPDATE app_settings
       SET setting_value = REPLACE(setting_value::text, $1, $2)::jsonb
       WHERE setting_value::text LIKE $3
       RETURNING setting_key`,
      [from, to, `%${from}%`]
    ).catch(() => ({ rows: [] }));

    if (settings.rows?.length) {
      console.log(`  app_settings: ${settings.rows.length} keys`);
    }

    console.log('\nDone. Deploy site with VITE_MEDIA_BASE_URL=https://' + MEDIA_BASE);
  }

  await client.end();
  fs.rmSync(TMP, { recursive: true, force: true });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
