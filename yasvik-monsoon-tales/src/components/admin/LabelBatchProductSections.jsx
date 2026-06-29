import { Loader2, Search } from 'lucide-react';
import LabelProductPickerRow from '@/components/admin/LabelProductPickerRow';
import LabelPrintQueueRow from '@/components/admin/LabelPrintQueueRow';
import LabelProductNameCell from '@/components/admin/LabelProductNameCell';
import { formatVariantOptionLabel } from '@/lib/labelProductOptions';

export function LabelBatchAddProductSection({
  search,
  onSearchChange,
  onSearchEnter,
  isLoading,
  searchResults,
  getPickerDraft,
  updatePickerDraft,
  addProductRow,
  onEditProduct,
  searchPlaceholder = 'e.g. 250 besan, 500g groundnut, or SKU…',
}) {
  return (
    <section className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="font-inter text-sm font-semibold text-rain-cloud">Add product</h2>
        <p className="font-inter text-[10px] uppercase tracking-wide text-rain-cloud/40 hidden sm:block">
          Product · Pack · Qty · Add
        </p>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rain-cloud/35" />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onSearchEnter?.();
            }
          }}
          placeholder={searchPlaceholder}
          className="w-full rounded-xl border border-border py-2.5 pl-9 pr-3 font-inter text-sm text-rain-cloud focus:border-forest-canopy focus:outline-none"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-rain-cloud/40" />
        </div>
      ) : searchResults.length === 0 ? (
        <p className="mt-3 font-inter text-sm text-rain-cloud/45 text-center py-6">No products match</p>
      ) : (
        <div className="mt-2 max-h-72 overflow-y-auto rounded-xl border border-border/40 divide-y divide-border/30">
          {searchResults.map(({ product, variantIndex: suggestedVariantIndex }) => {
            const draft = getPickerDraft(product.id, suggestedVariantIndex);
            return (
              <LabelProductPickerRow
                key={product.id}
                product={product}
                variantIndex={draft.variantIndex}
                quantity={draft.quantity}
                onVariantChange={(variantIndex) => updatePickerDraft(product.id, { variantIndex })}
                onQuantityChange={(quantity) => updatePickerDraft(product.id, { quantity })}
                onAdd={() => addProductRow(product.id, draft.variantIndex, draft.quantity)}
                onEditProduct={onEditProduct}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

export function LabelBatchQueueSection({
  queueRows,
  productsById,
  activeRowCount,
  packedDate,
  onPackedDateChange,
  onRegenerateBatchNumbers,
  updateRow,
  removeRow,
  duplicateRow,
  onEditProduct,
  packedDateLabel = 'Packed date',
}) {
  return (
    <section className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="font-inter text-sm font-semibold text-rain-cloud">
          Label queue
          {activeRowCount > 0 ? (
            <span className="ml-2 font-normal text-rain-cloud/45">({activeRowCount} lines)</span>
          ) : null}
        </h2>
        <p className="font-inter text-[10px] uppercase tracking-wide text-rain-cloud/40 hidden sm:block">
          Product · Pack · Qty
        </p>
      </div>

      {queueRows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 bg-rain-mist/20 px-4 py-12 text-center">
          <p className="font-inter text-sm text-rain-cloud/50">Search and add products above</p>
        </div>
      ) : (
        <div className="space-y-2">
          {queueRows.map((row) => {
            const product = productsById[row.productId];
            if (!product) return null;
            return (
              <div key={row.id} className="group">
                <LabelPrintQueueRow
                  rowId={row.id}
                  product={product}
                  variantIndex={row.variantIndex}
                  quantity={row.quantity}
                  onVariantChange={(variantIndex) => updateRow(row.id, { variantIndex })}
                  onQuantityChange={(quantity) => updateRow(row.id, { quantity })}
                  onRemove={() => removeRow(row.id)}
                  onEditProduct={onEditProduct}
                />
                <button
                  type="button"
                  onClick={() => duplicateRow(row)}
                  className="mt-1 ml-1 font-inter text-[10px] text-rain-cloud/35 hover:text-forest-canopy opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  + Same line again
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="font-inter text-xs text-rain-cloud/55">{packedDateLabel}</span>
          <input
            type="date"
            value={packedDate}
            onChange={(e) => onPackedDateChange(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border px-3 py-2 font-inter text-sm text-rain-cloud focus:border-forest-canopy focus:outline-none"
          />
        </label>
        <div className="flex items-end">
          <button
            type="button"
            onClick={onRegenerateBatchNumbers}
            disabled={queueRows.length === 0}
            className="w-full rounded-full border border-border px-4 py-2 font-inter text-xs text-rain-cloud/70 hover:bg-rain-mist disabled:opacity-50"
          >
            Regenerate batch nos.
          </button>
        </div>
      </div>
    </section>
  );
}

export function LabelBatchPrintManifest({ printLines, productsById, onEditProduct }) {
  if (!printLines.length) return null;

  return (
    <section className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm">
      <h2 className="font-inter text-sm font-semibold text-rain-cloud">What will print</h2>
      <ul className="mt-3 max-h-48 space-y-1.5 overflow-y-auto">
        {printLines.map((line) => {
          const product = productsById[line.productId];
          return (
            <li
              key={`${line.productId}-${line.variantIndex}`}
              className="flex justify-between gap-2 font-inter text-xs text-rain-cloud/75"
            >
              <span className="flex items-center gap-1 truncate min-w-0">
                <LabelProductNameCell
                  product={product}
                  onEditProduct={onEditProduct}
                  className="min-w-0"
                />
                <span className="shrink-0">
                  {' · '}
                  {formatVariantOptionLabel(line.variant, product)}
                </span>
              </span>
              <span className="shrink-0 font-semibold">×{line.quantity}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
