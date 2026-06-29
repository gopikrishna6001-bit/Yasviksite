import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:5173';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

const report = { home: {}, shopNow: {}, browseCategories: {}, headerWhatsApp: {}, heroWhatsApp: {} };

// --- Homepage load ---
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(6000);

report.home.url = page.url();
report.home.eyebrow = await page.locator('text=Natural Foods & Everyday Essentials').first().isVisible().catch(() => false);
report.home.h1 = await page.locator('h1').first().innerText().catch(() => '');
report.home.shopNowVisible = await page.getByRole('link', { name: 'Shop Now' }).first().isVisible().catch(() => false);
report.home.browseCategoriesVisible = await page.getByRole('link', { name: 'Browse Categories' }).first().isVisible().catch(() => false);
report.home.brandChips = await page.locator('text=Honest Quality').isVisible().catch(() => false);
report.home.deliveryNote = await page.locator('text=/Free home delivery/i').first().isVisible().catch(() => false);

// Hero must NOT have WhatsApp order button
const heroSection = page.locator('section').filter({ has: page.locator('h1') }).first();
report.heroWhatsApp.orderButtonInHero = await heroSection.getByRole('link', { name: /WhatsApp/i }).count();
report.heroWhatsApp.waMeInHero = await heroSection.locator('a[href*="wa.me"]').count();

// Header WhatsApp should still exist
report.headerWhatsApp.iconOrLink = await page.locator('header a[href*="wa.me"]').count();

await page.screenshot({ path: '.review-screenshots/qa-hero-desktop.png', fullPage: false });

// --- Shop Now CTA ---
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
await page.getByRole('link', { name: 'Shop Now' }).first().click();
await page.waitForTimeout(2500);
report.shopNow.urlAfterClick = page.url();
report.shopNow.onShopPage = page.url().includes('/shop');
report.shopNow.shopHeading = await page.locator('text=/Everyday essentials/i').first().isVisible().catch(() => false);

await page.screenshot({ path: '.review-screenshots/qa-after-shop-now.png', fullPage: false });

// --- Browse Categories CTA ---
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
await page.getByRole('link', { name: 'Browse Categories' }).first().click();
await page.waitForTimeout(2000);

report.browseCategories.urlAfterClick = page.url();
report.browseCategories.hash = new URL(page.url()).hash;
report.browseCategories.categoriesHeadingVisible = await page.locator('#home-categories-heading').isVisible().catch(() => false);
report.browseCategories.shopByCategoryVisible = await page.locator('text=Shop by category').first().isVisible().catch(() => false);

const catBox = await page.locator('#home-categories-heading').boundingBox().catch(() => null);
const viewport = page.viewportSize();
report.browseCategories.headingInViewport = catBox
  ? catBox.y >= 0 && catBox.y < (viewport?.height ?? 800)
  : false;

await page.screenshot({ path: '.review-screenshots/qa-after-browse-categories.png', fullPage: false });

// Mobile pass
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
await mobile.waitForTimeout(5000);
await mobile.screenshot({ path: '.review-screenshots/qa-hero-mobile.png', fullPage: false });
report.home.mobileH1 = await mobile.locator('h1').first().innerText().catch(() => '');
report.home.mobileBothCTAs =
  (await mobile.getByRole('link', { name: 'Shop Now' }).first().isVisible()) &&
  (await mobile.getByRole('link', { name: 'Browse Categories' }).first().isVisible());

report.consoleErrors = errors;

console.log(JSON.stringify(report, null, 2));

await browser.close();
