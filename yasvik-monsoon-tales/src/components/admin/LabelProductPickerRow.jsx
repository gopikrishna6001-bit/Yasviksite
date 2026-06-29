import { Plus } from 'lucide-react';
import LabelProductNameCell from '@/components/admin/LabelProductNameCell';
import { buildVariantOptions, formatVariantOptionLabel } from '@/lib/labelProductOptions';

export default function LabelProductPickerRow({
  product,
  variantIndex,
  quantity,
  onVariantChange,
  onQuantityChange,
  onAdd,
  onEditProduct,
}) {
  if (!product) return null;

  const variants = buildVariantOptions(product);
  const name = product.title || product.name || 'Product';
  const qty = Math.max(1, Number(quantity) || 1);

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 sm:flex-nowrap hover:bg-rain-mist/40">
      <LabelProductNameCell
        product={product}
        onEditProduct={onEditProduct}
        className="flex-1 basis-full sm:basis-auto sm:max-w-[34%]"
      />

      <select
        value={variantIndex ?? 0}
        onChange={(e) => onVariantChange(Number(e.target.value))}
        className="min-w-[7rem] flex-1 rounded-lg border border-border px-2 py-1.5 font-inter text-sm text-rain-cloud focus:border-forest-canopy focus:outline-none sm:flex-none sm:w-36"
        aria-label={`Pack size for ${name}`}
      >
        {variants.map((variant, index) => (
          <option key={variant.optionKey || `${variant.label}-${index}`} value={index}>
            {formatVariantOptionLabel(variant, product)}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-1 shrink-0">
        <label className="sr-only" htmlFor={`pick-qty-${product.id}`}>Quantity</label>
        <input
          id={`pick-qty-${product.id}`}
          type="number"
          min="1"
          max="999"
          value={qty}
          onChange={(e) => onQuantityChange(Math.max(1, Number(e.target.value) || 1))}
          className="w-14 rounded-lg border border-border px-2 py-1.5 font-inter text-sm text-right text-rain-cloud focus:border-forest-canopy focus:outline-none"
          aria-label={`Label count for ${name}`}
        />
      </div>

      <button
        type="button"
        onClick={onAdd}
        className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-forest-canopy/10 px-3 py-1.5 font-inter text-xs font-medium text-forest-canopy hover:bg-forest-canopy/20"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        Add
      </button>
    </div>
  );
}
