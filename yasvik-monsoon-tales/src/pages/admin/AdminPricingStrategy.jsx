import { useMemo, useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Calculator, Save, RefreshCw, AlertTriangle, Store, Globe, Search,
  ChevronDown, ChevronUp, ExternalLink, SlidersHorizontal,
} from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { products, categories } from '@/services/api';
import {
  fetchAllAppSettings,
  upsertAppSetting,
  SETTINGS_QUERY_KEYS,
} from '@/services/settingsService';
import {
  DEFAULT_PRICING_STRATEGY,
  PRICING_STRATEGY_SETTING_KEY,
  PRICING_TIERS,
  buildProductUpdateFromStrategy,
  bumpTier,
  computeTierSellRates,
  defaultBandForCategory,
  extractProductStrategy,
  formatMargin,
  formatRupee,
  grossMarginPct,
  normalizePricingStrategy,
  resolveChannelTiers,
  resolveTierSellPerKg,
} from '@/lib/pricingStrategy';

function TierBadge({ tier, large = false }) {
  const colors = {
    min: 'bg-blue-50 text-blue-700 border-blue-200',
    mid: 'bg-amber-50 text-amber-800 border-amber-200',
    max: 'bg-forest-canopy/10 text-forest-canopy border-forest-canopy/25',
  };
  return (
    <span className={`font-inter uppercase tracking-wider rounded-full border ${colors[tier] || colors.mid} ${large ? 'text-xs px-3 py-1' : 'text-[10px] px-2 py-0.5'}`}>
      {tier}
    </span>
  );
}

function MarginCell({ pct }) {
  const { text, tone } = formatMargin(pct);
  return <span className={`font-inter text-xs font-medium ${tone}`}>{text}</span>;
}

function NumberInput({ value, onChange, placeholder, className = '', disabled = false }) {
  return (
    <input
      type="number"
      step="any"
      disabled={disabled}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? '' : e.target.value)}
      placeholder={placeholder}
      className={`w-full rounded-lg border border-border/70 bg-white px-2 py-1.5 font-inter text-sm text-rain-cloud focus:outline-none focus:border-wet-earth/60 disabled:bg-rain-mist/40 disabled:text-rain-cloud/45 ${className}`}
    />
  );
}

