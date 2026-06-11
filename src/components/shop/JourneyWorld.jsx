import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { journeys as journeysApi } from '@/services/api';
import { ArrowRight } from 'lucide-react';

export default function JourneyWorld() {
  const { data: journeys = [], isLoading } = useQuery({
    queryKey: ['journeys-world'],
    queryFn: () => journeysApi.listPublished('-sort_order', 20),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="pb-28 pt-3">
      <div className="px-4 mb-4">
        <p className="font-inter text-[10px] tracking-[0.28em] uppercase text-rain-cloud/30">Origin Stories</p>
        <h1 className="font-cormorant text-2xl text-rain-cloud font-light mt-1">Where food begins</h1>
      </div>

      {isLoading ? (
        <div className="space-y-4 px-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-3xl overflow-hidden">
              <div className="aspect-[4/3] bg-temple-stone/25 animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-temple-stone/25 rounded w-2/3 animate-pulse" />
                <div className="h-3 bg-temple-stone/15 rounded w-full animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-5 px-4">
          {journeys.map((journey, i) => (
            <motion.div
              key={journey.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.5 }}
            >
              <Link to={`/journeys/${journey.id}`}>
                <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-temple-stone/10 group">
                  {journey.cover_image ? (
                    <div className="aspect-[16/9] overflow-hidden">
                      <img
                        src={journey.cover_image}
                        alt={journey.title}
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="aspect-[16/9] bg-gradient-to-br from-forest-canopy/15 to-wet-earth/10" />
                  )}
                  <div className="p-4">
                    {journey.location_label && (
                      <p className="font-inter text-[9px] tracking-[0.28em] uppercase text-rain-cloud/30 mb-1">
                        {journey.location_label}
                      </p>
                    )}
                    <h2 className="font-cormorant text-[1.35rem] text-rain-cloud font-light leading-snug">
                      {journey.title}
                    </h2>
                    {journey.tagline && (
                      <p className="font-inter text-xs text-rain-cloud/45 mt-1.5 leading-relaxed line-clamp-2">
                        {journey.tagline}
                      </p>
                    )}
                    <div className="flex items-center gap-1 mt-3 text-wet-earth">
                      <span className="font-inter text-[11px]">Explore</span>
                      <ArrowRight className="w-3 h-3" strokeWidth={1.5} />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}