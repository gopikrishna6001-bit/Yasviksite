import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import StoryTag from '../ui/StoryTag';

export default function JourneyCard({ journey, index = 0, size = 'default' }) {
  const aspectClass = size === 'large' ? 'aspect-[3/4]' : 'aspect-[3/4]';

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1], delay: index * 0.12 }}
      className="w-full"
    >
      <Link to={`/journeys/${journey.id}`} className="block active:scale-95 transition-transform duration-100 active:opacity-90">
        <div className={`relative rounded-2xl overflow-hidden ${aspectClass} bg-temple-stone/20`}>
          <motion.img
            src={journey.cover_image}
            alt={journey.title}
            className="w-full h-full object-cover"
            loading="lazy"
            initial={{ scale: 1.08 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: index * 0.12 }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-rain-cloud/85 via-rain-cloud/25 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <StoryTag>{journey.location_label}</StoryTag>
            <h3 className="font-cormorant text-[1.45rem] text-white font-light mt-2 leading-snug">
              {journey.tagline}
            </h3>
            <p className="font-inter text-xs text-white/65 mt-2 leading-relaxed line-clamp-2">
              {journey.description}
            </p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}