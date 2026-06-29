import { buildVariantOptions, formatVariantOptionLabel } from '@/lib/labelProductOptions';

export default function LabelVariantPicker({ product, value, onChange, className = '' }) {
  if (!product) return null;

  const options = buildVariantOptions(product);

  return (
    <label className={`block ${className}`}>
      <span className="font-inter text-xs text-rain-cloud/55">Pack / weight</span>
      <select
        value={value ?? 0}
        onChange={(e) => onChange(Number(e.target.value), options[Number(e.target.value)] || options[0])}
        className="mt-1 w-full rounded-xl border border-border px-3 py-2 font-inter text-sm text-rain-cloud focus:border-forest-canopy focus:outline-none"
      >
        {options.map((variant, index) => (
          <option key={variant.optionKey || `${variant.label}-${index}`} value={index}>
            {formatVariantOptionLabel(variant, product)}
          </option>
        ))}
      </select>
    </label>
  );
}
