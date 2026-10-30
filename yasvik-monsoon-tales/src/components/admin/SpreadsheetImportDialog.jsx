import { X } from 'lucide-react';

export default function SpreadsheetImportDialog({
  open,
  fileName,
  preview = [],
  skipped = [],
  totalPlanned = 0,
  onConfirm,
  onCancel,
  busy = false,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-rain-cloud/50" onClick={onCancel} aria-label="Close" />
      <div className="relative max-h-[85vh] w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <div>
            <h3 className="font-inter text-sm font-medium text-rain-cloud">Review import</h3>
            <p className="font-inter text-xs text-rain-cloud/50 mt-0.5">{fileName}</p>
          </div>
          <button type="button" onClick={onCancel} className="rounded-lg p-1.5 text-rain-cloud/40 hover:bg-rain-mist/50">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 max-h-[50vh] space-y-3">
          <p className="font-inter text-sm text-rain-cloud">
            Will update <strong>{totalPlanned}</strong> product{totalPlanned === 1 ? '' : 's'}.
            {skipped.length > 0 ? ` Skipping ${skipped.length} row${skipped.length === 1 ? '' : 's'}.` : ''}
          </p>

          {preview.map((item) => (
            <div key={item.id} className="rounded-xl border border-border/50 bg-rain-mist/20 px-3 py-2.5">
              <p className="font-inter text-xs font-medium text-rain-cloud">{item.title}</p>
              <ul className="mt-1.5 space-y-0.5">
                {item.changes.map((change) => (
                  <li key={`${item.id}-${change.field}`} className="font-inter text-[11px] text-rain-cloud/60">
                    {change.field}: <span className="text-rain-cloud/40">{change.from}</span>
                    {' → '}
                    <span className="text-forest-canopy font-medium">{change.to}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {totalPlanned > preview.length ? (
            <p className="font-inter text-[11px] text-rain-cloud/40">
              +{totalPlanned - preview.length} more product{totalPlanned - preview.length === 1 ? '' : 's'} not shown
            </p>
          ) : null}

          {skipped.length > 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2">
              <p className="font-inter text-[11px] font-medium text-amber-800">Skipped rows</p>
              <ul className="mt-1 space-y-0.5">
                {skipped.slice(0, 5).map((item, i) => (
                  <li key={`skip-${i}`} className="font-inter text-[10px] text-amber-700/80">
                    Row {item.row}: {item.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-border/60 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-xl px-4 py-2 font-inter text-sm text-rain-cloud/60 hover:bg-rain-mist/50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy || totalPlanned === 0}
            className="rounded-xl bg-forest-canopy px-4 py-2 font-inter text-sm text-white hover:bg-forest-canopy/90 disabled:opacity-50"
          >
            {busy ? 'Importing…' : `Import ${totalPlanned} product${totalPlanned === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
