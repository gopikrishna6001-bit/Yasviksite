/**
 * Preload image URLs into the browser cache (used before revealing product grids).
 */
export function preloadImage(src) {
  return new Promise((resolve) => {
    const url = String(src || '').trim();
    if (!url) {
      resolve(false);
      return;
    }

    const img = new Image();
    img.decoding = 'async';

    const finish = (ok) => {
      img.onload = null;
      img.onerror = null;
      resolve(ok);
    };

    img.onload = () => finish(true);
    img.onerror = () => finish(false);
    img.src = url;

    if (img.complete && img.naturalHeight > 0) {
      finish(true);
    }
  });
}

/** Wait for all URLs (or timeout) — never rejects. */
export async function preloadImages(urls = [], { timeoutMs = 12000 } = {}) {
  const unique = [...new Set(urls.map((u) => String(u || '').trim()).filter(Boolean))];
  if (!unique.length) {
    return { loaded: 0, failed: 0, total: 0, timedOut: false };
  }

  let timedOut = false;
  const loads = Promise.all(unique.map((url) => preloadImage(url)));
  const timeout = new Promise((resolve) => {
    setTimeout(() => {
      timedOut = true;
      resolve();
    }, timeoutMs);
  });

  const results = await Promise.race([
    loads.then((r) => r),
    timeout.then(() => null),
  ]);

  if (results === null) {
    return { loaded: 0, failed: 0, total: unique.length, timedOut: true };
  }

  const loaded = results.filter(Boolean).length;
  return { loaded, failed: unique.length - loaded, total: unique.length, timedOut };
}
