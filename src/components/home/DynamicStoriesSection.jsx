import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { appClient } from '@/api/appClient';
import StoryCard from '../stories/StoryCard';

export default function DynamicStoriesSection() {
  const { data: stories = [] } = useQuery({
    queryKey: ['stories-featured'],
    queryFn: () => appClient.entities.Story.filter({ is_published: true }, '-created_date', 3),
  });

  return (
    <section className="py-16 px-5 bg-white/50">
      <motion.h2
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="text-center font-inter text-[10px] tracking-[0.32em] text-rain-cloud/45 uppercase mb-12"
      >
        Stories
      </motion.h2>

      <div className="space-y-12 max-w-lg mx-auto">
        {stories.length === 0 ? (
          [1, 2].map(i => (
            <div key={i} className="space-y-4">
              <div className="aspect-[16/10] rounded-2xl bg-temple-stone/30 animate-pulse" />
              <div className="h-6 bg-temple-stone/30 rounded animate-pulse w-3/4" />
              <div className="h-4 bg-temple-stone/20 rounded animate-pulse" />
            </div>
          ))
        ) : (
          stories.map((story, i) => (
            <StoryCard key={story.id} story={story} index={i} />
          ))
        )}
      </div>
    </section>
  );
}