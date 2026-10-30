import { useMemo, useState } from 'react';
import { Plus, Trash2, Search } from 'lucide-react';
import {
  BUNDLE_BADGE_OPTIONS,
  computeBundleRetailValue,
  findExactVariantForQuantity,
  findVariantSkuForQuantity,
  formatNetWeightLabel,
  getBundleEditorWarnings,
  sumBundleNetWeightGrams,
  summarizeBundleCosts,
  validateBundleForSave,
} from '@/lib/productBundleUtils';
import { getComboProductTitle } from '@/lib/comboDisplayUtils';
import { productPrimaryImageUrl } from '@/lib/mediaUrl';

const EMPTY_ROW = () => ({
  product_id: '',
  quantity_value: 100,
  quantity_unit: 'g',
  pack_count: 1,
  sort_order: 0,
  is_required: true,
  substitution_allowed: false,
  is_active: true,
  component_variant_sku: '',
  component_title_snapshot: '',
});

function formatAdminRupee(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

export default function ProductBundleEditorTab({
  data,
  onChange,
  catalogProducts = [],
}) {
  const [search, setSearch] = useState('');
  const items = Array.isArray(data.bundle_items) ? data.bundle_items : [];
  const productsById = useMemo(
    () => new Map((catalogProducts || []).map((row) => [row.id, row])),
    [catalogProducts],
  );

  const computedWeight = sumBundleNetWeightGrams(items);
  const weightLabel = formatNetWeightLabel(data.bundle_total_net_weight_g || computedWeight);

  const costSummary = useMemo(
    () => summarizeBundleCosts({
      lines: items,
      productsById,
      outerPackagingCostPaise: data.bundle_outer_packaging_cost_paise || 0,
      proposedSellingPrice: Number(data.price) || 0,
    }),
    [items, productsById, data.bundle_outer_packaging_cost_paise, data.price],
  );

  const retailValue = useMemo(
    () => computeBundleRetailValue({
      bundle: {
        items,
        item_count: items.filter((row) => row.is_active !== false).length,
        total_net_weight_g: data.bundle_total_net_weight_g || computedWeight,
      },
      productsById,
      comboSellingPrice: Number(data.price) || 0,
    }),
    [items, productsById, data.price, data.bundle_total_net_weight_g, computedWeight],
  );

  const validationErrors = validateBundleForSave(
    {
      total_net_weight_g: data.bundle_total_net_weight_g || computedWeight,
      bundle_status: data.bundle_status || 'draft',
    },
    items,
  );

  const editorWarnings = useMemo(
    () => getBundleEditorWarnings(
      data,
      {
        total_net_weight_g: data.bundle_total_net_weight_g || computedWeight,
        bundle_status: data.bundle_status,
      },
      items,
      productsById,
    ),
    [data, items, productsById, computedWeight],
  );

  const searchable = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = (catalogProducts || []).filter((row) => {
      if (!row?.id) return false;
      if (row.product_kind === 'bundle_combo' || row.product_kind === 'gift_box') return false;
      if (String(row.slug || '').includes('-archived-')) return false;
      return true;
    });
    if (!q) return list.slice(0, 40);
    return list
      .filter((row) => {
        const hay = `${row.title || row.name || ''} ${row.sku || ''} ${row.slug || ''}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 40);
  }, [catalogProducts, search]);

  const setItems = (nextItems) => {
    const weight = sumBundleNetWeightGrams(nextItems);
    onChange({
      ...data,
      bundle_items: nextItems.map((row, index) => ({ ...row, sort_order: index })),
      bundle_item_count: nextItems.filter((row) => row.is_active !== false).length,
      bundle_total_net_weight_g: weight,
    });
  };

  const updateRow = (index, patch) => {
    const next = items.map((row, i) => (i === index ? { ...row, ...patch } : row));
    setItems(next);
  };

  const addProduct = (product) => {
    if (!product?.id) return;
    if (items.some((row) => row.product_id === product.id)) return;
    const qty = 100;
    const unit = 'g';
    const sku = findVariantSkuForQuantity(product, qty, unit);
    setItems([
      ...items,
      {
        ...EMPTY_ROW(),
        product_id: product.id,
        component_title_snapshot: getComboProductTitle(product),
        quantity_value: qty,
        quantity_unit: unit,
        component_variant_sku: sku || '',
        sort_order: items.length,
      },
    ]);
    setSearch('');
  };

  const removeRow = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-wet-earth/20 bg-wet-earth/5 p-4 space-y-2">
        <h4 className="font-inter text-sm font-medium text-rain-cloud/85">Bundle contents</h4>
        <p className="font-inter text-[11px] text-rain-cloud/55 leading-relaxed">
          Select existing catalogue products. Do not type free-text component names.
          This combo uses <span className="font-medium">prepacked inventory</span> — enter only physically packed units on the Pricing tab.
          Every included quantity should match a real catalogue pack (exact variant) for honest retail value.
        </p>
      </div>

      {editorWarnings.length ? (
        <div className="rounded-2xl border border-amber-700/30 bg-amber-50/90 p-4 space-y-1.5">
          <p className="font-inter text-xs font-semibold text-amber-900">Customer-facing warnings (drafts can still save)</p>
          <ul className="list-disc space-y-1 pl-4">
            {editorWarnings.map((warning) => (
              <li key={warning} className="font-inter text-[11px] text-amber-900/90">{warning}</li>
            ))}
          </ul>
          {!productPrimaryImageUrl(data) ? (
            <p className="pt-1 font-inter text-[10px] text-amber-900/70">
              Publishing is blocked until parent title, slug, image, and linked contents are complete.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="block">
          <span className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/50">Bundle badge</span>
          <select
            value={data.yasvik_mark || ''}
            onChange={(e) => onChange({ ...data, yasvik_mark: e.target.value })}
            className="mt-1 w-full rounded-xl border border-border/70 px-3 py-2 font-inter text-sm"
          >
            <option value="">None</option>
            {BUNDLE_BADGE_OPTIONS.filter(Boolean).map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <p className="mt-1 font-inter text-[10px] text-rain-cloud/45">
            Uses product Storytelling field (yasvik_mark) — e.g. Best Value, Family Favourite.
          </p>
        </label>
        <label className="block">
          <span className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/50">Perfect For</span>
          <textarea
            value={data.best_for || ''}
            onChange={(e) => onChange({ ...data, best_for: e.target.value })}
            rows={3}
            className="mt-1 w-full rounded-xl border border-border/70 px-3 py-2 font-inter text-sm"
            placeholder={'Everyday family snacking\nGifting\nOffice desk\nKids lunchbox'}
          />
          <p className="mt-1 font-inter text-[10px] text-rain-cloud/45">
            One idea per line (or comma-separated). Shown on the combo product page.
          </p>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/50">Inventory mode</span>
          <select
            value={data.bundle_inventory_mode || data.inventory_mode || 'prepacked_stock'}
            onChange={(e) => onChange({
              ...data,
              bundle_inventory_mode: e.target.value,
              inventory_mode: e.target.value,
            })}
            className="mt-1 w-full rounded-xl border border-border/70 px-3 py-2 font-inter text-sm"
          >
            <option value="prepacked_stock">prepacked_stock</option>
            <option value="made_to_order">made_to_order (future)</option>
          </select>
        </label>
        <label className="block">
          <span className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/50">Bundle status</span>
          <select
            value={data.bundle_status || 'draft'}
            onChange={(e) => onChange({ ...data, bundle_status: e.target.value })}
            className="mt-1 w-full rounded-xl border border-border/70 px-3 py-2 font-inter text-sm"
          >
            <option value="draft">draft</option>
            <option value="unresolved">unresolved</option>
            <option value="active">active</option>
            <option value="archived">archived</option>
          </select>
        </label>
      </div>

      <label className="block">
        <span className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/50">Substitution policy</span>
        <textarea
          value={data.bundle_substitution_policy || ''}
          onChange={(e) => onChange({ ...data, bundle_substitution_policy: e.target.value })}
          rows={2}
          className="mt-1 w-full rounded-xl border border-border/70 px-3 py-2 font-inter text-sm"
          placeholder="Shown on product page when set"
        />
      </label>

      <div className="rounded-2xl border border-neon-paddy/25 bg-neon-paddy/5 p-4 space-y-2">
        <p className="font-inter text-xs font-semibold text-rain-cloud/85">Current Bundle Value (admin)</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div>
            <p className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/45">Individual retail value</p>
            <p className="mt-0.5 font-inter text-sm font-semibold text-rain-cloud">
              {retailValue.allPriced
                ? formatAdminRupee(retailValue.separateTotalRs)
                : retailValue.separateTotalPartialRs != null
                  ? `${formatAdminRupee(retailValue.separateTotalPartialRs)}*`
                  : '—'}
            </p>
          </div>
          <div>
            <p className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/45">Selling price</p>
            <p className="mt-0.5 font-inter text-sm font-semibold text-rain-cloud">
              {formatAdminRupee(data.price)}
            </p>
          </div>
          <div>
            <p className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/45">Savings</p>
            <p className="mt-0.5 font-inter text-sm font-semibold text-rain-cloud">
              {retailValue.hasRealSave
                ? formatAdminRupee(retailValue.saveAmountRs)
                : retailValue.allPriced
                  ? '₹0 (no combo advantage)'
                  : '—'}
            </p>
          </div>
          <div>
            <p className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/45">Savings %</p>
            <p className="mt-0.5 font-inter text-sm font-semibold text-rain-cloud">
              {retailValue.hasRealSave && retailValue.savePct != null
                ? `${retailValue.savePct.toFixed(1)}%`
                : '—'}
            </p>
          </div>
        </div>
        {!retailValue.allPriced ? (
          <p className="font-inter text-[10px] text-amber-800/90">
            Priced lines: {retailValue.matchedLineCount}/{retailValue.totalLineCount}.
            Missing packs will not use proportional ₹/kg — add matching variants (or packs that exactly cover the qty, e.g. 2×100g for 200g).
          </p>
        ) : retailValue.coveringLineCount > 0 ? (
          <p className="font-inter text-[10px] text-rain-cloud/55">
            Retail uses catalogue packs ({retailValue.coveringLineCount} line{retailValue.coveringLineCount === 1 ? '' : 's'} priced as covering packs such as 2×100g). No ₹/kg proportion.
            {!retailValue.hasRealSave ? ' Combo price is not below separate total — customers will not see a savings benefit.' : ''}
          </p>
        ) : (
          <p className="font-inter text-[10px] text-rain-cloud/45">
            Retail value uses exact catalogue pack prices only (no ₹/kg proportion).
            {!retailValue.hasRealSave ? ' Combo price is not below separate total — customers will not see a savings benefit.' : ''}
          </p>
        )}
      </div>

      <div className="rounded-xl border border-border/60 p-3 space-y-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-rain-cloud/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product to add…"
            className="w-full rounded-xl border border-border/70 py-2 pl-9 pr-3 font-inter text-sm"
          />
        </div>
        {search.trim() ? (
          <div className="max-h-40 overflow-y-auto rounded-xl border border-border/40 divide-y divide-border/30">
            {searchable.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => addProduct(product)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-rain-mist/40"
              >
                <span className="font-inter text-xs text-rain-cloud">
                  {getComboProductTitle(product)}
                  <span className="ml-2 text-rain-cloud/40">{product.sku || product.slug}</span>
                </span>
                <Plus className="h-3.5 w-3.5 text-wet-earth" />
              </button>
            ))}
            {!searchable.length ? (
              <p className="px-3 py-2 font-inter text-xs text-rain-cloud/45">No matching products</p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="space-y-3">
        {items.map((row, index) => {
          const product = productsById.get(row.product_id);
          const exact = product
            ? findExactVariantForQuantity(product, row.quantity_value, row.quantity_unit || 'g')
            : null;
          return (
            <div key={`${row.product_id}-${index}`} className="rounded-xl border border-border/50 bg-rain-mist/15 p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-inter text-sm font-medium text-rain-cloud">
                    {row.component_title_snapshot || getComboProductTitle(product) || 'Select product'}
                  </p>
                  <p className="font-inter text-[10px] text-rain-cloud/45">
                    {product?.sku || product?.slug || row.product_id}
                  </p>
                  {exact ? (
                    <p className="mt-0.5 font-inter text-[10px] text-emerald-700">
                      Exact pack: {exact.label || exact.sku} · ₹{Number(exact.price || 0).toLocaleString('en-IN')}
                    </p>
                  ) : (
                    <p className="mt-0.5 font-inter text-[10px] text-amber-700">
                      No exact pack match for this qty — add a matching variant
                    </p>
                  )}
                </div>
                <button type="button" onClick={() => removeRow(index)} className="text-rain-cloud/35 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <label className="block">
                  <span className="font-inter text-[10px] text-rain-cloud/50">Qty</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={row.quantity_value ?? ''}
                    onChange={(e) => {
                      const quantity_value = e.target.value;
                      const sku = product
                        ? findVariantSkuForQuantity(product, quantity_value, row.quantity_unit || 'g')
                        : row.component_variant_sku;
                      updateRow(index, { quantity_value, component_variant_sku: sku || '' });
                    }}
                    className="mt-0.5 w-full rounded-lg border border-border/60 px-2 py-1.5 font-inter text-sm"
                  />
                </label>
                <label className="block">
                  <span className="font-inter text-[10px] text-rain-cloud/50">Unit</span>
                  <select
                    value={row.quantity_unit || 'g'}
                    onChange={(e) => {
                      const quantity_unit = e.target.value;
                      const sku = product
                        ? findVariantSkuForQuantity(product, row.quantity_value, quantity_unit)
                        : row.component_variant_sku;
                      updateRow(index, { quantity_unit, component_variant_sku: sku || '' });
                    }}
                    className="mt-0.5 w-full rounded-lg border border-border/60 px-2 py-1.5 font-inter text-sm"
                  >
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="unit">unit</option>
                    <option value="pack">pack</option>
                  </select>
                </label>
                <label className="block">
                  <span className="font-inter text-[10px] text-rain-cloud/50">Packs</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={row.pack_count ?? 1}
                    onChange={(e) => updateRow(index, { pack_count: e.target.value })}
                    className="mt-0.5 w-full rounded-lg border border-border/60 px-2 py-1.5 font-inter text-sm"
                  />
                </label>
                <label className="block">
                  <span className="font-inter text-[10px] text-rain-cloud/50">Variant SKU</span>
                  <input
                    value={row.component_variant_sku || ''}
                    onChange={(e) => updateRow(index, { component_variant_sku: e.target.value })}
                    className="mt-0.5 w-full rounded-lg border border-border/60 px-2 py-1.5 font-inter text-sm"
                    placeholder="optional"
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-1.5 font-inter text-[11px] text-rain-cloud/70">
                  <input
                    type="checkbox"
                    checked={row.is_required !== false}
                    onChange={(e) => updateRow(index, { is_required: e.target.checked })}
                  />
                  Required
                </label>
                <label className="flex items-center gap-1.5 font-inter text-[11px] text-rain-cloud/70">
                  <input
                    type="checkbox"
                    checked={Boolean(row.substitution_allowed)}
                    onChange={(e) => updateRow(index, { substitution_allowed: e.target.checked })}
                  />
                  Substitution allowed
                </label>
              </div>
            </div>
          );
        })}
        {!items.length ? (
          <p className="font-inter text-xs text-rain-cloud/45">No components yet — search and add products above.</p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-border/60 bg-white p-4 space-y-1.5">
        <p className="font-inter text-xs font-medium text-rain-cloud/80">Cost (internal)</p>
        <p className="font-inter text-[11px] text-rain-cloud/60">Item count: {items.length}</p>
        <p className="font-inter text-[11px] text-rain-cloud/60">Total net weight: {weightLabel || '—'}</p>
        <p className="font-inter text-[11px] text-rain-cloud/60">
          Component food cost: {costSummary.componentFoodCostKnown ? `₹${costSummary.componentFoodCostRs.toFixed(2)}` : 'incomplete (missing purchase rates)'}
        </p>
        <p className="font-inter text-[11px] text-rain-cloud/60">
          Component packaging cost: {costSummary.componentPackagingKnown ? `₹${costSummary.componentPackagingCostRs.toFixed(2)}` : 'not linked / incomplete'}
        </p>
        <label className="block pt-1">
          <span className="font-inter text-[10px] text-rain-cloud/50">Combo outer packaging cost (₹)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={((Number(data.bundle_outer_packaging_cost_paise) || 0) / 100) || ''}
            onChange={(e) => onChange({
              ...data,
              bundle_outer_packaging_cost_paise: Math.round((Number(e.target.value) || 0) * 100),
            })}
            className="mt-0.5 w-full rounded-lg border border-border/60 px-2 py-1.5 font-inter text-sm"
          />
        </label>
        <p className="font-inter text-[11px] text-rain-cloud/60">
          Total landed bundle cost: ₹{costSummary.totalLandedCostRs.toFixed(2)}
        </p>
        <p className="font-inter text-[11px] text-rain-cloud/60">
          Proposed selling price: ₹{(Number(data.price) || 0).toFixed(2)}
        </p>
        <p className="font-inter text-[11px] text-rain-cloud/60">
          Gross profit: {costSummary.grossProfitRs == null ? '—' : `₹${costSummary.grossProfitRs.toFixed(2)}`}
          {' · '}
          Margin: {costSummary.grossMarginPct == null ? '—' : `${costSummary.grossMarginPct.toFixed(1)}%`}
          {' · '}
          Max safe discount: {costSummary.maximumSafeDiscountPct == null ? '—' : `${costSummary.maximumSafeDiscountPct.toFixed(1)}%`}
        </p>
        <p className="font-inter text-[10px] text-rain-cloud/45 pt-1">
          Costs use purchase rate × included weight — not retail selling prices of components.
        </p>
      </div>

      {validationErrors.length ? (
        <div className="rounded-xl border border-amber-700/30 bg-amber-50 px-3 py-2 space-y-1">
          {validationErrors.map((err) => (
            <p key={err} className="font-inter text-[11px] text-amber-950/90">{err}</p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
