import { useMemo, useState } from 'react';
import { buildResponsiveImage, originalMediaUrl } from '@/lib/mediaUrl';

/**
 * Responsive, WebP-optimized image with lazy loading defaults.
 * Falls back to the original CDN URL if Cloudflare resize is unavailable.
 * @param {string} preset - thumb | card | category | detail | hero | banner | logo
 * @param {boolean} eager - above-the-fold (disables lazy load)
 */
export default function OptimizedImage({
  src,
  alt = '',
  preset = 'card',
  eager = false,
  className = '',
  onLoad,
  onError,
  ...rest
}) {
  const [useOriginal, setUseOriginal] = useState(false);
  const image = useMemo(() => buildResponsiveImage(src, preset), [src, preset]);
  const fallbackSrc = useMemo(() => originalMediaUrl(src), [src]);

  if (!image.src && !fallbackSrc) return null;

  const displaySrc = useOriginal ? fallbackSrc : image.src;

  return (
    <img
      src={displaySrc}
      srcSet={useOriginal ? undefined : image.srcSet || undefined}
      sizes={useOriginal ? undefined : image.sizes || undefined}
      width={image.width}
      height={image.height}
      alt={alt}
      className={className}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={eager ? 'high' : 'low'}
      onLoad={onLoad}
      onError={(event) => {
        if (!useOriginal && fallbackSrc && displaySrc !== fallbackSrc) {
          setUseOriginal(true);
          return;
        }
        onError?.(event);
      }}
      {...rest}
    />
  );
}
