import { computePackBulkSavings } from '@/lib/variantBulkSavings';
import { PackSavingsChip } from '@/components/products/PackSavingsBadge';

export default function VariantPackPicker({
  variants = [],
  selectedVariant = null,
  onSelect,
  size = 'md',
  className = '',
}) {
  if (!variants.length) return null;

  const isSelected = (variant) => (
    selectedVariant?.label === variant.label
    && (selectedVariant?.sku || '') === (variant.sku || '')
  );

  const sizeClasses = size === 'sm'
    ? 'px-2.5 py-1 text-[10px]'
    : 'px-3 py-2 text-xs';

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {variants.map((variant, index) => {
        const savings = computePackBulkSavings(variants, variant);
        const active = isSelected(variant);
        return (
          <button
            key={`${variant.sku || variant.label}-${index}`}
            type="button"
            onClick={() => onSelect?.(variant)}
            className={`rounded-lg border text-left font-inter transition-colors ${
              active
                ? 'border-deep-forest bg-deep-forest text-warm-cream'
                : 'border-soft-border bg-white text-deep-forest/70 hover:border-deep-forest/25'
            } ${sizeClasses}`}
          >
            <span className="font-bold">{variant.label}</span>
            {savings?.tierLabel ? (
              <span className={`mt-0.5 block text-[9px] font-medium ${active ? 'text-warm-cream/85' : 'text-deep-forest/50'}`}>
                <PackSavingsChip savings={savings} className={active ? 'border-warm-cream/25 bg-warm-cream/10 text-warm-cream' : ''} />
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
