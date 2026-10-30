import { Link } from 'react-router-dom';
import { MapPin, Package } from 'lucide-react';
import { STORE_GEOGRAPHY } from '@/brand/monsoonTokens';

export default function UtilityTopBar() {
  return (
    <div className="fixed inset-x-0 top-0 z-50 hidden border-b border-deep-forest/10 bg-deep-forest text-warm-cream md:block">
      <div className="mx-auto flex h-9 max-w-[1480px] items-center justify-between gap-3 px-4 text-[11px] font-semibold md:px-8">
        <p className="truncate font-inter tracking-wide text-warm-cream/90">
          Sourced with care · {STORE_GEOGRAPHY.city} delivery
        </p>
        <div className="flex flex-shrink-0 items-center gap-4">
          <Link to="/contact" className="inline-flex items-center gap-1 font-inter hover:text-neon-paddy">
            <MapPin className="h-3 w-3" aria-hidden="true" />
            Store
          </Link>
          <Link to="/profile#orders" className="inline-flex items-center gap-1 font-inter hover:text-neon-paddy">
            <Package className="h-3 w-3" aria-hidden="true" />
            Track order
          </Link>
        </div>
      </div>
    </div>
  );
}
