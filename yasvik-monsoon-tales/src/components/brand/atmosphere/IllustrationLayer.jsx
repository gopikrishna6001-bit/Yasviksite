import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import IndianFarmingLandscape from './IndianFarmingLandscape';
import StoryJourneyScene from './StoryJourneyScene';
import FooterFarmingLandscape from './FooterFarmingLandscape';
import { findIllustrationSlot, getIllustrationConfig } from '@/lib/illustrationSettings';
import OptimizedImage from '@/components/ui/OptimizedImage';
import { fetchAllAppSettings, resolveSettingsMap, SETTINGS_QUERY_KEYS } from '@/services/settingsService';

const BUILTIN_SCENES = {
  hero: IndianFarmingLandscape,
  story: StoryJourneyScene,
  footer: FooterFarmingLandscape,
};

const CUSTOM_LAYOUT = {
  hero: 'pointer-events-none absolute inset-x-0 bottom-0 h-[min(300px,40vh)] overflow-hidden',
  story: 'pointer-events-none absolute inset-y-0 right-0 hidden w-[min(340px,42vw)] overflow-hidden md:block',
  footer: 'pointer-events-none absolute inset-x-0 bottom-0 h-[min(300px,42vw)] overflow-hidden',
};

const PAGE_LAYOUT = 'pointer-events-none absolute inset-0 overflow-hidden';

function resolveBuiltinScene(slot) {
  if (BUILTIN_SCENES[slot]) return BUILTIN_SCENES[slot];
  if (slot.startsWith('page_')) return FooterFarmingLandscape;
  return null;
}

function resolveCustomLayout(slot) {
  if (CUSTOM_LAYOUT[slot]) return CUSTOM_LAYOUT[slot];
  if (slot.startsWith('page_')) return PAGE_LAYOUT;
  return PAGE_LAYOUT;
}

function CustomIllustration({ slot, url }) {
  if (slot === 'footer') {
    return (
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[min(380px,46vw)] overflow-hidden"
        aria-hidden="true"
      >
        <OptimizedImage
          src={url}
          alt=""
          preset="banner"
          className="absolute bottom-0 left-1/2 h-full w-full max-w-[1400px] -translate-x-1/2 object-contain object-bottom"
        />
      </div>
    );
  }

  const layout = resolveCustomLayout(slot);
  const isStory = slot === 'story';

  return (
    <div className={layout} aria-hidden="true">
      <div
        className={`absolute inset-0 ${
          isStory
            ? 'bg-gradient-to-l from-warm-cream/95 via-warm-cream/45 to-transparent'
            : 'bg-gradient-to-t from-warm-cream via-warm-cream/55 to-transparent'
        }`}
      />
      <OptimizedImage
        src={url}
        alt=""
        preset="banner"
        className={`absolute object-cover ${
          isStory
            ? 'bottom-8 right-0 h-[220px] w-full object-right'
            : 'bottom-0 left-1/2 h-full w-[min(120%,200%)] max-w-none -translate-x-1/2 object-bottom'
        }`}
      />
    </div>
  );
}

export default function IllustrationLayer({ slot }) {
  const { data: settings = [] } = useQuery({
    queryKey: SETTINGS_QUERY_KEYS.public,
    queryFn: fetchAllAppSettings,
    staleTime: 10 * 60 * 1000,
  });

  const config = useMemo(() => getIllustrationConfig(resolveSettingsMap(settings), slot), [settings, slot]);
  const BuiltinScene = resolveBuiltinScene(slot);
  const slotMeta = findIllustrationSlot(slot);

  if (!slotMeta || !config.enabled || config.opacity <= 0) return null;

  const useCustom = config.mode === 'custom' && config.url;
  if (!useCustom && !BuiltinScene) return null;

  return (
    <div style={{ opacity: config.opacity }} aria-hidden="true">
      {useCustom ? <CustomIllustration slot={slot} url={config.url} /> : <BuiltinScene />}
    </div>
  );
}
