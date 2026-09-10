import { getCategoryDisplayName } from '@/lib/categoryDisplay';
import { categoryShopPath, resolveCategorySlugParam, STORE_ENTITY_ID, WEBSITE_ENTITY_ID } from '@/lib/seoEntity';

/**
 * SEO defaults for launch root categories.
 * Keys are canonical DB slugs. Admin overrides can extend via category.seo_* later.
 */
const CATEGORY_SEO_DEFAULTS = {
  snacks: {
    h1: 'Homemade Snacks & Sweets',
    title: 'Homemade Snacks in Hyderabad | Murukulu, Chekkalu & More',
    description:
      'Shop murukulu, chekkalu, mixtures, laddus and regional homemade snacks from Yasvik in Hyderabad.',
    intro:
      'Regional homemade snacks and sweets from Yasvik — murukulu, chekkalu, mixtures and festival favourites for Hyderabad families.',
    faqs: [
      { q: 'What kinds of homemade snacks are available at Yasvik?', a: 'The range usually includes regional savouries, mixtures, traditional snacks and selected sweets.' },
      { q: 'Can I order homemade snacks online in Hyderabad?', a: 'Yes. You can shop online, choose store pickup, or request local delivery across Hyderabad.' },
    ],
  },
  pickles: {
    h1: 'Homemade Pickles',
    title: 'Homemade Pickles in Hyderabad | Yasvik',
    description:
      'Explore traditional vegetable and non-vegetarian pickles from Yasvik. Order online or visit our Ashok Nagar store in Hyderabad.',
    intro:
      'Traditional homemade pickles from Yasvik — vegetable, regional and family-recipe varieties for everyday meals.',
    faqs: [
      { q: 'What kinds of pickles does Yasvik stock?', a: 'Yasvik carries traditional pickles across vegetable, regional and selected specialty varieties.' },
      { q: 'How should homemade pickles be stored?', a: 'Follow the product label for storage guidance. Many pickles keep best in a clean, dry container with a dry spoon.' },
    ],
  },
  spices: {
    h1: 'Spices, Powders & Podis',
    title: 'Spice Powders & Podis in Hyderabad | Yasvik',
    description:
      'Shop homemade spice powders, pantry spices and traditional podis from Yasvik in Hyderabad.',
    intro:
      'Homemade spice powders, pantry spices and podis from Yasvik for everyday Indian cooking.',
    faqs: [
      { q: 'What is the difference between spice powders and podis?', a: 'Spice powders are typically used during cooking, while podis are often table-side or meal accompaniments depending on the blend.' },
      { q: 'Does Yasvik sell both pantry spices and homemade podis?', a: 'Yes. This category combines everyday pantry spices, spice powders and traditional podis.' },
    ],
  },
  'cold-pressed-oils': {
    h1: 'Cold-Pressed Oils',
    title: 'Cold-Pressed Oils Chanda Nagar | Yasvik',
    description:
      'Cold-pressed groundnut, sesame and wood-pressed oils at Yasvik, Ashok Nagar, Chanda Nagar. Visit the store, call, WhatsApp or order Hyderabad delivery.',
    intro:
      'Cold-pressed cooking oils from Yasvik in Ashok Nagar, Chanda Nagar — groundnut, sesame and traditional oils for everyday use. Convenient for Lingampally and Ameenpur.',
    faqs: [
      { q: 'What are cold-pressed oils?', a: 'Cold-pressed oils are extracted with minimal heat, helping retain the natural character of the oil.' },
      { q: 'Where can I buy cold-pressed oils near Chanda Nagar?', a: 'Yasvik Foods in Ashok Nagar, Chanda Nagar stocks cold-pressed oils. Visit the store, call, WhatsApp, or order local delivery.' },
      { q: 'Which oils can I shop at Yasvik?', a: 'The range may include groundnut, sesame and other traditional cooking oils depending on availability.' },
    ],
  },
  ghee: {
    h1: 'Ghee',
    title: 'Ghee in Hyderabad | Cow & Buffalo Ghee | Yasvik',
    description:
      'Shop cow and buffalo ghee from Yasvik in Hyderabad. Order online, visit the store or message us on WhatsApp.',
    intro:
      'Cow and buffalo ghee from Yasvik for everyday cooking, sweets and family meals.',
  },
  honey: {
    h1: 'Honey',
    title: 'Honey in Hyderabad | Yasvik',
    description:
      'Shop forest and regional honey from Yasvik in Hyderabad. Available in store and for local delivery.',
    intro:
      'Forest and regional honey from Yasvik — a pantry staple for teas, breakfasts and everyday use.',
  },
  jaggery: {
    h1: 'Jaggery',
    title: 'Jaggery in Hyderabad | Yasvik',
    description:
      'Shop traditional jaggery and natural sweeteners from Yasvik in Hyderabad.',
    intro:
      'Traditional jaggery and natural sweeteners from Yasvik for everyday cooking and sweets.',
  },
  'dry-fruits': {
    h1: 'Dry Fruits, Nuts & Seeds',
    title: 'Dry Fruits, Nuts & Seeds in Hyderabad | Yasvik',
    description:
      'Shop nuts, dried fruits, dates, makhana and edible seeds from Yasvik in Hyderabad. Individual packs and curated combinations; subject to availability.',
    intro:
      'Everyday nuts, dried fruits, dates, makhana and edible seeds, selected in useful pack sizes for Hyderabad households. Choose individual packs or curated combinations based on how your family actually consumes them.',
    faqs: [
      {
        q: 'What dry fruits and seeds does Yasvik stock?',
        a: 'The aisle includes nuts, dried fruits, dates, makhana, edible seeds, roasted or flavoured nuts, seed mixes and curated combos — availability can vary.',
      },
      {
        q: 'Are products always in stock?',
        a: 'Many items are subject to availability. If something is temporarily out, you can message Yasvik on WhatsApp for the next expected batch.',
      },
    ],
  },
  'heritage-rice': {
    h1: 'Heritage Rice',
    title: 'Heritage Rice in Hyderabad | Yasvik',
    description:
      'Shop heritage and native rice varieties from Yasvik in Hyderabad.',
    intro:
      'Heritage and native rice varieties from Yasvik for everyday meals and special occasions.',
    faqs: [
      { q: 'What is heritage rice?', a: 'Heritage rice refers to traditional rice varieties known for distinctive grain character, taste and cooking use.' },
      { q: 'Can I buy heritage rice online from Yasvik?', a: 'Yes. You can order online, visit the store, or arrange local delivery in Hyderabad.' },
    ],
  },
  millets: {
    h1: 'Millets & Millet Foods',
    title: 'Millets Chanda Nagar | Ragi & Grains | Yasvik',
    description:
      'Millets, ragi flour, flakes and millet foods at Yasvik, Ashok Nagar, Chanda Nagar. Visit, call, WhatsApp or order delivery across Hyderabad.',
    intro:
      'Millet grains, flours, flakes and millet foods from Yasvik in Ashok Nagar, Chanda Nagar — a long-standing speciality for Lingampally and Ameenpur homes.',
    faqs: [
      { q: 'What types of millet foods does Yasvik stock?', a: 'This category includes millet grains, flours, flakes, mixes, noodles, pasta and other millet-based staples.' },
      { q: 'Where can I buy millets near Chanda Nagar?', a: 'Yasvik Foods in Ashok Nagar, Chanda Nagar stocks millets and ragi. Visit the store, call, WhatsApp, or order local delivery.' },
      { q: 'Can I shop millet foods online in Hyderabad?', a: 'Yes. Yasvik offers millet foods online with store pickup and local delivery options.' },
    ],
  },
  'store-staples': {
    h1: 'Everyday Essentials',
    title: 'Organic Staples Chanda Nagar | Yasvik',
    description:
      'Organic staples, pulses and pantry foods at Yasvik organic food shop, Ashok Nagar, Chanda Nagar. Visit, call or order Hyderabad delivery.',
    intro:
      'Pantry staples and everyday essentials from Yasvik in Ashok Nagar, Chanda Nagar — chosen for regular family cooking.',
  },
  pooja: {
    h1: 'Pooja Essentials',
    title: 'Pooja Items Chanda Nagar | Camphor | Yasvik',
    description:
      'Pooja items, camphor, dhoop and festival supplies at Yasvik, Ashok Nagar, Chanda Nagar. Visit the store, call or WhatsApp to order.',
    intro:
      'Pooja essentials, camphor, dhoop and festival supplies at Yasvik in Ashok Nagar, Chanda Nagar — convenient for Lingampally and Ameenpur.',
    faqs: [
      { q: 'Do you sell pooja items near Chanda Nagar?', a: 'Yes. Yasvik Foods in Ashok Nagar, Chanda Nagar stocks pooja essentials including camphor and dhoop. Visit, call or WhatsApp.' },
      { q: 'What pooja supplies are available?', a: 'Availability varies — typically camphor, dhoop and selected festival essentials. Message WhatsApp for the current shelf.' },
    ],
  },
};

