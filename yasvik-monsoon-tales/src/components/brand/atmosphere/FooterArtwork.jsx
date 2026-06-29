import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import FooterFarmingLandscape from './FooterFarmingLandscape';
import { getIllustrationConfig } from '@/lib/illustrationSettings';
import { fetchAllAppSettings, resolveSettingsMap, SETTINGS_QUERY_KEYS } from '@/services/settingsService';

export default function FooterArtwork({ className = '' }) {
  const { data: settings = [] } = useQuery({
    queryKey: SETTINGS_QUERY_KEYS.public,
    queryFn: fetchAllAppSettings,
    staleTime: 10 * 60 * 1000,
  });

  const config = useMemo(() => getIllustrationConfig(resolveSettingsMap(settings), 'footer'), [settings]);

  if (!config.enabled || config.opacity <= 0) return null;

  const useCustom = config.mode === 'custom' && config.url;

  return (
    <div className={`leading-[0] ${className}`} style={{ opacity: config.opacity }} aria-hidden="true">
      {useCustom ? (
        <img
          src={config.url}
          alt=""
          className="block h-full w-full object-cover object-center"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className="relative h-full min-h-[min(280px,38vw)] w-full overflow-hidden">
          <FooterFarmingLandscape />
        </div>
      )}
    </div>
  );
}
