import fs from 'fs';
import { Client } from 'pg';

const password = process.env.SUPABASE_DB_PASSWORD;
const host = process.env.SUPABASE_DB_HOST || 'db.cpksnpuavywbmhrzglyh.supabase.co';
const user = process.env.SUPABASE_DB_USER || 'postgres';
const database = process.env.SUPABASE_DB_NAME || 'postgres';
const port = Number(process.env.SUPABASE_DB_PORT || 5432);

if (!password) {
  throw new Error('SUPABASE_DB_PASSWORD env var is required');
}

const client = new Client({
  host,
  port,
  user,
  password,
  database,
  ssl: { rejectUnauthorized: false },
});

const files = [
  '../supabase/migrations/001_schema.sql',
  '../supabase/migrations/002_rls_policies.sql',
  '../supabase/migrations/003_storage_buckets.sql',
];

try {
  await client.connect();
  console.log(`Connected to ${host}:${port}/${database}`);
  for (const file of files) {
    const sql = fs.readFileSync(new URL(file, import.meta.url), 'utf8');
    console.log(`Running ${file} ...`);
    await client.query(sql);
    console.log(`Done ${file}`);
  }
  console.log('All migrations executed successfully.');
} finally {
  await client.end();
}
