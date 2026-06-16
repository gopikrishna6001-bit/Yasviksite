import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { people as peopleApi } from '@/services/api';

export default function PeopleWorld() {
  const { data: people = [], isLoading } = useQuery({
    queryKey: ['people-world'],
    queryFn: () => peopleApi.listPublished(20),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="pb-28 pt-3">
      <div className="px-4 mb-5">
        <p className="font-inter text-[10px] tracking-[0.28em] uppercase text-rain-cloud/30">The hands behind it</p>
        <h1 className="font-cormorant text-2xl text-rain-cloud font-light mt-1">People who grow it</h1>
      </div>

      {isLoading ? (
        <div className="space-y-4 px-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-4 items-center">
              <div className="w-20 h-20 rounded-2xl bg-temple-stone/25 animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-temple-stone/25 rounded w-2/3 animate-pulse" />
                <div className="h-3 bg-temple-stone/15 rounded w-full animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-4 space-y-5">
          {people.map((person, i) => (
            <motion.div
              key={person.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.5 }}
            >
              <Link to={`/people/${person.id}`}>
                <div className="flex gap-4 items-start group">
                  <div className="flex-shrink-0 w-[4.5rem] h-[4.5rem] rounded-2xl overflow-hidden border border-temple-stone/15">
                    {person.portrait_image ? (
                      <img
                        src={person.portrait_image}
                        alt={person.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-wet-earth/15 to-forest-canopy/10" />
                    )}
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="font-inter text-[9px] tracking-[0.22em] uppercase text-rain-cloud/30 mb-0.5">
                      {person.role}
                    </p>
                    <h3 className="font-cormorant text-lg text-rain-cloud font-light leading-snug">
                      {person.name}
                    </h3>
                    {person.location_label && (
                      <p className="font-inter text-[10px] text-rain-cloud/35 mt-0.5">{person.location_label}</p>
                    )}
                    {person.quote && (
                      <p className="font-inter text-[11px] text-rain-cloud/45 mt-2 leading-relaxed italic line-clamp-2">
                        "{person.quote}"
                      </p>
                    )}
                  </div>
                </div>
              </Link>
              {i < people.length - 1 && <div className="mt-5 h-px bg-temple-stone/15" />}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}