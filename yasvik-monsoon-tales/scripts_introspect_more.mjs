import { Client } from 'pg';
const c=new Client({host:'db.cpksnpuavywbmhrzglyh.supabase.co',port:5432,user:'postgres',password:process.env.SUPABASE_DB_PASSWORD,database:'postgres',ssl:{rejectUnauthorized:false}});
await c.connect();
const tables=['page_settings','addresses','user_subscriptions','subscriptions','orders','media_assets','stories','journeys'];
for (const t of tables){
 const {rows}=await c.query(`select column_name from information_schema.columns where table_schema='public' and table_name=$1 order by ordinal_position`,[t]);
 console.log('\n'+t+': '+rows.map(r=>r.column_name).join(', '));
}
await c.end();
