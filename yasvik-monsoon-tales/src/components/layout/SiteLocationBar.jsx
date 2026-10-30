import { MapPin } from 'lucide-react';
import { RETAIL } from '@/brand/retailTheme';

export default function SiteLocationBar({ className = '' }) {
  return (
    <div className={`border-b border-soft-border/50 bg-warm-cream ${className}`}>
      <p className="mx-auto flex h-9 max-w-[1400px] items-center justify-center gap-1.5 px-4 font-inter text-[11px] font-medium text-deep-forest/75 md:text-xs">
        <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-deep-forest/55" aria-hidden="true" />
        {RETAIL.copy.location}
      </p>
    </div>
  );
}
