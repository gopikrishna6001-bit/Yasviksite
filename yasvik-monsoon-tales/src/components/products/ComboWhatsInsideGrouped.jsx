import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import OptimizedImage from '@/components/ui/OptimizedImage';
import { retailClasses } from '@/brand/retailTheme';
import { groupComboLines } from '@/lib/comboV2Utils';

function LineRow({ line }) {
  const inner = (
    <div className="flex items-center gap-3 rounded-xl border border-soft-border/70 bg-[#FFFAF0]/70 p-2.5">
      <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-warm-cream sm:h-16 sm:w-16">
        {line.imageUrl ? (
          <OptimizedImage
            src={line.imageUrl}
            alt={line.title}
            preset="thumb"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-inter text-[9px] text-deep-forest/35">
            Yasvik
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-inter text-[13px] font-semibold leading-snug text-deep-forest">
          {line.title}
        </p>
        {line.quantityLabel ? (
          <p className="mt-1 font-inter text-xs text-deep-forest/65">{line.quantityLabel}</p>
        ) : null}
      </div>
    </div>
  );

  if (line.href && line.itemRole !== 'free_gift') {
    return <Link to={line.href} className="block transition-opacity hover:opacity-90">{inner}</Link>;
  }
  return inner;
}

export default function ComboWhatsInsideGrouped({
  included = [],
  freeGifts = [],
  className = '',
}) {
  const headingId = useId();
  const [expanded, setExpanded] = useState(false);
  const groups = groupComboLines(included);
  const total = included.length;
  if (!total && !freeGifts.length) return null;

  const previewCount = total > 8 ? 4 : total;
  const showToggle = total > previewCount;

  return (
    <section className={className} aria-labelledby={headingId}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 id={headingId} className={retailClasses.titleMd}>
            What&apos;s inside
          </h2>
          <p className={`${retailClasses.body} mt-1`}>
            {total}
            {' '}
            included item
            {total === 1 ? '' : 's'}
            {freeGifts.length ? ` · ${freeGifts.length} free` : ''}
          </p>
        </div>
        {showToggle ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 font-inter text-sm font-semibold text-deep-forest underline-offset-2 hover:underline"
            aria-expanded={expanded}
          >
            {expanded ? 'Show less' : 'Show all'}
          </button>
        ) : null}
      </div>

      <div className="mt-4 space-y-5">
        {groups.map((group) => {
          const lines = expanded ? group.lines : group.lines.slice(0, Math.max(1, Math.ceil(previewCount / groups.length)));
          if (!lines.length) return null;
          return (
            <div key={group.key}>
              <p className="font-inter text-[11px] font-semibold uppercase tracking-[0.14em] text-deep-forest/55">
                {group.label}
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {lines.map((line) => (
                  <LineRow key={line.id} line={line} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
