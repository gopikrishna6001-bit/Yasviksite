import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { appClient } from '@/api/appClient';
import { products } from '@/services/api';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { ArrowDownCircle, ArrowUpCircle, Loader2, Package } from 'lucide-react';

const REASON_LABELS = {
  sale_web: 'Web sale',
  sale_pos: 'POS sale',
  purchase: 'Stock in',
  adjustment: 'Adjustment',
  return: 'Return',
  damage: 'Damage / loss',
  count: 'Stock count',
  transfer: 'Transfer',
};

function formatDelta(row) {
  const parts = [];
  if (row.delta_units) {
    parts.push(`${row.delta_units > 0 ? '+' : ''}${row.delta_units} units`);
  }
  if (row.delta_kg) {
    parts.push(`${row.delta_kg > 0 ? '+' : ''}${row.delta_kg} kg`);
  }
  return parts.join(' · ') || '—';
}

export default function AdminInventory() {
  const qc = useQueryClient();
  const [reasonFilter, setReasonFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('');
  const [form, setForm] = useState({
    product_id: '',
    delta_units: '',
    delta_kg: '',
    reason: 'purchase',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const { data: productList = [] } = useQuery({
    queryKey: ['admin-inventory-products'],
    queryFn: () => products.list('name', 500),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-stock-movements', productFilter],
    queryFn: async () => {
      const res = await appClient.functions.invoke('listStockMovements', {
        limit: 200,
        product_id: productFilter || undefined,
      });
      return res.data?.movements || [];
    },
  });

  const movements = data || [];

  const filtered = useMemo(() => {
    if (reasonFilter === 'all') return movements;
    return movements.filter((row) => row.reason === reasonFilter);
  }, [movements, reasonFilter]);

  const handleStockIn = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.product_id) {
      setFormError('Select a product');
      return;
    }
    const units = form.delta_units === '' ? 0 : Number(form.delta_units);
    const kg = form.delta_kg === '' ? 0 : Number(form.delta_kg);
    if (!units && !kg) {
      setFormError('Enter units or kg to adjust');
      return;
    }

    setSaving(true);
    try {
      await appClient.functions.invoke('recordStockAdjustment', {
        product_id: form.product_id,
        delta_units: units,
        delta_kg: kg,
        reason: form.reason,
        notes: form.notes || null,
      });
      setForm({ product_id: form.product_id, delta_units: '', delta_kg: '', reason: 'purchase', notes: '' });
      qc.invalidateQueries(['admin-stock-movements']);
      qc.invalidateQueries(['admin-inventory-products']);
    } catch (err) {
      setFormError(err?.message || 'Stock update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto pb-24">
      <AdminPageHeader
        title="Inventory ledger"
        description="Stock movements from sales, POS, and manual stock-in"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <form onSubmit={handleStockIn} className="lg:col-span-1 bg-white rounded-2xl border border-border/20 p-5 space-y-4 h-fit">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-forest-canopy" />
            <h2 className="font-inter text-sm font-medium text-rain-cloud">Record stock change</h2>
          </div>
          <select
            value={form.product_id}
            onChange={(e) => setForm((prev) => ({ ...prev, product_id: e.target.value }))}
            className="w-full px-3 py-2.5 border border-border rounded-xl font-inter text-sm"
          >
            <option value="">Select product…</option>
            {productList.map((p) => (
              <option key={p.id} value={p.id}>{p.title || p.name}</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Units (+/−)"
              value={form.delta_units}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '' || raw === '-' || /^-?\d*$/.test(raw)) {
                  setForm((prev) => ({ ...prev, delta_units: raw }));
                }
              }}
              className="admin-number-box px-3 py-2.5 border border-border rounded-xl font-inter text-sm"
            />
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="Kg (+/−)"
              value={form.delta_kg}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '' || raw === '-' || /^-?\d*\.?\d*$/.test(raw)) {
                  setForm((prev) => ({ ...prev, delta_kg: raw }));
                }
              }}
              className="admin-number-box px-3 py-2.5 border border-border rounded-xl font-inter text-sm"
            />
          </div>
          <select
            value={form.reason}
            onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
            className="w-full px-3 py-2.5 border border-border rounded-xl font-inter text-sm"
          >
            <option value="purchase">Purchase / stock in</option>
            <option value="adjustment">Adjustment</option>
            <option value="return">Customer return</option>
            <option value="damage">Damage / loss</option>
            <option value="count">Stock count correction</option>
          </select>
          <textarea
            placeholder="Notes (optional)"
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            rows={2}
            className="w-full px-3 py-2.5 border border-border rounded-xl font-inter text-sm resize-none"
          />
          {formError ? <p className="font-inter text-xs text-red-600">{formError}</p> : null}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-full bg-forest-canopy text-white font-inter text-sm disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : 'Save movement'}
          </button>
        </form>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-border/20 overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 p-4 border-b border-border/15">
            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="px-3 py-1.5 border border-border rounded-full font-inter text-xs"
            >
              <option value="">All products</option>
              {productList.map((p) => (
                <option key={p.id} value={p.id}>{p.title || p.name}</option>
              ))}
            </select>
            <select
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value)}
              className="px-3 py-1.5 border border-border rounded-full font-inter text-xs"
            >
              <option value="all">All reasons</option>
              {Object.entries(REASON_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {isLoading ? (
            <p className="p-8 text-center font-inter text-sm text-rain-cloud/45">Loading ledger…</p>
          ) : filtered.length === 0 ? (
            <p className="p-8 text-center font-inter text-sm text-rain-cloud/45">No stock movements yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/40 border-b border-border/10">
                    <th className="px-4 py-3">When</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Change</th>
                    <th className="px-4 py-3">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => {
                    const isIn = (row.delta_units || 0) > 0 || (row.delta_kg || 0) > 0;
                    return (
                      <tr key={row.id} className="border-b border-border/5 font-inter text-xs text-rain-cloud/70">
                        <td className="px-4 py-3 whitespace-nowrap">
                          {row.created_at ? format(new Date(row.created_at), 'dd MMM, h:mm a') : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-rain-cloud">{row.product_name || row.product_id?.slice(0, 8)}</p>
                          {row.variant_sku ? <p className="text-[10px] text-rain-cloud/40">{row.variant_sku}</p> : null}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 ${isIn ? 'text-forest-canopy' : 'text-sun-dried-clay'}`}>
                            {isIn ? <ArrowUpCircle className="w-3.5 h-3.5" /> : <ArrowDownCircle className="w-3.5 h-3.5" />}
                            {formatDelta(row)}
                          </span>
                        </td>
                        <td className="px-4 py-3 capitalize">{REASON_LABELS[row.reason] || row.reason}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
