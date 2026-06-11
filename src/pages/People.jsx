import { useQuery } from '@tanstack/react-query';
import { appClient } from '@/api/appClient';
import { people as peopleApi } from '@/services/api';
import PersonCard from '../components/people/PersonCard';
import PageHeroRenderer from '@/components/PageHeroRenderer';

export default function People() {
  const { data: people = [], isLoading } = useQuery({
    queryKey: ['people-all'],
    queryFn: () => peopleApi.listPublished(20),
  });

  const { data: hero, isLoading: heroLoading } = useQuery({
    queryKey: ['page-hero', 'people'],
    queryFn: async () => {
      const results = await appClient.entities.PageHero.filter({ page_key: 'people' }, '-updated_date', 1);
      return results[0];
    },
  });

  return (
    <div className="min-h-screen bg-rain-mist pb-24">
      {hero && <PageHeroRenderer hero={hero} isLoading={heroLoading} />}
      <div className="text-center mb-8 px-6 pt-8">
        <p className="font-inter text-[10px] tracking-[0.2em] uppercase text-rain-cloud/40 mb-2">The Makers</p>
        <h1 className="font-cormorant text-4xl text-rain-cloud font-light mb-2">People</h1>
        <p className="font-inter text-xs text-rain-cloud/50">Farmers, foragers & custodians of living traditions</p>
      </div>
      <div className="px-5 space-y-6 max-w-lg mx-auto">
        {isLoading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="aspect-[4/3] rounded-2xl bg-temple-stone/30 animate-pulse" />
          ))
        ) : people.length === 0 ? (
          <p className="text-center font-inter text-sm text-rain-cloud/40 py-16">No people yet.</p>
        ) : (
          people.map((person, i) => (
            <PersonCard key={person.id} person={person} index={i} />
          ))
        )}
      </div>
    </div>
  );
}