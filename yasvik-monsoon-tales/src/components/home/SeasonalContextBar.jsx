import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Leaf } from 'lucide-react';

const CURRENT_SEASON = 'monsoon'; // June-September

const SEASONS_INFO = {
  pre_monsoon: { label: '🌱 Pre-Monsoon', color: 'from-orange-400 to-orange-300' },
  monsoon: { label: '🌧️ Monsoon Phase', color: 'from-blue-400 to-blue-300' },
  post_monsoon: { label: '🌾 Post-Monsoon', color: 'from-yellow-400 to-yellow-300' },
  winter: { label: '❄️ Winter Harvest', color: 'from-cyan-400 to-blue-300' },
};

export default function SeasonalContextBar() {
  const season = SEASONS_INFO[CURRENT_SEASON];

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className={`mx-5 my-6 rounded-2xl bg-gradient-to-r ${season.color} p-0.5`}
    >
      <Link
        to="/farming-cycle"
        className="block rounded-2xl bg-white/95 backdrop-blur-sm px-5 py-3.5 flex items-center justify-between group hover:bg-white transition-colors"
      >
        <div className="flex items-center gap-3">
          <Leaf className="w-4 h-4 text-rain-cloud/60 group-hover:text-forest-canopy transition-colors" />
          <div>
            <p className="font-inter text-xs text-rain-cloud/50">We're in the</p>
            <p className="font-cormorant text-base text-rain-cloud font-light">{season.label}</p>
          </div>
        </div>
        <span className="font-inter text-xs text-rain-cloud/40 group-hover:text-rain-cloud/60">Explore →</span>
      </Link>
    </motion.div>
  );
}