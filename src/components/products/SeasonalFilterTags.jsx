import { motion } from 'framer-motion';

const SEASON_OPTIONS = [
  { id: 'all', label: 'All Seasons', emoji: '🌍' },
  { id: 'pre_monsoon', label: 'Pre-Monsoon', emoji: '🌱' },
  { id: 'monsoon', label: 'Monsoon', emoji: '🌧️' },
  { id: 'post_monsoon', label: 'Post-Monsoon', emoji: '🌾' },
  { id: 'winter', label: 'Winter', emoji: '❄️' },
];

export default function SeasonalFilterTags({ selected, onSelect }) {
  return (
    <div className="flex gap-2 overflow-x-auto px-5 pb-3 hide-scrollbar">
      {SEASON_OPTIONS.map((season, i) => (
        <motion.button
          key={season.id}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          onClick={() => onSelect(season.id)}
          className={`flex-shrink-0 py-1.5 px-4 rounded-full font-inter text-xs transition-all ${
            selected === season.id
              ? 'bg-forest-canopy text-white'
              : 'bg-white text-rain-cloud/60 border border-border'
          }`}
        >
          {season.emoji} {season.label}
        </motion.button>
      ))}
    </div>
  );
}