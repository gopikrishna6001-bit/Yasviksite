import fs from 'node:fs';
import path from 'node:path';
import { SITE_ORIGIN } from '../src/lib/seoEntity.js';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const checks = [];

function read(filePath) {
  return fs.readFileSync(path.join(rootDir, filePath), 'utf8');
}

function add(name, ok, detail = '') {
  checks.push({ name, ok, detail });
}

function inspectHtml(relativePath, expectations = {}) {
  const fullPath = path.join(distDir, relativePath);
  if (!fs.existsSync(fullPath)) {
    add(relativePath, false, 'missing prerendered html');
    return;
  }
  const html = fs.readFileSync(fullPath, 'utf8');
  const title = (html.match(/<title>([^<]*)<\/title>/i) || [])[1] || '';
  const canonical = (html.match(/rel="canonical" href="([^"]+)"/i) || [])[1] || '';
  const h1s = [...html.matchAll(/<h1[^>]*>([^<]+)/gi)].map((match) => match[1].trim());
  if (expectations.titleIncludes) {
    add(`${relativePath} title`, expectations.titleIncludes.some((part) => title.includes(part)), title);
  }
  if (expectations.canonical) {
    add(`${relativePath} canonical`, canonical === expectations.canonical, canonical);
  }
  if (expectations.h1Includes) {
    add(`${relativePath} h1`, h1s.some((value) => expectations.h1Includes.some((part) => value.includes(part))), h1s.join(' | '));
  }
  if (expectations.schema) {
    expectations.schema.forEach((schemaType) => {
      add(`${relativePath} schema ${schemaType}`, html.includes(schemaType));
    });
  }
  if (expectations.introIncludes) {
    add(`${relativePath} intro`, expectations.introIncludes.every((part) => html.includes(part)), expectations.introIncludes.join(', '));
  }
}

function main() {
  const sitemap = read('public/sitemap.xml');
  const robots = read('public/robots.txt');
  const redirects = read('public/_redirects');

  add('sitemap non-empty', sitemap.includes('<urlset') && !sitemap.includes('<urlset></urlset>'));
  add('sitemap canonical category slug', sitemap.includes(`${SITE_ORIGIN}/shop/homemade-snacks-sweets`));
  add('sitemap excludes query urls', !sitemap.includes('?category='));
  add('robots blocks admin', robots.includes('Disallow: /admin'));
  add('robots blocks checkout', robots.includes('Disallow: /checkout'));
  add('redirect short slug -> public slug', redirects.includes('/shop/snacks /shop/homemade-snacks-sweets 301!'));
  add('redirect does not demote public slug', !redirects.includes('/shop/homemade-snacks-sweets /shop/snacks'));

  inspectHtml('index.html', {
    titleIncludes: ['Better Food. Found.'],
    canonical: `${SITE_ORIGIN}/`,
    schema: ['WebSite', 'Organization', 'GroceryStore', 'SearchAction'],
  });
  inspectHtml('store/index.html', {
    titleIncludes: ['Visit Yasvik'],
    canonical: `${SITE_ORIGIN}/store`,
    schema: ['GroceryStore'],
  });
  inspectHtml('shop/index.html', {
    titleIncludes: ['Shop Better Everyday Foods'],
    canonical: `${SITE_ORIGIN}/shop`,
  });
  inspectHtml('shop/homemade-snacks-sweets/index.html', {
    titleIncludes: ['Homemade Snacks in Hyderabad'],
    canonical: `${SITE_ORIGIN}/shop/homemade-snacks-sweets`,
    h1Includes: ['Homemade Snacks'],
    introIncludes: ['Regional homemade snacks and sweets from Yasvik'],
    schema: ['CollectionPage', 'BreadcrumbList', 'FAQPage'],
  });
  inspectHtml('stories/index.html', {
    titleIncludes: ['Yasvik Stories'],
    canonical: `${SITE_ORIGIN}/stories`,
  });

  const failed = checks.filter((check) => !check.ok);
  console.log('[seo-validate] checks:', checks.length);
  checks.forEach((check) => {
    console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.name}${check.detail ? ` — ${check.detail}` : ''}`);
  });

  if (failed.length) {
    console.error(`[seo-validate] ${failed.length} check(s) failed`);
    process.exitCode = 1;
  } else {
    console.log('[seo-validate] all checks passed');
  }
}

main();
