import { Droplets, Heart, Leaf, ShieldCheck } from 'lucide-react';

const DEFAULT_FEATURES = [
  { icon: Leaf, label: '100% Natural & Pure' },
  { icon: Droplets, label: 'Traditional process' },
  { icon: ShieldCheck, label: 'Quality checked' },
  { icon: Heart, label: 'Family trusted' },
];

export default function ProductFeatureGrid({ items = [] }) {
  const features = items.length
    ? items.slice(0, 4).map((label, i) => ({ icon: DEFAULT_FEATURES[i]?.icon || Leaf, label }))
    : DEFAULT_FEATURES;

  return (
    <div className="grid grid-cols-2 gap-2">
      {features.map(({ icon: Icon, label }) => (
        <div key={label} className="flex items-center gap-2 rounded-lg border border-soft-border/70 bg-warm-cream/40 px-2.5 py-2">
          <Icon className="h-3.5 w-3.5 flex-shrink-0 text-deep-forest/60" strokeWidth={1.6} aria-hidden="true" />
          <span className="font-inter text-[10px] font-medium leading-snug text-deep-forest/75">{label}</span>
        </div>
      ))}
    </div>
  );
}
