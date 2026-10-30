import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { appClient } from '@/api/appClient';
import { formatPaiseInr } from '@/lib/customerCrmUtils';

function StatCard({ label, value, hint }) {
  return (
    <div className="bg-white rounded-2xl border border-border/40 p-4">
      <p className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/40">{label}</p>
      <p className="font-cormorant text-3xl text-rain-cloud mt-1">{value}</p>
      {hint ? <p className="font-inter text-[10px] text-rain-cloud/45 mt-1">{hint}</p> : null}
    </div>
  );
}

export default function AdminBonus() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-bonus-dashboard'],
    queryFn: async () => {
      const res = await appClient.functions.invoke('getBonusDashboard', {});
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    staleTime: 60 * 1000,
  });

  const ratePct = data?.historical_redemption_rate != null
    ? `${Math.round(Number(data.historical_redemption_rate) * 1000) / 10}%`
    : '—';

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <AdminPageHeader
        title="Yasvik Bonus"
        description="Outstanding balance, redemption exposure, and programme health"
        action={(
          <Link
            to="/admin/customers"
            className="rounded-full border border-border bg-white px-4 py-2 font-inter text-xs text-rain-cloud"
          >
            All customers
          </Link>
        )}
      />

      {isLoading ? (
        <p className="mt-6 font-inter text-sm text-rain-cloud/45">Loading…</p>
      ) : error ? (
        <p className="mt-6 font-inter text-sm text-amber-700">{error.message}</p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Bonus issued" value={formatPaiseInr(data.bonus_issued_paise)} />
            <StatCard label="Bonus redeemed" value={formatPaiseInr(data.bonus_redeemed_paise)} />
            <StatCard
              label="Outstanding bonus balance"
              value={formatPaiseInr(data.outstanding_bonus_balance_paise)}
            />
            <StatCard
              label="Expiring soon"
              value={formatPaiseInr(data.expiring_soon_paise)}
              hint={`Within ${data.reminder_days_before ?? 30} days`}
            />
            <StatCard label="Historical redemption rate" value={ratePct} />
            <StatCard
              label="Est. redemption exposure"
              value={formatPaiseInr(data.estimated_redemption_exposure_paise)}
            />
            <StatCard label="Customers with bonus" value={data.customers_with_bonus ?? 0} />
            <StatCard label="Avg redemption" value={formatPaiseInr(data.average_redemption_paise)} />
          </div>

          <p className="mt-6 font-inter text-[11px] text-rain-cloud/45">
            Snapshot as of {format(new Date(), 'dd MMM yyyy, h:mm a')}. Earn rates and caps are managed in Settings
            (database). Expiry job runs daily on the worker.
          </p>
        </>
      )}
    </div>
  );
}
