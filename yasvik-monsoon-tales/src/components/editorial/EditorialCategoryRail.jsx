import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useCategoryDisplayImages } from '@/hooks/useCategoryDisplayImages';
import { useStorefrontCategories } from '@/hooks/useStorefrontCategories';
import { getCategoryShopHref } from '@/lib/categoryDisplay';
import { EDITORIAL_CATEGORY_RAIL } from '@/lib/editorialStorefront';
import { normalizeCategorySlug } from '@/lib/storefrontCategories';
import { retailClasses } from '@/brand/retailTheme';

/**
 * Compact post-brand shopping rail.
 * Sales-led priorities — not the full catalogue.
 */
export default function EditorialCategoryRail() {
  const { data: categories = [] } = useStorefrontCategories();
  const { categories: enriched } = useCategoryDisplayImages(categories);

  const tiles = useMemo(() => {
    const bySlug = Object.fromEntries(
      (enriched || []).map((cat) => [normalizeCategorySlug(cat.slug), cat]),
    );
    return EDITORIAL_CATEGORY_RAIL.map((tile) => {
      const cat = bySlug[tile.slug];
      return {
        key: tile.slug,
        label: tile.label,
        href: cat ? getCategoryShopHref(cat) : `/shop/${tile.slug}`,
        image: cat?.display_image_url || cat?.image_url || cat?.cover_image_url || '',
      };
    });
  }, [enriched]);

  if (!tiles.length) return null;

  return (
    <section className="border-b border-soft-border/40 bg-warm-cream py-4 md:py-5" aria-label="Shop by category">
      <div className={retailClasses.container}>
        <div className="-mx-1 flex gap-2.5 overflow-x-auto pb-1 scrollbar-thin sm:gap-3 md:flex-wrap md:justify-center md:overflow-visible">
          {tiles.map((tile) => (
            <Link
              key={tile.key}
              to={tile.href}
              className="group flex w-[4.6rem] flex-shrink-0 flex-col items-center gap-2 sm:w-[5.25rem]"
            >
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-soft-border/80 bg-white sm:h-[3.75rem] sm:w-[3.75rem]">
                {tile.image ? (
                  <img
                    src={tile.image}
                    alt=""
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
                    loading="lazy"
                  />
                ) : (
                  <span className="font-cormorant text-base font-semibold text-deep-forest/35">
                    {String(tile.label || '?').slice(0, 1)}
                  </span>
                )}
              </div>
              <span className="line-clamp-2 max-w-[5.5rem] text-center font-inter text-[10px] font-semibold leading-tight text-deep-forest/75 group-hover:text-deep-forest sm:text-[11px]">
                {tile.label}
              </span>
            </Link>
          ))}
          <Link
            to="/shop"
            className="group flex w-[4.6rem] flex-shrink-0 flex-col items-center gap-2 sm:w-[5.25rem]"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-deep-forest/25 bg-white sm:h-[3.75rem] sm:w-[3.75rem]">
              <span className="font-inter text-[10px] font-bold uppercase tracking-wider text-deep-forest/55">
                All
              </span>
            </div>
            <span className="line-clamp-2 max-w-[5.5rem] text-center font-inter text-[10px] font-semibold leading-tight text-deep-forest/75 group-hover:text-deep-forest sm:text-[11px]">
              View All
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
