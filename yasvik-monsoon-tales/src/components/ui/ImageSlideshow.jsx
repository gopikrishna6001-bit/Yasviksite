import { useCallback, useEffect, useState } from 'react';

/**
 * Crossfade image slideshow for hero / story covers.
 * @param {Array<string|{url?:string, media?:string, mobileUrl?:string, mobileMedia?:string}>} slides
 * @param {'auto'|'desktop'|'mobile'} variant
 */
export default function ImageSlideshow({
  slides = [],
  variant = 'auto',
  intervalMs = 5000,
  className = '',
  imageClassName = 'object-cover',
  showDots = true,
  alt = '',
  vivid = false,
  fetchPriority = 'high',
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const normalized = (Array.isArray(slides) ? slides : [])
    .map((slide) => {
      if (typeof slide === 'string') {
        return { desktop: slide, mobile: slide };
      }
      const desktop = slide?.url || slide?.media || slide?.desktop || slide?.desktop_media || '';
      const mobile = slide?.mobileUrl || slide?.mobileMedia || slide?.mobile || slide?.mobile_media || desktop;
      return { desktop, mobile };
    })
    .filter((s) => s.desktop || s.mobile);

  const resolvedVariant = variant === 'auto' ? (isMobile ? 'mobile' : 'desktop') : variant;

  const advance = useCallback(() => {
    setIndex((prev) => (prev + 1) % Math.max(normalized.length, 1));
  }, [normalized.length]);

  useEffect(() => {
    if (normalized.length <= 1 || paused) return undefined;
    const id = window.setInterval(advance, intervalMs);
    return () => window.clearInterval(id);
  }, [normalized.length, paused, advance, intervalMs]);

  if (!normalized.length) {
    return (
      <div
        className={`absolute inset-0 ${className}`}
        style={{
          background: 'linear-gradient(135deg, #faf7ef 0%, #f3ede0 45%, #e8e1d5 100%)',
        }}
      />
    );
  }

  return (
    <div
      className={`absolute inset-0 overflow-hidden ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
    >
      {normalized.map((slide, i) => {
        const src = resolvedVariant === 'mobile'
          ? (slide.mobile || slide.desktop)
          : (slide.desktop || slide.mobile);
        if (!src) return null;
        return (
          <img
            key={`${src}-${i}`}
            src={src}
            alt={i === index ? alt : ''}
            aria-hidden={i !== index}
            className={`absolute inset-0 z-0 h-full w-full transition-opacity duration-700 ${imageClassName} ${
              vivid ? 'brightness-[1.05] contrast-[1.12] saturate-[1.14]' : ''
            } ${i === index ? 'opacity-100' : 'opacity-0'}`}
            decoding="async"
            loading={i === 0 ? 'eager' : 'lazy'}
            fetchPriority={i === 0 ? fetchPriority : 'auto'}
          />
        );
      })}

      {showDots && normalized.length > 1 ? (
        <div className="absolute bottom-3 left-0 right-0 z-10 flex justify-center gap-1.5 pointer-events-auto">
          {normalized.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Show slide ${i + 1}`}
              onClick={() => {
                setIndex(i);
                setPaused(true);
              }}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? 'w-5 bg-white/90 shadow' : 'w-1.5 bg-white/40 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Normalize story cover_images + cover_image into slideshow slides. */
export function storyCoverSlides(story = {}) {
  const gallery = Array.isArray(story.cover_images)
    ? story.cover_images
    : typeof story.cover_images === 'string'
      ? (() => {
        try {
          const parsed = JSON.parse(story.cover_images);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      })()
      : [];

  const urls = gallery
    .map((item) => (typeof item === 'string' ? item : item?.url || item?.media || ''))
    .filter(Boolean);

  const primary = story.cover_image || story.featured_image_url || '';
  if (primary && !urls.includes(primary)) urls.unshift(primary);
  return urls;
}
