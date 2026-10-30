/**
 * Dump Hero Favourites pricing for editorial preview delivery report.
 * Usage: node --env-file=.env.local scripts/dump-editorial-heroes.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const url = (process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

async function rest(path) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

function sellable(variants = []) {
  return (variants || []).filter((v) => v && !String(v.sku || '').includes('__yasvik_pricing__') && Number(v.price) > 0);
}

function priceSummary(product) {
  const variants = sellable(product.quick_variants);
  const prices = variants.map((v) => Number(v.price)).sort((a, b) => a - b);
  if (!prices.length) return { from: Number(product.price) || 0, multi: false, packs: [] };
  return {
    from: prices[0],
    multi: prices[0] !== prices[prices.length - 1],
    packs: variants.map((v) => ({ label: v.label, price: Number(v.price), stock: v.stock })),
  };
}

const MEDIA_ISSUES = {
  'cold-pressed-groundnut-oil': ['Hero filename looks AI-generated', 'Supporting gallery includes sunflower/sesame assets (wrong oils)'],
  'cold-pressed-sesame-oil': ['Supporting gallery includes sunflower oil asset'],
  'mango-pickle-avakaya': ['Hero uses generic yasvik-asset-9.webp — confirm Avakaya photography'],
  'yureka-jaggery-powder': ['Slug still yureka-branded; single hero image only'],
  'multi-floral-honey': ['Hero uses generic yasvik-asset-7.webp'],
  'organic-kattuyanam-rice': ['Single hero image — supporting gallery missing'],
};

async function main() {
  const products = await rest(
    'products?merchandising_tier=eq.hero&is_published=eq.true&sell_online=eq.true&select=id,name,slug,price,featured_image_url,quick_variants,merchandising_priority,stock_quantity,shared_stock_kg&order=merchandising_priority.asc'
  );
  const stories = await rest('storefront_stories?select=title,slug,status,poster_image_url,video_url&order=display_priority.asc');
  const flag = await rest('app_settings?setting_key=eq.editorial_storefront_public&select=setting_value');
  const memberships = await rest(
    'merchandising_collection_items?select=role,collection:merchandising_collections(slug),product:products(name,slug)'
  );

  const heroes = (products || []).map((p) => {
    const summary = priceSummary(p);
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      image: p.featured_image_url,
      list_price: Number(p.price),
      from_price: summary.from,
      price_display: summary.multi ? `From ₹${Math.round(summary.from)}` : `₹${Math.round(summary.from)}`,
      packs: summary.packs,
      stock_quantity: p.stock_quantity,
      shared_stock_kg: p.shared_stock_kg,
      media_issues: MEDIA_ISSUES[p.slug] || [],
    };
  });

  const report = {
    generated_at: new Date().toISOString(),
    editorial_storefront_public: flag?.[0]?.setting_value ?? 'missing',
    hero_count: heroes.length,
    heroes,
    stories,
    memberships: (memberships || []).map((m) => ({
      collection: m.collection?.slug,
      product: m.product?.name,
      slug: m.product?.slug,
      role: m.role,
    })),
    public_homepage_unchanged: true,
  };

  const outDir = join(__dirname, '../.review-screenshots/editorial-preview');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'hero-render-data.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ heroes: heroes.length, stories: stories.length, flag: report.editorial_storefront_public }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
