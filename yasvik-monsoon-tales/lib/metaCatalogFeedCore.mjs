const PRICING_META_LABEL = '__yasvik_pricing__';
const PLACEHOLDER_RE = /picsum\.photos|source\.unsplash\.com|placehold/i;
const SITE_ORIGIN = 'https://www.yasvik.com';
const BRAND_NAME = 'Yasvik';
const FALLBACK_IMAGE = `${SITE_ORIGIN}/media/brand/logo-horizontal.png`;

export const META_CATALOG_CSV_HEADERS = [
  'id',
  'title',
  'description',
  'availability',
  'condition',
  'price',
  'link',
  'image_link',
  'brand',
  'item_group_id',
  'size',
  'sale_price',
  'additional_image_link',
  'origin_country',
  'wa_compliance_category',
];

function normalizeList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function cleanText(value = '', max = 9999) {
  const text = String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '';
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

function csvEscape(value = '') {
  const text = String(value ?? '');
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function isPricingMetaVariant(variant) {
  return variant?.label === PRICING_META_LABEL || variant?.sku === PRICING_META_LABEL;
}

function normalizeVariant(variant = {}) {
  if (!variant || typeof variant !== 'object' || isPricingMetaVariant(variant)) return null;
  const label = String(variant.label || variant.title || variant.name || variant.pack_size || '').trim();
  if (!label) return null;
  const price = Number(variant.price);
  return {
    label,
    sku: String(variant.sku || variant.SKU || '').trim(),
    price: Number.isFinite(price) ? price : null,
    compare_price: Number(variant.compare_price ?? variant.comparePrice),
    image_url: String(variant.image_url || '').trim(),
    image_urls: normalizeList(variant.image_urls).map((item) => String(item || '').trim()).filter(Boolean),
  };
}

function getProductVariants(product = {}) {
  return normalizeList(product.quick_variants ?? product.variants ?? [])
    .map(normalizeVariant)
    .filter(Boolean);
}

function getProductPath(product = {}) {
  const slug = String(product.slug || '').trim();
  if (slug) return `/product/${slug}`;
  const id = String(product.id || '').trim();
  return id ? `/product/${id}` : '/shop';
}

function resolveAbsoluteMediaUrl(url = '', options = {}) {
  const mediaBase = String(options.mediaBase || 'https://media.yasvik.com').replace(/\/$/, '');
  const siteOrigin = String(options.siteOrigin || SITE_ORIGIN).replace(/\/$/, '');
  const raw = String(url || '').trim();
  if (!raw || PLACEHOLDER_RE.test(raw)) return '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  if (raw.startsWith('/')) return `${siteOrigin}${raw}`;
  return `${mediaBase}/${raw.replace(/^\//, '')}`;
}

function getProductImages(product = {}, options = {}) {
  const gallery = normalizeList(product.images).map((item) => resolveAbsoluteMediaUrl(item, options)).filter(Boolean);
  const hero = resolveAbsoluteMediaUrl(
    product.hero_image || product.featured_image_url || gallery[0] || '',
    options,
  );
  const additional = gallery.filter((url) => url && url !== hero);
  return {
    primary: hero || FALLBACK_IMAGE,
    additional,
  };
}

function formatMetaPrice(amount, currency = 'INR') {
  const value = Number(amount);
  if (!Number.isFinite(value) || value < 0) return '';
  return `${value.toFixed(2)} ${String(currency || 'INR').toUpperCase()}`;
}

function productAvailability(product = {}, variant = null) {
  const stock = Number(product.stock_quantity ?? product.stock ?? 0);
  if (variant?.stock_quantity != null) {
    return Number(variant.stock_quantity) > 0 ? 'in stock' : 'out of stock';
  }
  return stock > 0 ? 'in stock' : 'out of stock';
}

function buildProductTitle(product = {}, variant = null) {
  const baseName = String(product.name || product.title || 'Yasvik product').trim();
  const localName = String(product.local_name || product.name_te || '').trim();
  const name = localName && !baseName.includes(localName) ? `${baseName} / ${localName}` : baseName;
  if (!variant?.label) return cleanText(name, 150);
  return cleanText(`${name} — ${variant.label}`, 150);
}

function buildProductDescription(product = {}) {
  return cleanText(
    product.seo_description ||
      product.short_description ||
      product.description ||
      `${product.name || 'Yasvik product'} — thoughtfully chosen everyday food from Yasvik, Hyderabad.`,
    5000,
  );
}

function stableCatalogId(product = {}, variant = null) {
  const productKey = String(product.sku || product.product_code || product.slug || product.id || '').trim();
  if (!variant) return cleanText(productKey, 100);
  const variantKey = String(variant.sku || variant.label || 'default').trim();
  return cleanText(`${productKey}-${variantKey}`, 100);
}

function buildCatalogRow(product = {}, variant = null, options = {}) {
  const siteOrigin = String(options.siteOrigin || SITE_ORIGIN).replace(/\/$/, '');
  const currency = String(product.currency || 'INR').toUpperCase();
  const variants = getProductVariants(product);
  const selectedVariant = variant || (variants.length === 1 ? variants[0] : null);
  const sellingPrice = Number(
    selectedVariant?.price ??
      product.price ??
      0,
  );
  if (!Number.isFinite(sellingPrice) || sellingPrice <= 0) return null;

  const comparePrice = Number(
    selectedVariant?.compare_price ??
      product.compare_price ??
      product.discount_price ??
      0,
  );
  const onSale = Number.isFinite(comparePrice) && comparePrice > sellingPrice;
  const listPrice = onSale ? comparePrice : sellingPrice;
  const salePrice = onSale ? sellingPrice : '';
  const images = getProductImages(product, options);
  const variantImage = resolveAbsoluteMediaUrl(selectedVariant?.image_url || selectedVariant?.image_urls?.[0], options);
  const imageLink = variantImage || images.primary;
  const additionalImages = [
    ...images.additional,
    ...(variantImage ? images.additional : []),
  ].filter((url, index, arr) => url && arr.indexOf(url) === index && url !== imageLink);

  const link = `${siteOrigin}${getProductPath(product)}`;
  const itemGroupId = variants.length > 1
    ? String(product.sku || product.product_code || product.slug || product.id || '').trim()
    : '';

  return {
    id: stableCatalogId(product, selectedVariant),
    title: buildProductTitle(product, selectedVariant),
    description: buildProductDescription(product),
    availability: productAvailability(product, selectedVariant),
    condition: 'new',
    price: formatMetaPrice(listPrice, currency),
    link,
    image_link: imageLink,
    brand: BRAND_NAME,
    item_group_id: itemGroupId,
    size: selectedVariant?.label || '',
    sale_price: salePrice ? formatMetaPrice(salePrice, currency) : '',
    additional_image_link: additionalImages.slice(0, 5).join(','),
    origin_country: 'IN',
    wa_compliance_category: 'DEFAULT',
  };
}

export function buildMetaCatalogRows(products = [], options = {}) {
  const rows = [];
  const seenIds = new Set();

  for (const product of products) {
    if (!product || product.is_published === false) continue;
    const variants = getProductVariants(product);

    const candidates = variants.length > 0
      ? variants.map((variant) => buildCatalogRow(product, variant, options))
      : [buildCatalogRow(product, null, options)];

    candidates.forEach((row) => {
      if (!row?.id || !row.title || !row.price || !row.image_link || !row.link) return;
      if (seenIds.has(row.id)) return;
      seenIds.add(row.id);
      rows.push(row);
    });
  }

  return rows;
}

export function buildMetaCatalogCsv(products = [], options = {}) {
  const rows = buildMetaCatalogRows(products, options);
  const lines = [
    META_CATALOG_CSV_HEADERS.join(','),
    ...rows.map((row) => META_CATALOG_CSV_HEADERS.map((key) => csvEscape(row[key] ?? '')).join(',')),
  ];
  return `${lines.join('\n')}\n`;
}

export function getMetaCatalogFeedUrls(options = {}) {
  const siteOrigin = String(options.siteOrigin || SITE_ORIGIN).replace(/\/$/, '');
  const token = String(options.token || '').trim();
  const query = token ? `?token=${encodeURIComponent(token)}` : '';
  return {
    liveFeedUrl: `${siteOrigin}/api/catalog/meta-feed.csv${query}`,
    staticFeedUrl: `${siteOrigin}/catalog/meta-feed.csv`,
  };
}
