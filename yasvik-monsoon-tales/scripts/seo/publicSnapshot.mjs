import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const cacheDir = path.join(rootDir, '.cache', 'seo');
const snapshotPath = path.join(cacheDir, 'public-snapshot.json');
const fallbackSitemapPath = path.join(cacheDir, 'sitemap-last-success.xml');

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
  const example = readEnvFile(path.join(rootDir, '.env.example'));
  if (example[key]) return example[key];
  return fallback;
}

function ensureCacheDir() {
  fs.mkdirSync(cacheDir, { recursive: true });
}

export function readCachedPublicSnapshot() {
  if (!fs.existsSync(snapshotPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
  } catch {
    return null;
  }
}

export function writeCachedPublicSnapshot(snapshot) {
  ensureCacheDir();
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2), 'utf8');
}

export function readCachedSitemapXml() {
  if (!fs.existsSync(fallbackSitemapPath)) return '';
  return fs.readFileSync(fallbackSitemapPath, 'utf8');
}

export function writeCachedSitemapXml(xml) {
  if (!xml) return;
  ensureCacheDir();
  fs.writeFileSync(fallbackSitemapPath, xml, 'utf8');
}

async function fetchRows({ supabaseUrl, anonKey, table, filter = '', limit = 1000 }) {
  const query = new URLSearchParams();
  query.set('select', '*');
  query.set('limit', String(limit));
  if (filter) {
    const [key, value] = filter.split('=');
    query.set(key, value);
  }
  const url = `${supabaseUrl}/rest/v1/${table}?${query.toString()}`;
  const res = await fetch(url, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  });
  if (!res.ok) {
    throw new Error(`${table}: ${res.status}`);
  }
  return res.json();
}

export async function buildPublicSnapshot() {
  const supabaseUrl = (getEnv('VITE_SUPABASE_URL') || getEnv('SUPABASE_URL') || '').replace(/\/$/, '');
  const anonKey = getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !anonKey) {
    throw new Error('Missing Supabase public env for public snapshot');
  }

  const tables = {
    app_settings: { filter: '', limit: 200 },
    categories: { filter: '', limit: 200 },
    products: { filter: 'is_published=eq.true', limit: 500 },
    product_images: { filter: '', limit: 800 },
    stories: { filter: 'is_published=eq.true', limit: 100 },
    journeys: { filter: 'is_published=eq.true', limit: 100 },
    people: { filter: 'is_published=eq.true', limit: 100 },
    regions: { filter: '', limit: 100 },
    reviews: { filter: '', limit: 200 },
    combos: { filter: 'is_published=eq.true', limit: 50 },
    combo_items: { filter: '', limit: 200 },
    category_slug_aliases: { filter: '', limit: 200 },
    story_comments: { filter: '', limit: 200 },
  };

  const entries = Object.entries(tables);
  const results = await Promise.all(
    entries.map(async ([table, options]) => [table, await fetchRows({ supabaseUrl, anonKey, table, ...options })]),
  );

  return {
    generatedAt: new Date().toISOString(),
    source: 'live',
    supabaseUrl,
    data: Object.fromEntries(results),
  };
}

export async function loadPublicSnapshotWithFallback({ log = console } = {}) {
  try {
    const snapshot = await buildPublicSnapshot();
    writeCachedPublicSnapshot(snapshot);
    return snapshot;
  } catch (error) {
    const cached = readCachedPublicSnapshot();
    if (cached) {
      log.warn(`[seo-snapshot] using cached public snapshot: ${error.message}`);
      return {
        ...cached,
        source: 'cache',
        fallbackReason: error.message,
      };
    }
    log.warn(`[seo-snapshot] no live snapshot and no cache; using static fallback: ${error.message}`);
    return {
      generatedAt: new Date().toISOString(),
      source: 'static-fallback',
      fallbackReason: error.message,
      data: {
        app_settings: [],
        categories: [],
        products: [],
        product_images: [],
        stories: [],
        journeys: [],
        people: [],
        regions: [],
        reviews: [],
        combos: [],
        combo_items: [],
        category_slug_aliases: [],
        story_comments: [],
      },
    };
  }
}

export function getSnapshotFilePath() {
  return snapshotPath;
}

export function getCachedSitemapPath() {
  return fallbackSitemapPath;
}
