import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';

const PREVIEW_PATH = new URL('./import-preview/products_import_preview.json', import.meta.url);

const dbPassword = process.env.SUPABASE_DB_PASSWORD;

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

const slugify = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const cleanText = (value, fallback = '') => String(value || fallback || '').trim();
const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const truncate = (value, max) => cleanText(value).slice(0, max);

const categoryDescription = (name) =>
  `Thoughtfully chosen ${name.toLowerCase()} for better everyday food choices at Yasvik.`;

const loadProducts = async () => {
  const raw = await fs.readFile(PREVIEW_PATH, 'utf8');
  const products = JSON.parse(raw);
  if (!Array.isArray(products) || products.length === 0) {
    throw new Error(`No products found in ${PREVIEW_PATH.pathname}`);
  }
  return products;
};

const upsertCategory = async (categoryName, sortOrder) => {
  const name = cleanText(categoryName);
  const slug = slugify(name);
  const id = randomUUID();
  const result = await client.query(
    `
      insert into public.categories (
        id, name, slug, description, color_hex, color_accent, sort_order,
        is_active, short_intro, emotional_title, created_at, updated_at
      )
      values ($1,$2,$3,$4,$5,$6,$7,true,$8,$9,now(),now())
      on conflict (slug) do update set
        name = excluded.name,
        description = excluded.description,
        color_hex = excluded.color_hex,
        color_accent = excluded.color_accent,
        sort_order = excluded.sort_order,
        is_active = true,
        short_intro = excluded.short_intro,
        emotional_title = excluded.emotional_title,
        updated_at = now()
      returning id, slug, name
    `,
    [
      id,
      name,
      slug,
      categoryDescription(name),
      '#62d75f',
      '#34c230',
      sortOrder,
      categoryDescription(name),
      name,
    ],
  );
  return result.rows[0];
};

const archiveOldCatalog = async (productSlugs, categorySlugs) => {
  const archivedProducts = await client.query(
    `
      update public.products
      set
        is_published = false,
        is_featured = false,
        featured_in_hero = false,
        updated_at = now()
      where slug is null or slug <> all($1::text[])
    `,
    [productSlugs],
  );

  // Product SKU is globally unique. Prefix archived SKUs so the new workbook can own clean SKU values.
  const archivedSkus = await client.query(
    `
      update public.products
      set
        sku = concat('archived-', id::text, '-', sku),
        updated_at = now()
      where (slug is null or slug <> all($1::text[]))
        and sku is not null
        and sku not like 'archived-%'
    `,
    [productSlugs],
  );

  const archivedCategories = await client.query(
    `
      update public.categories
      set is_active = false, updated_at = now()
      where slug is null or slug <> all($1::text[])
    `,
    [categorySlugs],
  );

  return {
    archivedProducts: archivedProducts.rowCount,
    archivedSkus: archivedSkus.rowCount,
    archivedCategories: archivedCategories.rowCount,
  };
};

const upsertProduct = async (product, categoryId) => {
  const id = randomUUID();
  const slug = slugify(product.slug || product.name);
  const name = truncate(product.title || product.name, 180);
  const shortDescription = truncate(product.short_description || product.description, 500);
  const description = cleanText(product.description || product.short_description);
  const websiteCopy = product.website_copy || {};
  const quickVariants = Array.isArray(product.quick_variants) ? product.quick_variants : [];
  const purityBadges = Array.isArray(product.purity_badges) ? product.purity_badges : [];

  const result = await client.query(
    `
      insert into public.products (
        id, name, slug, description, short_description, sku, category_id,
        price, currency, discount_price, is_published, is_featured,
        featured_in_hero, stock_quantity, featured_image_url, seo_title,
        seo_description, seo_keywords, quick_variants, purity_badges,
        created_at, updated_at
      )
      values (
        $1,$2,$3,$4,$5,$6,$7,
        $8,$9,$10,$11,$12,
        false,$13,$14,$15,
        $16,$17,$18::jsonb,$19::jsonb,
        now(),now()
      )
      on conflict (slug) do update set
        name = excluded.name,
        description = excluded.description,
        short_description = excluded.short_description,
        sku = excluded.sku,
        category_id = excluded.category_id,
        price = excluded.price,
        currency = excluded.currency,
        discount_price = excluded.discount_price,
        is_published = excluded.is_published,
        is_featured = excluded.is_featured,
        featured_in_hero = false,
        stock_quantity = excluded.stock_quantity,
        featured_image_url = coalesce(nullif(public.products.featured_image_url, ''), excluded.featured_image_url),
        seo_title = excluded.seo_title,
        seo_description = excluded.seo_description,
        seo_keywords = excluded.seo_keywords,
        quick_variants = excluded.quick_variants,
        purity_badges = excluded.purity_badges,
        updated_at = now()
      returning id, slug, name
    `,
    [
      id,
      name,
      slug,
      description,
      shortDescription,
      truncate(product.sku || `YAS-${slug.toUpperCase()}`, 120),
      categoryId,
      toNumber(product.price, 0),
      product.currency || 'INR',
      product.compare_price == null ? null : toNumber(product.compare_price, null),
      product.is_published !== false,
      Boolean(product.is_featured),
      Math.round(toNumber(product.stock, 0)),
      null,
      truncate(websiteCopy.meta_title || product.seo_title || name, 220),
      truncate(websiteCopy.meta_description || product.seo_description || shortDescription, 320),
      cleanText(product.seo_keywords),
      JSON.stringify(quickVariants),
      JSON.stringify(purityBadges),
    ],
  );

  return result.rows[0];
};

const main = async () => {
  const products = await loadProducts();
  const productSlugs = products.map((product) => slugify(product.slug || product.name));
  const categoryNames = [...new Set(products.map((product) => cleanText(product.category_name)).filter(Boolean))];
  const categorySlugs = categoryNames.map(slugify);

  await client.connect();
  await client.query('begin');

  try {
    const categoryByName = new Map();
    for (const [index, categoryName] of categoryNames.entries()) {
      const row = await upsertCategory(categoryName, (index + 1) * 10);
      categoryByName.set(categoryName, row.id);
    }

    const archiveStats = await archiveOldCatalog(productSlugs, categorySlugs);

    const imported = [];
    for (const product of products) {
      const categoryId = categoryByName.get(cleanText(product.category_name));
      if (!categoryId) {
        throw new Error(`Missing category for product ${product.slug}`);
      }
      imported.push(await upsertProduct(product, categoryId));
    }

    await client.query('commit');

    const counts = await client.query(`
      select
        (select count(*)::int from public.products) as products_total,
        (select count(*)::int from public.products where is_published = true) as products_published,
        (select count(*)::int from public.categories) as categories_total,
        (select count(*)::int from public.categories where is_active = true) as categories_active
    `);

    console.log(
      JSON.stringify(
        {
          importedProducts: imported.length,
          activeCategories: categoryNames.length,
          archiveStats,
          counts: counts.rows[0],
          sampleProducts: imported.slice(0, 5),
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    await client.end();
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
