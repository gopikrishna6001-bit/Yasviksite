/**
 * Backfill Telugu local_name + workbook categories from seo_keywords.
 *
 * Run:
 *   SUPABASE_DB_PASSWORD=… npm run catalog:backfill-seo
 */
import { Client } from 'pg';
import { parseSeoKeywordsMeta } from '../src/lib/productSpreadsheet.js';

const client = new Client({
  host: process.env.SUPABASE_DB_HOST || 'db.cpksnpuavywbmhrzglyh.supabase.co',
  user: 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD,
  database: 'postgres',
  port: 5432,
  ssl: { rejectUnauthorized: false },
});

import { CATALOG_CATEGORIES } from '../src/lib/catalogCategories.js';

async function ensureCategories() {
  for (const category of CATALOG_CATEGORIES) {
    await client.query(
      `
        insert into public.categories (name, slug, emotional_title, is_active, sort_order)
        select $1, $2, $1, true, $3
        where not exists (
          select 1 from public.categories
          where lower(slug) = lower($2) or lower(name) = lower($1)
        )
      `,
      [category.name, category.slug, category.sort_order],
    );
  }

  const { rows } = await client.query('select id, name, slug from public.categories');
  return new Map(rows.map((row) => [row.name, row.id]));
}

async function main() {
  if (!process.env.SUPABASE_DB_PASSWORD) {
    console.error('Missing SUPABASE_DB_PASSWORD');
    process.exit(1);
  }

  await client.connect();
  const categoryByName = await ensureCategories();

  const { rows: products } = await client.query(
    'select id, name, local_name, seo_keywords, category_id from public.products order by name',
  );

  let teluguUpdated = 0;
  let categoryUpdated = 0;

  for (const product of products) {
    const meta = parseSeoKeywordsMeta(product.seo_keywords);
    const updates = [];
    const values = [];
    let index = 1;

    if (meta.telugu && meta.telugu !== product.local_name) {
      updates.push(`local_name = $${index++}`);
      values.push(meta.telugu);
      teluguUpdated += 1;
    }

    const categoryId = categoryByName.get(meta.categoryName);
    if (categoryId && categoryId !== product.category_id) {
      updates.push(`category_id = $${index++}`);
      values.push(categoryId);
      categoryUpdated += 1;
    }

    if (!updates.length) continue;

    values.push(product.id);
    await client.query(
      `update public.products set ${updates.join(', ')}, updated_at = now() where id = $${index}`,
      values,
    );
  }

  console.log(`Telugu names updated: ${teluguUpdated}`);
  console.log(`Categories reassigned: ${categoryUpdated}`);
  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
