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
const result = await client.query(
  `
    select
      id,
      slug,
      name,
      is_published,
      left(coalesce(description, ''), 220) as description,
      left(coalesce(short_description, ''), 220) as short_description
    from public.products
    where coalesce(description, '') ilike any($1::text[])
      or coalesce(short_description, '') ilike any($1::text[])
    order by is_published desc, updated_at desc
    limit 50
  `,
  [terms],
);
console.log(JSON.stringify(result.rows, null, 2));
await client.end();
