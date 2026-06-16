import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import CinematicImage from '../ui/CinematicImage';

export default function StoryCard({ story, index = 0 }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
    >
      <Link to={`/stories/${story.id}`} className="block">
        <CinematicImage
          src={story.cover_image}
          alt={story.title}
          aspectRatio="aspect-[16/10]"
          className="rounded-2xl"
        />
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