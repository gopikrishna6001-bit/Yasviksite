import { EDITORIAL_COPY } from '@/lib/editorialStorefront';
import { retailClasses } from '@/brand/retailTheme';

export default function EditorialPromiseTicker() {
  const items = EDITORIAL_COPY.ticker;
  if (!items?.length) return null;

  return (
    <section className="border-y border-soft-border/40 bg-white py-2.5 md:py-3" aria-label="Yasvik promise">
      <div className={retailClasses.container}>
        <ul className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 md:gap-x-5">
          {items.map((item, index) => (
            <li key={item} className="flex items-center gap-3 md:gap-5">
              {index > 0 ? (
                <span className="select-none text-[10px] text-deep-forest/35" aria-hidden>
                  ♥
                </span>
              ) : null}
              <span className="font-inter text-[11px] font-bold uppercase tracking-[0.14em] text-deep-forest/75 md:text-xs">
                {item}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
