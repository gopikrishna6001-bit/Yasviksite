import fs from 'node:fs';
import path from 'node:path';
import {
  canonicalCategoryPublicSlug,
  SITE_ORIGIN,
} from './src/lib/seoEntity.js';
import {
  loadPublicSnapshotWithFallback,
  readCachedSitemapXml,
  writeCachedSitemapXml,
} from './scripts/seo/publicSnapshot.mjs';

const rootDir = process.cwd();
const publicDir = path.join(rootDir, 'public');
const sitemapPath = path.join(publicDir, 'sitemap.xml');
const canonicalOrigin = SITE_ORIGIN;

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

function rowToUrlItems(rows, toPath, priority, changefreq, updatedField = 'updated_at') {
  return (rows || [])
    .map((row) => {
      const path = toPath(row);
      if (!path) return null;
      return {
        loc: `${canonicalOrigin}${path}`,
        priority,
        changefreq,
        lastmod: fmtDate(row[updatedField] || row.created_at || null),
      };
    })
    .filter(Boolean);
}

async function buildSitemapEntries() {
  const staticEntries = [
    { loc: `${canonicalOrigin}/`, changefreq: 'daily', priority: '1.0' },
    { loc: `${canonicalOrigin}/shop`, changefreq: 'daily', priority: '0.9' },
    { loc: `${canonicalOrigin}/store`, changefreq: 'weekly', priority: '0.85' },
    { loc: `${canonicalOrigin}/catalogue`, changefreq: 'weekly', priority: '0.7' },
    { loc: `${canonicalOrigin}/our-roots`, changefreq: 'weekly', priority: '0.85' },
    { loc: `${canonicalOrigin}/stories`, changefreq: 'weekly', priority: '0.75' },
    { loc: `${canonicalOrigin}/contact`, changefreq: 'monthly', priority: '0.8' },
    { loc: `${canonicalOrigin}/privacy`, changefreq: 'yearly', priority: '0.3' },
    { loc: `${canonicalOrigin}/terms`, changefreq: 'yearly', priority: '0.3' },
    { loc: `${canonicalOrigin}/delivery-policy`, changefreq: 'yearly', priority: '0.3' },
  ];

  const snapshot = await loadPublicSnapshotWithFallback();
  const data = snapshot.data || {};

  const categories = (data.categories || []).filter((row) => row?.is_active && !row?.parent_id);
  const products = (data.products || []).filter((row) => row?.is_published && row?.sell_online !== false);
  const stories = (data.stories || []).filter((row) => row?.is_published);
  const people = (data.people || []).filter((row) => row?.is_published);

  const dynamicEntries = [
    ...rowToUrlItems(products, (r) => `/product/${r.slug || r.id}`, '0.9', 'daily'),
    ...rowToUrlItems(stories, (r) => `/stories/${r.id}`, '0.8', 'weekly'),
    ...rowToUrlItems(people, (r) => `/farmers/${r.id}`, '0.8', 'weekly'),
    ...rowToUrlItems(
      categories,
      (r) => {
        const publicSlug = canonicalCategoryPublicSlug(r.seo_slug || r.slug || r.name || '');
        return publicSlug ? `/shop/${publicSlug}` : null;
      },
      '0.8',
      'weekly',
    ),
  ];

  if (!dynamicEntries.length) {
    console.warn('[sitemap] no dynamic entries available; using static routes only.');
  } else if (snapshot.source === 'cache') {
    console.warn(`[sitemap] built from cached public snapshot (${snapshot.fallbackReason || 'live fetch unavailable'}).`);
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
  try {
    const entries = await buildSitemapEntries();
    const xml = buildXml(entries);
    fs.mkdirSync(publicDir, { recursive: true });
    fs.writeFileSync(sitemapPath, xml, 'utf8');
    writeCachedSitemapXml(xml);
    console.log(`[sitemap] wrote ${entries.length} URLs to ${sitemapPath}`);
  } catch (error) {
    const cachedXml = readCachedSitemapXml();
    if (cachedXml) {
      fs.mkdirSync(publicDir, { recursive: true });
      fs.writeFileSync(sitemapPath, cachedXml, 'utf8');
      console.warn(`[sitemap] using cached sitemap snapshot because live generation failed: ${error.message}`);
      return;
    }
    throw error;
  }
}

main().catch((error) => {
  console.error('[sitemap] failed', error);
  process.exit(1);
});
