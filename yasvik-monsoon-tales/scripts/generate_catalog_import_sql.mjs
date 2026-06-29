/**
 * Generates SQL to import quality_catalog_v2.json via Supabase MCP execute_sql.
 * Run: node scripts/generate_catalog_import_sql.mjs
 */
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

const CATALOG_PATH = new URL('../import-preview/quality_catalog_v2.json', import.meta.url);
const OUT_PATH = new URL('../import-preview/catalog_import_generated.sql', import.meta.url);

const slugify = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const sqlStr = (value) => {
  if (value === null || value === undefined) return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
};

const sqlNum = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : String(fallback);
};

const sqlJson = (value) => `${sqlStr(JSON.stringify(value ?? []))}::jsonb`;

const categoryDescription = (name) =>
  `Thoughtfully chosen ${String(name).toLowerCase()} for better everyday food choices at Yasvik.`;

const raw = await fs.readFile(CATALOG_PATH, 'utf8');
const catalog = JSON.parse(raw);
const products = catalog.products || [];
const categoryNames = [...new Set(products.map((p) => String(p.category_name || '').trim()).filter(Boolean))];

const lines = [
  '-- Generated catalog import',
  'BEGIN;',
];

lines.push(`
ALTER TABLE IF EXISTS public.products
  ADD COLUMN IF NOT EXISTS product_code text,
  ADD COLUMN IF NOT EXISTS local_name text,
  ADD COLUMN IF NOT EXISTS processing_method text,
  ADD COLUMN IF NOT EXISTS best_for text,
  ADD COLUMN IF NOT EXISTS storage_note text,
  ADD COLUMN IF NOT EXISTS yasvik_mark text,
  ADD COLUMN IF NOT EXISTS delivery_card text,
  ADD COLUMN IF NOT EXISTS pack_info_card text,
  ADD COLUMN IF NOT EXISTS sourcing_card text,
  ADD COLUMN IF NOT EXISTS recipe_ids text,
  ADD COLUMN IF NOT EXISTS recipe_titles text,
  ADD COLUMN IF NOT EXISTS recipe_links jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS inventory_group text,
  ADD COLUMN IF NOT EXISTS shared_stock_kg numeric;
`);

const categoryIds = new Map();
categoryNames.forEach((name, index) => {
  const id = randomUUID();
  const slug = slugify(name);
  categoryIds.set(name, id);
  lines.push(`
INSERT INTO public.categories (
  id, name, slug, description, color_hex, color_accent, sort_order,
  is_active, short_intro, emotional_title, created_at, updated_at
) VALUES (
  ${sqlStr(id)}, ${sqlStr(name)}, ${sqlStr(slug)}, ${sqlStr(categoryDescription(name))},
  '#62d75f', '#34c230', ${(index + 1) * 10}, true,
  ${sqlStr(categoryDescription(name))}, ${sqlStr(name)}, now(), now()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  color_hex = EXCLUDED.color_hex,
  color_accent = EXCLUDED.color_accent,
  sort_order = EXCLUDED.sort_order,
  is_active = true,
  short_intro = EXCLUDED.short_intro,
  emotional_title = EXCLUDED.emotional_title,
  updated_at = now();
`);
});

const productSlugs = products.map((p) => slugify(p.slug || p.name));
const categorySlugs = categoryNames.map(slugify);

lines.push(`
UPDATE public.products
SET is_published = false, is_featured = false, featured_in_hero = false, updated_at = now()
WHERE slug IS NULL OR slug <> ALL(ARRAY[${productSlugs.map(sqlStr).join(', ')}]::text[]);

UPDATE public.categories
SET is_active = false, updated_at = now()
WHERE slug IS NULL OR slug <> ALL(ARRAY[${categorySlugs.map(sqlStr).join(', ')}]::text[]);
`);

