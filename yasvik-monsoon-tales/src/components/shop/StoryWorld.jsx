import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { stories as storiesApi } from '@/services/api';

export default function StoryWorld() {
  const { data: stories = [], isLoading } = useQuery({
    queryKey: ['stories-world'],
    queryFn: () => storiesApi.listPublished('-published_date', 20),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="pb-28 pt-3">
      <div className="px-4 mb-4">
        <p className="font-inter text-[10px] tracking-[0.28em] uppercase text-rain-cloud/30">Field Notes</p>
        <h1 className="font-cormorant text-2xl text-rain-cloud font-light mt-1">Stories from the land</h1>
      </div>

      {isLoading ? (
        <div className="space-y-6 px-4">
          {[1, 2].map(i => (
            <div key={i} className="space-y-3">
              <div className="aspect-[3/2] bg-temple-stone/25 rounded-3xl animate-pulse" />
              <div className="space-y-1.5">
                <div className="h-4 bg-temple-stone/25 rounded w-3/4 animate-pulse" />
                <div className="h-3 bg-temple-stone/15 rounded w-full animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-8 px-4">
          {stories.map((story, i) => (
            <motion.div
              key={story.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.55 }}
            >
              <Link to={`/stories/${story.id}`}>
                <div className="group">
                  {story.cover_image && (
                    <div className="rounded-3xl overflow-hidden aspect-[3/2] mb-3">
                      <img
                        src={story.cover_image}
                        alt={story.title}
                        className="w-full h-full object-cover group-hover:scale-[1.015] transition-transform duration-700"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="px-1">
                    {story.story_type && (
                      <p className="font-inter text-[9px] tracking-[0.28em] uppercase text-warm-turmeric/70 mb-1.5">
                        {story.story_type}
                      </p>
                    )}
                    <h2 className="font-cormorant text-[1.4rem] text-rain-cloud font-light leading-snug">
                      {story.title}
                    </h2>
                    {story.excerpt && (
                      <p className="font-inter text-[12px] text-rain-cloud/42 mt-1.5 leading-relaxed line-clamp-3">
                        {story.excerpt}
                      </p>
                    )}
                    {story.read_time_minutes && (
                      <p className="font-inter text-[10px] text-rain-cloud/28 mt-2">
                        {story.read_time_minutes} min read
                      </p>
                    )}
                  </div>
                </div>
              </Link>
              {i < stories.length - 1 && (
                <div className="mt-8 h-px bg-temple-stone/20" />
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}