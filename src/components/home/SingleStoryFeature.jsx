import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { stories as storiesApi } from '@/services/api';
import { ArrowRight } from 'lucide-react';

// One story — given full editorial space. Not a list. Not a carousel.
export default function SingleStoryFeature() {
  const { data: stories = [] } = useQuery({
    queryKey: ['stories-latest'],
    queryFn: () => storiesApi.filter({ is_published: true }, '-published_date', 4),
    staleTime: 5 * 60 * 1000,
  });

  const story = stories.find(s => s.is_featured) || stories[0];
  if (!story) return null;

  const coverImage = story.cover_image
    || 'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=800&q=75';

  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 1.4, ease: 'easeOut' }}
      className="py-20"
    >
      {/* Full-width image — cinematic reveal with slight scale */}
      <motion.div
        initial={{ opacity: 0, scale: 1.04, y: 20 }}
        whileInView={{ opacity: 1, scale: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative aspect-[4/3] overflow-hidden"
      >
        <img
          src={coverImage}
          alt={story.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-rain-cloud/70" />
      </motion.div>

      {/* Text block — staggered reveal */}
      <div className="px-7 mt-8">
        {story.story_type && (
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            className="font-inter text-[9px] tracking-[0.35em] uppercase text-warm-turmeric mb-3"
          >
            {story.story_type.replace('_', ' ')}
          </motion.p>
        )}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          className="font-cormorant text-[2rem] text-rain-cloud font-light leading-tight max-w-[280px]"
        >
          {story.title}
        </motion.h2>
        {story.excerpt && (
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.32 }}
            className="font-inter text-xs text-rain-cloud/45 mt-4 leading-relaxed max-w-[300px]"
          >
            {story.excerpt}
          </motion.p>
        )}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.44 }}
        >
          <Link
            to={`/stories/${story.id}`}
            className="inline-flex items-center gap-2 mt-7 font-inter text-[11px] tracking-wide text-forest-canopy border-b border-forest-canopy/30 pb-0.5 hover:border-forest-canopy transition-colors"
          >
            Read the story
            <ArrowRight className="w-3 h-3" strokeWidth={1.5} />
          </Link>
        </motion.div>
      </div>
    </motion.section>
  );
}