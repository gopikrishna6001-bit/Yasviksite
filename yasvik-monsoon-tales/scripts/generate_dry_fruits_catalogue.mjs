/**
 * Dry Fruits, Nuts & Seeds catalogue definition + SQL generator.
 * Run: node scripts/generate_dry_fruits_catalogue.mjs
 *
 * Safe by design:
 * - New products insert as is_published=false, sell_online=false, price=0
 * - Existing live products only get copy/category/storage/SEO updates (no price/stock/image wipe except Anjeer wrong hero clear)
 * - No supplier brand names in customer copy
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../data/dry-fruits-catalogue');
const ROOT = 'bdba5b32-71e3-4f05-b852-c7902860effb';
const CAT = {
  nuts: 'c29eefa3-705b-4d61-8ecf-569996952057',
  seeds: '7db503f0-9dc7-43ee-beca-59fa06561ced',
  driedFruits: 'e7a1c2d3-4b5e-6f70-8192-a3b4c5d6e701',
  dates: 'e7a1c2d3-4b5e-6f70-8192-a3b4c5d6e702',
  makhana: 'e7a1c2d3-4b5e-6f70-8192-a3b4c5d6e703',
  flavoured: 'e7a1c2d3-4b5e-6f70-8192-a3b4c5d6e704',
  mixedSeeds: 'e7a1c2d3-4b5e-6f70-8192-a3b4c5d6e705',
  combos: 'e7a1c2d3-4b5e-6f70-8192-a3b4c5d6e706',
  giftBoxes: 'e7a1c2d3-4b5e-6f70-8192-a3b4c5d6e707',
};

const STORAGE_DEFAULT =
  'Store in a cool, dry place in an airtight container. Refrigeration is recommended after opening during warm or humid weather.';

function esc(value) {
  if (value == null) return 'NULL';
  // Avoid bare semicolons in literals — naive SQL splitters / some tooling break on them.
  const cleaned = String(value).replace(/;/g, ' —');
  return `'${cleaned.replace(/'/g, "''")}'`;
}

function packKg(label) {
  const t = String(label).toLowerCase().replace(/\s+/g, '');
  if (t.endsWith('kg') && !t.endsWith('g')) return Number(t.replace('kg', ''));
  if (t.endsWith('g')) return Number(t.replace('g', '')) / 1000;
  return null;
}

function buildVariants(labels, skuBase, { unitPack = false } = {}) {
  const meta = {
    sku: '__yasvik_pricing__',
    label: '__yasvik_pricing__',
    notes: JSON.stringify({
      purchase_rate_per_kg: null,
      pricing_band: 'mid',
      store_tier: 'mid',
      web_tier: 'wmid',
      selling_price_per_kg: null,
      store_selling_price_per_kg: null,
      price_inflate_percent: '30',
      store_price_inflate_percent: '30',
      small_pack_margin_rs: '0',
      pack_charm_mode: 'nine',
    }),
  };
  const packs = labels.map((label) => {
    const code = String(label).toUpperCase().replace(/\s+/g, '') || 'PACK';
    return {
      sku: `${skuBase}-${code}`.slice(0, 64),
      label,
      pack_kg: unitPack ? 1 : packKg(label),
      price: 0,
      stock: 0,
      image_url: '',
      image_urls: [],
      notes: unitPack
        ? 'Packaged combo unit stock. Draft — set cost before publish. Components are not auto-deducted.'
        : 'Shared bulk stock; deduct website stock from bulk inventory. Draft — set cost in Pricing Strategy before publish.',
    };
  });
  return [meta, ...packs];
}

/** Existing products to update (keep slug / publish / prices / stock). */
const UPDATES = [
  {
    slug: 'badam-almonds',
    name: 'Almonds',
    local_name: 'బాదం / Badam',
    category_id: CAT.nuts,
    short_description:
      'Crunchy everyday almonds suitable for snacking, soaking, desserts and home cooking.',
    description:
      'Yasvik Almonds are selected for everyday family use. Enjoy them directly, soak them overnight, add them to breakfast bowls or use them in sweets and savoury recipes. Packed in practical quantities so you can choose according to household consumption.\n\nConscious foods for modern living — useful pack sizes for Hyderabad kitchens. Subject to availability.',
    storage_note: STORAGE_DEFAULT,
    seo_title: 'Buy Almonds Online in Hyderabad | Yasvik',
    seo_description:
      'Shop almonds in practical pack sizes from Yasvik. Suitable for soaking, snacking, sweets and everyday cooking, with Hyderabad delivery subject to availability.',
    seo_keywords: 'almonds, badam, nuts, dry fruits, buy almonds Hyderabad, Yasvik',
    allergen_info: 'Contains tree nuts (almonds).',
    subject_to_availability: true,
  },
  {
    slug: 'cashews',
    name: 'Cashew Nuts',
    local_name: 'జీడిపప్పు / Kaju',
    category_id: CAT.nuts,
    short_description:
      'Creamy cashew nuts for everyday snacking, sweets, gravies and festive cooking.',
    description:
      'Whole cashew nuts for snacking, sweets, gravies and festive cooking. Choose the pack size that matches how often your kitchen uses kaju.\n\nSubject to availability.',
    storage_note: STORAGE_DEFAULT,
    seo_title: 'Buy Cashew Nuts Online in Hyderabad | Yasvik',
    seo_description:
      'Shop cashew nuts in useful pack sizes from Yasvik for snacking, sweets and cooking. Hyderabad delivery subject to availability.',
    seo_keywords: 'cashew, kaju, cashew nuts, nuts, dry fruits, Yasvik Hyderabad',
    allergen_info: 'Contains tree nuts (cashew).',
    subject_to_availability: true,
  },
  {
    slug: 'salted-pista',
    name: 'Pistachios – Salted',
    local_name: 'ఉప్పు పిస్తా',
    category_id: CAT.nuts,
    short_description:
      'Lightly salted pistachios in shell for relaxed snacking and serving guests.',
    description:
      'Salted pistachios in shell for everyday snacking and guest trays. A savoury dry-fruit option in practical pack sizes.\n\nSubject to availability.',
    storage_note: STORAGE_DEFAULT,
    seo_title: 'Buy Salted Pistachios Online in Hyderabad | Yasvik',
    seo_description:
      'Shop lightly salted pistachios in shell from Yasvik. Useful pack sizes for snacking and hosting, with Hyderabad delivery subject to availability.',
    seo_keywords: 'pistachio, pista, salted nuts, salted pistachios, Yasvik Hyderabad',
    allergen_info: 'Contains tree nuts (pistachio). May contain traces of other nuts.',
    ingredients: 'Pistachios, salt.',
    subject_to_availability: true,
  },
  {
    slug: 'walnuts',
    name: 'Walnut Kernels',
    local_name: 'అఖ్రోట్ / Walnut',
    category_id: CAT.nuts,
    short_description:
      'Walnut kernels with a naturally earthy flavour, suitable for snacking, baking and breakfast bowls.',
    description:
      'Shelled walnut kernels for snacking, baking and breakfast bowls. Keep sealed and cool after opening to protect flavour.\n\nSubject to availability.',
    storage_note: STORAGE_DEFAULT,
    seo_title: 'Buy Walnut Kernels Online in Hyderabad | Yasvik',
    seo_description:
      'Shop walnut kernels from Yasvik for snacking, baking and breakfast bowls. Pack sizes for Hyderabad households; subject to availability.',
    seo_keywords: 'walnut, akhrot, walnut kernels, nuts, Yasvik Hyderabad',
    allergen_info: 'Contains tree nuts (walnut).',
    subject_to_availability: true,
  },
  {
    slug: 'anjeer-rvnea',
    name: 'Dried Figs',
    local_name: 'అంజీర్ / Anjeer',
    category_id: CAT.driedFruits,
    short_description:
      'Naturally chewy dried figs for snacking, soaking, desserts and traditional preparations.',
    description:
      'Dried figs (anjeer) with a soft, chewy bite for snacking, soaking, desserts and traditional recipes. Packed for everyday pantry use.\n\nSubject to availability.',
    storage_note: STORAGE_DEFAULT,
    seo_title: 'Buy Dried Figs (Anjeer) Online in Hyderabad | Yasvik',
    seo_description:
      'Shop dried figs (anjeer) from Yasvik in useful pack sizes for snacking, soaking and desserts. Hyderabad delivery subject to availability.',
    seo_keywords: 'anjeer, dried figs, dried fruit, buy anjeer Hyderabad, Yasvik',
    clear_wrong_hero: true,
    subject_to_availability: true,
  },
  {
    slug: 'green-raisins',
    name: 'Golden Raisins',
    local_name: 'కిస్మిస్ / Kishmish',
    category_id: CAT.driedFruits,
    short_description:
      'Sweet golden raisins for snacking, pulao, sweets, baking and breakfast dishes.',
    description:
      'Golden raisins (kishmish) for snacking, pulao, sweets, baking and breakfast dishes. A familiar dry fruit in practical pack sizes.\n\nSubject to availability.',
    storage_note: STORAGE_DEFAULT,
    seo_title: 'Buy Golden Raisins Online in Hyderabad | Yasvik',
    seo_description:
      'Shop golden raisins (kishmish) from Yasvik for snacking, cooking and sweets. Useful packs with Hyderabad delivery subject to availability.',
    seo_keywords: 'raisins, kishmish, golden raisins, green raisins, dried fruit, Yasvik',
    subject_to_availability: true,
  },
  {
    slug: 'black-raisins',
    name: 'Black Raisins',
    local_name: 'నల్ల కిస్మిస్',
    category_id: CAT.driedFruits,
    short_description:
      'Soft, naturally sweet black raisins suited to soaking, snacking and traditional recipes.',
    description:
      'Black raisins for soaking, snacking and traditional recipes. Soft texture with natural sweetness — choose the pack that matches how you cook.\n\nSubject to availability.',
    storage_note: STORAGE_DEFAULT,
    seo_title: 'Buy Black Raisins Online in Hyderabad | Yasvik',
    seo_description:
      'Shop black raisins from Yasvik for soaking, snacking and traditional recipes. Hyderabad delivery subject to availability.',
    seo_keywords: 'black raisins, black kishmish, dried fruit, Yasvik Hyderabad',
    subject_to_availability: true,
  },
  {
    slug: 'dry-dates',
    name: 'Dry Dates',
    local_name: 'చుహారా / Chuhara',
    category_id: CAT.dates,
    short_description:
      'Firm dried dates traditionally used in drinks, sweets and slow-cooked preparations.',
    description:
      'Dry dates (chuhara) with a firm texture for drinks, sweets and slow-cooked preparations. A traditional dry fruit for the pantry.\n\nSubject to availability.',
    storage_note: STORAGE_DEFAULT,
    seo_title: 'Buy Dry Dates (Chuhara) Online in Hyderabad | Yasvik',
    seo_description:
      'Shop dry dates (chuhara) from Yasvik for drinks, sweets and traditional recipes. Pack sizes for Hyderabad kitchens; subject to availability.',
    seo_keywords: 'dry dates, chuhara, khajur, dates, Yasvik Hyderabad',
    subject_to_availability: true,
  },
  {
    slug: 'fard-dates',
    name: 'Fard Dates',
    local_name: 'ఫర్ద్ ఖర్జూరం',
    category_id: CAT.dates,
    short_description:
      'Soft Fard dates for direct snacking, gifting bowls and natural sweetness in recipes.',
    description:
      'Fard dates with a soft bite for snacking and gifting. Use as a natural sweetener in drinks and desserts when you want dates on hand.\n\nSubject to availability.',
    storage_note: STORAGE_DEFAULT,
    seo_title: 'Buy Fard Dates Online in Hyderabad | Yasvik',
    seo_description:
      'Shop Fard dates from Yasvik for snacking and gifting. Useful pack sizes; Hyderabad delivery subject to availability.',
    seo_keywords: 'fard dates, dates, khajur, Yasvik Hyderabad',
    subject_to_availability: true,
  },
  {
    slug: 'pumpkin-seeds',
    name: 'Pumpkin Seeds',
    local_name: 'గుమ్మడి గింజలు',
    category_id: CAT.seeds,
    short_description:
      'Mild, crunchy pumpkin seeds for breakfast bowls, salads, baking and direct snacking.',
    description:
      'Pumpkin seeds for breakfast bowls, salads, baking and direct snacking. Keep them sealed after opening.\n\nSubject to availability.',
    storage_note: STORAGE_DEFAULT,
    seo_title: 'Buy Pumpkin Seeds Online in Hyderabad | Yasvik',
    seo_description:
      'Shop pumpkin seeds from Yasvik for bowls, salads, baking and snacking. Useful packs with Hyderabad delivery subject to availability.',
    seo_keywords: 'pumpkin seeds, edible seeds, Yasvik Hyderabad',
    subject_to_availability: true,
  },
  {
    slug: 'sunflower-seeds',
    name: 'Sunflower Seeds',
    local_name: 'పొద్దుతిరుగుడు గింజలు',
    category_id: CAT.seeds,
    short_description:
      'Nutty sunflower kernels that can be added to salads, granola, bread and snack mixes.',
    description:
      'Sunflower seed kernels for salads, granola, bread and snack mixes. A pantry seed with a mild nutty flavour.\n\nSubject to availability.',
    storage_note: STORAGE_DEFAULT,
    seo_title: 'Buy Sunflower Seeds Online in Hyderabad | Yasvik',
    seo_description:
      'Shop sunflower seeds from Yasvik for salads, granola and snack mixes. Hyderabad delivery subject to availability.',
    seo_keywords: 'sunflower seeds, edible seeds, Yasvik Hyderabad',
    subject_to_availability: true,
  },
  {
    slug: 'watermelon-seeds',
    name: 'Watermelon Seeds',
    local_name: 'పుచ్చకాయ గింజలు',
    category_id: CAT.seeds,
    short_description:
      'Creamy watermelon seed kernels for snacking, sweets, seed mixes and home recipes.',
    description:
      'Watermelon seed kernels for snacking, sweets, seed mixes and home recipes. Pack sizes suited to regular pantry use.\n\nSubject to availability.',
    storage_note: STORAGE_DEFAULT,
    seo_title: 'Buy Watermelon Seeds Online in Hyderabad | Yasvik',
    seo_description:
      'Shop watermelon seeds from Yasvik for snacking, sweets and seed mixes. Hyderabad delivery subject to availability.',
    seo_keywords: 'watermelon seeds, edible seeds, Yasvik Hyderabad',
    subject_to_availability: true,
  },
  {
    slug: 'flax-seeds-yas-007',
    name: 'Flax Seeds',
    local_name: 'అలసి / Alsi',
    category_id: CAT.seeds,
    short_description:
      'Whole flax seeds with a nutty flavour, suitable for roasting, grinding and adding to everyday meals.',
    description:
      'Whole flax seeds (alsi) for roasting, grinding and adding to everyday meals. Use according to your preferred recipe.\n\nSubject to availability.',
    storage_note: STORAGE_DEFAULT,
    seo_title: 'Buy Flax Seeds Online in Hyderabad | Yasvik',
    seo_description:
      'Shop flax seeds (alsi) from Yasvik for roasting, grinding and everyday meals. Pack sizes for Hyderabad kitchens; subject to availability.',
    seo_keywords: 'flax seeds, alsi, edible seeds, Yasvik Hyderabad',
    keep_unpublished: true,
    subject_to_availability: true,
  },
  {
    slug: 'cashews-fried-masala-b5nzo',
    name: 'Masala Cashews',
    local_name: 'మసాలా కాజు',
    category_id: CAT.flavoured,
    short_description:
      'Crunchy cashews coated with savoury Indian-style seasoning for tea-time and party snacking.',
    description:
      'Cashews with savoury Indian-style seasoning for tea-time and party snacking. Ingredients and allergen details are listed for this flavoured product.\n\nSubject to availability.',
    storage_note: STORAGE_DEFAULT,
    seo_title: 'Buy Masala Cashews Online in Hyderabad | Yasvik',
    seo_description:
      'Shop masala cashews from Yasvik for tea-time and party snacking. Hyderabad delivery subject to availability.',
    seo_keywords: 'masala cashews, roasted cashews, flavoured nuts, Yasvik Hyderabad',
    ingredients: 'Cashew nuts, edible oil, spices and condiments. Exact seasoning blend to be confirmed before reprinting labels.',
    allergen_info: 'Contains tree nuts (cashew). May contain traces of other nuts and sesame.',
    subject_to_availability: true,
  },
  {
    slug: 'cashews-pieces-ax2o7',
    name: 'Cashew Pieces',
    category_id: CAT.nuts,
    short_description:
      'Broken cashew pieces for sweets, gravies and cooking where whole kernels are not required.',
    description:
      'Cashew pieces for sweets, gravies and cooking. A practical grade when you need kaju flavour without whole kernels.\n\nSubject to availability.',
    storage_note: STORAGE_DEFAULT,
    seo_title: 'Buy Cashew Pieces Online in Hyderabad | Yasvik',
    seo_description:
      'Shop cashew pieces from Yasvik for sweets and cooking. Hyderabad delivery subject to availability.',
    seo_keywords: 'cashew pieces, kaju, cooking cashews, Yasvik',
    allergen_info: 'Contains tree nuts (cashew).',
    subject_to_availability: true,
  },
  {
    slug: 'cashews-split-avag5',
    name: 'Cashew Split',
    category_id: CAT.nuts,
    short_description:
      'Split cashews for sweets, garnishes and recipes that call for halved kernels.',
    description:
      'Split cashews for sweets, garnishes and recipes that use halved kernels. Packed for kitchen use.\n\nSubject to availability.',
    storage_note: STORAGE_DEFAULT,
    seo_title: 'Buy Split Cashews Online in Hyderabad | Yasvik',
    seo_description:
      'Shop split cashews from Yasvik for sweets and garnishes. Hyderabad delivery subject to availability.',
    seo_keywords: 'split cashews, kaju, Yasvik Hyderabad',
    allergen_info: 'Contains tree nuts (cashew).',
    subject_to_availability: true,
  },
  {
    slug: 'salted-pista-premium-bjn3c',
    name: 'Salted Pistachios (Premium)',
    category_id: CAT.nuts,
    short_description:
      'Premium-grade salted pistachios in shell for snacking and serving.',
    description:
      'Premium salted pistachios in shell for snacking and serving guests. Subject to availability.',
    storage_note: STORAGE_DEFAULT,
    seo_title: 'Buy Premium Salted Pistachios Online in Hyderabad | Yasvik',
    seo_description:
      'Shop premium salted pistachios from Yasvik. Hyderabad delivery subject to availability.',
    seo_keywords: 'salted pista, premium pistachio, Yasvik',
    ingredients: 'Pistachios, salt.',
    allergen_info: 'Contains tree nuts (pistachio).',
    subject_to_availability: true,
  },
];

