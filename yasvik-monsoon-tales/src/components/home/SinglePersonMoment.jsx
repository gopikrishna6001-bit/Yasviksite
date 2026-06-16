import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { people as peopleApi } from '@/services/api';

// One person — portrait, quote, name. Calm, human, editorial.
export default function SinglePersonMoment() {
  const { data: people = [] } = useQuery({
    queryKey: ['people-featured'],
    queryFn: () => peopleApi.listFeatured(4),
    staleTime: 5 * 60 * 1000,
  });

  // Pick the person with a quote and portrait
  const person = people.find(p => p.quote && p.portrait_image) || people[0];
  if (!person) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
      className="py-20 px-5 bg-temple-stone/10"
    >
      <div className="max-w-sm mx-auto">
        {/* Asymmetric layout — portrait left-offset */}
        <div className="flex gap-5 items-start">
          {person.portrait_image && (
            <motion.div
              initial={{ opacity: 0, x: -20, scale: 0.95 }}
              whileInView={{ opacity: 1, x: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
              className="flex-shrink-0 w-20 h-20 rounded-2xl overflow-hidden"
            >
              <img
                src={person.portrait_image}
                alt={person.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </motion.div>
          )}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
            className="pt-1"
          >
            <p className="font-inter text-[9px] tracking-[0.28em] uppercase text-rain-cloud/30 mb-1">
              {person.role}
            </p>
            <p className="font-cormorant text-base text-rain-cloud font-medium leading-snug">
              {person.name}
            </p>
            {person.location_label && (
              <p className="font-inter text-[10px] text-rain-cloud/35 mt-0.5">{person.location_label}</p>
            )}
          </motion.div>
        </div>

        {/* Quote — the emotional centrepiece */}
        {person.quote && (
          <motion.blockquote
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.38 }}
            className="mt-8 pl-4 border-l-2 border-wet-earth/25"
          >
            <p className="font-cormorant text-[1.35rem] text-rain-cloud font-light italic leading-relaxed">
              "{person.quote}"
            </p>
          </motion.blockquote>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mt-8"
        >
          <Link
            to={`/people/${person.id}`}
            className="font-inter text-[11px] tracking-wide text-wet-earth border-b border-wet-earth/25 pb-0.5 hover:border-wet-earth transition-colors"
          >
            Meet {person.name.split(' ')[0]}
          </Link>
        </motion.div>
      </div>
    </motion.section>
  );
}