/**
 * Import Yasvik "Products Upload" workbook (47 columns) into Supabase.
 *
 * Run:
 *   SUPABASE_DB_PASSWORD=… node scripts/import_products_upload_workbook.mjs \
 *     "/Users/macbookprom3/Downloads/yasvik_products_SINGLE_EXCEL_FINAL_UPLOAD_2026-06-27.xlsx"
 *
 * Dry run (validate only):
 *   node scripts/import_products_upload_workbook.mjs --dry-run path/to/workbook.xlsx
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { Client } from 'pg';
import {
  buildSpreadsheetImportPayload,
  parseProductsUploadRows,
  planProductSpreadsheetImport,
} from '../src/lib/productSpreadsheet.js';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const DEFAULT_WORKBOOK =
  '/Users/macbookprom3/Downloads/yasvik_products_SINGLE_EXCEL_FINAL_UPLOAD_2026-06-27.xlsx';

const args = process.argv.slice(2).filter((arg) => arg !== '--dry-run');
const dryRun = process.argv.includes('--dry-run');
const workbookPath = args[0] || DEFAULT_WORKBOOK;
const dbPassword = process.env.SUPABASE_DB_PASSWORD;

const client = new Client({
  host: process.env.SUPABASE_DB_HOST || 'db.cpksnpuavywbmhrzglyh.supabase.co',
  user: 'postgres',
  password: dbPassword,
  database: 'postgres',
  port: 5432,
  ssl: { rejectUnauthorized: false },
});

function readWorkbook(path) {
  if (!fs.existsSync(path)) {
    throw new Error(`Workbook not found: ${path}`);
  }
  const workbook = XLSX.readFile(path);
  const sheetName = workbook.SheetNames.find(
    (label) => String(label).trim().toLowerCase().replace(/\s+/g, '_') === 'products_upload',
  ) || workbook.SheetNames[0];
  const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
  return {
    sheetName,
    rows: parseProductsUploadRows(rawRows),
    bundleRows: readOptionalSheet(workbook, 'Bundles Related'),
    qaRows: readOptionalSheet(workbook, 'QA Notes'),
  };
}

function readOptionalSheet(workbook, name) {
  const sheetName = workbook.SheetNames.find(
    (label) => String(label).trim().toLowerCase() === name.toLowerCase(),
  );
  if (!sheetName) return [];
  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
}

function parsePipeList(value) {
  const text = String(value ?? '').trim();
  if (!text) return [];
  if (text.startsWith('[')) {
    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return text.split('|').map((part) => part.trim()).filter(Boolean);
}

function payloadToDbRow(payload = {}) {
  return {
    product_code: payload.product_code ?? null,
    name: payload.title ?? null,
    slug: payload.slug ?? null,
    local_name: payload.local_name ?? null,
    telugu_name: payload.telugu_name ?? null,
    description: payload.story_description ?? null,
    short_description: payload.short_description ?? null,
    sku: payload.sku ?? null,
    category_id: payload.category_id ?? null,
    journey_id: payload.journey_id ?? null,
    person_id: payload.person_id ?? null,
    region_id: payload.region_id ?? null,
    processing_method: payload.processing_method ?? null,
    best_for: payload.best_for ?? null,
    storage_note: payload.storage_note ?? null,
    yasvik_mark: payload.yasvik_mark ?? null,
    delivery_card: payload.delivery_card ?? null,
    pack_info_card: payload.pack_info_card ?? null,
    sourcing_card: payload.sourcing_card ?? null,
    recipe_ids: payload.recipe_ids ?? null,
    recipe_titles: payload.recipe_titles ?? null,
    recipe_links: JSON.stringify(payload.recipe_links ?? []),
    stock_measure_type: payload.stock_measure_type ?? null,
    shared_stock_kg: payload.shared_stock_kg ?? null,
    stock_quantity: payload.stock ?? null,
    price: payload.price ?? 0,
    discount_price: payload.compare_price ?? null,
    low_stock_threshold: payload.low_stock_threshold ?? null,
    weight_grams: payload.weight_grams ?? null,
    featured_image_url: payload.hero_image ?? null,
    hero_video: payload.hero_video ?? null,
    seo_title: payload.seo_title ?? null,
    seo_description: payload.seo_description ?? null,
    seo_keywords: payload.seo_keywords ?? null,
    hover_media: JSON.stringify(payload.hover_media ?? []),
    quick_variants: JSON.stringify(payload.quick_variants ?? []),
    purity_badges: JSON.stringify(payload.purity_badges ?? []),
    is_published: Boolean(payload.is_published),
    is_featured: Boolean(payload.is_featured),
    featured_in_hero: Boolean(payload.featured_in_hero),
    harvest_date: payload.harvest_date || null,
    batch_tested_at: payload.batch_tested_at || null,
    gallery_images: parsePipeList(payload.images),
  };
}

async function ensureColumns() {
  await client.query(`
    alter table if exists public.products
      add column if not exists telugu_name text,
      add column if not exists stock_measure_type text,
      add column if not exists weight_grams numeric,
      add column if not exists low_stock_threshold integer,
      add column if not exists harvest_date date,
      add column if not exists batch_tested_at date,
      add column if not exists hero_video text;
  `);
}

async function fetchProducts() {
  const { rows } = await client.query(`
    select *
    from public.products
    order by created_date desc nulls last
  `);
  return rows;
}

async function fetchCategories() {
  const { rows } = await client.query(`select id, name, slug, emotional_title from public.categories`);
  return rows;
}

async function updateProduct(id, payload) {
  const row = payloadToDbRow(payload);
  await client.query(
    `
      update public.products set
        product_code = $2,
        name = $3,
        slug = $4,
        local_name = $5,
        telugu_name = $6,
        description = $7,
        short_description = $8,
        sku = $9,
        category_id = $10,
        journey_id = $11,
        person_id = $12,
        region_id = $13,
        processing_method = $14,
        best_for = $15,
        storage_note = $16,
        yasvik_mark = $17,
        delivery_card = $18,
        pack_info_card = $19,
        sourcing_card = $20,
        recipe_ids = $21,
        recipe_titles = $22,
        recipe_links = $23::jsonb,
        stock_measure_type = $24,
        shared_stock_kg = $25,
        stock_quantity = $26,
        price = $27,
        discount_price = $28,
        low_stock_threshold = $29,
        weight_grams = $30,
        featured_image_url = coalesce(nullif($31, ''), featured_image_url),
        hero_video = $32,
        seo_title = $33,
        seo_description = $34,
        seo_keywords = $35,
        hover_media = $36::jsonb,
        quick_variants = $37::jsonb,
        purity_badges = $38::jsonb,
        is_published = $39,
        is_featured = $40,
        featured_in_hero = $41,
        harvest_date = $42,
        batch_tested_at = $43,
        updated_at = now()
      where id = $1
    `,
    [
      id,
      row.product_code,
      row.name,
      row.slug,
      row.local_name,
      row.telugu_name,
      row.description,
      row.short_description,
      row.sku,
      row.category_id,
      row.journey_id,
      row.person_id,
      row.region_id,
      row.processing_method,
      row.best_for,
      row.storage_note,
      row.yasvik_mark,
      row.delivery_card,
      row.pack_info_card,
      row.sourcing_card,
      row.recipe_ids,
      row.recipe_titles,
      row.recipe_links,
      row.stock_measure_type,
      row.shared_stock_kg,
      row.stock_quantity,
      row.price,
      row.discount_price,
      row.low_stock_threshold,
      row.weight_grams,
      row.featured_image_url,
      row.hero_video,
      row.seo_title,
      row.seo_description,
      row.seo_keywords,
      row.hover_media,
      row.quick_variants,
      row.purity_badges,
      row.is_published,
      row.is_featured,
      row.featured_in_hero,
      row.harvest_date,
      row.batch_tested_at,
    ],
  );

  if (row.gallery_images.length) {
    await client.query('delete from public.product_images where product_id = $1', [id]);
    for (const [index, imageUrl] of row.gallery_images.entries()) {
      await client.query(
        `
          insert into public.product_images (product_id, image_url, sort_order, is_primary)
          values ($1, $2, $3, $4)
        `,
        [id, imageUrl, index, index === 0],
      );
    }
  }
}

async function main() {
  const { sheetName, rows, bundleRows, qaRows } = readWorkbook(workbookPath);
  console.log(`Workbook: ${workbookPath}`);
  console.log(`Sheet: ${sheetName} · ${rows.length} products`);
  console.log(`Bundles Related: ${bundleRows.length} rows · QA Notes: ${qaRows.length} rows`);

  if (!dryRun && !dbPassword) {
    console.error('Missing SUPABASE_DB_PASSWORD (or pass --dry-run)');
    process.exit(1);
  }

  if (dryRun) {
    console.log('\nDry run — validating workbook structure only.');
    console.log(`Columns in first row: ${Object.keys(rows[0] || {}).length}`);
    console.log(`Sample product: ${rows[0]?.title} (${rows[0]?.id})`);
    return;
  }

  await client.connect();
  await ensureColumns();

  const [products, categories] = await Promise.all([fetchProducts(), fetchCategories()]);
  const { planned, skipped } = planProductSpreadsheetImport(rows, products, categories);

  console.log(`Planned updates: ${planned.length} · skipped: ${skipped.length}`);

  await client.query('begin');
  try {
    for (const item of planned) {
      await updateProduct(item.id, item.payload);
      console.log(`  ✓ ${item.title}`);
    }
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    await client.end();
  }

  console.log(`\nImported ${planned.length} products from ${sheetName}.`);
  if (skipped.length) {
    console.log(`Skipped ${skipped.length} rows (no changes / missing id / unknown product).`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
