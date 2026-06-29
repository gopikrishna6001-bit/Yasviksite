import { useState } from 'react';
import { mediaUrl } from '@/lib/media';

/**
 * Autoplay hero video with poster fallback on load error.
 */
export default function HeroBackgroundVideo({
  mp4,
  webm,
  poster,
  className = 'absolute inset-0 h-full w-full object-cover',
  visible = true,
}) {
  const [failed, setFailed] = useState(false);

  const mp4Src = mediaUrl(mp4);
  const webmSrc = mediaUrl(webm);
  const posterSrc = mediaUrl(poster);

  const opacityClass = visible ? 'opacity-100' : 'opacity-0';

  if (failed || (!mp4Src && !webmSrc)) {
    if (!posterSrc) return null;
    return (
      <img
        src={posterSrc}
        alt=""
        className={`${className} ${opacityClass} transition-opacity duration-500`}
        aria-hidden="true"
      />
    );
  }

  return (
    <video
      className={`${className} ${opacityClass} transition-opacity duration-500`}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      poster={posterSrc || undefined}
      onError={() => setFailed(true)}
      aria-hidden="true"
    >
      {webmSrc ? <source src={webmSrc} type="video/webm" /> : null}
      {mp4Src ? <source src={mp4Src} type="video/mp4" /> : null}
    </video>
  );
}
