import { useEffect, useMemo, useState } from 'react';
import { Barcode, Check, Copy, Eye, EyeOff, Loader2, Pencil, Save } from 'lucide-react';
import {
  buildQuickOpsPayload,
  isQuickOpsDirty,
  productToQuickOpsDraft,
} from '@/lib/productQuickOpsUtils';
import OptimizedImage from '@/components/ui/OptimizedImage';
import { productPrimaryImageUrl } from '@/lib/mediaUrl';
import { downloadSkuBarcodeJpeg } from '@/lib/skuBarcodeLabel';
import { STOCK_MEASURE_TYPE_OPTIONS, getStockInputMeta, usesBulkMeasureType } from '@/lib/stockMeasureTypes';

const inputClass =
  'w-full rounded-lg border border-border px-2 py-1.5 font-inter text-xs text-rain-cloud focus:border-forest-canopy focus:outline-none bg-white';
const selectClass =
  'w-full rounded-lg border border-border px-2 py-1.5 font-inter text-xs text-rain-cloud focus:border-forest-canopy focus:outline-none bg-white';
const numInputClass =
  'rounded-lg border border-border bg-white px-1.5 py-1.5 font-inter text-sm tabular-nums text-rain-cloud text-right focus:border-forest-canopy focus:outline-none';
const cellClass = 'px-2 py-2.5 align-middle';

