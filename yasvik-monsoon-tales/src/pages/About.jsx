import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { appClient } from '@/api/appClient';
import { Link } from 'react-router-dom';
import PageHeroRenderer from '@/components/PageHeroRenderer';

const PRINCIPLES = [
  {
    title: 'Everyday food matters most.',
    body: 'Health is not built through occasional superfoods but through the ingredients used daily in every household.',
  },
  {
    title: 'Tradition carries intelligence.',
    body: 'Many traditional food practices evolved over generations because they worked: sun drying, slow processing, regional crop diversity, seasonal eating, wood pressing and minimal intervention.',
  },
  {
    title: 'Modern life needs practicality.',
    body: 'Yasvik is not about asking people to abandon convenience. It is about making better choices accessible within contemporary lifestyles.',
  },
  {
    title: 'People deserve to know where their food comes from.',
    body: 'Not every product needs a dramatic story, but food should not be completely disconnected from its origins.',
  },
  {
    title: 'Roots are not about going backward.',
    body: 'They provide direction. Understanding where food comes from helps shape a more conscious future.',
  },
];

const RECONNECTIONS = [
  'Reconnecting urban families with everyday ingredients.',
  'Reconnecting consumers with producers.',
  'Reconnecting modern living with inherited wisdom.',
  'Reconnecting food with trust.',
];

export default function About() {
  const { data: hero, isLoading: heroLoading } = useQuery({
    queryKey: ['page-hero', 'about'],
    queryFn: async () => {
      const results = await appClient.entities.PageHero.filter({ page_key: 'about' }, '-updated_date', 1);
      return results[0];
    },
  });
  return (
    <div className="min-h-screen bg-rain-mist pb-24">
      {hero && <PageHeroRenderer hero={hero} isLoading={heroLoading} />}
      <div className="px-6 pt-10 text-center md:pt-14">
        <p className="mb-2 font-inter text-[10px] uppercase tracking-[0.2em] text-rain-cloud/40">Our Story</p>
        <h1 className="mb-2 font-cormorant text-4xl font-light text-rain-cloud md:text-6xl">About Yasvik</h1>
        <p className="font-inter text-xs text-rain-cloud/50">Natural Foods & Everyday Essentials</p>
      </div>

      <div className="mx-auto max-w-3xl px-6 pt-9">
        <motion.article
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-[2rem] border border-temple-stone/30 bg-white/72 p-6 shadow-[0_18px_50px_rgba(43,38,33,.06)] md:p-10"
        >
          <div className="space-y-6 font-inter text-[15px] leading-8 text-rain-cloud/68">
            <p>
              <strong className="font-semibold text-rain-cloud">Yasvik</strong> is built on a simple belief:
            </p>

            <p className="font-cormorant text-3xl font-semibold leading-tight text-rain-cloud md:text-4xl">
              Food should not become anonymous.
            </p>

            <p>
              Over time, everyday food has transformed into commodities on shelves, detached from the people who grow it, the places it comes from, and the traditions that shaped it. Yasvik exists to restore that connection, not by romanticizing the past, but by thoughtfully carrying its wisdom into modern life.
            </p>

            <p>
              Yasvik is not trying to become an organic luxury brand or just another supermarket. It is an attempt to create a more human way of consuming everyday essentials, where staples, oils, spices, grains, pulses, ghee and regional foods are chosen with care and responsibility.
            </p>
          </div>

          <div className="my-9 h-px w-12 bg-temple-stone/70" />

          <section>
            <h2 className="font-cormorant text-3xl font-semibold text-rain-cloud">The philosophy of Yasvik</h2>
            <div className="mt-5 space-y-4">
              {PRINCIPLES.map((principle) => (
                <div key={principle.title} className="rounded-2xl border border-temple-stone/25 bg-rain-mist/70 p-4">
                  <h3 className="font-inter text-sm font-bold text-rain-cloud">{principle.title}</h3>
                  <p className="mt-2 font-inter text-sm leading-7 text-rain-cloud/62">{principle.body}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="my-9 h-px w-12 bg-temple-stone/70" />

          <section className="space-y-6 font-inter text-[15px] leading-8 text-rain-cloud/68">
            <p>
              At its heart, Yasvik is about <strong className="font-semibold text-rain-cloud">quiet reconnection</strong>:
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              {RECONNECTIONS.map((line) => (
                <p key={line} className="rounded-2xl bg-white/70 p-4 text-sm leading-6 text-rain-cloud/68 shadow-sm">
                  {line}
                </p>
              ))}
            </div>

            <p>
              The vision is not to build a chain of stores that simply sell products. It is to build a contemporary Indian brand that reminds people that behind every grain, spice and meal lies a long chain of soil, seasons, hands and heritage.
            </p>

            <p className="font-cormorant text-2xl font-semibold leading-snug text-rain-cloud md:text-3xl">
              Yasvik believes that when we understand our roots, we make better choices, not out of nostalgia, but out of awareness.
            </p>

            <p>
              Because food is never just food.
            </p>

            <div className="grid gap-2 font-cormorant text-2xl font-semibold text-rain-cloud sm:grid-cols-2">
              <span>It is memory.</span>
              <span>It is culture.</span>
              <span>It is livelihood.</span>
              <span>It is care.</span>
            </div>

            <p>
              And everything begins at the roots.
            </p>
          </section>

          <div className="pt-10 text-center">
            <Link
              to="/our-roots"
              className="inline-flex items-center justify-center rounded-full bg-forest-canopy px-6 py-3 font-inter text-sm font-semibold text-white transition-colors hover:bg-forest-canopy/90"
            >
              Explore Our Roots
            </Link>
          </div>
        </motion.article>
      </div>
    </div>
  );
}
