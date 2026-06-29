/**
 * Assign readable product-level SKUs (TOOR-DAL style) for counter barcodes.
 *
 * Run: SUPABASE_DB_PASSWORD=… node scripts/assign_product_barcodes.mjs
 * Dry run: node scripts/assign_product_barcodes.mjs --dry-run
 */
import { Client } from 'pg';
import { assignMissingProductSkus } from '../src/lib/productSku.js';

const dbPassword = process.env.SUPABASE_DB_PASSWORD;
const dryRun = process.argv.includes('--dry-run');

if (!dryRun && !dbPassword) {
  console.error('Missing SUPABASE_DB_PASSWORD (or pass --dry-run)');
  process.exit(1);
}

const client = new Client({
  host: 'db.cpksnpuavywbmhrzglyh.supabase.co',
  user: 'postgres',
  password: dbPassword,
  database: 'postgres',
  port: 5432,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  if (!dryRun) await client.connect();

  const { rows } = dryRun
    ? { rows: [] }
    : await client.query(
        `SELECT id, title, name, sku FROM products ORDER BY created_date DESC NULLS LAST`
      );

  let products = rows;
  if (dryRun) {
    console.log('Dry run — no database connection. Pass SUPABASE_DB_PASSWORD to apply updates.');
    process.exit(0);
  }

  const updates = assignMissingProductSkus(
    products.map((p) => ({ ...p, title: p.title || p.name }))
  );

  if (!updates.length) {
    console.log('All products already have SKUs.');
    await client.end();
    return;
  }

  console.log(`Assigning SKUs to ${updates.length} products…`);
  for (const item of updates) {
    console.log(`  ${item.title} → ${item.sku}`);
    await client.query(`UPDATE products SET sku = $1, updated_at = now() WHERE id = $2`, [
      item.sku,
      item.id,
    ]);
  }

  console.log('Done.');
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
