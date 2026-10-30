import { Package, Store, Truck } from 'lucide-react';

const ITEMS = [
  { icon: Store, label: 'Free store pickup' },
  { icon: Truck, label: 'Home delivery available' },
  { icon: Package, label: 'Secure packaging' },
];

export default function DeliveryPromoStrip({ className = '' }) {
  return (
    <section className={`border-y border-soft-border/40 bg-white py-3 ${className}`}>
      <div className="mx-auto grid max-w-[1400px] grid-cols-3 gap-2 px-4 md:px-8">
        {ITEMS.map(({ icon: Icon, label }) => (
          <div key={label} className="flex flex-col items-center gap-1 text-center">
            <Icon className="h-4 w-4 text-deep-forest/70" strokeWidth={1.6} aria-hidden="true" />
            <span className="font-inter text-[11px] font-medium leading-tight text-deep-forest/75 md:text-xs">
              {label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
