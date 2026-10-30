import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Calculator, ExternalLink, RefreshCw, Save } from 'lucide-react';
import { products as productsApi } from '@/services/api';
import {
  fetchAllAppSettings,
  upsertAppSetting,
  SETTINGS_QUERY_KEYS,
} from '@/services/settingsService';
import {
  DEFAULT_PRICING_STRATEGY,
  PRICING_STRATEGY_SETTING_KEY,
  normalizePricingStrategy,
  formatRupee,
} from '@/lib/pricingStrategy';
import {
  OPS_MARGIN_SETTINGS_KEY,
  DEFAULT_OPS_MARGIN_ASSUMPTIONS,
  normalizeOpsMarginAssumptions,
  buildProductMarginRows,
  formatMarginStatus,
  formatChannelAdvice,
} from '@/lib/ops/marginControl';

function AssumptionField({ label, value, onChange, hint }) {
  return (
    <label className="block">
      <span className="mb-1 block font-inter text-[10px] font-bold uppercase tracking-wider text-deep-forest/45">{label}</span>
      <input
        type="number"
        step="any"
        className="w-full rounded-xl border border-border px-3 py-2 font-inter text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint ? <span className="mt-0.5 block font-inter text-[10px] text-deep-forest/40">{hint}</span> : null}
    </label>
  );
}

function StatusPill({ status }) {
  const meta = formatMarginStatus(status);
  const cls = {
    danger: 'bg-red-50 text-red-800',
    warn: 'bg-amber-50 text-amber-900',
    ok: 'bg-emerald-50 text-emerald-800',
    muted: 'bg-stone-100 text-stone-600',
  }[meta.tone] || 'bg-stone-100 text-stone-600';
  return (
    <span className={`rounded-full px-2.5 py-0.5 font-inter text-[10px] font-bold uppercase tracking-wider ${cls}`}>
      {meta.label}
    </span>
  );
}

