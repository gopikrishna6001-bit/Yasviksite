import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { getCategoryShopHref } from '@/lib/categoryDisplay';
import { useCategoryDisplayImages } from '@/hooks/useCategoryDisplayImages';
import { useHomepageCategoryMerchandising } from '@/hooks/useStorefrontCategories';
import {
  homepageCtaLabel,
  homepageDisplayDescription,
  homepageDisplayImage,
  homepageDisplayLabel,
} from '@/lib/homepageCategoryMerchandising';

function CategoryTile({ category, size = 'hero' }) {
  const href = getCategoryShopHref(category);
  const label = homepageDisplayLabel(category);
  const description = homepageDisplayDescription(category);
  const imageUrl = homepageDisplayImage(category);
  const cta = homepageCtaLabel(category);
  const isHero = size === 'hero';

  return (
    <Link
      to={href}
      className={`group relative flex overflow-hidden rounded-2xl border border-soft-border/80 bg-white transition-shadow hover:shadow-[0_12px_32px_rgba(31,61,43,0.08)] ${
        isHero ? 'min-h-[11.5rem] flex-col sm:min-h-[13rem]' : 'min-h-[7.5rem] flex-row items-stretch'
      }`}
    >
      <div
        className={`relative overflow-hidden bg-warm-cream ${
          isHero ? 'aspect-[4/3] w-full' : 'w-[38%] min-w-[6.5rem] self-stretch'
        }`}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full min-h-[6rem] items-center justify-center bg-gradient-to-br from-warm-cream to-soft-border/40 px-3 text-center font-cormorant text-lg text-deep-forest/40">
            {label}
          </div>
        )}
      </div>
      <div className={`flex flex-1 flex-col justify-center ${isHero ? 'p-4' : 'p-3.5'}`}>
        <h3 className={`font-cormorant font-semibold leading-snug text-deep-forest ${isHero ? 'text-xl md:text-2xl' : 'text-lg'}`}>
          {label}
        </h3>
        {description ? (
          <p className={`mt-1.5 font-inter leading-snug text-deep-forest/65 ${isHero ? 'text-sm' : 'text-xs line-clamp-2'}`}>
            {description}
          </p>
        ) : null}
        <span className="mt-3 inline-flex items-center gap-1 font-inter text-xs font-bold text-neon-paddy transition-colors group-hover:text-deep-forest">
          {cta} <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}

export default function HomepageCategorySections() {
  const { data } = useHomepageCategoryMerchandising();
  const hero = data?.hero || [];
  const featured = data?.featured || [];

  const { categories: heroEnriched } = useCategoryDisplayImages(hero);
  const { categories: featuredEnriched } = useCategoryDisplayImages(featured);

  if (!heroEnriched.length && !featuredEnriched.length) return null;

  return (
    <>
      {heroEnriched.length > 0 ? (
        <section className="border-b border-soft-border/40 bg-warm-cream px-4 py-8 md:px-8 md:py-10" aria-labelledby="home-favourites-heading">
          <div className="mx-auto max-w-[1400px]">
            <div className="mb-5 flex items-end justify-between gap-3">
              <div>
                <p className="font-inter text-[11px] font-bold uppercase tracking-[0.14em] text-deep-forest/45">
                  Shop Yasvik&rsquo;s favourites
                </p>
                <h2 id="home-favourites-heading" className="font-cormorant text-2xl font-semibold text-deep-forest md:text-3xl">
                  What we&rsquo;re known for
                </h2>
              </div>
              <Link to="/shop" className="hidden items-center gap-1 font-inter text-xs font-bold text-neon-paddy hover:text-deep-forest sm:inline-flex">
                View all <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {heroEnriched.map((cat) => (
                <CategoryTile key={cat.id} category={cat} size="hero" />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {featuredEnriched.length > 0 ? (
        <section className="border-b border-soft-border/40 bg-white px-4 py-8 md:px-8 md:py-10" aria-labelledby="home-featured-heading">
          <div className="mx-auto max-w-[1400px]">
            <div className="mb-5">
              <p className="font-inter text-[11px] font-bold uppercase tracking-[0.14em] text-deep-forest/45">
                From the aisles
              </p>
              <h2 id="home-featured-heading" className="font-cormorant text-2xl font-semibold text-deep-forest md:text-3xl">
                More to explore
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {featuredEnriched.map((cat) => (
                <CategoryTile key={cat.id} category={cat} size="featured" />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
