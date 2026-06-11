import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// 12 months mapped to seasons
const MONTH_SEASONS = [
  { month: 'Jan', short: 'J', season: 'winter' },
  { month: 'Feb', short: 'F', season: 'summer' },
  { month: 'Mar', short: 'M', season: 'pre_monsoon' },
  { month: 'Apr', short: 'A', season: 'pre_monsoon' },
  { month: 'May', short: 'M', season: 'pre_monsoon' },
  { month: 'Jun', short: 'J', season: 'monsoon' },
  { month: 'Jul', short: 'J', season: 'monsoon' },
  { month: 'Aug', short: 'A', season: 'monsoon' },
  { month: 'Sep', short: 'S', season: 'post_monsoon' },
  { month: 'Oct', short: 'O', season: 'post_monsoon' },
  { month: 'Nov', short: 'N', season: 'winter' },
  { month: 'Dec', short: 'D', season: 'winter' },
];

const SEASON_CONFIG = {
  pre_monsoon: {
    label: 'Pre-Monsoon',
    icon: '☀️',
    accent: '#D1A14B',
    bg: 'bg-warm-turmeric/10',
    border: 'border-warm-turmeric/30',
    text: 'text-warm-turmeric',
    milestones: [
      { month: 'Mar', label: 'Land Preparation', detail: 'Tilling and clearing fields, enriching soil with organic matter' },
      { month: 'Apr', label: 'Seed Selection', detail: 'Hand-picking heritage seeds from last season\'s best yield' },
      { month: 'May', label: 'Nursery Sowing', detail: 'Seeds sown in nursery beds, awaiting the first rains' },
    ],
  },
  monsoon: {
    label: 'Monsoon Sowing',
    icon: '🌧️',
    accent: '#5B7A4B',
    bg: 'bg-forest-canopy/10',
    border: 'border-forest-canopy/30',
    text: 'text-forest-canopy',
    milestones: [
      { month: 'Jun', label: 'First Rains', detail: 'The monsoon arrives, saturating the paddy fields' },
      { month: 'Jul', label: 'Transplanting', detail: 'Seedlings moved from nursery to flooded paddies by hand' },
      { month: 'Aug', label: 'Rain-fed Growth', detail: 'Plants grow tall under monsoon skies, fed by natural rainfall' },
    ],
  },
  post_monsoon: {
    label: 'Growing Season',
    icon: '🌾',
    accent: '#8BA66D',
    bg: 'bg-moss-green/10',
    border: 'border-moss-green/30',
    text: 'text-moss-green',
    milestones: [
      { month: 'Sep', label: 'Ear Formation', detail: 'Rice ears form as rains taper and skies clear' },
      { month: 'Oct', label: 'Ripening', detail: 'Golden grains swell and ripen in cool post-monsoon air' },
    ],
  },
  winter: {
    label: 'Harvest & Rest',
    icon: '🫙',
    accent: '#6E5846',
    bg: 'bg-wet-earth/10',
    border: 'border-wet-earth/30',
    text: 'text-wet-earth',
    milestones: [
      { month: 'Nov', label: 'Harvest', detail: 'Hand-cut at dawn, bundled and carried to the threshing floor' },
      { month: 'Dec', label: 'Drying & Milling', detail: 'Sun-dried for days before stone or wooden milling' },
      { month: 'Jan', label: 'Processing & Storage', detail: 'Grain packed and stored in ancestral clay granaries' },
    ],
  },
  summer: {
    label: 'Rest & Renewal',
    icon: '🌿',
    accent: '#CBBCA5',
    bg: 'bg-temple-stone/20',
    border: 'border-temple-stone/50',
    text: 'text-rain-cloud/50',
    milestones: [
      { month: 'Feb', label: 'Soil Rest', detail: 'Fields lie fallow, restoring natural minerals and microbes' },
      { month: 'Mar', label: 'Crop Planning', detail: 'Farmers meet to select next season\'s varieties and rotations' },
    ],
  },
};