function BandSelect({ value, onChange, className = '' }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-lg border border-border/70 bg-white px-2 py-2 font-inter text-sm font-medium text-rain-cloud focus:outline-none focus:border-wet-earth/60 ${className}`}
    >
      {PRICING_TIERS.map((tier) => (
        <option key={tier} value={tier}>{tier}</option>
      ))}
    </select>
  );
}

function StrategyDefaultsPanel({ strategy, categories, onChange, onSave, saving }) {
  const [open, setOpen] = useState(true);
  const f = (key) => (val) => onChange({ ...strategy, [key]: val });

  const setCategoryBand = (categoryId, band) => {
    onChange({
      ...strategy,
      category_band_defaults: { ...strategy.category_band_defaults, [categoryId]: band },
    });
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-white overflow-hidden mb-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-rain-mist/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Calculator className="w-5 h-5 text-wet-earth" />
          <div className="text-left">
            <h2 className="font-inter text-sm font-medium text-rain-cloud">Margin bands & category defaults</h2>
            <p className="font-inter text-[11px] text-rain-cloud/45 mt-0.5">
              Define what min / mid / max mean. Assign a default band per category — products inherit unless you change them.
            </p>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-rain-cloud/40" /> : <ChevronDown className="w-4 h-4 text-rain-cloud/40" />}
      </button>

      {open ? (
        <div className="px-5 pb-5 border-t border-border/40 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
            <div>
              <label className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/50 block mb-1.5">Min markup %</label>
              <NumberInput value={strategy.min_margin_pct} onChange={f('min_margin_pct')} placeholder="8" />
            </div>
            <div>
              <label className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/50 block mb-1.5">Mid markup %</label>
              <NumberInput value={strategy.mid_margin_pct} onChange={f('mid_margin_pct')} placeholder="15" />
            </div>
            <div>
              <label className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/50 block mb-1.5">Max markup %</label>
              <NumberInput value={strategy.max_margin_pct} onChange={f('max_margin_pct')} placeholder="25" />
            </div>
            <div>
              <label className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/50 block mb-1.5 flex items-center gap-1">
                <Globe className="w-3 h-3" /> Web band step-up
              </label>
              <NumberInput value={strategy.web_tier_step} onChange={f('web_tier_step')} placeholder="1" />
              <p className="font-inter text-[10px] text-rain-cloud/35 mt-1">Website = product band + this step (0 = same)</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/50 block mb-1.5">Small-pack ₹</label>
              <NumberInput value={strategy.small_pack_margin_rs} onChange={f('small_pack_margin_rs')} placeholder="10" />
            </div>
            <div>
              <label className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/50 block mb-1.5">MRP inflate %</label>
              <NumberInput value={strategy.price_inflate_percent} onChange={f('price_inflate_percent')} placeholder="15" />
            </div>
            <div className="flex items-end">
              <div className="rounded-xl bg-rain-mist/50 border border-temple-stone/20 px-4 py-3 font-inter text-xs text-rain-cloud/60 w-full">
                Cost ₹100/kg → min {formatRupee(100 * (1 + strategy.min_margin_pct / 100))} ·
                mid {formatRupee(100 * (1 + strategy.mid_margin_pct / 100))} ·
                max {formatRupee(100 * (1 + strategy.max_margin_pct / 100))}
              </div>
            </div>
          </div>

          {categories.length > 0 ? (
            <div>
              <h3 className="font-inter text-xs font-medium text-rain-cloud/70 mb-3">Default band per category</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {categories.map((cat) => (
                  <div key={cat.id} className="flex items-center gap-2 rounded-xl border border-border/50 px-3 py-2 bg-rain-mist/20">
                    <span className="font-inter text-xs text-rain-cloud/70 flex-1 truncate">
                      {cat.emotional_title || cat.name}
                    </span>
                    <BandSelect
                      value={strategy.category_band_defaults?.[cat.id] || 'mid'}
                      onChange={(band) => setCategoryBand(cat.id, band)}
                      className="text-xs py-1 w-36"
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-wet-earth px-4 py-2 font-inter text-sm text-white hover:bg-wet-earth/90 disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : 'Save strategy'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function buildRowState(product, strategy) {
  const current = extractProductStrategy(product, strategy);
  return {
    purchase_rate_per_kg: current.purchase_rate_per_kg ?? '',
    pricing_band: current.pricing_band || defaultBandForCategory(product.category_id, strategy),
    store_override: current.store_override || false,
    web_override: current.web_override || false,
    store_selling_price_per_kg: current.store_override ? (current.store_selling_price_per_kg ?? '') : '',
    web_selling_price_per_kg: current.web_override ? (current.web_selling_price_per_kg ?? '') : '',
    dirty: false,
  };
}

function computeRowPreview(row, strategy) {
  const purchase = row.purchase_rate_per_kg === '' ? null : Number(row.purchase_rate_per_kg);
  const band = row.pricing_band || 'mid';
  const channels = resolveChannelTiers(band, strategy);
  const tierRates = purchase != null ? computeTierSellRates(purchase, strategy) : { min: null, mid: null, max: null };

  const storeSell = row.store_override && row.store_selling_price_per_kg !== ''
    ? Number(row.store_selling_price_per_kg)
    : resolveTierSellPerKg(purchase, channels.store, strategy);

  const webSell = row.web_override && row.web_selling_price_per_kg !== ''
    ? Number(row.web_selling_price_per_kg)
    : resolveTierSellPerKg(purchase, channels.web, strategy);

  return {
    band,
    channels,
    tierRates,
    storeSell,
    webSell,
    storeMargin: grossMarginPct(purchase, storeSell),
    webMargin: grossMarginPct(purchase, webSell),
    lowMargin: (storeSell && purchase && storeSell - purchase < purchase * 0.05)
      || (webSell && purchase && webSell - purchase < purchase * 0.05),
    missingPurchase: purchase == null || purchase <= 0,
    hasOverride: row.store_override || row.web_override,
  };
}

function OverridePanel({ row, preview, onChange }) {
  return (
    <div className="mt-2 rounded-xl border border-dashed border-border/70 bg-rain-mist/30 p-3 space-y-3">
      <p className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/45">Manual override (optional)</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={row.store_override}
            onChange={(e) => onChange({
              store_override: e.target.checked,
              store_selling_price_per_kg: e.target.checked ? (row.store_selling_price_per_kg || preview.storeSell || '') : '',
            })}
            className="mt-1 rounded"
          />
          <div className="flex-1">
            <span className="font-inter text-xs text-rain-cloud/70 flex items-center gap-1">
              <Store className="w-3 h-3" /> Store ₹/kg override
            </span>
            {row.store_override ? (
              <NumberInput
                value={row.store_selling_price_per_kg}
                onChange={(v) => onChange({ store_selling_price_per_kg: v })}
                placeholder={preview.storeSell ? String(preview.storeSell) : '₹/kg'}
                className="mt-1.5 text-xs"
              />
            ) : (
              <p className="font-inter text-[10px] text-rain-cloud/40 mt-0.5">Auto: {formatRupee(preview.storeSell)}/kg ({preview.channels.store})</p>
            )}
          </div>
        </label>
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={row.web_override}
            onChange={(e) => onChange({
              web_override: e.target.checked,
              web_selling_price_per_kg: e.target.checked ? (row.web_selling_price_per_kg || preview.webSell || '') : '',
            })}
            className="mt-1 rounded"
          />
          <div className="flex-1">
            <span className="font-inter text-xs text-rain-cloud/70 flex items-center gap-1">
              <Globe className="w-3 h-3" /> Web ₹/kg override
            </span>
            {row.web_override ? (
              <NumberInput
                value={row.web_selling_price_per_kg}
                onChange={(v) => onChange({ web_selling_price_per_kg: v })}
                placeholder={preview.webSell ? String(preview.webSell) : '₹/kg'}
                className="mt-1.5 text-xs"
              />
            ) : (
              <p className="font-inter text-[10px] text-rain-cloud/40 mt-0.5">Auto: {formatRupee(preview.webSell)}/kg ({preview.channels.web})</p>
            )}
          </div>
        </label>
      </div>
    </div>
  );
}

export default function AdminPricingStrategy() {
  const qc = useQueryClient();
  const [strategy, setStrategy] = useState(DEFAULT_PRICING_STRATEGY);
  const [rowEdits, setRowEdits] = useState({});
  const [expandedOverrides, setExpandedOverrides] = useState({});
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showWarningsOnly, setShowWarningsOnly] = useState(false);

  const { data: productList = [], isLoading: productsLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => products.list('-created_date', 300),
  });

  const { data: categoryList = [] } = useQuery({
    queryKey: ['categories-all'],
    queryFn: () => categories.listActive(30),
  });

  const { data: settings = [], isLoading: settingsLoading } = useQuery({
    queryKey: SETTINGS_QUERY_KEYS.all,
    queryFn: fetchAllAppSettings,
  });

  useEffect(() => {
    if (!settings.length) return;
    const row = settings.find((r) => (r.key || r.setting_key) === PRICING_STRATEGY_SETTING_KEY);
    const raw = row?.value ?? row?.setting_value;
    if (!raw) return;
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      setStrategy(normalizePricingStrategy(parsed));
    } catch {
      // keep defaults
    }
  }, [settings]);

  const saveStrategyMut = useMutation({
    mutationFn: () => upsertAppSetting(settings, PRICING_STRATEGY_SETTING_KEY, strategy, {
      description: 'Global pricing strategy: min/mid/max margins, category defaults',
      data_type: 'json',
    }),
    onSuccess: () => qc.invalidateQueries(SETTINGS_QUERY_KEYS.all),
  });

  const applyMut = useMutation({
    mutationFn: async ({ productId, row }) => {
      const product = productList.find((p) => p.id === productId);
      if (!product) throw new Error('Product not found');
      const payload = buildProductUpdateFromStrategy(product, row, strategy);
      return products.update(productId, payload);
    },
    onSuccess: (_, { productId }) => {
      qc.invalidateQueries(['admin-products']);
      qc.invalidateQueries(['admin-label-products']);
      setRowEdits((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
    },
    onError: (err) => alert(err?.message || 'Failed to apply prices'),
  });

  const applyAllMut = useMutation({
    mutationFn: async (rows) => {
      for (const { productId, row } of rows) {
        const product = productList.find((p) => p.id === productId);
        if (!product) continue;
        const payload = buildProductUpdateFromStrategy(product, row, strategy);
        await products.update(productId, payload);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries(['admin-products']);
      qc.invalidateQueries(['admin-label-products']);
      setRowEdits({});
    },
    onError: (err) => alert(err?.message || 'Bulk apply failed'),
  });

  const getRow = useCallback((product) => {
    if (rowEdits[product.id]) return rowEdits[product.id];
    return buildRowState(product, strategy);
  }, [rowEdits, strategy]);

  const updateRow = useCallback((productId, patch) => {
    setRowEdits((prev) => {
      const product = productList.find((p) => p.id === productId);
      const base = prev[productId] || buildRowState(product, strategy);
      const next = { ...base, ...patch, dirty: true };
      if (patch.pricing_band && !patch.store_override && !patch.web_override) {
        next.store_override = false;
        next.web_override = false;
        next.store_selling_price_per_kg = '';
        next.web_selling_price_per_kg = '';
      }
      return { ...prev, [productId]: next };
    });
  }, [productList, strategy]);

  const categoryMap = useMemo(
    () => new Map(categoryList.map((c) => [c.id, c.emotional_title || c.name])),
    [categoryList]
  );

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return productList.filter((product) => {
      if (categoryFilter !== 'all' && product.category_id !== categoryFilter) return false;
      const row = getRow(product);
      const preview = computeRowPreview(row, strategy);
      if (showWarningsOnly && !preview.lowMargin && !preview.missingPurchase) return false;
      if (!q) return true;
      const hay = [product.title, product.name, product.sku, product.local_name]
        .filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [productList, search, categoryFilter, showWarningsOnly, getRow, strategy]);

  const dirtyCount = Object.keys(rowEdits).length;
  const warningCount = useMemo(
    () => productList.filter((p) => {
      const preview = computeRowPreview(getRow(p), strategy);
      return preview.lowMargin || preview.missingPurchase;
    }).length,
    [productList, getRow, strategy]
  );

  const handleApplyAllDirty = () => {
    const rows = Object.entries(rowEdits).map(([productId, row]) => ({ productId, row }));
    if (!rows.length) return;
    if (!window.confirm(`Apply pricing to ${rows.length} edited product(s)?`)) return;
    applyAllMut.mutate(rows);
  };

  const handleRecalculateAll = () => {
    if (!window.confirm('Recalculate all product prices from bands + purchase cost? Updates live POS and shop prices.')) return;
    const rows = productList.map((product) => ({
      productId: product.id,
      row: getRow(product),
    }));
    applyAllMut.mutate(rows);
  };

  const handleApplyCategoryDefaults = () => {
    if (categoryFilter === 'all') {
      alert('Pick a category filter first, then apply its default band to all products in that category.');
      return;
    }
    const band = strategy.category_band_defaults?.[categoryFilter] || 'mid';
    const targets = productList.filter((p) => p.category_id === categoryFilter);
    if (!targets.length) return;
    if (!window.confirm(`Set ${targets.length} product(s) to ${band.toUpperCase()} band and mark for apply?`)) return;
    setRowEdits((prev) => {
      const next = { ...prev };
      for (const product of targets) {
        const base = prev[product.id] || buildRowState(product, strategy);
        next[product.id] = {
          ...base,
          pricing_band: band,
          store_override: false,
          web_override: false,
          store_selling_price_per_kg: '',
          web_selling_price_per_kg: '',
          dirty: true,
        };
      }
      return next;
    });
  };

  const toggleOverride = (productId) => {
    setExpandedOverrides((prev) => ({ ...prev, [productId]: !prev[productId] }));
  };

  return (
    <div className="max-w-[1200px] mx-auto pb-16">
      <AdminPageHeader
        title="Pricing Strategy"
        description="Assign each product a min / mid / max band. Sell prices auto-calculate from purchase cost — override only when needed."
        action={(
          <div className="flex flex-wrap gap-2">
            {dirtyCount > 0 ? (
              <button
                type="button"
                onClick={handleApplyAllDirty}
                disabled={applyAllMut.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-wet-earth px-4 py-2 font-inter text-sm text-white hover:bg-wet-earth/90 disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                Apply {dirtyCount} edited
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleRecalculateAll}
              disabled={applyAllMut.isPending || productsLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-white px-4 py-2 font-inter text-sm text-rain-cloud hover:bg-rain-mist/40 disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${applyAllMut.isPending ? 'animate-spin' : ''}`} />
              Push all to products
            </button>
          </div>
        )}
      />

      <StrategyDefaultsPanel
        strategy={strategy}
        categories={categoryList}
        onChange={setStrategy}
        onSave={() => saveStrategyMut.mutate()}
        saving={saveStrategyMut.isPending}
      />

      {warningCount > 0 ? (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-inter text-sm text-amber-800 font-medium">{warningCount} product(s) missing purchase cost</p>
            <p className="font-inter text-xs text-amber-700/80 mt-0.5">
              Bands need a cost ₹/kg (from supplier invoice) to calculate sell rates. Add cost once — bands handle the rest.
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rain-cloud/35" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-border/70 bg-white font-inter text-sm focus:outline-none focus:border-wet-earth/60"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-xl border border-border/70 bg-white px-3 py-2 font-inter text-sm"
        >
          <option value="all">All categories</option>
          {categoryList.map((c) => (
            <option key={c.id} value={c.id}>{c.emotional_title || c.name}</option>
          ))}
        </select>
        {categoryFilter !== 'all' ? (
          <button
            type="button"
            onClick={handleApplyCategoryDefaults}
            className="rounded-xl border border-wet-earth/30 bg-wet-earth/5 px-3 py-2 font-inter text-xs text-wet-earth hover:bg-wet-earth/10"
          >
            Set category → {strategy.category_band_defaults?.[categoryFilter] || 'mid'} band
          </button>
        ) : null}
        <label className="inline-flex items-center gap-2 font-inter text-sm text-rain-cloud/60 cursor-pointer">
          <input
            type="checkbox"
            checked={showWarningsOnly}
            onChange={(e) => setShowWarningsOnly(e.target.checked)}
            className="rounded border-border"
          />
          Missing cost only
        </label>
      </div>

      <div className="space-y-3">
        {productsLoading || settingsLoading ? (
          <p className="font-inter text-sm text-rain-cloud/45 py-12 text-center">Loading catalog…</p>
        ) : filteredProducts.length === 0 ? (
          <p className="font-inter text-sm text-rain-cloud/45 py-12 text-center">No products match</p>
        ) : filteredProducts.map((product) => {
          const row = getRow(product);
          const preview = computeRowPreview(row, strategy);
          const isDirty = rowEdits[product.id]?.dirty;
          const applying = applyMut.isPending && applyMut.variables?.productId === product.id;
          const showOverride = expandedOverrides[product.id] || preview.hasOverride;

          return (
            <div
              key={product.id}
              className={`rounded-2xl border bg-white overflow-hidden transition-colors ${
                preview.missingPurchase ? 'border-amber-200' : 'border-border/60'
              } ${isDirty ? 'ring-2 ring-wet-earth/20' : ''}`}
            >
              <div className="p-4 flex flex-wrap items-start gap-4">
                <div className="flex-1 min-w-[180px]">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-inter text-sm font-medium text-rain-cloud">{product.title || product.name}</p>
                      <p className="font-inter text-[10px] text-rain-cloud/40 mt-0.5">
                        {categoryMap.get(product.category_id) || 'Uncategorized'}
                      </p>
                    </div>
                    <Link to={`/admin/products?edit=${product.id}`} className="text-rain-cloud/30 hover:text-wet-earth" title="Open product">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                <div className="w-44">
                  <label className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/45 block mb-1">Band</label>
                  <BandSelect
                    value={row.pricing_band}
                    onChange={(band) => updateRow(product.id, { pricing_band: band })}
                  />
                </div>

                <div className="w-28">
                  <label className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/45 block mb-1">Cost ₹/kg</label>
                  <NumberInput
                    value={row.purchase_rate_per_kg}
                    onChange={(v) => updateRow(product.id, { purchase_rate_per_kg: v })}
                    placeholder="Invoice"
                    className={preview.missingPurchase ? 'border-amber-300 bg-amber-50/40' : ''}
                  />
                </div>

                <div className="w-32">
                  <label className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/45 block mb-1 flex items-center gap-1">
                    <Store className="w-3 h-3" /> Store rate
                  </label>
                  <p className="font-inter text-lg font-semibold text-rain-cloud">{formatRupee(preview.storeSell)}</p>
                  <p className="font-inter text-[10px] text-rain-cloud/40">
                    <TierBadge tier={preview.channels.store} /> · <MarginCell pct={preview.storeMargin} />
                  </p>
                </div>

                <div className="w-32">
                  <label className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/45 block mb-1 flex items-center gap-1">
                    <Globe className="w-3 h-3" /> Web rate
                  </label>
                  <p className="font-inter text-lg font-semibold text-rain-cloud">{formatRupee(preview.webSell)}</p>
                  <p className="font-inter text-[10px] text-rain-cloud/40">
                    <TierBadge tier={preview.channels.web} /> · <MarginCell pct={preview.webMargin} />
                  </p>
                </div>

                <div className="flex flex-col gap-1.5 pt-4">
                  <button
                    type="button"
                    onClick={() => applyMut.mutate({ productId: product.id, row })}
                    disabled={applying || applyAllMut.isPending}
                    className={`rounded-lg px-3 py-2 font-inter text-xs font-medium ${
                      isDirty
                        ? 'bg-wet-earth text-white hover:bg-wet-earth/90'
                        : 'border border-border/60 text-rain-cloud/60 hover:bg-rain-mist/50'
                    } disabled:opacity-50`}
                  >
                    {applying ? '…' : 'Apply'}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleOverride(product.id)}
                    className={`inline-flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 font-inter text-[10px] ${
                      preview.hasOverride ? 'text-wet-earth' : 'text-rain-cloud/40 hover:text-rain-cloud/60'
                    }`}
                  >
                    <SlidersHorizontal className="w-3 h-3" />
                    {showOverride ? 'Hide' : 'Override'}
                  </button>
                </div>
              </div>

              {preview.missingPurchase ? null : (
                <div className="px-4 pb-3 flex gap-4 font-inter text-[10px] text-rain-cloud/35 border-t border-border/30 pt-2 mx-4">
                  <span>Min {formatRupee(preview.tierRates.min)}</span>
                  <span>Mid {formatRupee(preview.tierRates.mid)}</span>
                  <span>Max {formatRupee(preview.tierRates.max)}</span>
                  <span className="text-rain-cloud/25">·</span>
                  <span>Web = {preview.band} + {strategy.web_tier_step} → {bumpTier(preview.band, strategy.web_tier_step)}</span>
                </div>
              )}

              {showOverride ? (
                <div className="px-4 pb-4">
                  <OverridePanel
                    row={row}
                    preview={preview}
                    onChange={(patch) => updateRow(product.id, patch)}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <p className="mt-6 font-inter text-xs text-rain-cloud/40 max-w-2xl">
        You only pick the <strong className="text-rain-cloud/55">band</strong> per product (or set category defaults above).
        Sell rates compute from purchase cost. Store counter uses the product band; website steps up by {strategy.web_tier_step} band(s).
        Use <strong className="text-rain-cloud/55">Override</strong> only for exceptions.
      </p>
    </div>
  );
}
