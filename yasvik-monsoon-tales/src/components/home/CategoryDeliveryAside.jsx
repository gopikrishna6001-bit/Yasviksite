import { Package, Store, Truck } from 'lucide-react';

const ITEMS = [
  { icon: Store, label: 'Free store pickup' },
  { icon: Truck, label: 'Home delivery available' },
  { icon: Package, label: 'Secure packaging' },
];

export default function CategoryDeliveryAside({ className = '' }) {
  return (
    <aside
      className={`w-[11rem] flex-shrink-0 flex-col gap-4 rounded-xl border border-soft-border/70 bg-warm-cream/50 px-4 py-5 ${className}`}
      aria-label="Delivery highlights"
    >
      {ITEMS.map(({ icon: Icon, label }) => (
        <div key={label} className="flex flex-col items-center gap-2 text-center">
          <Icon className="h-5 w-5 text-deep-forest/70" strokeWidth={1.6} aria-hidden="true" />
          <span className="font-inter text-[11px] font-semibold leading-snug text-deep-forest/78">
            {label}
          </span>
        </div>
      ))}
    </aside>
  );
}
