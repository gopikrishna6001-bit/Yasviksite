/**
 * Insert NEW products from Yureka invoice 4717 (30-May-2026).
 * Does NOT update existing catalog rows — only inserts by unique slug.
 *
 * Pricing: invoice ₹/kg × 2 = selling ₹/kg; ₹10 margin on packs < 1 kg
 *
 * Run: SUPABASE_DB_PASSWORD=… node scripts/enroll_yureka_invoice_4717.mjs
 * Dry: node scripts/enroll_yureka_invoice_4717.mjs --dry-run
 */
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import {
  YUREKA_INVOICE_4717,
  buildProductPayload,
} from './yureka_invoice_4717_catalog.js';

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

async function insertProduct(payload) {
  const result = await client.query(
    `
      insert into public.products (
        id, product_code, name, slug, local_name, description, short_description,
        sku, category_id, processing_method, yasvik_mark,
        purity_badges, inventory_group, shared_stock_kg,
        price, currency, is_published, stock_quantity,
        quick_variants, created_at, updated_at
      )
      values (
        $1,$2,$3,$4,$5,$6,$7,
        $8,$9,$10,$11,
        $12::jsonb,$13,$14,
        $15,'INR',true,$16,
        $17::jsonb,now(),now()
      )
      on conflict (slug) do nothing
      returning id, slug, name, local_name, price, product_code
    `,
    [
      randomUUID(),
      payload.product_code,
      payload.name,
      payload.slug,
      payload.local_name,
      payload.short_description,
      payload.short_description,
      payload.sku_base,
      payload.category_id,
      payload.processing_method,
      payload.yasvik_mark,
      JSON.stringify(payload.purity_badges),
      payload.inventory_group,
      payload.shared_stock_kg,
      payload.price,
      payload.stock_quantity,
      JSON.stringify(payload.quick_variants),
    ],
  );

  return result.rows[0] || null;
}

async function main() {
  const payloads = YUREKA_INVOICE_4717.map((p, i) =>
    buildProductPayload(p, `YAS-${String(66 + i).padStart(3, '0')}`),
  );

  if (dryRun) {
    console.log(JSON.stringify(
      payloads.map((p) => ({
        code: p.product_code,
        name: p.name,
        telugu: p.local_name,
        slug: p.slug,
        invoice: p.invoice_per_kg,
        sell_kg: p.sell_per_kg,
        sdr: p.sdr,
        packs: p.quick_variants
          .filter((v) => v.label !== '__yasvik_pricing__')
          .map((v) => `${v.label}=₹${v.price}`),
      })),
      null,
      2,
    ));
    return;
  }

  await client.connect();
  await client.query('begin');

  try {
    const inserted = [];
    const skipped = [];

    for (const payload of payloads) {
      const row = await insertProduct(payload);
      if (row) inserted.push(row);
      else skipped.push(payload.slug);
    }

    await client.query('commit');
    console.log(`Inserted ${inserted.length} new products from invoice 4717.`);
    if (skipped.length) console.log(`Skipped ${skipped.length} (slug already exists): ${skipped.join(', ')}`);
    for (const row of inserted) {
      console.log(`  ${row.product_code} · ${row.name} · ${row.local_name} · ₹${row.price}/kg ref`);
    }
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
