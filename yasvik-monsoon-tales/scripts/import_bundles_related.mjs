/**
 * Import Bundles Related sheet into product_related + product_bundles tables.
 *
 * Run:
 *   SUPABASE_DB_PASSWORD=… npm run catalog:import-bundles -- path/to/workbook.xlsx
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import {
  buildProductLookupMaps,
  parseRelatedProductNames,
  resolveProductIdFromRef,
  slugifyBundleName,
} from '../src/lib/productRelationUtils.js';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const DEFAULT_WORKBOOK =
  '/Users/macbookprom3/Downloads/yasvik_products_SINGLE_EXCEL_FINAL_UPLOAD_2026-06-27.xlsx';

const args = process.argv.slice(2).filter((arg) => arg !== '--dry-run');
const dryRun = process.argv.includes('--dry-run');
const workbookPath = args[0] || DEFAULT_WORKBOOK;
const dbPassword = process.env.SUPABASE_DB_PASSWORD;

const BUNDLE_DESCRIPTIONS = {
  'monthly dal basics': 'Everyday dals families reorder — toor, moong, chana and more.',
  'millet breakfast kit': 'Millet flours, malt and sweeteners for an easy breakfast routine.',
  'millet and rice trial basket': 'Try a mix of millets and rice staples in one practical set.',
  'sambar rasam starter kit': 'Tamarind, dal and masala essentials for sambar and rasam.',
  'sambar/rasam starter kit': 'Tamarind, dal and masala essentials for sambar and rasam.',
  'dry fruit and seed snack box': 'Nuts, seeds and natural snacks for tea-time and kids.',
  'healthy snack box': 'Wholesome snacks without heavy processing.',
  'rice + pickle comfort combo': 'Rice staples with pickle for everyday meals.',
  'rice pickle comfort combo': 'Rice staples with pickle for everyday meals.',
  'breakfast and tiffin basket': 'Flours, sweeteners and breakfast helpers for tiffin time.',
  'breakfast & tiffin basket': 'Flours, sweeteners and breakfast helpers for tiffin time.',
};

const client = new Client({
  host: process.env.SUPABASE_DB_HOST || 'db.cpksnpuavywbmhrzglyh.supabase.co',
  user: 'postgres',
  password: dbPassword,
  database: 'postgres',
  port: 5432,
  ssl: { rejectUnauthorized: false },
});

function readBundleRows(path) {
  const workbook = XLSX.readFile(path);
  const sheetName = workbook.SheetNames.find(
    (label) => String(label).trim().toLowerCase() === 'bundles related',
  );
  if (!sheetName) throw new Error('Bundles Related sheet not found');
  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
}

function bundleDescription(name) {
  const key = String(name || '').trim().toLowerCase();
  return BUNDLE_DESCRIPTIONS[key] || `Curated Yasvik combo: ${name}. Add items individually.`;
}

async function ensureTables() {
  const sql = fs.readFileSync(
    new URL('../supabase/migrations/009_product_relations_bundles.sql', import.meta.url),
    'utf8',
  );
  await client.query(sql);
}

async function fetchProducts() {
  const { rows } = await client.query(`
    select id, sku, slug, name, title, product_code, is_published
    from public.products
  `);
  return rows.map((row) => ({
    ...row,
    title: row.title || row.name,
  }));
}

async function main() {
  if (!fs.existsSync(workbookPath)) {
    throw new Error(`Workbook not found: ${workbookPath}`);
  }

  const sheetRows = readBundleRows(workbookPath);
  console.log(`Bundles Related rows: ${sheetRows.length}`);

  if (dryRun) {
    console.log('Dry run — no database writes.');
    return;
  }

  if (!dbPassword) {
    console.error('Missing SUPABASE_DB_PASSWORD');
    process.exit(1);
  }

  await client.connect();
  await ensureTables();

  const products = await fetchProducts();
  const maps = buildProductLookupMaps(products);
  const productIdBySku = new Map(
    products.map((p) => [String(p.sku || '').trim().toLowerCase(), p.id]),
  );

  const skippedRefs = [];
  const bundleNameToId = new Map();

  await client.query('begin');
  try {
    await client.query('delete from public.product_related');
    await client.query('delete from public.product_bundle_items');
    await client.query('delete from public.product_bundles');

    let relationCount = 0;

    for (const row of sheetRows) {
      const sourceId =
        productIdBySku.get(String(row.sku || '').trim().toLowerCase())
        || resolveProductIdFromRef(row.title, maps)
        || resolveProductIdFromRef(row.product_code, maps);

      if (!sourceId) {
        skippedRefs.push({ row: row.title, reason: 'source product not found' });
        continue;
      }

      const relatedNames = parseRelatedProductNames(row.related_products);
      const fbtNames = relatedNames.slice(0, 3);
      const basketNames = relatedNames.slice(0, 4);

      for (const [index, name] of fbtNames.entries()) {
        const relatedId = resolveProductIdFromRef(name, maps);
        if (!relatedId || relatedId === sourceId) {
          skippedRefs.push({ row: row.title, ref: name, reason: 'frequently_bought target missing' });
          continue;
        }
        await client.query(
          `
            insert into public.product_related (
              id, product_id, related_product_id, relation_type, sort_order, is_active
            ) values ($1,$2,$3,'frequently_bought',$4,true)
            on conflict (product_id, related_product_id, relation_type) do update set
              sort_order = excluded.sort_order,
              is_active = true,
              updated_at = now()
          `,
          [randomUUID(), sourceId, relatedId, index + 1],
        );
        relationCount += 1;
      }

      for (const [index, name] of basketNames.entries()) {
        const relatedId = resolveProductIdFromRef(name, maps);
        if (!relatedId || relatedId === sourceId) {
          skippedRefs.push({ row: row.title, ref: name, reason: 'complete_basket target missing' });
          continue;
        }
        await client.query(
          `
            insert into public.product_related (
              id, product_id, related_product_id, relation_type, sort_order, is_active
            ) values ($1,$2,$3,'complete_basket',$4,true)
            on conflict (product_id, related_product_id, relation_type) do update set
              sort_order = excluded.sort_order,
              is_active = true,
              updated_at = now()
          `,
          [randomUUID(), sourceId, relatedId, index + 1],
        );
        relationCount += 1;
      }

      const bundleName = String(row.bundle_idea || '').trim();
      if (!bundleName) continue;

      const bundleSlug = slugifyBundleName(bundleName);
      let bundleId = bundleNameToId.get(bundleSlug);
      if (!bundleId) {
        bundleId = randomUUID();
        await client.query(
          `
            insert into public.product_bundles (
              id, bundle_name, bundle_slug, bundle_description, bundle_type,
              display_locations, is_active, sort_order
            ) values ($1,$2,$3,$4,'curated',$5::text[],true,$6)
          `,
          [
            bundleId,
            bundleName,
            bundleSlug,
            bundleDescription(bundleName),
            ['home', 'category', 'cart', 'product'],
            bundleNameToId.size + 1,
          ],
        );
        bundleNameToId.set(bundleSlug, bundleId);
      }

      await client.query(
        `
          insert into public.product_bundle_items (id, bundle_id, product_id, sort_order, is_required)
          values ($1,$2,$3,$4,true)
          on conflict (bundle_id, product_id) do nothing
        `,
        [randomUUID(), bundleId, sourceId, bundleNameToId.size],
      );
    }

    await client.query('commit');

    console.log(JSON.stringify({
      relationsWritten: relationCount,
      bundles: bundleNameToId.size,
      skipped: skippedRefs.length,
      sampleSkipped: skippedRefs.slice(0, 8),
      bundleSlugs: [...bundleNameToId.keys()].slice(0, 12),
    }, null, 2));
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
