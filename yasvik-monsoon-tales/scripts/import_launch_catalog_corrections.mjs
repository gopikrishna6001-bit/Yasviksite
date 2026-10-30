/**
 * Idempotent launch catalog corrections from Yasvik launch-ready workbook.
 *
 * Run:
 *   SUPABASE_DB_PASSWORD=… node scripts/import_launch_catalog_corrections.mjs \
 *     "/Users/macbookprom3/Downloads/yasvik_launch_ready_product_sheet_customer_copy_v2_2026-07-05.xlsx"
 *
 * Dry run (plan only, no DB writes):
 *   node scripts/import_launch_catalog_corrections.mjs --dry-run path/to/workbook.xlsx
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import {
  LAUNCH_SHEETS,
  planLaunchCatalogCorrections,
  sheetRowsFromWorkbook,
} from '../src/lib/launchCatalogImport.js';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const DEFAULT_WORKBOOK =
  '/Users/macbookprom3/Downloads/yasvik_launch_ready_product_sheet_customer_copy_v2_2026-07-05.xlsx';

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

function readWorkbook(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Workbook not found: ${filePath}`);
  }
  const workbook = XLSX.readFile(filePath);
  return {
    path: filePath,
    productRows: sheetRowsFromWorkbook(workbook, LAUNCH_SHEETS.PRODUCTS, XLSX.utils.sheet_to_json),
    storeOnlyRows: sheetRowsFromWorkbook(workbook, LAUNCH_SHEETS.STORE_ONLY, XLSX.utils.sheet_to_json),
    variantRows: sheetRowsFromWorkbook(workbook, LAUNCH_SHEETS.VARIANTS, XLSX.utils.sheet_to_json),
    categoryRows: sheetRowsFromWorkbook(workbook, LAUNCH_SHEETS.CATEGORIES, XLSX.utils.sheet_to_json),
    comboRows: sheetRowsFromWorkbook(workbook, LAUNCH_SHEETS.COMBOS, XLSX.utils.sheet_to_json),
    homepageSections: sheetRowsFromWorkbook(workbook, LAUNCH_SHEETS.HOMEPAGE, XLSX.utils.sheet_to_json),
  };
}

async function fetchCategories() {
  const { rows } = await client.query(`
    select id, name, slug, emotional_title, color_hex, color_accent, sort_order, is_active, parent_id
    from public.categories
    order by sort_order asc, name asc
  `);
  return rows;
}

async function fetchProducts() {
  const { rows } = await client.query(`
    select
      id, name, slug, sku, product_code, category_id, local_name,
      short_description, best_for, storage_note, purity_badges,
      seo_title, seo_description, stock_measure_type, stock_quantity,
      price, discount_price, quick_variants, is_published, is_featured,
      featured_in_hero, sell_online, sort_order, featured_image_url
    from public.products
    order by sort_order asc, name asc
  `);
  return rows.map((row) => ({
    ...row,
    title: row.name,
    compare_price: row.discount_price,
    stock: row.stock_quantity,
  }));
}

async function fetchCombos() {
  const { rows } = await client.query(`
    select id, name, slug, combo_price, regular_price, discount_percentage,
           is_published, is_featured, sort_order, product_ids
    from public.combos
    order by sort_order asc, name asc
  `);
  return rows;
}

async function ensureColumns() {
  await client.query(`
    alter table if exists public.categories
      add column if not exists parent_id uuid references public.categories(id) on delete set null,
      add column if not exists emotional_title text,
      add column if not exists color_accent varchar(7);

    alter table if exists public.products
      add column if not exists sell_online boolean not null default true,
      add column if not exists product_code text,
      add column if not exists local_name text,
      add column if not exists best_for text,
      add column if not exists storage_note text,
      add column if not exists purity_badges jsonb default '[]'::jsonb,
      add column if not exists quick_variants jsonb default '[]'::jsonb;

    alter table if exists public.combos
      add column if not exists is_featured boolean default false,
      add column if not exists product_ids jsonb default '[]'::jsonb;
  `);
}

async function upsertCategory(plan, slugToId, nameToId = new Map()) {
  const { action, id, slug, payload } = plan;
  const parentId = payload.parent_id || (payload.parentSlug ? slugToId.get(payload.parentSlug) : null) || null;

  if (action === 'update' && id) {
    await client.query(
      `
        update public.categories set
          name = $2,
          emotional_title = $3,
          slug = $4,
          color_accent = $5,
          color_hex = $6,
          sort_order = $7,
          is_active = $8,
          parent_id = $9,
          updated_at = now()
        where id = $1
      `,
      [
        id,
        payload.name,
        payload.emotional_title,
        slug,
        payload.color_accent,
        payload.color_hex,
        payload.sort_order,
        payload.is_active,
        parentId,
      ],
    );
    slugToId.set(slug, id);
    nameToId.set(String(payload.name || '').trim().toLowerCase(), id);
    return { action: 'updated', slug, id };
  }

  const existingBySlug = slugToId.get(slug);
  if (existingBySlug) {
    return { action: 'linked', slug, id: existingBySlug };
  }

  const existingNameId = nameToId.get(String(payload.name || '').trim().toLowerCase());
  if (existingNameId) {
    slugToId.set(slug, existingNameId);
    return { action: 'linked-by-name', slug, id: existingNameId, name: payload.name };
  }

  const newId = randomUUID();
  try {
    const { rows } = await client.query(
      `
        insert into public.categories (
          id, name, emotional_title, slug, color_accent, color_hex, sort_order, is_active, parent_id
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        on conflict (slug) do update set
          name = excluded.name,
          emotional_title = excluded.emotional_title,
          color_accent = excluded.color_accent,
          color_hex = excluded.color_hex,
          sort_order = excluded.sort_order,
          is_active = excluded.is_active,
          parent_id = excluded.parent_id,
          updated_at = now()
        returning id
      `,
      [
        newId,
        payload.name,
        payload.emotional_title,
        slug,
        payload.color_accent,
        payload.color_hex,
        payload.sort_order,
        payload.is_active,
        parentId,
      ],
    );
    const actualId = rows[0]?.id || newId;
    slugToId.set(slug, actualId);
    nameToId.set(String(payload.name || '').trim().toLowerCase(), actualId);
    return { action: 'created', slug, id: actualId };
  } catch (error) {
    if (error?.code !== '23505') throw error;
    const { rows } = await client.query(
      `select id from public.categories where lower(name) = lower($1) limit 1`,
      [payload.name],
    );
    const actualId = rows[0]?.id;
    if (!actualId) throw error;
    slugToId.set(slug, actualId);
    nameToId.set(String(payload.name || '').trim().toLowerCase(), actualId);
    return { action: 'linked-by-name', slug, id: actualId, name: payload.name };
  }
}

async function updateProduct(id, payload, { preserveFeaturedImage = true } = {}) {
  await client.query(
    `
      update public.products set
        product_code = $2,
        name = $3,
        slug = $4,
        local_name = $5,
        sku = $6,
        category_id = $7,
        short_description = $8,
        best_for = $9,
        storage_note = $10,
        purity_badges = $11::jsonb,
        seo_title = $12,
        seo_description = $13,
        stock_measure_type = $14,
        stock_quantity = $15,
        price = $16,
        discount_price = $17,
        quick_variants = $18::jsonb,
        is_published = $19,
        is_featured = $20,
        featured_in_hero = $21,
        sell_online = $22,
        sort_order = $23,
        featured_image_url = case when $24 then featured_image_url else featured_image_url end,
        updated_at = now()
      where id = $1
    `,
    [
      id,
      payload.product_code,
      payload.name,
      payload.slug,
      payload.local_name,
      payload.sku,
      payload.category_id,
      payload.short_description,
      payload.best_for,
      payload.storage_note,
      JSON.stringify(payload.purity_badges || []),
      payload.seo_title,
      payload.seo_description,
      payload.stock_measure_type,
      payload.stock_quantity,
      payload.price,
      payload.discount_price,
      JSON.stringify(payload.quick_variants || []),
      payload.is_published,
      payload.is_featured,
      payload.featured_in_hero,
      payload.sell_online,
      payload.sort_order,
      preserveFeaturedImage,
    ],
  );
}

async function createProduct(payload) {
  const id = randomUUID();
  await client.query(
    `
      insert into public.products (
        id, product_code, name, slug, local_name, sku, category_id,
        short_description, best_for, storage_note, purity_badges,
        seo_title, seo_description, stock_measure_type, stock_quantity,
        price, discount_price, quick_variants,
        is_published, is_featured, featured_in_hero, sell_online, sort_order
      ) values (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11::jsonb,
        $12, $13, $14, $15,
        $16, $17, $18::jsonb,
        $19, $20, $21, $22, $23
      )
      on conflict (slug) do update set
        product_code = excluded.product_code,
        name = excluded.name,
        local_name = excluded.local_name,
        sku = excluded.sku,
        category_id = excluded.category_id,
        short_description = excluded.short_description,
        best_for = excluded.best_for,
        storage_note = excluded.storage_note,
        purity_badges = excluded.purity_badges,
        seo_title = excluded.seo_title,
        seo_description = excluded.seo_description,
        stock_measure_type = excluded.stock_measure_type,
        stock_quantity = excluded.stock_quantity,
        price = excluded.price,
        discount_price = excluded.discount_price,
        quick_variants = excluded.quick_variants,
        is_published = excluded.is_published,
        is_featured = excluded.is_featured,
        featured_in_hero = excluded.featured_in_hero,
        sell_online = excluded.sell_online,
        sort_order = excluded.sort_order,
        updated_at = now()
      returning id
    `,
    [
      id,
      payload.product_code,
      payload.name,
      payload.slug,
      payload.local_name,
      payload.sku,
      payload.category_id,
      payload.short_description,
      payload.best_for,
      payload.storage_note,
      JSON.stringify(payload.purity_badges || []),
      payload.seo_title,
      payload.seo_description,
      payload.stock_measure_type,
      payload.stock_quantity,
      payload.price,
      payload.discount_price,
      JSON.stringify(payload.quick_variants || []),
      payload.is_published,
      payload.is_featured,
      payload.featured_in_hero,
      payload.sell_online,
      payload.sort_order,
    ],
  );
  return id;
}

async function upsertCombo(plan) {
  const { action, id, payload } = plan;
  let comboId = id;

  if (action === 'update' && comboId) {
    await client.query(
      `
        update public.combos set
          name = $2,
          slug = $3,
          description = $4,
          combo_price = $5,
          regular_price = $6,
          discount_percentage = $7,
          is_published = $8,
          is_featured = $9,
          sort_order = $10,
          product_ids = $11::jsonb,
          updated_at = now()
        where id = $1
      `,
      [
        comboId,
        payload.name,
        payload.slug,
        payload.description,
        payload.combo_price,
        payload.regular_price,
        payload.discount_percentage,
        payload.is_published,
        payload.is_featured,
        payload.sort_order,
        JSON.stringify(payload.product_ids || []),
      ],
    );
  } else {
    comboId = randomUUID();
    const { rows } = await client.query(
      `
        insert into public.combos (
          id, name, slug, description, combo_price, regular_price,
          discount_percentage, is_published, is_featured, sort_order, product_ids
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
        on conflict (slug) do update set
          name = excluded.name,
          description = excluded.description,
          combo_price = excluded.combo_price,
          regular_price = excluded.regular_price,
          discount_percentage = excluded.discount_percentage,
          is_published = excluded.is_published,
          is_featured = excluded.is_featured,
          sort_order = excluded.sort_order,
          product_ids = excluded.product_ids,
          updated_at = now()
        returning id
      `,
      [
        comboId,
        payload.name,
        payload.slug,
        payload.description,
        payload.combo_price,
        payload.regular_price,
        payload.discount_percentage,
        payload.is_published,
        payload.is_featured,
        payload.sort_order,
        JSON.stringify(payload.product_ids || []),
      ],
    );
    comboId = rows[0]?.id || comboId;
  }

  await client.query('delete from public.combo_items where combo_id = $1', [comboId]);
  const productIds = payload.product_ids || [];
  for (const [index, productId] of productIds.entries()) {
    await client.query(
      `
        insert into public.combo_items (combo_id, product_id, quantity, sort_order)
        values ($1, $2, 1, $3)
        on conflict do nothing
      `,
      [comboId, productId, index],
    );
  }

  return comboId;
}

async function upsertHomeBestSellers(picks = []) {
  const value = JSON.stringify(picks);
  await client.query(
    `
      insert into public.app_settings (setting_key, setting_value, data_type, description)
      values ('home_best_sellers', $1, 'json', 'Homepage best seller carousel picks')
      on conflict (setting_key) do update set
        setting_value = excluded.setting_value,
        data_type = excluded.data_type,
        updated_at = now()
    `,
    [value],
  );
}

function resolvePayloadCategoryId(payload, slugToId) {
  if (payload.category_id) return payload.category_id;
  const slug = String(payload.category_slug || '').trim().toLowerCase();
  return slug ? slugToId.get(slug) || null : null;
}

function writeSummary(report, filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

async function main() {
  const workbook = readWorkbook(workbookPath);
  console.log(`Workbook: ${workbook.path}`);
  console.log(`Products: ${workbook.productRows.length} · Store-only: ${workbook.storeOnlyRows.length}`);
  console.log(`Variants: ${workbook.variantRows.length} · Categories: ${workbook.categoryRows.length}`);
  console.log(`Combos: ${workbook.comboRows.length}`);

  let existingCategories = [];
  let existingProducts = [];
  let existingCombos = [];

  if (dryRun && process.env.LAUNCH_IMPORT_SNAPSHOT) {
    const snapshot = JSON.parse(fs.readFileSync(process.env.LAUNCH_IMPORT_SNAPSHOT, 'utf8'));
    existingCategories = snapshot.categories || [];
    existingProducts = snapshot.products || [];
    existingCombos = snapshot.combos || [];
    console.log(`Snapshot: ${existingProducts.length} products · ${existingCategories.length} categories · ${existingCombos.length} combos`);
  } else if (!dryRun) {
    if (!dbPassword) {
      console.error('Missing SUPABASE_DB_PASSWORD (or pass --dry-run)');
      process.exit(1);
    }
    await client.connect();
    await ensureColumns();
    [existingCategories, existingProducts, existingCombos] = await Promise.all([
      fetchCategories(),
      fetchProducts(),
      fetchCombos(),
    ]);
    console.log(`DB: ${existingProducts.length} products · ${existingCategories.length} categories · ${existingCombos.length} combos`);
  }

  const plan = planLaunchCatalogCorrections({
    productRows: workbook.productRows,
    storeOnlyRows: workbook.storeOnlyRows,
    variantRows: workbook.variantRows,
    categoryRows: workbook.categoryRows,
    comboRows: workbook.comboRows,
    homepageSections: workbook.homepageSections,
    existingCategories,
    existingProducts,
    existingCombos,
  });

  const report = {
    generated_at: new Date().toISOString(),
    workbook: workbook.path,
    dry_run: dryRun,
    summary: plan.summary,
    categories: {
      roots: plan.categories.roots.map((row) => ({ action: row.action, slug: row.slug, name: row.payload.name })),
      subcategories: plan.categories.subcategories.map((row) => ({
        action: row.action,
        slug: row.slug,
        name: row.payload.name,
        parentSlug: row.parentSlug,
      })),
      skipped: plan.categories.skipped,
    },
    products: {
      updated: plan.products.updates.map((row) => ({
        title: row.title,
        match: row.match,
        warning: row.warning || null,
      })),
      created: plan.products.creates.map((row) => row.title),
      skipped: plan.products.skipped,
    },
    combos: {
      updated: plan.combos.updates.map((row) => ({ name: row.name, missing: row.missing || [] })),
      created: plan.combos.creates.map((row) => ({ name: row.name, missing: row.missing || [] })),
      skipped: plan.combos.skipped,
    },
    homepage: plan.homepage,
  };

  const summaryPath = path.resolve('import-preview/launch_correction_summary.json');
  writeSummary(report, summaryPath);
  console.log(`\nPlan summary written to ${summaryPath}`);
  console.log(JSON.stringify(plan.summary, null, 2));

  if (dryRun) {
    console.log('\nDry run complete — no database writes.');
    if (!dryRun && client) await client.end();
    return;
  }

  const results = {
    categoriesUpdated: 0,
    categoriesCreated: 0,
    subcategoriesUpdated: 0,
    subcategoriesCreated: 0,
    productsUpdated: 0,
    productsCreated: 0,
    combosUpdated: 0,
    combosCreated: 0,
  };

  await client.query('begin');
  try {
    const slugToId = new Map(existingCategories.map((cat) => [String(cat.slug || '').toLowerCase(), cat.id]));
    const nameToId = new Map(
      existingCategories.map((cat) => [String(cat.name || '').trim().toLowerCase(), cat.id]),
    );

    for (const rootPlan of plan.categories.roots) {
      const result = await upsertCategory(rootPlan, slugToId, nameToId);
      if (result.action === 'updated') results.categoriesUpdated += 1;
      else results.categoriesCreated += 1;
      console.log(`  category ${result.action}: ${rootPlan.payload.name}`);
    }

    for (const subPlan of plan.categories.subcategories) {
      const result = await upsertCategory(subPlan, slugToId, nameToId);
      if (result.action === 'updated') results.subcategoriesUpdated += 1;
      else results.subcategoriesCreated += 1;
    }

    for (const item of plan.products.updates) {
      const categoryId = resolvePayloadCategoryId(item.payload, slugToId);
      if (!categoryId) {
        console.warn(`  skip product (no category): ${item.title}`);
        continue;
      }
      await updateProduct(item.id, { ...item.payload, category_id: categoryId }, { preserveFeaturedImage: item.preserveFeaturedImage });
      results.productsUpdated += 1;
      console.log(`  product updated (${item.match}): ${item.title}`);
    }

    for (const item of plan.products.creates) {
      const categoryId = resolvePayloadCategoryId(item.payload, slugToId);
      if (!categoryId) {
        console.warn(`  skip create (no category): ${item.title}`);
        continue;
      }
      const id = await createProduct({ ...item.payload, category_id: categoryId });
      item.id = id;
      results.productsCreated += 1;
      console.log(`  product created: ${item.title}`);
    }

    for (const item of plan.combos.updates) {
      await upsertCombo(item);
      results.combosUpdated += 1;
      console.log(`  combo updated: ${item.name}`);
    }

    for (const item of plan.combos.creates) {
      await upsertCombo(item);
      results.combosCreated += 1;
      console.log(`  combo created: ${item.name}`);
    }

    if (plan.homepage.home_best_sellers.length) {
      await upsertHomeBestSellers(plan.homepage.home_best_sellers);
      console.log(`  homepage best sellers: ${plan.homepage.home_best_sellers.length} picks`);
    }

    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    await client.end();
  }

  report.results = results;
  report.confirmation = {
    duplicate_products_created: false,
    duplicate_variants_created: false,
    images_preserved_on_update: true,
  };
  writeSummary(report, summaryPath);

  console.log('\nLaunch catalog corrections applied.');
  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
