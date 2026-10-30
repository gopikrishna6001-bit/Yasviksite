import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export default function RetailPageHeader({
  title,
  backTo = '',
  backLabel = 'Back',
  action,
  className = '',
}) {
  return (
    <header className={`border-b border-soft-border/50 bg-warm-cream px-4 py-3 md:px-8 ${className}`}>
      <div className="mx-auto flex max-w-[1400px] items-center gap-3">
        {backTo ? (
          <Link to={backTo} className="inline-flex items-center gap-1 font-inter text-xs font-semibold text-deep-forest/70 hover:text-deep-forest">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            {backLabel}
          </Link>
        ) : (
          <span className="w-12" />
        )}
        <h1 className="flex-1 truncate text-center font-cormorant text-lg font-semibold text-deep-forest md:text-xl">{title}</h1>
        <div className="w-12 flex-shrink-0">{action || null}</div>
      </div>
    </header>
  );
}
