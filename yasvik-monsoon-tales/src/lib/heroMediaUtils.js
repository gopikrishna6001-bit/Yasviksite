import { isVideoMediaUrl } from '@/lib/mediaUrl';
import { mediaUrl, R2_HERO_PATHS } from '@/lib/media';

export function getYouTubeId(url = '') {
  if (!url) return null;
  const match = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export function isVideoUrl(url = '') {
  return isVideoMediaUrl(url);
}

function heroImageUrl(url = '') {
  const safe = safeHeroMedia(url);
  if (!safe || isVideoMediaUrl(safe) || getYouTubeId(safe)) return safe;
  // Campaign banners: serve full-resolution from CDN (no width cap).
  return safe;
}

export function isDesignedImageHero(mediaPlan = {}, { desktopUrl = '', mobileUrl = '' } = {}) {
  if (!mediaPlan || mediaPlan.mode !== 'image' || mediaPlan.preferR2) return false;
  return Boolean(desktopUrl || mobileUrl || mediaPlan.desktop || mediaPlan.mobile);
}

export function safeHeroMedia(url = '') {
  const value = mediaUrl(String(url || '').trim());
  return value && !/picsum\.photos|source\.unsplash\.com|placehold/i.test(value) ? value : '';
}

export function isStreamableHeroUrl(url = '') {
  return isVideoUrl(url) || Boolean(getYouTubeId(url));
}

export function buildYouTubeHeroEmbedSrc(videoId, origin = '') {
  if (!videoId) return '';
  const params = new URLSearchParams({
    autoplay: '1',
    mute: '1',
    loop: '1',
    playlist: videoId,
    controls: '0',
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
    iv_load_policy: '3',
    fs: '0',
  });
  if (origin) params.set('origin', origin);
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

function pickPrimaryHeroUrl(mobile = '', desktop = '', fallback = '') {
  const candidates = [desktop, mobile, fallback].filter(Boolean);
  const streamable = candidates.find((url) => isStreamableHeroUrl(url));
  return streamable || desktop || mobile || fallback || '';
}

export function parseHomeHeroSlides(raw = '') {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((slide) => ({
        media: safeHeroMedia(slide?.media || slide?.desktop_media || slide?.url || ''),
        mobileMedia: safeHeroMedia(slide?.mobile_media || slide?.mobile || ''),
        poster: safeHeroMedia(slide?.poster || ''),
      }))
      .filter((slide) => slide.media || slide.mobileMedia);
  } catch {
    return [];
  }
}

function buildR2HeroVideoPlan() {
  const desktopMp4 = mediaUrl(R2_HERO_PATHS.desktop.mp4);
  return {
    mode: 'video',
    url: desktopMp4,
    poster: mediaUrl(R2_HERO_PATHS.poster),
    mobile: {
      // Reuse desktop until yasvik-hero-mobile.mp4 is uploaded to R2
      mp4: desktopMp4,
      webm: mediaUrl(R2_HERO_PATHS.mobile.webm),
    },
    desktop: {
      mp4: desktopMp4,
      webm: mediaUrl(R2_HERO_PATHS.desktop.webm),
    },
    preferR2: true,
  };
}

export function buildHomeHeroMediaPlan({ slides = [], desktopUrl = '', mobileUrl = '', fallbackUrl = '' } = {}) {
  const slideUrls = slides
    .map((slide) => slide.mobileMedia || slide.media)
    .filter(Boolean);

  if (slideUrls.length > 1) {
    return { mode: 'slideshow', slides, urls: slideUrls, intervalMs: 5000 };
  }

  if (slideUrls.length === 1) {
    const slide = slides[0];
    const url = slide.mobileMedia || slide.media;
    if (isVideoUrl(url) || getYouTubeId(url)) {
      return {
        mode: 'video',
        url: mediaUrl(url),
        poster: heroImageUrl(slide.poster || slide.media || R2_HERO_PATHS.poster),
        mobile: { mp4: mediaUrl(slide.mobileMedia || url), webm: '' },
        desktop: { mp4: mediaUrl(slide.media || url), webm: '' },
      };
    }
    return {
      mode: 'image',
      url: heroImageUrl(url),
      poster: heroImageUrl(slide.poster || slide.media || ''),
    };
  }

  const desktop = safeHeroMedia(desktopUrl);
  const mobile = safeHeroMedia(mobileUrl);
  const fallback = safeHeroMedia(fallbackUrl);
  const url = pickPrimaryHeroUrl(mobile, desktop, fallback);

  if (!url) return buildR2HeroVideoPlan();

  if (isVideoUrl(url) || getYouTubeId(url)) {
    return {
      mode: 'video',
      url: mediaUrl(url),
      poster: heroImageUrl(desktop || mobile || R2_HERO_PATHS.poster),
      mobile: {
        mp4: mediaUrl(mobile || url),
        webm: '',
      },
      desktop: {
        mp4: mediaUrl(desktop || url),
        webm: '',
      },
    };
  }

  return {
    mode: 'image',
    url: heroImageUrl(desktop || mobile || fallback),
    desktop: heroImageUrl(desktop || mobile || fallback),
    mobile: heroImageUrl(mobile || desktop || fallback),
  };
}
