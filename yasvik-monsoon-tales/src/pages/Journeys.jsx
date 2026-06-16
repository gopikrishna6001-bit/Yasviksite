import { useQuery } from '@tanstack/react-query';
import { journeys as journeysApi } from '@/services/api';
import { appClient } from '@/api/appClient';
import JourneyCard from '../components/journeys/JourneyCard';
import PageHeroRenderer from '@/components/PageHeroRenderer';

export default function Journeys() {
  const { data: journeys = [], isLoading } = useQuery({
    queryKey: ['journeys-all'],
    queryFn: () => journeysApi.listPublished(20),
  });

  const { data: hero, isLoading: heroLoading } = useQuery({
    queryKey: ['page-hero', 'journeys'],
    queryFn: async () => {
      const results = await appClient.entities.PageHero.filter({ page_key: 'journeys' }, '-updated_date', 1);
      return results[0];
    },
  });

  return (
    <div className="min-h-screen bg-rain-mist pb-24">
      {hero && <PageHeroRenderer hero={hero} isLoading={heroLoading} />}
      <div className="text-center mb-8 px-6 pt-8">
        <p className="font-inter text-[10px] tracking-[0.2em] uppercase text-rain-cloud/40 mb-2">Explore</p>
        <h1 className="font-cormorant text-4xl text-rain-cloud font-light mb-2">Journeys</h1>
        <p className="font-inter text-xs text-rain-cloud/50">Stories from the farm to your table</p>
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
        ) : journeys.length === 0 ? (
          <p className="text-center font-inter text-sm text-rain-cloud/40 py-16">No journeys yet.</p>
        ) : (
          journeys.map((journey, i) => (
            <JourneyCard key={journey.id} journey={journey} index={i} />
          ))
        )}
      </div>
    </div>
  );
}