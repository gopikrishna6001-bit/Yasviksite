import { motion } from 'framer-motion';

const SEASONS = [
  {
    key: 'pre_monsoon',
    label: 'Pre-Monsoon',
    month: 'Mar – May',
    icon: '☀️',
    color: 'bg-warm-turmeric/20 border-warm-turmeric/40 text-warm-turmeric',
    dot: 'bg-warm-turmeric',
    activity: 'Land preparation · Seed selection',
  },
  {
    key: 'monsoon',
    label: 'Monsoon Sowing',
    month: 'Jun – Aug',
    icon: '🌧️',
    color: 'bg-forest-canopy/15 border-forest-canopy/40 text-forest-canopy',
    dot: 'bg-forest-canopy',
    activity: 'Sowing · First rains · Transplanting',
  },
  {
    key: 'post_monsoon',
    label: 'Growing Season',
    month: 'Sep – Oct',
    icon: '🌾',
    color: 'bg-moss-green/15 border-moss-green/40 text-moss-green',
    dot: 'bg-moss-green',
    activity: 'Tending · Rain-fed growth · Ripening',
  },
  {
    key: 'winter',
    label: 'Harvest',
    month: 'Nov – Jan',
    icon: '🫙',
    color: 'bg-wet-earth/15 border-wet-earth/40 text-wet-earth',
    dot: 'bg-wet-earth',
    activity: 'Harvest · Drying · Processing',
  },
  {
    key: 'summer',
    label: 'Rest & Renewal',
    month: 'Feb – Mar',
    icon: '🌿',
    color: 'bg-temple-stone/30 border-temple-stone text-rain-cloud/50',
    dot: 'bg-temple-stone',
    activity: 'Soil rest · Crop planning',
  },
];

export default function SeasonalTimeline({ activeSeason }) {
  const activeIndex = SEASONS.findIndex(s => s.key === activeSeason);

  return (
    <div className="px-5 py-8">
      {/* Header */}
      <div className="mb-6">
        <p className="font-inter text-[9px] tracking-[0.28em] uppercase text-rain-cloud/35">Seasonal Cycle</p>
        <h3 className="font-cormorant text-2xl text-rain-cloud font-light mt-0.5">
          From Sowing to Harvest
        </h3>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical connecting line */}
        <div className="absolute left-[19px] top-4 bottom-4 w-px bg-border/60" />

        <div className="space-y-1">
          {SEASONS.map((season, i) => {
            const isActive = season.key === activeSeason;
            const isPast = activeIndex >= 0 && i < activeIndex;

            return (
              <motion.div
                key={season.key}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.08 }}
                className={`relative flex items-start gap-4 rounded-2xl p-4 transition-all duration-300 ${
                  isActive
                    ? 'bg-white shadow-sm border border-border/40'
                    : 'bg-transparent'
                }`}
              >
                {/* Dot on the timeline */}
                <div className="relative z-10 flex-shrink-0 mt-0.5">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 text-lg transition-all duration-300 ${
                    isActive
                      ? season.color + ' scale-110'
                      : isPast
                      ? 'bg-temple-stone/20 border-temple-stone/30 opacity-50'
                      : 'bg-rain-mist border-border/40'
                  }`}>
                    {isPast && !isActive ? (
                      <span className="text-sm opacity-40">{season.icon}</span>
                    ) : (
                      <span className="text-sm">{season.icon}</span>
                    )}
                  </div>
                  {/* Active pulse ring */}
                  {isActive && (
                    <motion.div
                      animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
                      className={`absolute inset-0 rounded-full border ${season.dot === 'bg-warm-turmeric' ? 'border-warm-turmeric' : season.dot === 'bg-forest-canopy' ? 'border-forest-canopy' : season.dot === 'bg-moss-green' ? 'border-moss-green' : 'border-wet-earth'}`}
                    />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`font-cormorant text-base font-medium leading-tight ${
                      isActive ? 'text-rain-cloud' : isPast ? 'text-rain-cloud/35' : 'text-rain-cloud/60'
                    }`}>
                      {season.label}
                    </p>
                    <span className={`font-inter text-[9px] tracking-wide flex-shrink-0 ${
                      isActive ? 'text-rain-cloud/50' : 'text-rain-cloud/25'
                    }`}>
                      {season.month}
                    </span>
                  </div>
                  <p className={`font-inter text-[11px] mt-0.5 leading-relaxed ${
                    isActive ? 'text-rain-cloud/55' : isPast ? 'text-rain-cloud/25' : 'text-rain-cloud/35'
                  }`}>
                    {season.activity}
                  </p>
                </div>

                {/* Active badge */}
                {isActive && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex-shrink-0 font-inter text-[8px] tracking-[0.15em] uppercase px-2 py-0.5 rounded-full bg-forest-canopy/15 text-forest-canopy border border-forest-canopy/25 self-center"
                  >
                    Now
                  </motion.span>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}