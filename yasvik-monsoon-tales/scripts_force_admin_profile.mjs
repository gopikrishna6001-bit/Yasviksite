import { Client } from 'pg';

const c = new Client({
  host: 'db.cpksnpuavywbmhrzglyh.supabase.co',
  port: 5432,
  user: 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
});

const email = (process.env.ADMIN_EMAIL || 'gopikrishna6001@gmail.com').toLowerCase();

await c.connect();

const authUser = await c.query(
  `SELECT id, email, raw_user_meta_data
   FROM auth.users
   WHERE lower(email)= $1
   LIMIT 1`,
  [email]
);

if (authUser.rows.length === 0) {
  console.log(`No auth.users row yet for ${email}. Log in once, then rerun this script.`);
  await c.end();
  process.exit(0);
}

const u = authUser.rows[0];
const displayName = u.raw_user_meta_data?.full_name || u.raw_user_meta_data?.name || u.email.split('@')[0];

await c.query(
  `INSERT INTO public.user_profiles (id, email, display_name, role, is_active, email_verified)
   VALUES ($1, $2, $3, 'admin', true, true)
   ON CONFLICT (id)
   DO UPDATE SET
     email = EXCLUDED.email,
     display_name = COALESCE(public.user_profiles.display_name, EXCLUDED.display_name),
     role = 'admin',
     is_active = true`,
  [u.id, u.email, displayName]
);

const check = await c.query(`SELECT id, email, role, is_active FROM public.user_profiles WHERE id = $1`, [u.id]);
console.log('Admin profile ready:', check.rows[0]);

await c.end();
