import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  fetchAllAppSettings,
  getCachedSetting,
  resolveSetting,
  SETTINGS_QUERY_KEYS,
} from '@/services/settingsService';
import { BRAND_LOGO_HORIZONTAL, BRAND_LOGO_SYMBOL } from '@/lib/brandAssets';
import { optimizeMediaUrl } from '@/lib/mediaUrl';
import { buildLocalBusinessJsonLd } from '@/lib/storeLocation';
import {
  BRAND_KEYWORDS,
  ENTITY_DESCRIPTION,
  HOME_SEO,
  ORG_ENTITY_ID,
  SHOP_INDEX_SEO,
  STORE_PAGE_SEO,
  STORE_ENTITY_ID,
  WEBSITE_ENTITY_ID,
} from '@/lib/seoEntity';

const CURRENT_ADMIN_LOGO_URL = BRAND_LOGO_HORIZONTAL;
const CURRENT_ADMIN_SYMBOL_URL = BRAND_LOGO_SYMBOL;

const META_BY_ROUTE = [
  {
    match: (pathname) => pathname === '/',
    title: HOME_SEO.title,
    description: HOME_SEO.description,
    ogTitle: HOME_SEO.ogTitle,
    ogDescription: HOME_SEO.ogDescription,
    robots: 'index,follow',
    keywords: BRAND_KEYWORDS,
  },
  {
    match: (pathname) => pathname === '/store',
    title: STORE_PAGE_SEO.title,
    description: STORE_PAGE_SEO.description,
    robots: 'index,follow',
    keywords: BRAND_KEYWORDS,
  },
  {
    match: (pathname) => pathname.startsWith('/our-roots'),
    title: 'Our Roots | Yasvik | Better Food. Found.',
    description:
      'How Yasvik travels, learns and chooses — homemade snacks, pickles, oils, honey, jaggery, heritage rice, millets and everyday foods we can stand behind for Hyderabad homes.',
    robots: 'index,follow',
    keywords: BRAND_KEYWORDS,
  },
  {
    match: (pathname) => pathname.startsWith('/stories'),
    title: 'Yasvik Stories | Food Guides & Journeys',
    description:
      'Read Yasvik stories on homemade snacks, pickles, oils, heritage rice, millets, storage tips and the people behind the foods we choose in Hyderabad.',
    robots: 'index,follow',
    keywords: BRAND_KEYWORDS,
  },
  {
    match: (pathname) => pathname.startsWith('/journeys/'),
    title: 'Yasvik Journey | Food Origins & Regional Partners',
    description:
      'Discover a Yasvik sourcing journey linked to regional partners, places and traditional food practices.',
    robots: 'index,follow',
    keywords: BRAND_KEYWORDS,
  },
  {
    match: (pathname) => pathname.startsWith('/farmers') || pathname.startsWith('/people') || pathname.startsWith('/producers'),
    title: 'People Behind Yasvik | Makers & Partners',
    description:
      'Meet the makers, families and regional partners behind the foods Yasvik chooses for Hyderabad homes.',
    robots: 'index,follow',
    keywords: BRAND_KEYWORDS,
  },
  {
    match: (pathname) => pathname.startsWith('/contact'),
    title: 'Contact Yasvik | Ashok Nagar, Hyderabad',
    description:
      'Contact Yasvik for orders, store directions, delivery help and WhatsApp ordering in Ashok Nagar, Hyderabad.',
    robots: 'index,follow',
    keywords: BRAND_KEYWORDS,
  },
  {
    match: (pathname) => pathname.startsWith('/delivery-policy'),
    title: 'Delivery Policy | Yasvik Hyderabad',
    description:
      'Yasvik delivery, store pickup and shipping policy for orders across Hyderabad.',
    robots: 'index,follow',
    keywords: BRAND_KEYWORDS,
  },
  {
    match: (pathname) => pathname.startsWith('/checkout') || pathname.startsWith('/cart') || pathname.startsWith('/wishlist') || pathname.startsWith('/profile'),
    title: 'Yasvik',
    description: 'Yasvik — Better Food. Found. Hyderabad.',
    robots: 'noindex,nofollow',
    keywords: 'yasvik',
  },
  {
    match: (pathname) => pathname.startsWith('/admin') || pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/invoice'),
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

function removeJsonLd(id) {
  document.getElementById(id)?.remove();
}

function isShopRouteHandledByPage(pathname, search) {
  if (pathname.startsWith('/product/')) return true;
  if (/^\/shop\/[^/]+/.test(pathname)) return true;
  if (pathname === '/shop' && (search.includes('category=') || search.includes('search='))) return true;
  return false;
}

export default function SeoMetaManager() {
  const { pathname, search } = useLocation();
  const { data: settings = [] } = useQuery({
    queryKey: SETTINGS_QUERY_KEYS.seo,
    queryFn: fetchAllAppSettings,
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (isShopRouteHandledByPage(pathname, search)) return;

    const routeMeta = META_BY_ROUTE.find((item) => item.match(pathname)) || {
      title: SHOP_INDEX_SEO.title,
      description: SHOP_INDEX_SEO.description,
      robots: pathname.startsWith('/shop') ? 'index,follow' : 'index,follow',
      keywords: BRAND_KEYWORDS,
    };

    const origin = window.location.origin;
    const canonicalUrl = `${origin}${pathname}`;
    const faviconUrl = optimizeMediaUrl(String(resolveSetting(settings, 'brand_favicon_url', getCachedSetting('brand_favicon_url', CURRENT_ADMIN_SYMBOL_URL))), 'logo');
    const ogImageUrl = optimizeMediaUrl(String(
      resolveSetting(
        settings,
        'social_share_image_url',
        resolveSetting(settings, 'brand_og_image_url', getCachedSetting('social_share_image_url', CURRENT_ADMIN_LOGO_URL)),
      ),
    ), 'banner');
    const absoluteOgImageUrl = ogImageUrl.startsWith('http') ? ogImageUrl : `${origin}${ogImageUrl}`;

    const ogTitle = routeMeta.ogTitle || routeMeta.title;
    const ogDescription = routeMeta.ogDescription || routeMeta.description;

    document.title = routeMeta.title;
    upsertMeta('description', routeMeta.description);
    upsertMeta('robots', routeMeta.robots);
    upsertMeta('keywords', routeMeta.keywords || BRAND_KEYWORDS);
    upsertFavicon(faviconUrl);
    upsertCanonical(canonicalUrl);
    upsertPropertyMeta('og:title', ogTitle);
    upsertPropertyMeta('og:description', ogDescription);
    upsertPropertyMeta('og:type', 'website');
    upsertPropertyMeta('og:url', canonicalUrl);
    upsertPropertyMeta('og:site_name', 'Yasvik Foods');
    upsertPropertyMeta('og:image', absoluteOgImageUrl);
    upsertMeta('twitter:card', 'summary_large_image');
    upsertMeta('twitter:title', ogTitle);
    upsertMeta('twitter:description', ogDescription);
    upsertMeta('twitter:image', absoluteOgImageUrl);

    const gscVerification = import.meta.env.VITE_GOOGLE_SITE_VERIFICATION;
    if (gscVerification) {
      upsertMeta('google-site-verification', gscVerification);
    }

    removeJsonLd('yasvik-org-jsonld');
    removeJsonLd('yasvik-shop-breadcrumb-jsonld');
    removeJsonLd('yasvik-shop-collection-jsonld');
    removeJsonLd('yasvik-shop-faq-jsonld');

    const businessDescription = String(
      resolveSetting(settings, 'business_seo_description', getCachedSetting('business_seo_description', ENTITY_DESCRIPTION)),
    ).trim() || ENTITY_DESCRIPTION;
    const sameAs = (() => {
      try {
        const parsed = JSON.parse(resolveSetting(settings, 'social_same_as_json', '[]') || '[]');
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    })();
    const storeSchema = buildLocalBusinessJsonLd(origin, {
      description: businessDescription,
      instagramUrl: resolveSetting(settings, 'instagram_url', ''),
      facebookUrl: resolveSetting(settings, 'facebook_url', ''),
      youtubeUrl: resolveSetting(settings, 'youtube_url', ''),
      googleMapsUrl: resolveSetting(settings, 'store_google_maps_url', ''),
      latitude: resolveSetting(settings, 'store_geo_lat', ''),
      longitude: resolveSetting(settings, 'store_geo_lng', ''),
      sameAs,
    });

    if (pathname === '/') {
      upsertJsonLd('yasvik-website-jsonld', {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        '@id': WEBSITE_ENTITY_ID,
        name: 'Yasvik',
        alternateName: 'Yasvik Foods',
        url: origin,
        description: businessDescription,
        publisher: { '@id': ORG_ENTITY_ID },
        potentialAction: {
          '@type': 'SearchAction',
          target: `${origin}/shop?search={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      });
      upsertJsonLd('yasvik-org-jsonld', {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        '@id': ORG_ENTITY_ID,
        name: 'Yasvik Foods',
        alternateName: 'Yasvik',
        url: origin,
        description: businessDescription,
        sameAs: storeSchema.sameAs,
        logo: absoluteOgImageUrl,
      });
      upsertJsonLd('yasvik-store-jsonld', storeSchema);
    } else if (pathname === '/store' || pathname.startsWith('/contact')) {
      removeJsonLd('yasvik-website-jsonld');
      upsertJsonLd('yasvik-org-jsonld', {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        '@id': ORG_ENTITY_ID,
        name: 'Yasvik Foods',
        alternateName: 'Yasvik',
        url: origin,
        description: businessDescription,
        sameAs: storeSchema.sameAs,
        logo: absoluteOgImageUrl,
      });
      upsertJsonLd('yasvik-store-jsonld', storeSchema);
    } else {
      removeJsonLd('yasvik-store-jsonld');
      removeJsonLd('yasvik-website-jsonld');
      removeJsonLd('yasvik-org-jsonld');
    }
  }, [pathname, search, settings]);

  return null;
}

export { STORE_ENTITY_ID };
