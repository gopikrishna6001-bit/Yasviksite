#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildLlmPriceCatalog,
  buildLlmPriceCsv,
  buildLlmPriceMarkdown,
} from '../lib/llmPriceFeedCore.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outputDir = path.join(rootDir, 'public', 'catalog');

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
  for (const file of ['.env.local', '.env.production', '.env']) {
    const value = readEnvFile(path.join(rootDir, file))[key];
    if (value) return value;
  }
  return fallback;
}

async function fetchProducts(supabaseUrl, anonKey) {
  const select = [
    'id',
    'product_code',
    'name',
    'slug',
    'sku',
    'price',
    'discount_price',
    'currency',
    'stock_quantity',
    'is_published',
    'quick_variants',
  ].join(',');
  const url = `${supabaseUrl}/rest/v1/products?select=${select}&is_published=eq.true&order=name.asc&limit=1000`;
  const res = await fetch(url, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch products: ${res.status}`);
  }
  return res.json();
}

async function main() {
  const supabaseUrl = getEnv('VITE_SUPABASE_URL', getEnv('SUPABASE_URL'));
  const anonKey = getEnv('VITE_SUPABASE_ANON_KEY', getEnv('SUPABASE_ANON_KEY'));
  if (!supabaseUrl || !anonKey) {
    throw new Error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
  }

  const products = await fetchProducts(supabaseUrl, anonKey);
  const catalog = buildLlmPriceCatalog(products, {
    siteOrigin: 'https://www.yasvik.com',
    updatedAt: new Date().toISOString(),
  });

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'llm-prices.json'), `${JSON.stringify(catalog, null, 2)}\n`);
  fs.writeFileSync(path.join(outputDir, 'llm-prices.md'), buildLlmPriceMarkdown(catalog));
  fs.writeFileSync(path.join(outputDir, 'llm-prices.csv'), buildLlmPriceCsv(catalog));
  console.log(`[llm-prices] wrote ${catalog.product_count} products to ${outputDir}`);
}

main().catch((error) => {
  console.error(`[llm-prices] ${error.message}`);
  process.exit(1);
});
