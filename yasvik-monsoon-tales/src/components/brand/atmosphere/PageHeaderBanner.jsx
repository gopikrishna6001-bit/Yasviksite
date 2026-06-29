import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchAllAppSettings,
  resolveSettingsMap,
  SETTINGS_QUERY_KEYS,
} from '@/services/settingsService';
import { toPageIllustrationSlot, getSlidesBannerConfig } from '@/lib/illustrationSettings';
import BannerSlideshow from './BannerSlideshow';

/**
 * Top-of-page header banner driven by the Illustrations admin.
 * Pass `page` as the raw page key e.g. "shop", "contact", "our_roots".
 * Renders nothing when no slides are configured.
 */
export default function PageHeaderBanner({ page }) {
  const slot = toPageIllustrationSlot(page);

  const { data: settings = [] } = useQuery({
    queryKey: SETTINGS_QUERY_KEYS.public,
    queryFn: fetchAllAppSettings,
    staleTime: 10 * 60 * 1000,
  });

  const config = useMemo(() => {
    if (!slot) return { enabled: false, slides: [] };
    return getSlidesBannerConfig(resolveSettingsMap(settings), slot);
  }, [settings, slot]);

  if (!config.enabled || !config.slides.length) return null;

  return <BannerSlideshow slides={config.slides} bottomBlurPercent={config.bottomBlurPercent ?? 60} />;
}
