import { Link } from 'react-router-dom';
import { Compass, HandHeart, ScrollText } from 'lucide-react';
import { YASVIK_BRAND, YASVIK_CHOICE_PILLARS } from '@/brand/yasvikManifesto';
import { retailClasses } from '@/brand/retailTheme';

const ICONS = [Compass, HandHeart, ScrollText];

export default function HomeWhyYasvikChose() {
  return (
    <section className="border-b border-soft-border/40 bg-white px-4 py-8 md:px-8 md:py-10" aria-labelledby="why-yasvik-chose-heading">
      <div className={retailClasses.container}>
        <p className={retailClasses.label}>{YASVIK_BRAND.tagline}</p>
        <h2 id="why-yasvik-chose-heading" className={`mt-2 ${retailClasses.titleLg}`}>
          Why we choose carefully
        </h2>
        <p className={`mt-2 max-w-2xl ${retailClasses.body}`}>
          {YASVIK_BRAND.support}
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {YASVIK_CHOICE_PILLARS.map(({ title, body }, index) => {
            const Icon = ICONS[index] || Compass;
            return (
              <div key={title} className="rounded-2xl border border-soft-border/70 bg-warm-cream/40 p-5">
                <Icon className="h-6 w-6 text-deep-forest/70" strokeWidth={1.5} aria-hidden="true" />
                <h3 className={`mt-3 ${retailClasses.titleMd}`}>{title}</h3>
                <p className={`mt-2 ${retailClasses.body}`}>{body}</p>
              </div>
            );
          })}
        </div>
        <Link
          to="/about"
          className="mt-6 inline-flex items-center gap-1 font-inter text-xs font-bold text-neon-paddy hover:text-deep-forest"
        >
          Read the full story
        </Link>
      </div>
    </section>
  );
}
