import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { appClient } from '@/api/appClient';
import { people as peopleApi } from '@/services/api';

function JourneyCard({ journey }) {
  return (
    <Link
      to={`/journeys/${journey.id}`}
      className="w-[11.5rem] flex-shrink-0 active:opacity-90 sm:w-[13rem] md:w-[15rem]"
    >
      <article className="overflow-hidden rounded-xl border border-soft-border/70 bg-white">
        <div className="relative aspect-[4/5] overflow-hidden bg-temple-stone/15">
          {journey.cover_image ? (
            <img
              src={journey.cover_image}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full bg-temple-stone/20" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-deep-forest/75 via-deep-forest/10 to-transparent" />
          {journey.location_label ? (
            <span className="absolute left-2.5 top-2.5 rounded-md bg-white/15 px-2 py-0.5 font-inter text-[9px] font-bold uppercase tracking-[0.12em] text-white/90 backdrop-blur-sm">
              {journey.location_label}
            </span>
          ) : null}
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <h3 className="font-cormorant text-lg font-semibold leading-tight text-white md:text-xl">
              {journey.title}
            </h3>
            {journey.tagline ? (
              <p className="mt-1 line-clamp-2 font-inter text-[10px] text-white/70">
                {journey.tagline}
              </p>
            ) : null}
          </div>
        </div>
        {journey.description ? (
          <p className="line-clamp-2 px-3 py-2.5 font-inter text-[11px] leading-relaxed text-deep-forest/55">
            {journey.description}
          </p>
        ) : null}
      </article>
    </Link>
  );
}

function PersonCard({ person }) {
  return (
    <Link
      to={`/people/${person.id}`}
      className="w-[11.5rem] flex-shrink-0 active:opacity-90 sm:w-[13rem] md:w-[15rem]"
    >
      <article className="overflow-hidden rounded-xl border border-soft-border/70 bg-white">
        <div className="relative aspect-[4/5] overflow-hidden bg-deep-forest/10">
          {person.portrait_image ? (
            <img
              src={person.portrait_image}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full bg-deep-forest/15" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-deep-forest/75 via-deep-forest/10 to-transparent" />
          {person.role ? (
            <span className="absolute left-2.5 top-2.5 rounded-md bg-white/15 px-2 py-0.5 font-inter text-[9px] font-bold uppercase tracking-[0.12em] text-white/90 backdrop-blur-sm">
              {person.role}
            </span>
          ) : null}
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <h3 className="font-cormorant text-lg font-semibold leading-tight text-white md:text-xl">
              {person.name}
            </h3>
            {person.location_label ? (
              <p className="mt-0.5 font-inter text-[10px] text-white/65">{person.location_label}</p>
            ) : null}
          </div>
        </div>
        {person.quote ? (
          <p className="line-clamp-2 px-3 py-2.5 font-cormorant text-sm italic leading-snug text-deep-forest/70">
            &ldquo;{person.quote}&rdquo;
          </p>
        ) : null}
      </article>
    </Link>
  );
}

export default function FeaturedJourneysCarousel() {
  const { data: journeys = [] } = useQuery({
    queryKey: ['featured-journeys-carousel'],
    queryFn: async () => {
      const featured = await appClient.entities.Journey.filter(
        { is_featured: true, is_published: true },
        '-created_date',
        8
      );
      if (featured.length) return featured;
      return appClient.entities.Journey.filter(
        { is_published: true },
        '-created_date',
        8
      );
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: people = [] } = useQuery({
    queryKey: ['featured-people-carousel'],
    queryFn: () => peopleApi.listFeatured(6),
    staleTime: 5 * 60 * 1000,
  });

  if (!journeys.length && !people.length) return null;

  return (
    <section
      className="border-b border-soft-border/40 bg-warm-cream px-4 py-8 md:px-8 md:py-10"
      aria-labelledby="journeys-heading"
    >
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <p className="font-inter text-[11px] font-bold uppercase tracking-[0.14em] text-deep-forest/45">
              Our roots
            </p>
            <h2 id="journeys-heading" className="font-cormorant text-2xl font-semibold text-deep-forest md:text-3xl">
              Yasvik Journeys
            </h2>
            <p className="mt-1 font-inter text-xs text-deep-forest/55">
              Field notes, plus the farmers, makers and communities we learn from.
            </p>
          </div>
          <Link to="/our-roots" className="inline-flex items-center gap-1 font-inter text-xs font-bold text-neon-paddy hover:text-deep-forest">
            View all
          </Link>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-1 hide-scrollbar md:gap-4">
          {journeys.map((journey) => (
            <JourneyCard key={`journey-${journey.id}`} journey={journey} />
          ))}
          {people.map((person) => (
            <PersonCard key={`person-${person.id}`} person={person} />
          ))}
        </div>
      </div>
    </section>
  );
}
