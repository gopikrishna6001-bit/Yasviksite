import { useRef } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { journeys as journeysApi } from '@/services/api';
import { ArrowRight } from 'lucide-react';
import { useSmartSort } from '@/hooks/useSmartSort';

function JourneyTile({ journey, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="flex-shrink-0 w-[72vw] max-w-[290px] snap-start"
    >
      <Link to={`/journeys/${journey.id}`} className="block group">
        <div className="relative aspect-[3/4] rounded-2xl overflow-hidden">
          <img
            src={journey.cover_image || 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&q=75'}
            alt={journey.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-rain-cloud/80 via-rain-cloud/15 to-transparent" />

          {journey.location_label && (
            <div className="absolute top-4 left-4">
              <span className="font-inter text-[9px] tracking-[0.22em] uppercase text-white/60">
                {journey.location_label}
              </span>
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 p-5">
            <h3 className="font-cormorant text-xl text-white font-light leading-snug">
              {journey.title}
            </h3>
            {journey.tagline && (
              <p className="font-inter text-xs text-white/55 mt-1.5 leading-relaxed line-clamp-2">
                {journey.tagline}
              </p>
            )}
            <div className="flex items-center gap-1 mt-3">
              <span className="font-inter text-[10px] text-warm-turmeric">Explore</span>
              <ArrowRight className="w-3 h-3 text-warm-turmeric" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function JourneyHighlightsSection() {
  const scrollRef = useRef(null);

  const { data: raw = [], isLoading } = useQuery({
    queryKey: ['journeys-featured'],
    queryFn: () => journeysApi.listFeatured(6),
  });

  const journeys = useSmartSort(raw, { dateField: 'created_date' });

  return (
    <section className="py-8 bg-rain-mist border-t border-border/10">
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="flex items-center justify-between px-5 mb-10"
      >
        <span className="font-inter text-[10px] tracking-[0.32em] text-rain-cloud/45 uppercase">
          Journey Highlights
        </span>
        <Link to="/journeys" className="flex items-center gap-1 font-inter text-[10px] text-forest-canopy hover:text-forest-canopy/70 transition-colors">
          All journeys <ArrowRight className="w-3 h-3" />
        </Link>
      </motion.div>

      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto px-5 hide-scrollbar">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex-shrink-0 w-[72vw] max-w-[290px] aspect-[3/4] rounded-2xl bg-temple-stone/30 animate-pulse" />
          ))}
        </div>
      ) : journeys.length === 0 ? (
        <p className="text-center font-inter text-sm text-rain-cloud/30 py-8">No journeys yet.</p>
      ) : (
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto px-5 pb-4 hide-scrollbar snap-x snap-mandatory"
        >
          {journeys.map((journey, i) => (
            <JourneyTile key={journey.id} journey={journey} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}