import { Client } from 'pg';

const client = new Client({
  host: 'db.cpksnpuavywbmhrzglyh.supabase.co',
  port: 5432,
  user: 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
});

const adminEmail = (process.env.ADMIN_EMAIL || 'gopikrishna6001@gmail.com').toLowerCase();

const sql = `
-- Ensure role column exists
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'customer';

-- Upsert profile row for admin email from auth.users if missing
INSERT INTO public.user_profiles (id, email, display_name, role, is_active, email_verified)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)),
  'admin',
  true,
  COALESCE(au.email_confirmed_at IS NOT NULL, false)
FROM auth.users au
WHERE lower(au.email) = lower('${adminEmail}')
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  role = 'admin',
  is_active = true,
  display_name = COALESCE(public.user_profiles.display_name, EXCLUDED.display_name),
  email_verified = COALESCE(public.user_profiles.email_verified, EXCLUDED.email_verified);

-- Safety: role sync by email
UPDATE public.user_profiles
SET role = 'admin', is_active = true
WHERE lower(email) = lower('${adminEmail}');

-- More robust admin check:
-- 1) profile role admin/staff OR
-- 2) auth.users email equals configured admin email
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('admin','staff')
        AND up.is_active = true
    )
    OR EXISTS (
      SELECT 1
      FROM auth.users au
      WHERE au.id = auth.uid()
        AND lower(au.email) = lower('${adminEmail}')
    );
$$;
`;

await client.connect();
await client.query(sql);
const { rows } = await client.query(`
  SELECT up.id, up.email, up.role, up.is_active
  FROM public.user_profiles up
  WHERE lower(up.email) = lower($1)
  LIMIT 5
`, [adminEmail]);
await client.end();

console.log('Admin RLS access fix applied. Matching profiles:', rows);

