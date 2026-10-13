import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  fetchAllAppSettings,
  resolveSetting,
  SETTINGS_QUERY_KEYS,
} from '@/services/settingsService';
import { STORE } from '@/brand/storeContact';

const BRAND_KEYWORDS =
  'yasvik, yasvik foods, yasvik natural foods, organic store chanda nagar, grocery store ashok nagar hyderabad, natural foods chanda nagar, millets chanda nagar, wood pressed oils hyderabad, jaggery chanda nagar, dry fruits lingampally, cold pressed oils hyderabad, native rice hyderabad, natural foods hyderabad, everyday essentials';

const META_BY_ROUTE = [
  {
    match: (pathname) => pathname === '/',
    title: 'Yasvik | Organic & Natural Foods in Ashok Nagar, Chanda Nagar',
    description: 'Shop millets, native rice, wood-pressed oils, ghee, pickles, jaggery and everyday staples at Yasvik, Ashok Nagar, Chanda Nagar. Call or WhatsApp to order across Hyderabad.',
    robots: 'index,follow',
    keywords: BRAND_KEYWORDS,
  },
  {
    match: (pathname) => pathname.startsWith('/shop'),
    title: 'Yasvik Shop | Millets, Oils, Ghee & Groceries | Chanda Nagar',
    description: 'Buy better everyday foods from Yasvik Chanda Nagar: millets, native rice, wood-pressed oils, pulses, spices, jaggery, dry fruits and everyday essentials.',
    robots: 'index,follow',
    keywords: BRAND_KEYWORDS,
  },
  {
    match: (pathname) => pathname.startsWith('/product/'),
    title: 'Yasvik Product',
    description: 'Explore Yasvik product details, variants, nutrition, sourcing notes and traceability where applicable.',
    robots: 'index,follow',
    keywords: BRAND_KEYWORDS,
  },
  {
    match: (pathname) => pathname.startsWith('/our-roots'),
    title: 'Our Roots | Yasvik Food Stories & Traditional Wisdom',
    description: 'Discover the stories, journeys, people and traditional food wisdom behind Yasvik’s better everyday foods.',
    robots: 'index,follow',
    keywords: BRAND_KEYWORDS,
  },
  {
    match: (pathname) => pathname === '/about',
    title: 'About Yasvik | Natural Foods & Everyday Essentials',
    description: 'Yasvik is a neighborhood food brand offering better everyday foods, trusted essentials and traditional food choices for modern families.',
    robots: 'index,follow',
    keywords: BRAND_KEYWORDS,
  },
  {
    match: (pathname) => pathname === '/journeys' || pathname === '/stories' || pathname === '/people',
    title: 'Yasvik | Better Everyday Foods',
    description: 'Yasvik Natural Foods & Everyday Essentials.',
    robots: 'noindex,nofollow',
    keywords: BRAND_KEYWORDS,
  },
  {
    match: (pathname) => pathname.startsWith('/journeys/'),
    title: 'Yasvik Journey | Trace Food to Farmers',
    description: 'Discover a Yasvik sourcing journey linked to farmers, villages, regions and traditional food practices.',
    robots: 'index,follow',
    keywords: BRAND_KEYWORDS,
  },
  {
    match: (pathname) => pathname.startsWith('/stories'),
    title: 'Yasvik Stories | Traditional Food Knowledge',
    description: 'Read Yasvik stories on better everyday foods, traditions, villages and practical family choices.',
    robots: 'index,follow',
    keywords: BRAND_KEYWORDS,
  },
  {
    match: (pathname) => pathname.startsWith('/people'),
    title: 'Yasvik People | Farmers & Producers',
    description: 'Meet the farmers, producers and partners behind selected Yasvik foods.',
    robots: 'index,follow',
    keywords: BRAND_KEYWORDS,
  },
  {
    match: (pathname) => pathname.startsWith('/contact'),
    title: 'Contact Yasvik | Call, WhatsApp & Store in Chanda Nagar',
    description: `Call ${STORE.phoneDisplay}, WhatsApp order, or visit Yasvik at ${STORE.addressLine}. Natural foods and Hyderabad delivery.`,
    robots: 'index,follow',
    keywords: BRAND_KEYWORDS,
  },
  {
    match: (pathname) => pathname.startsWith('/admin') || pathname.startsWith('/login') || pathname.startsWith('/register'),
    title: 'Yasvik',
    description: 'Yasvik',
    robots: 'noindex,nofollow',
    keywords: 'yasvik',
  },
];

