import { X } from 'lucide-react';
import { getSellableVariants } from '@/lib/posCatalog';
import { formatVariantPackSize, resolveProductMeasureType } from '@/lib/productStockUtils';
import { resolvePosVariantPrice } from '@/lib/pricingStrategy';

export default function PosVariantPicker({ open, product, onSelect, onClose }) {
  if (!open || !product) return null;

  const variants = getSellableVariants(product);
  const measureType = resolveProductMeasureType(product);
  const title = product.title || product.name || 'Product';

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-rain-cloud/50 p-4" data-pos-allow-typing="true">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border">
          <div>
            <p className="font-inter text-[10px] font-bold uppercase tracking-[0.2em] text-rain-cloud/45">
              Pick pack size
            </p>
            <h3 className="font-cormorant text-xl text-rain-cloud leading-tight">{title}</h3>
            {product.sku ? (
              <p className="font-inter text-xs text-rain-cloud/45 mt-1">Barcode: {product.sku}</p>
            ) : null}
          </div>
          <button type="button" onClick={onClose} className="p-1 text-rain-cloud/40 hover:text-rain-cloud" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-3 space-y-2">
          {variants.map((variant) => {
            const price = resolvePosVariantPrice(variant, product);
            return (
              <button
                key={variant.sku || variant.label}
                type="button"
                onClick={() => onSelect(variant)}
                className="w-full flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 text-left hover:border-forest-canopy/40 hover:bg-forest-canopy/5 transition-colors"
              >
                <div>
                  <p className="font-inter text-sm font-semibold text-rain-cloud">{variant.label}</p>
                  {variant.pack_kg ? (
                    <p className="font-inter text-[11px] text-rain-cloud/45 mt-0.5">{formatVariantPackSize(variant, measureType)}</p>
                  ) : null}
                </div>
                <span className="font-inter text-sm font-bold text-forest-canopy">₹{price}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
