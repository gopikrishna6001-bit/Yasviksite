import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = __dirname;
const baseUrl = 'http://127.0.0.1:5173/';

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });

async function capture(page, name, options = {}) {
  const file = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: options.fullPage ?? false });
  console.log(file);
}

// Desktop full page
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1500);
  await capture(page, '01-desktop-full', { fullPage: true });
  await context.close();
}

// Mobile full page
{
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1500);
  await capture(page, '02-mobile-full', { fullPage: true });
  await context.close();
}

// Section crops - desktop
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1500);

  const sections = [
    { name: '03-hero', selector: 'section:first-of-type' },
    { name: '04-trust-strip', selector: '[aria-label="Why families trust Yasvik"]' },
    { name: '05-categories', selector: '#categories, [id*="categor"]' },
    { name: '06-featured', selector: '#featured' },
    { name: '07-local-store', selector: '#local-store, [aria-labelledby*="local"], section:has(a[href*="wa.me"])' },
  ];

  for (const { name, selector } of sections) {
    const loc = page.locator(selector).first();
    if (await loc.count()) {
      await loc.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      const file = path.join(outDir, `${name}.png`);
      await loc.screenshot({ path: file });
      console.log(file);
    } else {
      console.warn(`Missing section: ${name} (${selector})`);
    }
  }

  await context.close();
}

// Mobile section crops
{
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1500);

  const sections = [
    { name: '08-mobile-hero', selector: 'section:first-of-type' },
    { name: '09-mobile-categories', selector: '#categories, [id*="categor"]' },
    { name: '10-mobile-featured', selector: '#featured' },
    { name: '11-mobile-local-store', selector: '#local-store, section:has(a[href*="wa.me"])' },
  ];

  for (const { name, selector } of sections) {
    const loc = page.locator(selector).first();
    if (await loc.count()) {
      await loc.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      const file = path.join(outDir, `${name}.png`);
      await loc.screenshot({ path: file });
      console.log(file);
    }
  }

  await context.close();
}

await browser.close();
