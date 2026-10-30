import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import EditorialBrandIntro from '@/components/editorial/EditorialBrandIntro';
import EditorialCategoryRail from '@/components/editorial/EditorialCategoryRail';
import EditorialCampaignCarousel from '@/components/editorial/EditorialCampaignCarousel';
import EditorialTrustStrip from '@/components/editorial/EditorialTrustStrip';
import EditorialStoriesRail from '@/components/editorial/EditorialStoriesRail';
import EditorialFavourites from '@/components/editorial/EditorialFavourites';
import EditorialCombosSection from '@/components/editorial/EditorialCombosSection';
import EditorialLocalStoreEntry from '@/components/editorial/EditorialLocalStoreEntry';
import BestSellerCarousel from '@/components/home/BestSellerCarousel';
import BuyAgainRow from '@/components/home/BuyAgainRow';
import HomeTrustTrio from '@/components/home/HomeTrustTrio';
import {
  fetchEditorialHeroProducts,
  fetchStorefrontStories,
  filterDistinctBestsellers,
} from '@/lib/editorialStorefront';
import { fetchHomeBestSellerProducts } from '@/lib/homeBestSellers';
import {
  fetchAllAppSettings,
  getCachedSetting,
  resolveSettingsMap,
  SETTINGS_QUERY_KEYS,
} from '@/services/settingsService';

/**
 * Editorial homepage hierarchy:
 * Header → Campaign → Brand → Categories → Trust → Favourites →
 * Buy Again (returning) → Bestsellers (if distinct) → Stories → Combos →
 * Local Store → Reviews → Footer
 *
 * Public only when editorial_storefront_public is enabled.
 */
export default function EditorialHomepage({
  includeDraftStories = true,
  showChrome = true,
  onMenuOpen,
  onCartOpen,
  onSearchOpen,
}) {
  const { data: settings = [] } = useQuery({
    queryKey: SETTINGS_QUERY_KEYS.home,
    queryFn: fetchAllAppSettings,
    staleTime: 10 * 60 * 1000,
  });
  const settingsMap = useMemo(() => resolveSettingsMap(settings), [settings]);

  const { data: heroes = [], isLoading: heroesLoading } = useQuery({
    queryKey: ['editorial-heroes'],
    queryFn: fetchEditorialHeroProducts,
    staleTime: 60 * 1000,
  });

  const { data: stories = [] } = useQuery({
    queryKey: ['editorial-storefront-stories', includeDraftStories],
    queryFn: () => fetchStorefrontStories({ includeDrafts: includeDraftStories, homepageOnly: true }),
    staleTime: 60 * 1000,
  });

  const { data: bestSellersRaw = [] } = useQuery({
    queryKey: ['editorial-best-sellers', settingsMap.home_best_sellers],
    queryFn: () => fetchHomeBestSellerProducts({ settings }),
    staleTime: 3 * 60 * 1000,
  });

  const distinctBestsellers = useMemo(
    () => filterDistinctBestsellers(bestSellersRaw, heroes, { minDistinct: 3 }),
    [bestSellersRaw, heroes],
  );

  const googleMapsUrl = String(
    settingsMap.store_google_maps_url
      || getCachedSetting('store_google_maps_url', '')
      || '',
  ).trim();

  return (
    <div className="min-h-screen bg-warm-cream text-deep-forest">
      {showChrome ? (
        <SiteHeader onMenuOpen={onMenuOpen} onCartOpen={onCartOpen} onSearchOpen={onSearchOpen} />
      ) : null}

      {/* 1–2. Brand-facing entrance */}
      <EditorialCampaignCarousel />
      <EditorialBrandIntro />

      {/* 3–4. Navigate + prove */}
      <EditorialCategoryRail />
      <EditorialTrustStrip />

      {/* 5–6. Sell curated, then retain / popular */}
      {heroesLoading ? (
        <div className="px-4 py-10 text-center font-inter text-sm text-deep-forest/50">Loading Favourites…</div>
      ) : (
        <EditorialFavourites products={heroes} />
      )}
      <BuyAgainRow />
      {distinctBestsellers.length ? (
        <BestSellerCarousel products={distinctBestsellers} />
      ) : null}

      {/* 7–8. Explain worlds, then lift AOV */}
      <EditorialStoriesRail stories={stories} />
      <EditorialCombosSection />

      {/* 9–10. Hyderabad advantage + proof */}
      <EditorialLocalStoreEntry />
      <HomeTrustTrio googleMapsUrl={googleMapsUrl} />

      {showChrome ? <SiteFooter /> : null}
    </div>
  );
}