export default function OpsMarginControlPanel() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('heroes');
  const [search, setSearch] = useState('');
  const [draftAssumptions, setDraftAssumptions] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const { data: settings = [], isLoading: settingsLoading } = useQuery({
    queryKey: SETTINGS_QUERY_KEYS.all,
    queryFn: fetchAllAppSettings,
  });

  const bonusRedeemPct = useMemo(() => {
    const row = settings.find((s) => s.setting_key === 'bonus.max_redeem_percent' || s.key === 'bonus.max_redeem_percent');
    const n = Number(row?.setting_value ?? row?.value);
    return Number.isFinite(n) ? n : 5;
  }, [settings]);

  const freeThreshold = useMemo(() => {
    const row = settings.find((s) => s.setting_key === 'free_delivery_threshold' || s.key === 'free_delivery_threshold');
    const n = Number(row?.setting_value ?? row?.value);
    return Number.isFinite(n) && n > 0 ? n : 999;
  }, [settings]);

  const savedAssumptions = useMemo(() => {
    const row = settings.find((s) => s.setting_key === OPS_MARGIN_SETTINGS_KEY || s.key === OPS_MARGIN_SETTINGS_KEY);
    const raw = row?.setting_value ?? row?.value;
    let parsed = {};
    if (raw) {
      try {
        parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch {
        parsed = {};
      }
    }
    return normalizeOpsMarginAssumptions({
      ...DEFAULT_OPS_MARGIN_ASSUMPTIONS,
      bonus_redeem_pct: bonusRedeemPct,
      free_delivery_threshold_rs: freeThreshold,
      ...parsed,
      // Always prefer live bonus / threshold settings when present
      bonus_redeem_pct: parsed.bonus_redeem_pct ?? bonusRedeemPct,
      free_delivery_threshold_rs: parsed.free_delivery_threshold_rs ?? freeThreshold,
    });
  }, [settings, bonusRedeemPct, freeThreshold]);

  const assumptions = draftAssumptions || savedAssumptions;

  const strategy = useMemo(() => {
    const row = settings.find((s) => s.setting_key === PRICING_STRATEGY_SETTING_KEY || s.key === PRICING_STRATEGY_SETTING_KEY);
    const raw = row?.setting_value ?? row?.value;
    if (!raw) return DEFAULT_PRICING_STRATEGY;
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return normalizePricingStrategy(parsed || DEFAULT_PRICING_STRATEGY);
    } catch {
      return DEFAULT_PRICING_STRATEGY;
    }
  }, [settings]);

  const { data: productList = [], isLoading: productsLoading, refetch, isFetching } = useQuery({
    queryKey: ['ops-margin-products'],
    queryFn: () => productsApi.list('-created_date', 300),
  });

  const saveAssumptions = useMutation({
    mutationFn: async () => {
      await upsertAppSetting(settings, OPS_MARGIN_SETTINGS_KEY, JSON.stringify(normalizeOpsMarginAssumptions(assumptions)), {
        data_type: 'string',
        description: 'Operations margin assumptions. Delivery is scenario/basket-based — not a flat per-SKU tax.',
      });
    },
    onSuccess: () => {
      setDraftAssumptions(null);
      qc.invalidateQueries({ queryKey: SETTINGS_QUERY_KEYS.all });
    },
  });

  const setAssumption = (key) => (value) => {
    setDraftAssumptions((prev) => ({
      ...(prev || savedAssumptions),
      [key]: value === '' ? '' : Number(value),
    }));
  };

  const rows = useMemo(() => {
    const all = [];
    for (const product of productList) {
      all.push(...buildProductMarginRows(product, assumptions, strategy));
    }
    return all;
  }, [productList, assumptions, strategy]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter === 'heroes' && row.merchandisingTier !== 'hero') return false;
      if (filter === 'online' && !row.sellOnline) return false;
      if (filter === 'below' && row.status !== 'below_safe') return false;
      if (filter === 'packaging' && row.packagingSource !== 'missing') return false;
      if (q) {
        const hay = `${row.productName} ${row.packLabel} ${row.slug}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, filter, search]);

  const summary = useMemo(() => {
    const below = rows.filter((r) => r.status === 'below_safe').length;
    const thin = rows.filter((r) => r.status === 'thin').length;
    const incomplete = rows.filter((r) => r.incomplete).length;
    const missingPack = rows.filter((r) => r.packagingSource === 'missing').length;
    const heroes = rows.filter((r) => r.merchandisingTier === 'hero').length;
    return { total: rows.length, below, thin, incomplete, missingPack, heroes };
  }, [rows]);

  if (settingsLoading || productsLoading) {
    return <p className="font-inter text-sm text-deep-forest/50">Loading margin board…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-soft-border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-cormorant text-xl font-semibold text-deep-forest">Pricing &amp; Margin Control</h2>
            <p className="mt-1 max-w-3xl font-inter text-sm text-deep-forest/65">
              Unit contribution = sell − product − wastage − packaging − label (− payment fee when online).
              Delivery subsidy is allocated from the <strong>basket</strong> (Porter cost − customer fee), never charged in full against every SKU.
              Safe price uses ₹{assumptions.min_contribution_rs} minimum contribution and {assumptions.target_margin_pct}% target — before delivery.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/admin/pricing" className="inline-flex items-center gap-1.5 rounded-full border border-soft-border px-4 py-2 font-inter text-[11px] font-bold uppercase tracking-wider text-deep-forest">
              Pricing Strategy <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <Link to="/admin/packaging" className="inline-flex items-center gap-1.5 rounded-full border border-soft-border px-4 py-2 font-inter text-[11px] font-bold uppercase tracking-wider text-deep-forest">
              Packaging costs
            </Link>
            <button type="button" onClick={() => refetch()} className="inline-flex items-center gap-1.5 rounded-full border border-soft-border px-4 py-2 font-inter text-[11px] font-bold uppercase tracking-wider text-deep-forest">
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              Recheck
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ['Pack lines', summary.total],
            ['Hero lines', summary.heroes],
            ['Below safe (unit)', summary.below],
            ['Thin ₹ contribution', summary.thin],
            ['Missing pack cost', summary.missingPack],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-soft-border/80 bg-warm-cream/40 p-3">
              <p className="font-inter text-[10px] font-bold uppercase tracking-wider text-deep-forest/45">{label}</p>
              <p className="mt-1 font-cormorant text-2xl font-semibold text-deep-forest">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 font-inter text-sm text-amber-950">
        Calibrated from last 90 days: most volume is POS (₹0 delivery). Web Razorpay orders show zone fees ~₹30–85;
        actual Porter often unrecorded — set Typical Porter below. Bonus redeem stress uses {assumptions.bonus_redeem_pct}% (live setting).
        Free-delivery threshold ₹{assumptions.free_delivery_threshold_rs}.
      </div>

      <div className="rounded-2xl border border-soft-border bg-white p-5">
        <div className="mb-3 flex items-center gap-2">
          <Calculator className="h-4 w-4 text-deep-forest/50" />
          <h3 className="font-cormorant text-lg font-semibold text-deep-forest">Assumptions</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AssumptionField label="Online payment fee %" value={assumptions.payment_fee_pct} onChange={setAssumption('payment_fee_pct')} hint="Razorpay only — not POS cash" />
          <AssumptionField label="Min contribution ₹" value={assumptions.min_contribution_rs} onChange={setAssumption('min_contribution_rs')} hint="Floor after product+pack+fee, before delivery" />
          <AssumptionField label="Target margin %" value={assumptions.target_margin_pct} onChange={setAssumption('target_margin_pct')} />
          <AssumptionField label="Bonus redeem stress %" value={assumptions.bonus_redeem_pct} onChange={setAssumption('bonus_redeem_pct')} hint="Matches bonus.max_redeem_percent" />
          <AssumptionField label="Typical Porter cost ₹" value={assumptions.typical_porter_cost_rs} onChange={setAssumption('typical_porter_cost_rs')} hint="Basket actual delivery cost" />
          <AssumptionField label="Heavy Porter cost ₹" value={assumptions.heavy_porter_cost_rs} onChange={setAssumption('heavy_porter_cost_rs')} />
          <AssumptionField label="Free delivery threshold ₹" value={assumptions.free_delivery_threshold_rs} onChange={setAssumption('free_delivery_threshold_rs')} />
          <AssumptionField label="Default label ₹ / pack" value={assumptions.label_cost_rs} onChange={setAssumption('label_cost_rs')} hint="Used when pack_packaging_rs has no label split" />
        </div>
        <p className="mt-3 font-inter text-xs text-deep-forest/50">
          Wastage is category-based (oils 1%, pickles 3%, snacks 4%, rice 2%, etc.) — not one global %. Packaging must come from Pricing Strategy pack costs or Packaging admin.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={saveAssumptions.isPending || !draftAssumptions}
            onClick={() => saveAssumptions.mutate()}
            className="inline-flex items-center gap-2 rounded-full bg-deep-forest px-5 py-2.5 font-inter text-[11px] font-bold uppercase tracking-wider text-warm-cream disabled:opacity-40"
          >
            <Save className="h-3.5 w-3.5" />
            Save assumptions
          </button>
          {draftAssumptions ? (
            <button type="button" onClick={() => setDraftAssumptions(null)} className="font-inter text-xs text-deep-forest/50">Reset draft</button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {[
          ['heroes', 'Heroes'],
          ['online', 'Sell online'],
          ['below', 'Below safe'],
          ['packaging', 'Missing pack cost'],
          ['all', 'All packs'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`rounded-full px-4 py-2 font-inter text-[11px] font-bold uppercase tracking-wider ${
              filter === id ? 'bg-deep-forest text-warm-cream' : 'bg-white text-deep-forest ring-1 ring-soft-border'
            }`}
          >
            {label}
          </button>
        ))}
        <input
          className="ml-auto min-w-[200px] flex-1 rounded-full border border-border px-4 py-2 font-inter text-sm"
          placeholder="Search product or pack…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {summary.missingPack > 0 ? (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-800" />
          <p className="font-inter text-sm text-amber-950">
            {summary.missingPack} pack line(s) have ₹0 packaging in pricing meta. Margin is overstated until pouch/bottle/cap/seal/label costs are entered in Pricing Strategy.
          </p>
        </div>
      ) : null}

      <div className="space-y-3">
        {filtered.map((row) => {
          const o = row.online;
          const key = `${row.productId}-${row.variantId}`;
          const open = expandedId === key;
          return (
            <article key={key} className="rounded-2xl border border-soft-border bg-white">
              <button
                type="button"
                className="flex w-full flex-wrap items-start justify-between gap-3 px-4 py-4 text-left"
                onClick={() => setExpandedId(open ? null : key)}
              >
                <div className="min-w-0">
                  <p className="font-inter text-sm font-semibold text-deep-forest">{row.productName}</p>
                  <p className="font-inter text-[11px] text-deep-forest/50">
                    {row.packLabel}
                    {row.purchasePerKg != null ? ` · cost ${formatRupee(row.purchasePerKg)}/kg` : ' · no purchase cost'}
                    {` · pack ₹${row.packagingRs || 0}`}
                    {` · wastage ${row.wastagePct}%`}
                  </p>
                  {o ? (
                    <p className="mt-1 font-inter text-[11px] text-deep-forest/60">
                      Sell {formatRupee(o.sellingPrice)} · safe {formatRupee(o.minSafePrice)} · before delivery {formatRupee(o.contributionBeforeDelivery)} · after free-delivery share {formatRupee(o.localFree?.contributionAfterDelivery)}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusPill status={row.incomplete ? 'incomplete' : row.status} />
                  {row.packagingSource === 'missing' ? (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 font-inter text-[10px] font-bold uppercase text-amber-900">Pack cost missing</span>
                  ) : null}
                </div>
              </button>

              {open && o ? (
                <div className="border-t border-soft-border px-4 py-4">
                  <p className="font-inter text-sm text-deep-forest/80">{formatChannelAdvice(o.channelAdvice)}</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl bg-warm-cream/50 p-3">
                      <p className="font-inter text-[10px] font-bold uppercase text-deep-forest/45">Before delivery</p>
                      <p className="font-cormorant text-xl font-semibold">{formatRupee(o.contributionBeforeDelivery)}</p>
                    </div>
                    <div className="rounded-xl bg-warm-cream/50 p-3">
                      <p className="font-inter text-[10px] font-bold uppercase text-deep-forest/45">After online fee</p>
                      <p className="font-cormorant text-xl font-semibold">{formatRupee(o.contributionAfterOnlineFee)}</p>
                    </div>
                    <div className="rounded-xl bg-warm-cream/50 p-3">
                      <p className="font-inter text-[10px] font-bold uppercase text-deep-forest/45">Max safe discount</p>
                      <p className="font-cormorant text-xl font-semibold">{formatRupee(o.maxSafeDiscountRs)}</p>
                    </div>
                    <div className="rounded-xl bg-warm-cream/50 p-3">
                      <p className="font-inter text-[10px] font-bold uppercase text-deep-forest/45">Bonus stress</p>
                      <p className="font-cormorant text-xl font-semibold">{formatRupee(o.contributionAfterBonusNoDelivery)}</p>
                    </div>
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-left">
                      <thead>
                        <tr className="font-inter text-[10px] font-bold uppercase tracking-wider text-deep-forest/45">
                          <th className="py-2 pr-3">Scenario</th>
                          <th className="py-2 pr-3">Basket</th>
                          <th className="py-2 pr-3">Cust fee</th>
                          <th className="py-2 pr-3">Porter</th>
                          <th className="py-2 pr-3">Line subsidy</th>
                          <th className="py-2 pr-3">After delivery</th>
                          <th className="py-2 pr-3">≥ min ₹?</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(o.scenarios || []).map((s) => (
                          <tr key={s.id} className="border-t border-soft-border/50 font-inter text-sm text-deep-forest/80">
                            <td className="py-2 pr-3">
                              <p className="font-semibold text-deep-forest">{s.label}</p>
                              <p className="text-[11px] text-deep-forest/45">{s.note}</p>
                            </td>
                            <td className="py-2 pr-3">{formatRupee(s.basketRevenueRs)}</td>
                            <td className="py-2 pr-3">{formatRupee(s.customerFeeRs)}</td>
                            <td className="py-2 pr-3">{formatRupee(s.actualDeliveryCostRs)}</td>
                            <td className="py-2 pr-3">{formatRupee(s.lineDeliverySubsidy)}</td>
                            <td className={`py-2 pr-3 font-semibold ${s.contributionAfterDelivery < assumptions.min_contribution_rs ? 'text-amber-900' : 'text-deep-forest'}`}>
                              {formatRupee(s.contributionAfterDelivery)}
                            </td>
                            <td className="py-2 pr-3">{s.meetsMinContribution ? 'Yes' : 'No'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-3">
                    <Link to={`/admin/products?edit=${row.productId}`} className="font-inter text-[11px] font-bold uppercase tracking-wider text-neon-paddy">
                      Edit product
                    </Link>
                    <Link to="/admin/pricing" className="font-inter text-[11px] font-bold uppercase tracking-wider text-deep-forest/60">
                      Open Pricing Strategy
                    </Link>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
        {!filtered.length ? (
          <p className="rounded-2xl border border-soft-border bg-white px-4 py-8 text-center font-inter text-sm text-deep-forest/50">
            No pack lines match. Add purchase cost in Pricing Strategy first.
          </p>
        ) : null}
      </div>
    </div>
  );
}
