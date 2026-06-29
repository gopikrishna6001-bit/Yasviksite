#!/usr/bin/env node
/**
 * Pre-deploy bandwidth + render readiness check against local preview.
 * Usage: node scripts/production-readiness-check.mjs [baseUrl]
 */
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const BASE = process.argv[2] || 'http://127.0.0.1:4173';
const ROUTES = ['/', '/shop', '/wishlist'];
const FAILURES = [];
const WARNINGS = [];
const ASSET_LOG = [];

const BAD_PATTERNS = [
  { re: /1781516610532-xylu0hqz5a\.png/, label: '15 MB legacy logo PNG' },
  { re: /1781518040543-6c7i3giwirb\.png/, label: '9 MB legacy symbol PNG' },
  { re: /1781695589618-9h1bz5k36\.mp4/, label: '45 MB hero MP4' },
  { re: /1781695604187-n3gnq8z9go\.mp4/, label: '31 MB hero MP4' },
  { re: /\/storage\/v1\/object\/public\/.*\.(png|jpe?g|webp)(\?|$)/i, label: 'Unoptimized Supabase object URL (should use render/image)' },
];

function noteFailure(msg) { FAILURES.push(msg); console.error(`✗ ${msg}`); }
function noteWarning(msg) { WARNINGS.push(msg); console.warn(`⚠ ${msg}`); }
function notePass(msg) { console.log(`✓ ${msg}`); }

function classifyUrl(url) {
  if (!url) return null;
  for (const { re, label } of BAD_PATTERNS) {
    if (re.test(url)) return label;
  }
  if (url.includes('/render/image/public/')) {
    const u = new URL(url);
    const hasWebp = u.searchParams.get('format') === 'webp';
    const hasWidth = Boolean(u.searchParams.get('width'));
    const hasQuality = Boolean(u.searchParams.get('quality'));
    if (!hasWebp || !hasWidth || !hasQuality) return 'Render URL missing webp/width/quality';
  }
  return null;
}

async function fetchSize(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    const len = Number(res.headers.get('content-length') || 0);
    const type = res.headers.get('content-type') || '';
    return { ok: res.ok, len, type };
  } catch {
    return { ok: false, len: 0, type: '' };
  }
}

async function run() {
  console.log(`\n═══ Yasvik production-readiness check ═══\nBase: ${BASE}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const allRequests = [];

  page.on('request', (req) => {
    const url = req.url();
    if (/\.(png|jpe?g|webp|gif|svg|mp4|webm)|render\/image|\/media\//i.test(url)) {
      allRequests.push({ url, route: page.url(), type: req.resourceType() });
    }
  });

  for (const route of ROUTES) {
    const url = `${BASE}${route}`;
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
      notePass(`${route} rendered (${page.url()})`);
    } catch (err) {
      noteFailure(`${route} failed to load: ${err.message}`);
    }
  }

  // Product detail — link from shop or known published product fallback
  try {
    await page.goto(`${BASE}/shop`, { waitUntil: 'networkidle', timeout: 60000 });
    let productHref = await page.locator('a[href^="/product/"]').first().getAttribute('href').catch(() => null);
    if (!productHref) productHref = '/product/4d7a4d4c-d2ed-4cb9-90bb-62b75b43a0d4';
    await page.goto(`${BASE}${productHref}`, { waitUntil: 'networkidle', timeout: 60000 });
    const title = await page.locator('h1').first().textContent().catch(() => '');
    if (title) notePass(`Product detail rendered (${productHref}) — ${title.trim().slice(0, 40)}`);
    else noteFailure(`Product detail empty (${productHref})`);
  } catch (err) {
    noteFailure(`Product detail check failed: ${err.message}`);
  }

  // Hover gallery DOM check on shop
  try {
    await page.goto(`${BASE}/shop`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.setViewportSize({ width: 1440, height: 900 });
    const card = page.locator('.yasvik-product-card').first();
    if (await card.count()) {
      const imgsBefore = await card.locator('img').count();
      await card.hover();
      await sleep(400);
      const imgsAfter = await card.locator('img').count();
      if (imgsAfter > imgsBefore + 1) notePass('Hover image appears only after hover');
      else if (imgsAfter === imgsBefore) notePass('No hover gallery image in DOM until needed (or none configured)');
      else noteWarning(`Unexpected img count before=${imgsBefore} after=${imgsAfter}`);
    }
  } catch (err) {
    noteWarning(`Hover DOM check skipped: ${err.message}`);
  }

  await browser.close();

  // Analyze captured requests
  const unique = [...new Map(allRequests.map((r) => [r.url, r])).values()];
  for (const { url } of unique) {
    const issue = classifyUrl(url);
    if (issue) noteFailure(`${issue}: ${url.slice(0, 120)}…`);
  }

  const renderUrls = unique.filter((r) => r.url.includes('/render/image/public/'));
  if (renderUrls.length) notePass(`${renderUrls.length} Supabase render/image requests captured`);
  else noteWarning('No Supabase render/image requests captured (may be no Supabase product images)');

  const brandLocal = unique.filter((r) => r.url.includes('/media/brand/'));
  if (brandLocal.length) notePass(`Brand assets served locally: ${brandLocal.length} request(s)`);

  // Size check for homepage + shop image assets
  const checkUrls = unique
    .filter((r) => /render\/image|\/media\/|supabase\.co/i.test(r.url))
    .map((r) => r.url)
    .slice(0, 40);

  for (const url of checkUrls) {
    const { ok, len, type } = await fetchSize(url);
    if (!ok) continue;
    ASSET_LOG.push({ url, len, type });
    if (len > 500_000) noteWarning(`Asset >500 KB (${Math.round(len / 1024)} KB): ${url.slice(0, 100)}…`);
  }

  // Cloudflare cache headers (production)
  try {
    const res = await fetch('https://www.yasvik.com/media/brand/logo-horizontal.png', { method: 'HEAD' });
    const cc = res.headers.get('cache-control') || '';
    if (/max-age=31536000|immutable/i.test(cc)) notePass(`Production brand cache headers: ${cc}`);
    else noteWarning(`Production brand cache headers weak: ${cc || '(none)'}`);
  } catch (err) {
    noteWarning(`Could not verify production cache headers: ${err.message}`);
  }

  console.log('\n── Summary ──');
  console.log(`Failures: ${FAILURES.length}`);
  console.log(`Warnings: ${WARNINGS.length}`);
  if (ASSET_LOG.length) {
    console.log('\nLargest checked assets:');
    ASSET_LOG.sort((a, b) => b.len - a.len).slice(0, 8).forEach((a) => {
      console.log(`  ${Math.round(a.len / 1024)} KB  ${a.url.slice(0, 90)}`);
    });
  }

  if (FAILURES.length) {
    console.log('\nDeploy blocked by failures.\n');
    process.exit(1);
  }
  console.log('\nAll blocking checks passed.\n');
}

async function main() {
  let preview;
  const needsPreview = !process.argv[2];
  if (needsPreview) {
    preview = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', '4173'], {
      cwd: ROOT,
      stdio: 'pipe',
      shell: true,
    });
    await sleep(3500);
  }
  try {
    await run();
  } finally {
    if (preview) preview.kill('SIGTERM');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