function upsertMeta(name, content) {
  let meta = document.querySelector(`meta[name="${name}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', name);
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}

function upsertCanonical(href) {
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

function upsertPropertyMeta(property, content) {
  let meta = document.querySelector(`meta[property="${property}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('property', property);
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}

function upsertFavicon(href) {
  let link = document.querySelector('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'icon');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
  link.setAttribute('type', href.endsWith('.svg') ? 'image/svg+xml' : 'image/png');
}

function upsertJsonLd(id, payload) {
  const stale = document.getElementById(id);
  if (stale) stale.remove();
  const script = document.createElement('script');
  script.id = id;
  script.type = 'application/ld+json';
  script.text = JSON.stringify(payload);
  document.head.appendChild(script);
}

export default function SeoMetaManager() {
  const { pathname, search } = useLocation();
  const { data: settings = [] } = useQuery({
    queryKey: SETTINGS_QUERY_KEYS.seo,
    queryFn: fetchAllAppSettings,
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    const routeMeta = META_BY_ROUTE.find((item) => item.match(pathname)) || META_BY_ROUTE[0];
    const canonicalUrl = `${window.location.origin}${pathname}${search || ''}`;
    const faviconUrl = String(resolveSetting(settings, 'brand_favicon_url', '/brand-logos/symbol-original.svg'));
    const orgLogoUrl = String(resolveSetting(settings, 'brand_organization_logo_url', '/brand-logos/horizontal-logo-original.svg'));
    const ogImageUrl = String(resolveSetting(settings, 'brand_og_image_url', '/brand-logos/primary-logo-original.png'));
    const absoluteOgImageUrl = ogImageUrl.startsWith('http') ? ogImageUrl : `${window.location.origin}${ogImageUrl}`;

    document.title = routeMeta.title;
    upsertMeta('description', routeMeta.description);
    upsertMeta('robots', routeMeta.robots);
    upsertMeta('keywords', routeMeta.keywords || BRAND_KEYWORDS);
    upsertFavicon(faviconUrl);
    upsertCanonical(canonicalUrl);
    upsertPropertyMeta('og:title', routeMeta.title);
    upsertPropertyMeta('og:description', routeMeta.description);
    upsertPropertyMeta('og:type', pathname.startsWith('/product/') ? 'product' : 'website');
    upsertPropertyMeta('og:url', canonicalUrl);
    upsertPropertyMeta('og:site_name', 'Yasvik');
    upsertPropertyMeta('og:image', absoluteOgImageUrl);
    upsertMeta('twitter:card', 'summary');
    upsertMeta('twitter:title', routeMeta.title);
    upsertMeta('twitter:description', routeMeta.description);
    upsertMeta('twitter:image', absoluteOgImageUrl);

    if (pathname === '/') {
      const absoluteLogo = orgLogoUrl.startsWith('http') ? orgLogoUrl : `${window.location.origin}${orgLogoUrl}`;
      upsertJsonLd('yasvik-org-jsonld', {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: STORE.brandName,
        url: window.location.origin,
        logo: absoluteLogo,
        telephone: STORE.phoneE164,
        email: STORE.email,
        sameAs: [],
      });
      upsertJsonLd('yasvik-localbusiness-jsonld', {
        '@context': 'https://schema.org',
        '@type': 'GroceryStore',
        name: STORE.brandName,
        image: absoluteOgImageUrl,
        url: window.location.origin,
        telephone: STORE.phoneE164,
        email: STORE.email,
        priceRange: '₹₹',
        address: {
          '@type': 'PostalAddress',
          streetAddress: STORE.streetAddress,
          addressLocality: STORE.area,
          addressRegion: STORE.state,
          postalCode: STORE.postalCode,
          addressCountry: STORE.country,
        },
        areaServed: STORE.serviceArea.map((name) => ({ '@type': 'City', name })),
        description:
          'Natural and traditional foods store in Ashok Nagar, Chanda Nagar — millets, wood-pressed oils, ghee, pickles, jaggery and everyday staples. Order online, WhatsApp, or visit the store.',
      });
      upsertJsonLd('yasvik-website-jsonld', {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: STORE.brandName,
        url: window.location.origin,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${window.location.origin}/shop?search={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      });
    }
  }, [pathname, search, settings]);

  return null;
}
