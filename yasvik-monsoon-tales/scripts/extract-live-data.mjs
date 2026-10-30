/** One-off: parse MCP SQL export files into .review-screenshots/catalogue-smoke/live-data.json */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const files = process.argv.slice(2);
if (!files.length) {
  console.error('Usage: node extract-live-data.mjs <export.txt> [...more]');
  process.exit(1);
}

const products = [];
for (const file of files) {
  let raw = readFileSync(file, 'utf8');
  try {
    const outer = JSON.parse(raw);
    if (typeof outer?.result === 'string') raw = outer.result;
  } catch { /* already plain text */ }
  const start = raw.indexOf('[{');
  const end = raw.lastIndexOf('}]');
  const jsonText = start !== -1 && end !== -1 ? raw.slice(start, end + 2) : raw;
  const parsed = JSON.parse(jsonText);
  const rows = parsed?.[0]?.jsonb_agg || [];
  products.push(...rows);
}

mkdirSync('.review-screenshots/catalogue-smoke', { recursive: true });
writeFileSync('.review-screenshots/catalogue-smoke/live-products.json', JSON.stringify(products));
console.log(`Wrote ${products.length} products`);
