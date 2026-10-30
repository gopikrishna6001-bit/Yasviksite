import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { appClient } from '@/api/appClient';
import { formatPaiseInr } from '@/lib/customerCrmUtils';

function StatCard({ label, value, to }) {
  const inner = (
    <div className="bg-white rounded-2xl border border-border/40 p-4 hover:border-forest-canopy/30 transition-colors">
      <p className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/40">{label}</p>
      <p className="font-cormorant text-3xl text-rain-cloud mt-1">{value}</p>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

export default function AdminRetention() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-retention'],
    queryFn: async () => {
      const res = await appClient.functions.invoke('getRetentionStats', {});
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
  });

  const t = data?.totals || {};

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <AdminPageHeader
        title="Retention"
        description="Who to nurture next — no automatic messages are sent from here"
        action={(
          <Link
            to="/admin/campaigns"
            className="rounded-full border border-border bg-white px-4 py-2 font-inter text-xs text-rain-cloud"
          >
            Campaign drafts
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
            <StatCard label="Customers" value={t.customers ?? 0} to="/admin/customers" />
            <StatCard label="New (30d)" value={t.new_30d ?? 0} to="/admin/customers?filter=new" />
            <StatCard label="Repeat" value={t.repeat ?? 0} to="/admin/customers?filter=repeat" />
            <StatCard
              label="Returning revenue"
              value={formatPaiseInr(t.returning_revenue_paise)}
              to="/admin/customers?filter=repeat"
            />
            <StatCard label="Need reorder" value={t.needs_reorder ?? 0} to="/admin/customers?filter=repeat" />
            <StatCard label="Inactive 30d" value={t.inactive_30 ?? 0} to="/admin/customers?filter=inactive_30" />
            <StatCard label="Inactive 60d" value={t.inactive_60 ?? 0} to="/admin/customers?filter=inactive_60" />
            <StatCard label="Inactive 90d" value={t.inactive_90 ?? 0} to="/admin/customers?filter=inactive_90" />
          </div>

          <div className="mt-6 grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-border/40 p-4">
              <p className="font-inter text-xs uppercase tracking-wider text-rain-cloud/45 mb-3">
                Most valuable customers
              </p>
              <ul className="space-y-2">
                {(data?.top_value || []).map((c) => (
                  <li key={c.id}>
                    <Link to={`/admin/customers/${c.id}`} className="flex justify-between font-inter text-sm hover:text-forest-canopy">
                      <span>{c.name || c.phone_digits}</span>
                      <span>{formatPaiseInr(c.lifetime_spend_paise)}</span>
                    </Link>
                  </li>
                ))}
                {!data?.top_value?.length && (
                  <li className="font-inter text-xs text-rain-cloud/40">No data yet</li>
                )}
              </ul>
            </div>
            <div className="bg-white rounded-2xl border border-border/40 p-4">
              <p className="font-inter text-xs uppercase tracking-wider text-rain-cloud/45 mb-3">
                Most reordered products
              </p>
              <ul className="space-y-2">
                {(data?.top_reordered_products || []).map((p) => (
                  <li key={p.title} className="flex justify-between font-inter text-sm text-rain-cloud">
                    <span>{p.title}</span>
                    <span className="text-rain-cloud/45">{p.count} buys</span>
                  </li>
                ))}
                {!data?.top_reordered_products?.length && (
                  <li className="font-inter text-xs text-rain-cloud/40">No data yet</li>
                )}
              </ul>
            </div>
          </div>

          <div className="mt-4 bg-white rounded-2xl border border-border/40 p-4">
            <p className="font-inter text-xs uppercase tracking-wider text-rain-cloud/45 mb-3">
              Customers needing reorder
            </p>
            <ul className="space-y-2">
              {(data?.needs_reorder || []).map((c) => (
                <li key={c.id}>
                  <Link to={`/admin/customers/${c.id}`} className="flex justify-between font-inter text-sm hover:text-forest-canopy">
                    <span>{c.name || c.phone_digits}</span>
                    <span className="text-rain-cloud/45 text-xs">
                      {c.insights?.likely_reorder_at
                        ? new Date(c.insights.likely_reorder_at).toLocaleDateString('en-IN')
                        : '—'}
                    </span>
                  </Link>
                </li>
              ))}
              {!data?.needs_reorder?.length && (
                <li className="font-inter text-xs text-rain-cloud/40">Nobody in the reorder window right now</li>
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
