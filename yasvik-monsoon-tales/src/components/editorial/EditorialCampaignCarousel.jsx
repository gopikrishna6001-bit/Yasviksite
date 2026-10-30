import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchLaunchReadyEditorialCampaigns } from '@/lib/editorialStorefront';
import { trackCampaignCtaClicked, trackCampaignViewed } from '@/lib/editorialAnalytics';
import { retailClasses } from '@/brand/retailTheme';

/** ~4.5s — enough to read a short line without stalling the carousel. */
const AUTOPLAY_MS = 4500;

function textSafeClass(position = 'bottom-left') {
  switch (position) {
    case 'bottom-right':
      return 'items-end justify-end text-right';
    case 'center':
      return 'items-end justify-center text-center pb-[12%]';
    case 'top-left':
      return 'items-start justify-start text-left';
    case 'top-right':
      return 'items-start justify-end text-right';
    default:
      return 'items-end justify-start text-left';
  }
}

/** Soft bottom (or edge) fade only — media stays the hero, not a frosted panel. */
function scrimClass(position = 'bottom-left') {
  switch (position) {
    case 'bottom-right':
    case 'bottom-left':
    case 'center':
      return 'bg-gradient-to-t from-black/55 via-black/15 to-transparent';
    case 'top-left':
      return 'bg-gradient-to-b from-black/45 via-black/10 to-transparent';
    case 'top-right':
      return 'bg-gradient-to-b from-black/45 via-black/10 to-transparent';
    default:
      return 'bg-gradient-to-t from-black/55 via-black/15 to-transparent';
  }
}

/**
 * Safe Harvest–style copy: theme + short headline + outline CTA.
 * No supporting paragraph / blur card — that fights video footage.
 */
function CampaignCopy({ campaign, size = 'desktop' }) {
  const isDesktop = size === 'desktop';
  return (
    <div className={`max-w-[28rem] ${isDesktop ? '' : 'max-w-[20rem]'}`}>
      <p
        className={`font-inter font-semibold uppercase tracking-[0.18em] text-white/80 ${
          isDesktop ? 'text-[11px]' : 'text-[10px]'
        }`}
        style={{ textShadow: '0 1px 8px rgba(0,0,0,0.45)' }}
      >
        {campaign.theme || campaign.title}
      </p>
      <h2
        className={`mt-1.5 font-cormorant font-semibold leading-[1.12] text-white ${
          isDesktop ? 'text-[1.75rem] lg:text-[2.15rem]' : 'text-[1.45rem]'
        }`}
        style={{ textShadow: '0 2px 16px rgba(0,0,0,0.55)' }}
      >
        {campaign.headline}
      </h2>
      <Link
        to={campaign.ctaHref || '/shop'}
        onClick={() => trackCampaignCtaClicked(campaign.id || campaign.slug, campaign.ctaHref)}
        className={`mt-4 inline-flex items-center border border-white/85 bg-white/10 font-inter font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-[1px] transition hover:bg-white hover:text-deep-forest ${
          isDesktop ? 'rounded-full px-5 py-2.5 text-[11px]' : 'rounded-full px-4 py-2 text-[10px]'
        }`}
      >
        {campaign.ctaLabel || 'Explore'}
      </Link>
    </div>
  );
}

function CampaignMedia({ src, isVideo, active, priority }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !isVideo) return;
    if (active) {
      el.play?.().catch(() => {});
    } else {
      el.pause?.();
      try {
        el.currentTime = 0;
      } catch {
        /* ignore seek errors on unload */
      }
    }
  }, [active, isVideo, src]);

  if (!src) return null;

  if (isVideo) {
    return (
      <video
        ref={videoRef}
        key={src}
        src={src}
        className="absolute inset-0 h-full w-full object-cover object-center"
        muted
        loop
        playsInline
        autoPlay={active}
        preload={priority ? 'auto' : 'metadata'}
        aria-hidden
      />
    );
  }

  return (
    <img
      src={src}
      alt=""
      className="absolute inset-0 h-full w-full object-cover object-center"
      decoding="async"
      loading={priority ? 'eager' : 'lazy'}
      {...(priority ? { fetchPriority: 'high' } : {})}
    />
  );
}

