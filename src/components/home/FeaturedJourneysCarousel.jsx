import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import useEmblaCarousel from 'embla-carousel-react';
import { appClient } from '@/api/appClient';

export default function FeaturedJourneysCarousel() {
  const [emblaRef] = useEmblaCarousel({
    loop: true,
    align: 'center',
    dragFree: false,
    duration: 35,
    skipSnaps: false,
    inViewThreshold: 0.7,
  });

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

  if (!journeys.length) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
      className="py-16 overflow-hidden"
    >
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
        className="font-inter text-[9px] tracking-[0.35em] uppercase text-rain-cloud/30 text-center mb-10"
      >
        Explore Journeys
      </motion.p>

      <div className="overflow-hidden cursor-grab active:cursor-grabbing" ref={emblaRef}>
        <div className="flex pl-4 pr-4">
          {journeys.map((journey, i) => (
            <div key={journey.id} className="flex-shrink-0 w-[78vw] max-w-[340px] mx-2">
              <Link to={`/journeys/${journey.id}`} className="block active:opacity-90">
                <motion.div
                  initial={{ opacity: 0, scale: 1.04 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1], delay: i * 0.06 }}
                  className="relative aspect-[4/5] rounded-3xl overflow-hidden bg-temple-stone/15"
                >
                  {journey.cover_image ? (
                    <img
                      src={journey.cover_image}
                      alt={journey.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-temple-stone/20" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-rain-cloud/75 via-rain-cloud/10 to-transparent" />
                  {journey.location_label && (
                    <div className="absolute top-4 left-4">
                      <span className="font-inter text-[8px] tracking-[0.3em] uppercase text-white/60 bg-white/10 backdrop-blur-sm px-2.5 py-1 rounded-full">
                        {journey.location_label}
                      </span>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="font-cormorant text-2xl text-white font-light leading-tight">
                      {journey.title}
                    </h3>
                    {journey.tagline && (
                      <p className="font-inter text-[10px] text-white/50 mt-1.5">
                        {journey.tagline}
                      </p>
                    )}
                  </div>
                </motion.div>

                {journey.description && (
                  <motion.p
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 + i * 0.06 }}
                    className="mt-4 pl-1 font-inter text-[11px] text-rain-cloud/45 leading-relaxed line-clamp-2"
                  >
                    {journey.description}
                  </motion.p>
                )}
              </Link>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center items-center gap-2 mt-8">
        <div className="flex gap-1.5">
          {journeys.slice(0, 5).map((_, i) => (
            <div
              key={i}
              className={`rounded-full bg-rain-cloud/20 transition-all ${i === 0 ? 'w-4 h-1' : 'w-1 h-1'}`}
            />
          ))}
        </div>
        <motion.span
          animate={{ x: [0, 4, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          className="text-rain-cloud/30 text-xs ml-2"
        >
          ←→
        </motion.span>
      </div>
    </motion.section>
  );
}