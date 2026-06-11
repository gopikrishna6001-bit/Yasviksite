import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const publicDir = path.join(rootDir, 'public');
const sitemapPath = path.join(publicDir, 'sitemap.xml');
const canonicalOrigin = 'https://www.yasvik.com';

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

function xmlEscape(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function fmtDate(value) {
  if (!value) return null;
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
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

async function fetchOptionalRows(options) {
  try {
    return await fetchRows(options);
  } catch (error) {
    console.warn(`[sitemap] skipped ${options.table}: ${error.message}`);
    return [];
  }
}

function rowToUrlItems(rows, toPath, priority, changefreq, updatedField = 'updated_at') {
  return (rows || []).map((row) => ({
    loc: `${canonicalOrigin}${toPath(row)}`,
    priority,
    changefreq,
    lastmod: fmtDate(row[updatedField] || row.created_at || null),
  }));
}

async function buildSitemapEntries() {
  const supabaseUrl = getEnv('VITE_SUPABASE_URL');
  const anonKey = getEnv('VITE_SUPABASE_ANON_KEY');

  const staticEntries = [
    { loc: `${canonicalOrigin}/`, changefreq: 'daily', priority: '1.0' },
    { loc: `${canonicalOrigin}/shop`, changefreq: 'daily', priority: '0.9' },
    { loc: `${canonicalOrigin}/our-roots`, changefreq: 'weekly', priority: '0.85' },
    { loc: `${canonicalOrigin}/contact`, changefreq: 'monthly', priority: '0.5' },
  ];

  if (!supabaseUrl || !anonKey) return staticEntries;

  const [products, journeys, stories, people, categories, recipes] = await Promise.all([
    fetchOptionalRows({
      supabaseUrl,
      anonKey,
      table: 'products',
      select: 'id,updated_at,created_at,is_published',
      filter: 'is_published=eq.true',
    }),
    fetchOptionalRows({
      supabaseUrl,
      anonKey,
      table: 'journeys',
      select: 'id,updated_at,created_at,is_published',
      filter: 'is_published=eq.true',
    }),
    fetchOptionalRows({
      supabaseUrl,
      anonKey,
      table: 'stories',
      select: 'id,updated_at,created_at,is_published',
      filter: 'is_published=eq.true',
    }),
    fetchOptionalRows({
      supabaseUrl,
      anonKey,
      table: 'people',
      select: 'id,updated_at,created_at,is_published',
      filter: 'is_published=eq.true',
    }),
    fetchOptionalRows({
      supabaseUrl,
      anonKey,
      table: 'categories',
      select: 'id,updated_at,created_at,is_active',
      filter: 'is_active=eq.true',
    }),
    fetchOptionalRows({
      supabaseUrl,
      anonKey,
      table: 'recipes',
      select: 'id,updated_at,created_at,is_published',
      filter: 'is_published=eq.true',
    }),
  ]);

  const dynamicEntries = [
    ...rowToUrlItems(products, (r) => `/product/${r.id}`, '0.9', 'daily'),
    ...rowToUrlItems(journeys, (r) => `/journeys/${r.id}`, '0.8', 'weekly'),
    ...rowToUrlItems(stories, (r) => `/stories/${r.id}`, '0.8', 'weekly'),
    ...rowToUrlItems(people, (r) => `/people/${r.id}`, '0.8', 'weekly'),
    ...rowToUrlItems(categories, (r) => `/shop?category=${r.id}`, '0.7', 'weekly'),
    ...rowToUrlItems(recipes, (r) => `/recipes/${r.id}`, '0.7', 'weekly'),
  ];

  if (dynamicEntries.length === 0) {
    console.warn('[sitemap] dynamic sources returned no rows; using static routes only');
  }

  return [...staticEntries, ...dynamicEntries];
}

function buildXml(entries) {
  const body = entries
    .map((entry) => {
      const lines = [
        '  <url>',
        `    <loc>${xmlEscape(entry.loc)}</loc>`,
      ];
      if (entry.lastmod) lines.push(`    <lastmod>${xmlEscape(entry.lastmod)}</lastmod>`);
      if (entry.changefreq) lines.push(`    <changefreq>${xmlEscape(entry.changefreq)}</changefreq>`);
      if (entry.priority) lines.push(`    <priority>${xmlEscape(entry.priority)}</priority>`);
      lines.push('  </url>');
      return lines.join('\n');
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

async function main() {
  const entries = await buildSitemapEntries();
  fs.mkdirSync(publicDir, { recursive: true });
  fs.writeFileSync(sitemapPath, buildXml(entries), 'utf8');
  console.log(`[sitemap] wrote ${entries.length} URLs to ${sitemapPath}`);
}

main().catch((error) => {
  console.error('[sitemap] failed', error);
  process.exit(1);
});
