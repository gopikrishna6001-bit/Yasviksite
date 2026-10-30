import { Loader2 } from 'lucide-react';

function rupees(paise) {
  return Math.round(Number(paise || 0) / 100);
}

export default function PosYasvikBonusPanel({
  preview,
  busy = false,
  billTotal = 0,
  applyBonus = true,
  onApplyChange,
  redeemRs = '',
  onRedeemRsChange,
  online = true,
  compact = false,
}) {
  if (!online) {
    return (
      <p className="font-inter text-[10px] text-rain-cloud/45 rounded-xl bg-muted/40 px-3 py-2">
        Yasvik Bonus redeem when back online — earn syncs with sale.
      </p>
    );
  }

  const balance = Number(preview?.settled_balance_paise || 0);
  if (!preview || preview.enabled === false || balance <= 0) return null;

  const suggested = Number(preview.suggested_redeem_paise || 0);
  const maxRs = Math.round(suggested / 100);
  const useRs = Math.min(
    maxRs,
    Math.max(0, Math.round(Number(redeemRs) || 0)),
  );
  const remaining = Math.max(0, balance - useRs * 100);

  return (
    <div className={`rounded-xl border border-forest-canopy/25 bg-forest-canopy/5 ${compact ? 'p-2.5 space-y-1.5' : 'p-3 space-y-2'}`}>
      <p className="font-inter text-[10px] uppercase tracking-wider text-forest-canopy/80">Yasvik Bonus</p>
      <div className={`grid grid-cols-2 gap-x-3 gap-y-1 font-inter ${compact ? 'text-[11px]' : 'text-xs'}`}>
        <span className="text-rain-cloud/55">Bonus balance</span>
        <span className="text-right font-medium text-rain-cloud tabular-nums">
          {busy ? '…' : `₹${rupees(balance)}`}
        </span>
        <span className="text-rain-cloud/55">Current bill</span>
        <span className="text-right tabular-nums text-rain-cloud">₹{Math.round(billTotal)}</span>
        {suggested > 0 ? (
          <>
            <span className="text-rain-cloud/55">Max today</span>
            <span className="text-right tabular-nums text-rain-cloud/70">₹{maxRs}</span>
            {applyBonus ? (
              <>
                <span className="text-rain-cloud/55">Use now</span>
                <span className="text-right">
                  <input
                    type="number"
                    min={1}
                    max={maxRs}
                    step={1}
                    value={redeemRs}
                    onChange={(e) => onRedeemRsChange?.(e.target.value)}
                    data-pos-allow-typing="true"
                    className={`w-20 rounded-lg border border-forest-canopy/30 bg-white px-2 py-1 text-right font-medium text-forest-canopy tabular-nums ${
                      compact ? 'text-[11px]' : 'text-xs'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => onRedeemRsChange?.(String(maxRs))}
                    className="ml-1 font-inter text-[10px] text-forest-canopy underline"
                  >
                    max
                  </button>
                </span>
              </>
            ) : (
              <>
                <span className="text-rain-cloud/55">Suggested</span>
                <span className="text-right tabular-nums text-forest-canopy font-medium">
                  ₹{maxRs}
                </span>
              </>
            )}
            <span className="text-rain-cloud/55">Remaining</span>
            <span className="text-right tabular-nums text-rain-cloud">
              ₹{rupees(applyBonus ? remaining : balance - suggested)}
            </span>
          </>
        ) : (
          <span className="col-span-2 text-rain-cloud/45 text-[10px]">
            No redeem on this bill (eligible amount or cap).
          </span>
        )}
      </div>
      {suggested > 0 ? (
        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="font-inter text-[11px] text-rain-cloud/70">Apply Yasvik Bonus?</span>
          <div className="flex gap-1">
            {[
              { id: true, label: 'YES' },
              { id: false, label: 'NO' },
            ].map((opt) => (
              <button
                key={String(opt.id)}
                type="button"
                onClick={() => onApplyChange?.(opt.id)}
                className={`rounded-full px-3 py-1 font-inter text-[11px] font-semibold border ${
                  applyBonus === opt.id
                    ? 'bg-forest-canopy text-white border-forest-canopy'
                    : 'border-border text-rain-cloud/55 bg-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {busy ? (
        <p className="font-inter text-[10px] text-rain-cloud/40 flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" /> Updating…
        </p>
      ) : null}
    </div>
  );
}
