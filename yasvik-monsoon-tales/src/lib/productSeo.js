const PRODUCT_SEO_PRESETS = [
  {
    match: ['wild forest honey', 'forest honey', 'honey'],
    keywords: ['raw wild forest honey', 'unpasteurized natural honey', 'forest honey India', 'traditional sweeteners'],
    fileName: 'yasvik-wild-forest-honey-glowing-glass-jar.webp',
    alt: 'Raw amber wild forest honey in a clear glass jar with wood dipper and honeycomb on a dark matte background.',
    title: 'Raw Wild Forest Honey | Yasvik Natural Foods',
    description: 'Shop wild forest honey from Yasvik, thoughtfully chosen for families looking for a better everyday sweetener.',
  },
  {
    match: ['a2 cow ghee', 'cow ghee', 'bilona ghee', 'ghee'],
    keywords: ['pure A2 cow ghee', 'traditional bilona ghee', 'grass fed cow ghee India', 'better cooking staples'],
    fileName: 'yasvik-premium-a2-cow-ghee-bilona-jar.webp',
    alt: 'Golden A2 cow ghee in a glass jar with rim lighting, matte label, and antique copper spoon on deep indigo.',
    title: 'Pure A2 Cow Ghee | Traditional Bilona | Yasvik Foods',
    description: 'Golden A2 cow ghee made for everyday family cooking, selected by Yasvik for trusted quality and better pantry choices.',
  },
  {
    match: ['groundnut oil', 'cold pressed oil', 'wood pressed oil', 'wood-pressed groundnut oil'],
    keywords: ['cold pressed groundnut oil', 'wood pressed unrefined oil', 'wood pressed oils', 'cooking oil'],
    fileName: 'yasvik-cold-pressed-groundnut-oil-amber-bottle.webp',
    alt: 'Golden cold-pressed groundnut oil in a glass bottle with raw peanuts on a dark slate surface.',
    title: 'Cold-Pressed Groundnut Oil | Clean Cooking | Yasvik Foods',
    description: 'Wood-pressed groundnut oil from Yasvik for families choosing a better everyday cooking oil.',
  },
  {
    match: ['kodo rice', 'kodo millet'],
    keywords: ['kodo rice millets', 'unpolished heritage grains', 'ancient millets India', 'native grains'],
    fileName: 'yasvik-heritage-kodo-rice-unpolished-grains.webp',
    alt: 'Unpolished Kodo rice millets in Yasvik packaging with raw heritage grains on a clean surface.',
    title: 'Heritage Kodo Rice Millets | Ancient Grains | Yasvik',
    description: 'Shop Kodo rice millets from Yasvik, a better everyday grain choice inspired by traditional food wisdom.',
  },
];

function normalizeText(value = '') {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function truncate(value = '', maxLength = 155) {
  const text = normalizeText(value);
  if (text.length <= maxLength) return text;
  const sliced = text.slice(0, maxLength - 1);
  return `${sliced.slice(0, Math.max(0, sliced.lastIndexOf(' '))).trim()}.`;
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
    ...(Array.isArray(product.tags) ? product.tags : []),
  ].join(' ').toLowerCase();

  return PRODUCT_SEO_PRESETS.find((preset) => preset.match.some((term) => haystack.includes(term)));
}

function slugify(value = '') {
  return normalizeText(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isRandomPlaceholder(url = '') {
  return /picsum\.photos|source\.unsplash\.com|placehold/i.test(String(url || ''));
}

export function getProductImage(product = {}) {
  const gallery = Array.isArray(product.images) ? product.images : [];
  const imageUrls = Array.isArray(product.image_urls) ? product.image_urls : [];
  const candidates = [
    product.hero_image,
    product.featured_image_url,
    product.image_url,
    gallery[0],
    imageUrls[0],
  ];
  return normalizeText(candidates.find((url) => normalizeText(url) && !isRandomPlaceholder(url)) || '');
}

export function buildSeoImageFileName(product = {}) {
  const preset = getPreset(product);
  if (preset?.fileName) return preset.fileName;
  return `yasvik-${slugify(getProductTitle(product)) || 'everyday-food'}-product.webp`;
}

export function buildProductAltText(product = {}) {
  const explicit = normalizeText(product.image_alt_text || product.alt_text || product.hero_image_alt || '');
  if (explicit) return truncate(explicit, 125);

  const preset = getPreset(product);
  if (preset?.alt) return truncate(preset.alt, 125);

  const title = getProductTitle(product);
  const unit = normalizeText(product.unit);
  const trace = product.person_id ? ' traceable' : ' trusted';
  return truncate(`${title}${unit ? ` ${unit}` : ''}, a${trace} Yasvik grocery product photographed clearly for online shopping.`, 125);
}

export function buildProductSeoMeta(product = {}) {
  const title = getProductTitle(product);
  const preset = getPreset(product);
  const descriptionBase =
    product.seo_description ||
    preset?.description ||
    product.short_description ||
    product.description ||
    `${title} from Yasvik, selected as a better everyday food for modern family kitchens.`;

  const keywords = normalizeText(product.seo_keywords) ||
    (Array.isArray(preset?.keywords) ? preset.keywords.join(', ') : `yasvik ${title.toLowerCase()}, natural foods, everyday essentials, better groceries`);

  return {
    title: truncate(product.seo_title || preset?.title || `${title} | Yasvik Foods`, 60),
    description: truncate(descriptionBase, 158),
    keywords,
    image: getProductImage(product),
    imageAlt: buildProductAltText(product),
    recommendedFileName: buildSeoImageFileName(product),
  };
}
