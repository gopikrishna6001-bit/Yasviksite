import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { stories as storiesApi } from '@/services/api';
import SectionHeader from '@/components/brand/SectionHeader';
import OptimizedImage from '@/components/ui/OptimizedImage';
import { safeMedia } from '@/lib/mediaUrl';

function pickLearnStories(stories = []) {
  const flagged = stories.filter(
    (story) => story.show_on_home || story.content_category === 'learn' || story.is_featured,
  );
  return (flagged.length ? flagged : stories).slice(0, 3);
}

export default function HomeLearnSection() {
  const { data: stories = [], isLoading } = useQuery({
    queryKey: ['home-learn-stories'],
    queryFn: () => storiesApi.filter({ is_published: true }, '-created_date', 16),
    staleTime: 5 * 60 * 1000,
  });

  const items = pickLearnStories(stories);

  if (isLoading || items.length === 0) return null;

  return (
    <section className="border-b border-soft-border/40 bg-warm-cream px-4 py-12 md:px-8 md:py-16">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-7 flex items-end justify-between gap-4">
          <SectionHeader
            eyebrow="Learn with Yasvik"
            title="Ingredients, sourcing & everyday wisdom"
            description="Short reads on millets, cold-pressed oils, and eating well — from our Stories library."
          />
          <Link
            to="/stories"
            className="hidden flex-shrink-0 items-center gap-1 font-inter text-sm font-bold text-sun-dried-clay hover:text-deep-forest md:inline-flex"
          >
            All articles <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {items.map((story) => {
            const href = story.slug ? `/stories/${story.slug}` : `/stories/${story.id}`;
            const image = safeMedia(story.featured_image_url, 'card');
            const excerpt = story.excerpt || String(story.content || '').replace(/<[^>]+>/g, '').slice(0, 120);

            return (
              <Link
                key={story.id}
                to={href}
                className="group overflow-hidden rounded-2xl border border-soft-border/60 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                {image ? (
                  <OptimizedImage src={image} alt="" preset="card" className="aspect-[16/10] w-full object-cover" />
                ) : (
                  <div className="aspect-[16/10] bg-deep-forest/5" />
                )}
                <div className="p-4">
                  <p className="font-inter text-[11px] font-bold uppercase tracking-[0.12em] text-deep-forest/45">
                    {story.content_category === 'learn' ? 'Learn' : 'Story'}
                  </p>
                  <h3 className="mt-1 font-cormorant text-lg font-semibold leading-snug text-deep-forest group-hover:text-sun-dried-clay">
                    {story.title}
                  </h3>
                  {excerpt ? (
                    <p className="mt-2 line-clamp-3 font-inter text-sm leading-6 text-deep-forest/65">{excerpt}…</p>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-6 text-center md:hidden">
          <Link to="/stories" className="inline-flex items-center gap-1 font-inter text-sm font-bold text-sun-dried-clay">
            Read all articles <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
