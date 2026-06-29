import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import useEmblaCarousel from 'embla-carousel-react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { products as productsApi } from '@/services/api';
import SectionHeader from '@/components/brand/SectionHeader';
import OptimizedImage from '@/components/ui/OptimizedImage';
import { productPrimaryImageUrl } from '@/lib/mediaUrl';
import { formatPrice } from '@/lib/priceLabelGenerator';
import { getProductPath } from '@/lib/productUrls';

function getProductImage(product) {
  return productPrimaryImageUrl(product, null);
}

function getPitch(product) {
  return String(product?.short_description || product?.description || '').trim();
}

function getBadge(product) {
  const badges = Array.isArray(product?.purity_badges) ? product.purity_badges : [];
  return String(badges[0] || 'Customer pick').trim();
}

export default function FeaturedHeroProductsCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start', duration: 28 });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { data: products = [] } = useQuery({
    queryKey: ['home-featured-hero-products'],
    queryFn: async () => {
      const pinned = await productsApi.listFeaturedInHero(6);
      if (pinned.length) return pinned;
      return productsApi.listFeatured(6);
    },
    staleTime: 5 * 60 * 1000,
  });

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return undefined;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  if (!products.length) return null;

  return (
    <section
      id="featured-picks"
      aria-label="Featured products"
      className="border-y border-soft-border bg-warm-cream px-4 py-12 md:px-8 md:py-16"
    >
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-8 flex flex-col gap-4 md:mb-10 md:flex-row md:items-end md:justify-between">
          <SectionHeader
            eyebrow="Try these"
            title="Customer favourites worth a first order"
            description="Hand-picked staples our shoppers reorder — buffalo ghee, forest honey, and more."
          />
          <div className="hidden items-center gap-2 md:flex">
            <button
              type="button"
              onClick={() => emblaApi?.scrollPrev()}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-soft-border bg-white text-deep-forest transition-colors hover:border-neon-paddy/40 hover:text-neon-paddy"
              aria-label="Previous featured product"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => emblaApi?.scrollNext()}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-soft-border bg-white text-deep-forest transition-colors hover:border-neon-paddy/40 hover:text-neon-paddy"
              aria-label="Next featured product"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {products.map((product) => {
              const imageUrl = getProductImage(product);
              const pitch = getPitch(product);
              const badge = getBadge(product);
              const priceLabel = formatPrice(product.price);
              const unit = String(product.unit || '').trim();

              return (
                <article
                  key={product.id}
                  className="min-w-0 flex-[0_0_100%] px-0.5"
                >
                  <div className="overflow-hidden rounded-[1.75rem] border border-soft-border bg-white shadow-[0_12px_36px_rgba(31,61,43,0.05)]">
                    <div className="grid md:grid-cols-2">
                      <Link
                        to={getProductPath(product)}
                        className="group relative block aspect-square overflow-hidden bg-warm-cream"
                      >
                        {imageUrl ? (
                          <OptimizedImage
                            src={imageUrl}
                            alt={product.title || 'Featured product'}
                            preset="card"
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="flex h-full min-h-[240px] items-center justify-center bg-warm-cream font-cormorant text-2xl text-deep-forest/35">
                            {product.title}
                          </div>
                        )}
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-deep-forest/20 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-white/10" />
                      </Link>

                      <div className="flex flex-col justify-center px-6 py-8 md:px-10 md:py-10">
                        <p className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-sun-dried-clay">
                          {badge}
                        </p>
                        <h3 className="mt-3 font-cormorant text-3xl font-semibold leading-tight text-deep-forest md:text-4xl">
                          {product.title}
                        </h3>
                        {pitch ? (
                          <p className="mt-4 max-w-xl font-inter text-sm leading-7 text-deep-forest/70 md:text-base">
                            {pitch}
                          </p>
                        ) : null}
                        <div className="mt-6 flex flex-wrap items-center gap-4">
                          {priceLabel && priceLabel !== '—' ? (
                            <p className="font-cormorant text-2xl font-semibold text-deep-forest">
                              ₹{priceLabel}
                              {unit ? (
                                <span className="ml-2 font-inter text-sm font-normal text-deep-forest/45">{unit}</span>
                              ) : null}
                            </p>
                          ) : null}
                          <Link
                            to={getProductPath(product)}
                            className="inline-flex items-center gap-2 rounded-full bg-neon-paddy px-5 py-2.5 font-inter text-sm font-semibold text-white transition-colors hover:bg-deep-forest"
                          >
                            Shop now
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2">
          {products.map((product, index) => (
            <button
              key={product.id}
              type="button"
              onClick={() => emblaApi?.scrollTo(index)}
              className={`rounded-full transition-all ${
                index === selectedIndex
                  ? 'h-2 w-8 bg-neon-paddy'
                  : 'h-2 w-2 bg-deep-forest/20 hover:bg-deep-forest/35'
              }`}
              aria-label={`Show ${product.title}`}
              aria-current={index === selectedIndex ? 'true' : undefined}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
