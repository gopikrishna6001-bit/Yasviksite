import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function JourneyProductFlow({ products, journeyTitle }) {
  if (!products || products.length === 0) return null;

  return (
    <div className="px-5 py-10 bg-temple-stone/5">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-gradient-to-r from-temple-stone/20 to-transparent" />
          <span className="font-inter text-xs text-rain-cloud/40 uppercase tracking-[0.2em]">From {journeyTitle}</span>
          <div className="flex-1 h-px bg-gradient-to-l from-temple-stone/20 to-transparent" />
        </div>

        <div className="space-y-3">
          {products.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
            >
              <Link
                to={`/product/${p.id}`}
                className="flex items-center gap-4 p-3 rounded-lg bg-white border border-border/40 hover:border-forest-canopy/30 hover:bg-white/80 transition-all group"
              >
                <img src={p.hero_image} alt={p.title} className="w-12 h-12 rounded-lg object-cover" />
                <div className="flex-1">
                  <p className="font-cormorant text-sm text-rain-cloud font-light">{p.title}</p>
                  <p className="font-inter text-xs text-rain-cloud/50">₹{p.price}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-rain-cloud/40 group-hover:text-forest-canopy transition-colors" />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}