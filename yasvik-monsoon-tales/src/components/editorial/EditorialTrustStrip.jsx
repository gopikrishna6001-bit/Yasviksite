import { EDITORIAL_COPY } from '@/lib/editorialStorefront';
import { retailClasses } from '@/brand/retailTheme';

/** Lightweight proof before the first product section — no exaggerated claims. */
export default function EditorialTrustStrip() {
  const items = EDITORIAL_COPY.trustStrip || [];
  if (!items.length) return null;

  return (
    <section className="border-y border-soft-border/40 bg-white py-3" aria-label="Shopping confidence">
      <div className={retailClasses.container}>
        <ul className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 md:gap-x-3">
          {items.map((item, index) => (
            <li key={item} className="flex items-center gap-2 md:gap-3">
              {index > 0 ? (
                <span className="text-deep-forest/25" aria-hidden>
                  ·
                </span>
              ) : null}
              <span className="font-inter text-[11px] font-semibold tracking-wide text-deep-forest/70 md:text-xs">
                {item}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
