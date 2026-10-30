import { useEffect, useMemo, useState } from 'react';
import { buildResponsiveImage, originalMediaUrl } from '@/lib/mediaUrl';
import { useStableImageLoad } from '@/hooks/useStableImageLoad';

/**
 * Responsive product/media image with cache-aware load detection.
 * Recovers when returning from a background browser tab (stalled lazy loads).
 */
export default function OptimizedImage({
  src,
  alt = '',
  preset = 'card',
  eager = false,
  fadeOnLoad = true,
  className = '',
  wrapperClassName = '',
  placeholder = null,
  onLoad,
  onError,
  ...rest
}) {
  const [useOriginal, setUseOriginal] = useState(false);
  const [failed, setFailed] = useState(false);
  const image = useMemo(() => buildResponsiveImage(src, preset), [src, preset]);
  const fallbackSrc = useMemo(() => originalMediaUrl(src), [src]);

  const displaySrc = useOriginal || !image.src ? fallbackSrc : image.src;
  const { imgRef, loaded, handleLoad } = useStableImageLoad(displaySrc);

  useEffect(() => {
    setUseOriginal(false);
    setFailed(false);
  }, [src, preset]);

  if ((!image.src && !fallbackSrc) || failed) {
    return placeholder || null;
  }

  const fadeClass = fadeOnLoad
    ? `transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`
    : 'opacity-100';

  return (
    <div className={`relative h-full w-full overflow-hidden bg-[#f5f1e8] ${wrapperClassName}`.trim()}>
      {!loaded && placeholder ? (
        <div className="absolute inset-0" aria-hidden="true">
          {placeholder}
        </div>
      ) : null}
      <img
        ref={imgRef}
        src={displaySrc}
        srcSet={useOriginal ? undefined : image.srcSet || undefined}
        sizes={useOriginal ? undefined : image.sizes || undefined}
        width={image.width}
        height={image.height}
        alt={alt}
        className={`${className} ${fadeClass}`.trim()}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={eager ? 'high' : 'low'}
        onLoad={(event) => {
          handleLoad();
          onLoad?.(event);
        }}
        onError={(event) => {
          if (!useOriginal && fallbackSrc && displaySrc !== fallbackSrc) {
            setUseOriginal(true);
            return;
          }
          setFailed(true);
          onError?.(event);
        }}
        {...rest}
      />
    </div>
  );
}
