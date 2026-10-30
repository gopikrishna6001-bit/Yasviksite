import { Link } from 'react-router-dom';
import { Bell, BellOff, X, ShoppingBag } from 'lucide-react';

export default function PosOnlineOrderAlertBanner({
  alerts,
  alertsEnabled,
  onToggleAlerts,
  onDismiss,
  onDismissAll,
  notificationPermission,
  onRequestNotifications,
}) {
  return (
    <>
      {alerts.length > 0 && (
        <div className="mb-3 shrink-0 space-y-2" role="region" aria-label="New online orders">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-center gap-3 rounded-xl border-2 border-warm-turmeric bg-warm-turmeric/20 px-4 py-3 shadow-sm"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warm-turmeric/40">
                <ShoppingBag className="h-5 w-5 text-rain-cloud" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-inter text-sm font-semibold text-rain-cloud">
                  New online order · {alert.orderNumber}
                </p>
                <p className="font-inter text-xs text-rain-cloud/70">
                  {alert.customer} · ₹{alert.total.toLocaleString('en-IN')}
                </p>
              </div>
              <Link
                to="/admin/delivery"
                className="shrink-0 rounded-full bg-rain-cloud px-3 py-1.5 font-inter text-xs text-white hover:bg-rain-cloud/90"
              >
                Pack
              </Link>
              <button
                type="button"
                onClick={() => onDismiss(alert.id)}
                className="shrink-0 rounded-full p-1.5 text-rain-cloud/50 hover:bg-rain-cloud/10 hover:text-rain-cloud"
                aria-label="Dismiss alert"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          {alerts.length > 1 && (
            <button
              type="button"
              onClick={onDismissAll}
              className="font-inter text-xs text-rain-cloud/50 hover:text-rain-cloud underline"
            >
              Dismiss all ({alerts.length})
            </button>
          )}
        </div>
      )}
    </>
  );
}

export function PosOnlineOrderAlertToggle({
  alertsEnabled,
  onToggle,
  notificationPermission,
  onRequestNotifications,
  pendingCount = 0,
}) {
  return (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={onToggle}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-inter text-[10px] ${
          alertsEnabled
            ? 'border-warm-turmeric/60 bg-warm-turmeric/20 hover:bg-warm-turmeric/30'
            : 'border-white/20 hover:bg-white/10'
        }`}
        title={alertsEnabled ? 'Online order alerts on' : 'Online order alerts off'}
      >
        {alertsEnabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
        {alertsEnabled ? 'Alerts on' : 'Alerts off'}
        {pendingCount > 0 && alertsEnabled ? (
          <span className="ml-0.5 rounded-full bg-warm-turmeric px-1.5 py-px text-[9px] font-semibold text-rain-cloud">
            {pendingCount}
          </span>
        ) : null}
      </button>
      {alertsEnabled && notificationPermission === 'default' && onRequestNotifications ? (
        <button
          type="button"
          onClick={onRequestNotifications}
          className="px-2 py-1.5 rounded-full border border-white/15 font-inter text-[9px] text-white/70 hover:bg-white/10"
          title="Enable desktop notifications"
        >
          Notify
        </button>
      ) : null}
    </div>
  );
}