for (const product of products) {
  const slug = slugify(product.slug || product.name);
  const name = String(product.title || product.name || '').slice(0, 180);
  const categoryId = categoryIds.get(String(product.category_name || '').trim());
  if (!categoryId) continue;

  const categoryIdSubquery = `(SELECT id FROM public.categories WHERE slug = ${sqlStr(slugify(product.category_name))} LIMIT 1)`;

  lines.push(`
INSERT INTO public.products (
  id, product_code, name, slug, local_name, description, short_description,
  sku, category_id, processing_method, best_for, storage_note, yasvik_mark,
  delivery_card, pack_info_card, sourcing_card, recipe_ids, recipe_titles,
  recipe_links, inventory_group, shared_stock_kg, price, currency,
  discount_price, is_published, is_featured, featured_in_hero,
  stock_quantity, featured_image_url, seo_title, seo_description,
  seo_keywords, hover_media, quick_variants, purity_badges,
  created_at, updated_at
) VALUES (
  ${sqlStr(randomUUID())},
  ${sqlStr(product.product_code)},
  ${sqlStr(name)},
  ${sqlStr(slug)},
  ${sqlStr(product.local_name || null)},
  ${sqlStr(product.description || '')},
  ${sqlStr(String(product.short_description || '').slice(0, 500))},
  ${sqlStr(String(product.sku || product.product_code || '').slice(0, 120))},
  ${categoryIdSubquery},
  ${sqlStr(product.processing_method || null)},
  ${sqlStr(product.best_for || null)},
  ${sqlStr(product.storage_note || null)},
  ${sqlStr(product.yasvik_mark || null)},
  ${sqlStr(product.delivery_card || null)},
  ${sqlStr(product.pack_info_card || null)},
  ${sqlStr(product.sourcing_card || null)},
  ${sqlStr(product.recipe_ids || null)},
  ${sqlStr(product.recipe_titles || null)},
  ${sqlJson(product.recipe_links || [])},
  ${sqlStr(product.inventory_group || product.product_code || null)},
  ${sqlNum(product.shared_stock_kg, 0)},
  ${sqlNum(product.price, 0)},
  ${sqlStr(product.currency || 'INR')},
  ${product.compare_price == null ? 'NULL' : sqlNum(product.compare_price)},
  true, false, false,
  ${Math.round(Number(product.stock) || 0)},
  ${sqlStr(product.hero_image || null)},
  ${sqlStr(String(product.seo_title || name).slice(0, 220))},
  ${sqlStr(String(product.seo_description || product.short_description || '').slice(0, 320))},
  ${sqlStr(product.seo_keywords || null)},
  ${sqlJson(product.hover_media || [])},
  ${sqlJson(product.quick_variants || [])},
  ${sqlJson(product.purity_badges || [])},
  now(), now()
)
ON CONFLICT (slug) DO UPDATE SET
  product_code = EXCLUDED.product_code,
  name = EXCLUDED.name,
  local_name = EXCLUDED.local_name,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  sku = EXCLUDED.sku,
  category_id = EXCLUDED.category_id,
  processing_method = EXCLUDED.processing_method,
  best_for = EXCLUDED.best_for,
  storage_note = EXCLUDED.storage_note,
  yasvik_mark = EXCLUDED.yasvik_mark,
  delivery_card = EXCLUDED.delivery_card,
  pack_info_card = EXCLUDED.pack_info_card,
  sourcing_card = EXCLUDED.sourcing_card,
  recipe_ids = EXCLUDED.recipe_ids,
  recipe_titles = EXCLUDED.recipe_titles,
  recipe_links = EXCLUDED.recipe_links,
  inventory_group = EXCLUDED.inventory_group,
  shared_stock_kg = EXCLUDED.shared_stock_kg,
  price = EXCLUDED.price,
  currency = EXCLUDED.currency,
  discount_price = EXCLUDED.discount_price,
  is_published = true,
  is_featured = false,
  featured_in_hero = false,
  stock_quantity = EXCLUDED.stock_quantity,
  featured_image_url = EXCLUDED.featured_image_url,
  seo_title = EXCLUDED.seo_title,
  seo_description = EXCLUDED.seo_description,
  seo_keywords = EXCLUDED.seo_keywords,
  hover_media = EXCLUDED.hover_media,
  quick_variants = EXCLUDED.quick_variants,
  purity_badges = EXCLUDED.purity_badges,
  updated_at = now();
`);
}

lines.push('COMMIT;');

const sql = lines.join('\n');
await fs.writeFile(OUT_PATH, sql, 'utf8');
console.log(`Wrote ${OUT_PATH.pathname}`);
console.log(`Products: ${products.length}, Categories: ${categoryNames.length}, SQL size: ${(sql.length / 1024).toFixed(1)} KB`);
