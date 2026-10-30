import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../.review-screenshots/editorial-preview');
const BASE = process.env.PREVIEW_BASE || 'http://127.0.0.1:5173';

mkdirSync(OUT, { recursive: true });

async function shot(page, name) {
  const path = join(OUT, name);
  await page.screenshot({ path, fullPage: true });
  console.log('wrote', path);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const desktop = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const dPage = await desktop.newPage();
  await dPage.goto(`${BASE}/__editorial-preview`, { waitUntil: 'networkidle', timeout: 60000 });
  await dPage.waitForTimeout(2500);
  await shot(dPage, '01-desktop-full.png');
  await dPage.locator('section[aria-label="Campaign"]').screenshot({ path: join(OUT, '02-desktop-campaign.png') }).catch(() => {});
  await dPage.locator('#editorial-favourites-heading').scrollIntoViewIfNeeded();
  await dPage.waitForTimeout(500);
  await shot(dPage, '03-desktop-favourites.png');

  // Story viewer
  const storyBtn = dPage.locator('[data-story-id]').first();
  if (await storyBtn.count()) {
    await storyBtn.click();
    await dPage.waitForTimeout(800);
    await dPage.screenshot({ path: join(OUT, '04-desktop-story-viewer.png') });
    await dPage.keyboard.press('Escape').catch(() => {});
    const close = dPage.getByLabel('Close');
    if (await close.count()) await close.click();
    await dPage.waitForTimeout(400);
  }

  // Public homepage regression — should NOT look like editorial favourites label
  await dPage.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 60000 });
  await dPage.waitForTimeout(2000);
  await shot(dPage, '05-public-home-unchanged.png');
  const editorialLabel = await dPage.locator('text=Stories from the journey').count();
  const promiseTicker = await dPage.locator('text=We Look').count();
  console.log(JSON.stringify({ publicHasEditorialStories: editorialLabel > 0, publicHasPromiseTicker: promiseTicker > 0 }));

  const mPage = await mobile.newPage();
  await mPage.goto(`${BASE}/__editorial-preview`, { waitUntil: 'networkidle', timeout: 60000 });
  await mPage.waitForTimeout(2500);
  await shot(mPage, '06-mobile-full.png');
  await mPage.locator('section[aria-label="Campaign"]').screenshot({ path: join(OUT, '07-mobile-campaign.png') }).catch(() => {});
  const mStory = mPage.locator('[data-story-id]').first();
  if (await mStory.count()) {
    await mStory.click();
    await mPage.waitForTimeout(800);
    await mPage.screenshot({ path: join(OUT, '08-mobile-story-viewer.png') });
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
