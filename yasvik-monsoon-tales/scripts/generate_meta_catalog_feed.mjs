import fs from 'node:fs';
import path from 'node:path';
import { buildMetaCatalogCsv } from '../lib/metaCatalogFeedCore.mjs';

const rootDir = process.cwd();
const outputDir = path.join(rootDir, 'public', 'catalog');
const outputPath = path.join(outputDir, 'meta-feed.csv');
const canonicalOrigin = 'https://www.yasvik.com';
const mediaBase = 'https://media.yasvik.com';

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, 'utf8');
  const out = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
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

async function fetchRows({ supabaseUrl, anonKey, table, select, filter = '', limit = 1000 }) {
  const query = new URLSearchParams();
  query.set('select', select);
  query.set('limit', String(limit));
  if (filter) query.set(...filter.split('='));
  const url = `${supabaseUrl}/rest/v1/${table}?${query.toString()}`;
  const res = await fetch(url, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Failed ${table}: ${res.status}`);
  }
  return res.json();
}

async function fetchPublishedProducts() {
  const supabaseUrl = getEnv('VITE_SUPABASE_URL') || getEnv('SUPABASE_URL') || 'https://cpksnpuavywbmhrzglyh.supabase.co';
  const anonKey = getEnv('VITE_SUPABASE_ANON_KEY');
  if (!anonKey) {
    console.warn('[meta-catalog] Supabase anon key missing; skipping static feed generation.');
    return [];
  }

  const products = await fetchRows({
    supabaseUrl,
    anonKey,
    table: 'products',
    select: 'id,product_code,name,slug,sku,local_name,description,short_description,price,discount_price,currency,stock_quantity,is_published,featured_image_url,quick_variants,seo_title,seo_description',
    filter: 'is_published=eq.true',
    limit: 1000,
  });

  if (!Array.isArray(products) || products.length === 0) return [];

  const productIds = products.map((row) => row.id).filter(Boolean);
  const imageRows = await fetchRows({
    supabaseUrl,
    anonKey,
    table: 'product_images',
    select: 'product_id,image_url,sort_order,is_primary',
    filter: `product_id=in.(${productIds.map((id) => encodeURIComponent(id)).join(',')})`,
    limit: 5000,
  }).catch(() => []);

  const imagesByProduct = new Map();
  (imageRows || []).forEach((row) => {
    const list = imagesByProduct.get(row.product_id) || [];
    list.push(row);
    imagesByProduct.set(row.product_id, list);
  });

  return products.map((product) => {
    const imageList = imagesByProduct.get(product.id) || [];
    const primary = imageList.find((img) => img.is_primary) || imageList[0];
    const gallery = imageList.map((img) => img.image_url).filter(Boolean);
    return {
      ...product,
      featured_image_url: primary?.image_url || product.featured_image_url || '',
      images: gallery,
      hero_image: primary?.image_url || product.featured_image_url || gallery[0] || '',
    };
  });
}

async function main() {
  const products = await fetchPublishedProducts();
  const csv = buildMetaCatalogCsv(products, {
    siteOrigin: canonicalOrigin,
    mediaBase,
  });

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, csv, 'utf8');
  const rowCount = Math.max(0, csv.split('\n').length - 2);
  console.log(`[meta-catalog] wrote ${rowCount} catalog items to ${outputPath}`);
}

main().catch((error) => {
  console.error('[meta-catalog] failed', error);
  process.exit(1);
});
