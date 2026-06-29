#!/usr/bin/env node
/**
 * Audit Supabase Storage usage and settings that drive cached egress.
 * Run: node scripts/audit_supabase_egress.mjs
 * Requires: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or anon for read-only buckets)
 */
import pg from 'pg';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;
const PROJECT_REF = SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!PROJECT_REF || !DB_PASSWORD) {
  console.error('Set VITE_SUPABASE_URL and SUPABASE_DB_PASSWORD');
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

function fmt(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let n = Number(bytes);
  let i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i += 1; }
  return `${n.toFixed(i ? 1 : 0)} ${units[i]}`;
}

async function main() {
  await client.connect();

  const buckets = await client.query(`
    SELECT bucket_id, COUNT(*)::int AS files,
           COALESCE(SUM((metadata->>'size')::bigint), 0)::bigint AS bytes
    FROM storage.objects
    GROUP BY bucket_id
    ORDER BY bytes DESC
  `);

  const largest = await client.query(`
    SELECT name, bucket_id, (metadata->>'size')::bigint AS bytes, created_at
    FROM storage.objects
    ORDER BY (metadata->>'size')::bigint DESC NULLS LAST
    LIMIT 15
  `);

  const supabaseSettings = await client.query(`
    SELECT setting_key, LEFT(setting_value, 100) AS preview,
           LENGTH(setting_value) AS chars
    FROM app_settings
    WHERE setting_value ILIKE '%supabase.co%'
    ORDER BY setting_key
  `);

  const videoHero = await client.query(`
    SELECT setting_key, setting_value
    FROM app_settings
    WHERE setting_key IN ('home_hero_desktop_media_url', 'home_hero_mobile_media_url')
      AND setting_value ~* '\\.(mp4|webm|mov)'
  `);

  console.log('\n=== Yasvik Supabase egress audit ===\n');
  console.log('Storage by bucket:');
  let total = 0n;
  for (const row of buckets.rows) {
    total += BigInt(row.bytes);
    console.log(`  ${row.bucket_id}: ${row.files} files, ${fmt(row.bytes)}`);
  }
  console.log(`  TOTAL: ${fmt(total)}\n`);

  console.log('Largest objects (top egress risk per download):');
  for (const row of largest.rows) {
    console.log(`  ${fmt(row.bytes).padStart(8)}  ${row.bucket_id}/${row.name}`);
  }

  console.log(`\nApp settings still pointing at Supabase: ${supabaseSettings.rows.length}`);
  for (const row of supabaseSettings.rows) {
    console.log(`  ${row.setting_key}: ${row.preview}${row.chars > 100 ? '…' : ''}`);
  }

  if (videoHero.rows.length) {
    console.log('\n⚠ Hero video settings (very high egress — prefer illustration or /public video):');
    for (const row of videoHero.rows) {
      console.log(`  ${row.setting_key}`);
    }
  }

  console.log('\nRecommendations (Free plan):');
  console.log('  1. Brand logos → /public/media/brand/ (done in repo)');
  console.log('  2. Clear 45 MB hero MP4 settings; use illustration fallback');
  console.log('  3. optimizeMediaUrl() resizes Supabase images at the edge');
  console.log('  4. Monitor: https://supabase.com/dashboard/org/_/usage');
  console.log('');

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
