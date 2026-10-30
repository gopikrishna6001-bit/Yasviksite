/** Render smoke-test HTML files to PDF locally with the same options Browser Run uses. */
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { compileCatalogue, defaultCatalogueOptions } from '../cloudflare/cataloguePdf.js';

const products = JSON.parse(readFileSync('.review-screenshots/catalogue-smoke/live-products.json', 'utf8'));
const categories = JSON.parse(readFileSync('.review-screenshots/catalogue-smoke/live-categories.json', 'utf8'));

const targets = [
  {
    file: 'snacks-whatsapp',
    catalogue: {
      name: 'Yasvik Snacks Catalogues',
      catalogue_type: 'whatsapp',
      options: defaultCatalogueOptions('whatsapp', 'whatsapp_compact'),
      selection: {
        mode: 'selected_categories',
        category_ids: ['0497f65f-4a16-4b95-b896-d3b5a8d10989'],
        in_stock_only: true,
      },
    },
  },
  {
    file: 'snacks-classic',
    catalogue: {
      name: 'Snacks Catalogue',
      catalogue_type: 'customer',
      options: {
        ...defaultCatalogueOptions('customer', 'classic'),
        selection: { mode: 'selected_categories', category_slugs: ['snacks'], in_stock_only: false },
      },
      selection: { mode: 'selected_categories', category_slugs: ['snacks'], in_stock_only: false },
    },
  },
];

const browser = await chromium.launch();
for (const target of targets) {
  const { html, snapshot, pdfOptions } = compileCatalogue({ catalogue: target.catalogue, products, categories });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await page.pdf({
    path: `.review-screenshots/catalogue-smoke/${target.file}.pdf`,
    width: pdfOptions.width,
    height: pdfOptions.height,
    printBackground: true,
    margin: { top: 0, bottom: 0, left: 0, right: 0 },
  });
  await page.screenshot({ path: `.review-screenshots/catalogue-smoke/${target.file}-page1.png`, fullPage: false });
  console.log(`${target.file}: ${snapshot.products.length} products, ${snapshot.pages.length} pages → PDF written`);
  await page.close();
}
await browser.close();
