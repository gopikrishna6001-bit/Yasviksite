import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function StoryTransitionBridge() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className="py-12 px-5 bg-gradient-to-b from-rain-mist to-white text-center"
    >
      <p className="font-inter text-xs uppercase tracking-[0.3em] text-rain-cloud/40 mb-3">
        Curated from the field
      </p>
      <h2 className="font-cormorant text-2xl text-rain-cloud font-light mb-2">
        Begin Your Journey
      </h2>
      <p className="font-inter text-sm text-rain-cloud/50 max-w-sm mx-auto mb-6 leading-relaxed">
        Discover rooted stories. Meet the farmers. Taste the difference.
      </p>
      <Link
        to="/journeys"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-rain-cloud/20 text-rain-cloud/70 font-inter text-sm hover:bg-rain-cloud/5 transition-colors"
      >
        Explore Journeys
        <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
      </Link>
    </motion.div>
  );
}