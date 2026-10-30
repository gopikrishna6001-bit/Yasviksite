import { MapPin } from 'lucide-react';
import { YASVIK_SERVICE_AREA_LABEL } from '@/lib/storeLocation';

export default function DeliveryContextBar({ className = '' }) {
  return (
    <div className={`border-b border-soft-border/40 bg-warm-cream px-4 py-2 md:px-8 ${className}`}>
      <p className="mx-auto flex max-w-[1400px] items-center justify-center gap-1.5 font-inter text-[11px] font-medium text-deep-forest/75 md:text-xs">
        <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-deep-forest/60" aria-hidden="true" />
        {YASVIK_SERVICE_AREA_LABEL}
      </p>
    </div>
  );
}
