/**
 * Backfill seo_title, seo_description and seo_keywords for products missing explicit SEO fields.
 *
 * Run:
 *   npm run catalog:backfill-product-seo
 */
import fs from 'node:fs';
import path from 'node:path';
import { buildProductSeoMeta } from '../lib/productSeoCore.mjs';

const rootDir = process.cwd();

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

function getEnv(key, fallback = '') {
  if (process.env[key]) return process.env[key];
  const local = readEnvFile(path.join(rootDir, '.env.local'));
  if (local[key]) return local[key];
  const prod = readEnvFile(path.join(rootDir, '.env.production'));
  if (prod[key]) return prod[key];
  return fallback;
}

async function fetchPublishedProducts(supabaseUrl, key) {
  const rows = [];
  const pageSize = 200;
  let offset = 0;

  while (true) {
    const params = new URLSearchParams();
    params.set('select', 'id,name,slug,seo_title,seo_description,seo_keywords,short_description,description,featured_image_url,stock_quantity,price,category_id,is_published');
    params.set('limit', String(pageSize));
    params.set('offset', String(offset));
    params.set('order', 'name.asc');
    const res = await fetch(`${supabaseUrl}/rest/v1/products?${params}`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });
    if (!res.ok) throw new Error(`Fetch products failed: ${res.status}`);
    const batch = await res.json();
    rows.push(...batch);
    if (batch.length < pageSize) break;
    offset += pageSize;
  }

  return rows;
}

async function fetchCategories(supabaseUrl, key) {
  const res = await fetch(`${supabaseUrl}/rest/v1/categories?select=id,name,emotional_title&limit=200`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });
  if (!res.ok) return new Map();
  const rows = await res.json();
  return new Map(rows.map((row) => [row.id, row.emotional_title || row.name || '']));
}

async function updateProduct(supabaseUrl, key, id, patch) {
  const res = await fetch(`${supabaseUrl}/rest/v1/products?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Update ${id} failed: ${res.status} ${text}`);
  }
}

async function main() {
  const force = process.argv.includes('--force');
  const supabaseUrl = String(getEnv('VITE_SUPABASE_URL', getEnv('SUPABASE_URL'))).replace(/\/$/, '');
  const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    console.error('Missing VITE_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const [products, categoryById] = await Promise.all([
    fetchPublishedProducts(supabaseUrl, serviceKey),
    fetchCategories(supabaseUrl, serviceKey),
  ]);

  let updated = 0;
  let skipped = 0;

  for (const product of products) {
    const mapped = {
      ...product,
      title: product.name,
      hero_image: product.featured_image_url,
      category_name: categoryById.get(product.category_id) || '',
    };
    const seo = buildProductSeoMeta(mapped);
    const patch = {};
    if (force || !String(product.seo_title || '').trim()) patch.seo_title = seo.title;
    if (force || !String(product.seo_description || '').trim()) patch.seo_description = seo.description;
    if (force || !String(product.seo_keywords || '').trim()) patch.seo_keywords = seo.keywords;

    if (!Object.keys(patch).length) {
      skipped += 1;
      continue;
    }

    await updateProduct(supabaseUrl, serviceKey, product.id, patch);
    updated += 1;
    console.log(`[seo-backfill] ${product.name}`);
  }

  console.log(`[seo-backfill] done — updated ${updated}, skipped ${skipped}, total ${products.length}${force ? ' (force mode)' : ''}`);
}

main().catch((error) => {
  console.error('[seo-backfill] failed', error);
  process.exit(1);
});
