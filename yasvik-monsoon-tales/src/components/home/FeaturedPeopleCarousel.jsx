import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ZoomIn } from 'lucide-react';
import { people as peopleApi } from '@/services/api';
import ImageLightbox from '@/components/ui/ImageLightbox';

export default function FeaturedPeopleCarousel() {
  const [lightbox, setLightbox] = useState(null);

  const { data: people = [] } = useQuery({
    queryKey: ['featured-people-carousel'],
    queryFn: () => peopleApi.listFeatured(8),
    staleTime: 5 * 60 * 1000,
  });

  if (!people.length) return null;

  return (
    <>
      {lightbox ? (
        <ImageLightbox
          src={lightbox.src}
          alt={lightbox.caption}
          caption={lightbox.caption}
          onClose={() => setLightbox(null)}
        />
      ) : null}

      <section
        className="border-b border-soft-border/40 bg-white px-4 py-8 md:px-8 md:py-10"
        aria-labelledby="people-heading"
      >
        <div className="mx-auto max-w-[1400px]">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <p className="font-inter text-[11px] font-bold uppercase tracking-[0.14em] text-deep-forest/45">
                The growers
              </p>
              <h2 id="people-heading" className="font-cormorant text-xl font-semibold text-deep-forest md:text-2xl">
                Our People
              </h2>
              <p className="mt-1 font-inter text-xs text-deep-forest/55">
                Farmers, makers and communities we learn from.
              </p>
            </div>
            <Link to="/farmers" className="font-inter text-xs font-bold text-neon-paddy hover:text-deep-forest">
              Meet them
            </Link>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-1 hide-scrollbar md:gap-4">
            {people.map((person) => (
              <article
                key={person.id}
                className="w-[11.5rem] flex-shrink-0 overflow-hidden rounded-xl border border-soft-border/70 bg-warm-cream/40 sm:w-[13rem] md:w-[15rem]"
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-deep-forest/10">
                  <Link to={`/people/${person.id}`} className="block h-full w-full active:opacity-90">
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
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      {person.role ? (
                        <p className="mb-0.5 font-inter text-[9px] font-bold uppercase tracking-[0.12em] text-white/65">
                          {person.role}
                        </p>
                      ) : null}
                      <h3 className="font-cormorant text-lg font-semibold leading-tight text-white md:text-xl">
                        {person.name}
                      </h3>
                      {person.location_label ? (
                        <p className="mt-0.5 font-inter text-[10px] text-white/65">{person.location_label}</p>
                      ) : null}
                    </div>
                  </Link>
                  {person.portrait_image ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setLightbox({ src: person.portrait_image, caption: person.name });
                      }}
                      className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-deep-forest shadow-sm"
                      aria-label={`Zoom portrait of ${person.name}`}
                    >
                      <ZoomIn className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
                {person.quote ? (
                  <p className="line-clamp-3 px-3 py-2.5 font-cormorant text-sm italic leading-snug text-deep-forest/70">
                    &ldquo;{person.quote}&rdquo;
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
