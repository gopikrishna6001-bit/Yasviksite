/**
 * Pre-build check for Cloudflare Pages / CI.
 * Ensures VITE_SUPABASE_* are available so sitemap includes the full catalog.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function resolve(key) {
  if (process.env[key]) return process.env[key];
  const local = readEnvFile(path.join(root, '.env.local'));
  if (local[key]) return local[key];
  const prod = readEnvFile(path.join(root, '.env.production'));
  if (prod[key]) return prod[key];
  return '';
}

const url = resolve('VITE_SUPABASE_URL') || resolve('SUPABASE_URL');
const anon = resolve('VITE_SUPABASE_ANON_KEY');
const isCi = Boolean(process.env.CF_PAGES || process.env.CI);

if (!url || !anon) {
  const msg = [
    '[build-env] Missing VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY.',
    'Cloudflare Pages → Settings → Environment variables → Production:',
    '  VITE_SUPABASE_URL=https://cpksnpuavywbmhrzglyh.supabase.co',
    '  VITE_SUPABASE_ANON_KEY=<your-anon-key>',
    'Optional: VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX',
  ].join('\n');
  if (isCi) {
    console.error(msg);
    process.exit(1);
  }
  console.warn(`${msg}\n[build-env] Local build will continue using .env.local if present.`);
} else {
  console.log('[build-env] Supabase build env OK for sitemap generation.');
}
