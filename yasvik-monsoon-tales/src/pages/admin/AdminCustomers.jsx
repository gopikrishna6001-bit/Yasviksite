import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Download, Search, Users } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { appClient } from '@/api/appClient';
import {
  CUSTOMER_FILTERS,
  customersToCsv,
  formatPaiseInr,
  formatTagLabel,
} from '@/lib/customerCrmUtils';
import { format } from 'date-fns';

export default function AdminCustomers() {
  const [params, setParams] = useSearchParams();
  const filter = params.get('filter') || '';
  const q = params.get('q') || '';
  const [searchInput, setSearchInput] = useState(q);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-customers', filter, q],
    queryFn: async () => {
      const res = await appClient.functions.invoke('listCustomers', { filter, q, limit: 100 });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data?.customers || [];
    },
  });

  const customers = data || [];

  const setFilter = (id) => {
    const next = new URLSearchParams(params);
    if (id) next.set('filter', id);
    else next.delete('filter');
    setParams(next);
  };

  const runSearch = (e) => {
    e?.preventDefault?.();
    const next = new URLSearchParams(params);
    if (searchInput.trim()) next.set('q', searchInput.trim());
    else next.delete('q');
    setParams(next);
  };

  const exportCsv = () => {
    const csv = customersToCsv(customers);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yasvik-customers-${filter || 'all'}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeFilterLabel = useMemo(
    () => CUSTOMER_FILTERS.find((f) => f.id === filter)?.label || 'All customers',
    [filter]
  );

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <AdminPageHeader
        title="Customers"
        description="Phone-keyed profiles across website, store, and WhatsApp orders"
        action={(
          <button
            type="button"
            onClick={exportCsv}
            disabled={!customers.length}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 font-inter text-xs text-rain-cloud disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        )}
      />

      <form onSubmit={runSearch} className="mt-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rain-cloud/35" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search name, mobile, or invoice #"
            className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-border font-inter text-sm"
          />
        </div>
        <button type="submit" className="px-4 py-2.5 rounded-xl bg-rain-cloud text-white font-inter text-sm">
          Search
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setFilter('')}
          className={`px-3 py-1 rounded-full font-inter text-[11px] border ${
            !filter ? 'bg-rain-cloud text-white border-rain-cloud' : 'border-border text-rain-cloud/55'
          }`}
        >
          All
        </button>
        {CUSTOMER_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1 rounded-full font-inter text-[11px] border ${
              filter === f.id ? 'bg-rain-cloud text-white border-rain-cloud' : 'border-border text-rain-cloud/55'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <p className="mt-3 font-inter text-xs text-rain-cloud/45">
        {activeFilterLabel} · {customers.length} shown
      </p>

      {isLoading ? (
        <div className="mt-6 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-white/60 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <p className="mt-6 font-inter text-sm text-amber-700">{error.message}</p>
      ) : !customers.length ? (
        <div className="mt-10 text-center">
          <Users className="w-8 h-8 text-rain-cloud/25 mx-auto mb-2" />
          <p className="font-inter text-sm text-rain-cloud/45">No customers match this view</p>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {customers.map((c) => (
            <Link
              key={c.id}
              to={`/admin/customers/${c.id}`}
              className="block bg-white rounded-2xl border border-border/40 px-4 py-3 hover:border-forest-canopy/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-inter text-sm font-medium text-rain-cloud">
                    {c.name || 'Customer'} · {c.phone_digits}
                  </p>
                  <p className="font-inter text-[11px] text-rain-cloud/45 mt-0.5">
                    {c.order_count || 0} orders · {formatPaiseInr(c.lifetime_spend_paise)} LTV
                    {c.preferred_channel ? ` · ${c.preferred_channel}` : ''}
                    {c.last_order_at
                      ? ` · last ${format(new Date(c.last_order_at), 'dd MMM yyyy')}`
                      : ''}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {[...(c.auto_tags || []), ...(c.manual_tags || [])].slice(0, 6).map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded-full bg-forest-canopy/8 font-inter text-[10px] text-forest-canopy"
                      >
                        {formatTagLabel(t)}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="font-cormorant text-lg text-rain-cloud shrink-0">
                  {formatPaiseInr(c.avg_order_value_paise)}
                  <span className="block font-inter text-[9px] text-rain-cloud/40 uppercase tracking-wider">AOV</span>
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