/** New draft products (never auto-published). */
const CREATES = [
  {
    slug: 'dried-kiwi',
    name: 'Dried Kiwi',
    category_id: CAT.driedFruits,
    variants: ['100g', '200g', '500g'],
    skuBase: 'YAS-DF-KIWI',
    short_description: 'Chewy dried kiwi slices with a sweet-tangy flavour for occasional snacking.',
    description:
      'Dried kiwi slices for occasional snacking. Sweetened dried fruit may contain added sugar — confirm ingredients on the pack before purchase.\n\nSubject to availability.',
    storage_note: STORAGE_DEFAULT,
    seo_title: 'Buy Dried Kiwi Online in Hyderabad | Yasvik',
    seo_description:
      'Shop dried kiwi from Yasvik for occasional snacking. Check ingredients for added sugar. Hyderabad delivery subject to availability.',
    seo_keywords: 'dried kiwi, kiwi, dried fruit, Yasvik Hyderabad',
    ingredients: 'Dried kiwi. May contain added sugar — confirm with supplier documentation before publishing.',
    needs_ingredients_confirm: true,
  },
  {
    slug: 'kimia-dates',
    name: 'Kimia Dates',
    category_id: CAT.dates,
    variants: ['250g', '500g', '1kg'],
    skuBase: 'YAS-DF-KIMIA',
    short_description: 'Soft Kimia dates with a rich, caramel-like sweetness for direct snacking and gifting.',
    description:
      'Soft Kimia dates for direct snacking and gifting bowls. A richer date option for households that prefer a softer texture.\n\nSubject to availability.',
    storage_note: STORAGE_DEFAULT,
    seo_title: 'Buy Kimia Dates Online in Hyderabad | Yasvik',
    seo_description:
      'Shop Kimia dates from Yasvik for snacking and gifting. Useful pack sizes; Hyderabad delivery subject to availability.',
    seo_keywords: 'kimia dates, dates, khajur, Yasvik Hyderabad',
  },
  {
    slug: 'dates',
    name: 'Dates',
    local_name: 'ఖర్జూరం',
    category_id: CAT.dates,
    variants: ['250g', '500g', '1kg'],
    skuBase: 'YAS-DF-DATES',
    short_description: 'Everyday dates for snacking, smoothies, sweets and natural sweetness in recipes.',
    description:
      'Everyday dates for snacking, smoothies, sweets and recipes that need natural sweetness. Practical packs for regular use.\n\nSubject to availability.',
    storage_note: STORAGE_DEFAULT,
    seo_title: 'Buy Dates Online in Hyderabad | Yasvik',
    seo_description:
      'Shop everyday dates from Yasvik for snacking, smoothies and sweets. Hyderabad delivery subject to availability.',
    seo_keywords: 'dates, khajur, dry fruits, Yasvik Hyderabad',
  },
  {
    slug: 'makhana',
    name: 'Makhana',
    local_name: 'ఫాక్స్ నట్స్ / Fox Nuts',
    category_id: CAT.makhana,
    variants: ['50g', '100g', '250g', '500g'],
    skuBase: 'YAS-DF-MAKH',
    short_description: 'Light fox nuts suitable for roasting at home with spices, ghee or seasoning.',
    description:
      'Plain makhana (fox nuts) for roasting at home with spices, ghee or seasoning. A light pantry snack base in useful pack sizes.\n\nSubject to availability.',
    storage_note: STORAGE_DEFAULT,
    seo_title: 'Buy Makhana (Fox Nuts) Online in Hyderabad | Yasvik',
    seo_description:
      'Shop plain makhana from Yasvik for home roasting and seasoning. Hyderabad delivery subject to availability.',
    seo_keywords: 'makhana, fox nuts, Yasvik Hyderabad',
  },
  {
    slug: 'chia-seeds',
    name: 'Chia Seeds',
    category_id: CAT.seeds,
    variants: ['100g', '200g', '250g', '500g'],
    skuBase: 'YAS-DF-CHIA',
    short_description: 'Tiny absorbent seeds commonly used in soaked drinks, puddings, smoothies and breakfast bowls.',
    description:
      'Chia seeds for soaked drinks, puddings, smoothies and breakfast bowls. Soak before use when your recipe calls for it.\n\nSubject to availability.',
    storage_note: STORAGE_DEFAULT,
    seo_title: 'Buy Chia Seeds Online in Hyderabad | Yasvik',
    seo_description:
      'Shop chia seeds from Yasvik for soaked drinks, puddings and breakfast bowls. Hyderabad delivery subject to availability.',
    seo_keywords: 'chia seeds, edible seeds, Yasvik Hyderabad',
  },
  {
    slug: 'sabja-seeds',
    name: 'Sabja Seeds',
    local_name: 'తుక్మరియా / Basil Seeds',
    category_id: CAT.seeds,
    variants: ['100g', '200g', '250g', '500g'],
    skuBase: 'YAS-DF-SABJA',
    short_description: 'Basil seeds traditionally soaked before being added to drinks, falooda and cooling desserts.',
    description:
      'Sabja (basil) seeds are traditionally soaked before adding to drinks, falooda and desserts. Follow your preferred recipe for soak time.\n\nSubject to availability.',
    storage_note: STORAGE_DEFAULT,
    seo_title: 'Buy Sabja Seeds Online in Hyderabad | Yasvik',
    seo_description:
      'Shop sabja (basil) seeds from Yasvik for drinks and desserts. Soak before use as per your recipe. Hyderabad delivery subject to availability.',
    seo_keywords: 'sabja, basil seeds, tukmaria, Yasvik Hyderabad',
  },
  {
    slug: 'halim-seeds',
    name: 'Halim Seeds',
    local_name: 'అలివ్ / Garden Cress',
    category_id: CAT.seeds,
    variants: ['100g', '200g', '250g'],
    skuBase: 'YAS-DF-HALIM',
    short_description: 'Small garden cress seeds used in selected traditional recipes, drinks and homemade preparations.',
    description:
      'Halim (garden cress / aliv) seeds for selected traditional recipes, drinks and homemade preparations. Use according to your preferred recipe and soak where appropriate.\n\nNo medicinal claims. Subject to availability.',
    storage_note: STORAGE_DEFAULT,
    seo_title: 'Buy Halim Seeds Online in Hyderabad | Yasvik',
    seo_description:
      'Shop halim (garden cress) seeds from Yasvik for traditional recipes and drinks. Use as per your preferred recipe. Subject to availability.',
    seo_keywords: 'halim seeds, aliv, garden cress seeds, Yasvik Hyderabad',
  },
  {
    slug: 'white-sesame-seeds',
    name: 'White Sesame Seeds',
    local_name: 'తెల్ల నువ్వులు',
    category_id: CAT.seeds,
    variants: ['100g', '200g', '250g', '500g'],
    skuBase: 'YAS-DF-WSES',
    short_description: 'Nutty white sesame seeds for chutneys, laddus, seasoning, baking and traditional cooking.',
    description:
      'White sesame seeds for chutneys, laddus, seasoning, baking and traditional cooking. A staple seed for Indian kitchens.\n\nNote: Native Sesame Seeds may already exist elsewhere in the catalog — review before publishing both.\n\nSubject to availability.',
    storage_note: STORAGE_DEFAULT,
    seo_title: 'Buy White Sesame Seeds Online in Hyderabad | Yasvik',
    seo_description:
      'Shop white sesame seeds from Yasvik for chutneys, laddus and cooking. Hyderabad delivery subject to availability.',
    seo_keywords: 'white sesame seeds, nuvvulu, edible seeds, Yasvik',
    allergen_info: 'Contains sesame.',
    review_duplicate_of: null, // native-sesame-seeds soft-archived 2026-07-26; canonical white-sesame-seeds
  },
  {
    slug: 'roasted-cashews',
    name: 'Roasted Cashews',
    category_id: CAT.flavoured,
    variants: ['100g', '250g', '500g', '1kg'],
    skuBase: 'YAS-DF-RCSW',
    short_description: 'Roasted cashews with a crisp bite, suitable for serving, travel and everyday snacking.',
    description:
      'Roasted cashews for serving, travel and everyday snacking. Ingredients to be confirmed with the production batch before publishing.\n\nSubject to availability.',
    storage_note: STORAGE_DEFAULT,
    seo_title: 'Buy Roasted Cashews Online in Hyderabad | Yasvik',
    seo_description:
      'Shop roasted cashews from Yasvik for snacking and serving. Hyderabad delivery subject to availability.',
    seo_keywords: 'roasted cashews, kaju, flavoured nuts, Yasvik',
    ingredients: 'Cashew nuts, edible oil (to be confirmed with batch).',
    allergen_info: 'Contains tree nuts (cashew).',
    needs_ingredients_confirm: true,
  },
  {
    slug: 'five-seed-mix',
    name: 'Five Seed Mix',
    category_id: CAT.mixedSeeds,
    variants: ['250g', '500g', '1kg'],
    skuBase: 'YAS-DF-5SEED',
    product_group: 'mix',
    short_description:
      'A practical mix of five everyday seeds for breakfast bowls, salads, homemade granola and snack jars.',
    description:
      'Contents (equal parts unless otherwise noted on pack):\n• Pumpkin Seeds\n• Sunflower Seeds\n• Watermelon Seeds\n• Flax Seeds\n• Chia Seeds\n\nContents may be packed separately when required for freshness. Exact blend ratios to be confirmed before publishing.\n\nSubject to availability.',
    storage_note: STORAGE_DEFAULT,
    seo_title: 'Buy Five Seed Mix Online in Hyderabad | Yasvik',
    seo_description:
      'Shop Yasvik five seed mix for breakfast bowls, salads and snack jars. Hyderabad delivery subject to availability.',
    seo_keywords: 'five seed mix, seed mix, pumpkin sunflower flax chia, Yasvik',
    ingredients:
      'Pumpkin seeds, sunflower seeds, watermelon seeds, flax seeds, chia seeds. Confirm proportions before publish.',
    needs_ingredients_confirm: true,
  },
  {
    slug: 'everyday-seed-mix',
    name: 'Everyday Seed Mix',
    category_id: CAT.mixedSeeds,
    variants: ['250g', '500g', '1kg'],
    skuBase: 'YAS-DF-ESEED',
    product_group: 'mix',
    short_description:
      'Draft seed mix placeholder — activate only after exact recipe and weight proportions are confirmed.',
    description:
      'Proposed contents (not final):\nPumpkin, sunflower, watermelon, flax, chia, white sesame and sabja seeds.\n\nDo not publish until recipe and proportions are confirmed.\n\nSubject to availability.',
    storage_note: STORAGE_DEFAULT,
    seo_title: 'Everyday Seed Mix | Yasvik (Draft)',
    seo_description: 'Draft Yasvik everyday seed mix — recipe pending confirmation.',
    seo_keywords: 'seed mix, Yasvik',
    needs_ingredients_confirm: true,
    draft_recipe_pending: true,
  },
  {
    slug: 'roasted-seed-mix',
    name: 'Roasted Seed Mix',
    category_id: CAT.mixedSeeds,
    variants: ['250g', '500g'],
    skuBase: 'YAS-DF-RSEED',
    product_group: 'mix',
    short_description: 'Draft roasted seed mix — ingredients and seasoning must be confirmed before publishing.',
    description:
      'Draft product only. Ingredients and seasoning must be confirmed with production before any customer-facing publish.\n\nSubject to availability.',
    storage_note: STORAGE_DEFAULT,
    seo_title: 'Roasted Seed Mix | Yasvik (Draft)',
    seo_description: 'Draft roasted seed mix — seasoning pending confirmation.',
    seo_keywords: 'roasted seed mix, Yasvik',
    needs_ingredients_confirm: true,
    draft_recipe_pending: true,
  },
];

