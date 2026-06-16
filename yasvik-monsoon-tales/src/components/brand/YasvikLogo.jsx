import clsx from 'clsx';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchAllAppSettings,
  getCachedSetting,
  optimizeSupabasePublicImageUrl,
  resolveSetting,
  SETTINGS_QUERY_KEYS,
} from '@/services/settingsService';

const CURRENT_ADMIN_LOGO_URL = 'https://cpksnpuavywbmhrzglyh.supabase.co/storage/v1/object/public/media-assets/1781516610532-xylu0hqz5a.png';
const CURRENT_ADMIN_SYMBOL_URL = 'https://cpksnpuavywbmhrzglyh.supabase.co/storage/v1/object/public/media-assets/1781518040543-6c7i3giwirb.png';

const DEFAULT_LOGO_VARIANTS = {
  symbol: {
    src: CURRENT_ADMIN_SYMBOL_URL,
    alt: 'Yasvik symbol',
    sizeClass: 'h-10 w-auto',
  },
  wordmark: {
    src: CURRENT_ADMIN_LOGO_URL,
    alt: 'Yasvik',
    sizeClass: 'h-10 w-auto',
  },
  lockup: {
    src: CURRENT_ADMIN_LOGO_URL,
    alt: 'Yasvik Natural Foods & Everyday Essentials',
    sizeClass: 'h-16 w-auto',
  },
  horizontal: {
    src: CURRENT_ADMIN_LOGO_URL,
    alt: 'Yasvik Natural Foods & Everyday Essentials',
    sizeClass: 'h-11 w-auto',
  },
  primary: {
    src: CURRENT_ADMIN_LOGO_URL,
    alt: 'Yasvik Natural Foods & Everyday Essentials',
    sizeClass: 'h-16 w-auto',
  },
  tagline: {
    src: CURRENT_ADMIN_LOGO_URL,
    alt: 'Natural Foods & Everyday Essentials',
    sizeClass: 'h-7 w-auto',
  },
};

const BRAND_SETTING_KEYS = {
  symbol: 'brand_logo_symbol_url',
  wordmark: 'brand_logo_wordmark_url',
  lockup: 'brand_logo_primary_url',
  horizontal: 'brand_logo_horizontal_url',
  primary: 'brand_logo_primary_url',
  tagline: 'brand_logo_tagline_url',
};

export default function YasvikLogo({
  variant = 'lockup',
  tone = 'dark',
  className,
  imageClassName,
  imageStyle,
  framed = false,
}) {
  const [failedSrc, setFailedSrc] = useState('');
  const { data: settings = [] } = useQuery({
    queryKey: SETTINGS_QUERY_KEYS.brand,
    queryFn: fetchAllAppSettings,
    staleTime: 10 * 60 * 1000,
  });

  const activeVariant = DEFAULT_LOGO_VARIANTS[variant] || DEFAULT_LOGO_VARIANTS.lockup;
  const settingKey = BRAND_SETTING_KEYS[variant] || BRAND_SETTING_KEYS.lockup;
  const cachedSrc = getCachedSetting(settingKey, '');
  const settingSrc = String(resolveSetting(settings, settingKey, cachedSrc) || '').trim();
  const preferredSrc = settingSrc || activeVariant.src;
  const resolvedSrc = failedSrc === preferredSrc ? activeVariant.src : preferredSrc;
  const optimizedSrc = optimizeSupabasePublicImageUrl(resolvedSrc, variant === 'symbol' ? 160 : 520);
  const framedClass = framed
    ? tone === 'light'
      ? 'rounded-lg bg-white/95 px-2 py-1 shadow-sm'
      : 'rounded-lg bg-white px-2 py-1 shadow-sm'
    : '';

  return (
    <span className={clsx('inline-flex items-center justify-center', framedClass, className)}>
      <img
        src={optimizedSrc}
        alt={activeVariant.alt}
        loading="eager"
        decoding="async"
        onError={() => setFailedSrc(preferredSrc)}
        style={imageStyle}
        className={clsx(activeVariant.sizeClass, imageClassName)}
      />
    </span>
  );
}
