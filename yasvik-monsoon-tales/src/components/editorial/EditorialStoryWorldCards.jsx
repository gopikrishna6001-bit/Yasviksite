import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { trackStoryWorldClicked } from '@/lib/editorialAnalytics';
import { retailClasses } from '@/brand/retailTheme';

export default function EditorialStoryWorldCards({ collections = [] }) {
  if (!collections.length) return null;

  return (
    <section className="border-b border-soft-border/40 bg-warm-cream py-8 md:py-12" aria-labelledby="story-worlds-heading">
      <div className={retailClasses.container}>
        <p className={retailClasses.label}>Story worlds</p>
        <h2 id="story-worlds-heading" className={`${retailClasses.titleLg} mt-2`}>
          Three ways Yasvik chooses
        </h2>
        <p className={`${retailClasses.body} mt-2 max-w-2xl`}>
          Editorial collections — not product categories. Each world gathers products that share a process story.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {collections.map((collection) => (
            <Link
              key={collection.id}
              to={`/shop?collection=${encodeURIComponent(collection.slug)}`}
              onClick={() => trackStoryWorldClicked(collection.slug)}
              className="group overflow-hidden rounded-2xl border border-soft-border bg-white transition hover:shadow-[0_12px_32px_rgba(31,61,43,0.08)]"
            >
              <div className="aspect-[16/10] overflow-hidden bg-deep-forest/5">
                {collection.cover_image_url ? (
                  <img
                    src={collection.cover_image_url}
                    alt=""
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                ) : null}
              </div>
              <div className="p-5">
                <h3 className="font-cormorant text-xl font-semibold text-deep-forest">{collection.title}</h3>
                {collection.description ? (
                  <p className="mt-2 line-clamp-3 font-inter text-sm leading-6 text-deep-forest/70">
                    {collection.description}
                  </p>
                ) : null}
                <p className="mt-4 inline-flex items-center gap-1 font-inter text-xs font-bold text-neon-paddy">
                  Explore
                  <ArrowRight className="h-3.5 w-3.5" />
                  {collection.productCount ? (
                    <span className="ml-2 font-normal text-deep-forest/45">{collection.productCount} products</span>
                  ) : null}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
