import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { journeys as journeysApi, stories as storiesApi, people as peopleApi } from '@/services/api';
import YasvikLogo from '@/components/brand/YasvikLogo';
import {
  fetchAllAppSettings,
  resolveSettingsMap,
  SETTINGS_QUERY_KEYS,
} from '@/services/settingsService';

function useSettingsMap() {
  const { data: settings = [] } = useQuery({
    queryKey: SETTINGS_QUERY_KEYS.roots,
    queryFn: fetchAllAppSettings,
    staleTime: 10 * 60 * 1000,
  });
  return useMemo(() => {
    return resolveSettingsMap(settings);
  }, [settings]);
}

export default function OurRoots() {
  const settings = useSettingsMap();

  const { data: journeys = [] } = useQuery({
    queryKey: ['our-roots-journeys'],
    queryFn: () => journeysApi.listPublished(80),
    staleTime: 5 * 60 * 1000,
  });

  const { data: stories = [] } = useQuery({
    queryKey: ['our-roots-stories'],
    queryFn: () => storiesApi.listPublished(80),
    staleTime: 5 * 60 * 1000,
  });

  const { data: people = [] } = useQuery({
    queryKey: ['our-roots-people'],
    queryFn: () => peopleApi.listPublished(80),
    staleTime: 5 * 60 * 1000,
  });

  const philosophyTitle = String(settings.roots_philosophy_title || 'THE STORY OF OUR ROOTS');
  const philosophyBody = String(
    settings.roots_philosophy_body ||
      'Food should not become anonymous. Yasvik exists to reconnect everyday essentials with the people, places and traditions behind them, carrying inherited food wisdom into modern family life with honesty, practicality and care.'
  );

  const roadsTitle = String(settings.roots_roads_title || 'THE ROADS WE TRAVEL');
  const handsTitle = String(settings.roots_hands_title || 'THE HANDS BEHIND THE HARVEST');

  return (
    <div className="min-h-screen bg-rain-mist pb-16">
      <section id="philosophy" className="scroll-mt-28 md:scroll-mt-44 mx-auto w-full max-w-6xl px-6 pt-14 md:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-10%' }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <p className="font-inter text-[10px] uppercase tracking-[0.28em] text-rain-cloud/45">Our Roots</p>
          <h1 className="mt-5 font-cormorant text-4xl md:text-6xl leading-[0.95] text-rain-cloud">{philosophyTitle}</h1>
          <p className="mx-auto mt-8 max-w-3xl font-inter text-sm md:text-base leading-relaxed text-rain-cloud/70">
            {philosophyBody}
          </p>
          <div className="mt-12 md:mt-16 mb-10 md:mb-14 flex justify-center opacity-85">
            <YasvikLogo variant="symbol" imageClassName="h-12 w-auto" />
          </div>
        </motion.div>
      </section>

      <section id="roads" className="scroll-mt-28 md:scroll-mt-44 mx-auto w-full max-w-6xl px-6 py-8 md:py-10">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-10%' }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="font-cormorant text-3xl md:text-5xl text-rain-cloud text-center">{roadsTitle}</h2>
          <div className="mt-9 space-y-5">
            {journeys.map((journey, i) => (
              <Link
                key={journey.id}
                to={`/journeys/${journey.id}`}
                className="group block rounded-2xl border border-temple-stone/35 bg-white/70 p-4 md:p-5 hover:bg-white transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1 h-7 w-7 rounded-full border border-sun-dried-clay/60 text-sun-dried-clay flex items-center justify-center font-inter text-[10px]">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-inter text-[10px] uppercase tracking-[0.2em] text-rain-cloud/45">{journey.location_label || 'Origin Trail'}</p>
                    <h3 className="mt-1 font-cormorant text-2xl text-rain-cloud">{journey.title}</h3>
                    {journey.tagline ? (
                      <p className="mt-1 font-inter text-sm text-rain-cloud/65">{journey.tagline}</p>
                    ) : null}
                  </div>
                </div>
              </Link>
            ))}
            {journeys.length === 0 ? (
              <p className="text-center font-inter text-sm text-rain-cloud/45 py-6">Published journeys will appear here.</p>
            ) : null}
          </div>
        </motion.div>
      </section>

      <section id="hands" className="scroll-mt-28 md:scroll-mt-44 mx-auto w-full max-w-6xl px-6 py-8 md:py-10">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-10%' }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="font-cormorant text-3xl md:text-5xl text-rain-cloud text-center">{handsTitle}</h2>
          <div className="mt-9 grid grid-cols-1 md:grid-cols-2 gap-5">
            {people.slice(0, 8).map((person) => (
              <Link
                key={person.id}
                to={`/people/${person.id}`}
                className="group rounded-2xl border border-temple-stone/35 bg-white/75 p-4 flex gap-4 hover:bg-white transition-colors"
              >
                <div className="h-20 w-20 rounded-2xl overflow-hidden bg-temple-stone/20 flex-shrink-0">
                  {person.portrait_image ? <img src={person.portrait_image} alt={person.name} className="w-full h-full object-cover" /> : null}
                </div>
                <div className="min-w-0">
                  <h3 className="font-cormorant text-2xl text-rain-cloud leading-tight">{person.name}</h3>
                  <p className="font-inter text-xs text-rain-cloud/60 mt-1">{person.role || 'Farmer Partner'}</p>
                  {person.short_bio ? <p className="font-inter text-xs text-rain-cloud/55 mt-2 line-clamp-2">{person.short_bio}</p> : null}
                </div>
              </Link>
            ))}
            {stories.slice(0, 4).map((story) => (
              <Link
                key={story.id}
                to={`/stories/${story.id}`}
                className="group rounded-2xl border border-temple-stone/35 bg-white/75 p-4 hover:bg-white transition-colors"
              >
                <div className="aspect-[16/9] rounded-xl overflow-hidden bg-temple-stone/20">
                  {story.cover_image ? <img src={story.cover_image} alt={story.title} className="w-full h-full object-cover" /> : null}
                </div>
                <h3 className="mt-3 font-cormorant text-2xl text-rain-cloud leading-tight">{story.title}</h3>
                {story.excerpt ? <p className="mt-2 font-inter text-xs text-rain-cloud/60 line-clamp-2">{story.excerpt}</p> : null}
              </Link>
            ))}
          </div>
        </motion.div>
      </section>
    </div>
  );
}
