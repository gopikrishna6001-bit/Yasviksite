import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { products as productsApi } from '@/services/api';
import HomeHeroSection from '@/components/home/HomeHeroSection';
import HomepageCategorySections from '@/components/home/HomepageCategorySections';
import BestSellerCarousel from '@/components/home/BestSellerCarousel';
import BuyAgainRow from '@/components/home/BuyAgainRow';
import HomeWhyYasvikChose from '@/components/home/HomeWhyYasvikChose';
import FeaturedJourneysCarousel from '@/components/home/FeaturedJourneysCarousel';
import FeaturedBundlesSection from '@/components/home/FeaturedBundlesSection';
import LocalStoreBlock from '@/components/home/LocalStoreBlock';
import HomeTrustTrio from '@/components/home/HomeTrustTrio';
import EditorialHomepage from '@/components/editorial/EditorialHomepage';
import { fetchHomeBestSellerProducts } from '@/lib/homeBestSellers';
import { safeMedia } from '@/lib/mediaUrl';
import { safeHeroMedia } from '@/lib/heroMediaUtils';
import { isEditorialStorefrontPublicEnabled } from '@/lib/editorialStorefront';
import {
  fetchAllAppSettings,
  getCachedSetting,
  resolveSettingsMap,
  SETTINGS_QUERY_KEYS,
} from '@/services/settingsService';

const DEFAULT_HERO_DESKTOP = 'https://media.yasvik.com/media-assets/heroes/home-hero-hero-banner.png';
const DEFAULT_HERO_MOBILE = 'https://media.yasvik.com/media-assets/heroes/home-hero-hero-banner-2.png';

const FALLBACK_PRODUCTS = [
  { id: 'yasvik-snack-placeholder', title: 'Traditional Snacks', price: 149, isFallback: true, unit: '250g' },
  { id: 'yasvik-pickle-placeholder', title: 'Homemade Pickle', price: 199, isFallback: true, unit: '300g' },
  { id: 'yasvik-oil-placeholder', title: 'Wood-Pressed Groundnut Oil', price: 399, isFallback: true, unit: '1L' },
  { id: 'yasvik-honey-placeholder', title: 'Forest Honey', price: 249, isFallback: true, unit: '250g' },
];

function getProductImage(product) {
  const gallery = Array.isArray(product?.image_urls) ? product.image_urls : [];
  return safeMedia(product?.hero_image || product?.featured_image_url || product?.image_url || gallery[0] || '', 'thumb');
}

function LegacyHome() {
  const { data: settings = [] } = useQuery({
    queryKey: SETTINGS_QUERY_KEYS.home,
    queryFn: fetchAllAppSettings,
    staleTime: 10 * 60 * 1000,
  });
  const settingsMap = useMemo(() => resolveSettingsMap(settings), [settings]);
  const { data: products = [] } = useQuery({
    queryKey: ['home-diaspora-products'],
    queryFn: () => productsApi.listPublished('sort_order', 40),
    staleTime: 3 * 60 * 1000,
  });
  const { data: bestSellers = [] } = useQuery({
    queryKey: ['home-best-sellers', settingsMap.home_best_sellers],
    queryFn: () => fetchHomeBestSellerProducts({ settings }),
    staleTime: 3 * 60 * 1000,
  });

  const getSetting = (key, fallback = '') => {
    const value = settingsMap[key];
    if (value !== undefined && value !== null && value !== '') return value;
    const cached = getCachedSetting(key, '');
    return cached || fallback;
  };

  const heroMobileMedia = safeHeroMedia(String(
    getSetting('home_hero_mobile_media_url', getSetting('home_hero_media_mobile_url', DEFAULT_HERO_MOBILE)),
  ));
  const heroDesktopMedia = safeHeroMedia(String(
    getSetting('home_hero_desktop_media_url', getSetting('home_hero_media_url', DEFAULT_HERO_DESKTOP)),
  ));
  const visibleProducts = products.length ? products.filter(Boolean) : FALLBACK_PRODUCTS;
  const heroMedia = useMemo(
    () => ({
      mobile: heroMobileMedia,
      desktop: heroDesktopMedia,
      fallback: getProductImage(visibleProducts[0]),
    }),
    [heroMobileMedia, heroDesktopMedia, visibleProducts],
  );

  const featuredProducts = useMemo(() => bestSellers.filter(Boolean), [bestSellers]);
  const googleMapsUrl = String(
    getSetting('store_google_maps_url', '') || '',
  ).trim();

  return (
    <div className="min-h-screen bg-warm-cream text-deep-forest md:pb-0">
      <HomeHeroSection settingsMap={settingsMap} heroMedia={heroMedia} />
      <HomepageCategorySections />
      <BestSellerCarousel products={featuredProducts} />
      <FeaturedBundlesSection />
      <BuyAgainRow />
      <HomeWhyYasvikChose />
      <FeaturedJourneysCarousel />
      <LocalStoreBlock settingsMap={settingsMap} />
      <HomeTrustTrio googleMapsUrl={googleMapsUrl} />
    </div>
  );
}

/**
 * Public homepage. When editorial_storefront_public is true, renders EditorialHomepage
 * (published Stories only). Flag remains false until launch gates pass + owner activation.
 */
export default function Home() {
  const { data: editorialPublic = false, isLoading } = useQuery({
    queryKey: ['editorial-storefront-public'],
    queryFn: isEditorialStorefrontPublicEnabled,
    staleTime: 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-warm-cream font-inter text-sm text-deep-forest/50">
        Loading…
      </div>
    );
  }

  if (editorialPublic) {
    return <EditorialHomepage includeDraftStories={false} showChrome={false} />;
  }

  return <LegacyHome />;
}
