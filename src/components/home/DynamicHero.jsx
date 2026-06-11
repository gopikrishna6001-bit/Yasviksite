import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

// ─── Extract YouTube embed ID ─────────────────────────────────────────────
function getYouTubeId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function isVideoUrl(url) {
  return !!url?.match(/\.(mp4|webm|mov)(\?|$)/i);
}

function parseContent(content) {
  if (!content) return {};
  if (typeof content === 'object') return content;
  if (typeof content === 'string') {
    try {
      return JSON.parse(content);
    } catch {
      return {};
    }
  }
  return {};
}

// ─── Inject <link rel="preload"> into <head> for a video URL ─────────────
function injectPreloadLink(url) {
  if (!url || getYouTubeId(url)) return;
  if (document.querySelector(`link[href="${url}"][rel="preload"]`)) return;
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'video';
  link.href = url;
  link.setAttribute('fetchpriority', 'high');
  document.head.appendChild(link);
}

// ─── Hidden video pre-buffer pool ────────────────────────────────────────
// Keeps video elements alive in memory so the browser caches them.
const preloadPool = {};

function preloadVideo(url, onReady) {
  if (!url || getYouTubeId(url) || !isVideoUrl(url)) return;
  if (preloadPool[url]) {
    if (preloadPool[url].readyState >= 3) onReady?.();else
    preloadPool[url].addEventListener('canplay', onReady, { once: true });
    return;
  }
  const vid = document.createElement('video');
  vid.src = url;
  vid.muted = true;
  vid.playsInline = true;
  vid.preload = 'auto';
  vid.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;';
  document.body.appendChild(vid);
  vid.load();
  preloadPool[url] = vid;
  if (onReady) vid.addEventListener('canplay', onReady, { once: true });
}

