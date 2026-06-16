import { Client } from 'pg';

const themeKey = process.env.YASVIK_THEME_KEY || 'primepack-lime';
const password = process.env.SUPABASE_DB_PASSWORD;

if (!password) {
  throw new Error('SUPABASE_DB_PASSWORD is required');
}

const client = new Client({
  host: 'db.cpksnpuavywbmhrzglyh.supabase.co',
  user: 'postgres',
  password,
  database: 'postgres',
  port: 5432,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

await client.query(`
  WITH updated AS (
    UPDATE public.app_settings
    SET
      setting_value = $1,
      data_type = 'string',
      description = 'Active centralized storefront theme preset.',
      updated_at = now()
    WHERE setting_key = 'theme_active_preset'
    RETURNING id
  )
  INSERT INTO public.app_settings (setting_key, setting_value, data_type, description)
  SELECT 'theme_active_preset', $1, 'string', 'Active centralized storefront theme preset.'
  WHERE NOT EXISTS (SELECT 1 FROM updated);
`, [themeKey]);

const { rows } = await client.query(
  `SELECT setting_key, setting_value, data_type, updated_at
   FROM public.app_settings
   WHERE setting_key = 'theme_active_preset'
   ORDER BY updated_at DESC NULLS LAST
   LIMIT 1;`
);

await client.end();

console.log(JSON.stringify(rows[0] || null, null, 2));