export default function EditorialCampaignCarousel() {
  const { data: campaigns = [] } = useQuery({
    queryKey: ['editorial-campaigns-launch-ready'],
    queryFn: fetchLaunchReadyEditorialCampaigns,
    staleTime: 60 * 1000,
  });
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const seen = useRef(new Set());
  const reduceMotion = useRef(
    typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  const safeIndex = campaigns.length ? Math.min(index, campaigns.length - 1) : 0;
  const campaign = campaigns[safeIndex];
  const multi = campaigns.length > 1;

  useEffect(() => {
    if (!campaign || seen.current.has(campaign.id || campaign.slug)) return;
    seen.current.add(campaign.id || campaign.slug);
    trackCampaignViewed(campaign.id || campaign.slug);
  }, [campaign]);

  useEffect(() => {
    if (!multi || paused || reduceMotion.current) return undefined;

    const id = window.setInterval(() => {
      if (document.hidden) return;
      setIndex((prev) => (prev + 1) % campaigns.length);
    }, AUTOPLAY_MS);

    return () => window.clearInterval(id);
  }, [multi, paused, campaigns.length, safeIndex]);

  if (!campaigns.length || !campaign) return null;

  const go = (dir) => {
    setIndex((prev) => {
      const next = prev + dir;
      if (next < 0) return campaigns.length - 1;
      if (next >= campaigns.length) return 0;
      return next;
    });
  };

  const position = campaign.textSafePosition || 'bottom-left';
  const safe = textSafeClass(position);
  const isVideo = campaign.mediaType === 'video';
  const desktopSrc = campaign.desktopMediaUrl || campaign.posterImageUrl;
  const mobileSrc = campaign.mobileMediaUrl || campaign.posterImageUrl || campaign.desktopMediaUrl;

  const pauseHandlers = multi
    ? {
        onMouseEnter: () => setPaused(true),
        onMouseLeave: () => setPaused(false),
        onFocusCapture: () => setPaused(true),
        onBlurCapture: (e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false);
        },
      }
    : {};

  return (
    <section className="bg-warm-cream py-4 md:py-7" aria-label="Campaign" aria-roledescription="carousel">
      <div className={retailClasses.container}>
        {/* Desktop — cinematic 21:9, full container width, media-led */}
        <div className="relative hidden md:block" {...pauseHandlers}>
          <div className="relative aspect-[21/9] w-full overflow-hidden rounded-[1.25rem] bg-deep-forest">
            <CampaignMedia src={desktopSrc} isVideo={isVideo} active priority />
            <div className={`pointer-events-none absolute inset-0 ${scrimClass(position)}`} />
            <div className={`absolute inset-0 flex p-7 lg:p-9 ${safe}`}>
              <CampaignCopy campaign={campaign} size="desktop" />
            </div>
            {multi ? (
              <div className="absolute bottom-5 right-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => go(-1)}
                  className="rounded-full bg-black/35 p-2 text-white transition hover:bg-black/55"
                  aria-label="Previous campaign"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  className="rounded-full bg-black/35 p-2 text-white transition hover:bg-black/55"
                  aria-label="Next campaign"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </div>
          {multi ? (
            <div className="mt-3 flex justify-center gap-1.5" role="tablist" aria-label="Campaigns">
              {campaigns.map((c, i) => (
                <button
                  key={c.id || c.slug}
                  type="button"
                  role="tab"
                  aria-selected={i === safeIndex}
                  onClick={() => setIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === safeIndex ? 'w-7 bg-deep-forest' : 'w-1.5 bg-deep-forest/25 hover:bg-deep-forest/40'
                  }`}
                  aria-label={`Show ${c.theme || c.title}`}
                />
              ))}
            </div>
          ) : null}
        </div>

        {/* Mobile — 4:5 portrait card, copy anchored to bottom strip */}
        <div className="md:hidden" {...pauseHandlers}>
          <div className="relative aspect-[4/5] max-h-[min(72vh,560px)] w-full overflow-hidden rounded-2xl bg-deep-forest">
            <CampaignMedia src={mobileSrc} isVideo={isVideo} active priority />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex flex-col items-start p-5 pb-6">
              <CampaignCopy campaign={campaign} size="mobile" />
            </div>
          </div>
          {multi ? (
            <div className="mt-3 flex items-center justify-between">
              <div className="flex gap-1.5" role="tablist" aria-label="Campaigns">
                {campaigns.map((c, i) => (
                  <button
                    key={c.id || c.slug}
                    type="button"
                    role="tab"
                    aria-selected={i === safeIndex}
                    onClick={() => setIndex(i)}
                    className={`h-1.5 rounded-full ${
                      i === safeIndex ? 'w-5 bg-deep-forest' : 'w-1.5 bg-deep-forest/25'
                    }`}
                    aria-label={`Show ${c.theme || c.title}`}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => go(-1)}
                  className="rounded-full border border-soft-border bg-white p-2"
                  aria-label="Previous"
                >
                  <ChevronLeft className="h-4 w-4 text-deep-forest" />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  className="rounded-full border border-soft-border bg-white p-2"
                  aria-label="Next"
                >
                  <ChevronRight className="h-4 w-4 text-deep-forest" />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
