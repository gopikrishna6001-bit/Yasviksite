import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Leaf, MapPinned, ShieldCheck } from 'lucide-react';
import { CORE_VALUE_NARRATIVE_FRAMES, YASVIK_CORE_VALUES } from '@/brand/monsoonTokens';
import { useCoreValueStories } from '@/lib/coreValueProofs';

const ICONS = {
  leaf: Leaf,
  map: MapPinned,
  shield: ShieldCheck,
};

const FRAME_BADGE_CLASS = 'bg-neon-paddy/12 text-neon-paddy';

function ValueCard({ value, link }) {
  const Icon = ICONS[value.icon] || ShieldCheck;
  const frameLabel = CORE_VALUE_NARRATIVE_FRAMES[value.narrativeFrame] || '';
  const frameClass = FRAME_BADGE_CLASS;

  return (
    <Link
      to={link.href}
      className="group block rounded-2xl border border-soft-border bg-white/95 px-4 py-3.5 shadow-[0_8px_24px_rgba(31,61,43,0.04)] transition-all hover:border-neon-paddy/30 hover:bg-white"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-neon-paddy/10 text-neon-paddy">
          <Icon className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        </span>
        {frameLabel ? (
          <span className={`rounded-full px-2 py-0.5 font-inter text-[10px] font-bold uppercase tracking-[0.14em] ${frameClass}`}>
            {frameLabel}
          </span>
        ) : null}
      </div>
      <p className="mt-2.5 font-cormorant text-lg font-semibold leading-tight text-deep-forest">{value.title}</p>
      <p className="mt-1 font-inter text-xs leading-5 text-deep-forest/65">{value.heroLine}</p>
      {link.title ? (
        <p className="mt-2 line-clamp-2 font-inter text-[11px] leading-5 text-deep-forest/50">{link.title}</p>
      ) : null}
      <span className="mt-3 inline-flex items-center gap-1.5 font-inter text-xs font-bold text-neon-paddy transition-colors group-hover:text-deep-forest">
        <ArrowUpRight className="h-3.5 w-3.5" />
        {link.label}
      </span>
    </Link>
  );
}

export default function CoreValuesRow() {
  const { linksById } = useCoreValueStories();

  return (
    <div className="mt-6 w-full" aria-label="Our core values">
      <p className="mb-3 font-inter text-[10px] font-bold uppercase tracking-[0.18em] text-sun-dried-clay">
        What guides Yasvik
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {YASVIK_CORE_VALUES.map((value) => (
          <ValueCard key={value.id} value={value} link={linksById[value.id]} />
        ))}
      </div>
    </div>
  );
}
