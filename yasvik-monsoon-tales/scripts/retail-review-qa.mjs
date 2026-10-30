import { chromium, devices } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.QA_BASE || 'http://127.0.0.1:5173';
const OUT = path.join(process.cwd(), '.review-screenshots');
fs.mkdirSync(OUT, { recursive: true });

const pages = [
  { name: 'home', path: '/' },
  { name: 'shop', path: '/shop' },
  { name: 'contact', path: '/contact#store' },
];

const report = { desktop: {}, mobile: {}, checks: {}, errors: [] };

const browser = await chromium.launch({ headless: true });

async function auditPage(page, label, viewport) {
  const data = {};
  for (const { name, path: p } of pages) {
    const key = `${label}-${name}`;
    await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(3500);

    data[name] = {
      url: page.url(),
      hasSiteHeader: await page.locator('header').first().isVisible().catch(() => false),
      hasFooter: await page.locator('footer').first().isVisible().catch(() => false),
      consoleErrors: [],
    };

    if (name === 'home') {
      data[name].noFarmerStory = !(await page.locator('text=/farmer.?sourced|From the farm/i').first().isVisible().catch(() => false));
      data[name].hasCategories = await page.locator('#home-categories-heading, text=Shop by category').first().isVisible().catch(() => false);
      data[name].hasShopNow = await page.getByRole('link', { name: /Shop Now/i }).first().isVisible().catch(() => false);
      data[name].aiBannerCount = await page.locator('[class*="Illustration"], [data-illustration]').count();
    }

    if (name === 'shop') {
      data[name].hasAddButton = await page.getByRole('button', { name: /^ADD$/i }).first().isVisible().catch(() => false);
      data[name].aiBannerCount = await page.locator('[class*="Illustration"], [data-illustration]').count();
    }

    if (name === 'contact') {
      data[name].hasStoreSection = await page.locator('#store').isVisible().catch(() => false);
      data[name].hasMap = await page.locator('iframe[title*="Map"]').isVisible().catch(() => false);
      data[name].hasStorePhoto = await page.locator('#store img').first().isVisible().catch(() => false);
      data[name].hasDirections = await page.getByRole('link', { name: /Get directions/i }).first().isVisible().catch(() => false);
      data[name].hasContactForm = await page.locator('#message').isVisible().catch(() => false);
    }

    await page.screenshot({ path: path.join(OUT, `review-${key}.png`), fullPage: name === 'contact' });
    if (name === 'home') {
      await page.screenshot({ path: path.join(OUT, `review-${key}-hero.png`), fullPage: false });
    }
  }
  return data;
}

// Desktop
const desktop = await browser.newPage({ viewport: { width: 1280, height: 800 } });
desktop.on('pageerror', (e) => report.errors.push(`desktop: ${e.message}`));
report.desktop = await auditPage(desktop, 'desktop', { width: 1280, height: 800 });

// Mobile iPhone 13
const iphone = devices['iPhone 13'];
const mobile = await browser.newPage({ ...iphone });
mobile.on('pageerror', (e) => report.errors.push(`mobile: ${e.message}`));
report.mobile = await auditPage(mobile, 'mobile', iphone.viewport);

// Product detail — first product link from shop
await mobile.goto(`${BASE}/shop`, { waitUntil: 'domcontentloaded' });
await mobile.waitForTimeout(3000);
const productLink = mobile.locator('a[href*="/product/"]').first();
if (await productLink.count()) {
  await productLink.click();
  await mobile.waitForTimeout(3000);
  report.mobile.pdp = {
    url: mobile.url(),
    hasStickyBar: await mobile.locator('[class*="sticky"], [class*="fixed"]').filter({ hasText: /Add|Buy/i }).first().isVisible().catch(() => false),
    hasGallery: await mobile.locator('img').first().isVisible().catch(() => false),
  };
  await mobile.screenshot({ path: path.join(OUT, 'review-mobile-pdp.png'), fullPage: false });
}

await desktop.goto(`${BASE}/shop`, { waitUntil: 'domcontentloaded' });
await desktop.waitForTimeout(3000);
const dProduct = desktop.locator('a[href*="/product/"]').first();
if (await dProduct.count()) {
  await dProduct.click();
  await desktop.waitForTimeout(3000);
  report.desktop.pdp = { url: desktop.url() };
  await desktop.screenshot({ path: path.join(OUT, 'review-desktop-pdp.png'), fullPage: false });
}

await browser.close();
console.log(JSON.stringify(report, null, 2));
