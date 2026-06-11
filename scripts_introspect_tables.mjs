import { Client } from 'pg';
const client = new Client({host:'db.cpksnpuavywbmhrzglyh.supabase.co',port:5432,user:'postgres',password:process.env.SUPABASE_DB_PASSWORD,database:'postgres',ssl:{rejectUnauthorized:false}});
await client.connect();
const tables=['app_settings','homepage_sections','page_heroes','products','categories'];
for (const t of tables){
  const {rows}=await client.query(`select column_name,data_type from information_schema.columns where table_schema='public' and table_name=$1 order by ordinal_position`,[t]);
  console.log(`\n[${t}]`);
  rows.forEach(r=>console.log(`${r.column_name} :: ${r.data_type}`));
}
await client.end();
