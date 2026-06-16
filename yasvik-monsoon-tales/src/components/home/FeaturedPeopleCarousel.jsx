import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { people as peopleApi } from '@/services/api';
import ImageLightbox from '@/components/ui/ImageLightbox';
import { ZoomIn } from 'lucide-react';

export default function FeaturedPeopleCarousel() {
  const [lightbox, setLightbox] = useState(null); // { src, caption }

  const [emblaRef] = useEmblaCarousel({
    loop: true,
    align: 'center',
    dragFree: false,
    duration: 35,
    skipSnaps: false,
    inViewThreshold: 0.7,
  });

  const { data: people = [] } = useQuery({
    queryKey: ['featured-people-carousel'],
    queryFn: () => peopleApi.listFeatured(8),
    staleTime: 5 * 60 * 1000,
  });

  if (!people.length) return null;

  return (
    <>
    {lightbox && (
      <ImageLightbox
        src={lightbox.src}
        alt={lightbox.caption}
        caption={lightbox.caption}
        onClose={() => setLightbox(null)}
      />
    )}
    <motion.section
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
      className="py-16 overflow-hidden bg-temple-stone/10"
    >
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
        className="font-inter text-[9px] tracking-[0.35em] uppercase text-rain-cloud/30 text-center mb-10"
      >
        Meet Our Farmers
      </motion.p>

      <div className="overflow-hidden cursor-grab active:cursor-grabbing" ref={emblaRef}>
        <div className="flex pl-4 pr-4">
          {people.map((person, i) => (
            <div key={person.id} className="flex-shrink-0 w-[78vw] max-w-[340px] mx-2">
              <Link to={`/people/${person.id}`} className="block active:opacity-90">
                <motion.div
                  initial={{ opacity: 0, scale: 1.04 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1], delay: i * 0.06 }}
                  className="relative aspect-[3/4] rounded-3xl overflow-hidden bg-rain-cloud/15"
                >
                  {person.portrait_image ? (
                    <img
                      src={person.portrait_image}
                      alt={person.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-rain-cloud/20" />
                  )}
                  {/* Zoom button */}
                  {person.portrait_image && (
                    <button
                      onClick={(e) => { e.preventDefault(); setLightbox({ src: person.portrait_image, caption: person.name }); }}
                      className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-sm active:scale-90 transition-transform"
                    >
                      <ZoomIn className="w-4 h-4 text-white" />
                    </button>
                  )}
                  {/* Gradient overlay for text on image */}
                  <div className="absolute inset-0 bg-gradient-to-t from-rain-cloud/70 via-rain-cloud/10 to-transparent" />
                  {/* Name + role pinned to bottom of image */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    {person.role && (
                      <p className="font-inter text-[9px] tracking-[0.28em] uppercase text-white/55 mb-1">
                        {person.role}
                      </p>
                    )}
                    <h3 className="font-cormorant text-2xl text-white font-light leading-tight">
                      {person.name}
                    </h3>
                    {person.location_label && (
                      <p className="font-inter text-[10px] text-white/50 mt-1">{person.location_label}</p>
                    )}
                  </div>
                </motion.div>

                {/* Quote below image */}
                {person.quote && (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 + i * 0.06 }}
                    className="mt-4 pl-1"
                  >
                    <p className="font-cormorant text-xl text-wet-earth leading-snug line-clamp-3 italic">
                      "{person.quote}"
                    </p>
                  </motion.div>
                )}
              </Link>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center items-center gap-2 mt-8">
        <div className="flex gap-1.5">
          {people.slice(0, 5).map((_, i) => (
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
    </>
  );
}