import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  compileCatalogue,
  defaultCatalogueOptions,
  FORMAT_PROFILES,
  slugify,
} from '../cloudflare/cataloguePdf.js';
import { resolveVariantPricing } from '../cloudflare/catalogue/pricing.js';
import { buildPagePlan } from '../cloudflare/catalogue/pagePlan.js';
import { buildCatalogueSnapshot } from '../cloudflare/catalogue/snapshot.js';
import { optimizeImage } from '../cloudflare/catalogue/utils.js';

const categories = [
  { id: 'c1', name: 'Millets', slug: 'millets', sort_order: 10, is_hero_category: true, parent_id: null, homepage_description: 'Nourishing millet staples.' },
  { id: 'c2', name: 'Snacks', slug: 'snacks', sort_order: 20, is_hero_category: true, parent_id: null, cover_image: 'https://media.yasvik.com/snacks.jpg' },
];

const products = [
  {
    id: 'p1',
    name: 'Foxtail Millet',
    local_name: 'కొర్రలు',
    slug: 'foxtail-millet',
    short_description: 'Whole grain millet',
    category_id: 'c1',
    is_published: true,
    sell_online: true,
    show_in_public_catalogue: true,
    exclude_from_catalogues: false,
    featured_image_url: 'https://media.yasvik.com/example.jpg',
    quick_variants: [
      { label: '1 kg', price: 120, compare_price: 160, stock: 10 },
      { label: '__yasvik_pricing__', price: 0, stock: 0 },
    ],
    purity_badges: ['Organic'],
    catalogue_priority: 10,
    sort_order: 1,
    created_at: '2026-07-01T00:00:00.000Z',
  },
  {
    id: 'p2',
    name: 'Hidden product',
    local_name: 'దాచిన',
    slug: 'hidden',
    category_id: 'c1',
    is_published: true,
    sell_online: true,
    show_in_public_catalogue: false,
    featured_image_url: 'https://media.yasvik.com/example2.jpg',
    quick_variants: [{ label: '500 g', price: 80, compare_price: 100, stock: 5 }],
  },
  {
    id: 'p3',
    name: 'Murukku',
    local_name: 'మురుక్కు',
    slug: 'murukku',
    category_id: 'c2',
    is_published: true,
    sell_online: true,
    show_in_public_catalogue: true,
    is_featured: true,
    featured_image_url: 'https://media.yasvik.com/murukku.jpg',
    quick_variants: [{ label: '250 g', price: 90, compare_price: 110, stock: 2 }],
    catalogue_priority: 20,
    sort_order: 2,
  },
];

