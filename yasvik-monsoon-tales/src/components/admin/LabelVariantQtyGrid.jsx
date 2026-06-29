import { buildVariantOptions, formatVariantOptionLabel } from '@/lib/labelProductOptions';

function emptyQtyMap(product) {
  const map = {};
  buildVariantOptions(product).forEach((_, index) => {
    map[index] = 0;
  });
  return map;
}

export function initVariantQtyMap(product) {
  return emptyQtyMap(product);
}

export function sumVariantQtys(qtyMap = {}) {
  return Object.values(qtyMap).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
}

export function setAllVariantQtys(product, qty) {
  const map = {};
  buildVariantOptions(product).forEach((_, index) => {
    map[index] = Math.max(0, Number(qty) || 0);
  });
  return map;
}

export default function LabelVariantQtyGrid({
  product,
  qtys = {},
  onChange,
  compact = false,
}) {
  if (!product) return null;

  const variants = buildVariantOptions(product);
  const lineTotal = sumVariantQtys(qtys);

  return (
    <div className={compact ? '' : 'mt-3'}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <p className="font-inter text-[11px] text-rain-cloud/50">
          {variants.length} variant{variants.length === 1 ? '' : 's'} · {lineTotal} label{lineTotal === 1 ? '' : 's'}
        </p>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => onChange(setAllVariantQtys(product, 1))}
            className="rounded-full border border-border px-2.5 py-1 font-inter text-[10px] text-rain-cloud/65 hover:bg-rain-mist"
          >
            1 each
          </button>
          <button
            type="button"
            onClick={() => onChange(emptyQtyMap(product))}
            className="rounded-full border border-border px-2.5 py-1 font-inter text-[10px] text-rain-cloud/65 hover:bg-rain-mist"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/60">
        <table className="w-full min-w-[280px] text-left">
          <thead>
            <tr className="border-b border-border/50 bg-rain-mist/40">
              <th className="px-3 py-2 font-inter text-[10px] font-semibold uppercase tracking-wide text-rain-cloud/45">
                Pack
              </th>
              <th className="px-3 py-2 font-inter text-[10px] font-semibold uppercase tracking-wide text-rain-cloud/45">
                SKU
              </th>
              <th className="px-3 py-2 font-inter text-[10px] font-semibold uppercase tracking-wide text-rain-cloud/45 text-right">
                Price
              </th>
              <th className="px-3 py-2 font-inter text-[10px] font-semibold uppercase tracking-wide text-rain-cloud/45 text-right w-24">
                Labels
              </th>
            </tr>
          </thead>
          <tbody>
            {variants.map((variant, index) => {
              const qty = Math.max(0, Number(qtys[index]) || 0);
              const active = qty > 0;
              return (
                <tr
                  key={variant.optionKey || `${variant.label}-${index}`}
                  className={active ? 'bg-forest-canopy/5' : 'border-t border-border/30'}
                >
                  <td className="px-3 py-2 font-inter text-xs text-rain-cloud">
                    {variant.label || 'Standard pack'}
                  </td>
                  <td className="px-3 py-2 font-mono text-[10px] text-rain-cloud/50">
                    {variant.sku || '—'}
                  </td>
                  <td className="px-3 py-2 font-inter text-xs text-rain-cloud/70 text-right">
                    {variant.price != null ? `₹${variant.price}` : '—'}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      min="0"
                      max="999"
                      value={qty}
                      onChange={(e) =>
                        onChange({
                          ...qtys,
                          [index]: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className={`w-16 rounded-lg border px-2 py-1.5 font-inter text-sm text-right focus:border-forest-canopy focus:outline-none ${
                        active ? 'border-forest-canopy/40 bg-white' : 'border-border bg-white'
                      }`}
                      aria-label={`Labels for ${formatVariantOptionLabel(variant, product)}`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
