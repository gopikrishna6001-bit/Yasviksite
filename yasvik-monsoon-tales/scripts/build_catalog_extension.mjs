/**
 * Builds new Yasvik catalog products and merges into quality_catalog_v2.json.
 * Run: node scripts/build_catalog_extension.mjs
 */
import fs from 'node:fs/promises';

const CATALOG_PATH = new URL('../import-preview/quality_catalog_v2.json', import.meta.url);

const BADGES = [
  'Yasvik quality assured',
  'Fair prices guaranteed',
  'Carefully selected stock',
  'Clean packing',
];

const purityBadges = () => BADGES.map((label) => ({ label, tone: 'trust' }));

function packVariants(code, perKg, comparePerKg, stockKg, packs, smallMargin = 0) {
  return packs.map(({ label, kg }) => {
    const sell = Math.round(perKg * kg + (kg < 1 ? smallMargin : 0));
    const compare = Math.round(comparePerKg * kg + (kg < 1 ? smallMargin : 0));
    const grams = Math.round(kg * 1000);
    const suffix = label.replace(/\s+/g, '').toUpperCase();
    return {
      label,
      sku: `${code}-${suffix}`,
      price: sell,
      compare_price: compare,
      pack_kg: kg,
      weight_grams: grams,
      visible_stock_units: Math.max(1, Math.floor(stockKg / kg)),
      stock_source_kg: stockKg,
      notes: 'Shared bulk stock. Website stock deducts from product-level bulk kg.',
      image_url: '',
      image_urls: [],
    };
  });
}

function jarVariants(code, perLitre, comparePerLitre, stockLitres, sizes) {
  return sizes.map(({ label, litres }) => {
    const sell = Math.round(perLitre * litres);
    const compare = Math.round(comparePerLitre * litres);
    return {
      label,
      sku: `${code}-${label.replace(/\s+/g, '').toUpperCase()}`,
      price: sell,
      compare_price: compare,
      pack_kg: litres,
      weight_grams: Math.round(litres * 1000),
      visible_stock_units: Math.max(1, Math.floor(stockLitres / litres)),
      stock_source_kg: stockLitres,
      notes: 'Shared bulk stock. Website stock deducts from product-level bulk litres.',
      image_url: '',
      image_urls: [],
    };
  });
}

function buildProduct({
  code,
  slug,
  title,
  localName,
  category,
  perKg,
  comparePerKg = null,
  stockKg = 15,
  processing,
  bestFor,
  shortLine,
  bodyExtra = '',
  packs = [
    { label: '250g', kg: 0.25 },
    { label: '500g', kg: 0.5 },
    { label: '1kg', kg: 1 },
  ],
  smallMargin = 5,
}) {
  const compare = comparePerKg ?? Math.round(perKg * 1.12);
  const description = `${localName ? `${localName} / ` : ''}${title} is a practical kitchen essential used in ${bestFor.toLowerCase()}. When a product is part of regular cooking, quality matters: it should look clean, cook well and feel dependable for family use. At Yasvik, we keep it simple — ${bodyExtra || 'selected for dependable everyday use'}. No exaggerated claims and no unnecessary packaging burden; just carefully selected food at a fair price. Eat what’s right. Yasvik quality assured. Fair prices guaranteed.`;

  return {
    product_code: code,
    slug,
    title,
    name: title,
    local_name: localName || '',
    category_name: category,
    sku: code,
    price: perKg,
    compare_price: compare,
    currency: 'INR',
    stock: stockKg,
    stock_unit: 'kg',
    inventory_group: code,
    shared_stock_kg: stockKg,
    short_description: shortLine || `Quality-assured ${localName ? `${localName} / ` : ''}${title} for ${bestFor.toLowerCase()}.`,
    description,
    best_for: bestFor,
    storage_note: 'Store in a clean, dry, airtight container. Keep away from moisture, sunlight and strong-smelling items.',
    yasvik_mark: 'Quality assured by Yasvik • Fair prices guaranteed • Carefully selected stock • Packed for everyday use',
    delivery_card: 'Packed after order',
    pack_info_card: 'Clean packing in useful sizes',
    sourcing_card: 'Homemade and carefully selected stock',
    processing_method: processing,
    seo_title: `${title} Online | Yasvik`,
    seo_description: `Buy ${localName ? `${localName} / ` : ''}${title} from Yasvik. Eat what’s right. Yasvik quality assured. Fair prices guaranteed.`,
    seo_keywords: `${title}, ${localName || category}, ${category}, Yasvik`,
    hero_image: '',
    gallery_images: [],
    hover_media: [],
    quality_badges: BADGES,
    purity_badges: purityBadges(),
    recipe_ids: '',
    recipe_titles: '',
    recipe_links: [],
    quick_variants: packVariants(code, perKg, compare, stockKg, packs, smallMargin),
  };
}

