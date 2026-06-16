import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

/**
 * Generic horizontal scroll discovery strip.
 * items: [{ id, title, subtitle, image, href }]
 */
export default function HorizontalDiscoveryModule({ label, title, items = [], seeAllHref }) {
  const scrollRef = useRef(null);

  if (items.length === 0) return null;

  return (
    <section className="py-8">
      <div className="flex items-center justify-between px-5 mb-4">
        <div>
          {label && <p className="font-inter text-[9px] tracking-[0.28em] uppercase text-rain-cloud/35">{label}</p>}
          <h2 className="font-cormorant text-2xl text-rain-cloud font-light mt-0.5">{title}</h2>
        </div>
        {seeAllHref && (
          <Link to={seeAllHref} className="flex items-center gap-1 font-inter text-xs text-wet-earth">
            All <ChevronRight className="w-3 h-3" />
          </Link>
        )}
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto px-5 pb-1 hide-scrollbar snap-x snap-mandatory"
      >
        {items.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: 18 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: i * 0.06 }}
            className="flex-shrink-0 snap-start"
          >
            <Link
              to={item.href}
              className="block w-52 rounded-2xl overflow-hidden relative group active:scale-[0.97] transition-transform duration-150"
            >
              <div className="aspect-[3/2] bg-temple-stone/20 overflow-hidden">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-active:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-forest-canopy/15 to-wet-earth/10" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-rain-cloud/65 via-transparent to-transparent" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="font-cormorant text-white text-base font-light leading-tight">{item.title}</p>
                {item.subtitle && (
                  <p className="font-inter text-[9px] text-white/50 mt-0.5 line-clamp-1">{item.subtitle}</p>
                )}
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}