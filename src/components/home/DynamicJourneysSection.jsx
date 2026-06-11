import { useRef } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { appClient } from '@/api/appClient';
import JourneyCard from '../journeys/JourneyCard';

export default function DynamicJourneysSection() {
  const scrollRef = useRef(null);

  const { data: journeys = [] } = useQuery({
    queryKey: ['journeys-featured'],
    queryFn: () => appClient.entities.Journey.filter({ is_published: true, is_featured: true }, 'sort_order', 6),
  });

  return (
    <section className="py-16 bg-rain-mist">
      <motion.h2
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="text-center font-inter text-[10px] tracking-[0.32em] text-rain-cloud/45 uppercase mb-10"
      >
        Journeys
      </motion.h2>

      {journeys.length === 0 ? (
        <div className="flex gap-4 overflow-x-auto px-5 hide-scrollbar">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex-shrink-0 w-[78vw] max-w-[320px] aspect-[3/4] rounded-2xl bg-temple-stone/30 animate-pulse" />
          ))}
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto px-5 pb-4 hide-scrollbar snap-x snap-mandatory"
        >
          {journeys.map((journey, i) => (
            <JourneyCard key={journey.id} journey={journey} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}