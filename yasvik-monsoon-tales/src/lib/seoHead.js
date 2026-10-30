import { buildProductJsonLd, buildProductBreadcrumbJsonLd } from '@/lib/productSeo';

export function upsertMeta(name, content) {
  if (!content) return;
  let meta = document.querySelector(`meta[name="${name}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', name);
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}

export function upsertPropertyMeta(property, content) {
  if (!content) return;
  let meta = document.querySelector(`meta[property="${property}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('property', property);
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}

export function upsertCanonical(href) {
  if (!href) return;
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

export function upsertJsonLd(id, payload) {
  document.getElementById(id)?.remove();
  const script = document.createElement('script');
  script.id = id;
  script.type = 'application/ld+json';
  script.text = JSON.stringify(payload);
  document.head.appendChild(script);
}

export function applyProductSeoHead({ seo, canonicalUrl, price, inStock, product, reviewStats, categoryMeta = null, faqJsonLd = null }) {
  const seoImage = seo.image;

  document.title = seo.title;
  upsertMeta('description', seo.description);
  upsertMeta('keywords', seo.keywords);
  upsertMeta('robots', product?.indexable === false ? 'noindex,follow' : 'index,follow');
  upsertCanonical(canonicalUrl);
  upsertPropertyMeta('og:title', seo.title);
  upsertPropertyMeta('og:description', seo.description);
  upsertPropertyMeta('og:type', 'product');
  upsertPropertyMeta('og:url', canonicalUrl);
  upsertPropertyMeta('og:site_name', 'Yasvik Foods');
  upsertPropertyMeta('og:image', seoImage);
  upsertPropertyMeta('og:image:alt', seo.imageAlt);
  if (price > 0) {
    upsertPropertyMeta('product:price:amount', String(price));
    upsertPropertyMeta('product:price:currency', 'INR');
  }
  upsertMeta('twitter:card', 'summary_large_image');
  upsertMeta('twitter:title', seo.title);
  upsertMeta('twitter:description', seo.description);
  upsertMeta('twitter:image', seoImage);

  const jsonLdOptions = {
    price,
    inStock,
    ratingValue: reviewStats?.avg,
    reviewCount: reviewStats?.count,
  };
  upsertJsonLd('yasvik-product-jsonld', buildProductJsonLd(product, jsonLdOptions));
  upsertJsonLd(
    'yasvik-product-breadcrumb-jsonld',
    buildProductBreadcrumbJsonLd(product, {
      categoryName: categoryMeta?.name,
      categoryPath: categoryMeta?.path,
    }),
  );
  if (faqJsonLd) upsertJsonLd('yasvik-product-faq-jsonld', faqJsonLd);
  else document.getElementById('yasvik-product-faq-jsonld')?.remove();
}

export function clearProductSeoHead() {
  document.getElementById('yasvik-product-jsonld')?.remove();
  document.getElementById('yasvik-product-breadcrumb-jsonld')?.remove();
  document.getElementById('yasvik-product-faq-jsonld')?.remove();
}

function applyCommonSocialMeta({ title, description, url, image, type = 'website', robots = 'index,follow' }) {
  document.title = title;
  upsertMeta('description', description);
  upsertMeta('robots', robots);
  upsertCanonical(url);
  upsertPropertyMeta('og:title', title);
  upsertPropertyMeta('og:description', description);
  upsertPropertyMeta('og:type', type);
  upsertPropertyMeta('og:url', url);
  upsertPropertyMeta('og:site_name', 'Yasvik Foods');
  if (image) upsertPropertyMeta('og:image', image);
  upsertMeta('twitter:card', 'summary_large_image');
  upsertMeta('twitter:title', title);
  upsertMeta('twitter:description', description);
  if (image) upsertMeta('twitter:image', image);
}

export function applyShopSeoHead({
  title,
  description,
  canonicalUrl,
  ogImage,
  robots = 'index,follow',
  breadcrumbJsonLd = null,
  collectionJsonLd = null,
  faqJsonLd = null,
}) {
  applyCommonSocialMeta({
    title,
    description,
    url: canonicalUrl,
    image: ogImage,
    robots,
  });
  if (breadcrumbJsonLd) upsertJsonLd('yasvik-shop-breadcrumb-jsonld', breadcrumbJsonLd);
  else document.getElementById('yasvik-shop-breadcrumb-jsonld')?.remove();
  if (collectionJsonLd) upsertJsonLd('yasvik-shop-collection-jsonld', collectionJsonLd);
  else document.getElementById('yasvik-shop-collection-jsonld')?.remove();
  if (faqJsonLd) upsertJsonLd('yasvik-shop-faq-jsonld', faqJsonLd);
  else document.getElementById('yasvik-shop-faq-jsonld')?.remove();
}

export function clearShopSeoHead() {
  document.getElementById('yasvik-shop-breadcrumb-jsonld')?.remove();
  document.getElementById('yasvik-shop-collection-jsonld')?.remove();
  document.getElementById('yasvik-shop-faq-jsonld')?.remove();
}
