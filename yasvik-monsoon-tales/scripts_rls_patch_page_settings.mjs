import { Client } from 'pg';
const c=new Client({host:'db.cpksnpuavywbmhrzglyh.supabase.co',port:5432,user:'postgres',password:process.env.SUPABASE_DB_PASSWORD,database:'postgres',ssl:{rejectUnauthorized:false}});
await c.connect();
await c.query(`
ALTER TABLE page_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS public_read_page_settings ON page_settings;
DROP POLICY IF EXISTS auth_manage_page_settings ON page_settings;
CREATE POLICY public_read_page_settings ON page_settings FOR SELECT USING (true);
CREATE POLICY auth_manage_page_settings ON page_settings FOR ALL USING (auth.role()='authenticated') WITH CHECK (auth.role()='authenticated');
`);
await c.end();
console.log('RLS patched for page_settings');
