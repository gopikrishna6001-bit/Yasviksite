import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Check, Percent, Plus, Ticket, ToggleLeft, ToggleRight, X } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { appClient } from '@/api/appClient';
import { normalizeCouponCode } from '@/lib/couponUtils';
import { format } from 'date-fns';

const EMPTY_FORM = {
  id: null,
  code: '',
  name: '',
  description: '',
  discount_type: 'percent',
  discount_value: '10',
  min_order_rs: '',
  max_discount_rs: '',
  starts_at: '',
  ends_at: '',
  usage_limit: '',
  per_customer_limit: '1',
  channels: 'both',
  is_active: true,
};

function toDatetimeLocal(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function couponToForm(coupon) {
  return {
    id: coupon.id,
    code: coupon.code || '',
    name: coupon.name || '',
    description: coupon.description || '',
    discount_type: coupon.discount_type || 'percent',
    discount_value: String(coupon.discount_value ?? ''),
    min_order_rs: coupon.min_order_paise ? String(Math.round(coupon.min_order_paise / 100)) : '',
    max_discount_rs: coupon.max_discount_paise ? String(Math.round(coupon.max_discount_paise / 100)) : '',
    starts_at: toDatetimeLocal(coupon.starts_at),
    ends_at: toDatetimeLocal(coupon.ends_at),
    usage_limit: coupon.usage_limit != null ? String(coupon.usage_limit) : '',
    per_customer_limit: coupon.per_customer_limit == null ? '' : String(coupon.per_customer_limit),
    channels: coupon.channels || 'both',
    is_active: coupon.is_active !== false,
  };
}

function formToPayload(form) {
  return {
    id: form.id || undefined,
    code: normalizeCouponCode(form.code),
    name: form.name.trim() || normalizeCouponCode(form.code),
    description: form.description.trim() || null,
    discount_type: form.discount_type,
    discount_value: Number(form.discount_value),
    min_order_paise: form.min_order_rs ? Math.round(Number(form.min_order_rs) * 100) : 0,
    max_discount_paise: form.max_discount_rs ? Math.round(Number(form.max_discount_rs) * 100) : null,
    starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
    ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
    usage_limit: form.usage_limit === '' ? null : Number(form.usage_limit),
    per_customer_limit: form.per_customer_limit === '' ? null : Number(form.per_customer_limit),
    channels: form.channels,
    is_active: form.is_active,
  };
}

function formatValue(coupon) {
  if (coupon.discount_type === 'fixed') return `₹${Number(coupon.discount_value).toFixed(0)} off`;
  return `${Number(coupon.discount_value)}%`;
}

export default function AdminCoupons() {
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: async () => {
      const res = await appClient.functions.invoke('listCoupons', {});
      return res.data?.coupons || [];
    },
  });

  const coupons = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await appClient.functions.invoke('upsertCoupon', payload);
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries(['admin-coupons']);
      setDrawerOpen(false);
      setForm(EMPTY_FORM);
      setError('');
    },
    onError: (err) => setError(err?.message || 'Save failed'),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }) => {
      const res = await appClient.functions.invoke('deactivateCoupon', { id, is_active });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries(['admin-coupons']),
  });

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setError('');
    setDrawerOpen(true);
  };

  const openEdit = (coupon) => {
    setForm(couponToForm(coupon));
    setError('');
    setDrawerOpen(true);
  };

  const handleCopy = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied(''), 1500);
    } catch {
      window.prompt('Copy coupon code', code);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    setError('');
    const payload = formToPayload(form);
    if (!payload.code || payload.code.length < 3) {
      setError('Code must be at least 3 characters');
      return;
    }
    if (!(payload.discount_value > 0)) {
      setError('Enter a valid discount value');
      return;
    }
    saveMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Coupons & discounts"
        description="Seasonal codes for counter and online. Staff can also apply quick % at POS."
        action={(
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-full bg-wet-earth px-4 py-2 font-inter text-sm text-white"
          >
            <Plus className="h-4 w-4" />
            New coupon
          </button>
        )}
      />

      <div className="rounded-2xl border border-border/50 bg-white overflow-hidden">
        <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.7fr_0.7fr_0.5fr] gap-2 border-b border-border/40 bg-rain-mist/40 px-4 py-2 font-inter text-[10px] uppercase tracking-wider text-rain-cloud/45">
          <span>Code</span>
          <span>Value</span>
          <span>Validity</span>
          <span>Usage</span>
          <span>Channel</span>
          <span>Active</span>
        </div>
        {isLoading ? (
          <p className="px-4 py-8 font-inter text-sm text-rain-cloud/45">Loading coupons…</p>
        ) : coupons.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <Ticket className="mx-auto mb-2 h-8 w-8 text-rain-cloud/25" />
            <p className="font-inter text-sm text-rain-cloud/50">No coupons yet. Create MONSOON10 or a festival offer.</p>
          </div>
        ) : (
          coupons.map((coupon) => (
            <button
              key={coupon.id}
              type="button"
              onClick={() => openEdit(coupon)}
              className="grid w-full grid-cols-[1.2fr_0.8fr_0.8fr_0.7fr_0.7fr_0.5fr] gap-2 border-b border-border/30 px-4 py-3 text-left hover:bg-rain-mist/30"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-mono text-sm font-semibold text-rain-cloud">{coupon.code}</p>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(coupon.code);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.stopPropagation();
                        handleCopy(coupon.code);
                      }
                    }}
                    className="text-rain-cloud/35 hover:text-forest-canopy"
                  >
                    {copied === coupon.code ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </span>
                </div>
                <p className="truncate font-inter text-xs text-rain-cloud/45">{coupon.name}</p>
              </div>
              <p className="font-inter text-sm text-rain-cloud">{formatValue(coupon)}</p>
              <p className="font-inter text-xs text-rain-cloud/55">
                {coupon.starts_at || coupon.ends_at
                  ? `${coupon.starts_at ? format(new Date(coupon.starts_at), 'dd MMM') : '…'} → ${coupon.ends_at ? format(new Date(coupon.ends_at), 'dd MMM') : '…'}`
                  : 'Always'}
              </p>
              <p className="font-inter text-xs text-rain-cloud/55">
                {coupon.used_count || 0}
                {coupon.usage_limit != null ? ` / ${coupon.usage_limit}` : ''}
              </p>
              <p className="font-inter text-xs capitalize text-rain-cloud/55">{coupon.channels}</p>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMutation.mutate({ id: coupon.id, is_active: !coupon.is_active });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.stopPropagation();
                    toggleMutation.mutate({ id: coupon.id, is_active: !coupon.is_active });
                  }
                }}
                className="inline-flex"
              >
                {coupon.is_active !== false
                  ? <ToggleRight className="h-5 w-5 text-forest-canopy" />
                  : <ToggleLeft className="h-5 w-5 text-rain-cloud/30" />}
              </span>
            </button>
          ))
        )}
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <button type="button" className="flex-1 bg-rain-cloud/40" onClick={() => setDrawerOpen(false)} aria-label="Close" />
          <form onSubmit={handleSave} className="flex h-full w-full max-w-md flex-col bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b border-border bg-white px-5 py-4">
              <div>
                <p className="font-inter text-xs uppercase tracking-wider text-rain-cloud/40">Coupon</p>
                <p className="font-cormorant text-xl text-rain-cloud">{form.id ? 'Edit coupon' : 'New coupon'}</p>
              </div>
              <button type="button" onClick={() => setDrawerOpen(false)} className="rounded-full p-2 hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <label className="block">
                <span className="mb-1 block font-inter text-xs text-rain-cloud/50">Code</span>
                <input
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="MONSOON10"
                  className="w-full rounded-xl border border-border px-3 py-2 font-mono text-sm"
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1 block font-inter text-xs text-rain-cloud/50">Name</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Monsoon sale 10%"
                  className="w-full rounded-xl border border-border px-3 py-2 font-inter text-sm"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block font-inter text-xs text-rain-cloud/50">Type</span>
                  <select
                    value={form.discount_type}
                    onChange={(e) => setForm((f) => ({ ...f, discount_type: e.target.value }))}
                    className="w-full rounded-xl border border-border px-3 py-2 font-inter text-sm"
                  >
                    <option value="percent">Percent %</option>
                    <option value="fixed">Fixed ₹</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block font-inter text-xs text-rain-cloud/50">
                    {form.discount_type === 'fixed' ? 'Amount (₹)' : 'Percent'}
                  </span>
                  <div className="relative">
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.discount_value}
                      onChange={(e) => setForm((f) => ({ ...f, discount_value: e.target.value }))}
                      className="w-full rounded-xl border border-border px-3 py-2 font-inter text-sm"
                      required
                    />
                    {form.discount_type === 'percent' && (
                      <Percent className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-rain-cloud/30" />
                    )}
                  </div>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block font-inter text-xs text-rain-cloud/50">Min order (₹)</span>
                  <input
                    type="number"
                    min="0"
                    value={form.min_order_rs}
                    onChange={(e) => setForm((f) => ({ ...f, min_order_rs: e.target.value }))}
                    className="w-full rounded-xl border border-border px-3 py-2 font-inter text-sm"
                    placeholder="0"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block font-inter text-xs text-rain-cloud/50">Max discount (₹)</span>
                  <input
                    type="number"
                    min="0"
                    value={form.max_discount_rs}
                    onChange={(e) => setForm((f) => ({ ...f, max_discount_rs: e.target.value }))}
                    className="w-full rounded-xl border border-border px-3 py-2 font-inter text-sm"
                    placeholder="No cap"
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block font-inter text-xs text-rain-cloud/50">Starts</span>
                  <input
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))}
                    className="w-full rounded-xl border border-border px-3 py-2 font-inter text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block font-inter text-xs text-rain-cloud/50">Ends</span>
                  <input
                    type="datetime-local"
                    value={form.ends_at}
                    onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))}
                    className="w-full rounded-xl border border-border px-3 py-2 font-inter text-sm"
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block font-inter text-xs text-rain-cloud/50">Total uses</span>
                  <input
                    type="number"
                    min="1"
                    value={form.usage_limit}
                    onChange={(e) => setForm((f) => ({ ...f, usage_limit: e.target.value }))}
                    className="w-full rounded-xl border border-border px-3 py-2 font-inter text-sm"
                    placeholder="Unlimited"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block font-inter text-xs text-rain-cloud/50">Per customer</span>
                  <input
                    type="number"
                    min="1"
                    value={form.per_customer_limit}
                    onChange={(e) => setForm((f) => ({ ...f, per_customer_limit: e.target.value }))}
                    className="w-full rounded-xl border border-border px-3 py-2 font-inter text-sm"
                    placeholder="Unlimited"
                  />
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block font-inter text-xs text-rain-cloud/50">Channel</span>
                <select
                  value={form.channels}
                  onChange={(e) => setForm((f) => ({ ...f, channels: e.target.value }))}
                  className="w-full rounded-xl border border-border px-3 py-2 font-inter text-sm"
                >
                  <option value="both">POS + Online</option>
                  <option value="pos">POS only</option>
                  <option value="web">Online only</option>
                </select>
              </label>
              <label className="flex items-center gap-2 font-inter text-sm text-rain-cloud">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                />
                Active
              </label>
              {error ? <p className="rounded-lg bg-red-50 px-3 py-2 font-inter text-xs text-red-600">{error}</p> : null}
            </div>
            <div className="border-t border-border bg-white p-4">
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="w-full rounded-full bg-wet-earth py-3 font-inter text-sm font-medium text-white disabled:opacity-50"
              >
                {saveMutation.isPending ? 'Saving…' : 'Save coupon'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
