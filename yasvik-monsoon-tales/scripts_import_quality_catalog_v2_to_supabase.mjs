import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';

const PREVIEW_PATH = new URL('./import-preview/quality_catalog_v2.json', import.meta.url);

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

const BANNED_PUBLIC_TEXT = [
  'Why Yasvik keeps this',
  'Show smaller packs',
  'No organic or farmer-direct claim',
  'unless verified',
  'internal_note',
];

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
const toJson = (value) => JSON.stringify(value ?? []);
const nullIfBlank = (value) => {
  const text = cleanText(value);
  return text || null;
};

const assertNoInternalCopy = (catalog) => {
  const publicProductBlob = JSON.stringify(
    catalog.products.map((product) => ({
      name: product.name,
      short_description: product.short_description,
      description: product.description,
      best_for: product.best_for,
      storage_note: product.storage_note,
      yasvik_mark: product.yasvik_mark,
      delivery_card: product.delivery_card,
      pack_info_card: product.pack_info_card,
      sourcing_card: product.sourcing_card,
      seo_title: product.seo_title,
      seo_description: product.seo_description,
    })),
  );
  const leaked = BANNED_PUBLIC_TEXT.filter((term) => publicProductBlob.toLowerCase().includes(term.toLowerCase()));
  if (leaked.length) {
    throw new Error(`Refusing import. Internal strategy text found in public product fields: ${leaked.join(', ')}`);
  }
};

const loadCatalog = async () => {
  const raw = await fs.readFile(PREVIEW_PATH, 'utf8');
  const catalog = JSON.parse(raw);
  if (!Array.isArray(catalog.products) || catalog.products.length === 0) {
    throw new Error(`No products found in ${PREVIEW_PATH.pathname}`);
  }
  if (!Array.isArray(catalog.recipes)) catalog.recipes = [];
  assertNoInternalCopy(catalog);
  return catalog;
};

const ensureColumns = async () => {
  await client.query(`
    alter table if exists public.products
      add column if not exists product_code text,
      add column if not exists local_name text,
      add column if not exists processing_method text,
      add column if not exists best_for text,
      add column if not exists storage_note text,
      add column if not exists yasvik_mark text,
      add column if not exists delivery_card text,
      add column if not exists pack_info_card text,
      add column if not exists sourcing_card text,
      add column if not exists recipe_ids text,
      add column if not exists recipe_titles text,
      add column if not exists recipe_links jsonb default '[]'::jsonb,
      add column if not exists inventory_group text,
      add column if not exists shared_stock_kg numeric;
  `);

  await client.query(`
    alter table if exists public.recipes
      add column if not exists external_recipe_id text,
      add column if not exists recipe_category text,
      add column if not exists linked_product_slugs jsonb default '[]'::jsonb,
      add column if not exists linked_product_titles jsonb default '[]'::jsonb;
  `);
};

const categoryDescription = (name) =>
  `Thoughtfully chosen ${name.toLowerCase()} for better everyday food choices at Yasvik.`;

const upsertCategory = async (categoryName, sortOrder) => {
  const name = cleanText(categoryName);
  const slug = slugify(name);
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
      randomUUID(),
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
    archivedCategories: archivedCategories.rowCount,
  };
};

const upsertRecipe = async (recipe, sortOrder) => {
  const existing = await client.query(
    `
      select id
      from public.recipes
      where external_recipe_id = $1 or slug = $2
      order by updated_at desc nulls last
      limit 1
    `,
    [recipe.external_recipe_id, recipe.slug],
  );

  const id = existing.rows[0]?.id || randomUUID();
  const ingredients = (recipe.linked_product_titles || []).map((title) => ({ item: title, quantity: 'as needed' }));
  const instructions = [
    'Use this recipe as a serving idea and adjust quantities to your family taste.',
    'Linked Yasvik products are shown so you can quickly add the essentials.',
  ].join('\n');

  const result = await client.query(
    `
      insert into public.recipes (
        id, title, slug, description, ingredients, instructions, external_recipe_id,
        recipe_category, linked_product_slugs, linked_product_titles, is_published,
        is_featured, sort_order, created_at, updated_at
      )
      values (
        $1,$2,$3,$4,$5,$6,$7,
        $8,$9::jsonb,$10::jsonb,true,
        $11,$12,now(),now()
      )
      on conflict (id) do update set
        title = excluded.title,
        slug = excluded.slug,
        description = excluded.description,
        ingredients = excluded.ingredients,
        instructions = excluded.instructions,
        external_recipe_id = excluded.external_recipe_id,
        recipe_category = excluded.recipe_category,
        linked_product_slugs = excluded.linked_product_slugs,
        linked_product_titles = excluded.linked_product_titles,
        is_published = true,
        is_featured = excluded.is_featured,
        sort_order = excluded.sort_order,
        updated_at = now()
      returning id, external_recipe_id, slug, title
    `,
    [
      id,
      truncate(recipe.title, 180),
      truncate(recipe.slug, 180),
      recipe.description,
      toJson(ingredients),
      instructions,
      recipe.external_recipe_id,
      recipe.recipe_category,
      toJson(recipe.linked_product_slugs || []),
      toJson(recipe.linked_product_titles || []),
      sortOrder <= 3,
      sortOrder * 10,
    ],
  );

  return result.rows[0];
};

