import OptimizedImage from '@/components/ui/OptimizedImage';
import { getComboMosaicUrls } from '@/lib/comboVisualUtils';

/**
 * Combo hero mosaic fallback when no dedicated hero image exists.
 * 2: split · 3: 1 large + 2 small · 4+: 2×2 with optional +N
 */
export default function ComboMosaic({
  product,
  products = [],
  heroUrl = '',
  alt = 'Yasvik combo',
  className = '',
  totalCount = 0,
}) {
  const urls = heroUrl
    ? [heroUrl]
    : getComboMosaicUrls({ ...product, products }, 4);
  const extra = Math.max(0, (Number(totalCount) || products.length || 0) - urls.length);

  if (!urls.length) {
    return (
      <div className={`flex items-center justify-center bg-warm-cream ${className}`}>
        <span className="font-inter text-[10px] font-semibold uppercase tracking-[0.14em] text-deep-forest/35">
          {alt || 'Combo'}
        </span>
      </div>
    );
  }

  if (urls.length === 1) {
    return (
      <div className={`overflow-hidden bg-warm-cream ${className}`}>
        <OptimizedImage src={urls[0]} alt={alt} preset="card" className="h-full w-full object-cover" />
      </div>
    );
  }

  if (urls.length === 2) {
    return (
      <div className={`grid grid-cols-2 gap-0.5 bg-warm-cream ${className}`}>
        {urls.map((url) => (
          <OptimizedImage key={url} src={url} alt="" preset="thumb" className="h-full w-full object-cover" />
        ))}
      </div>
    );
  }

  if (urls.length === 3) {
    return (
      <div className={`grid grid-cols-2 grid-rows-2 gap-0.5 bg-warm-cream ${className}`}>
        <div className="row-span-2 overflow-hidden">
          <OptimizedImage src={urls[0]} alt="" preset="card" className="h-full w-full object-cover" />
        </div>
        <div className="overflow-hidden">
          <OptimizedImage src={urls[1]} alt="" preset="thumb" className="h-full w-full object-cover" />
        </div>
        <div className="relative overflow-hidden">
          <OptimizedImage src={urls[2]} alt="" preset="thumb" className="h-full w-full object-cover" />
          {extra > 0 ? <MoreOverlay count={extra} /> : null}
        </div>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-2 grid-rows-2 gap-0.5 bg-warm-cream ${className}`}>
      {urls.slice(0, 4).map((url, index) => (
        <div key={`${url}-${index}`} className="relative overflow-hidden">
          <OptimizedImage src={url} alt="" preset="thumb" className="h-full w-full object-cover" />
          {index === 3 && extra > 0 ? <MoreOverlay count={extra} /> : null}
        </div>
      ))}
    </div>
  );
}

function MoreOverlay({ count }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-deep-forest/45">
      <span className="font-inter text-sm font-bold text-warm-cream">+{count}</span>
    </div>
  );
}
