import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Loader2, Package } from 'lucide-react';
import {
  buildProductSavePayload,
  productToEditorForm,
} from '@/lib/adminProductFormUtils';
import { getAdminStockEditorState, getAdminStockLabel } from '@/lib/productStockUtils';

export function buildQuickStockPayload(product, { bulkKg, variantStocks = {} }) {
  const form = productToEditorForm(product);
  if (bulkKg !== undefined && bulkKg !== '') {
    form.stock = Number(bulkKg) || 0;
  }
  if (form.variants?.length && Object.keys(variantStocks).length) {
    form.variants = form.variants.map((variant) => {
      const key = variant.sku || variant.label;
      if (variantStocks[key] === undefined) return variant;
      return { ...variant, stock: Number(variantStocks[key]) || 0 };
    });
  }
  return buildProductSavePayload(form);
}

export default function ProductQuickStockEditor({ product, onSave, isSaving = false }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const editor = getAdminStockEditorState(product);
  const [bulkKg, setBulkKg] = useState(String(editor.bulkKg));
  const [variantStocks, setVariantStocks] = useState(() =>
    Object.fromEntries(editor.variants.map((v) => [v.key, String(v.stock)]))
  );

  useEffect(() => {
    if (!open) return;
    const next = getAdminStockEditorState(product);
    setBulkKg(String(next.bulkKg));
    setVariantStocks(Object.fromEntries(next.variants.map((v) => [v.key, String(v.stock)])));
  }, [open, product]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [open]);

  const handleSave = () => {
    const payload = buildQuickStockPayload(product, {
      bulkKg: editor.mode === 'bulk' || editor.mode === 'units' ? bulkKg : undefined,
      variantStocks: editor.variants.length ? variantStocks : undefined,
    });
    onSave(payload, () => setOpen(false));
  };

  const inputMeta = editor.inputMeta || { label: 'Stock', step: '1', hint: '', suffix: '' };

  const stockLabel = getAdminStockLabel(product);
  const isLow = getAdminStockEditorState(product).bulkKg === 0;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-inter text-sm transition-colors ${
          isLow
            ? 'border-red-200 bg-red-50 text-red-600'
            : 'border-border bg-white text-rain-cloud/80 hover:border-forest-canopy/40 hover:bg-forest-canopy/5'
        }`}
        title="Quick stock entry"
      >
        <Package className="h-3.5 w-3.5 shrink-0 opacity-60" />
        <span>{stockLabel}</span>
        <ChevronDown className={`h-3.5 w-3.5 opacity-50 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-xl border border-border bg-white p-3 shadow-lg">
          <p className="mb-2 font-inter text-[11px] font-medium uppercase tracking-wide text-rain-cloud/45">
            Quick stock · {product.title}
          </p>

          {editor.mode === 'bulk' && (
            <div className="mb-3">
              <label className="mb-1 block font-inter text-xs text-rain-cloud/55">
                {inputMeta.label}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step={inputMeta.step}
                  value={bulkKg}
                  onChange={(e) => setBulkKg(e.target.value)}
                  className="w-full rounded-lg border border-border px-3 py-2 font-inter text-sm focus:border-forest-canopy focus:outline-none"
                  autoFocus
                />
                {inputMeta.suffix ? (
                  <span className="shrink-0 font-inter text-xs text-rain-cloud/45">{inputMeta.suffix}</span>
                ) : null}
              </div>
              <p className="mt-1 font-inter text-[10px] text-rain-cloud/40">
                {inputMeta.hint}
              </p>
            </div>
          )}

          {editor.mode === 'units' && (
            <div className="mb-3">
              <label className="mb-1 block font-inter text-xs text-rain-cloud/55">
                Stock (units)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={bulkKg}
                onChange={(e) => setBulkKg(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 font-inter text-sm focus:border-forest-canopy focus:outline-none"
                autoFocus
              />
            </div>
          )}

          {editor.variants.length > 0 && editor.mode === 'variants' && (
            <div className="mb-3 max-h-40 space-y-2 overflow-y-auto">
              <p className="font-inter text-xs text-rain-cloud/55">Per variant (units)</p>
              {editor.variants.map((variant) => (
                <div key={variant.key} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate font-inter text-xs text-rain-cloud/70">
                    {variant.packLabel || variant.label}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={variantStocks[variant.key] ?? ''}
                    onChange={(e) =>
                      setVariantStocks((prev) => ({ ...prev, [variant.key]: e.target.value }))
                    }
                    className="w-16 rounded-lg border border-border px-2 py-1 text-right font-inter text-xs focus:border-forest-canopy focus:outline-none"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-1.5 font-inter text-xs text-rain-cloud/50 hover:bg-muted/50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-forest-canopy px-3 py-1.5 font-inter text-xs text-white hover:bg-forest-canopy/90 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
