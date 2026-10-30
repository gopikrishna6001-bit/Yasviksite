import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  HOME_GOOGLE_REVIEWS_SETTING_KEY,
  resolveHomeGoogleReviews,
} from '@/lib/homeGoogleReviews';
import {
  fetchAllAppSettings,
  resolveSetting,
  SETTINGS_QUERY_KEYS,
} from '@/services/settingsService';
import { YASVIK_GOOGLE_MAPS_URL } from '@/lib/storeLocation';

const ROTATE_MS = 6500;

function Stars({ rating = 5 }) {
  const value = Number(rating);
  const normalized = Number.isFinite(value) && value >= 1 ? Math.min(5, value) : 5;
  return (
    <div
      className="flex items-center justify-center gap-1"
      aria-label={`${normalized} out of 5 stars`}
    >
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < normalized;
        return (
          <Star
            key={i}
            className={`h-5 w-5 ${filled ? 'fill-[#E8B923] text-[#E8B923]' : 'fill-transparent text-deep-forest/20'}`}
            strokeWidth={1.5}
            aria-hidden="true"
          />
        );
      })}
    </div>
  );
}

export default function HomeTrustTrio({ googleMapsUrl }) {
  const { data: settings = [] } = useQuery({
    queryKey: SETTINGS_QUERY_KEYS.home,
    queryFn: fetchAllAppSettings,
    staleTime: 10 * 60 * 1000,
  });

  const reviews = resolveHomeGoogleReviews(
    resolveSetting(settings, HOME_GOOGLE_REVIEWS_SETTING_KEY, []),
  );

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = reviews.length;
  const current = reviews[index] || reviews[0];

  useEffect(() => {
    setIndex(0);
  }, [count]);

  useEffect(() => {
    if (count < 2 || paused) return undefined;
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % count);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [count, paused]);

  if (!current) return null;

  const mapsHref = googleMapsUrl || YASVIK_GOOGLE_MAPS_URL;
  const go = (direction) => {
    if (count < 2) return;
    setIndex((prev) => (prev + direction + count) % count);
  };

  return (
    <section
      className="border-t border-soft-border/50 bg-warm-cream px-4 py-8 md:px-8 md:py-10"
      aria-label="Customer reviews"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false);
      }}
    >
      <div className="mx-auto max-w-[1400px]">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-inter text-[11px] font-bold uppercase tracking-[0.14em] text-deep-forest/45">
            From Google
          </p>
          <h2 className="font-cormorant text-2xl font-semibold text-deep-forest md:text-3xl">
            What our customers say
          </h2>
        </div>

        <div className="relative mx-auto mt-5 max-w-2xl rounded-2xl border border-soft-border/60 bg-white p-6 text-center md:p-8">
          <Stars rating={current.rating} />
          <p
            key={current.id}
            className="mt-4 font-inter text-sm leading-6 text-deep-forest/78 transition-opacity duration-300 md:text-[15px] md:leading-7"
          >
            &ldquo;{current.text}&rdquo;
          </p>
          <p className="mt-3 font-inter text-xs font-bold text-deep-forest">
            {current.name}
            {current.location ? (
              <span className="font-normal text-deep-forest/55"> · {current.location}</span>
            ) : null}
          </p>
          <p className="mt-1 font-inter text-[10px] uppercase tracking-[0.12em] text-deep-forest/40">
            Google review
          </p>

          {count > 1 ? (
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => go(-1)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-soft-border text-deep-forest/60 hover:bg-warm-cream hover:text-deep-forest"
                aria-label="Previous review"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-1.5" role="tablist" aria-label="Review slides">
                {reviews.map((review, i) => (
                  <button
                    key={review.id}
                    type="button"
                    role="tab"
                    aria-selected={i === index}
                    aria-label={`Show review ${i + 1}`}
                    onClick={() => setIndex(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === index ? 'w-5 bg-deep-forest' : 'w-1.5 bg-deep-forest/25 hover:bg-deep-forest/45'
                    }`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => go(1)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-soft-border text-deep-forest/60 hover:bg-warm-cream hover:text-deep-forest"
                aria-label="Next review"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>

        {mapsHref ? (
          <p className="mt-4 text-center">
            <a
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex font-inter text-xs font-bold text-neon-paddy hover:text-deep-forest"
            >
              Read more on Google
            </a>
          </p>
        ) : null}
      </div>
    </section>
  );
}
