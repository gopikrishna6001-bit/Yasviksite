import { Client } from 'pg';

const c = new Client({
  host: 'db.cpksnpuavywbmhrzglyh.supabase.co',
  port: 5432,
  user: 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
});

const email = 'gopikrishna6001@gmail.com';

await c.connect();

const ures = await c.query(
  `SELECT id, email, raw_user_meta_data
   FROM auth.users
   WHERE lower(email)=lower($1)
   LIMIT 1`,
  [email]
);

if (ures.rows.length === 0) {
  console.log('NOT_FOUND_IN_AUTH_USERS');
  await c.end();
  process.exit(0);
}

const u = ures.rows[0];
const displayName = u.raw_user_meta_data?.full_name || u.raw_user_meta_data?.name || u.email.split('@')[0];

await c.query(
  `INSERT INTO public.user_profiles (id, email, display_name, role, is_active, email_verified)
   VALUES ($1,$2,$3,'admin',true,true)
   ON CONFLICT (id)
   DO UPDATE SET
     email = EXCLUDED.email,
     role = 'admin',
     is_active = true,
     display_name = COALESCE(public.user_profiles.display_name, EXCLUDED.display_name)`,
  [u.id, u.email, displayName]
);

const check = await c.query(`SELECT id, email, role, is_active FROM public.user_profiles WHERE id=$1`, [u.id]);
console.log(JSON.stringify(check.rows[0] || {}, null, 2));
await c.end();
