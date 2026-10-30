#!/usr/bin/env node
/**
 * Backfill products missing featured_image_url using their category cover_image.
 *
 * Usage:
 *   node scripts/media/backfill-product-images.mjs --dry-run
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/media/backfill-product-images.mjs
 *
 * Or apply via Supabase MCP execute_sql (see SQL at bottom of file).
 */
import { Client } from 'pg';

const dryRun = process.argv.includes('--dry-run');
const dbPassword = process.env.SUPABASE_DB_PASSWORD;

const BACKFILL_SQL = `
UPDATE products p
SET featured_image_url = c.cover_image,
    updated_at = NOW()
FROM categories c
WHERE p.is_published = true
  AND COALESCE(p.featured_image_url, '') = ''
  AND p.category_id = c.id
  AND COALESCE(c.cover_image, '') <> '';
`;

async function main() {
  if (!dbPassword) {
    console.log('No SUPABASE_DB_PASSWORD — run this SQL in Supabase:\n');
    console.log(BACKFILL_SQL);
    console.log('\nVerify with:');
    console.log(`SELECT COUNT(*) FROM products WHERE is_published = true AND COALESCE(featured_image_url,'') = '';`);
    process.exit(dryRun ? 0 : 1);
  }

  const client = new Client({
    host: process.env.SUPABASE_DB_HOST || 'db.cpksnpuavywbmhrzglyh.supabase.co',
    user: 'postgres',
    password: dbPassword,
    database: 'postgres',
    port: 5432,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  const { rows: before } = await client.query(
    `SELECT COUNT(*)::int AS missing FROM products WHERE is_published = true AND COALESCE(featured_image_url,'') = ''`,
  );
  console.log(`Products missing image (before): ${before[0].missing}`);

  if (dryRun) {
    const { rows: preview } = await client.query(`
      SELECT p.slug, p.name, c.name AS category, c.cover_image
      FROM products p
      JOIN categories c ON c.id = p.category_id
      WHERE p.is_published = true
        AND COALESCE(p.featured_image_url, '') = ''
        AND COALESCE(c.cover_image, '') <> ''
      LIMIT 10
    `);
    console.log('Sample backfill preview:', preview);
    await client.end();
    return;
  }

  const result = await client.query(BACKFILL_SQL);
  console.log(`Updated ${result.rowCount} products`);

  const { rows: after } = await client.query(
    `SELECT COUNT(*)::int AS missing FROM products WHERE is_published = true AND COALESCE(featured_image_url,'') = ''`,
  );
  console.log(`Products missing image (after): ${after[0].missing}`);
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
