import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

export default function PageHeroRenderer({ hero, isLoading = false }) {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    if (!hero?.slide_urls?.length || hero.hero_mode !== 'slideshow') return;
    const interval = setInterval(
      () => setActiveSlide(s => (s + 1) % hero.slide_urls.length),
      hero.slideshow_interval_ms || 5000
    );
    return () => clearInterval(interval);
  }, [hero?.slide_urls?.length, hero?.hero_mode, hero?.slideshow_interval_ms]);

  if (isLoading) {
    return <div className="h-64 md:h-96 bg-temple-stone/30 animate-pulse" />;
  }

  if (!hero?.is_active) {
    return <div className="h-40 bg-rain-mist" />;
  }

  const mediaUrl = hero.hero_mode === 'slideshow'
    ? hero.slide_urls?.[activeSlide]
    : (hero.hero_video || hero.media_url);

  const isVideo = mediaUrl?.includes('.mp4') || mediaUrl?.includes('.webm') || hero.media_type === 'video';

  return (
    <div className="relative w-full overflow-hidden">
      {/* Hero container - Cinematic 2.39:1 aspect ratio */}
      <div className={`relative aspect-[2.39/1] overflow-hidden bg-${hero.background_style || 'rain-mist'} rounded-b-3xl`}>
        <AnimatePresence mode="wait">
          {isVideo ? (
            <motion.video
              key={mediaUrl}
              src={mediaUrl}
              poster={hero.hero_video_poster || mediaUrl}
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
            />
          ) : (
            <motion.img
              key={mediaUrl}
              src={mediaUrl}
              alt={hero.title}
              className="absolute inset-0 w-full h-full object-cover"
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
            />
          )}
        </AnimatePresence>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-rain-cloud/60 via-rain-cloud/20 to-transparent" />

        {/* Content */}
        <div className="relative h-full flex flex-col items-center justify-center text-center px-6 z-10">
          {hero.label && (
            <motion.p
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15, ease: 'easeOut' }}
              className="font-inter text-[10px] md:text-xs uppercase tracking-[0.28em] text-white/60 mb-2"
            >
              {hero.label}
            </motion.p>
          )}

          {hero.title && (
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.25, ease: 'easeOut' }}
              className="font-cormorant text-4xl md:text-5xl lg:text-6xl text-white font-light mb-2 drop-shadow-lg"
            >
              {hero.title}
            </motion.h1>
          )}

          {hero.subtitle && (
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.35, ease: 'easeOut' }}
              className="font-inter text-sm md:text-base text-white/70 drop-shadow-md max-w-md"
            >
              {hero.subtitle}
            </motion.p>
          )}

          {hero.cta_label && (
            <motion.a
              href={hero.cta_url || '#'}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.45, ease: 'easeOut' }}
              className="mt-6 px-6 py-2.5 bg-white/20 border border-white/40 text-white font-inter text-sm rounded-full hover:bg-white/30 transition-all backdrop-blur-sm"
            >
              {hero.cta_label}
            </motion.a>
          )}
        </div>

        {/* Slideshow indicators */}
        {hero.hero_mode === 'slideshow' && hero.slide_urls?.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-1">
            {hero.slide_urls.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveSlide(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === activeSlide ? 'bg-white w-6' : 'bg-white/40'
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>


    </div>
  );
}
