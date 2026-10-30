import { chromium, devices } from 'playwright';
import path from 'node:path';

const BASE = 'http://127.0.0.1:5173';
const OUT = path.join(process.cwd(), '.review-screenshots');

const browser = await chromium.launch({ headless: true });

async function snap(page, file, full = false) {
  await page.screenshot({ path: path.join(OUT, file), fullPage: full });
}

// Mobile home scroll sections
const mobile = await browser.newPage({ ...devices['iPhone 13'] });
await mobile.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
await mobile.waitForTimeout(4000);
await snap(mobile, 'review-mobile-home-atf.png');
await mobile.evaluate(() => window.scrollTo(0, 900));
await mobile.waitForTimeout(800);
await snap(mobile, 'review-mobile-home-mid.png');
await mobile.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await mobile.waitForTimeout(800);
await snap(mobile, 'review-mobile-footer.png');

// Desktop home + footer
const desktop = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await desktop.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
await desktop.waitForTimeout(4000);
await desktop.evaluate(() => window.scrollTo(0, 1200));
await desktop.waitForTimeout(800);
await snap(desktop, 'review-desktop-home-mid.png');
await desktop.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await desktop.waitForTimeout(800);
await snap(desktop, 'review-desktop-footer.png');

// PDP direct
await mobile.goto(`${BASE}/product/amla-powder`, { waitUntil: 'domcontentloaded' });
await mobile.waitForTimeout(3500);
await snap(mobile, 'review-mobile-pdp.png');

await desktop.goto(`${BASE}/product/amla-powder`, { waitUntil: 'domcontentloaded' });
await desktop.waitForTimeout(3500);
await snap(desktop, 'review-desktop-pdp.png');

// Non-retail pages
for (const [vp, name, url] of [
  ['mobile', 'checkout', '/checkout'],
  ['desktop', 'checkout', '/checkout'],
  ['mobile', 'our-roots', '/our-roots'],
]) {
  const page = vp === 'mobile'
    ? await browser.newPage({ ...devices['iPhone 13'] })
    : await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: path.join(OUT, `review-${name}-${vp}.png`), fullPage: false });
  await page.close();
}

await browser.close();
console.log('done');
