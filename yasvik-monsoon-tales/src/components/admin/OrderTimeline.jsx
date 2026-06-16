import { format } from 'date-fns';
import { STATUS_CONFIG } from './OrderStatusBadge';

export default function OrderTimeline({ timeline = [] }) {
  if (!timeline.length) return (
    <p className="font-inter text-xs text-rain-cloud/35 italic">No timeline events yet.</p>
  );

  return (
    <div className="relative">
      <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />
      <div className="space-y-4">
        {[...timeline].reverse().map((entry, i) => {
          const cfg = STATUS_CONFIG[entry.status] || {};
          return (
            <div key={i} className="flex gap-4 pl-8 relative">
              <div className={`absolute left-1.5 top-1.5 w-3 h-3 rounded-full border-2 border-white ring-1 ring-border ${i === 0 ? 'bg-forest-canopy' : 'bg-temple-stone'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-inter text-xs font-medium text-rain-cloud">
                    {cfg.label || entry.status}
                  </span>
                  {entry.timestamp && (
                    <span className="font-inter text-[10px] text-rain-cloud/35">
                      {format(new Date(entry.timestamp), 'dd MMM yyyy, h:mm a')}
                    </span>
                  )}
                  {entry.updated_by && (
                    <span className="font-inter text-[10px] text-rain-cloud/30">· {entry.updated_by}</span>
                  )}
                </div>
                {entry.note && (
                  <p className="font-inter text-xs text-rain-cloud/55 mt-0.5 italic">"{entry.note}"</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}