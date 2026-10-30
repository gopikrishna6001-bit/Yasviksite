import { useMemo, useState } from 'react';
import { Save, ChevronDown, ChevronUp } from 'lucide-react';
import {
  computePackPricePreviews,
  extractProductStrategy,
  formatRupee,
  normalizePricingStrategy,
} from '@/lib/pricingStrategy';
import { isPricingMetaVariant } from '@/lib/productPricingMeta';
import { buildCategorySelectOptions, expandCategoryFilterIds } from '@/lib/categoryTree';

function productWithPackSizes(product, packSizes) {
  if (!packSizes) return product;
  const tokens = String(packSizes).split(',').map((s) => s.trim()).filter(Boolean);
  if (!tokens.length) return product;
  const existing = (product.quick_variants ?? product.variants ?? []).filter((v) => v && !isPricingMetaVariant(v));
  return { ...product, quick_variants: existing, variants: existing };
}

function strategyRowPayload(row, strategy) {
  return {
    ...row,
    price_inflate_percent: row.price_inflate_percent ?? strategy.price_inflate_percent,
    store_price_inflate_percent: row.store_price_inflate_percent ?? strategy.store_price_inflate_percent,
  };
}

export default function InvoiceRepricingPanel({
  products = [],
  categories = [],
  strategy: rawStrategy,
  categoryFilter = 'all',
  getRow,
  onApplyBatch,
  applying = false,
}) {
  const [open, setOpen] = useState(false);
  const [newCost, setNewCost] = useState('');
  const [targetCategory, setTargetCategory] = useState(categoryFilter === 'all' ? '' : categoryFilter);

  const strategy = useMemo(() => normalizePricingStrategy(rawStrategy), [rawStrategy]);

  const categoryOptions = useMemo(
    () => buildCategorySelectOptions(categories, products),
    [categories, products],
  );

  const targets = useMemo(() => {
    const cost = Number(newCost);
    if (!Number.isFinite(cost) || cost <= 0) return [];
    const categoryIds = targetCategory
      ? new Set(expandCategoryFilterIds(targetCategory, categories))
      : null;
    return products.filter((product) => {
      if (categoryIds && !categoryIds.has(product.category_id)) return false;
      return true;
    });
  }, [products, newCost, targetCategory, categories]);

  const previewRows = useMemo(() => {
    const cost = Number(newCost);
    if (!Number.isFinite(cost) || cost <= 0) return [];

    return targets.slice(0, 12).map((product) => {
      const current = extractProductStrategy(product, strategy);
      const row = getRow(product);
      const oldPacks = computePackPricePreviews(product, row, strategy);
      const newRow = { ...row, purchase_rate_per_kg: cost, dirty: true };
      const newPacks = computePackPricePreviews(product, newRow, strategy);
      const oldCost = current.purchase_rate_per_kg;
      const firstOld = oldPacks[0];
      const firstNew = newPacks[0];
      return {
        id: product.id,
        title: product.title || product.name,
        oldCost,
        newCost: cost,
        oldPack: firstOld ? `${firstOld.label} ${formatRupee(firstOld.store ?? firstOld.web)}` : '—',
        newPack: firstNew ? `${firstNew.label} ${formatRupee(firstNew.store ?? firstNew.web)}` : '—',
        newRow,
        product,
      };
    });
  }, [targets, newCost, strategy, getRow]);

  const handleUpdateAll = () => {
    const cost = Number(newCost);
    if (!Number.isFinite(cost) || cost <= 0) return;
    const rows = targets.map((product) => {
      const row = getRow(product);
      return {
        productId: product.id,
        row: { ...row, purchase_rate_per_kg: cost, dirty: true },
        product,
      };
    });
    onApplyBatch?.(rows);
  };

  return (
    <div className="mb-6 rounded-2xl border border-border/60 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-rain-mist/30 transition-colors"
      >
        <div className="text-left">
          <h2 className="font-inter text-sm font-medium text-rain-cloud">Update after supplier invoice</h2>
          <p className="font-inter text-[11px] text-rain-cloud/45 mt-0.5">
            Enter new cost rate for a category (₹/kg, ₹/L, or ₹/pc based on product measure) — preview pack prices, then update shop &amp; label prices in one step.
          </p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-rain-cloud/40" /> : <ChevronDown className="w-4 h-4 text-rain-cloud/40" />}
      </button>

      {open ? (
        <div className="px-5 pb-5 border-t border-border/40 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[10rem]">
              <label className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/45 block mb-1.5">Category</label>
              <select
                value={targetCategory}
                onChange={(e) => setTargetCategory(e.target.value)}
                className="w-full rounded-xl border border-border/70 bg-white px-3 py-2 font-inter text-sm"
              >
                <option value="">All products</option>
                {categoryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="w-36">
              <label className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/45 block mb-1.5">What we paid (₹/unit) </label>
              <input
                type="number"
                step="any"
                min="0"
                value={newCost}
                onChange={(e) => setNewCost(e.target.value)}
                placeholder="e.g. 85"
                className="w-full rounded-xl border border-border/70 bg-white px-3 py-2 font-inter text-sm"
              />
            </div>
            <button
              type="button"
              onClick={handleUpdateAll}
              disabled={applying || !targets.length || !Number(newCost)}
              className="inline-flex items-center gap-2 rounded-xl bg-wet-earth px-4 py-2 font-inter text-sm text-white hover:bg-wet-earth/90 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {applying ? 'Updating…' : `Update ${targets.length} product${targets.length === 1 ? '' : 's'}`}
            </button>
          </div>

          {previewRows.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-border/50">
              <table className="w-full text-left font-inter text-xs">
                <thead>
                  <tr className="border-b border-border/50 bg-rain-mist/30 text-rain-cloud/50 uppercase tracking-wider text-[10px]">
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2">Cost</th>
                    <th className="px-3 py-2">Sample pack price</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row) => (
                    <tr key={row.id} className="border-b border-border/40 last:border-0">
                      <td className="px-3 py-2 text-rain-cloud">{row.title}</td>
                      <td className="px-3 py-2 tabular-nums">
                        {formatRupee(row.oldCost)} → <strong>{formatRupee(row.newCost)}</strong>
                      </td>
                      <td className="px-3 py-2 tabular-nums text-rain-cloud/70">
                        {row.oldPack} → <strong className="text-forest-canopy">{row.newPack}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {targets.length > previewRows.length ? (
                <p className="px-3 py-2 font-inter text-[10px] text-rain-cloud/40 border-t border-border/40">
                  +{targets.length - previewRows.length} more product{targets.length - previewRows.length === 1 ? '' : 's'} in this batch
                </p>
              ) : null}
            </div>
          ) : Number(newCost) > 0 ? (
            <p className="font-inter text-xs text-rain-cloud/45">No products in selected category.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export { strategyRowPayload, productWithPackSizes };
