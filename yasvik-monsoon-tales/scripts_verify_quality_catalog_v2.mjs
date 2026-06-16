import { Client } from 'pg';

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

const terms = [
  '%Why Yasvik keeps this%',
  '%Show smaller packs%',
  '%No organic or farmer-direct claim%',
  '%unless verified%',
  '%internal_note%',
];

await client.connect();
const counts = await client.query(`
  select
    (select count(*)::int from public.products where is_published = true) as products_published,
    (select count(*)::int from public.categories where is_active = true) as categories_active,
    (select count(*)::int from public.recipes where is_published = true) as recipes_published,
    (select coalesce(sum(jsonb_array_length(coalesce(quick_variants, '[]'::jsonb))), 0)::int from public.products where is_published = true) as variant_rows,
    (select count(*)::int from public.products where is_published = true and coalesce(recipe_links, '[]'::jsonb) <> '[]'::jsonb) as products_with_recipe_links
`);

const leakage = await client.query(
  `
    select count(*)::int as leaked_count
    from public.products
    where is_published = true
      and (
        coalesce(description, '') ilike any($1::text[])
        or coalesce(short_description, '') ilike any($1::text[])
        or coalesce(best_for, '') ilike any($1::text[])
        or coalesce(storage_note, '') ilike any($1::text[])
        or coalesce(yasvik_mark, '') ilike any($1::text[])
      )
  `,
  [terms],
);

const sample = await client.query(`
  select
    name,
    slug,
    short_description,
    left(description, 260) as description_preview,
    best_for,
    storage_note,
    yasvik_mark,
    jsonb_array_length(coalesce(quick_variants, '[]'::jsonb)) as variant_count,
    jsonb_array_length(coalesce(recipe_links, '[]'::jsonb)) as recipe_link_count
  from public.products
  where slug = 'whole-wheat'
  limit 1
`);

console.log(JSON.stringify({
  counts: counts.rows[0],
  activePublicLeakage: leakage.rows[0],
  sample: sample.rows[0] || null,
}, null, 2));
await client.end();
