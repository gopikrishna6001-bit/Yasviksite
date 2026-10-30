/**
 * Renumber every product to short counter barcodes: YAS-001, YAS-002, …
 *
 * Run: SUPABASE_DB_PASSWORD=… node scripts/assign_product_barcodes.mjs
 * Dry run: SUPABASE_DB_PASSWORD=… node scripts/assign_product_barcodes.mjs --dry-run
 */
import { Client } from 'pg';
import { reassignAllProductSkus } from '../src/lib/productSku.js';

const dbPassword = process.env.SUPABASE_DB_PASSWORD;
const dryRun = process.argv.includes('--dry-run');

if (!dbPassword) {
  console.error('Missing SUPABASE_DB_PASSWORD');
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
  await client.connect();

  const { rows } = await client.query(
    `SELECT id, title, name, sku, product_code FROM products ORDER BY title ASC NULLS LAST, id ASC`,
  );

  const updates = reassignAllProductSkus(
    rows.map((p) => ({ ...p, title: p.title || p.name })),
  );

  if (!updates.length) {
    console.log('No products found.');
    await client.end();
    return;
  }

  console.log(`${dryRun ? 'Would renumber' : 'Renumbering'} ${updates.length} products…`);
  for (const item of updates) {
    const from = item.previousSku ? `${item.previousSku} → ` : '';
    console.log(`  ${from}${item.sku}  (${item.title})`);
    if (!dryRun) {
      await client.query(
        `UPDATE products SET sku = $1, product_code = $2, updated_at = now() WHERE id = $3`,
        [item.sku, item.product_code, item.id],
      );
    }
  }

  console.log(dryRun ? 'Dry run complete — no changes written.' : 'Done.');
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
