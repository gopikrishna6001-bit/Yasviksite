import { RETAIL } from '@/brand/retailTheme';

export default function RetailTrustLine({ className = '' }) {
  return (
    <p className={`py-4 text-center font-inter text-[10px] tracking-wide text-deep-forest/45 md:text-xs ${className}`}>
      {RETAIL.copy.trustFooter}
    </p>
  );
}
