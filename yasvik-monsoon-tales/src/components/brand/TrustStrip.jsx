import { Heart, ShieldCheck, ShoppingBasket, Tag, Truck } from 'lucide-react';
import { TRUST_POINTS } from '@/brand/monsoonTokens';

const ICONS = {
  shield: ShieldCheck,
  tag: Tag,
  basket: ShoppingBasket,
  truck: Truck,
  heart: Heart,
};

export default function TrustStrip({ className = '' }) {
  return (
    <section
      className={`border-y border-soft-border bg-white px-4 py-5 md:px-8 ${className}`}
      aria-label="Why families trust Yasvik"
    >
      <div className="mx-auto flex max-w-[1400px] gap-3 overflow-x-auto hide-scrollbar md:grid md:grid-cols-5 md:gap-4 md:overflow-visible">
        {TRUST_POINTS.map((point) => {
          const Icon = ICONS[point.icon] || ShieldCheck;
          return (
            <div
              key={point.label}
              className="flex min-w-[9.5rem] flex-shrink-0 items-center gap-2.5 rounded-2xl border border-soft-border bg-warm-cream px-3.5 py-3 md:min-w-0 md:flex-col md:px-4 md:py-4 md:text-center"
            >
              <span className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-neon-paddy/12 text-neon-paddy">
                <Icon className="h-4 w-4" strokeWidth={2} />
              </span>
              <span className="font-inter text-xs font-bold leading-snug text-deep-forest md:text-[13px]">
                {point.label}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
