import { Link } from 'react-router-dom';
import { X, AlertTriangle, Calculator } from 'lucide-react';
import LabelProductNameCell from '@/components/admin/LabelProductNameCell';
import { buildVariantOptions, formatVariantOptionLabel, formatLabelPriceSummary, resolveVariantPricing } from '@/lib/labelProductOptions';

export default function LabelPrintQueueRow({
  rowId,
  product,
  variantIndex,
  quantity,
  priceChannel = 'web',
  onVariantChange,
  onQuantityChange,
  onRemove,
  onEditProduct,
  onRefreshProduct,
}) {
  if (!product) return null;

  const variants = buildVariantOptions(product);
  const name = product.title || product.name || 'Product';
  const selectedVariant = variants[variantIndex ?? 0] || variants[0];
  const priceSummary = formatLabelPriceSummary(product, selectedVariant, priceChannel);
  const pricing = resolveVariantPricing(product, selectedVariant, priceChannel);
  const missingPrice = pricing.sellingPrice == null || pricing.sellingPrice === '' || Number(pricing.sellingPrice) <= 0;

  return (
    <div className="space-y-2">
      {missingPrice ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="font-inter text-xs text-amber-800 flex-1">No price set — update in Pricing before printing.</p>
          <Link
            to={`/admin/pricing?product=${product.id}`}
            className="inline-flex items-center gap-1 font-inter text-xs font-medium text-wet-earth hover:underline"
          >
            <Calculator className="h-3 w-3" /> Update prices
          </Link>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-white px-3 py-2.5 sm:flex-nowrap">
        <LabelProductNameCell
          product={product}
          onEditProduct={onEditProduct}
          className="flex-1 basis-full sm:basis-auto sm:max-w-[30%]"
        />

        <span
          className="shrink-0 rounded-md bg-wet-earth/10 px-2.5 py-1 font-inter text-sm font-bold tabular-nums text-wet-earth"
          title="Label price"
        >
          {priceSummary}
        </span>

        <select
          value={variantIndex ?? 0}
          onChange={(e) => onVariantChange(Number(e.target.value))}
          className="min-w-[7.5rem] flex-1 rounded-lg border border-border px-2.5 py-2 font-inter text-sm text-rain-cloud focus:border-forest-canopy focus:outline-none sm:flex-none sm:w-36"
          aria-label={`Pack size for ${name}`}
        >
          {variants.map((variant, index) => (
            <option key={variant.optionKey || `${variant.label}-${index}`} value={index}>
              {formatVariantOptionLabel(variant, product, priceChannel)}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1.5 shrink-0">
          <label className="sr-only" htmlFor={`qty-${rowId}`}>Quantity</label>
          <input
            id={`qty-${rowId}`}
            type="number"
            min="0"
            max="999"
            value={Math.max(0, Number(quantity) || 0)}
            onChange={(e) => onQuantityChange(Math.max(0, Number(e.target.value) || 0))}
            className="w-16 rounded-lg border border-border px-2 py-2 font-inter text-sm text-right text-rain-cloud focus:border-forest-canopy focus:outline-none"
            aria-label={`Label count for ${name}`}
          />
          <span className="font-inter text-[10px] text-rain-cloud/40 hidden sm:inline">labels</span>
        </div>

        {onRefreshProduct ? (
          <button
            type="button"
            onClick={() => onRefreshProduct(product.id)}
            className="shrink-0 rounded-lg px-2 py-1.5 font-inter text-[10px] text-wet-earth hover:bg-wet-earth/5"
          >
            Refresh
          </button>
        ) : null}

        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 p-2 text-rain-cloud/35 hover:text-red-500 rounded-lg hover:bg-red-50"
          title="Remove line"
          aria-label={`Remove ${name}`}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
