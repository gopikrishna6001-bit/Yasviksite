import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import SlideCropImage from './SlideCropImage';

/**
 * Full-width auto-advancing slideshow used as a page header banner.
 * @param {Array<{url:string, x:number, y:number}>} slides
 * @param {string} heightClass  Tailwind height class, e.g. "h-[min(300px,42vh)]"
 */
export default function BannerSlideshow({ slides = [], heightClass = 'h-[min(300px,42vh)]', bottomBlurPercent = 60 }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const advance = useCallback(() => {
    setCurrent((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1 || paused) return;
    const id = setInterval(advance, 5000);
    return () => clearInterval(id);
  }, [slides.length, paused, advance]);

  if (!slides.length) return null;

  const slide = slides[current];

  return (
    <div
      className={`relative w-full overflow-hidden ${heightClass}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence mode="sync">
        <motion.div
          key={current}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: 'easeInOut' }}
          className="absolute inset-0"
        >
          <SlideCropImage slide={slide} />
        </motion.div>
      </AnimatePresence>

      {/* Gradient fade bottom → warm-cream (adjustable in Admin → Illustrations) */}
      {bottomBlurPercent > 0 && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0"
          style={{
            height: `${Math.round(40 + bottomBlurPercent * 0.25)}%`,
            background: `linear-gradient(to top, rgba(250,247,239,${(bottomBlurPercent / 100).toFixed(2)}) 0%, rgba(250,247,239,${((bottomBlurPercent * 0.55) / 100).toFixed(2)}) 55%, transparent 100%)`,
          }}
        />
      )}

      {/* Slide indicators */}
      {slides.length > 1 && (
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => { setCurrent(i); setPaused(true); }}
              aria-label={`Slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === current ? 'w-5 bg-white shadow' : 'w-1.5 bg-white/50 hover:bg-white/80'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