const COMBOS = [
  {
    slug: 'yasvik-everyday-dry-fruit-combo',
    name: 'Yasvik Everyday Dry Fruit Combo',
    weight: '600 g',
    items: 5,
    contents: [
      'Almonds – 100 g',
      'Cashews – 100 g',
      'Golden Raisins – 100 g',
      'Dates – 200 g',
      'Makhana – 100 g',
    ],
    short_description:
      'A simple starter selection of familiar dry fruits for everyday family snacking.',
    price_band: '₹599–₹699',
    skuBase: 'YAS-DF-C-EVDY',
  },
  {
    slug: 'yasvik-seven-superfoods-combo',
    name: 'Yasvik Seven Seeds & Nuts Combo',
    weight: '700 g',
    items: 7,
    contents: [
      'Almonds – 100 g',
      'Cashews – 100 g',
      'Salted Pistachios – 100 g',
      'Pumpkin Seeds – 100 g',
      'Sunflower Seeds – 100 g',
      'Flax Seeds – 100 g',
      'Black Raisins – 100 g',
    ],
    short_description:
      'Seven familiar nuts, seeds and raisins packed for households that want variety without buying each item separately.',
    price_band: '₹699–₹799',
    skuBase: 'YAS-DF-C-SEVN',
  },
  {
    slug: 'yasvik-twelve-superfoods-combo',
    name: 'Yasvik Twelve Dry Fruit & Seeds Combo',
    weight: '1.2 kg',
    items: 12,
    contents: [
      'Almonds – 100 g',
      'Cashews – 100 g',
      'Salted Pistachios – 100 g',
      'Dates – 100 g',
      'Black Raisins – 100 g',
      'Pumpkin Seeds – 100 g',
      'Sunflower Seeds – 100 g',
      'Watermelon Seeds – 100 g',
      'Flax Seeds – 100 g',
      'Chia Seeds – 100 g',
      'Sabja Seeds – 100 g',
      'White Sesame Seeds – 100 g',
    ],
    short_description:
      'Twelve dry fruits and seeds in one curated selection for families that rotate through nuts and seeds regularly.',
    price_band: '₹1,099–₹1,299',
    skuBase: 'YAS-DF-C-TWLV',
  },
  {
    slug: 'yasvik-daily-nutrition-combo',
    name: 'Yasvik Daily Dry Fruit & Seeds Combo',
    weight: '1.6 kg',
    items: 17,
    contents: [
      'Almonds – 100 g',
      'Cashews – 100 g',
      'Salted Pistachios – 50 g',
      'Walnut Kernels – 50 g',
      'Dried Figs – 100 g',
      'Golden Raisins – 100 g',
      'Black Raisins – 100 g',
      'Dates – 100 g',
      'Makhana – 100 g',
      'Pumpkin Seeds – 100 g',
      'Sunflower Seeds – 100 g',
      'Watermelon Seeds – 100 g',
      'Flax Seeds – 100 g',
      'Chia Seeds – 100 g',
      'Sabja Seeds – 100 g',
      'Halim Seeds – 100 g',
      'White Sesame Seeds – 100 g',
    ],
    short_description:
      'A wide dry-fruit and seed assortment for households that want many pantry staples in one order.',
    price_band: '₹1,299–₹1,499',
    skuBase: 'YAS-DF-C-DAILY',
  },
  {
    slug: 'yasvik-family-dry-fruit-seeds-combo',
    name: 'Yasvik Family Dry Fruit & Seeds Combo',
    weight: '2.2 kg',
    items: 10,
    contents: [
      'Almonds – 250 g',
      'Cashews – 250 g',
      'Golden Raisins – 200 g',
      'Dates – 400 g',
      'Makhana – 100 g',
      'Pumpkin Seeds – 200 g',
      'Sunflower Seeds – 200 g',
      'Watermelon Seeds – 200 g',
      'Flax Seeds – 200 g',
      'Chia Seeds – 200 g',
    ],
    short_description:
      'Larger family packs of nuts, dates, raisins, makhana and everyday seeds.',
    price_band: '₹1,399–₹1,699',
    skuBase: 'YAS-DF-C-FMLY',
  },
  {
    slug: 'yasvik-premium-family-combo',
    name: 'Yasvik Premium Family Combo',
    weight: '2.25 kg (2.75 kg with optional seed add-on)',
    items: 8,
    contents: [
      'Cashews – 250 g',
      'Almonds – 250 g',
      'Dried Figs – 250 g',
      'Salted Pistachios – 250 g',
      'Walnut Kernels – 250 g',
      'Makhana – 250 g',
      'Golden Raisins – 250 g',
      'Kimia Dates – 500 g',
      'Optional seed add-on: Pumpkin, Watermelon, Sunflower, Flax, Chia – 100 g each',
    ],
    short_description:
      'A premium dry-fruit selection for gifting and larger households. Optional seed add-on listed separately until costing is confirmed.',
    price_band: '₹2,299–₹2,699',
    skuBase: 'YAS-DF-C-PREM',
  },
  {
    slug: 'yasvik-five-seeds-combo',
    name: 'Yasvik Five Seeds Combo',
    weight: '1 kg',
    items: 5,
    contents: [
      'Pumpkin Seeds – 200 g',
      'Sunflower Seeds – 200 g',
      'Watermelon Seeds – 200 g',
      'Flax Seeds – 200 g',
      'Chia Seeds – 200 g',
    ],
    short_description:
      'One-kilogram seed assortment for breakfast bowls, mixes and regular kitchen use.',
    price_band: '₹549–₹699',
    skuBase: 'YAS-DF-C-5KG',
  },
  {
    slug: 'yasvik-kids-snack-combo',
    name: 'Yasvik Kids Snack Combo',
    weight: '600 g',
    items: 5,
    contents: [
      'Almonds – 100 g',
      'Cashews – 100 g',
      'Golden Raisins – 100 g',
      'Dates – 200 g',
      'Makhana – 100 g',
    ],
    short_description:
      'Familiar dry fruits and light snacks packed in convenient family-sized portions.',
    price_band: '₹599–₹699',
    skuBase: 'YAS-DF-C-KIDS',
  },
  {
    slug: 'yasvik-office-snack-combo',
    name: 'Yasvik Office Snack Combo',
    weight: '500 g',
    items: 5,
    contents: [
      'Almonds – 100 g',
      'Cashews – 100 g',
      'Salted Pistachios – 100 g',
      'Golden Raisins – 100 g',
      'Dates – 100 g',
    ],
    short_description:
      'Compact dry-fruit selection for desk drawers, travel and controlled-portion snacking.',
    price_band: '₹499–₹649',
    skuBase: 'YAS-DF-C-OFFC',
  },
].map((combo) => ({
  ...combo,
  category_id: CAT.combos,
  product_group: 'combo',
  variants: ['1 pack'],
  description: [
    combo.short_description,
    '',
    `Total net weight: ${combo.weight}`,
    `Number of items: ${combo.items}`,
    '',
    'Contents:',
    ...combo.contents.map((line) => `• ${line}`),
    '',
    'Contents may be packed separately when needed for freshness or packing workflow.',
    `Suggested draft price band (not live): ${combo.price_band}. Do not publish until component costs, packaging and margin are entered in Pricing Strategy.`,
    '',
    'Inventory note: this is a packaged combo SKU with its own stock — component SKUs are not auto-deducted by the current checkout architecture.',
    'Subject to availability.',
  ].join('\n'),
  storage_note: STORAGE_DEFAULT,
  seo_title: 'Dry Fruits and Seeds Combo Packs in Hyderabad | Yasvik',
  seo_description: `${combo.name} from Yasvik — ${combo.weight}, ${combo.items} items. Draft listing pending cost review. Hyderabad delivery subject to availability.`,
  seo_keywords: 'dry fruits combo, seeds combo, Yasvik Hyderabad, gift dry fruits',
  purity_badges: ['Value Combo'],
}));

