const SITE_ORIGIN = 'https://www.yasvik.com';
const BRAND_NAME = 'Yasvik Foods';
const FALLBACK_IMAGE = `${SITE_ORIGIN}/media/brand/logo-horizontal.png`;
const PLACEHOLDER_RE = /picsum\.photos|source\.unsplash\.com|placehold/i;

const PRODUCT_SEO_PRESETS = [
  {
    match: ['wild forest honey', 'forest honey', 'honey'],
    keywords: ['raw wild forest honey', 'organic honey Chanda Nagar', 'buy honey online Hyderabad', 'honey near Lingampally'],
    title: 'Raw Wild Forest Honey | Yasvik Chanda Nagar',
    description: 'Raw wild forest honey at Yasvik, Ashok Nagar, Chanda Nagar. Visit, call, WhatsApp or order Hyderabad delivery.',
  },
  {
    match: ['a2 cow ghee', 'cow ghee', 'bilona ghee', 'ghee'],
    keywords: ['pure A2 cow ghee', 'cow ghee Chanda Nagar', 'bilona ghee Hyderabad', 'buy ghee near Lingampally'],
    title: 'Pure Cow Ghee | Yasvik Chanda Nagar',
    description: 'Pure cow ghee at Yasvik, Ashok Nagar, Chanda Nagar. Visit the store, call, WhatsApp or order local delivery.',
  },
  {
    match: ['groundnut oil', 'cold pressed oil', 'cold-pressed oil', 'sesame oil', 'wood pressed'],
    keywords: ['cold pressed oil near me', 'cold pressed groundnut oil Chanda Nagar', 'wood pressed oil Lingampally', 'sesame oil Ameenpur'],
    title: 'Cold-Pressed Oil | Yasvik Chanda Nagar',
    description: 'Cold-pressed and wood-pressed oils at Yasvik, Ashok Nagar, Chanda Nagar. Visit, call, WhatsApp or Hyderabad delivery.',
  },
  {
    match: ['kodo rice', 'kodo millet'],
    keywords: ['kodo millet Chanda Nagar', 'unpolished millets Hyderabad', 'millets near Lingampally'],
    title: 'Kodo Millet | Yasvik Chanda Nagar',
    description: 'Kodo millet at Yasvik, Ashok Nagar, Chanda Nagar. Visit, call, WhatsApp or order Hyderabad delivery.',
  },
  {
    match: ['millet', 'ragi', 'foxtail', 'barnyard', 'little millet', 'sorghum', 'jowar'],
    keywords: ['millets near me', 'millets Chanda Nagar', 'ragi flour Lingampally', 'organic millets Hyderabad'],
    title: null,
    description: 'Millets and ragi at Yasvik, Ashok Nagar, Chanda Nagar. Visit, call, WhatsApp or order local Hyderabad delivery.',
  },
  {
    match: ['pooja', 'camphor', 'kapoor', 'dhoop', 'agarbatti'],
    keywords: ['pooja items near me', 'pooja store Chanda Nagar', 'camphor Lingampally', 'dhoop Ameenpur'],
    title: 'Pooja Items | Yasvik Chanda Nagar',
    description: 'Pooja items, camphor and dhoop at Yasvik, Ashok Nagar, Chanda Nagar. Visit, call or WhatsApp to order.',
  },
  {
    match: ['dal', 'pulse', 'toor', 'moong', 'urad', 'chana', 'rajma'],
    keywords: ['pulses Chanda Nagar', 'toor dal near me', 'organic dal Hyderabad', 'buy dal Lingampally'],
    title: null,
    description: 'Dals and pulses at Yasvik, Ashok Nagar, Chanda Nagar. Visit, call, WhatsApp or order Hyderabad delivery.',
  },
  {
    match: ['spice', 'masala', 'turmeric', 'chilli', 'pepper', 'cumin'],
    keywords: ['spice powders Chanda Nagar', 'podi Hyderabad', 'homemade masala Lingampally'],
    title: null,
    description: 'Spice powders and podis at Yasvik, Ashok Nagar, Chanda Nagar. Visit, call, WhatsApp or order local delivery.',
  },
  {
    match: ['jaggery', 'bellam'],
    keywords: ['jaggery Chanda Nagar', 'organic jaggery Hyderabad', 'bellam near Lingampally'],
    title: null,
    description: 'Jaggery and natural sweeteners at Yasvik, Ashok Nagar, Chanda Nagar. Visit, call or order Hyderabad delivery.',
  },
];

