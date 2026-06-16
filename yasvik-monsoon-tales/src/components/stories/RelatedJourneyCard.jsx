import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

export default function RelatedJourneyCard({ journey }) {
  if (!journey) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mx-5 my-8"
    >
      <Link
        to={`/journeys/${journey.id}`}
        className="block rounded-2xl overflow-hidden relative aspect-[16/9] group"
      >
        <img
          src={journey.cover_image}
          alt={journey.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-rain-cloud/75 to-transparent flex flex-col justify-end p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-inter text-[10px] uppercase tracking-[0.2em] text-white/60">Related Journey</p>
              <h3 className="font-cormorant text-2xl text-white font-light leading-tight mt-1">{journey.tagline}</h3>
            </div>
            <ChevronRight className="w-5 h-5 text-white/50 group-hover:text-white transition-colors" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}