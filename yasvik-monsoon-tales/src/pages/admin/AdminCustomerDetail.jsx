import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MessageCircle, RefreshCw, Save, ShoppingCart, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { appClient } from '@/api/appClient';
import { formatPaiseInr, formatTagLabel } from '@/lib/customerCrmUtils';
import { openCustomerWhatsApp, buildInvoiceWhatsAppMessage } from '@/lib/orderWhatsAppNotify';
import { useCart } from '@/lib/CartContext';
import { buildReorderCartProduct, extractBuyAgainCandidates } from '@/lib/buyAgainUtils';

const SURPRISE_REASONS = [
  { code: 'birthday', label: 'Birthday' },
  { code: 'festival', label: 'Festival' },
  { code: 'first_anniversary', label: 'First anniversary' },
  { code: 'first_order', label: 'First order' },
  { code: 'hundredth_customer', label: '100th customer' },
  { code: 'manual', label: 'Manual' },
];

function ledgerEntryLabel(entry) {
  const type = String(entry?.entry_type || '');
  const map = {
    earned: 'Earned',
    redeemed: 'Redeemed',
    reversed: 'Reversed',
    expired: 'Expired',
    surprise: 'Surprise',
  };
  return map[type] || type;
}

export default function AdminCustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const cartApi = useCart();
  const [notes, setNotes] = useState('');
  const [manualTagInput, setManualTagInput] = useState('');
  const [mergeId, setMergeId] = useState('');
  const [consent, setConsent] = useState(false);
  const [hint, setHint] = useState('');
  const [surpriseOpen, setSurpriseOpen] = useState(false);
  const [surpriseAmount, setSurpriseAmount] = useState('');
  const [surpriseReason, setSurpriseReason] = useState('manual');

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-customer', id],
    queryFn: async () => {
      const res = await appClient.functions.invoke('getCustomer', { id });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    enabled: !!id,
  });

  const customer = data?.customer;
  const orders = data?.orders || [];
  const bonusLedger = data?.bonus_ledger || [];

  useEffect(() => {
    if (customer) {
      setNotes(customer.notes || '');
      setConsent(!!customer.marketing_consent);
    }
  }, [customer]);

  const saveMut = useMutation({
    mutationFn: async (payload) => {
      const res = await appClient.functions.invoke('updateCustomer', payload);
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries(['admin-customer', id]);
      setHint('Saved');
    },
  });

  const mergeMut = useMutation({
    mutationFn: async () => {
      const res = await appClient.functions.invoke('mergeCustomers', {
        primaryId: id,
        secondaryId: mergeId.trim(),
      });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => {
      setHint('Merged — secondary profile removed');
      qc.invalidateQueries(['admin-customer', id]);
      setMergeId('');
    },
  });

  const surpriseMut = useMutation({
    mutationFn: async () => {
      const amountRs = Number(surpriseAmount);
      if (!(amountRs > 0)) throw new Error('Enter a positive amount');
      const res = await appClient.functions.invoke('grantSurpriseBonus', {
        customer_id: id,
        amount_rupees: amountRs,
        reason_code: surpriseReason,
      });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => {
      setHint('Surprise bonus granted');
      setSurpriseOpen(false);
      setSurpriseAmount('');
      qc.invalidateQueries(['admin-customer', id]);
    },
    onError: (err) => setHint(err.message || 'Could not grant bonus'),
  });

  const insights = customer?.insights || {};
  const tags = [...(customer?.auto_tags || []), ...(customer?.manual_tags || [])];

  const handleReorderLast = async () => {
    if (!orders[0] || !cartApi?.addItem) {
      setHint('Cart unavailable — copy items from the timeline into POS.');
      return;
    }
      const catalog = await appClient.entities.Product.list('-created_date', 500).catch(() => []);
    const candidates = extractBuyAgainCandidates(orders, { limit: 12 });
    if (cartApi.clearCart) cartApi.clearCart();
    let added = 0;
    for (const c of candidates) {
      const product = (catalog || []).find((p) => p.id === c.productId || p.name === c.title || p.title === c.title);
      if (!product) continue;
      const { payload, variant, qty } = buildReorderCartProduct(product, c.line);
      if (payload) {
        cartApi.addItem(payload, variant, qty);
        added += 1;
      }
    }
    setHint(added ? `Added ${added} items to cart — open Shop or Checkout` : 'Could not match catalog items');
    if (added) navigate('/shop');
  };

  const handleWhatsApp = () => {
    if (!customer?.phone_digits || !orders[0]) return;
    const msg = buildInvoiceWhatsAppMessage({
      ...orders[0],
      customer_name: customer.name,
      customer_phone: customer.phone_digits,
    });
    openCustomerWhatsApp(customer.phone_digits, msg);
  };

  if (isLoading) {
    return <div className="p-8 font-inter text-sm text-rain-cloud/45">Loading customer…</div>;
  }
  if (error || !customer) {
    return (
      <div className="p-8">
        <p className="font-inter text-sm text-amber-700">{error?.message || 'Not found'}</p>
        <Link to="/admin/customers" className="text-forest-canopy text-sm mt-2 inline-block">Back</Link>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
      <button
        type="button"
        onClick={() => navigate('/admin/customers')}
        className="inline-flex items-center gap-1 font-inter text-xs text-rain-cloud/50"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Customers
      </button>

      <div className="bg-white rounded-2xl border border-border/40 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-cormorant text-3xl text-rain-cloud">{customer.name || 'Customer'}</h1>
            <p className="font-inter text-sm text-rain-cloud/55 mt-1">
              {customer.phone_digits}
              {customer.email ? ` · ${customer.email}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleWhatsApp}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-3 py-2 font-inter text-xs text-white"
            >
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
            </button>
            <button
              type="button"
              onClick={handleReorderLast}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 font-inter text-xs"
            >
              <ShoppingCart className="w-3.5 h-3.5" /> Reorder
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          {[
            ['Orders', customer.order_count],
            ['Lifetime value', formatPaiseInr(customer.lifetime_spend_paise)],
            ['Avg order', formatPaiseInr(customer.avg_order_value_paise)],
            ['Channel', customer.preferred_channel || '—'],
          ].map(([label, val]) => (
            <div key={label} className="rounded-xl bg-rain-mist/60 px-3 py-2">
              <p className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/40">{label}</p>
              <p className="font-cormorant text-xl text-rain-cloud mt-0.5">{val}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
          {[
            ['Bonus earned', formatPaiseInr(customer.bonus_earned_paise)],
            ['Bonus redeemed', formatPaiseInr(customer.bonus_redeemed_paise)],
            ['Bonus balance', formatPaiseInr(customer.bonus_balance_paise)],
          ].map(([label, val]) => (
            <div key={label} className="rounded-xl bg-forest-canopy/8 px-3 py-2 border border-forest-canopy/15">
              <p className="font-inter text-[10px] uppercase tracking-wider text-forest-canopy/70">{label}</p>
              <p className="font-cormorant text-xl text-rain-cloud mt-0.5">{val}</p>
            </div>
          ))}
        </div>

        {customer.bonus_expires_at ? (
          <p className="font-inter text-[11px] text-rain-cloud/45 mt-2">
            Earliest bonus expiry: {format(new Date(customer.bonus_expires_at), 'dd MMM yyyy')}
          </p>
        ) : null}

        <div className="mt-3">
          <button
            type="button"
            onClick={() => setSurpriseOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full border border-forest-canopy/30 bg-forest-canopy/5 px-3 py-2 font-inter text-xs text-forest-canopy"
          >
            <Sparkles className="w-3.5 h-3.5" /> Give surprise bonus
          </button>
        </div>

        {surpriseOpen ? (
          <div className="mt-3 rounded-xl border border-border/50 p-3 space-y-2">
            <div className="flex flex-wrap gap-2">
              <input
                type="number"
                min="1"
                value={surpriseAmount}
                onChange={(e) => setSurpriseAmount(e.target.value)}
                placeholder="Amount ₹"
                className="w-28 rounded-xl border border-border px-3 py-2 font-inter text-sm"
              />
              <select
                value={surpriseReason}
                onChange={(e) => setSurpriseReason(e.target.value)}
                className="flex-1 min-w-[10rem] rounded-xl border border-border px-3 py-2 font-inter text-sm"
              >
                {SURPRISE_REASONS.map((r) => (
                  <option key={r.code} value={r.code}>{r.label}</option>
                ))}
              </select>
              <button
                type="button"
                disabled={surpriseMut.isPending}
                onClick={() => surpriseMut.mutate()}
                className="rounded-full bg-wet-earth text-white px-4 py-2 font-inter text-xs disabled:opacity-50"
              >
                Grant
              </button>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-1.5 mt-4">
          {tags.map((t) => (
            <span key={t} className="px-2 py-0.5 rounded-full bg-forest-canopy/8 font-inter text-[10px] text-forest-canopy">
              {formatTagLabel(t)}
            </span>
          ))}
        </div>

        <p className="font-inter text-[11px] text-rain-cloud/45 mt-3">
          First {customer.first_order_at ? format(new Date(customer.first_order_at), 'dd MMM yyyy') : '—'}
          {' · '}
          Last {customer.last_order_at ? format(new Date(customer.last_order_at), 'dd MMM yyyy') : '—'}
          {insights.days_since_last_purchase != null
            ? ` · ${insights.days_since_last_purchase}d since last`
            : ''}
          {insights.likely_reorder_at
            ? ` · likely reorder ${format(new Date(insights.likely_reorder_at), 'dd MMM')}`
            : ''}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-border/40 p-4">
          <p className="font-inter text-xs uppercase tracking-wider text-rain-cloud/45 mb-2">Favourites</p>
          <ul className="space-y-1.5">
            {(insights.favourite_products || []).slice(0, 6).map((p) => (
              <li key={p.key || p.title} className="font-inter text-sm text-rain-cloud">
                {p.title}{p.variant ? ` · ${p.variant}` : ''}
                <span className="text-rain-cloud/40 text-xs"> ×{p.total_qty}</span>
              </li>
            ))}
            {!insights.favourite_products?.length && (
              <li className="font-inter text-xs text-rain-cloud/40">No favourites yet</li>
            )}
          </ul>
        </div>
        <div className="bg-white rounded-2xl border border-border/40 p-4">
          <p className="font-inter text-xs uppercase tracking-wider text-rain-cloud/45 mb-2">Categories</p>
          <ul className="space-y-1.5">
            {(insights.favourite_categories || []).map((c) => (
              <li key={c.name} className="font-inter text-sm text-rain-cloud">
                {c.name}
                <span className="text-rain-cloud/40 text-xs"> ×{c.total_qty}</span>
              </li>
            ))}
            {!insights.favourite_categories?.length && (
              <li className="font-inter text-xs text-rain-cloud/40">No category data yet</li>
            )}
          </ul>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border/40 p-4">
        <p className="font-inter text-xs uppercase tracking-wider text-rain-cloud/45 mb-3">Yasvik Bonus ledger</p>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {bonusLedger.map((entry) => (
            <div key={entry.id} className="flex justify-between gap-2 border-b border-border/20 pb-2 last:border-0">
              <div>
                <p className="font-inter text-sm text-rain-cloud">{ledgerEntryLabel(entry)}</p>
                <p className="font-inter text-[10px] text-rain-cloud/45">
                  {entry.created_at ? format(new Date(entry.created_at), 'dd MMM yyyy, h:mm a') : ''}
                  {entry.reason_code ? ` · ${entry.reason_code}` : ''}
                  {entry.expires_at ? ` · exp ${format(new Date(entry.expires_at), 'dd MMM yyyy')}` : ''}
                </p>
              </div>
              <p className={`font-inter text-sm tabular-nums ${Number(entry.amount_paise) < 0 ? 'text-amber-800' : 'text-forest-canopy'}`}>
                {Number(entry.amount_paise) < 0 ? '−' : '+'}₹{Math.abs(Math.round(Number(entry.amount_paise) / 100))}
              </p>
            </div>
          ))}
          {!bonusLedger.length && (
            <p className="font-inter text-xs text-rain-cloud/40">No bonus entries yet</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border/40 p-4 space-y-3">
        <p className="font-inter text-xs uppercase tracking-wider text-rain-cloud/45">Notes & tags</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-border px-3 py-2 font-inter text-sm"
          placeholder="Internal customer notes…"
        />
        <div className="flex gap-2">
          <input
            value={manualTagInput}
            onChange={(e) => setManualTagInput(e.target.value)}
            placeholder="Add manual tag"
            className="flex-1 rounded-xl border border-border px-3 py-2 font-inter text-sm"
          />
          <button
            type="button"
            onClick={() => {
              const t = manualTagInput.trim().toLowerCase().replace(/\s+/g, '_');
              if (!t) return;
              const next = [...new Set([...(customer.manual_tags || []), t])];
              saveMut.mutate({ id, notes, manual_tags: next, marketing_consent: consent });
              setManualTagInput('');
            }}
            className="px-3 py-2 rounded-xl border border-border font-inter text-xs"
          >
            Add tag
          </button>
        </div>
        <label className="flex items-center gap-2 font-inter text-xs text-rain-cloud/60">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          Marketing WhatsApp consent (opt-in)
        </label>
        <button
          type="button"
          onClick={() => saveMut.mutate({ id, notes, marketing_consent: consent, manual_tags: customer.manual_tags || [] })}
          className="inline-flex items-center gap-1.5 rounded-full bg-wet-earth text-white px-4 py-2 font-inter text-xs"
        >
          <Save className="w-3.5 h-3.5" /> Save
        </button>
        {hint ? <p className="font-inter text-[11px] text-forest-canopy">{hint}</p> : null}
      </div>

      <div className="bg-white rounded-2xl border border-border/40 p-4">
        <p className="font-inter text-xs uppercase tracking-wider text-rain-cloud/45 mb-3">Purchase timeline</p>
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="border-b border-border/30 pb-3 last:border-0">
              <div className="flex justify-between gap-2">
                <div>
                  <p className="font-inter text-sm text-rain-cloud">
                    {o.order_number || o.receipt_id} · {o.order_channel || '—'}
                  </p>
                  <p className="font-inter text-[11px] text-rain-cloud/45">
                    {o.created_at ? format(new Date(o.created_at), 'dd MMM yyyy, h:mm a') : ''}
                    {' · '}
                    {o.payment_method || ''}
                  </p>
                </div>
                <p className="font-cormorant text-lg">{formatPaiseInr(o.amount_paise)}</p>
              </div>
              <ul className="mt-1.5 space-y-0.5">
                {(o.items_snapshot || []).slice(0, 4).map((item, i) => (
                  <li key={i} className="font-inter text-[11px] text-rain-cloud/55">
                    {item.title}{item.variant ? ` (${item.variant})` : ''} ×{item.qty}
                    {item.category_name ? ` · ${item.category_name}` : ''}
                  </li>
                ))}
              </ul>
              <Link
                to={`/admin/orders?highlight=${o.id}`}
                className="inline-block mt-1 font-inter text-[11px] text-forest-canopy"
              >
                Open in Orders
              </Link>
            </div>
          ))}
          {!orders.length && (
            <p className="font-inter text-xs text-rain-cloud/40">No linked invoices yet</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-amber-200/60 p-4 space-y-2">
        <p className="font-inter text-xs uppercase tracking-wider text-rain-cloud/45 flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> Merge duplicate
        </p>
        <p className="font-inter text-[11px] text-rain-cloud/45">
          Enter the other customer UUID to merge into this profile (orders reassigned, secondary deleted).
        </p>
        <div className="flex gap-2">
          <input
            value={mergeId}
            onChange={(e) => setMergeId(e.target.value)}
            placeholder="Secondary customer id"
            className="flex-1 rounded-xl border border-border px-3 py-2 font-inter text-sm"
          />
          <button
            type="button"
            disabled={!mergeId.trim() || mergeMut.isPending}
            onClick={() => mergeMut.mutate()}
            className="px-4 py-2 rounded-xl bg-amber-700 text-white font-inter text-xs disabled:opacity-40"
          >
            Merge
          </button>
        </div>
        {mergeMut.error ? (
          <p className="font-inter text-[11px] text-amber-700">{mergeMut.error.message}</p>
        ) : null}
      </div>
    </div>
  );
}
