import fs from 'node:fs';
import path from 'node:path';
import { buildMetaCatalogCsv } from '../lib/metaCatalogFeedCore.mjs';
import { loadPublicSnapshotWithFallback } from './seo/publicSnapshot.mjs';

const rootDir = process.cwd();
const outputDir = path.join(rootDir, 'public', 'catalog');
const outputPath = path.join(outputDir, 'meta-feed.csv');
const canonicalOrigin = 'https://www.yasvik.com';
const mediaBase = 'https://media.yasvik.com';

async function fetchPublishedProducts() {
  const snapshot = await loadPublicSnapshotWithFallback();
  const products = (snapshot.data?.products || []).filter((row) => row?.is_published);
  if (!Array.isArray(products) || products.length === 0) return [];
  const imageRows = snapshot.data?.product_images || [];

  const imagesByProduct = new Map();
  (imageRows || []).forEach((row) => {
    const list = imagesByProduct.get(row.product_id) || [];
    list.push(row);
    imagesByProduct.set(row.product_id, list);
  });

  return products.map((product) => {
    const imageList = imagesByProduct.get(product.id) || [];
    const primary = imageList.find((img) => img.is_primary) || imageList[0];
    const gallery = imageList.map((img) => img.image_url).filter(Boolean);
    return {
      ...product,
      featured_image_url: primary?.image_url || product.featured_image_url || '',
      images: gallery,
      hero_image: primary?.image_url || product.featured_image_url || gallery[0] || '',
    };
  });
}

async function main() {
  const products = await fetchPublishedProducts();
  const csv = buildMetaCatalogCsv(products, {
    siteOrigin: canonicalOrigin,
    mediaBase,
  });

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, csv, 'utf8');
  const rowCount = Math.max(0, csv.split('\n').length - 2);
  console.log(`[meta-catalog] wrote ${rowCount} catalog items to ${outputPath}`);
}

main().catch((error) => {
  console.error('[meta-catalog] failed', error);
  process.exit(1);
});
