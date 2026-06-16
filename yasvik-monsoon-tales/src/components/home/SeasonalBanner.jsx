import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.18, delayChildren: 0.1 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 1.1, ease: [0.22, 1, 0.36, 1] } },
};

export default function SeasonalBanner() {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      variants={stagger}
      className="py-20 px-6 bg-gradient-to-b from-rain-mist to-white border-b border-temple-stone/15"
    >
      <div className="max-w-sm mx-auto text-center space-y-4">
        <motion.span variants={fadeUp} className="block font-inter text-[9px] tracking-[0.35em] uppercase text-warm-turmeric">
          In Season Now
        </motion.span>
        <motion.h2 variants={fadeUp} className="font-cormorant text-3xl text-rain-cloud font-light italic leading-snug">
          The forests are yielding their first rains
        </motion.h2>
        <motion.p variants={fadeUp} className="font-inter text-xs text-rain-cloud/45 leading-relaxed">
          Pre-monsoon harvests from the Western Ghats — wild honey, heritage rice, and hand-rolled spices — gathered before the rains arrive.
        </motion.p>
        <motion.div variants={fadeUp}>
          <Link
            to="/journeys"
            className="inline-block mt-2 font-inter text-[11px] tracking-wide text-forest-canopy border-b border-forest-canopy/30 pb-0.5 hover:border-forest-canopy transition-colors"
          >
            See this season's journey
          </Link>
        </motion.div>
      </div>
    </motion.section>
  );
}