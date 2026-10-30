import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

/** Reusable collapsible panel for admin pages (Pricing Strategy, Products, etc.). */
export default function AdminCollapseSection({
  title,
  description,
  defaultOpen = false,
  badge,
  className = '',
  children,
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`rounded-xl border border-border/50 bg-white overflow-hidden ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-rain-mist/30 transition-colors text-left"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-inter text-sm font-medium text-rain-cloud">{title}</h3>
            {badge ? (
              <span className="rounded-full bg-rain-mist/80 px-2 py-0.5 font-inter text-[10px] font-medium text-rain-cloud/55">
                {badge}
              </span>
            ) : null}
          </div>
          {description ? (
            <p className="font-inter text-[11px] text-rain-cloud/45 mt-0.5">{description}</p>
          ) : null}
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-rain-cloud/35 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-rain-cloud/35 flex-shrink-0" />
        )}
      </button>
      {open ? (
        <div className="px-4 pb-4 border-t border-border/30 pt-4 space-y-4">{children}</div>
      ) : null}
    </div>
  );
}
