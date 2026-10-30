import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Heart, Share2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import OptimizedImage from '@/components/ui/OptimizedImage';
import YasvikLogo from '@/components/brand/YasvikLogo';

function ProductFallback({ title }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#f0ebe0]">
      <div className="text-center">
        <YasvikLogo variant="symbol" imageClassName="mx-auto h-12 w-auto opacity-50" />
        <p className="mt-2 font-inter text-[10px] uppercase tracking-wider text-deep-forest/40">{title}</p>
      </div>
    </div>
  );
}

export default function ProductGalleryRetail({
  title,
  mediaItems = [],
  activeIndex = 0,
  onSelect,
  backTo = '/shop',
  onBack = null,
  onWishlist,
  isWishlisted = false,
  onShare,
}) {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);
  const active = mediaItems[activeIndex] || null;
  const total = mediaItems.length;

  useEffect(() => {
    setImageError(false);
  }, [activeIndex, active?.url]);

  const handleBack = (event) => {
    event.preventDefault();
    if (onBack) {
      onBack();
      return;
    }
    const idx = typeof window !== 'undefined' ? window.history.state?.idx : null;
    if (typeof idx === 'number' && idx > 0) {
      navigate(-1);
      return;
    }
    navigate(backTo);
  };

  return (
    <div className="relative bg-[#f0ebe0] md:rounded-2xl md:border md:border-soft-border md:overflow-hidden">
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-3 py-3 md:px-4">
        <Link
          to={backTo}
          onClick={handleBack}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-deep-forest shadow-sm backdrop-blur-sm"
          aria-label="Go back"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onWishlist}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-deep-forest shadow-sm backdrop-blur-sm"
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-neon-paddy text-neon-paddy' : ''}`} />
          </button>
          <button
            type="button"
            onClick={onShare}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-deep-forest shadow-sm backdrop-blur-sm"
            aria-label="Share product"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="relative aspect-square w-full overflow-hidden bg-[#ebe4d6]">
        <AnimatePresence mode="wait">
          {active?.type === 'image' && !imageError && (
            <motion.div
              key={active.url}
              className="absolute inset-0"
              initial={{ opacity: 0.4 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0.2 }}
            >
              <OptimizedImage
                src={active.url}
                alt={title}
                preset="detail"
                eager
                className="h-full w-full object-cover object-center"
                onError={() => setImageError(true)}
              />
            </motion.div>
          )}
          {active?.type === 'video' && (
            <motion.video
              key={active.url}
              src={active.url}
              className="absolute inset-0 h-full w-full object-cover"
              controls
              playsInline
              muted
              loop
              autoPlay
            />
          )}
          {active?.type === 'youtube' && (
            <motion.iframe
              key={active.url}
              src={`https://www.youtube-nocookie.com/embed/${active.youtubeId}?rel=0&modestbranding=1`}
              className="absolute inset-0 h-full w-full border-0"
              title={title}
            />
          )}
          {(!active || (active?.type === 'image' && imageError)) && (
            <div className="absolute inset-0">
              <ProductFallback title={title} />
            </div>
          )}
        </AnimatePresence>
        {total > 1 ? (
          <span className="absolute bottom-3 right-3 rounded-full bg-deep-forest/75 px-2.5 py-1 font-inter text-[10px] font-bold text-white">
            {activeIndex + 1} / {total}
          </span>
        ) : null}
      </div>

      {total > 1 ? (
        <div className="flex gap-2 overflow-x-auto border-t border-soft-border/60 bg-white p-2 hide-scrollbar md:gap-2.5 md:p-3">
          {mediaItems.map((item, i) => (
            <button
              key={`${item.url}-${i}`}
              type="button"
              onClick={() => onSelect(i)}
              className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 md:h-[4.5rem] md:w-[4.5rem] ${
                i === activeIndex ? 'border-deep-forest' : 'border-soft-border'
              }`}
            >
              {item.type === 'image' ? (
                <OptimizedImage src={item.url} alt="" preset="thumb" className="h-full w-full object-cover object-center" />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-warm-cream font-inter text-[9px] font-bold text-deep-forest/50">VID</span>
              )}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