const SKIPPED = [
  { requested: 'almonds', reason: 'Exists as badam-almonds — updated in place' },
  { requested: 'cashew-nuts', reason: 'Exists as cashews — updated in place' },
  { requested: 'salted-pistachios', reason: 'Exists as salted-pista — updated in place' },
  { requested: 'walnut-kernels', reason: 'Exists as walnuts — updated in place' },
  { requested: 'dried-figs-anjeer', reason: 'Exists as anjeer-rvnea — fixed wrong copy/image mapping' },
  { requested: 'golden-raisins', reason: 'Exists as green-raisins — retitled Golden Raisins, slug kept for SEO' },
  { requested: 'plain-cashews', reason: 'Covered by cashews; grade variants (split/pieces) already exist' },
  { requested: 'masala-cashews (new)', reason: 'Mapped to cashews-fried-masala-b5nzo' },
  { requested: 'inventory-linked bundles', reason: 'Combos/BOM auto-deduction not supported — drafted as packaged SKUs instead' },
];

function categorySql() {
  return `
-- Parent already exists: dry-fruits (${ROOT})
UPDATE categories SET
  name = 'Dry Fruits, Nuts & Seeds',
  emotional_title = 'Dry Fruits, Nuts & Seeds',
  short_intro = 'Everyday nuts, dried fruits, dates, makhana and edible seeds, selected in useful pack sizes for Hyderabad households. Choose individual packs or curated combinations based on how your family actually consumes them.',
  seo_title = 'Dry Fruits, Nuts & Seeds in Hyderabad | Yasvik',
  seo_description = 'Shop nuts, dried fruits, dates, makhana and edible seeds from Yasvik in Hyderabad. Individual packs and curated combos; subject to availability.',
  updated_at = now()
WHERE id = '${ROOT}'::uuid;

UPDATE categories SET
  name = 'Nuts',
  emotional_title = 'Nuts',
  sort_order = 10,
  is_active = true,
  updated_at = now()
WHERE id = '${CAT.nuts}'::uuid;

UPDATE categories SET
  name = 'Edible Seeds',
  emotional_title = 'Edible Seeds',
  sort_order = 50,
  is_active = true,
  updated_at = now()
WHERE id = '${CAT.seeds}'::uuid;

INSERT INTO categories (id, name, slug, emotional_title, parent_id, sort_order, is_active, short_intro, seo_title, seo_description)
VALUES
  ('${CAT.driedFruits}'::uuid, 'Dried Fruits', 'dry-fruits-dried-fruits', 'Dried Fruits', '${ROOT}'::uuid, 20, true, 'Raisins, figs and other dried fruits for snacking and cooking.', 'Dried Fruits in Hyderabad | Yasvik', 'Shop dried fruits from Yasvik in Hyderabad.'),
  ('${CAT.dates}'::uuid, 'Dates', 'dry-fruits-dates', 'Dates', '${ROOT}'::uuid, 30, true, 'Soft and dry dates for snacking, gifting and recipes.', 'Dates in Hyderabad | Yasvik', 'Shop dates from Yasvik in Hyderabad.'),
  ('${CAT.makhana}'::uuid, 'Makhana', 'dry-fruits-makhana', 'Makhana', '${ROOT}'::uuid, 40, true, 'Plain fox nuts for home roasting and seasoning.', 'Makhana in Hyderabad | Yasvik', 'Shop makhana from Yasvik in Hyderabad.'),
  ('${CAT.flavoured}'::uuid, 'Flavoured & Roasted Nuts', 'dry-fruits-flavoured-roasted', 'Flavoured & Roasted Nuts', '${ROOT}'::uuid, 60, true, 'Roasted and seasoned nuts for tea-time and serving.', 'Roasted & Flavoured Nuts in Hyderabad | Yasvik', 'Shop roasted and flavoured nuts from Yasvik.'),
  ('${CAT.mixedSeeds}'::uuid, 'Mixed Seeds & Trail Mixes', 'dry-fruits-mixed-seeds', 'Mixed Seeds & Trail Mixes', '${ROOT}'::uuid, 70, true, 'Ready seed mixes for bowls and snack jars.', 'Seed Mixes in Hyderabad | Yasvik', 'Shop seed mixes from Yasvik in Hyderabad.'),
  ('${CAT.combos}'::uuid, 'Dry Fruit & Seed Combos', 'dry-fruits-combos', 'Dry Fruit & Seed Combos', '${ROOT}'::uuid, 80, true, 'Curated combinations packed for family and gifting use.', 'Dry Fruit Combos in Hyderabad | Yasvik', 'Shop dry fruit and seed combos from Yasvik.'),
  ('${CAT.giftBoxes}'::uuid, 'Gift Boxes', 'dry-fruits-gift-boxes', 'Gift Boxes', '${ROOT}'::uuid, 90, true, 'Gift-ready dry fruit selections (activate when packaging is ready).', 'Dry Fruit Gift Boxes in Hyderabad | Yasvik', 'Dry fruit gift boxes from Yasvik — coming as packaging is ready.')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  emotional_title = EXCLUDED.emotional_title,
  parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  short_intro = EXCLUDED.short_intro,
  seo_title = EXCLUDED.seo_title,
  seo_description = EXCLUDED.seo_description,
  updated_at = now();
`;
}

