import { Link } from 'react-router-dom';
import { ChevronRight, Sprout } from 'lucide-react';

export default function FarmStoryStrip() {
  return (
    <section className="border-y border-soft-border/50 bg-gradient-to-r from-neon-paddy/8 via-warm-cream to-sun-dried-clay/8 px-4 py-10 md:px-8 md:py-12">
      <div className="mx-auto flex max-w-[1400px] flex-col items-start gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <span className="inline-flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-deep-forest text-warm-cream">
            <Sprout className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <p className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-sun-dried-clay">Our roots</p>
            <h2 className="mt-1 font-cormorant text-2xl font-semibold text-deep-forest md:text-3xl">
              From Indian fields to your family kitchen
            </h2>
            <p className="mt-2 max-w-xl font-inter text-sm leading-7 text-deep-forest/70">
              Yasvik connects everyday staples with the farmers and processes behind them — honest food for Telugu homes and beyond.
            </p>
          </div>
        </div>
        <Link
          to="/our-roots"
          className="inline-flex items-center gap-1 rounded-full bg-deep-forest px-5 py-2.5 font-inter text-xs font-bold uppercase tracking-[0.12em] text-warm-cream hover:bg-neon-paddy"
        >
          Read our story <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