const RELATED_BY_SLUG = {
  snacks: ['pickles', 'spices', 'dry-fruits'],
  pickles: ['snacks', 'spices', 'cold-pressed-oils'],
  spices: ['pickles', 'cold-pressed-oils', 'ghee'],
  'cold-pressed-oils': ['ghee', 'spices', 'snacks'],
  ghee: ['honey', 'cold-pressed-oils', 'snacks'],
  honey: ['jaggery', 'ghee', 'dry-fruits'],
  jaggery: ['honey', 'snacks', 'heritage-rice'],
  'dry-fruits': ['snacks', 'honey', 'millets'],
  'heritage-rice': ['millets', 'store-staples', 'cold-pressed-oils'],
  millets: ['heritage-rice', 'store-staples', 'honey'],
  'store-staples': ['heritage-rice', 'millets', 'spices'],
};

function categorySlug(category = {}) {
  return resolveCategorySlugParam(category.slug || category.name || '');
}

export function getCategorySeoDefaults(slug = '') {
  const key = resolveCategorySlugParam(slug);
  return CATEGORY_SEO_DEFAULTS[key] || null;
}

export function buildCategorySeoMeta(category = {}, { origin } = {}) {
  const slug = categorySlug(category);
  const defaults = getCategorySeoDefaults(slug);
  const displayName = getCategoryDisplayName(category);
  const title = String(category.seo_title || defaults?.title || `${displayName} | Yasvik Hyderabad`).trim();
  const description = String(
    category.seo_description
      || defaults?.description
      || category.short_intro
      || category.description
      || `Shop ${displayName} from Yasvik in Hyderabad.`,
  ).trim();
  const intro = String(
    category.seo_intro
      || defaults?.intro
      || category.short_intro
      || category.description
      || '',
  ).trim();
  const h1 = String(defaults?.h1 || displayName).trim();
  const path = categoryShopPath(category);
  const canonicalOverride = String(category.canonical_override || '').trim();
  const canonicalUrl = canonicalOverride
    ? (canonicalOverride.startsWith('http')
      ? canonicalOverride
      : `${String(origin || 'https://www.yasvik.com').replace(/\/$/, '')}${canonicalOverride.startsWith('/') ? canonicalOverride : `/${canonicalOverride}`}`)
    : (origin ? `${String(origin).replace(/\/$/, '')}${path}` : path);

  return {
    slug,
    h1,
    title: title.slice(0, 60),
    description: description.slice(0, 158),
    intro,
    path,
    canonicalUrl,
    indexable: category.indexable !== false,
  };
}

