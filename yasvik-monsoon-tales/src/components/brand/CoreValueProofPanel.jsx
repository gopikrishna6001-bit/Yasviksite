import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { CORE_VALUE_NARRATIVE_FRAMES } from '@/brand/monsoonTokens';
import { useCoreValueStories } from '@/lib/coreValueProofs';

export default function CoreValueProofPanel({ value }) {
  const { linksById } = useCoreValueStories();
  const link = linksById[value.id];
  const frameLabel = CORE_VALUE_NARRATIVE_FRAMES[value.narrativeFrame] || '';

  if (!link) return null;

  return (
    <Link
      to={link.href}
      className="mt-5 block rounded-2xl border border-soft-border bg-warm-cream/80 px-4 py-3.5 transition-colors hover:border-neon-paddy/30 hover:bg-warm-cream"
    >
      <p className="font-inter text-[10px] font-bold uppercase tracking-[0.16em] text-sun-dried-clay">
        {frameLabel ? `${frameLabel} — ` : ''}
        {value.narrativeLead}
      </p>
      <p className="mt-2 font-inter text-sm font-semibold text-deep-forest">{link.title || value.title}</p>
      <span className="mt-2 inline-flex items-center gap-1.5 font-inter text-xs font-bold text-neon-paddy">
        <ArrowUpRight className="h-3.5 w-3.5" />
        {link.label}
      </span>
    </Link>
  );
}
