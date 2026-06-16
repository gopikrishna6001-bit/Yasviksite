import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { appClient } from '@/api/appClient';
import { Link } from 'react-router-dom';
import PageHeroRenderer from '@/components/PageHeroRenderer';

const SEASONS_DATA = [
  {
    id: 'pre_monsoon',
    label: 'Pre-Monsoon',
    months: 'March–May',
    color: 'from-orange-300 to-orange-400',
    borderColor: 'border-orange-300',
    milestones: [
      { phase: 'Land Prep', detail: 'Ploughing, weeding, soil enrichment' },
      { phase: 'Seed Selection', detail: 'Sourcing, testing, stratification' },
      { phase: 'Nursery Setup', detail: 'Germination beds, seedling care' },
    ],
  },
  {
    id: 'monsoon',
    label: 'Monsoon',
    months: 'June–September',
    color: 'from-blue-400 to-blue-500',
    borderColor: 'border-blue-400',
    milestones: [
      { phase: 'Transplanting', detail: 'Moving seedlings to field, spacing' },
      { phase: 'Growth & Maintenance', detail: 'Watering, weeding, pest management' },
      { phase: 'Nutrient Management', detail: 'Top-dressing, mulching, composting' },
    ],
  },
  {
    id: 'post_monsoon',
    label: 'Post-Monsoon',
    months: 'October–November',
    color: 'from-yellow-300 to-yellow-400',
    borderColor: 'border-yellow-300',
    milestones: [
      { phase: 'Ripening', detail: 'Maturation, grain/fruit hardening' },
      { phase: 'Final Care', detail: 'Selective harvesting, quality checks' },
      { phase: 'Harvest Prep', detail: 'Tool readiness, labor coordination' },
    ],
  },
  {
    id: 'winter',
    label: 'Winter',
    months: 'December–February',
    color: 'from-cyan-400 to-blue-300',
    borderColor: 'border-cyan-400',
    milestones: [
      { phase: 'Harvest', detail: 'Picking, cutting, collection timing' },
      { phase: 'Post-Harvest', detail: 'Drying, threshing, winnowing' },
      { phase: 'Storage & Prep', detail: 'Curing, packaging, field preparation' },
    ],
  },
];

export default function FarmingCycle() {
  const { data: hero, isLoading: heroLoading } = useQuery({
    queryKey: ['page-hero', 'farming_cycle'],
    queryFn: async () => {
      const results = await appClient.entities.PageHero.filter({ page_key: 'farming_cycle' }, '-updated_date', 1);
      return results[0];
    },
  });

  return (
    <div className="min-h-screen bg-rain-mist pb-16">
      {hero && <PageHeroRenderer hero={hero} isLoading={heroLoading} />}

      {/* Seasonal phases */}
      <div className="px-6 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {SEASONS_DATA.map((season, idx) => (
            <motion.div
              key={season.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className={`border-l-4 ${season.borderColor} bg-white rounded-2xl p-6 shadow-sm`}
            >
              {/* Season header */}
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h2 className="font-cormorant text-2xl text-rain-cloud font-light">
                    {season.label}
                  </h2>
                  <p className="font-inter text-xs text-rain-cloud/40 mt-1">{season.months}</p>
                </div>
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${season.color} opacity-20`} />
              </div>

              {/* Milestones */}
              <div className="space-y-3">
                {season.milestones.map((milestone, mIdx) => (
                  <motion.div
                    key={mIdx}
                    initial={{ opacity: 0, x: -8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: idx * 0.1 + mIdx * 0.05 }}
                    className="flex items-start gap-3 pl-3 border-l-2 border-border/40"
                  >
                    <div className="flex-shrink-0 mt-1">
                      <div className={`w-2 h-2 rounded-full bg-gradient-to-br ${season.color}`} />
                    </div>
                    <div>
                      <p className="font-inter font-medium text-sm text-rain-cloud">
                        {milestone.phase}
                      </p>
                      <p className="font-inter text-[11px] text-rain-cloud/50 mt-0.5">
                        {milestone.detail}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Educational note */}
      <div className="px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-br from-temple-stone/10 to-wet-earth/5 border border-temple-stone/30 rounded-2xl p-6"
          >
            <h3 className="font-cormorant text-lg text-rain-cloud font-light mb-3">
              A Living Reference
            </h3>
            <div className="space-y-2 text-sm">
              <p className="font-inter text-rain-cloud/60 leading-relaxed">
                This cycle represents an <strong className="text-rain-cloud/75">ideal annual rhythm</strong> that shapes heritage agriculture across India. However, every region, microclimate, altitude, and farmer adapts this template to their own land and practice.
              </p>
              <p className="font-inter text-rain-cloud/60 leading-relaxed">
                When you explore our <strong className="text-rain-cloud/75">Journeys and Products</strong>, each one carries its own seasonal story—dates, practices, and wisdom specific to that place and producer. This calendar is the foundation; their stories are the living proof.
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* CTA back to journeys */}
      <div className="px-6 py-8">
        <div className="max-w-2xl mx-auto flex flex-col gap-3">
          <Link
            to="/journeys"
            className="text-center py-3 rounded-full border border-wet-earth text-wet-earth font-inter text-sm font-medium hover:bg-wet-earth/5 transition-colors"
          >
            Explore Journeys
          </Link>
          <Link
            to="/shop"
            className="text-center py-3 rounded-full bg-wet-earth text-white font-inter text-sm font-medium hover:bg-wet-earth/90 transition-colors"
          >
            Browse Products
          </Link>
        </div>
      </div>
    </div>
  );
}