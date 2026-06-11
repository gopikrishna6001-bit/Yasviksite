import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { journeys as journeysApi, stories as storiesApi, people as peopleApi, products as productsApi } from '@/services/api';

function Stat({ value, label, to }) {
  return (
    <Link
      to={to}
      className="rounded-2xl border border-forest-canopy/15 bg-white/70 px-4 py-3 block transition-colors hover:bg-white focus:outline-none focus:ring-2 focus:ring-forest-canopy/30 focus:ring-offset-2 focus:ring-offset-[#eff2ea]"
    >
      <p className="font-cormorant text-3xl leading-none text-forest-canopy">{value}</p>
      <p className="mt-1 font-inter text-[11px] tracking-[0.16em] uppercase text-rain-cloud/60">{label}</p>
    </Link>
  );
}

export default function JourneyTrustSection() {
  const { data: journeys = [] } = useQuery({
    queryKey: ['home-trust-journeys'],
    queryFn: () => journeysApi.listPublished(50),
    staleTime: 5 * 60 * 1000,
  });

  const { data: stories = [] } = useQuery({
    queryKey: ['home-trust-stories'],
    queryFn: () => storiesApi.listPublished(100),
    staleTime: 5 * 60 * 1000,
  });

  const { data: people = [] } = useQuery({
    queryKey: ['home-trust-people'],
    queryFn: () => peopleApi.listPublished(100),
    staleTime: 5 * 60 * 1000,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['home-trust-products'],
    queryFn: () => productsApi.listPublished('-created_date', 300),
    staleTime: 5 * 60 * 1000,
  });

  const traceableProductsCount = products.filter((p) => !!p.person_id).length;

  return (
    <section className="bg-[#eff2ea] border-t border-b border-forest-canopy/10">
      <div className="mx-auto w-full max-w-[1320px] px-4 md:px-8 py-10 md:py-12">
        <p className="font-inter text-[10px] md:text-[11px] tracking-[0.24em] uppercase text-forest-canopy/60">
          Trust Through Journeys
        </p>
        <h2 className="mt-3 font-cormorant text-[34px] md:text-[48px] leading-[0.95] text-forest-canopy">
          Know who grows it.
          <br />
          Buy what they make.
        </h2>
        <p className="mt-4 max-w-2xl font-inter text-[15px] md:text-[17px] leading-relaxed text-rain-cloud/70">
          Every product is linked to real people and real origin stories. Explore our roots first, then shop with full context.
        </p>

        <div className="mt-7 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat value={journeys.length} label="Published Journeys" to="/our-roots#roads" />
          <Stat value={stories.length} label="Stories" to="/our-roots#hands" />
          <Stat value={people.length} label="People Profiles" to="/our-roots#hands" />
          <Stat value={traceableProductsCount} label="Traceable Products" to="/shop" />
        </div>

      </div>
    </section>
  );
}
