import { useRef, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ComboProductCardFromBundle } from '@/components/products/ComboProductCard';
import { BUNDLES_SHOP_PATH } from '@/lib/comboUtils';

/**
 * Compact horizontal combo carousel for shop / homepage merchandising.
 * Does not render full What’s Inside lists.
 */
export default function ComboCarousel({
  bundles = [],
  eyebrow = 'Better Together',
  title = 'Combos & Value Packs',
  description = 'Useful combinations at better overall value.',
  viewAllHref = BUNDLES_SHOP_PATH,
  viewAllLabel = 'View all combos →',
  limit = 6,
  className = '',
}) {
  const scrollerRef = useRef(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const items = (bundles || []).filter((b) => b?.parent_product?.id).slice(0, limit);

  const updateArrows = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft < max - 8);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return undefined;
    updateArrows();
    el.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);
    return () => {
      el.removeEventListener('scroll', updateArrows);
      window.removeEventListener('resize', updateArrows);
    };
  }, [updateArrows, items.length]);

  const scrollByCard = (dir) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector('[data-combo-slide]');
    const amount = card ? card.getBoundingClientRect().width + 16 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * amount, behavior: 'smooth' });
  };

  if (!items.length) return null;

  return (
    <section className={`py-2 ${className}`} aria-label={title}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 max-w-xl">
          <p className="font-inter text-[11px] font-bold uppercase tracking-[0.16em] text-sun-dried-clay">
            {eyebrow}
          </p>
          <h2 className="mt-1 font-cormorant text-2xl font-semibold text-deep-forest md:text-3xl">
            {title}
          </h2>
          {description ? (
            <p className="mt-1.5 font-inter text-sm text-deep-forest/60">{description}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1 sm:flex">
            <button
              type="button"
              onClick={() => scrollByCard(-1)}
              disabled={!canPrev}
              aria-label="Previous combos"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-soft-border bg-white text-deep-forest disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollByCard(1)}
              disabled={!canNext}
              aria-label="Next combos"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-soft-border bg-white text-deep-forest disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          {viewAllHref ? (
            <Link
              to={viewAllHref}
              className="font-inter text-sm font-bold text-deep-forest hover:text-sun-dried-clay"
            >
              {viewAllLabel}
            </Link>
          ) : null}
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory hide-scrollbar"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {items.map((bundle, index) => (
          <div
            key={bundle.id}
            data-combo-slide
            className="w-[78%] max-w-[280px] flex-shrink-0 snap-start sm:w-[calc(50%-0.5rem)] sm:max-w-none md:w-[calc(33.333%-0.7rem)] lg:w-[calc(25%-0.75rem)]"
          >
            <ComboProductCardFromBundle bundle={bundle} index={index} />
          </div>
        ))}
      </div>
    </section>
  );
}