function updateSql(row) {
  const sets = [
    `name = ${esc(row.name)}`,
    `short_description = ${esc(row.short_description)}`,
    `description = ${esc(row.description)}`,
    `storage_note = ${esc(row.storage_note)}`,
    `seo_title = ${esc(row.seo_title)}`,
    `seo_description = ${esc(row.seo_description)}`,
    `seo_keywords = ${esc(row.seo_keywords)}`,
    `category_id = '${row.category_id}'::uuid`,
    `subject_to_availability = ${row.subject_to_availability !== false}`,
    `updated_at = now()`,
  ];
  if (row.local_name) sets.push(`local_name = ${esc(row.local_name)}`);
  if (row.ingredients) sets.push(`ingredients = ${esc(row.ingredients)}`);
  if (row.allergen_info) sets.push(`allergen_info = ${esc(row.allergen_info)}`);
  if (row.clear_wrong_hero) sets.push(`featured_image_url = NULL`);
  // Never force publish on updates; flax stays draft
  if (row.keep_unpublished) {
    sets.push(`is_published = false`);
    sets.push(`sell_online = false`);
  }
  return `UPDATE products SET ${sets.join(', ')} WHERE slug = ${esc(row.slug)};`;
}

function insertProductSql(row) {
  const isCombo = row.product_group === 'combo' || row.unitPack;
  const variants = buildVariants(
    row.variants || ['100g', '250g', '500g'],
    row.skuBase || 'YAS-DF',
    { unitPack: isCombo },
  );
  const badges = row.purity_badges || [];
  return `
INSERT INTO products (
  name, slug, short_description, description, local_name, category_id,
  price, stock_quantity, shared_stock_kg, stock_measure_type, quick_variants,
  is_published, sell_online, is_featured, featured_in_hero,
  storage_note, seo_title, seo_description, seo_keywords,
  ingredients, allergen_info, subject_to_availability, product_group, purity_badges,
  sku, product_code
) VALUES (
  ${esc(row.name)},
  ${esc(row.slug)},
  ${esc(row.short_description)},
  ${esc(row.description)},
  ${esc(row.local_name || null)},
  '${row.category_id}'::uuid,
  0,
  0,
  ${isCombo ? 'NULL' : '0'},
  ${esc(isCombo ? 'units' : 'kg')},
  ${esc(JSON.stringify(variants))}::jsonb,
  false,
  false,
  false,
  false,
  ${esc(row.storage_note || STORAGE_DEFAULT)},
  ${esc(row.seo_title)},
  ${esc(row.seo_description)},
  ${esc(row.seo_keywords)},
  ${esc(row.ingredients || null)},
  ${esc(row.allergen_info || null)},
  true,
  ${esc(row.product_group || null)},
  ${esc(JSON.stringify(badges))}::jsonb,
  ${esc(row.skuBase || null)},
  ${esc(row.skuBase || null)}
)
ON CONFLICT (slug) DO NOTHING;
`;
}

