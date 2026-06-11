import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, useScroll, useSpring } from 'framer-motion';
import { stories as storiesApi, journeys as journeysApi } from '@/services/api';
import { ChevronLeft } from 'lucide-react';
import ShareSheet from '@/components/ui/ShareSheet';
import StoryProductSuggestions from '@/components/stories/StoryProductSuggestions';
import StoryReadingProgress from '@/components/stories/StoryReadingProgress';
import StoryComments from '@/components/stories/StoryComments';
import RelatedJourneyCard from '@/components/stories/RelatedJourneyCard';

export default function StoryDetail() {
  const { id } = useParams();

  // Slim reading-progress indicator
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 180,
    damping: 28,
    restDelta: 0.001,
  });

  const { data: story, isLoading } = useQuery({
    queryKey: ['story', id],
    queryFn: () => storiesApi.get(id),
    enabled: !!id,
  });

  const { data: relatedJourney } = useQuery({
    queryKey: ['story-journey', story?.journey_id],
    queryFn: () => journeysApi.get(story.journey_id),
    enabled: !!story?.journey_id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-rain-mist pb-24">
        <div className="h-[50vh] bg-temple-stone/30 animate-pulse" style={{paddingBottom: 0}} />
        <div className="p-6 space-y-4">
          <div className="h-7 bg-temple-stone/30 rounded w-3/4 animate-pulse" />
          <div className="h-4 bg-temple-stone/20 rounded animate-pulse" />
          <div className="h-4 bg-temple-stone/20 rounded animate-pulse w-4/5" />
        </div>
      </div>
    );
  }

  if (!story) return null;

  return (
    <div className="min-h-screen bg-rain-mist pb-16">

      {/* ── READING PROGRESS BAR ── */}
      <motion.div
        className="fixed top-0 left-0 right-0 z-50 h-[2px] origin-left"
        style={{
          scaleX,
          background: 'linear-gradient(90deg, #6E5846 0%, #D1A14B 60%, #5B7A4B 100%)',
        }}
      />

      {/* Hero */}
      <div className="relative h-[55vh] overflow-hidden">
        <img
          src={story.cover_image}
          alt={story.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-rain-cloud/80 via-rain-cloud/20 to-transparent" />
        <Link
          to="/our-roots#hands"
          className="absolute top-14 left-5 z-10 flex items-center gap-1 text-white/80 font-inter text-sm"
        >
          <ChevronLeft className="w-4 h-4" />
          Our Roots
        </Link>
        <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
          {story.read_time_minutes && (
            <span className="font-inter text-xs text-white/55">{story.read_time_minutes} min read</span>
          )}
          <div className="ml-auto text-white/70">
            <ShareSheet title={story.title} />
          </div>
        </div>
      </div>

      <div className="px-6 py-8">
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="font-cormorant text-4xl text-rain-cloud font-medium leading-tight"
        >
          {story.title}
        </motion.h1>

        {story.excerpt && (
          <p className="font-cormorant text-lg italic text-rain-cloud/55 mt-4 leading-relaxed">
            {story.excerpt}
          </p>
        )}

        {story.body && (
          <div className="mt-8 space-y-5">
            {story.body.split('\n').filter(Boolean).map((para, i) => (
              <p key={i} className="font-inter text-sm text-rain-cloud/65 leading-relaxed">
                {para}
              </p>
            ))}
          </div>
        )}

        {/* Media blocks */}
        {story.media_blocks?.map((block, i) => (
          <div key={i} className="mt-8">
            {block.type === 'image' && block.media_url && (
              <div className="rounded-2xl overflow-hidden aspect-[4/3]">
                <img src={block.media_url} alt={block.caption || ''} className="w-full h-full object-cover" loading="lazy" />
                {block.caption && (
                  <p className="font-inter text-xs text-rain-cloud/40 mt-2 text-center">{block.caption}</p>
                )}
              </div>
            )}
            {block.type === 'quote' && (
              <blockquote className="border-l-2 border-temple-stone pl-5 py-2">
                <p className="font-cormorant text-2xl italic text-wet-earth leading-relaxed">"{block.content}"</p>
              </blockquote>
            )}
            {block.type === 'text' && (
              <p className="font-inter text-sm text-rain-cloud/65 leading-relaxed">{block.content}</p>
            )}
          </div>
        ))}
      </div>

      {/* Related journey link */}
      {relatedJourney && <RelatedJourneyCard journey={relatedJourney} />}

      {/* Story → Product bridge (inline quick-order) */}
      <StoryProductSuggestions story={story} />

      {/* Community comments */}
      <StoryComments storyId={id} />

      {/* Reading progress tracker */}
      <StoryReadingProgress readTimeMinutes={story.read_time_minutes} storyId={id} />
      </div>
      );
      }
