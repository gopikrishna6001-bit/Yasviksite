/**
 * Live smoke test for the catalogue publishing engine.
 * Pulls real product/category rows (same query the worker uses) and compiles
 * every curated preset locally, reporting product/page counts and warnings.
 *
 * Usage: node scripts/smoke-catalogue-live.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { compileCatalogue, defaultCatalogueOptions, CATALOGUE_PRESETS } from '../cloudflare/cataloguePdf.js';

const products = JSON.parse(readFileSync('.review-screenshots/catalogue-smoke/live-products.json', 'utf8'));
const categories = JSON.parse(readFileSync('.review-screenshots/catalogue-smoke/live-categories.json', 'utf8'));

console.log(`Fetched ${products.length} products, ${categories.length} categories\n`);

mkdirSync('.review-screenshots/catalogue-smoke', { recursive: true });

const runs = [
  // Reproduces the exact saved "Yasvik Snacks Catalogues" config (parent category id + in_stock_only).
  {
    label: 'SAVED: Yasvik Snacks Catalogues (whatsapp, in_stock_only)',
    catalogue: {
      name: 'Yasvik Snacks Catalogues',
      catalogue_type: 'whatsapp',
      options: defaultCatalogueOptions('whatsapp', 'whatsapp_compact'),
      selection: {
        mode: 'selected_categories',
        category_ids: ['0497f65f-4a16-4b95-b896-d3b5a8d10989'],
        product_ids: [],
        in_stock_only: true,
      },
    },
  },
  ...CATALOGUE_PRESETS.map((preset) => ({
    label: `PRESET: ${preset.name}`,
    catalogue: {
      name: preset.name,
      catalogue_type: preset.catalogue_type,
      options: {
        ...defaultCatalogueOptions(preset.catalogue_type, preset.design),
        selection: preset.selection,
      },
      selection: preset.selection,
    },
  })),
];

let failures = 0;
for (const run of runs) {
  try {
    const { snapshot, html } = compileCatalogue({ catalogue: run.catalogue, products, categories });
    const warnCodes = {};
    for (const w of snapshot.warnings || []) warnCodes[w.code] = (warnCodes[w.code] || 0) + 1;
    const grids = snapshot.pages.filter((p) => p.type === 'product_grid' || p.type === 'dealer_list');
    const gridProducts = grids.reduce((n, p) => n + (p.products?.length || 0), 0);

    const ok = snapshot.dealer_gated || (snapshot.products.length >= 2 && gridProducts === snapshot.products.length);
    if (!ok) failures += 1;

    console.log(`${ok ? 'PASS' : 'FAIL'}  ${run.label}`);
    console.log(`      products=${snapshot.products.length} categories=${snapshot.categories.length} pages=${snapshot.pages.length} on-grid=${gridProducts}${snapshot.dealer_gated ? ' (dealer gated)' : ''}`);
    if (Object.keys(warnCodes).length) console.log(`      warnings: ${JSON.stringify(warnCodes)}`);

    const file = `.review-screenshots/catalogue-smoke/${run.catalogue.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.html`;
    writeFileSync(file, html);
  } catch (err) {
    failures += 1;
    console.log(`FAIL  ${run.label}\n      ${err.message}`);
  }
}

console.log(`\n${failures ? `${failures} run(s) FAILED` : 'All runs passed'}`);
process.exit(failures ? 1 : 0);
