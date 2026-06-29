import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight } from 'lucide-react';
import { stories as storiesApi } from '@/services/api';
import StoryCard from '../components/stories/StoryCard';
import PublicPageHeader from '@/components/brand/PublicPageHeader';
import PublicPageShell from '@/components/brand/PublicPageShell';
import { CORE_VALUE_NARRATIVE_FRAMES } from '@/brand/monsoonTokens';
import { useCoreValueStories } from '@/lib/coreValueProofs';

const FRAME_STYLES = {
  what: 'bg-neon-paddy/12 text-neon-paddy',
  where: 'bg-sun-dried-clay/15 text-sun-dried-clay',
  why: 'bg-deep-forest/8 text-deep-forest',
};

function PillarStoryCard({ value, story, link }) {
  const frameLabel = CORE_VALUE_NARRATIVE_FRAMES[value.narrativeFrame] || '';
  const frameClass = FRAME_STYLES[value.narrativeFrame] || FRAME_STYLES.what;

  return (
    <Link
      to={link.href}
      className="group block overflow-hidden rounded-2xl border border-soft-border bg-white shadow-[0_10px_34px_rgba(31,61,43,0.06)] transition-all hover:border-neon-paddy/30"
    >
      {story?.cover_image ? (
        <img src={story.cover_image} alt="" className="aspect-[16/10] w-full object-cover" />
      ) : (
        <div className="aspect-[16/10] bg-warm-oat" />
      )}
      <div className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          {frameLabel ? (
            <span className={`rounded-full px-2.5 py-0.5 font-inter text-[10px] font-bold uppercase tracking-[0.14em] ${frameClass}`}>
              {frameLabel}
            </span>
          ) : null}
          <span className="font-inter text-[11px] font-semibold text-deep-forest/45">{value.title}</span>
        </div>
        <h2 className="mt-2 font-cormorant text-2xl font-semibold leading-snug text-deep-forest">{story?.title}</h2>
        <p className="mt-2 font-inter text-sm leading-7 text-deep-forest/65 line-clamp-3">{story?.excerpt}</p>
        <span className="mt-4 inline-flex items-center gap-1.5 font-inter text-xs font-bold text-neon-paddy">
          <ArrowUpRight className="h-3.5 w-3.5" />
          {link.label}
        </span>
      </div>
    </Link>
  );
}

export default function Stories() {
  const { pillarStories, otherStories } = useCoreValueStories();

  const { data: stories = [], isLoading } = useQuery({
    queryKey: ['stories-all'],
    queryFn: () => storiesApi.listPublished(20),
  });

  const moreStories = otherStories.length > 0 ? otherStories : stories.filter((story) => {
    const slug = String(story.slug || '').toLowerCase();
    return !['conscious-food', 'responsible-sourcing', 'honest-quality'].includes(slug);
  });

  return (
    <PublicPageShell illustration="stories">
      <PublicPageHeader
        eyebrow="Narratives"
        title="Stories"
        description="What is the problem, where the solution lives, and why Yasvik exists — three reads that frame how we choose food."
      />

      <div className="mx-auto max-w-5xl px-5 pb-8">
        <section className="mb-12" aria-label="Core value stories">
          <div className="mb-6 text-center md:text-left">
            <p className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-sun-dried-clay">What · Where · Why</p>
            <h2 className="mt-2 font-cormorant text-3xl font-semibold text-deep-forest md:text-4xl">The story behind our values</h2>
            <p className="mt-2 max-w-2xl font-inter text-sm leading-7 text-deep-forest/65">
              Conscious Food names the problem. Responsible Sourcing points to where good food still lives. Honest Quality is why Yasvik exists to connect the two.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {pillarStories.map(({ value, story, link }) => (
              <PillarStoryCard key={value.id} value={value} story={story} link={link} />
            ))}
          </div>
        </section>

        <section aria-label="More stories">
          <h2 className="mb-6 font-cormorant text-2xl font-semibold text-deep-forest">More from the road</h2>
          <div className="mx-auto max-w-2xl space-y-10">
            {isLoading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="space-y-4">
                  <div className="aspect-[16/10] animate-pulse rounded-2xl bg-white/80" />
                  <div className="h-6 w-3/4 animate-pulse rounded bg-white/60" />
                </div>
              ))
            ) : moreStories.length === 0 ? (
              <div className="rounded-2xl border border-soft-border bg-white px-6 py-14 text-center">
                <p className="font-cormorant text-2xl text-deep-forest">More stories coming soon</p>
                <p className="mt-3 font-inter text-sm leading-7 text-deep-forest/65">
                  Field notes and harvest stories will appear here as we publish them.
                </p>
              </div>
            ) : (
              moreStories.map((story, i) => <StoryCard key={story.id} story={story} index={i} />)
            )}
          </div>
        </section>
      </div>
    </PublicPageShell>
  );
}
