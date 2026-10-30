import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from '@/components/products/ProductCard';

export default function BestSellerCarousel({ products = [] }) {
  const scrollRef = useRef(null);
  const items = products.filter((product) => product?.id);
  if (!items.length) return null;

  const scrollBy = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = direction === 'left' ? -el.clientWidth * 0.85 : el.clientWidth * 0.85;
    el.scrollBy({ left: amount, behavior: 'smooth' });
  };

  return (
    <section id="featured" className="scroll-mt-28 border-b border-soft-border/40 bg-warm-cream px-4 py-8 md:px-8 md:py-10">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <p className="font-inter text-[11px] font-bold uppercase tracking-[0.14em] text-deep-forest/45">
              What customers buy most
            </p>
            <h2 className="font-cormorant text-2xl font-semibold text-deep-forest md:text-3xl">
              Bestsellers
            </h2>
            <p className="mt-1 font-inter text-xs text-deep-forest/55">
              Popular purchases — separate from Yasvik Favourites.
            </p>
          </div>
          <Link to="/shop" className="inline-flex items-center gap-1 font-inter text-xs font-bold text-neon-paddy hover:text-deep-forest">
            View all <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => scrollBy('left')}
            className="absolute -left-2 top-[38%] z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-soft-border bg-white text-deep-forest shadow-md hover:bg-warm-cream md:flex"
            aria-label="Scroll products left"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy('right')}
            className="absolute -right-2 top-[38%] z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-soft-border bg-white text-deep-forest shadow-md hover:bg-warm-cream md:flex"
            aria-label="Scroll products right"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <div
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto pb-1 hide-scrollbar md:gap-4"
          >
            {items.slice(0, 12).map((product, index) => (
              <div
                key={`${product.id}-${product.preferredVariantLabel || 'default'}`}
                className="w-[10.5rem] flex-shrink-0 sm:w-[11.5rem] md:w-[13rem]"
              >
                <ProductCard
                  product={product}
                  preferredVariantLabel={product.preferredVariantLabel}
                  index={index}
                  variant="bestseller"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
