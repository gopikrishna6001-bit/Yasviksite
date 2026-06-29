import { LEGACY_SUPABASE_BRAND_REWRITES } from '@/lib/brandAssets';
import { getMediaBaseUrl, mediaUrl as resolveMediaUrl } from '@/lib/media';

export { resolveMediaUrl as mediaUrl };

const SUPABASE_OBJECT_RE =
  /^https:\/\/[^/]+\.supabase\.co\/storage\/v1\/object\/public\/([^?#]+)/i;
const SUPABASE_RENDER_RE =
  /^https:\/\/[^/]+\.supabase\.co\/storage\/v1\/render\/image\/public\/([^?#]+)/i;
const PLACEHOLDER_RE = /picsum\.photos|source\.unsplash\.com|placehold/i;

/** Supabase image transform API multiplies cached egress (srcset = 3–4 CDN hits per image). Keep off. */
const USE_SUPABASE_IMAGE_RENDER = import.meta.env.VITE_SUPABASE_IMAGE_RENDER === '1';
const PREFER_R2_CDN = import.meta.env.VITE_MEDIA_PREFER_R2 !== '0';
/** Cloudflare Image Resizing on media.yasvik.com — opt-in only (requires CF Images on zone). */
const USE_CF_IMAGE_RESIZE = import.meta.env.VITE_CF_IMAGE_RESIZE === '1';

/** Targets for layout hints and CF resize widths. */
export const IMAGE_PRESETS = {
  thumb: { width: 320, quality: 70, format: 'webp', widthAttr: 320, heightAttr: 320, sizes: '(max-width: 640px) 45vw, 160px' },
  card: { width: 480, quality: 72, format: 'webp', widthAttr: 480, heightAttr: 480, sizes: '(max-width: 640px) 50vw, 240px' },
  category: { width: 400, quality: 72, format: 'webp', widthAttr: 400, heightAttr: 300, sizes: '(max-width: 640px) 50vw, 200px' },
  detail: { width: 960, quality: 78, format: 'webp', widthAttr: 960, heightAttr: 960, sizes: '(max-width: 768px) 100vw, 50vw' },
  hero: { width: 1280, quality: 78, format: 'webp', widthAttr: 1280, heightAttr: 720, sizes: '100vw' },
  banner: { width: 1400, quality: 75, format: 'webp', widthAttr: 1400, heightAttr: 560, sizes: '100vw' },
  logo: { width: 640, quality: 82, format: 'webp', widthAttr: 640, heightAttr: 240, sizes: '220px' },
};

const SRCSET_WIDTHS = {
  thumb: [160, 320],
  card: [320, 480],
  category: [320, 400],
  detail: [480, 768, 960],
  hero: [768, 1280, 1600],
  banner: [768, 1280, 1400],
  logo: [320, 640],
};

export function isVideoMediaUrl(url = '') {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(String(url || '')) ||
    /youtube\.com|youtu\.be/i.test(String(url || ''));
}

export function isSupabaseStorageUrl(url = '') {
  return SUPABASE_OBJECT_RE.test(String(url || '')) || SUPABASE_RENDER_RE.test(String(url || ''));
}

function extractSupabaseObjectPath(url = '') {
  const value = String(url || '').trim();
  const objectMatch = value.match(SUPABASE_OBJECT_RE);
  if (objectMatch) return objectMatch[1];
  const renderMatch = value.match(SUPABASE_RENDER_RE);
  if (renderMatch) return renderMatch[1];
  return '';
}

function rewriteLegacyBrandAsset(url = '') {
  const objectPath = extractSupabaseObjectPath(url);
  if (!objectPath) return '';
  return LEGACY_SUPABASE_BRAND_REWRITES[objectPath] || '';
}

function buildSupabaseObjectUrl(objectPath) {
  const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
  if (!supabaseUrl || !objectPath) return '';
  return `${supabaseUrl}/storage/v1/object/public/${objectPath.split('?')[0]}`;
}

function buildSupabaseRenderUrl(objectPath, { width, quality, format = 'webp' } = {}) {
  const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
  if (!supabaseUrl || !objectPath) return '';

  const params = new URLSearchParams();
  if (width) params.set('width', String(width));
  if (quality) params.set('quality', String(quality));
  if (format && format !== 'origin') params.set('format', format);

  const query = params.toString();
  return `${supabaseUrl}/storage/v1/render/image/public/${objectPath}${query ? `?${query}` : ''}`;
}

function rewriteSupabasePathToR2(objectPath) {
  if (!PREFER_R2_CDN || !objectPath) return '';
  const clean = objectPath.split('?')[0];
  return `${getMediaBaseUrl()}/${clean}`;
}

function resolvePresetConfig(preset = 'card') {
  return typeof preset === 'string' ? IMAGE_PRESETS[preset] || IMAGE_PRESETS.card : preset;
}

function isMediaCdnUrl(url = '') {
  const base = getMediaBaseUrl();
  const value = String(url || '').trim();
  return Boolean(base && value.startsWith(`${base}/`));
}

function extractMediaCdnPath(url = '') {
  const base = getMediaBaseUrl();
  const value = stripCloudflareImageUrl(url);
  if (!base || !value.startsWith(`${base}/`)) return '';
  return value.slice(base.length + 1).split('?')[0];
}

/** Remove /cdn-cgi/image/... wrapper so fallbacks hit the original R2 object. */
export function stripCloudflareImageUrl(url = '') {
  const value = String(url || '').trim();
  const base = getMediaBaseUrl();
  if (!base || !value.startsWith(base)) return value;

  const marker = '/cdn-cgi/image/';
  const markerIndex = value.indexOf(marker);
  if (markerIndex === -1) return value;

  const afterParams = value.slice(markerIndex + marker.length);
  const pathStart = afterParams.indexOf('/');
  if (pathStart === -1) return value;

  return `${base}/${afterParams.slice(pathStart + 1)}`;
}

/** Cloudflare Image Resizing on the media CDN (R2 custom domain). */
export function buildCloudflareResizeUrl(url = '', { width, quality, format = 'webp' } = {}) {
  const base = getMediaBaseUrl();
  const path = extractMediaCdnPath(url);
  if (!USE_CF_IMAGE_RESIZE || !base || !path) return String(url || '').trim();
  if (isVideoMediaUrl(url) || /\.svg(\?|$)/i.test(path)) return String(url || '').trim();

  const params = [
    width ? `width=${width}` : '',
    quality ? `quality=${quality}` : '',
    `format=${format}`,
    'fit=scale-down',
  ].filter(Boolean).join(',');

  return `${base}/cdn-cgi/image/${params}/${path}`;
}

function applyPresetResize(url = '', preset = 'card') {
  const raw = String(url || '').trim();
  if (!raw || !preset || !USE_CF_IMAGE_RESIZE || isVideoMediaUrl(raw)) return raw;

  const sizing = resolvePresetConfig(preset);
  if (isMediaCdnUrl(raw)) {
    return buildCloudflareResizeUrl(raw, {
      width: sizing.width,
      quality: sizing.quality,
      format: sizing.format,
    });
  }

  const objectPath = extractSupabaseObjectPath(raw);
  if (objectPath) {
    const r2Url = rewriteSupabasePathToR2(objectPath);
    if (r2Url) {
      return buildCloudflareResizeUrl(r2Url, {
        width: sizing.width,
        quality: sizing.quality,
        format: sizing.format,
      });
    }
  }

  return raw;
}

/**
 * Resolve public media URLs with minimal bytes on the wire.
 * Prefer R2 CDN + Cloudflare resize for list/card views.
 */
export function optimizeMediaUrl(url = '', preset = 'card') {
  const raw = stripCloudflareImageUrl(resolveMediaUrl(String(url || '').trim()));
  if (!raw || PLACEHOLDER_RE.test(raw)) return '';
  if (raw.startsWith('data:') || raw.startsWith('blob:')) return raw;

  const localRewrite = rewriteLegacyBrandAsset(raw);
  if (localRewrite) return applyPresetResize(localRewrite, preset);

  if (isVideoMediaUrl(raw)) {
    const objectPath = extractSupabaseObjectPath(raw);
    if (objectPath) {
      return rewriteSupabasePathToR2(objectPath) || buildSupabaseObjectUrl(objectPath);
    }
    return raw;
  }

  if (isMediaCdnUrl(raw)) {
    return applyPresetResize(raw, preset);
  }

  const objectPath = extractSupabaseObjectPath(raw);
  if (!objectPath) return raw;

  if (/\.svg(\?|$)/i.test(objectPath)) {
    return rewriteSupabasePathToR2(objectPath) || buildSupabaseObjectUrl(objectPath);
  }

  const r2Url = rewriteSupabasePathToR2(objectPath);
  if (r2Url) return applyPresetResize(r2Url, preset);

  if (USE_SUPABASE_IMAGE_RENDER) {
    const sizing = resolvePresetConfig(preset);
    return buildSupabaseRenderUrl(objectPath, sizing) || buildSupabaseObjectUrl(objectPath);
  }

  return buildSupabaseObjectUrl(objectPath);
}

export function buildResponsiveImage(url = '', preset = 'card') {
  const config = resolvePresetConfig(preset);
  const normalizedUrl = stripCloudflareImageUrl(String(url || '').trim());
  const src = optimizeMediaUrl(normalizedUrl, preset);
  if (!src) {
    return { src: '', srcSet: '', sizes: '', width: undefined, height: undefined };
  }

  const widths = SRCSET_WIDTHS[preset] || SRCSET_WIDTHS.card;
  const baseUrl = stripCloudflareImageUrl(resolveMediaUrl(normalizedUrl));
  const canResize = USE_CF_IMAGE_RESIZE && (isMediaCdnUrl(baseUrl) || Boolean(extractSupabaseObjectPath(baseUrl)));

  if (canResize) {
    const srcSet = widths
      .map((w) => {
        const candidate = buildCloudflareResizeUrl(
          isMediaCdnUrl(baseUrl) ? baseUrl : (rewriteSupabasePathToR2(extractSupabaseObjectPath(baseUrl)) || baseUrl),
          { width: w, quality: config.quality, format: config.format },
        );
        return candidate ? `${candidate} ${w}w` : '';
      })
      .filter(Boolean)
      .join(', ');

    return {
      src,
      srcSet,
      sizes: config.sizes || '',
      width: config.widthAttr,
      height: config.heightAttr,
    };
  }

  const objectPath = extractSupabaseObjectPath(url);
  if (!objectPath || src.startsWith('/') || !USE_SUPABASE_IMAGE_RENDER) {
    return {
      src,
      srcSet: '',
      sizes: config.sizes || '',
      width: config.widthAttr,
      height: config.heightAttr,
    };
  }

  const srcSet = widths
    .map((w) => {
      const candidate = buildSupabaseRenderUrl(objectPath, {
        width: w,
        quality: config.quality,
        format: config.format,
      });
      return candidate ? `${candidate} ${w}w` : '';
    })
    .filter(Boolean)
    .join(', ');

  return {
    src,
    srcSet,
    sizes: config.sizes || '',
    width: config.widthAttr,
    height: config.heightAttr,
  };
}

export function safeMedia(url = '', preset = 'card') {
  return optimizeMediaUrl(url, preset);
}

export function originalMediaUrl(url = '') {
  return optimizeMediaUrl(stripCloudflareImageUrl(url), null);
}

/** Primary product image URL without resize — pass to OptimizedImage. */
export function productPrimaryImageUrl(product = {}, variant = null) {
  const primary =
    variant?.image_url ||
    variant?.image_urls?.[0] ||
    product?.hero_image ||
    product?.featured_image_url ||
    product?.image_url ||
    product?.images?.[0] ||
    '';
  return safeMedia(primary, null);
}

/** First visible image with optional preset resize (for plain img tags). */
export function productCardImageUrl(product = {}, variant = null, preset = 'thumb') {
  const primary =
    variant?.image_url ||
    variant?.image_urls?.[0] ||
    product?.hero_image ||
    product?.featured_image_url ||
    product?.image_url ||
    product?.images?.[0] ||
    '';
  return safeMedia(primary, preset);
}
