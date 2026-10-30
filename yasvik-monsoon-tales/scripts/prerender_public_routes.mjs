import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import {
  canonicalCategoryPublicSlug,
  categoryShopPath,
  SITE_ORIGIN,
} from '../src/lib/seoEntity.js';
import { loadPublicSnapshotWithFallback } from './seo/publicSnapshot.mjs';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');

function mimeType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  if (filePath.endsWith('.png')) return 'image/png';
  if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) return 'image/jpeg';
  if (filePath.endsWith('.webp')) return 'image/webp';
  if (filePath.endsWith('.xml')) return 'application/xml; charset=utf-8';
  if (filePath.endsWith('.txt')) return 'text/plain; charset=utf-8';
  return 'application/octet-stream';
}

function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function createStaticServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    const candidates = [
      path.join(distDir, pathname),
      path.join(distDir, pathname, 'index.html'),
    ];
    let filePath = candidates.find(fileExists);
    if (!filePath || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(distDir, 'index.html');
    }

    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'content-type': mimeType(filePath) });
    res.end(content);
  });
}

function parseValue(raw = '') {
  const text = decodeURIComponent(String(raw || ''));
  if (text === 'true') return true;
  if (text === 'false') return false;
  return text;
}

function applySupabaseFilters(rows = [], requestUrl, requestHeaders) {
  let next = [...rows];
  const params = requestUrl.searchParams;

  for (const [key, value] of params.entries()) {
    if (['select', 'limit', 'offset', 'order'].includes(key)) continue;
    if (value.startsWith('eq.')) {
      const expected = parseValue(value.slice(3));
      next = next.filter((row) => String(row?.[key] ?? '') === String(expected));
    } else if (value.startsWith('in.(') && value.endsWith(')')) {
      const values = value.slice(4, -1).split(',').map((item) => parseValue(item.trim()));
      next = next.filter((row) => values.some((item) => String(item) === String(row?.[key] ?? '')));
    } else if (value === 'is.null') {
      next = next.filter((row) => row?.[key] == null);
    }
  }

  const order = params.get('order');
  if (order) {
    const [field, direction = 'asc'] = order.split('.');
    next.sort((a, b) => {
      const av = a?.[field];
      const bv = b?.[field];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (String(av) === String(bv)) return 0;
      return String(av).localeCompare(String(bv), undefined, { numeric: true });
    });
    if (direction === 'desc') next.reverse();
  }

  const offset = Number(params.get('offset') || 0) || 0;
  const limit = Number(params.get('limit') || next.length) || next.length;
  next = next.slice(offset, offset + limit);

  const accept = requestHeaders['accept'] || requestHeaders['Accept'] || '';
  if (String(accept).includes('application/vnd.pgrst.object+json')) {
    return next[0] || null;
  }
  return next;
}

function normalizePrerenderHtml(html, port) {
  const localPattern = new RegExp(`https?://127\\.0\\.0\\.1:${port}`, 'g');
  return html.replace(localPattern, SITE_ORIGIN);
}

function writeRouteHtml(routePath, html) {
  const clean = routePath.replace(/\/+$/, '') || '/';
  const target = clean === '/'
    ? path.join(distDir, 'index.html')
    : path.join(distDir, clean.slice(1), 'index.html');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, html, 'utf8');
}

function buildPrerenderRoutes(snapshot) {
  const data = snapshot.data || {};
  const categories = (data.categories || []).filter((row) => row?.is_active && !row?.parent_id && row?.slug);
  const categoryRoutes = categories
    .map((category) => categoryShopPath(category))
    .filter(Boolean);

  const stories = (data.stories || [])
    .filter((row) => row?.is_published)
    .map((story) => `/stories/${story.id}`);

  const products = [...(data.products || [])]
    .filter((row) => row?.is_published && row?.sell_online !== false && (row?.slug || row?.id))
    .sort((a, b) =>
      Number(b?.is_featured || 0) - Number(a?.is_featured || 0)
      || Number(b?.featured_in_hero || 0) - Number(a?.featured_in_hero || 0)
      || (Number(a?.sort_order) || 0) - (Number(b?.sort_order) || 0)
      || String(b?.updated_at || '').localeCompare(String(a?.updated_at || ''))
    )
    .slice(0, 100)
    .map((product) => `/product/${product.slug || product.id}`);

  return [
    '/',
    '/store',
    '/shop',
    '/stories',
    ...categoryRoutes,
    ...stories,
    ...products,
  ];
}

async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true });
  } catch (error) {
    const fallbackChannels = ['chrome', 'msedge'];
    for (const channel of fallbackChannels) {
      try {
        return await chromium.launch({ headless: true, channel });
      } catch {
        // Try the next installed browser channel.
      }
    }

    const install = spawnSync('npx', ['playwright', 'install', 'chromium'], {
      cwd: rootDir,
      stdio: 'inherit',
      shell: false,
    });
    if (install.status === 0) {
      return chromium.launch({ headless: true });
    }
    throw error;
  }
}

async function main() {
  if (!fileExists(path.join(distDir, 'index.html'))) {
    console.warn('[prerender] dist/index.html not found, skipping prerender.');
    return;
  }

  const snapshot = await loadPublicSnapshotWithFallback();
  const data = snapshot.data || {};
  const baseRows = {
    app_settings: data.app_settings || [],
    categories: data.categories || [],
    products: data.products || [],
    product_images: data.product_images || [],
    stories: data.stories || [],
    journeys: data.journeys || [],
    people: data.people || [],
    regions: data.regions || [],
    reviews: data.reviews || [],
    combos: data.combos || [],
    combo_items: data.combo_items || [],
    story_comments: data.story_comments || [],
  };

  const server = createStaticServer();
  const port = Number(process.env.PRERENDER_PORT || 4177);
  await new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  const browser = await launchBrowser();
  const page = await browser.newPage();

  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.hostname.includes('supabase.co') && url.pathname.includes('/auth/v1/')) {
      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Not authenticated' }),
      });
    }

    if (url.hostname.includes('supabase.co') && url.pathname.includes('/rest/v1/')) {
      const table = url.pathname.split('/rest/v1/')[1];
      const rows = baseRows[table] || [];
      const filtered = applySupabaseFilters(rows, url, request.headers());
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(filtered),
      });
    }

    if (url.hostname.includes('supabase.co') && url.pathname.includes('/rest/v1/rpc/get_popular_product_sales')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    }

    return route.continue();
  });

  const routes = buildPrerenderRoutes(snapshot);
  const failures = [];

  for (const routePath of routes) {
    const routeUrl = `http://127.0.0.1:${port}${routePath}`;
    try {
      await page.goto(routeUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForSelector('h1', { timeout: 12000 });
      await page.waitForTimeout(150);
      const hasH1 = await page.locator('h1').count();
      if (!hasH1) {
        failures.push(`${routePath} (missing h1)`);
        console.warn(`[prerender] skipped ${routePath} — missing h1`);
        continue;
      }
      const html = normalizePrerenderHtml(await page.content(), port);
      writeRouteHtml(routePath, html);
      console.log(`[prerender] wrote ${routePath}`);
    } catch (error) {
      failures.push(`${routePath} (${error.message})`);
      console.warn(`[prerender] skipped ${routePath} — ${error.message}`);
    }
  }

  await browser.close();
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));

  if (failures.length) {
    console.warn(`[prerender] completed with ${failures.length} skipped route(s).`);
    failures.forEach((failure) => console.warn(`[prerender] ${failure}`));
  }
}

main().catch((error) => {
  console.error('[prerender] failed', error);
  process.exit(1);
});
