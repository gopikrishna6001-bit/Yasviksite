import { useCallback, useEffect, useRef, useState } from 'react';

/** Detect already-cached images and recover after tab background / stalled lazy loads. */
export function useStableImageLoad(activeSrc) {
  const imgRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  const markLoadedIfComplete = useCallback(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalHeight > 0) {
      setLoaded(true);
      return true;
    }
    return false;
  }, []);

  const retryStalledLoad = useCallback(() => {
    const img = imgRef.current;
    if (!img || !activeSrc) return;
    if (markLoadedIfComplete()) return;

    img.loading = 'eager';
    const current = img.currentSrc || img.src;
    if (current) {
      img.src = '';
      img.src = current;
    }
  }, [activeSrc, markLoadedIfComplete]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (!markLoadedIfComplete()) {
        setLoaded(false);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [activeSrc, markLoadedIfComplete]);

  useEffect(() => {
    const onVisible = () => {
      if (document.hidden) return;
      if (markLoadedIfComplete()) return;
      retryStalledLoad();
    };

    const onPageShow = () => {
      onVisible();
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [markLoadedIfComplete, retryStalledLoad]);

  const handleLoad = useCallback(() => {
    setLoaded(true);
  }, []);

  return { imgRef, loaded, handleLoad, markLoadedIfComplete };
}