export default function ProductQuickOpsRow({
  product,
  categories = [],
  onSave,
  onEdit,
  onDuplicate,
  onDraftChange,
  isSaving = false,
  saveStatus = null,
}) {
  const baseline = useMemo(() => productToQuickOpsDraft(product), [product]);
  const [draft, setDraft] = useState(baseline);
  const [barcodeBusy, setBarcodeBusy] = useState(false);

  const skuForBarcode = String(draft.sku || product.sku || '').trim();

  useEffect(() => {
    if (!isQuickOpsDirty(product, draft)) {
      setDraft(productToQuickOpsDraft(product));
    }
  }, [product]);

  const dirty = isQuickOpsDirty(product, draft);
  const stockMeta = getStockInputMeta(draft.stock_measure_type);
  const bulkByMeasure = usesBulkMeasureType(draft.stock_measure_type);
  const showBulkStock = bulkByMeasure || (!bulkByMeasure && draft.variants.length === 0);
  const showVariantStock = !bulkByMeasure && draft.variants.length > 0;

  useEffect(() => {
    if (!onDraftChange) return;
    try {
      onDraftChange(product.id, {
        dirty,
        payload: dirty ? buildQuickOpsPayload(product, draft) : null,
      });
    } catch (error) {
      console.error('Quick ops draft error:', product.id, error);
      onDraftChange(product.id, { dirty: true, payload: null });
    }
  }, [product, draft, dirty, onDraftChange]);

  const patch = (updates) => setDraft((prev) => ({ ...prev, ...updates }));

  const handleSave = () => {
    if (!dirty) return;
    onSave(buildQuickOpsPayload(product, draft));
  };

  const handleBarcodeDownload = async () => {
    if (!skuForBarcode) {
      alert('Enter or assign a SKU first, then download the barcode label.');
      return;
    }
    setBarcodeBusy(true);
    try {
      await downloadSkuBarcodeJpeg({ ...product, sku: skuForBarcode });
    } catch (error) {
      alert(error?.message || 'Barcode download failed');
    } finally {
      setBarcodeBusy(false);
    }
  };

  const handleReset = () => setDraft(productToQuickOpsDraft(product));

  return (
    <tr
      className={`border-b border-border/50 transition-colors ${
        dirty ? 'bg-amber-50/60 hover:bg-amber-50/80' : 'hover:bg-muted/20'
      }`}
    >
      <td className={`${cellClass} w-11`}>
        {product.hero_image ? (
          <OptimizedImage
            src={productPrimaryImageUrl(product, null)}
            alt=""
            preset="thumb"
            className="h-9 w-9 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-temple-stone/20 text-base">
            🌾
          </div>
        )}
      </td>

      <td className={`${cellClass}`}>
        <p className="font-inter text-sm font-medium leading-snug text-rain-cloud line-clamp-2">
          {product.title}
        </p>
        {dirty ? (
          <p className="mt-0.5 font-inter text-[10px] font-medium text-amber-700">Unsaved</p>
        ) : null}
      </td>

      <td className={cellClass}>
        <select
          value={draft.stock_measure_type}
          onChange={(e) => patch({ stock_measure_type: e.target.value })}
          className={selectClass}
          aria-label="Measure type"
        >
          {STOCK_MEASURE_TYPE_OPTIONS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.short}
            </option>
          ))}
        </select>
      </td>

      <td className={cellClass}>
        <select
          value={draft.category_id}
          onChange={(e) => patch({ category_id: e.target.value })}
          className={selectClass}
          aria-label="Category"
        >
          <option value="">—</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.emotional_title || c.name}
            </option>
          ))}
        </select>
      </td>

      <td className={cellClass}>
        <input
          type="text"
          value={draft.local_name}
          onChange={(e) => patch({ local_name: e.target.value })}
          placeholder="తెలుగు పేరు"
          className={inputClass}
          dir="auto"
          aria-label="Telugu name"
        />
      </td>

      <td className={`${cellClass} text-right`}>
        <div className="space-y-1">
          {showBulkStock ? (
            <>
              <div className="flex items-center justify-end gap-1">
                <input
                  type="number"
                  min="0"
                  step={stockMeta.step}
                  value={draft.bulkStock}
                  onChange={(e) => patch({ bulkStock: e.target.value })}
                  className={`${numInputClass} w-[4.25rem]`}
                  aria-label={stockMeta.label}
                />
                {stockMeta.suffix ? (
                  <span className="w-5 shrink-0 font-inter text-[10px] text-rain-cloud/45">{stockMeta.suffix}</span>
                ) : null}
              </div>
              {draft.variants.length > 0 && bulkByMeasure ? (
                <p
                  className="line-clamp-1 font-inter text-[9px] leading-tight text-rain-cloud/35"
                  title={draft.variants.map((v) => v.packLabel || v.label).join(' · ')}
                >
                  {draft.variants.map((v) => v.packLabel || v.label).join(' · ')}
                </p>
              ) : null}
            </>
          ) : null}

          {showVariantStock ? (
            <div className="flex flex-col gap-1">
              {draft.variants.map((variant) => (
                <div key={variant.key} className="flex items-center justify-end gap-1">
                  <span
                    className="max-w-[3.5rem] truncate font-inter text-[9px] text-rain-cloud/50"
                    title={variant.packLabel || variant.label}
                  >
                    {variant.packLabel || variant.label}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={draft.variantStocks[variant.key] ?? ''}
                    onChange={(e) =>
                      patch({
                        variantStocks: {
                          ...draft.variantStocks,
                          [variant.key]: e.target.value,
                        },
                      })
                    }
                    className={`${numInputClass} w-[2.75rem] text-xs`}
                  />
                </div>
              ))}
            </div>
          ) : null}

          {!showBulkStock && !showVariantStock ? (
            <span className="block text-center font-inter text-[10px] text-rain-cloud/35">—</span>
          ) : null}
        </div>
      </td>

      <td className={cellClass}>
        <input
          type="text"
          value={draft.sku}
          onChange={(e) => patch({ sku: e.target.value })}
          placeholder="SKU"
          className={inputClass}
          aria-label="SKU"
        />
      </td>

      <td className={`${cellClass} text-right`}>
        <div className="relative ml-auto w-full max-w-[6.5rem]">
          <span className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 font-inter text-xs text-rain-cloud/45">
            ₹
          </span>
          <input
            type="number"
            min="0"
            step="1"
            value={draft.price}
            onChange={(e) => patch({ price: e.target.value })}
            className={`${numInputClass} w-full pl-4 pr-1 font-medium`}
            aria-label="Price in rupees"
          />
        </div>
      </td>

      <td className={`${cellClass} text-center`}>
        <input
          type="number"
          step="1"
          value={draft.sort_order}
          onChange={(e) => patch({ sort_order: e.target.value })}
          className={`${numInputClass} mx-auto w-[3rem] text-xs`}
          aria-label="Sort order"
          title="Lower numbers appear first"
        />
      </td>

      <td className={`${cellClass} text-center`}>
        <button
          type="button"
          onClick={() => patch({ is_published: !draft.is_published })}
          className={`rounded-lg p-1.5 transition-colors ${
            draft.is_published
              ? 'text-forest-canopy hover:bg-forest-canopy/10'
              : 'text-rain-cloud/35 hover:bg-muted/50'
          }`}
          title={draft.is_published ? 'Published — click to draft' : 'Draft — click to publish'}
        >
          {draft.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
      </td>

      <td className={`${cellClass} text-center`}>
        <div className="flex flex-col items-center gap-0.5">
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || isSaving}
            className={`inline-flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 font-inter text-[11px] transition-colors disabled:opacity-40 ${
              dirty
                ? 'bg-forest-canopy text-white hover:bg-forest-canopy/90'
                : 'border border-border text-rain-cloud/40'
            }`}
            title="Save changes"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : saveStatus === 'saved' ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            <span className="sr-only">Save</span>
          </button>
          {dirty ? (
            <button
              type="button"
              onClick={handleReset}
              className="rounded py-0.5 font-inter text-[10px] text-rain-cloud/40 hover:text-rain-cloud/70"
              title="Reset row"
            >
              Reset
            </button>
          ) : null}
        </div>
      </td>

      <td className={`${cellClass} overflow-visible text-right`}>
        <div className="flex items-center justify-end gap-0.5 whitespace-nowrap">
          <button
            type="button"
            onClick={handleBarcodeDownload}
            disabled={!skuForBarcode || barcodeBusy}
            className="rounded-lg p-1.5 text-rain-cloud/35 transition-colors hover:bg-forest-canopy/10 hover:text-forest-canopy disabled:opacity-30"
            title={skuForBarcode ? 'Download 50×25mm SKU barcode (JPEG)' : 'Add SKU to download barcode'}
            aria-label="Download barcode"
          >
            {barcodeBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Barcode className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => onDuplicate?.(product)}
            className="rounded-lg p-1.5 text-rain-cloud/50 transition-colors hover:bg-forest-canopy/10 hover:text-forest-canopy"
            title="Duplicate product"
            aria-label="Duplicate product"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onEdit?.(product)}
            className="rounded-lg p-1.5 text-rain-cloud/35 transition-colors hover:bg-wet-earth/10 hover:text-wet-earth"
            title="Full editor"
            aria-label="Edit product"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
