import { EDITORIAL_COPY } from '@/lib/editorialStorefront';
import { retailClasses } from '@/brand/retailTheme';
import { YASVIK_BRAND } from '@/brand/yasvikManifesto';

/** Short brand statement under the campaign — introduce Yasvik, then let shop begin. */
export default function EditorialBrandIntro() {
  return (
    <section className="bg-warm-cream py-6 md:py-8" aria-label="Yasvik brand statement">
      <div className={`${retailClasses.container} max-w-2xl text-center`}>
        <p className={retailClasses.label}>Yasvik</p>
        <h1 className="mt-2 font-cormorant text-3xl font-semibold leading-snug text-deep-forest md:text-4xl">
          {EDITORIAL_COPY.principle}
        </h1>
        <p className={`${retailClasses.body} mt-3 mx-auto max-w-xl`}>
          {EDITORIAL_COPY.support}
        </p>
        <p className={`${retailClasses.body} mt-2 mx-auto max-w-xl text-deep-forest/55`}>
          {YASVIK_BRAND.promise}
        </p>
      </div>
    </section>
  );
}