const SEASONS_ORDER = ['pre_monsoon', 'monsoon', 'post_monsoon', 'winter', 'summer'];

// Draw month arc on SVG circle
function MonthArc({ index, total, season, isActive, isSelected, onClick, month }) {
  const radius = 110;
  const cx = 140;
  const cy = 140;
  const angleStep = (2 * Math.PI) / total;
  const startAngle = (index * angleStep) - Math.PI / 2;
  const endAngle = ((index + 1) * angleStep) - Math.PI / 2;
  const gap = 0.03;

  const x1 = cx + radius * Math.cos(startAngle + gap);
  const y1 = cy + radius * Math.sin(startAngle + gap);
  const x2 = cx + radius * Math.cos(endAngle - gap);
  const y2 = cy + radius * Math.sin(endAngle - gap);
  const innerR = 72;
  const x3 = cx + innerR * Math.cos(endAngle - gap);
  const y3 = cy + innerR * Math.sin(endAngle - gap);
  const x4 = cx + innerR * Math.cos(startAngle + gap);
  const y4 = cy + innerR * Math.sin(startAngle + gap);

  const config = SEASON_CONFIG[season];
  const midAngle = startAngle + angleStep / 2;
  const labelR = 92;
  const lx = cx + labelR * Math.cos(midAngle);
  const ly = cy + labelR * Math.sin(midAngle);

  const fillColor = isSelected
    ? config.accent
    : isActive
    ? config.accent + '90'
    : '#e8e4de';

  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      <path
        d={`M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 0 0 ${x4} ${y4} Z`}
        fill={fillColor}
        stroke="white"
        strokeWidth="2"
        style={{ transition: 'fill 0.25s ease', opacity: isActive || isSelected ? 1 : 0.4 }}
      />
      <text
        x={lx}
        y={ly + 4}
        textAnchor="middle"
        fontSize="9"
        fontFamily="Inter, sans-serif"
        fill={isSelected || isActive ? 'white' : '#8a847c'}
        fontWeight={isSelected ? '600' : '400'}
      >
        {month.short}
      </text>
    </g>
  );
}