function normalizeText(value = '') {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function truncate(value = '', maxLength = 155) {
  const text = normalizeText(value);
  if (text.length <= maxLength) return text;
  const sliced = text.slice(0, maxLength - 1);
  const lastSpace = sliced.lastIndexOf(' ');
  return `${(lastSpace > 40 ? sliced.slice(0, lastSpace) : sliced).trim()}.`;
}

function normalizeList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [trimmed];
    }
  }
  return [];
}

function getProductTitle(product = {}) {
  return normalizeText(product.title || product.name || 'Yasvik product');
}

function getPreset(product = {}) {
  const haystack = [
    product.title,
    product.name,
    product.slug,
    product.short_description,
    product.description,
    product.category_name,
    ...(Array.isArray(product.tags) ? product.tags : []),
  ].join(' ').toLowerCase();

  return PRODUCT_SEO_PRESETS.find((preset) => preset.match.some((term) => haystack.includes(term)));
}

export function resolveAbsoluteMediaUrl(url = '', options = {}) {
  const mediaBase = String(options.mediaBase || 'https://media.yasvik.com').replace(/\/$/, '');
  const siteOrigin = String(options.siteOrigin || SITE_ORIGIN).replace(/\/$/, '');
  const raw = String(url || '').trim();
  if (!raw || PLACEHOLDER_RE.test(raw)) return '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  if (raw.startsWith('/')) return `${siteOrigin}${raw}`;
  return `${mediaBase}/${raw.replace(/^\//, '')}`;
}

export function getProductImageUrls(product = {}, options = {}) {
  const gallery = [
    ...normalizeList(product.images),
    ...normalizeList(product.image_urls),
  ]
    .map((item) => resolveAbsoluteMediaUrl(item, options))
    .filter(Boolean);

  const primary = resolveAbsoluteMediaUrl(
    product.hero_image || product.featured_image_url || product.image_url || gallery[0] || '',
    options,
  );

  const unique = [primary, ...gallery].filter((url, index, arr) => url && arr.indexOf(url) === index);
  return {
    primary: primary || FALLBACK_IMAGE,
    all: unique.length ? unique : [FALLBACK_IMAGE],
  };
}

export function getProductPath(product = {}) {
  const slug = String(product.slug || '').trim();
  if (slug) return `/product/${slug}`;
  const id = String(product.id || '').trim();
  return id ? `/product/${id}` : '/shop';
}

export function getProductCanonicalUrl(product = {}, origin = SITE_ORIGIN) {
  const base = String(origin || SITE_ORIGIN).replace(/\/$/, '');
  const override = normalizeText(product.canonical_override);
  if (override) {
    return override.startsWith('http') ? override : `${base}${override.startsWith('/') ? override : `/${override}`}`;
  }
  return `${base}${getProductPath(product)}`;
}

export function buildProductAltText(product = {}) {
  const explicit = normalizeText(product.image_alt_text || product.alt_text || product.hero_image_alt || '');
  if (explicit) return truncate(explicit, 125);

  const title = getProductTitle(product);
  const unit = normalizeText(product.unit);
  const brandPrefix = unit ? `${title} ${unit}` : title;
  return truncate(`${brandPrefix} — Yasvik`, 125);
}

function buildAutoTitle(product = {}) {
  const title = getProductTitle(product);
  const preset = getPreset(product);
  if (product.seo_title) return truncate(product.seo_title, 60);
  if (preset?.title) return truncate(preset.title, 60);
  const localName = normalizeText(product.local_name || product.telugu_name || '');
  if (localName && !title.toLowerCase().includes(localName.toLowerCase())) {
    return truncate(`${title} (${localName}) | Yasvik Hyderabad`, 60);
  }
  return truncate(`${title} | Buy Online | Yasvik Hyderabad`, 60);
}