export function buildCategoryFaqs(category = {}) {
  if (Array.isArray(category.seo_faqs) && category.seo_faqs.length) return category.seo_faqs.filter((item) => item?.q && item?.a);
  const defaults = getCategorySeoDefaults(categorySlug(category));
  return Array.isArray(defaults?.faqs) ? defaults.faqs : [];
}

export function listRelatedCategorySlugs(slug = '') {
  const key = resolveCategorySlugParam(slug);
  return RELATED_BY_SLUG[key] || [];
}

export function buildCategoryBreadcrumbJsonLd(category = {}, { origin = 'https://www.yasvik.com' } = {}) {
  const seo = buildCategorySeoMeta(category, { origin });
  const base = String(origin).replace(/\/$/, '');
  const items = [
    { '@type': 'ListItem', position: 1, name: 'Home', item: `${base}/` },
    { '@type': 'ListItem', position: 2, name: 'Shop', item: `${base}/shop` },
    { '@type': 'ListItem', position: 3, name: seo.h1, item: `${base}${seo.path}` },
  ];
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items,
  };
}

export function buildCategoryCollectionJsonLd(category = {}, productCount = 0, { origin = 'https://www.yasvik.com' } = {}) {
  const seo = buildCategorySeoMeta(category, { origin });
  const base = String(origin).replace(/\/$/, '');
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${base}${seo.path}#collection`,
    name: seo.h1,
    description: seo.description,
    url: `${base}${seo.path}`,
    isPartOf: {
      '@type': 'WebSite',
      '@id': WEBSITE_ENTITY_ID,
    },
    about: { '@id': STORE_ENTITY_ID },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: Math.max(0, Number(productCount) || 0),
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
    },
  };
}

export function buildCategoryFaqJsonLd(category = {}, { origin = 'https://www.yasvik.com' } = {}) {
  const seo = buildCategorySeoMeta(category, { origin });
  const faqs = buildCategoryFaqs(category);
  if (!faqs.length) return null;
  const base = String(origin).replace(/\/$/, '');
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${base}${seo.path}#faq`,
    mainEntity: faqs.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };
}