describe('catalogue publishing engine', () => {
  it('slugifies catalogue names', () => {
    assert.equal(slugify('Yasvik Complete Catalogue'), 'yasvik-complete-catalogue');
  });

  it('exposes format profiles', () => {
    assert.ok(FORMAT_PROFILES.a4_portrait);
    assert.ok(FORMAT_PROFILES.mobile_whatsapp);
    assert.ok(FORMAT_PROFILES.dealer_pdf);
  });

  it('keeps working R2 image URLs instead of rewriting them to a 404 resize route', () => {
    const source = 'https://media.yasvik.com/media-assets/products/example.webp';
    assert.equal(optimizeImage(source, 720), source);
  });

  it('resolves genuine MRP savings only', () => {
    const ok = resolveVariantPricing(
      { label: '1 kg', price: 129, compare_price: 199 },
      {},
      { price_mode: 'mrp_and_selling', content: { mrp: true, savings: true } },
    );
    assert.equal(ok.price, 129);
    assert.equal(ok.mrp, 199);
    assert.equal(ok.savings_amount, 70);
    assert.equal(ok.savings_pct, 35);

    const fake = resolveVariantPricing(
      { label: '1 kg', price: 129, compare_price: 100 },
      {},
      { content: { mrp: true, savings: true } },
    );
    assert.equal(fake.mrp, null);
    assert.equal(fake.savings_amount, null);
  });

  it('builds classic snapshot with MRP and excludes ineligible products', () => {
    const snapshot = buildCatalogueSnapshot({
      catalogue: {
        name: 'Classic Test',
        catalogue_type: 'customer',
        options: defaultCatalogueOptions('customer', 'classic'),
      },
      products,
      categories,
      salesRanks: [{ product_id: 'p3', units_sold: 40 }],
    });
    assert.equal(snapshot.products.length, 2);
    assert.ok(snapshot.products.every((p) => p.id !== 'p2'));
    assert.equal(snapshot.products.find((p) => p.id === 'p1').variants[0].mrp, 160);
    assert.equal(snapshot.products.find((p) => p.id === 'p1').variants[0].savings_amount, 40);
    assert.ok(snapshot.products.find((p) => p.id === 'p1').badges.includes('ORGANIC'));
    assert.ok(!JSON.stringify(snapshot.products).includes('landed_cost'));
  });

  it('plans cover, about, category heroes, grids and contact pages', () => {
    const snapshot = buildCatalogueSnapshot({
      catalogue: {
        name: 'Planned',
        catalogue_type: 'customer',
        options: defaultCatalogueOptions('customer', 'classic'),
      },
      products,
      categories,
    });
    const planned = buildPagePlan(snapshot);
    const types = planned.pages.map((p) => p.type);
    assert.ok(types.includes('cover'));
    assert.ok(types.includes('about'));
    assert.ok(types.includes('category_hero'));
    assert.ok(types.includes('product_grid'));
    assert.ok(types.includes('contact'));
    assert.equal(planned.stats.page_count, planned.pages.length);
    // cards never split: each product appears in exactly one grid page
    const productIds = planned.pages
      .filter((p) => p.type === 'product_grid')
      .flatMap((p) => p.products.map((prod) => prod.id));
    assert.equal(new Set(productIds).size, productIds.length);
  });

  it('caps classic density so product cards cannot overflow an A4 page', () => {
    const repeated = Array.from({ length: 9 }, (_, index) => ({
      ...products[0],
      id: `dense-${index}`,
      name: `Product ${index}`,
    }));
    const planned = buildPagePlan(buildCatalogueSnapshot({
      catalogue: {
        name: 'Safe density',
        catalogue_type: 'customer',
        options: {
          ...defaultCatalogueOptions('customer', 'classic'),
          products_per_page: 16,
        },
      },
      products: repeated,
      categories,
    }));
    const grids = planned.pages.filter((page) => page.type === 'product_grid');
    assert.ok(grids.every((page) => page.products.length <= 4));
    assert.equal(planned.options.products_per_page, 4);
  });

  it('renders premium HTML with page chrome, MRP and Telugu', () => {
    const { html, snapshot } = compileCatalogue({
      catalogue: {
        name: 'WhatsApp Compact',
        catalogue_type: 'whatsapp',
        options: defaultCatalogueOptions('whatsapp', 'whatsapp_compact'),
      },
      products,
      categories,
      salesRanks: [{ product_id: 'p1', units_sold: 12 }],
    });
    assert.match(html, /కొర్రలు/);
    assert.match(html, /₹120/);
    assert.match(html, /MRP/);
    assert.match(html, /Save/);
    assert.match(html, /Pack size/);
    assert.match(html, /Today's price/);
    assert.match(html, /media\.yasvik\.com\/example\.jpg/);
    assert.doesNotMatch(html, /media\.yasvik\.com\/cdn-cgi\/image/);
    assert.match(html, /page-chrome/);
    assert.match(html, /category-hero|Category/);
    assert.doesNotMatch(html, /landed_cost|gross_profit|cost_price|dealer_price/i);
    assert.ok(snapshot.pages.length >= 4);
  });

  it('gates dealer catalogues when pricing is not configured', () => {
    const { snapshot, html } = compileCatalogue({
      catalogue: {
        name: 'Dealer',
        catalogue_type: 'dealer',
        options: defaultCatalogueOptions('dealer', 'dealer_price_list'),
      },
      products: products.map((p) => ({ ...p, show_in_dealer_catalogue: true })),
      categories,
    });
    assert.equal(snapshot.dealer_gated, true);
    assert.match(html, /Pricing not configured|dealer_gated|Dealer mode/i);
  });

  it('keeps bulk-stock products when in_stock_only is set (live data shape)', () => {
    // Mirrors production: kg-pool snacks store variant stock as "0" strings while
    // the real availability lives in shared_stock_kg.
    const bulkProducts = [
      {
        id: 'b1',
        name: 'Beetroot Karapusa',
        slug: 'beetroot-karapusa',
        category_id: 'c2',
        is_published: true,
        sell_online: true,
        show_in_public_catalogue: true,
        featured_image_url: 'https://media.yasvik.com/karapusa.jpg',
        stock_measure_type: 'kg',
        shared_stock_kg: 20,
        stock_quantity: 20,
        quick_variants: [
          { label: '250g', price: '129', stock: '0', pack_kg: '0.25' },
          { label: '1kg', price: '469', stock: '0', pack_kg: '1' },
        ],
      },
      {
        id: 'b2',
        name: 'Sold Out Murukku',
        slug: 'sold-out',
        category_id: 'c2',
        is_published: true,
        sell_online: true,
        show_in_public_catalogue: true,
        featured_image_url: 'https://media.yasvik.com/soldout.jpg',
        stock_measure_type: 'kg',
        shared_stock_kg: 0,
        quick_variants: [{ label: '250g', price: '129', stock: '0', pack_kg: '0.25' }],
      },
      {
        id: 'b3',
        name: 'Putharekulu',
        slug: 'putharekulu',
        category_id: 'c2',
        is_published: true,
        sell_online: true,
        show_in_public_catalogue: true,
        featured_image_url: 'https://media.yasvik.com/putharekulu.jpg',
        stock_measure_type: 'units',
        stock_quantity: 10,
        quick_variants: [{ label: '150g', price: '129', stock: null, pack_kg: 0.15 }],
      },
    ];
    const snapshot = buildCatalogueSnapshot({
      catalogue: {
        name: 'Snacks in stock',
        catalogue_type: 'whatsapp',
        options: defaultCatalogueOptions('whatsapp', 'whatsapp_compact'),
        selection: { mode: 'selected_categories', category_ids: ['c2'], in_stock_only: true },
      },
      products: bulkProducts,
      categories,
    });
    const ids = snapshot.products.map((p) => p.id);
    assert.deepEqual(ids.sort(), ['b1', 'b3']);
    assert.equal(snapshot.products.find((p) => p.id === 'b1').availability, 'In stock');
  });

  it('shows at most one badge and hides templated duplicate descriptions', () => {
    const templated = 'Ragi-based murukulu for customers who want a more thoughtful snack. We keep it as a curated Yasvik snack, focused on taste, freshness and honest packing.';
    const dupProducts = ['a', 'b', 'c', 'd'].map((suffix, index) => ({
      id: `dup-${suffix}`,
      name: `Papad ${suffix}`,
      local_name: 'పాపడ్',
      slug: `papad-${suffix}`,
      category_id: 'c2',
      is_published: true,
      sell_online: true,
      show_in_public_catalogue: true,
      featured_image_url: `https://media.yasvik.com/papad-${suffix}.jpg`,
      purity_badges: ['Organic', 'Fresh'],
      created_at: '2026-07-18T00:00:00.000Z',
      quick_variants: [{ label: '250g', price: 109, compare_price: 169, stock: 5 }],
      short_description: templated,
      sort_order: index,
    }));
    const snapshot = buildCatalogueSnapshot({
      catalogue: {
        name: 'Badge and copy test',
        catalogue_type: 'customer',
        options: defaultCatalogueOptions('customer', 'classic'),
      },
      products: dupProducts,
      categories,
    });
    assert.ok(snapshot.products.every((p) => p.badges.length <= 1));
    assert.ok(snapshot.products.every((p) => !p.badges.includes('FRESH BATCH')));
    assert.ok(snapshot.products.every((p) => p.short_description === ''));
    assert.ok((snapshot.warnings || []).some((w) => w.code === 'duplicate_description'));
  });

  it('supports selected category filtering for curated presets', () => {
    const snapshot = buildCatalogueSnapshot({
      catalogue: {
        name: 'Snacks only',
        catalogue_type: 'customer',
        options: {
          ...defaultCatalogueOptions('customer', 'classic'),
          selection: { mode: 'selected_categories', category_slugs: ['snacks'] },
        },
        selection: { mode: 'selected_categories', category_slugs: ['snacks'] },
      },
      products,
      categories,
    });
    assert.equal(snapshot.products.length, 1);
    assert.equal(snapshot.products[0].id, 'p3');
  });

  it('supports magazine and festival designs without crashing', () => {
    for (const design of ['premium_magazine', 'festival_specials']) {
      const { html, snapshot } = compileCatalogue({
        catalogue: {
          name: design,
          catalogue_type: 'customer',
          options: defaultCatalogueOptions('customer', design),
        },
        products,
        categories,
      });
      assert.ok(html.includes('<!DOCTYPE html>'));
      assert.ok(snapshot.pages.length > 0);
    }
  });
});
