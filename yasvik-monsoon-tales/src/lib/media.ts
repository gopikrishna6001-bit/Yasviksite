/**
 * Public media CDN base (Cloudflare R2).
 * Vite: VITE_MEDIA_BASE_URL
 */
const MEDIA_BASE_URL =
  import.meta.env.VITE_MEDIA_BASE_URL || 'https://media.yasvik.com';

/** Default R2 hero assets (relative paths on media CDN). */
export const R2_HERO_PATHS = {
  poster: '/hero/yasvik-hero-poster.webp',
  mobile: {
    mp4: '/hero/yasvik-hero-mobile.mp4',
    webm: '/hero/yasvik-hero-mobile.webm',
  },
  desktop: {
    mp4: '/hero/yasvik-hero-desktop.mp4',
    webm: '/hero/yasvik-hero-desktop.webm',
  },
} as const;

const LOCAL_PUBLIC_PREFIXES = ['/media/', '/brand-logos/', '/assets/', '/favicon'];

/**
 * Resolve a media path for public delivery.
 * - Full URLs (Supabase, R2, external) pass through unchanged.
 * - Same-origin public assets (/media, /brand-logos) stay local.
 * - Other relative paths resolve against MEDIA_BASE_URL (R2 CDN).
 */
export function mediaUrl(path?: string | null): string {
  if (!path) return '';

  const value = String(path).trim();
  if (!value) return '';

  if (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('data:') ||
    value.startsWith('blob:')
  ) {
    return value;
  }

  if (value.startsWith('/')) {
    if (LOCAL_PUBLIC_PREFIXES.some((prefix) => value.startsWith(prefix))) {
      return value;
    }
    const cleanPath = value.slice(1);
    return `${String(MEDIA_BASE_URL).replace(/\/$/, '')}/${cleanPath}`;
  }

  return `${String(MEDIA_BASE_URL).replace(/\/$/, '')}/${value}`;
}

export function getMediaBaseUrl(): string {
  return String(MEDIA_BASE_URL).replace(/\/$/, '');
}

export function isR2MediaUrl(url = ''): boolean {
  const base = getMediaBaseUrl();
  return Boolean(url && String(url).startsWith(base));
}

export function isSupabaseStorageUrl(url = ''): boolean {
  return /supabase\.co\/storage\/v1\/(object|render)\//i.test(String(url || ''));
}
