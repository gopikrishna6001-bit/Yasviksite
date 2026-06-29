import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const publicDir = path.join(rootDir, 'public');
const sitemapPath = path.join(publicDir, 'sitemap.xml');
const canonicalOrigin = 'https://www.yasvik.com';
const STATIC_URL_COUNT = 4;
const OVERRIDE_ENV = 'YASVIK_SITEMAP_ALLOW_STATIC';

const isProductionBuild = process.env.npm_lifecycle_event === 'prebuild';
const allowStaticOverride = process.env[OVERRIDE_ENV] === '1';

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

async function fetchCatalogRows(options) {
  try {
    const rows = await fetchRows(options);
    return { table: options.table, rows, error: null };
  } catch (error) {
    if (isProductionBuild) {
      return { table: options.table, rows: [], error: error.message };
    }
    console.warn(`[sitemap] skipped ${options.table}: ${error.message}`);
    return { table: options.table, rows: [], error: null };
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

function formatOverrideHint() {
  return `Set ${OVERRIDE_ENV}=1 to force the ${STATIC_URL_COUNT}-URL static sitemap anyway.`;
}

function failProductionSitemap(reason, details = []) {
  const lines = [
    '',
    '[sitemap] PRODUCTION BUILD BLOCKED',
    `[sitemap] ${reason}`,
    ...details.map((line) => `[sitemap] ${line}`),
    `[sitemap] A static-only sitemap would shrink SEO coverage from the full published catalog to ${STATIC_URL_COUNT} URLs.`,
    `[sitemap] ${formatOverrideHint()}`,
    '',
  ];
  console.error(lines.join('\n'));
  process.exit(1);
}

function warnProductionStaticOverride(reason, details = []) {
  const lines = [
    '',
    '[sitemap] ⚠️  PRODUCTION OVERRIDE ACTIVE — STATIC SITEMAP ONLY',
    `[sitemap] ${reason}`,
    ...details.map((line) => `[sitemap] ${line}`),
    `[sitemap] Writing only ${STATIC_URL_COUNT} static URLs because ${OVERRIDE_ENV}=1.`,
    '[sitemap] Remove the override once Supabase env and catalog fetch are healthy.',
    '',
  ];
  console.error(lines.join('\n'));
}

async function buildSitemapEntries() {
  const supabaseUrl = getEnv('VITE_SUPABASE_URL') || getEnv('SUPABASE_URL') || 'https://cpksnpuavywbmhrzglyh.supabase.co';
  const anonKey = getEnv('VITE_SUPABASE_ANON_KEY');

  const staticEntries = [
    { loc: `${canonicalOrigin}/`, changefreq: 'daily', priority: '1.0' },
    { loc: `${canonicalOrigin}/shop`, changefreq: 'daily', priority: '0.9' },
    { loc: `${canonicalOrigin}/our-roots`, changefreq: 'weekly', priority: '0.85' },
    { loc: `${canonicalOrigin}/contact`, changefreq: 'monthly', priority: '0.8' },
  ];

  if (!supabaseUrl || !anonKey) {
    if (isProductionBuild) {
      const reason = 'Supabase env is missing (VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY).';
      const details = [
        'Add credentials to .env.local or the build environment before production deploy.',
      ];
      if (allowStaticOverride) {
        warnProductionStaticOverride(reason, details);
        return staticEntries;
      }
      failProductionSitemap(reason, details);
    }

    console.warn('[sitemap] Supabase env missing; using static routes only (local/dev fallback).');
    return staticEntries;
  }

  const catalogSources = [
    {
      table: 'products',
      select: 'id,slug,updated_at,created_at,is_published',
      filter: 'is_published=eq.true',
      toPath: (r) => `/product/${r.slug || r.id}`,
      priority: '0.9',
      changefreq: 'daily',
    },
    {
      table: 'journeys',
      select: 'id,updated_at,created_at,is_published',
      filter: 'is_published=eq.true',
      toPath: (r) => `/journeys/${r.id}`,
      priority: '0.8',
      changefreq: 'weekly',
    },
    {
      table: 'stories',
      select: 'id,updated_at,created_at,is_published',
      filter: 'is_published=eq.true',
      toPath: (r) => `/stories/${r.id}`,
      priority: '0.8',
      changefreq: 'weekly',
    },
    {
      table: 'people',
      select: 'id,updated_at,created_at,is_published',
      filter: 'is_published=eq.true',
      toPath: (r) => `/farmers/${r.id}`,
      priority: '0.8',
      changefreq: 'weekly',
    },
    {
      table: 'categories',
      select: 'id,updated_at,created_at,is_active',
      filter: 'is_active=eq.true',
      toPath: (r) => `/shop?category=${r.id}`,
      priority: '0.7',
      changefreq: 'weekly',
    },
  ];

  const results = await Promise.all(
    catalogSources.map(({ table, select, filter }) =>
      fetchCatalogRows({ supabaseUrl, anonKey, table, select, filter }),
    ),
  );

  const fetchFailures = results.filter((result) => result.error);
  const dynamicEntries = results.flatMap((result, index) => {
    const source = catalogSources[index];
    return rowToUrlItems(
      result.rows,
      source.toPath,
      source.priority,
      source.changefreq,
    );
  });

  if (isProductionBuild && (fetchFailures.length > 0 || dynamicEntries.length === 0)) {
    const reason = fetchFailures.length > 0
      ? 'One or more Supabase catalog fetches failed during production build.'
      : 'Supabase catalog fetch returned zero publishable URLs during production build.';
    const details = fetchFailures.length > 0
      ? fetchFailures.map(({ table, error }) => `${table}: ${error}`)
      : ['Verify published products/categories/recipes exist and RLS allows anon read.'];

    if (allowStaticOverride) {
      warnProductionStaticOverride(reason, details);
      return staticEntries;
    }

    failProductionSitemap(reason, details);
  }

  if (dynamicEntries.length === 0) {
    console.warn('[sitemap] dynamic sources returned no rows; using static routes only (local/dev fallback).');
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
