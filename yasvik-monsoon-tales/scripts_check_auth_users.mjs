import { Client } from 'pg';
const c=new Client({host:'db.cpksnpuavywbmhrzglyh.supabase.co',port:5432,user:'postgres',password:process.env.SUPABASE_DB_PASSWORD,database:'postgres',ssl:{rejectUnauthorized:false}});
await c.connect();
const {rows}=await c.query("select email, created_at from auth.users order by created_at desc limit 20");
console.log(rows);
await c.end();
