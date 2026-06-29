/**
 * Fix existing yureka-* products: Organic names, Telugu local_name,
 * invoice × 2 selling, ₹10 small-pack margin.
 *
 * Run: SUPABASE_DB_PASSWORD=… node scripts/fix_yureka_invoice_4717.mjs
 */
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

async function main() {
  const previews = [];

  if (!dryRun) await client.connect();
  if (!dryRun) await client.query('begin');

  try {
    for (let i = 0; i < YUREKA_INVOICE_4717.length; i += 1) {
      const product = YUREKA_INVOICE_4717[i];
      const productCode = `YAS-${String(66 + i).padStart(3, '0')}`;
      const payload = buildProductPayload(product, productCode);

      previews.push({
        code: productCode,
        name: payload.name,
        telugu: payload.local_name,
        invoice: product.invoice_per_kg,
        sell_kg: payload.sell_per_kg,
        margin: 10,
        sample_500g: payload.quick_variants.find((v) => v.label === '500g')?.price,
      });

      if (dryRun) continue;

      const result = await client.query(
        `
          update public.products set
            name = $2,
            local_name = $3,
            sku = $4,
            product_code = $5,
            category_id = $6,
            processing_method = $7,
            yasvik_mark = $8,
            short_description = $9,
            price = $10,
            quick_variants = $11::jsonb,
            purity_badges = $12::jsonb,
            updated_at = now()
          where slug = $1
          returning slug, name, price, local_name
        `,
        [
          product.slug,
          payload.name,
          payload.local_name,
          payload.sku_base,
          payload.product_code,
          payload.category_id,
          payload.processing_method,
          payload.yasvik_mark,
          payload.short_description,
          payload.price,
          JSON.stringify(payload.quick_variants),
          JSON.stringify(payload.purity_badges),
        ],
      );

      if (result.rowCount === 0) {
        console.warn(`Missing slug (not updated): ${product.slug}`);
      }
    }

    if (dryRun) {
      console.log(JSON.stringify(previews, null, 2));
      return;
    }

    await client.query('commit');
    console.log(`Updated ${previews.length} Yureka invoice products.`);
    console.log('Pricing: sell = round(invoice × 2); packs < 1kg add ₹10 margin.');
    console.log('Example: invoice ₹100/kg → sell ₹200/kg → 500g pack ₹110');
    for (const row of previews.slice(0, 5)) {
      console.log(`  ${row.code} · ${row.name} · ${row.telugu} · inv ₹${row.invoice} → sell ₹${row.sell_kg}/kg · 500g ₹${row.sample_500g}`);
    }
    console.log(`  … and ${previews.length - 5} more`);
  } catch (error) {
    if (!dryRun) await client.query('rollback');
    throw error;
  } finally {
    if (!dryRun) await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
