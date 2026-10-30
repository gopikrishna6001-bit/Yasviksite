import {
  formatBulkSavingsPack,
  formatBulkSavingsShort,
  formatCartBulkSavingsTotal,
} from '@/lib/variantBulkSavings';

export function PackSavingsChip({ savings, className = '' }) {
  if (!savings?.savingsPerKg) return null;
  return (
    <span className={`inline-block rounded-full border border-deep-forest/15 bg-warm-cream px-1.5 py-0.5 font-inter text-[9px] font-semibold tracking-wide text-deep-forest/75 ${className}`}>
      {formatBulkSavingsShort(savings)}
    </span>
  );
}

export default function PackSavingsBadge({ savings, qty = 1, surface = 'detail', className = '' }) {
  const text = formatBulkSavingsPack(savings, qty, surface);
  if (!text) return null;
  return (
    <p className={`font-inter text-[11px] leading-snug text-deep-forest/65 ${className}`}>
      {text}
    </p>
  );
}

export function CartFairValueLine({ total, className = '' }) {
  const text = formatCartBulkSavingsTotal(total);
  if (!text) return null;
  return (
    <p className={`font-inter text-[11px] text-deep-forest/70 ${className}`}>
      {text}
    </p>
  );
}
