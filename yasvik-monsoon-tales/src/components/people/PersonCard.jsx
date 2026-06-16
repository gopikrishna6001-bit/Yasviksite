import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function PersonCard({ person, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
    >
      <Link to={`/people/${person.id}`} className="block">
        <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-temple-stone/20">
          <img
            src={person.portrait_image}
            alt={person.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-rain-cloud/75 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <h3 className="font-cormorant text-2xl text-white font-medium">{person.name}</h3>
            <p className="font-inter text-sm text-white/75 mt-0.5">{person.role}</p>
            <p className="font-inter text-xs text-white/50 mt-0.5">{person.location_label}</p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}