const upsertProduct = async (product, categoryId) => {
  const slug = slugify(product.slug || product.name);
  const name = truncate(product.title || product.name, 180);
  const shortDescription = truncate(product.short_description, 500);
  const description = cleanText(product.description);
  const quickVariants = Array.isArray(product.quick_variants) ? product.quick_variants : [];
  const purityBadges = Array.isArray(product.purity_badges) ? product.purity_badges : [];
  const hoverMedia = Array.isArray(product.hover_media) ? product.hover_media : [];
  const recipeLinks = Array.isArray(product.recipe_links) ? product.recipe_links : [];

  const result = await client.query(
    `
      insert into public.products (
        id, product_code, name, slug, local_name, description, short_description,
        sku, category_id, processing_method, best_for, storage_note, yasvik_mark,
        delivery_card, pack_info_card, sourcing_card, recipe_ids, recipe_titles,
        recipe_links, inventory_group, shared_stock_kg, price, currency,
        discount_price, is_published, is_featured, featured_in_hero,
        stock_quantity, featured_image_url, seo_title, seo_description,
        seo_keywords, hover_media, quick_variants, purity_badges,
        created_at, updated_at
      )
      values (
        $1,$2,$3,$4,$5,$6,$7,
        $8,$9,$10,$11,$12,$13,
        $14,$15,$16,$17,$18,
        $19::jsonb,$20,$21,$22,$23,
        $24,true,false,false,
        $25,$26,$27,$28,
        $29,$30::jsonb,$31::jsonb,$32::jsonb,
        now(),now()
      )
      on conflict (slug) do update set
        product_code = excluded.product_code,
        name = excluded.name,
        local_name = excluded.local_name,
        description = excluded.description,
        short_description = excluded.short_description,
        sku = excluded.sku,
        category_id = excluded.category_id,
        processing_method = excluded.processing_method,
        best_for = excluded.best_for,
        storage_note = excluded.storage_note,
        yasvik_mark = excluded.yasvik_mark,
        delivery_card = excluded.delivery_card,
        pack_info_card = excluded.pack_info_card,
        sourcing_card = excluded.sourcing_card,
        recipe_ids = excluded.recipe_ids,
        recipe_titles = excluded.recipe_titles,
        recipe_links = excluded.recipe_links,
        inventory_group = excluded.inventory_group,
        shared_stock_kg = excluded.shared_stock_kg,
        price = excluded.price,
        currency = excluded.currency,
        discount_price = excluded.discount_price,
        is_published = true,
        is_featured = false,
        featured_in_hero = false,
        stock_quantity = excluded.stock_quantity,
        featured_image_url = excluded.featured_image_url,
        seo_title = excluded.seo_title,
        seo_description = excluded.seo_description,
        seo_keywords = excluded.seo_keywords,
        hover_media = excluded.hover_media,
        quick_variants = excluded.quick_variants,
        purity_badges = excluded.purity_badges,
        updated_at = now()
      returning id, slug, name
    `,
    [
      randomUUID(),
      product.product_code,
      name,
      slug,
      nullIfBlank(product.local_name),
      description,
      shortDescription,
      truncate(product.sku || product.product_code || `YAS-${slug.toUpperCase()}`, 120),
      categoryId,
      nullIfBlank(product.processing_method),
      nullIfBlank(product.best_for),
      nullIfBlank(product.storage_note),
      nullIfBlank(product.yasvik_mark),
      nullIfBlank(product.delivery_card),
      nullIfBlank(product.pack_info_card),
      nullIfBlank(product.sourcing_card),
      nullIfBlank(product.recipe_ids),
      nullIfBlank(product.recipe_titles),
      toJson(recipeLinks),
      nullIfBlank(product.inventory_group || product.product_code),
      toNumber(product.shared_stock_kg, 0),
      toNumber(product.price, 0),
      product.currency || 'INR',
      product.compare_price == null ? null : toNumber(product.compare_price, null),
      Math.round(toNumber(product.stock, 0)),
      nullIfBlank(product.hero_image),
      truncate(product.seo_title || name, 220),
      truncate(product.seo_description || shortDescription || description, 320),
      cleanText(product.seo_keywords),
      toJson(hoverMedia),
      toJson(quickVariants),
      toJson(purityBadges),
    ],
  );

  const imported = result.rows[0];
  await client.query('delete from public.product_images where product_id = $1', [imported.id]);
  const gallery = [product.hero_image, ...(product.gallery_images || [])].map(nullIfBlank).filter(Boolean);
  for (const [index, imageUrl] of gallery.entries()) {
    await client.query(
      `
        insert into public.product_images (product_id, image_url, sort_order, is_primary)
        values ($1,$2,$3,$4)
      `,
      [imported.id, imageUrl, index, index === 0],
    );
  }

  return imported;
};