export default function JourneySeasonalCalendar({ journey }) {
  const currentMonthIndex = new Date().getMonth(); // 0-11
  const currentSeason = MONTH_SEASONS[currentMonthIndex].season;

  const [selectedSeason, setSelectedSeason] = useState(currentSeason);
  const [selectedMilestone, setSelectedMilestone] = useState(null);

  const config = SEASON_CONFIG[selectedSeason];

  return (
    <div className="px-5 py-8">
      {/* Header */}
      <div className="mb-6">
        <p className="font-inter text-[9px] tracking-[0.28em] uppercase text-rain-cloud/35">Seasonal Calendar</p>
        <h3 className="font-cormorant text-2xl text-rain-cloud font-light mt-0.5">
          The Annual Farming Cycle
        </h3>
        <p className="font-inter text-xs text-rain-cloud/45 mt-1">
          Tap a month to explore each phase of the journey
        </p>
      </div>

      {/* Circular Calendar */}
      <div className="flex justify-center mb-6">
        <div className="relative">
          <svg width="280" height="280" viewBox="0 0 280 280">
            {/* Outer ring background */}
            <circle cx="140" cy="140" r="125" fill="none" stroke="#e8e4de" strokeWidth="1" />

            {/* Month arcs */}
            {MONTH_SEASONS.map((m, i) => (
              <MonthArc
                key={m.month}
                index={i}
                total={12}
                season={m.season}
                isActive={m.season === currentSeason}
                isSelected={m.season === selectedSeason}
                onClick={() => {
                  setSelectedSeason(m.season);
                  setSelectedMilestone(null);
                }}
                month={m}
              />
            ))}

            {/* Center circle */}
            <circle cx="140" cy="140" r="68" fill="white" />
            <circle cx="140" cy="140" r="68" fill="none" stroke="#e8e4de" strokeWidth="1" />

            {/* Center content */}
            <text x="140" y="130" textAnchor="middle" fontSize="22" dominantBaseline="middle">
              {config.icon}
            </text>
            <text x="140" y="152" textAnchor="middle" fontSize="9" fontFamily="Cormorant Garamond, serif" fill="#2F3A34" fontWeight="500">
              {config.label}
            </text>
            <text x="140" y="167" textAnchor="middle" fontSize="7.5" fontFamily="Inter, sans-serif" fill="#2F3A34" opacity="0.45">
              {selectedSeason === currentSeason ? '● Now' : ''}
            </text>
          </svg>

          {/* Current month pulse indicator */}
          <div
            className="absolute pointer-events-none"
            style={{
              top: '50%',
              left: '50%',
              transform: `translate(-50%, -50%) rotate(${(currentMonthIndex * 30) - 90}deg) translateY(-110px)`,
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.6, 1], opacity: [0.8, 0, 0.8] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
              className="w-2 h-2 rounded-full bg-forest-canopy"
            />
          </div>
        </div>
      </div>

      {/* Season selector tabs */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 mb-5">
        {SEASONS_ORDER.map(sk => {
          const sc = SEASON_CONFIG[sk];
          const isSelected = sk === selectedSeason;
          return (
            <button
              key={sk}
              onClick={() => { setSelectedSeason(sk); setSelectedMilestone(null); }}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-inter text-[11px] transition-all duration-200 ${
                isSelected
                  ? `${sc.bg} ${sc.border} ${sc.text} shadow-sm`
                  : 'bg-white border-border text-rain-cloud/45'
              }`}
            >
              <span>{sc.icon}</span>
              <span>{sc.label}</span>
            </button>
          );
        })}
      </div>

      {/* Milestones for selected season */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedSeason}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className={`rounded-2xl border p-4 ${config.bg} ${config.border}`}
        >
          <div className="space-y-2">
            {config.milestones.map((m, i) => {
              const isOpen = selectedMilestone === i;
              return (
                <div key={i}>
                  <button
                    onClick={() => setSelectedMilestone(isOpen ? null : i)}
                    className="w-full flex items-center gap-3 py-2 text-left"
                  >
                    {/* Timeline dot */}
                    <div className="flex-shrink-0 flex flex-col items-center gap-1">
                      <div
                        className="w-2.5 h-2.5 rounded-full border-2"
                        style={{ borderColor: config.accent, backgroundColor: isOpen ? config.accent : 'white' }}
                      />
                      {i < config.milestones.length - 1 && (
                        <div className="w-px h-3 bg-border/60" />
                      )}
                    </div>

                    {/* Label */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-inter text-[10px] tracking-wide ${config.text} opacity-70`}>
                          {m.month}
                        </span>
                        <span className="font-cormorant text-base text-rain-cloud font-medium leading-tight">
                          {m.label}
                        </span>
                      </div>
                    </div>

                    {/* Chevron */}
                    <span className={`font-inter text-[10px] text-rain-cloud/30 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>›</span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden ml-5"
                      >
                        <p className="font-inter text-xs text-rain-cloud/60 leading-relaxed pb-2 pl-2 border-l border-border/40">
                          {m.detail}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Disclaimer */}
      <div className="mt-4 flex items-start gap-2 px-3 py-3 rounded-xl bg-temple-stone/10 border border-temple-stone/30">
        <span className="text-base flex-shrink-0">🌏</span>
        <p className="font-inter text-[11px] text-rain-cloud/50 leading-relaxed">
          This represents an <em>ideal reference cycle</em>. Actual sowing and harvest windows vary by region, state, altitude, and each farmer's own practice. Every product on Yasvik carries its own unique seasonal story.
        </p>
      </div>
    </div>
  );
}