function buildImageManifest() {
  const rows = [];
  const push = (product, imageType, composition, appearance, packaging, alt, filename) => {
    rows.push({
      product_title: product.name,
      slug: product.slug,
      image_type: imageType,
      required_dimensions: imageType.includes('banner')
        ? imageType.includes('mobile')
          ? '1080x1200'
          : '1920x640'
        : imageType === 'combo_social'
          ? '1080x1350'
          : imageType === 'hero'
            ? '1600x1600'
            : '1400x1400',
      composition,
      exact_product_appearance: appearance,
      packaging_requirement: packaging,
      background_description:
        'Calm Yasvik cream / warm neutral surface, soft natural light, deep olive accents only if needed. No gold crowns, medical symbols, loud discount graphics, or fake logos.',
      alt_text: alt,
      filename,
      status: 'needed',
    });
  };

  const individuals = [
    ...UPDATES.map((u) => ({ name: u.name, slug: u.slug })),
    ...CREATES.map((c) => ({ name: c.name, slug: c.slug })),
  ];
  for (const p of individuals) {
    push(
      p,
      'hero',
      'Product in a clean wooden or ceramic bowl, centred, generous negative space',
      `Realistic ${p.name} only — correct form/colour for this SKU`,
      'No packaging in hero; no weight/price text in image',
      `${p.name} in a bowl — Yasvik dry fruits`,
      `yasvik-${p.slug}-hero.webp`,
    );
    push(
      p,
      'packaging',
      'Yasvik stand-up pouch with clean transparent label area; product visible if windowed',
      `Accurate ${p.name} fill appearance`,
      'Yasvik pouch only — use real logo asset; leave label area blank for later text',
      `${p.name} Yasvik pouch`,
      `yasvik-${p.slug}-pouch.webp`,
    );
    push(
      p,
      'texture',
      'Close-up macro of the actual product surface',
      `True texture of ${p.name}`,
      'No packaging',
      `Close-up of ${p.name}`,
      `yasvik-${p.slug}-texture.webp`,
    );
  }

  // Appearance guardrails
  const guards = {
    'salted-pista': 'In-shell salted pistachios — do NOT show shelled kernels as the hero',
    'salted-pista-premium-bjn3c': 'In-shell salted pistachios — do NOT show shelled kernels as the hero',
    'dried-kiwi': 'Dried kiwi slices — do NOT show fresh kiwi fruit',
    makhana: 'Fox nuts / makhana — do NOT shape like popcorn',
    'green-raisins': 'Golden raisins — do NOT show fresh grapes/berries',
    'black-raisins': 'Black raisins — do NOT show fresh grapes/berries',
  };
  for (const row of rows) {
    if (guards[row.slug] && row.image_type === 'hero') {
      row.exact_product_appearance += `. ${guards[row.slug]}`;
    }
  }

  for (const c of COMBOS) {
    push(
      c,
      'hero',
      'All included products represented accurately in bowls/small piles; clear layout',
      c.contents.join('; '),
      'Optional Yasvik pouch group; no prices/weights drawn in image',
      `${c.name} contents overview`,
      `yasvik-${c.slug}-hero.webp`,
    );
    push(
      c,
      'flatlay',
      'Flat-lay of exact contents with empty space for web crop',
      c.contents.join('; '),
      'Contents may appear as separate packs',
      `${c.name} flat lay`,
      `yasvik-${c.slug}-flatlay.webp`,
    );
    push(
      c,
      'combo_social',
      'Vertical social/poster crop with calm cream background',
      c.name,
      'No supplier poster imitation; no fake logo',
      `${c.name} social`,
      `yasvik-${c.slug}-social.webp`,
    );
  }

  rows.push({
    product_title: 'Dry Fruits, Nuts & Seeds',
    slug: 'dry-fruits',
    image_type: 'collection_banner_desktop',
    required_dimensions: '1920x640',
    composition: 'Quiet still-life of nuts/seeds/dates — one composition, brand-first calm',
    exact_product_appearance: 'Assorted dry fruits without claiming organic or medicinal cues',
    packaging_requirement: 'Optional subtle Yasvik pouch; real logo only',
    background_description: 'Warm cream gradient / linen, soft light',
    alt_text: 'Dry fruits, nuts and seeds from Yasvik',
    filename: 'yasvik-dry-fruits-banner-desktop.webp',
    status: 'needed',
  });
  rows.push({
    product_title: 'Dry Fruits, Nuts & Seeds',
    slug: 'dry-fruits',
    image_type: 'collection_banner_mobile',
    required_dimensions: '1080x1200',
    composition: 'Vertical crop of the same still-life',
    exact_product_appearance: 'Assorted dry fruits',
    packaging_requirement: 'Minimal',
    background_description: 'Warm cream',
    alt_text: 'Dry fruits, nuts and seeds from Yasvik',
    filename: 'yasvik-dry-fruits-banner-mobile.webp',
    status: 'needed',
  });

  return rows;
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const sqlParts = [
    '-- Generated by scripts/generate_dry_fruits_catalogue.mjs',
    '-- Apply after 20260726120000_dry_fruits_product_compliance_fields.sql',
    'BEGIN;',
    categorySql(),
    '-- Existing product copy / category updates (prices & stock untouched)',
    ...UPDATES.map(updateSql),
    '-- New draft products',
    ...CREATES.map(insertProductSql),
    '-- Draft combo packaged SKUs (own stock; not BOM-linked)',
    ...COMBOS.map((c) =>
      insertProductSql({
        ...c,
        variants: ['1 pack'],
        unitPack: true,
      }),
    ),
    'COMMIT;',
  ];

  const sqlPath = path.join(OUT_DIR, 'dry_fruits_catalogue_data.sql');
  fs.writeFileSync(sqlPath, sqlParts.join('\n\n'));

  const manifest = buildImageManifest();
  fs.writeFileSync(path.join(OUT_DIR, 'image-generation-manifest.json'), JSON.stringify(manifest, null, 2));
  const csvHeader = [
    'product_title',
    'slug',
    'image_type',
    'required_dimensions',
    'composition',
    'exact_product_appearance',
    'packaging_requirement',
    'background_description',
    'alt_text',
    'filename',
    'status',
  ];
  const csvLines = [
    csvHeader.join(','),
    ...manifest.map((row) =>
      csvHeader
        .map((key) => `"${String(row[key] ?? '').replace(/"/g, '""')}"`)
        .join(','),
    ),
  ];
  fs.writeFileSync(path.join(OUT_DIR, 'image-generation-manifest.csv'), csvLines.join('\n'));

  const report = {
    created_slugs: [...CREATES.map((c) => c.slug), ...COMBOS.map((c) => c.slug)],
    updated_slugs: UPDATES.map((u) => u.slug),
    skipped: SKIPPED,
    needing_supplier_cost: [...CREATES, ...COMBOS].map((p) => p.slug),
    needing_ingredients_confirm: [...CREATES, ...UPDATES]
      .filter((p) => p.needs_ingredients_confirm || (p.ingredients && /confirm/i.test(p.ingredients)))
      .map((p) => p.slug),
    draft_recipe_pending: CREATES.filter((p) => p.draft_recipe_pending).map((p) => p.slug),
    all_new_remain_unpublished: true,
    combo_inventory_behaviour:
      'Packaged combo SKUs with own stock. Checkout does not explode combos into component deductions.',
    pricing_calculator:
      'Existing Admin → Pricing Strategy (landed cost / margin / packaging). No separate new calculator required.',
    sql_file: sqlPath,
  };
  fs.writeFileSync(path.join(OUT_DIR, 'deliverables-report.json'), JSON.stringify(report, null, 2));

  // Also copy SQL into supabase migrations as data migration (idempotent inserts)
  const migPath = path.resolve(
    __dirname,
    '../../supabase/migrations/20260726120100_dry_fruits_catalogue_data.sql',
  );
  fs.writeFileSync(migPath, sqlParts.join('\n\n'));
  fs.copyFileSync(
    migPath,
    path.resolve(__dirname, '../supabase/migrations/20260726120100_dry_fruits_catalogue_data.sql'),
  );

  console.log(JSON.stringify({ sqlPath, migPath, created: report.created_slugs.length, updated: report.updated_slugs.length, images: manifest.length }, null, 2));
}

main();
