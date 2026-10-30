import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import ImageSlideshow, { storyCoverSlides } from '../ui/ImageSlideshow';

export default function StoryCard({ story, index = 0 }) {
  const slides = storyCoverSlides(story);

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
    >
      <Link to={`/stories/${story.id}`} className="block">
        <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-temple-stone/20">
          {slides.length > 1 ? (
            <ImageSlideshow
              slides={slides}
              alt={story.title}
              showDots
              intervalMs={4500}
              className="rounded-2xl"
            />
          ) : slides[0] ? (
            <img
              src={slides[0]}
              alt={story.title}
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : null}
        </div>
        <div className="mt-4">
          <h3 className="font-cormorant text-2xl text-rain-cloud font-medium leading-snug">
            {story.title}
          </h3>
          <p className="font-inter text-sm text-rain-cloud/55 mt-2 leading-relaxed line-clamp-2">
            {story.excerpt}
          </p>
          {story.read_time_minutes && (
            <span className="font-inter text-[11px] text-forest-canopy mt-3 inline-block">
              {story.read_time_minutes} min read
            </span>
          )}
        </div>
      </Link>
    </motion.article>
  );
}