function buildAutoDescription(product = {}) {
  const title = getProductTitle(product);
  const preset = getPreset(product);
  const localName = normalizeText(product.local_name || product.telugu_name || '');
  const category = normalizeText(product.category_name || product.product_group || '');
  const processing = normalizeText(product.processing_method || product.process_method || '');
  const unit = normalizeText(product.unit);

  const parts = [];
  if (product.seo_description) return truncate(product.seo_description, 158);
  if (preset?.description) return truncate(preset.description, 158);

  if (product.short_description) {
    parts.push(normalizeText(product.short_description));
  } else if (product.description) {
    parts.push(normalizeText(product.description).slice(0, 120));
  } else {
    parts.push(`Shop ${title} from Yasvik`);
    if (category) parts.push(`in our ${category} range`);
    if (processing) parts.push(`— ${processing.toLowerCase()}`);
  }

  if (localName && !parts.join(' ').includes(localName)) {
    parts.push(`(${localName})`);
  }
  if (unit) parts.push(`Available in ${unit}.`);
  parts.push('Order online with delivery across Hyderabad.');

  return truncate(parts.join(' ').replace(/\s+/g, ' '), 158);
}

export function buildProductSeoMeta(product = {}, options = {}) {
  const title = getProductTitle(product);
  const preset = getPreset(product);
  const images = getProductImageUrls(product, options);
  const keywords = normalizeText(product.seo_keywords) ||
    (Array.isArray(preset?.keywords) ? preset.keywords.join(', ') : `yasvik ${title.toLowerCase()}, buy ${title.toLowerCase()} online, yasvik grocery hyderabad`);

  return {
    title: buildAutoTitle(product),
    description: buildAutoDescription(product),
    keywords,
    image: images.primary,
    images: images.all.slice(0, 8),
    imageAlt: buildProductAltText(product),
    canonicalUrl: getProductCanonicalUrl(product, options.siteOrigin),
  };
}

export function buildProductJsonLd(product = {}, options = {}) {
  const seo = buildProductSeoMeta(product, options);
  const price = Number(options.price ?? product.price ?? 0);
  const inStock = options.inStock ?? (
    product.availability === 'in_stock' || Number(product.stock ?? product.stock_quantity ?? 1) > 0
  );
  const canonicalUrl = seo.canonicalUrl;

  const payload = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: getProductTitle(product),
    image: seo.images,
    description: seo.description,
    sku: product.sku || undefined,
    url: canonicalUrl,
    brand: { '@type': 'Brand', name: BRAND_NAME },
    offers: {
      '@type': 'Offer',
      url: canonicalUrl,
      priceCurrency: String(product.currency || 'INR').toUpperCase(),
      price: price > 0 ? price.toFixed(2) : undefined,
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'GroceryStore',
        '@id': `${SITE_ORIGIN}/#store`,
        name: BRAND_NAME,
        url: SITE_ORIGIN,
      },
    },
  };

  if (options.ratingValue && options.reviewCount) {
    payload.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: String(options.ratingValue),
      reviewCount: String(options.reviewCount),
      bestRating: '5',
      worstRating: '1',
    };
  }

  if (product.category_name || product.product_group) {
    payload.category = product.category_name || product.product_group;
  }

  return payload;
}

