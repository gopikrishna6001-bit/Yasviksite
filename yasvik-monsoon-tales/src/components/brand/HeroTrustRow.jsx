import { Link } from 'react-router-dom';
import { Award, Heart, ShieldCheck, Sparkles, Leaf } from 'lucide-react';

const TRUST_ITEMS = [
  { icon: Leaf, label: 'Thoughtful Selection' },
  { icon: ShieldCheck, label: 'Responsible Sourcing' },
  { icon: Award, label: 'Honest Information' },
  { icon: Sparkles, label: 'Everyday Usefulness' },
  { icon: Heart, label: 'Local Hyderabad Store' },
];

export default function HeroTrustRow({ className = '' }) {
  return (
    <section aria-label="Trust highlights" className={`border-b border-soft-border/50 bg-white py-3 ${className}`}>
      <div className="mx-auto flex max-w-[1400px] gap-4 overflow-x-auto px-4 hide-scrollbar md:justify-center md:px-8">
        {TRUST_ITEMS.map(({ icon: Icon, label }) => (
          <div key={label} className="flex w-[4.5rem] flex-shrink-0 flex-col items-center gap-1.5 text-center md:w-auto md:min-w-[5.5rem]">
            <Icon className="h-5 w-5 text-deep-forest/75" strokeWidth={1.5} aria-hidden="true" />
            <span className="font-inter text-[11px] font-semibold leading-tight text-deep-forest/80 md:text-xs">{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
