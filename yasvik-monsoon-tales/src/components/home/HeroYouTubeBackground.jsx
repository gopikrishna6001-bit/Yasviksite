import { buildYouTubeHeroEmbedSrc, getYouTubeId } from '@/lib/heroMediaUtils';

/**
 * Full-bleed muted looping YouTube background (cover-style crop).
 */
export default function HeroYouTubeBackground({ url, className = '' }) {
  const youtubeId = getYouTubeId(url);
  if (!youtubeId) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const embedSrc = buildYouTubeHeroEmbedSrc(youtubeId, origin);

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      <iframe
        src={embedSrc}
        title=""
        allow="autoplay; encrypted-media; picture-in-picture"
        className="pointer-events-none absolute top-1/2 left-1/2 min-h-full w-[177.78vh] min-w-full -translate-x-1/2 -translate-y-1/2 border-0"
        style={{ height: '56.25vw' }}
      />
    </div>
  );
}