// ─── Single slide background ──────────────────────────────────────────────
function SlideBackground({ url, isVideo, videoRef, onReady, active }) {
  const youtubeId = getYouTubeId(url);
  const [loaded, setLoaded] = useState(false);

  const handleReady = useCallback(() => {
    setLoaded(true);
    onReady?.();
  }, [onReady]);

  if (youtubeId) {
    return (
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <motion.div
          key={url}
          initial={{ opacity: 0 }}
          animate={{ opacity: active ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 w-full h-full">
          
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&mute=1&loop=1&playlist=${youtubeId}&controls=0&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&fs=0&disablekb=1&origin=${encodeURIComponent(window.location.origin)}`}
            allow="autoplay; encrypted-media"
            className="absolute pointer-events-none border-0"
            style={{ width: '100%', height: '100%', top: 0, left: 0, background: 'transparent' }}
            frameBorder="0"
            onLoad={handleReady}
            loading="eager" />
          
        </motion.div>
      </div>);

  }

  if (isVideo) {
    return (
      <motion.video
        ref={videoRef}
        src={url}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        onCanPlay={handleReady}
        key={url}
        initial={{ opacity: 0 }}
        animate={{ opacity: active && loaded ? 1 : 0 }}
        transition={{ duration: 0.4 }}
        className="absolute inset-0 w-full h-full object-cover" />);


  }

  return (
    <motion.div
      key={url}
      className="absolute inset-0 w-full h-full bg-cover bg-top md:bg-center"
      style={{
        backgroundImage: `url(${url})`
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: active ? 1 : 0 }}
      transition={{ duration: 1.4 }} />);


}

// ─── Main hero ────────────────────────────────────────────────────────────
export default function DynamicHero({ section }) {
  const heroMode = section?.hero_mode || 'single';
  const heroVideo = section?.hero_video || null;
  const content = parseContent(section?.content || section?.content_json);
  const desktopHeroImage = section?.media_url || content?.desktop_media_url || null;
  const mobileHeroImage = content?.mobile_media_url || null;
  const logoUrl = section?.logo_url || null;
  const logoWidth = section?.logo_width || 80;
  const logoHeight = section?.logo_height || 80;
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)');
    const apply = () => setIsMobile(query.matches);
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, []);

  const fallbackImage = isMobile ? mobileHeroImage || desktopHeroImage : desktopHeroImage || mobileHeroImage;

  const rawSlides = section?.slide_urls?.length ?
  section.slide_urls :
  [heroVideo || fallbackImage].filter(Boolean);
  const intervalMs = section?.slideshow_interval_ms || 5000;

  const videoRef = useRef(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);

  // ── Pre-cache ALL video slides immediately on mount ──────────────────
  useEffect(() => {
    const videoSlides = rawSlides.filter(isVideoUrl);
    if (videoSlides.length === 0) return;

    // 1. <link rel="preload"> for the first (current) slide — highest priority
    injectPreloadLink(videoSlides[0]);

    // 2. Preload all video slides into hidden buffer pool
    videoSlides.forEach((url, i) => {
      // Stagger slightly so the first clip gets bandwidth priority
      setTimeout(() => preloadVideo(url, i === 0 ? () => setVideoLoaded(true) : undefined), i * 200);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  // Also preload the single hero video in non-slideshow mode
  useEffect(() => {
    if (heroVideo && !section?.slide_urls?.length && isVideoUrl(heroVideo)) {
      injectPreloadLink(heroVideo);
      preloadVideo(heroVideo, () => setVideoLoaded(true));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Slideshow cycling
  useEffect(() => {
    if (heroMode !== 'slideshow' || rawSlides.length <= 1) return;
    const id = setInterval(() => {
      setSlideIndex((i) => (i + 1) % rawSlides.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [heroMode, rawSlides.length, intervalMs]);

  const isSlideshow = heroMode === 'slideshow' && rawSlides.length > 1;

  return (
    <section className="relative w-full max-w-full overflow-hidden bg-rain-cloud h-[72svh] min-h-[560px] md:h-[68vh] md:min-h-[520px] md:max-h-[760px]">

      {/* ── BACKGROUND LAYER ── */}
      <div className="absolute inset-0">
        {isSlideshow ?
        rawSlides.map((url, i) =>
        <SlideBackground
          key={url + i}
          url={url}
          isVideo={isVideoUrl(url)}
          videoRef={i === slideIndex ? videoRef : null}
          onReady={i === 0 ? () => setVideoLoaded(true) : undefined}
          active={i === slideIndex} />

        ) :
        heroVideo ?
        (() => {
          const ytId = getYouTubeId(heroVideo);
          if (ytId) {
            return (
              <div className="absolute inset-0 w-full h-full overflow-hidden">
                  <motion.div
                  className="absolute inset-0 w-full h-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: videoLoaded ? 1 : 0 }}
                  transition={{ duration: 0.3 }}>
                  
                    <iframe
                    src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=0&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&fs=0&disablekb=1&origin=${encodeURIComponent(window.location.origin)}`}
                    allow="autoplay; encrypted-media"
                    className="absolute pointer-events-none border-0"
                    style={{ width: '100%', height: '100%', top: 0, left: 0, background: 'transparent' }}
                    frameBorder="0"
                    onLoad={() => setVideoLoaded(true)}
                    loading="eager" />
                  
                  </motion.div>
                </div>);

          }
          return (
            <motion.video
              ref={videoRef}
              src={heroVideo}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              onCanPlay={() => setVideoLoaded(true)}
              className="absolute inset-0 w-full h-full object-cover"
              initial={{ opacity: 0 }}
              animate={{ opacity: videoLoaded ? 1 : 0 }}
              transition={{ duration: 0.4 }} />);


        })() :

        <div
          className="w-full h-full bg-cover bg-top md:bg-center"
          style={{
            backgroundImage: `url(${fallbackImage})`
          }} />

        }
      </div>

      {/* ── LIGHT LEGIBILITY OVERLAY (crisp image preserved) ── */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/6 via-transparent to-black/14 pointer-events-none" />
      <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-black/8 to-transparent pointer-events-none" />

      {/* Slideshow dots */}
      {isSlideshow &&
      <div className="absolute bottom-16 left-0 right-0 z-20 flex items-center justify-center gap-1.5">
          {rawSlides.map((_, i) =>
        <button
          key={i}
          onClick={() => setSlideIndex(i)}
          className={`transition-all duration-500 rounded-full ${
          i === slideIndex ?
          'w-5 h-1.5 bg-white/80' :
          'w-1.5 h-1.5 bg-white/30 hover:bg-white/50'}`
          } />

        )}
        </div>
      }

      {/* Scroll cue — subtle, elegant */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5, duration: 1.2 }}
        className="absolute z-20 left-6 bottom-12 pointer-events-none flex flex-col items-start gap-1.5">
        <motion.p
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          className="font-inter text-[8px] text-white/35 tracking-[0.3em] uppercase"
        >
          Scroll
        </motion.p>
        <motion.div
          animate={{ scaleY: [0.4, 1, 0.4], opacity: [0.3, 0.7, 0.3] }}
          transition={{ repeat: Infinity, duration: 2.0, ease: 'easeInOut' }}
          style={{ transformOrigin: 'top' }}
          className="w-px h-8 bg-gradient-to-b from-white/60 to-transparent"
        />
      </motion.div>

    </section>);

}
