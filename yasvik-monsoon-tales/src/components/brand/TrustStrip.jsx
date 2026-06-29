import { Heart, MapPin, ShieldCheck, ShoppingBasket, Truck } from 'lucide-react';
import { TRUST_POINTS } from '@/brand/monsoonTokens';

const ICONS = {
  shield: ShieldCheck,
  basket: ShoppingBasket,
  truck: Truck,
  heart: Heart,
  pin: MapPin,
};

export default function TrustStrip({ className = '' }) {
  return (
    <section
      className={`border-y border-soft-border bg-white px-4 py-6 md:px-8 md:py-7 ${className}`}
      aria-label="How Yasvik serves you"
    >
      <div className="mx-auto grid max-w-[1400px] grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-4 md:gap-4">
        {TRUST_POINTS.map((point) => {
          const Icon = ICONS[point.icon] || ShieldCheck;
          return (
            <div
              key={point.label}
              className="flex items-center gap-3 rounded-2xl border border-soft-border bg-warm-cream px-3.5 py-3.5 md:flex-col md:gap-2.5 md:px-4 md:py-4 md:text-center"
            >
              <span className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-neon-paddy/12 text-neon-paddy md:h-9 md:w-9">
                <Icon className="h-[1.125rem] w-[1.125rem] md:h-4 md:w-4" strokeWidth={2} />
              </span>
              <span className="font-inter text-[13px] font-bold leading-snug text-deep-forest sm:text-sm md:text-[13px]">
                {point.label}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
