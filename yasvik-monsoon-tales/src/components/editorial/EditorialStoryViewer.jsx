import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Volume2, VolumeX, X } from 'lucide-react';
import {
  trackStoryClosed,
  trackStoryCompleted,
  trackStoryImpression,
  trackStoryProductClicked,
  trackStoryStarted,
} from '@/lib/editorialAnalytics';

/**
 * Vertical 9:16 story viewer — poster-first, tap-to-play, no carousel autoplay.
 */
export default function EditorialStoryViewer({
  stories = [],
  startIndex = 0,
  open,
  onClose,
}) {
  const [index, setIndex] = useState(startIndex);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [showCaptions, setShowCaptions] = useState(true);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef(null);
  const scrollYRef = useRef(0);
  const startedRef = useRef(new Set());

  const story = stories[index] || null;

  useEffect(() => {
    if (open) {
      scrollYRef.current = window.scrollY || 0;
      setIndex(startIndex);
      setPlaying(false);
      setProgress(0);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      window.scrollTo(0, scrollYRef.current);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open, startIndex]);

  useEffect(() => {
    if (!open || !story?.id) return;
    trackStoryImpression(story.id);
  }, [open, story?.id]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
    if (playing && story?.video_url) {
      video.play().catch(() => setPlaying(false));
    } else {
      video.pause();
    }
  }, [playing, muted, story?.id, story?.video_url]);

  // Image-only stories: advance after duration_seconds (default 6s)
  useEffect(() => {
    if (!open || !story || story.video_url) return undefined;
    if (!startedRef.current.has(story.id)) {
      startedRef.current.add(story.id);
      trackStoryStarted(story.id);
    }
    const totalMs = Math.max(3, Number(story.duration_seconds) || 6) * 1000;
    const startedAt = Date.now();
    setProgress(0);
    const tick = window.setInterval(() => {
      const pct = Math.min(1, (Date.now() - startedAt) / totalMs);
      setProgress(pct);
      if (pct >= 1) {
        window.clearInterval(tick);
        trackStoryCompleted(story.id);
        setPlaying(false);
        setProgress(0);
        setIndex((prev) => (prev < stories.length - 1 ? prev + 1 : prev));
      }
    }, 50);
    return () => window.clearInterval(tick);
  }, [open, story, stories.length]);

  const close = useCallback(() => {
    if (story?.id) trackStoryClosed(story.id);
    setPlaying(false);
    onClose?.();
  }, [onClose, story?.id]);

  const go = useCallback((dir) => {
    setPlaying(false);
    setProgress(0);
    setIndex((prev) => {
      const next = prev + dir;
      if (next < 0 || next >= stories.length) return prev;
      return next;
    });
  }, [stories.length]);

  const onTapPlay = () => {
    if (!story?.video_url) return;
    if (!startedRef.current.has(story.id)) {
      startedRef.current.add(story.id);
      trackStoryStarted(story.id);
    }
    setPlaying((p) => !p);
  };

  if (!open || !story) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90" role="dialog" aria-modal="true" aria-label={story.title}>
      <div className="relative flex h-full w-full max-w-lg flex-col md:h-[min(90vh,720px)] md:w-[min(100%,400px)] md:rounded-2xl md:overflow-hidden">
        <div className="absolute left-0 right-0 top-0 z-20 flex gap-1 p-3">
          {stories.map((s, i) => (
            <div key={s.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full bg-white transition-[width] duration-150"
                style={{ width: i < index ? '100%' : i === index ? `${Math.round(progress * 100)}%` : '0%' }}
              />
            </div>
          ))}
        </div>

        <div className="absolute right-3 top-6 z-20 flex gap-2">
          <button type="button" onClick={() => setMuted((m) => !m)} className="rounded-full bg-black/40 p-2 text-white" aria-label={muted ? 'Unmute' : 'Mute'}>
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <button type="button" onClick={close} className="rounded-full bg-black/40 p-2 text-white" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <button type="button" className="absolute inset-y-0 left-0 z-10 w-1/3" aria-label="Previous story" onClick={() => go(-1)} />
        <button type="button" className="absolute inset-y-0 right-0 z-10 w-1/3" aria-label="Next story" onClick={() => go(1)} />

        <div className="relative flex flex-1 items-center justify-center bg-black" onClick={onTapPlay}>
          {story.video_url ? (
            <video
              ref={videoRef}
              key={story.id}
              className="h-full w-full object-cover"
              playsInline
              preload="none"
              poster={story.poster_image_url || undefined}
              muted={muted}
              onTimeUpdate={(e) => {
                const v = e.currentTarget;
                if (v.duration) setProgress(v.currentTime / v.duration);
              }}
              onEnded={() => {
                trackStoryCompleted(story.id);
                setPlaying(false);
                setProgress(1);
                if (index < stories.length - 1) go(1);
              }}
            >
              <source src={story.video_url} />
            </video>
          ) : (
            <div className="relative h-full w-full">
              {story.poster_image_url ? (
                <img src={story.poster_image_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-deep-forest to-[#3d3428] p-8 text-center">
                  <p className="font-cormorant text-2xl font-semibold text-warm-cream">{story.title}</p>
                </div>
              )}
            </div>
          )}

          {showCaptions && story.captions ? (
            <p className="pointer-events-none absolute bottom-28 left-4 right-4 z-20 text-center font-inter text-sm font-medium text-white drop-shadow">
              {story.captions}
            </p>
          ) : null}
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-20 space-y-3 bg-gradient-to-t from-black/80 to-transparent p-5 pt-16 text-white">
          <p className="font-inter text-[10px] font-bold uppercase tracking-[0.14em] text-white/60">
            {story.status === 'draft' ? 'Draft story' : 'Story'}
          </p>
          <h3 className="font-cormorant text-xl font-semibold leading-snug">{story.title}</h3>
          {story.short_hook ? <p className="font-inter text-sm text-white/80">{story.short_hook}</p> : null}
          <div className="flex flex-wrap items-center gap-3">
            {story.cta_destination ? (
              <Link
                to={story.cta_destination}
                onClick={() => {
                  trackStoryProductClicked(story.id, story.related_product_id || '');
                  close();
                }}
                className="rounded-full bg-warm-cream px-4 py-2 font-inter text-[11px] font-bold uppercase tracking-[0.12em] text-deep-forest"
              >
                {story.cta_label || 'View'}
              </Link>
            ) : null}
            {story.instagram_url ? (
              <a href={story.instagram_url} target="_blank" rel="noreferrer" className="font-inter text-xs font-semibold text-white/80 underline">
                Instagram
              </a>
            ) : null}
            <button type="button" onClick={() => setShowCaptions((c) => !c)} className="font-inter text-xs text-white/60">
              {showCaptions ? 'Hide captions' : 'Show captions'}
            </button>
          </div>
          <div className="flex justify-between pt-1">
            <button type="button" disabled={index === 0} onClick={() => go(-1)} className="rounded-full bg-white/10 p-2 disabled:opacity-30" aria-label="Previous">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" disabled={index >= stories.length - 1} onClick={() => go(1)} className="rounded-full bg-white/10 p-2 disabled:opacity-30" aria-label="Next">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
