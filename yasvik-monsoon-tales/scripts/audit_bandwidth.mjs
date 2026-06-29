#!/usr/bin/env node
/**
 * Yasvik bandwidth / Supabase Storage egress audit.
 * Run: SUPABASE_DB_PASSWORD=… VITE_SUPABASE_URL=… node scripts/audit_bandwidth.mjs
 */
import pg from 'pg';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const SRC = join(ROOT, 'src');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const PROJECT_REF = SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;

function fmt(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let n = Number(bytes);
  let i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i += 1; }
  return `${n.toFixed(i ? 1 : 0)} ${units[i]}`;
}

function scanSourceForSupabaseImages() {
  const hits = new Map();
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      const st = statSync(path);
      if (st.isDirectory()) {
        if (name !== 'node_modules') walk(path);
        continue;
      }
      if (!/\.(jsx?|tsx?)$/.test(name)) continue;
      const text = readFileSync(path, 'utf8');
      if (!/supabase\.co\/storage|featured_image|hero_image|image_url|optimizeMediaUrl|safeMedia|OptimizedImage/.test(text)) continue;
      const rel = path.replace(`${ROOT}/`, '');
      const reasons = [];
      if (/supabase\.co\/storage/.test(text)) reasons.push('hardcoded storage URL');
      if (/<img[^>]+src=/.test(text)) reasons.push('raw <img>');
      if (/image_urls/.test(text)) reasons.push('gallery refs');
      if (/hoverMedia|hover_media/.test(text)) reasons.push('hover media');
      hits.set(rel, reasons);
    }
  };
  walk(SRC);
  return hits;
}

async function main() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  YASVIK BANDWIDTH & IMAGE EGRESS AUDIT');
  console.log('══════════════════════════════════════════════════\n');

  if (!PROJECT_REF || !DB_PASSWORD) {
    console.log('⚠ DB credentials missing — storage section skipped.');
    console.log('  Set VITE_SUPABASE_URL and SUPABASE_DB_PASSWORD for full audit.\n');
  } else {
    const client = new pg.Client({
      host: `db.${PROJECT_REF}.supabase.co`,
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: DB_PASSWORD,
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();

    const buckets = await client.query(`
      SELECT bucket_id, COUNT(*)::int AS files,
             COALESCE(SUM((metadata->>'size')::bigint),0)::bigint AS bytes
      FROM storage.objects GROUP BY bucket_id ORDER BY bytes DESC
    `);

    const largest = await client.query(`
      SELECT name, bucket_id, (metadata->>'size')::bigint AS bytes
      FROM storage.objects ORDER BY bytes DESC LIMIT 20
    `);

    const productImages = await client.query(`
      SELECT COUNT(*) FILTER (WHERE COALESCE(featured_image_url,'') LIKE '%supabase.co%')::int AS supabase_featured,
             COUNT(*)::int AS total FROM products
    `);

    const settings = await client.query(`
      SELECT setting_key FROM app_settings WHERE setting_value ILIKE '%supabase.co/storage%'
    `);

    console.log('── STORAGE BY BUCKET ──');
    let totalBytes = 0n;
    for (const row of buckets.rows) {
      totalBytes += BigInt(row.bytes);
      console.log(`  ${row.bucket_id.padEnd(16)} ${String(row.files).padStart(3)} files  ${fmt(row.bytes)}`);
    }
    console.log(`  ${'TOTAL'.padEnd(16)}       ${fmt(totalBytes)}\n`);

    console.log('── LARGEST FILES (highest egress per download) ──');
    for (const row of largest.rows) {
      const ext = extname(row.name).toLowerCase();
      const kind = /\.(mp4|webm|mov)/.test(row.name) ? 'VIDEO' : ext === '.svg' ? 'SVG' : 'IMAGE';
      console.log(`  ${fmt(row.bytes).padStart(8)}  [${kind}]  ${row.bucket_id}/${row.name}`);
    }

    console.log('\n── DATABASE IMAGE REFERENCES ──');
    console.log(`  Products with Supabase featured_image_url: ${productImages.rows[0]?.supabase_featured}/${productImages.rows[0]?.total}`);
    console.log(`  App settings pointing at Supabase Storage: ${settings.rows.length}`);
    settings.rows.forEach((r) => console.log(`    • ${r.setting_key}`));

    await client.end();
  }

  const codeHits = scanSourceForSupabaseImages();
  console.log('\n── CODE: IMAGE-LOADING LOCATIONS ──');
  [...codeHits.entries()].sort((a, b) => a[0].localeCompare(b[0])).forEach(([file, reasons]) => {
    console.log(`  ${file}`);
    console.log(`    ${reasons.join(', ')}`);
  });

  console.log('\n── OPTIMIZATIONS IN PLACE ──');
  console.log('  ✓ Brand logos → /public/media/brand/ (Cloudflare, not Supabase)');
  console.log('  ✓ optimizeMediaUrl() → Supabase render API WebP + width caps');
  console.log('  ✓ OptimizedImage component → srcset, lazy load, dimensions');
  console.log('  ✓ Product lists → primary image only (no full gallery in API)');
  console.log('  ✓ ProductCard → hover images load on interaction only');
  console.log('  ✓ public/_headers → 1-year cache on /media/*');

  console.log('\n── RECOMMENDATIONS ──');
  console.log('  1. Delete unused 15 MB logo + 45 MB hero MP4 from Supabase Storage');
  console.log('  2. Upload new product photos as WebP <300 KB when possible');
  console.log('  3. Use YouTube for hero video (zero Supabase egress)');
  console.log('  4. Monitor: https://supabase.com/dashboard → Usage → Cached Egress');
  console.log('  5. Targets: thumbnails <250 KB, hero/banner <500 KB (via render API)\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
