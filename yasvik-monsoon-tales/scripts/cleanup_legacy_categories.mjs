/**
 * Keep only the 10 workbook catalog categories; reassign stragglers, delete legacy rows.
 *
 * Run:
 *   SUPABASE_DB_PASSWORD=… npm run catalog:cleanup-categories
 */
import { Client } from 'pg';
import { CATALOG_CATEGORIES, CATALOG_CATEGORY_SLUGS } from '../src/lib/catalogCategories.js';

const client = new Client({
  host: process.env.SUPABASE_DB_HOST || 'db.cpksnpuavywbmhrzglyh.supabase.co',
  user: 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD,
  database: 'postgres',
  port: 5432,
  ssl: { rejectUnauthorized: false },
});

const MANUAL_REASSIGNMENTS = {
  'YAS-FLAXSEED-AUL9I': 'dry-fruits-nuts-and-seeds',
  'YAS-079': 'jaggery-and-sweeteners',
};

async function ensureCatalogCategories() {
  for (const category of CATALOG_CATEGORIES) {
    await client.query(
      `
        insert into public.categories (name, slug, emotional_title, is_active, sort_order)
        select $1, $2, $1, true, $3
        where not exists (
          select 1 from public.categories where lower(slug) = lower($2)
        )
      `,
      [category.name, category.slug, category.sort_order],
    );

    await client.query(
      `
        update public.categories
        set name = $2,
            emotional_title = $2,
            is_active = true,
            sort_order = $3,
            updated_at = now()
        where lower(slug) = lower($1)
      `,
      [category.slug, category.name, category.sort_order],
    );
  }
}

async function main() {
  if (!process.env.SUPABASE_DB_PASSWORD) {
    console.error('Missing SUPABASE_DB_PASSWORD');
    process.exit(1);
  }

  await client.connect();
  await ensureCatalogCategories();

  const { rows: categoryRows } = await client.query(
    'select id, slug from public.categories where lower(slug) = any($1::text[])',
    [CATALOG_CATEGORY_SLUGS],
  );
  const categoryIdBySlug = new Map(categoryRows.map((row) => [row.slug, row.id]));

  for (const [sku, slug] of Object.entries(MANUAL_REASSIGNMENTS)) {
    const categoryId = categoryIdBySlug.get(slug);
    if (!categoryId) continue;
    const { rowCount } = await client.query(
      'update public.products set category_id = $1, updated_at = now() where sku = $2',
      [categoryId, sku],
    );
    if (rowCount) console.log(`Reassigned ${sku} → ${slug}`);
  }

  const { rows: legacyCategories } = await client.query(
    `
      select c.id, c.name, c.slug, count(p.id)::int as product_count
      from public.categories c
      left join public.products p on p.category_id = c.id
      where lower(c.slug) <> all($1::text[])
      group by c.id, c.name, c.slug
      order by c.name
    `,
    [CATALOG_CATEGORY_SLUGS],
  );

  const blocked = legacyCategories.filter((row) => row.product_count > 0);
  if (blocked.length) {
    console.error('Cannot delete legacy categories still linked to products:');
    blocked.forEach((row) => console.error(`  ${row.name} (${row.product_count})`));
    process.exit(1);
  }

  if (legacyCategories.length) {
    await client.query(
      `
        delete from public.categories
        where lower(slug) <> all($1::text[])
      `,
      [CATALOG_CATEGORY_SLUGS],
    );
    console.log(`Deleted ${legacyCategories.length} legacy categories.`);
    legacyCategories.forEach((row) => console.log(`  - ${row.name}`));
  } else {
    console.log('No legacy categories to delete.');
  }

  const { rows: summary } = await client.query(
    `
      select c.name, count(p.id)::int as products
      from public.categories c
      left join public.products p on p.category_id = c.id
      group by c.id, c.name, c.sort_order
      order by c.sort_order
    `,
  );

  console.log('\nCatalog categories:');
  summary.forEach((row) => console.log(`  ${row.name}: ${row.products}`));

  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