const NEW_PRODUCTS = [
  buildProduct({
    code: 'YAS-031',
    slug: 'homemade-chilli-powder',
    title: 'Homemade Chilli Powder',
    localName: 'Mirchi Podi',
    category: 'Spices & Masalas',
    perKg: 320,
    comparePerKg: 360,
    processing: 'Homemade ground spice',
    bestFor: 'Curries, chutneys, pickles and everyday Andhra cooking',
    bodyExtra: 'homemade in small batches for fresh aroma and balanced heat',
    smallMargin: 8,
  }),
  buildProduct({
    code: 'YAS-032',
    slug: 'homemade-turmeric-powder',
    title: 'Homemade Turmeric Powder',
    localName: 'Pasupu Podi',
    category: 'Spices & Masalas',
    perKg: 180,
    comparePerKg: 210,
    processing: 'Homemade ground spice',
    bestFor: 'Curries, rasam, pickles and daily cooking',
    bodyExtra: 'homemade in small batches for natural colour and dependable flavour',
    smallMargin: 5,
  }),
  buildProduct({
    code: 'YAS-033',
    slug: 'roasted-unpolished-toor-dal',
    title: 'Roasted Unpolished Toor Dal',
    localName: 'Vepudu Kandi Pappu',
    category: 'Dals & Lentils',
    perKg: 165,
    comparePerKg: 185,
    processing: 'Roasted unpolished dal',
    bestFor: 'Pappu, sambar, dal fry and everyday Andhra meals',
    bodyExtra: 'roasted unpolished toor dal selected for nutty flavour and clean cooking',
    smallMargin: 5,
  }),
  buildProduct({
    code: 'YAS-034',
    slug: 'roasted-unpolished-moong-dal',
    title: 'Roasted Unpolished Moong Dal',
    localName: 'Vepudu Pesara Pappu',
    category: 'Dals & Lentils',
    perKg: 155,
    comparePerKg: 175,
    processing: 'Roasted unpolished dal',
    bestFor: 'Light dal, khichdi, pesarapappu kattu and family meals',
    bodyExtra: 'roasted unpolished moong dal selected for quick cooking and clean taste',
    smallMargin: 5,
  }),
  buildProduct({
    code: 'YAS-035',
    slug: 'homemade-mango-pickle',
    title: 'Homemade Mango Pickle',
    localName: 'Avakaya',
    category: 'Homemade Pickles',
    perKg: 280,
    comparePerKg: 320,
    stockKg: 12,
    processing: 'Homemade pickle',
    bestFor: 'Rice, curd rice, chapati and everyday meals',
    bodyExtra: 'homemade mango pickle with traditional spice balance',
    packs: [
      { label: '250g', kg: 0.25 },
      { label: '500g', kg: 0.5 },
      { label: '1kg', kg: 1 },
    ],
    smallMargin: 10,
  }),
  buildProduct({
    code: 'YAS-036',
    slug: 'homemade-lemon-pickle',
    title: 'Homemade Lemon Pickle',
    localName: 'Nimmakaya Uragaya',
    category: 'Homemade Pickles',
    perKg: 260,
    comparePerKg: 295,
    stockKg: 10,
    processing: 'Homemade pickle',
    bestFor: 'Rice, curd rice and side dishes',
    bodyExtra: 'homemade lemon pickle with bright tang and family-recipe spice',
    packs: [
      { label: '250g', kg: 0.25 },
      { label: '500g', kg: 0.5 },
    ],
    smallMargin: 10,
  }),
  buildProduct({
    code: 'YAS-037',
    slug: 'homemade-mixed-veg-pickle',
    title: 'Homemade Mixed Vegetable Pickle',
    localName: 'Pachadi Uragaya',
    category: 'Homemade Pickles',
    perKg: 240,
    comparePerKg: 275,
    stockKg: 10,
    processing: 'Homemade pickle',
    bestFor: 'Everyday meals, tiffins and side plates',
    bodyExtra: 'homemade mixed vegetable pickle with crunchy texture and balanced spice',
    packs: [
      { label: '250g', kg: 0.25 },
      { label: '500g', kg: 0.5 },
    ],
    smallMargin: 10,
  }),
  {
    ...buildProduct({
      code: 'YAS-038',
      slug: 'cold-pressed-groundnut-oil',
      title: 'Cold Pressed Groundnut Oil',
      localName: 'Verusenaga Nune',
      category: 'Cold Pressed Oils',
      perKg: 420,
      comparePerKg: 470,
      stockKg: 20,
      processing: 'Wood / cold pressed oil',
      bestFor: 'Frying, tadka, pickles and traditional cooking',
      bodyExtra: 'slow cold-pressed groundnut oil for native aroma',
      packs: [],
      smallMargin: 0,
    }),
    price: 420,
    compare_price: 470,
    stock: 20,
    stock_unit: 'litre',
    shared_stock_kg: 20,
    quick_variants: jarVariants('YAS-038', 420, 470, 20, [
      { label: '500ml', litres: 0.5 },
      { label: '1L', litres: 1 },
      { label: '5L', litres: 5 },
    ]),
  },
  {
    ...buildProduct({
      code: 'YAS-039',
      slug: 'cold-pressed-sesame-oil',
      title: 'Cold Pressed Sesame Oil',
      localName: 'Nuvvula Nune',
      category: 'Cold Pressed Oils',
      perKg: 580,
      comparePerKg: 650,
      stockKg: 15,
      processing: 'Wood / cold pressed oil',
      bestFor: 'Pooja, pickles, chutneys and flavour-rich cooking',
      bodyExtra: 'slow cold-pressed sesame oil with deep traditional aroma',
      packs: [],
    }),
    stock_unit: 'litre',
    quick_variants: jarVariants('YAS-039', 580, 650, 15, [
      { label: '500ml', litres: 0.5 },
      { label: '1L', litres: 1 },
    ]),
  },
  {
    ...buildProduct({
      code: 'YAS-040',
      slug: 'cold-pressed-coconut-oil',
      title: 'Cold Pressed Coconut Oil',
      localName: 'Kobbari Nune',
      category: 'Cold Pressed Oils',
      perKg: 450,
      comparePerKg: 510,
      stockKg: 15,
      processing: 'Cold pressed oil',
      bestFor: 'Cooking, hair care and traditional home use',
      bodyExtra: 'cold-pressed coconut oil selected for clean aroma',
      packs: [],
    }),
    stock_unit: 'litre',
    quick_variants: jarVariants('YAS-040', 450, 510, 15, [
      { label: '500ml', litres: 0.5 },
      { label: '1L', litres: 1 },
    ]),
  },
  buildProduct({
    code: 'YAS-041',
    slug: 'raw-forest-honey',
    title: 'Raw Forest Honey',
    localName: 'Adavi Teepi',
    category: 'Honey',
    perKg: 650,
    comparePerKg: 720,
    stockKg: 8,
    processing: 'Raw honey',
    bestFor: 'Morning drinks, home remedies and natural sweetening',
    bodyExtra: 'raw forest honey selected for natural sweetness and clean sourcing',
    packs: [
      { label: '250g', kg: 0.25 },
      { label: '500g', kg: 0.5 },
      { label: '1kg', kg: 1 },
    ],
    smallMargin: 15,
  }),
  buildProduct({
    code: 'YAS-042',
    slug: 'a2-desi-cow-ghee',
    title: 'A2 Desi Cow Ghee',
    localName: 'A2 Neyyi',
    category: 'Ghee',
    perKg: 720,
    comparePerKg: 820,
    stockKg: 10,
    processing: 'Traditional ghee',
    bestFor: 'Cooking, sweets, rice and festive meals',
    bodyExtra: 'A2 desi cow ghee prepared in small batches for rich aroma',
    packs: [
      { label: '250g', kg: 0.25 },
      { label: '500g', kg: 0.5 },
      { label: '1kg', kg: 1 },
    ],
    smallMargin: 20,
  }),
  buildProduct({
    code: 'YAS-043',
    slug: 'homemade-murukku',
    title: 'Homemade Murukku',
    localName: 'Murukulu',
    category: 'Homemade Snacks',
    perKg: 380,
    comparePerKg: 430,
    stockKg: 8,
    processing: 'Homemade snack',
    bestFor: 'Tea-time, festivals and family snacking',
    bodyExtra: 'homemade murukku fried fresh in small batches',
    packs: [
      { label: '250g', kg: 0.25 },
      { label: '500g', kg: 0.5 },
    ],
    smallMargin: 12,
  }),
  buildProduct({
    code: 'YAS-044',
    slug: 'homemade-spicy-mixture',
    title: 'Homemade Spicy Mixture',
    localName: 'Karapu Mixture',
    category: 'Homemade Snacks',
    perKg: 340,
    comparePerKg: 390,
    stockKg: 8,
    processing: 'Homemade snack',
    bestFor: 'Evening snacks, travel packs and festival sharing',
    bodyExtra: 'homemade spicy mixture with crisp texture and balanced masala',
    packs: [
      { label: '250g', kg: 0.25 },
      { label: '500g', kg: 0.5 },
    ],
    smallMargin: 12,
  }),
  buildProduct({
    code: 'YAS-045',
    slug: 'organic-red-rice',
    title: 'Organic Red Rice',
    localName: 'Organic Erra Biyyam',
    category: 'Organic Essentials',
    perKg: 95,
    comparePerKg: 110,
    stockKg: 25,
    processing: 'Organic whole grain',
    bestFor: 'Daily rice meals and healthier family plates',
    bodyExtra: 'certified organic red rice selected for clean grains and dependable cooking',
    smallMargin: 5,
  }),
  buildProduct({
    code: 'YAS-046',
    slug: 'organic-jaggery-powder',
    title: 'Organic Jaggery Powder',
    localName: 'Organic Bellam Podi',
    category: 'Organic Essentials',
    perKg: 120,
    comparePerKg: 140,
    stockKg: 15,
    processing: 'Organic sweetener',
    bestFor: 'Tea, coffee, sweets and natural sweetening',
    bodyExtra: 'certified organic jaggery powder for clean everyday sweetening',
    smallMargin: 5,
  }),
];

const raw = await fs.readFile(CATALOG_PATH, 'utf8');
const catalog = JSON.parse(raw);
const existingSlugs = new Set(catalog.products.map((p) => p.slug));
const toAdd = NEW_PRODUCTS.filter((p) => !existingSlugs.has(p.slug));

if (toAdd.length === 0) {
  console.log('All extension products already present in catalog.');
  process.exit(0);
}

catalog.products.push(...toAdd);
catalog.extension_added_at = new Date().toISOString();
catalog.extension_count = toAdd.length;

await fs.writeFile(CATALOG_PATH, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');

console.log(`Added ${toAdd.length} products to quality_catalog_v2.json`);
console.log('New categories:', [...new Set(toAdd.map((p) => p.category_name))].join(', '));
console.log('New slugs:', toAdd.map((p) => p.slug).join(', '));
