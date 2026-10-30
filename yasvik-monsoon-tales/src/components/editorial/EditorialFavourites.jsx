import { useEffect, useRef } from 'react';
import ProductCard from '@/components/products/ProductCard';
import { getHeroPriceSummary } from '@/lib/editorialStorefront';
import { trackHeroProductViewed } from '@/lib/editorialAnalytics';
import { retailClasses } from '@/brand/retailTheme';

function HeroPriceBadge({ product }) {
  const summary = getHeroPriceSummary(product);
  if (!summary.priceLine) return null;
  return (
    <p className="font-inter text-sm font-bold text-deep-forest">
      {summary.priceLine}
    </p>
  );
}

export default function EditorialFavourites({ products = [] }) {
  const viewed = useRef(new Set());
  const rowRef = useRef(null);

  useEffect(() => {
    const root = rowRef.current;
    if (!root) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = entry.target.getAttribute('data-hero-id');
          if (!id || viewed.current.has(id)) return;
          viewed.current.add(id);
          trackHeroProductViewed(id);
        });
      },
      { threshold: 0.4 },
    );
    root.querySelectorAll('[data-hero-id]').forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [products]);

  if (!products.length) return null;
  const list = products.slice(0, 8);

  return (
    <section className="border-b border-soft-border/40 bg-white py-8 md:py-12" aria-labelledby="editorial-favourites-heading">
      <div className={retailClasses.container}>
        <p className={retailClasses.label}>Yasvik Favourites</p>
        <h2 id="editorial-favourites-heading" className={`${retailClasses.titleLg} mt-2`}>
          What we want Yasvik to be known for
        </h2>
        <p className={`${retailClasses.body} mt-2 max-w-2xl`}>
          Editorially chosen — not an automatic bestsellers list.
        </p>

        <div ref={rowRef} className="mt-6 flex gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:overflow-visible lg:grid-cols-4">
          {list.map((product, index) => {
            const summary = getHeroPriceSummary(product);
            return (
              <div key={product.id} data-hero-id={product.id} className="w-[11.5rem] flex-shrink-0 md:w-auto">
                <ProductCard
                  product={product}
                  index={index}
                  variant="homepage"
                  preferredVariantLabel={summary.startingVariant?.label}
                />
                <div className="mt-2 flex items-center justify-between gap-2 px-0.5">
                  <HeroPriceBadge product={product} />
                  {!summary.inStock ? (
                    <span className="font-inter text-[10px] font-bold uppercase tracking-wider text-deep-forest/45">Sold out</span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