const main = async () => {
  const catalog = await loadCatalog();
  const products = catalog.products;
  const recipes = catalog.recipes;
  const productSlugs = products.map((product) => slugify(product.slug || product.name));
  const categoryNames = [...new Set(products.map((product) => cleanText(product.category_name)).filter(Boolean))];
  const categorySlugs = categoryNames.map(slugify);

  await client.connect();
  await client.query('begin');

  try {
    await ensureColumns();

    const categoryByName = new Map();
    for (const [index, categoryName] of categoryNames.entries()) {
      const row = await upsertCategory(categoryName, (index + 1) * 10);
      categoryByName.set(categoryName, row.id);
    }

    const recipeByExternalId = new Map();
    for (const [index, recipe] of recipes.entries()) {
      const row = await upsertRecipe(recipe, index + 1);
      recipeByExternalId.set(row.external_recipe_id, row);
    }

    for (const product of products) {
      product.recipe_links = (product.recipe_links || []).map((link) => {
        const matched = recipeByExternalId.get(link.external_recipe_id);
        return matched ? { ...link, id: matched.id, slug: matched.slug, title: matched.title } : link;
      });
    }

    const archiveStats = await archiveOldCatalog(productSlugs, categorySlugs);
    const imported = [];
    for (const product of products) {
      const categoryId = categoryByName.get(cleanText(product.category_name));
      if (!categoryId) throw new Error(`Missing category for product ${product.slug}`);
      imported.push(await upsertProduct(product, categoryId));
    }

    const badTextCheck = await client.query(
      `
        select count(*)::int as leaked_count
        from public.products
        where is_published = true
          and (
            description ilike any($1::text[])
            or short_description ilike any($1::text[])
            or coalesce(best_for, '') ilike any($1::text[])
            or coalesce(storage_note, '') ilike any($1::text[])
            or coalesce(yasvik_mark, '') ilike any($1::text[])
          )
      `,
      [BANNED_PUBLIC_TEXT.map((term) => `%${term}%`)],
    );

    if (badTextCheck.rows[0]?.leaked_count > 0) {
      throw new Error(`Refusing commit. Found ${badTextCheck.rows[0].leaked_count} public rows containing internal text.`);
    }

    await client.query('commit');

    const counts = await client.query(`
      select
        (select count(*)::int from public.products where is_published = true) as products_published,
        (select count(*)::int from public.categories where is_active = true) as categories_active,
        (select count(*)::int from public.recipes where is_published = true) as recipes_published,
        (select coalesce(sum(jsonb_array_length(coalesce(quick_variants, '[]'::jsonb))), 0)::int from public.products where is_published = true) as variant_rows
    `);

    console.log(
      JSON.stringify(
        {
          importedProducts: imported.length,
          importedRecipes: recipes.length,
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
