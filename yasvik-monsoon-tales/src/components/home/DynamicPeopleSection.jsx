import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { people as peopleApi } from '@/services/api';
import PersonCard from '../people/PersonCard';

export default function DynamicPeopleSection() {
  const { data: people = [] } = useQuery({
    queryKey: ['people-featured'],
    queryFn: () => peopleApi.listFeatured(4),
  });

  return (
    <section className="py-8 px-5 bg-rain-mist border-t border-border/10">
      <motion.h2
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="text-center font-cormorant text-3xl md:text-4xl text-rain-cloud font-light italic mb-12"
      >
        The People
      </motion.h2>

      <div className="space-y-6 max-w-lg mx-auto">
        {people.length === 0 ? (
          [1, 2].map(i => (
            <div key={i} className="aspect-[4/3] rounded-2xl bg-temple-stone/30 animate-pulse" />
          ))
        ) : (
          people.map((person, i) => (
            <PersonCard key={person.id} person={person} index={i} />
          ))
        )}
      </div>
    </section>
  );
}