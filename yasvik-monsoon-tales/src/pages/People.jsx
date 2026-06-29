import { useQuery } from '@tanstack/react-query';
import { people as peopleApi } from '@/services/api';
import PersonCard from '../components/people/PersonCard';
import PublicPageHeader from '@/components/brand/PublicPageHeader';
import PublicPageShell from '@/components/brand/PublicPageShell';

export default function People() {
  const { data: people = [], isLoading } = useQuery({
    queryKey: ['people-all'],
    queryFn: () => peopleApi.listPublished(20),
  });

  return (
    <PublicPageShell illustration="people">
      <PublicPageHeader
        eyebrow="The hands behind the harvest"
        title="Our Farmers"
        description="Families and partners who grow, mill, and prepare the staples we bring to your kitchen — named with care, not anonymous supply chains."
      />

      <div className="mx-auto max-w-2xl space-y-6 px-5 pb-8">
        {isLoading ? (
          [1, 2, 3].map((i) => <div key={i} className="aspect-[4/3] animate-pulse rounded-2xl bg-white/80" />)
        ) : people.length === 0 ? (
          <div className="rounded-2xl border border-soft-border bg-white px-6 py-14 text-center">
            <p className="font-cormorant text-2xl text-deep-forest">Farmer stories coming soon</p>
            <p className="mt-3 font-inter text-sm leading-7 text-deep-forest/65">
              We are documenting the people behind our millets, rice, oils and staples. Meanwhile, explore what is in store today.
            </p>
          </div>
        ) : (
          people.map((person, i) => <PersonCard key={person.id} person={person} index={i} />)
        )}
      </div>
    </PublicPageShell>
  );
}
