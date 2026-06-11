import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, MapPin, Sprout, ArrowRight } from 'lucide-react';
import { people as peopleApi, regions, journeys as journeysApi } from '@/services/api';

function formatHarvestDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function FarmerSpotlight({ product }) {
  const personId = product?.person_id || null;
  const regionId = product?.region_id || null;
  const journeyId = product?.journey_id || null;

  if (!product || (!personId && !journeyId)) return null;

  const { data: person } = useQuery({
    queryKey: ['traceability-person', personId],
    queryFn: () => peopleApi.get(personId),
    enabled: !!personId,
    staleTime: 10 * 60 * 1000,
  });

  const { data: region } = useQuery({
    queryKey: ['traceability-region', person?.region_id || regionId],
    queryFn: () => regions.get(person?.region_id || regionId),
    enabled: !!(person?.region_id || regionId),
    staleTime: 10 * 60 * 1000,
  });

  const { data: journey } = useQuery({
    queryKey: ['traceability-journey', journeyId],
    queryFn: () => journeysApi.get(journeyId),
    enabled: !!journeyId,
    staleTime: 10 * 60 * 1000,
  });

  const farmerName = person?.name || 'Sourcing journey';
  const location =
    product?.sourcing_location ||
    person?.location_label ||
    (region?.name ? `${region.name}${region?.state ? `, ${region.state}` : ''}` : null) ||
    'Origin details updating';
  const harvestDate = formatHarvestDate(product?.harvest_date);
  const journeyNote =
    product?.sourcing_story ||
    journey?.tagline ||
    journey?.long_narrative ||
    person?.short_bio ||
    person?.bio ||
    'This product has linked sourcing context. More details can be added as the journey is documented.';
  const portrait = person?.portrait_image || person?.image_url || region?.cover_image || '';

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-12%' }}
      transition={{ duration: 0.45 }}
      className="mx-5 my-6 rounded-2xl border border-rain-cloud/15 bg-white overflow-hidden"
    >
      <div className="px-5 pt-5">
        <p className="font-inter text-[10px] uppercase tracking-[0.24em] text-rain-cloud/45">
          Traceable Sourcing
        </p>
      </div>

      <div className="p-5 flex flex-col md:flex-row gap-5">
        <div className="md:w-48 flex-shrink-0">
          <div className="aspect-[4/5] w-full rounded-xl overflow-hidden bg-rain-mist border border-rain-cloud/10">
            {portrait ? (
              <img src={portrait} alt={farmerName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-rain-cloud/40 font-cormorant text-4xl">
                {farmerName?.[0] || 'Y'}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-rain-cloud/12 bg-rain-mist/35 p-3">
              <p className="font-inter text-[10px] uppercase tracking-[0.18em] text-rain-cloud/45">Farmer Partner</p>
              <p className="mt-1 font-cormorant text-2xl leading-none text-rain-cloud">{farmerName}</p>
            </div>
            <div className="rounded-xl border border-rain-cloud/12 bg-rain-mist/35 p-3">
              <p className="font-inter text-[10px] uppercase tracking-[0.18em] text-rain-cloud/45">Location</p>
              <p className="mt-1 flex items-center gap-1.5 font-inter text-sm text-rain-cloud/75">
                <MapPin className="h-3.5 w-3.5 text-rain-cloud/55" />
                <span className="truncate">{location}</span>
              </p>
            </div>
            {harvestDate ? <div className="rounded-xl border border-rain-cloud/12 bg-rain-mist/35 p-3 sm:col-span-2">
              <p className="font-inter text-[10px] uppercase tracking-[0.18em] text-rain-cloud/45">Harvest Date</p>
              <p className="mt-1 flex items-center gap-1.5 font-inter text-sm text-rain-cloud/75">
                <CalendarDays className="h-3.5 w-3.5 text-rain-cloud/55" />
                <span>{harvestDate}</span>
              </p>
            </div> : null}
          </div>

          <div className="mt-3 rounded-xl border border-rain-cloud/12 bg-white p-3">
            <p className="font-inter text-[10px] uppercase tracking-[0.18em] text-rain-cloud/45">Journey Note</p>
            <p className="mt-1.5 font-inter text-sm leading-relaxed text-rain-cloud/70">
              {journeyNote}
            </p>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {person?.id ? (
              <Link
                to={`/people/${person.id}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-rain-cloud/20 px-3 py-1.5 text-[11px] font-inter text-rain-cloud/70 hover:bg-rain-mist transition-colors"
              >
                <Sprout className="h-3.5 w-3.5" />
                Meet the farmer
              </Link>
            ) : null}
            {journey?.id ? (
              <Link
                to={`/journeys/${journey.id}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-rain-cloud/20 px-3 py-1.5 text-[11px] font-inter text-rain-cloud/70 hover:bg-rain-mist transition-colors"
              >
                Read sourcing journey
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
