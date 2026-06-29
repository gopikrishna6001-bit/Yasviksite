import { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  fetchAllAppSettings,
  resolveSettingsMap,
  SETTINGS_QUERY_KEYS,
} from '@/services/settingsService';
import { getSlidesBannerConfig } from '@/lib/illustrationSettings';
import IndianFarmingLandscape from './IndianFarmingLandscape';
import SlideCropImage from './SlideCropImage';

/**
 * Full-bleed background slideshow for the home hero section.
 * Reads from the "hero" illustration slot (multi-image with focal point).
 * Falls back to the built-in SVG farming landscape when no slides are configured.
 */
/**
 * noFade — pass true in cinematic hero contexts where the parent provides
 * its own dark overlay; suppresses the warm-cream gradient fades so the
 * illustration fills fully without light bleed at edges.
 */
export default function HeroBackgroundBanner({ noFade = false }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const { data: settings = [] } = useQuery({
    queryKey: SETTINGS_QUERY_KEYS.public,
    queryFn: fetchAllAppSettings,
    staleTime: 10 * 60 * 1000,
  });

  const config = useMemo(
    () => getSlidesBannerConfig(resolveSettingsMap(settings), 'hero'),
    [settings],
  );
  const slides = config.slides;

  useEffect(() => {
    if (slides.length <= 1 || paused) return;
    const id = setInterval(() => setCurrent((prev) => (prev + 1) % slides.length), 5500);
    return () => clearInterval(id);
  }, [slides.length, paused]);

  /* ── No slides → built-in SVG ── */
  if (!slides.length) {
    return <IndianFarmingLandscape />;
  }

  const slide = slides[current];

  return (
    <>
      {/* Full-bleed photo */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <AnimatePresence mode="sync">
          <motion.div
            key={current}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: 'easeInOut' }}
            className="absolute inset-0"
          >
            <SlideCropImage slide={slide} />
          </motion.div>
        </AnimatePresence>

        {/* Warm-cream fades — only in non-cinematic (standard page banner) contexts */}
        {!noFade && (
          <>
            {/* Right fade — prevents illustration clashing with content */}
            <div className="absolute inset-0 bg-gradient-to-l from-warm-cream/60 via-warm-cream/10 to-transparent md:from-warm-cream/55 md:via-warm-cream/10 md:to-transparent" />
            {/* Top fade */}
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-warm-cream/40 to-transparent md:from-warm-cream/60" />
            {/* Bottom fade */}
            <div className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-warm-cream via-warm-cream/75 to-transparent md:h-56 md:from-warm-cream md:via-warm-cream/70" />
          </>
        )}
      </div>

      {/* Slide indicators — subtle, bottom-right */}
      {slides.length > 1 && (
        <div className="pointer-events-none absolute bottom-5 right-6 z-20 flex gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              aria-label={`Slide ${i + 1}`}
              onClick={() => { setCurrent(i); setPaused(true); }}
              className={`pointer-events-auto h-1.5 rounded-full transition-all duration-300 ${
                i === current
                  ? 'w-5 bg-deep-forest/55 shadow'
                  : 'w-1.5 bg-deep-forest/20 hover:bg-deep-forest/35'
              }`}
            />
          ))}
        </div>
      )}
    </>
  );
}
