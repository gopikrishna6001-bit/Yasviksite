import { computeBundleRetailValue, parsePerfectForTags } from '@/lib/productBundleUtils';

function formatRupee(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

/**
 * Customer-facing combo value card.
 * Shows separate vs combo vs save when every line can be priced from catalogue packs.
 */
export default function BundleValueCard({
  bundle,
  comboPrice,
  perfectFor = '',
  badge = '',
  className = '',
  showTotals = false,
  compact = false,
}) {
  if (!bundle) return null;

  const productsById = new Map((bundle.products || []).map((row) => [row.id, row]));
  const value = computeBundleRetailValue({
    bundle,
    productsById,
    comboSellingPrice: comboPrice,
  });
  const tags = parsePerfectForTags(perfectFor);
  const showSavings = Boolean(value.hasRealSave);

  if (!showSavings && !showTotals && !tags.length && !badge) {
    return null;
  }

  return (
    <section className={`space-y-4 ${className}`}>
      {(showTotals || showSavings || badge) ? (
        <div className="overflow-hidden rounded-2xl border border-soft-border bg-white shadow-[0_10px_28px_rgba(31,61,43,0.05)]">
          {badge ? (
            <div className="border-b border-soft-border/70 bg-sun-dried-clay/10 px-4 py-2">
              <span className="font-inter text-[11px] font-bold uppercase tracking-[0.14em] text-sun-dried-clay">
                {badge}
              </span>
            </div>
          ) : null}

          {showTotals ? (
            <div className="grid grid-cols-2 gap-px bg-soft-border/60 sm:grid-cols-3">
              <Stat label="Total products" value={String(value.itemCount || '—')} />
              <Stat label="Total weight" value={value.netWeightLabel || '—'} />
              <Stat
                label="Combo price"
                value={value.comboPriceRs != null ? formatRupee(value.comboPriceRs) : '—'}
                className="col-span-2 sm:col-span-1"
              />
            </div>
          ) : null}

          {showSavings ? (
            <div className={compact ? 'space-y-3 p-4' : 'space-y-4 p-5'}>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="font-inter text-[11px] font-bold uppercase tracking-[0.14em] text-deep-forest/45">
                    If bought separately
                  </p>
                  <p className="mt-1 font-cormorant text-2xl font-semibold text-deep-forest/45 line-through md:text-3xl">
                    {formatRupee(value.separateTotalRs)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-inter text-[11px] font-bold uppercase tracking-[0.14em] text-deep-forest/45">
                    Combo price
                  </p>
                  <p className="mt-1 font-cormorant text-3xl font-semibold text-deep-forest md:text-4xl">
                    {formatRupee(value.comboPriceRs)}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-deep-forest px-4 py-3 text-warm-cream">
                <div>
                  <p className="font-inter text-[11px] font-bold uppercase tracking-[0.14em] text-warm-cream/70">
                    You save with this combo
                  </p>
                  <p className="mt-0.5 font-inter text-xs text-warm-cream/80">
                    Same products · better together
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-cormorant text-3xl font-semibold leading-none">
                    {formatRupee(value.saveAmountRs)}
                  </p>
                  {value.savePct != null && value.savePct >= 1 ? (
                    <p className="mt-1 font-inter text-[11px] font-bold uppercase tracking-wider text-warm-cream/75">
                      {Math.round(value.savePct)}% less
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {tags.length > 0 ? (
        <div>
          <h3 className="font-inter text-sm font-semibold text-deep-forest">Perfect for</h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {tags.slice(0, 3).map((tag) => (
              <li
                key={tag}
                className="inline-flex items-center gap-1.5 rounded-full border border-soft-border bg-warm-cream/80 px-3 py-1.5 font-inter text-xs font-semibold text-deep-forest"
              >
                {tag}
              </li>
            ))}
            {tags.length > 3 ? (
              <li className="inline-flex items-center rounded-full border border-soft-border/70 bg-white px-3 py-1.5 font-inter text-xs font-semibold text-deep-forest/55">
                +{tags.length - 3} more
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function Stat({ label, value, className = '' }) {
  return (
    <div className={`bg-white px-4 py-3 ${className}`}>
      <p className="font-inter text-[10px] font-bold uppercase tracking-[0.12em] text-deep-forest/45">{label}</p>
      <p className="mt-1 font-cormorant text-xl font-semibold text-deep-forest sm:text-2xl">{value}</p>
    </div>
  );
}

export function formatBundleSaveLabel(saveAmountRs) {
  const n = Number(saveAmountRs);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `Save ₹${Math.round(n).toLocaleString('en-IN')}`;
}
