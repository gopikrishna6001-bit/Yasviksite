/** Canonical Yasvik catalog categories — 135-product workbook set. */
export const CATALOG_CATEGORIES = [
  { name: 'Dals & Pulses', slug: 'dals-and-pulses', sort_order: 10 },
  { name: 'Flours, Breakfast & Ready Mixes', slug: 'flours-breakfast-ready-mixes', sort_order: 20 },
  { name: 'Rice, Millets & Grains', slug: 'rice-millets-and-grains', sort_order: 30 },
  { name: 'Spices, Masalas & Pantry', slug: 'spices-masalas-and-pantry', sort_order: 40 },
  { name: 'Dry Fruits, Nuts & Seeds', slug: 'dry-fruits-nuts-and-seeds', sort_order: 50 },
  { name: 'Oils, Ghee & Honey', slug: 'oils-ghee-and-honey', sort_order: 60 },
  { name: 'Snacks & Sweets', slug: 'snacks-and-sweets', sort_order: 70 },
  { name: 'Natural Care', slug: 'natural-care', sort_order: 80 },
  { name: 'Pickles & Condiments', slug: 'pickles-and-condiments', sort_order: 90 },
  { name: 'Jaggery & Sweeteners', slug: 'jaggery-and-sweeteners', sort_order: 100 },
];

export const CATALOG_CATEGORY_SLUGS = CATALOG_CATEGORIES.map((category) => category.slug);

export const CATALOG_CATEGORY_BY_SLUG = Object.fromEntries(
  CATALOG_CATEGORIES.map((category) => [category.slug, category]),
);

export const CATALOG_CATEGORY_BY_NAME = Object.fromEntries(
  CATALOG_CATEGORIES.map((category) => [category.name.toLowerCase(), category]),
);
