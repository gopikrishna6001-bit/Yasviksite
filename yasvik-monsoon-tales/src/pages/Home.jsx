import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { products as productsApi } from '@/services/api';
import HomeHeroSection from '@/components/home/HomeHeroSection';
import CoreValuesRow from '@/components/brand/CoreValuesRow';
import CategoryDiscoverySection from '@/components/home/CategoryDiscoverySection';
import FeaturedBundlesSection from '@/components/home/FeaturedBundlesSection';
import BundleStrip from '@/components/crosssell/BundleStrip';
import FeaturedHeroProductsCarousel from '@/components/home/FeaturedHeroProductsCarousel';
import LocalStoreBlock from '@/components/home/LocalStoreBlock';
import SectionHeader from '@/components/brand/SectionHeader';
import ProductCard from '@/components/products/ProductCard';
import { sortFeaturedProducts } from '@/lib/productSortUtils';
import { safeMedia } from '@/lib/mediaUrl';
import { safeHeroMedia } from '@/lib/heroMediaUtils';
import {
  fetchAllAppSettings,
  resolveSettingsMap,
  SETTINGS_QUERY_KEYS,
} from '@/services/settingsService';

const FALLBACK_PRODUCTS = [
  { id: 'yasvik-ragi-placeholder', title: 'Ragi Flour', price: 99, isFallback: true, unit: '500g' },
  { id: 'yasvik-honey-placeholder', title: 'Forest Honey', price: 249, isFallback: true, unit: '250g' },
  { id: 'yasvik-millet-placeholder', title: 'Little Millet', price: 119, isFallback: true, unit: '1kg' },
  { id: 'yasvik-groundnut-oil-placeholder', title: 'Wood-Pressed Groundnut Oil', price: 399, isFallback: true, unit: '1L' },
];

function CoreValuesSection() {
  return (
    <section className="border-b border-soft-border/40 bg-warm-cream pb-12 pt-10 md:pb-16 md:pt-12">
      <div className="mx-auto max-w-[1400px] px-4 md:px-8">
        <CoreValuesRow />
      </div>
    </section>
  );
}

function getProductImage(product) {
  const gallery = Array.isArray(product?.image_urls) ? product.image_urls : [];
  return safeMedia(product?.hero_image || product?.featured_image_url || product?.image_url || gallery[0] || '', 'thumb');
}

function FeaturedProducts({ products }) {
  if (!products.length) return null;

  return (
    <section id="featured" className="scroll-mt-32 bg-warm-cream px-4 py-12 md:px-8 md:py-16">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-7 flex items-end justify-between gap-4">
          <SectionHeader
            eyebrow="Popular picks"
            title="Everyday essentials families reorder"
            description="Useful staples and pantry items families reorder — ready to add to cart."
          />
          <Link
            to="/shop"
            className="hidden flex-shrink-0 items-center gap-1 font-inter text-sm font-bold text-neon-paddy hover:text-deep-forest md:inline-flex"
          >
            Shop all <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {products.slice(0, 6).map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} variant="homepage" />
          ))}
        </div>
        <div className="mt-6 text-center md:hidden">
          <Link to="/shop" className="inline-flex items-center gap-1 font-inter text-sm font-bold text-neon-paddy">
            Shop all products <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
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

  const getSetting = (key, fallback) => {
    const value = settingsMap[key];
    return value === undefined || value === null || value === '' ? fallback : value;
  };

  const heroDesktopMedia = safeHeroMedia(String(getSetting('home_hero_desktop_media_url', getSetting('home_hero_media_url', ''))));
  const heroMobileMedia = safeHeroMedia(String(
    getSetting('home_hero_mobile_media_url', '') || getSetting('home_hero_media_mobile_url', ''),
  )) || heroDesktopMedia;
  const visibleProducts = products.length ? products : FALLBACK_PRODUCTS;
  const firstProductImage = getProductImage(visibleProducts[0]);

  const featuredProducts = useMemo(() => {
    const featured = products.filter((product) => product.is_featured || product.featured_in_hero);
    const merged = [...featured, ...visibleProducts].filter(
      (product, index, all) => all.findIndex((item) => item.id === product.id) === index,
    );
    return sortFeaturedProducts(merged).slice(0, 6);
  }, [products, visibleProducts]);

  return (
    <div className="min-h-screen bg-warm-cream text-deep-forest">
      <HomeHeroSection
        settingsMap={settingsMap}
        heroMedia={{
          desktop: heroDesktopMedia,
          mobile: heroMobileMedia,
          fallback: firstProductImage,
        }}
      />

      <FeaturedHeroProductsCarousel />

      <CategoryDiscoverySection />

      <FeaturedProducts products={featuredProducts} />

      <CoreValuesSection />

      <LocalStoreBlock settingsMap={settingsMap} />

      <section className="border-b border-soft-border/40 bg-warm-cream px-4 py-10 md:px-8 md:py-12">
        <div className="mx-auto max-w-[1400px]">
          <BundleStrip
            location="home"
            title="Curated combos"
            description="Practical starter kits — view items and add individually."
            limit={3}
          />
        </div>
      </section>

      <FeaturedBundlesSection />
    </div>
  );
}
