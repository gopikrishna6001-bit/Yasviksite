import { motion } from 'framer-motion';

/**
 * Shared cinematic page header — dark atmospheric banner.
 * Usage: <PageHeader eyebrow="Collection" title="Shop" subtitle="Heritage foods · Rooted stories" />
 */
export default function PageHeader({ eyebrow, title, subtitle }) {
  return (
    <div className="relative overflow-hidden bg-rain-cloud px-6 pt-10 pb-8">
      <div className="absolute inset-0 bg-gradient-to-br from-rain-cloud via-rain-cloud/95 to-forest-canopy/25 pointer-events-none" />
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative"
      >
        {eyebrow && (
          <p className="font-inter text-[9px] uppercase tracking-[0.35em] text-white/30 mb-2">{eyebrow}</p>
        )}
        <h1 className="font-cormorant text-5xl font-light text-white tracking-wide leading-none">
          {title}
        </h1>
        {subtitle && (
          <p className="font-inter text-[11px] text-white/35 tracking-wider mt-2">{subtitle}</p>
        )}
      </motion.div>
    </div>
  );
}