export function buildProductBreadcrumbJsonLd(product = {}, options = {}) {
  const canonicalUrl = getProductCanonicalUrl(product, options.siteOrigin);
  const siteOrigin = String(options.siteOrigin || SITE_ORIGIN).replace(/\/$/, '');
  const categoryName = normalizeText(options.categoryName || product.category_name || '');
  const categoryPath = String(options.categoryPath || '').trim();
  const items = [
    { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteOrigin}/` },
    { '@type': 'ListItem', position: 2, name: 'Shop', item: `${siteOrigin}/shop` },
  ];

  if (categoryName && categoryPath) {
    items.push({
      '@type': 'ListItem',
      position: 3,
      name: categoryName,
      item: categoryPath.startsWith('http') ? categoryPath : `${siteOrigin}${categoryPath}`,
    });
    items.push({
      '@type': 'ListItem',
      position: 4,
      name: getProductTitle(product),
      item: canonicalUrl,
    });
  } else {
    items.push({
      '@type': 'ListItem',
      position: 3,
      name: getProductTitle(product),
      item: canonicalUrl,
    });
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items,
  };
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function upsertHtmlMeta(html, attrs) {
  const { name, property, content } = attrs;
  if (!content) return html;
  const attrName = property ? 'property' : 'name';
  const attrValue = property || name;
  const tag = `<meta ${attrName}="${attrValue}" content="${escapeHtml(content)}" />`;
  const pattern = new RegExp(`<meta[^>]+${attrName}=["']${attrValue}["'][^>]*>`, 'i');
  if (pattern.test(html)) {
    return html.replace(pattern, tag);
  }
  return html.replace('</head>', `  ${tag}\n  </head>`);
}

function upsertHtmlLink(html, rel, href) {
  if (!href) return html;
  const tag = `<link rel="${rel}" href="${escapeHtml(href)}" />`;
  const pattern = new RegExp(`<link[^>]+rel=["']${rel}["'][^>]*>`, 'i');
  if (pattern.test(html)) {
    return html.replace(pattern, tag);
  }
  return html.replace('</head>', `  ${tag}\n  </head>`);
}

function upsertHtmlJsonLd(html, id, payload) {
  const serialized = JSON.stringify(payload).replace(/</g, '\\u003c');
  const tag = `<script id="${id}" type="application/ld+json">${serialized}</script>`;
  const pattern = new RegExp(`<script[^>]+id=["']${id}["'][^>]*>[\\s\\S]*?<\\/script>`, 'i');
  if (pattern.test(html)) {
    return html.replace(pattern, tag);
  }
  return html.replace('</head>', `  ${tag}\n  </head>`);
}

export function injectProductSeoIntoHtml(html, product = {}, options = {}) {
  const seo = buildProductSeoMeta(product, options);
  const price = Number(options.price ?? product.price ?? 0);
  const inStock = options.inStock ?? (
    product.availability === 'in_stock' || Number(product.stock ?? product.stock_quantity ?? 1) > 0
  );

  let next = html;
  next = next.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(seo.title)}</title>`);
  next = upsertHtmlMeta(next, { name: 'description', content: seo.description });
  next = upsertHtmlMeta(next, { name: 'keywords', content: seo.keywords });
  next = upsertHtmlMeta(next, { name: 'robots', content: product.indexable === false ? 'noindex,follow' : 'index,follow' });
  next = upsertHtmlLink(next, 'canonical', seo.canonicalUrl);
  next = upsertHtmlMeta(next, { property: 'og:title', content: seo.title });
  next = upsertHtmlMeta(next, { property: 'og:description', content: seo.description });
  next = upsertHtmlMeta(next, { property: 'og:type', content: 'product' });
  next = upsertHtmlMeta(next, { property: 'og:url', content: seo.canonicalUrl });
  next = upsertHtmlMeta(next, { property: 'og:site_name', content: BRAND_NAME });
  next = upsertHtmlMeta(next, { property: 'og:image', content: seo.image });
  next = upsertHtmlMeta(next, { property: 'og:image:alt', content: seo.imageAlt });
  next = upsertHtmlMeta(next, { name: 'twitter:card', content: 'summary_large_image' });
  next = upsertHtmlMeta(next, { name: 'twitter:title', content: seo.title });
  next = upsertHtmlMeta(next, { name: 'twitter:description', content: seo.description });
  next = upsertHtmlMeta(next, { name: 'twitter:image', content: seo.image });
  if (price > 0) {
    next = upsertHtmlMeta(next, { property: 'product:price:amount', content: String(price) });
    next = upsertHtmlMeta(next, { property: 'product:price:currency', content: 'INR' });
  }
  next = upsertHtmlJsonLd(next, 'yasvik-product-jsonld', buildProductJsonLd(product, { ...options, price, inStock }));
  next = upsertHtmlJsonLd(next, 'yasvik-product-breadcrumb-jsonld', buildProductBreadcrumbJsonLd(product, options));
  return next;
}

export function isSearchBot(userAgent = '') {
  return /googlebot|google-inspectiontool|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|slackbot|discordbot|pinterest|applebot|semrushbot|ahrefsbot|mj12bot|petalbot/i.test(userAgent);
}
