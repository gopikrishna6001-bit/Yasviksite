import { useQuery } from '@tanstack/react-query';
import { stories as storiesApi } from '@/services/api';
import { appClient } from '@/api/appClient';
import StoryCard from '../components/stories/StoryCard';
import PageHeroRenderer from '@/components/PageHeroRenderer';

export default function Stories() {
  const { data: stories = [], isLoading } = useQuery({
    queryKey: ['stories-all'],
    queryFn: () => storiesApi.listPublished(20),
  });

  const { data: hero, isLoading: heroLoading } = useQuery({
    queryKey: ['page-hero', 'stories'],
    queryFn: async () => {
      const results = await appClient.entities.PageHero.filter({ page_key: 'stories' }, '-updated_date', 1);
      return results[0];
    },
  });

  return (
    <div className="min-h-screen bg-rain-mist pb-24">
      {hero && <PageHeroRenderer hero={hero} isLoading={heroLoading} />}
      <div className="text-center mb-8 px-6 pt-8">
        <p className="font-inter text-[10px] tracking-[0.2em] uppercase text-rain-cloud/40 mb-2">Narratives</p>
        <h1 className="font-cormorant text-4xl text-rain-cloud font-light mb-2">Stories</h1>
        <p className="font-inter text-xs text-rain-cloud/50">Cinematic tales of food and tradition</p>
      </div>
      <div className="px-5 space-y-12 max-w-lg mx-auto">
        {isLoading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="space-y-4">
              <div className="aspect-[16/10] rounded-2xl bg-temple-stone/30 animate-pulse" />
              <div className="h-6 bg-temple-stone/30 rounded animate-pulse w-3/4" />
              <div className="h-4 bg-temple-stone/20 rounded animate-pulse" />
            </div>
          ))
        ) : stories.length === 0 ? (
          <p className="text-center font-inter text-sm text-rain-cloud/40 py-16">No stories yet.</p>
        ) : (
          stories.map((story, i) => (
            <StoryCard key={story.id} story={story} index={i} />
          ))
        )}
      </div>
    </div>
  );
}