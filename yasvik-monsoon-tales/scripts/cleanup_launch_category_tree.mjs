/**
 * Retag products onto launch categories and remove empty legacy category rows.
 *
 * Run:
 *   SUPABASE_DB_PASSWORD=… npm run catalog:cleanup-launch-tree
 *
 * Optional dry run:
 *   SUPABASE_DB_PASSWORD=… npm run catalog:cleanup-launch-tree -- --dry-run
 */
import { Client } from 'pg';
import {
  isLegacyCategory,
  planLegacyCategoryDeletes,
  resolveLaunchCategoryId,
} from '../src/lib/adminCategoryCleanup.js';
import { normalizeCategorySlug } from '../src/lib/storefrontCategories.js';

const client = new Client({
  host: process.env.SUPABASE_DB_HOST || 'db.cpksnpuavywbmhrzglyh.supabase.co',
  user: 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD,
  database: 'postgres',
  port: 5432,
  ssl: { rejectUnauthorized: false },
});

const dryRun = process.argv.includes('--dry-run');

async function loadCategories() {
  const { rows } = await client.query(`
    select id, name, slug, parent_id, is_active, sort_order, emotional_title
    from public.categories
    order by sort_order, name
  `);
  return rows;
}

async function loadProducts() {
  const { rows } = await client.query(`
    select id, name, sku, category_id
    from public.products
    where category_id is not null
  `);
  return rows;
}

async function main() {
  if (!process.env.SUPABASE_DB_PASSWORD) {
    console.error('Missing SUPABASE_DB_PASSWORD');
    process.exit(1);
  }

  await client.connect();
  const categories = await loadCategories();
  const products = await loadProducts();

  let retagged = 0;
  let skipped = 0;

  for (const product of products) {
    const current = categories.find((cat) => cat.id === product.category_id);
    if (!current || !isLegacyCategory(current, categories)) continue;

    const nextId = resolveLaunchCategoryId(product.category_id, categories);
    if (!nextId || nextId === product.category_id) {
      skipped += 1;
      console.warn(`  skip retag: ${product.name || product.sku} (${current.slug})`);
      continue;
    }

    const target = categories.find((cat) => cat.id === nextId);
    if (dryRun) {
      console.log(`  retag ${product.name || product.sku}: ${current.slug} → ${target?.slug || nextId}`);
    } else {
      await client.query(
        'update public.products set category_id = $1, updated_at = now() where id = $2',
        [nextId, product.id],
      );
    }
    retagged += 1;
  }

  const freshProducts = dryRun ? products : await loadProducts();
  const productCounts = new Map();
  freshProducts.forEach((product) => {
    if (!product.category_id) return;
    productCounts.set(product.category_id, (productCounts.get(product.category_id) || 0) + 1);
  });

  const { deletable, blocked } = planLegacyCategoryDeletes(categories, productCounts);

  if (blocked.length) {
    console.log('\nLegacy categories still linked to products:');
    blocked
      .sort((a, b) => b.productCount - a.productCount)
      .forEach(({ category, productCount }) => {
        console.log(`  ${category.name} (${normalizeCategorySlug(category.slug)}): ${productCount}`);
      });
  }

  if (deletable.length) {
    console.log(`\n${dryRun ? 'Would delete' : 'Deleting'} ${deletable.length} empty legacy categories:`);
    for (const cat of deletable) {
      console.log(`  - ${cat.name} (${normalizeCategorySlug(cat.slug)})`);
      if (!dryRun) {
        await client.query('delete from public.categories where id = $1', [cat.id]);
      }
    }
  } else {
    console.log('\nNo empty legacy categories to delete.');
  }

  if (!dryRun) {
    await client.query(`
      update public.categories
      set is_active = false, updated_at = now()
      where parent_id is null
        and is_active = true
        and lower(replace(slug, '_', '-')) not in (
    'organic', 'millets', 'millet-flours', 'millet-mixes', 'heritage-rice',
    'cold-pressed-oils', 'ghee', 'honey', 'jaggery', 'pickles', 'spices', 'snacks',
    'dry-fruits', 'pooja', 'natural-care'
        )
    `);
  }

  console.log(`\nRetagged products: ${retagged}`);
  console.log(`Skipped (no launch target): ${skipped}`);
  console.log(dryRun ? '\nDry run only — no database changes made.' : '\nCleanup complete.');

  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
