import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { stories as storiesApi } from '@/services/api';
import { ArrowRight } from 'lucide-react';

function StoryTypeTag({ type }) {
  if (!type) return null;
  return (
    <span className="font-inter text-[9px] tracking-[0.25em] uppercase text-warm-turmeric">
      {type.replace('_', ' ')}
    </span>
  );
}

function FeaturedStoryCard({ story }) {
  return (
    <Link to={`/stories/${story.id}`} className="block group">
      <div className="relative aspect-[16/9] rounded-2xl overflow-hidden">
        <img
          src={story.cover_image || 'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=800&q=75'}
          alt={story.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-rain-cloud/75 via-rain-cloud/10 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <StoryTypeTag type={story.story_type} />
          <h3 className="font-cormorant text-xl text-white font-light mt-1 leading-snug">
            {story.title}
          </h3>
          {story.excerpt && (
            <p className="font-inter text-xs text-white/60 mt-1.5 line-clamp-2 leading-relaxed">
              {story.excerpt}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

function SmallStoryCard({ story }) {
  return (
    <Link to={`/stories/${story.id}`} className="flex gap-3 group items-start">
      <div className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden">
        <img
          src={story.cover_image || 'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=200&q=75'}
          alt={story.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        <StoryTypeTag type={story.story_type} />
        <h4 className="font-cormorant text-base text-rain-cloud font-light leading-snug mt-0.5 line-clamp-2">
          {story.title}
        </h4>
        {story.read_time_minutes && (
          <p className="font-inter text-[10px] text-rain-cloud/35 mt-1">
            {story.read_time_minutes} min read
          </p>
        )}
      </div>
    </Link>
  );
}

export default function LatestStoriesSection() {
  const { data: stories = [], isLoading } = useQuery({
    queryKey: ['stories-latest'],
    queryFn: () => storiesApi.filter({ is_published: true }, '-published_date', 4),
  });

  const [featured, ...rest] = stories;

  return (
    <section className="py-8 px-5 bg-white/55 border-t border-border/10">
      <div className="max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="flex items-center justify-between mb-10"
        >
          <span className="font-inter text-[10px] tracking-[0.32em] text-rain-cloud/45 uppercase">
            Latest Stories
          </span>
          <Link to="/stories" className="flex items-center gap-1 font-inter text-[10px] text-forest-canopy hover:text-forest-canopy/70 transition-colors">
            All stories <ArrowRight className="w-3 h-3" />
          </Link>
        </motion.div>

        {isLoading ? (
          <div className="space-y-6">
            <div className="aspect-[16/9] rounded-2xl bg-temple-stone/30 animate-pulse" />
            <div className="space-y-4">
              {[1, 2].map(i => (
                <div key={i} className="flex gap-3">
                  <div className="w-20 h-20 rounded-xl bg-temple-stone/30 animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-3 bg-temple-stone/20 rounded animate-pulse w-1/3" />
                    <div className="h-4 bg-temple-stone/30 rounded animate-pulse w-4/5" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : stories.length === 0 ? (
          <p className="text-center font-inter text-sm text-rain-cloud/30 py-12">No stories published yet.</p>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="space-y-6"
          >
            {featured && <FeaturedStoryCard story={featured} />}
            {rest.length > 0 && (
              <div className="space-y-5 pt-2">
                {rest.map(story => (
                  <SmallStoryCard key={story.id} story={story} />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </section>
  );
}