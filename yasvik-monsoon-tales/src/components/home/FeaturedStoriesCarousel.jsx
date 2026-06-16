import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import useEmblaCarousel from 'embla-carousel-react';
import { stories as storiesApi } from '@/services/api';

export default function FeaturedStoriesCarousel() {
  const [emblaRef] = useEmblaCarousel({
    loop: true,
    align: 'center',
    dragFree: false,
    duration: 35,
    skipSnaps: false,
    inViewThreshold: 0.7,
  });

  const { data: stories = [] } = useQuery({
    queryKey: ['featured-stories-carousel'],
    queryFn: async () => {
      const featured = await storiesApi.listFeatured(8);
      if (featured.length) return featured;
      return storiesApi.listPublished(8);
    },
    staleTime: 5 * 60 * 1000,
  });

  if (!stories.length) return null;

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
        Read Their Stories
      </motion.p>

      <div className="overflow-hidden cursor-grab active:cursor-grabbing" ref={emblaRef}>
        <div className="flex pl-4 pr-4">
          {stories.map((story, i) => (
            <div key={story.id} className="flex-shrink-0 w-[78vw] max-w-[340px] mx-2">
              <Link to={`/stories/${story.id}`} className="block active:opacity-90">
                <motion.div
                  initial={{ opacity: 0, scale: 1.04 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1], delay: i * 0.06 }}
                  className="relative aspect-[4/5] rounded-3xl overflow-hidden bg-temple-stone/15"
                >
                  {story.cover_image ? (
                    <img
                      src={story.cover_image}
                      alt={story.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-temple-stone/20" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-rain-cloud/75 via-rain-cloud/10 to-transparent" />
                  {story.story_type && (
                    <div className="absolute top-4 left-4">
                      <span className="font-inter text-[8px] tracking-[0.3em] uppercase text-white/60 bg-white/10 backdrop-blur-sm px-2.5 py-1 rounded-full">
                        {story.story_type}
                      </span>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="font-cormorant text-2xl text-white font-light leading-tight">
                      {story.title}
                    </h3>
                    {story.read_time_minutes && (
                      <p className="font-inter text-[10px] text-white/50 mt-1.5">
                        {story.read_time_minutes} min read
                      </p>
                    )}
                  </div>
                </motion.div>

                {story.excerpt && (
                  <motion.p
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 + i * 0.06 }}
                    className="mt-4 pl-1 font-inter text-[11px] text-rain-cloud/45 leading-relaxed line-clamp-2"
                  >
                    {story.excerpt}
                  </motion.p>
                )}
              </Link>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center items-center gap-2 mt-8">
        <div className="flex gap-1.5">
          {stories.slice(0, 5).map((_, i) => (
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