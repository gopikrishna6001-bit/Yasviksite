import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Calculator, Save, RefreshCw, AlertTriangle, Search,
  ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Pencil, Plus, Trash2,
} from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminCollapseSection from '@/components/admin/AdminCollapseSection';
import AdminCatalogueTabs from '@/components/admin/AdminCatalogueTabs';
import InvoiceRepricingPanel from '@/components/admin/InvoiceRepricingPanel';
import { products, categories } from '@/services/api';
import { buildCategorySelectOptions, categoryBreadcrumb, expandCategoryFilterIds } from '@/lib/categoryTree';
import {
  fetchAllAppSettings,
  upsertAppSetting,
  SETTINGS_QUERY_KEYS,
} from '@/services/settingsService';
import {
  DEFAULT_PRICING_STRATEGY,
  PRICING_STRATEGY_SETTING_KEY,
  buildProductUpdateFromStrategy,
  computeTierSellRates,
  defaultBandsForCategory,
  extractProductStrategy,
  formatRupee,
  getPricingBands,
  normalizeBandId,
  normalizePricingStrategy,
  resolveBandSelectValue,
  sellPerKgFromPurchase,
  readProductPackRuleOverride,
  getPricingRowStatus,
  marginPctForBand,
  normalizePackMargins,
  normalizePackMoneyMap,
  packMarginsDifferFromBand,
  resolvePackMarginPct,
  syncPackMarginsForLabels,
  syncPackMoneyMapForLabels,
  computeSuggestedPackShelfPrice,
  computeMrpFromShelfPrice,
  computePackGrossProfit,
  packCharmForBand,
} from '@/lib/pricingStrategy';
import { isPricingMetaVariant } from '@/lib/productPricingMeta';
import { parseOptionalNumber } from '@/lib/productPricingUtils';
import { resolveProductMeasureType } from '@/lib/productStockUtils';
import {
  mergeVariantsFromPackList,
  packLabelsFromVariants,
  parsePackQuantity,
  parsePackSizeList,
  getPricingRateLabels,
} from '@/lib/productVariantUtils';

function defaultMarginForRow(row, strategy) {
  return marginPctForBand(row.pricing_band || row.store_band || 'mid', strategy);
}

function packMapString(row, field, label) {
  const map = normalizePackMoneyMap(row[field]);
  if (map[label] != null && map[label] !== '') return map[label];
  const found = Object.entries(map).find(([key]) => key.toLowerCase() === label.toLowerCase());
  return found?.[1] ?? '';
}

function packMarginValue(row, label) {
  return packMapString(row, 'pack_margins', label);
}

function renamePackAtIndex(row, strategy, index, newLabel) {
  const labels = parsePackSizeList(row.pack_sizes);
  const oldLabel = labels[index];
  const trimmed = String(newLabel || '').trim();
  if (!trimmed || !oldLabel) return null;
  labels[index] = trimmed;

  const remap = (field, fallback = '') => {
    const map = normalizePackMoneyMap(row[field]);
    const prevVal = packMapString(row, field, oldLabel);
    const next = {};
    for (const [key, value] of Object.entries(map)) {
      if (key.toLowerCase() === oldLabel.toLowerCase()) continue;
      next[key] = value;
    }
    if (prevVal !== '' && prevVal != null) next[trimmed] = String(prevVal);
    else if (fallback !== '') next[trimmed] = String(fallback);
    return next;
  };

  return {
    pack_sizes: labels.join(', '),
    pack_margins: remap('pack_margins', defaultMarginForRow(row, strategy)),
    pack_packaging_rs: remap('pack_packaging_rs'),
    pack_price_overrides: remap('pack_price_overrides'),
  };
}

function addPackSize(row, strategy, measureType = 'kg') {
  const labels = parsePackSizeList(row.pack_sizes);
  const existing = new Set(labels.map((label) => label.toLowerCase()));
  const candidates = measureType === 'L'
    ? ['1L', '500ml', '250ml', '200ml', '5L']
    : measureType === 'units'
      ? ['1 pc', '2 pcs', '6 pcs', '12 pcs', 'Pack']
      : ['1kg', '500g', '250g', '100g', '2kg'];
  const fallback = measureType === 'L'
    ? `${Math.max(1, labels.length + 1) * 250}ml`
    : measureType === 'units'
      ? `${labels.length + 1} pc`
      : `${Math.max(1, labels.length + 1) * 100}g`;
  const nextLabel = candidates.find((label) => !existing.has(label.toLowerCase())) || fallback;
  const nextLabels = [...labels, nextLabel];
  return {
    pack_sizes: nextLabels.join(', '),
    pack_margins: syncPackMarginsForLabels(nextLabels, row.pack_margins, defaultMarginForRow(row, strategy)),
    pack_packaging_rs: syncPackMoneyMapForLabels(nextLabels, row.pack_packaging_rs),
    pack_price_overrides: syncPackMoneyMapForLabels(nextLabels, row.pack_price_overrides),
  };
}

function removePackAtIndex(row, strategy, index) {
  const labels = parsePackSizeList(row.pack_sizes).filter((_, i) => i !== index);
  return {
    pack_sizes: labels.join(', '),
    pack_margins: syncPackMarginsForLabels(labels, row.pack_margins, defaultMarginForRow(row, strategy)),
    pack_packaging_rs: syncPackMoneyMapForLabels(labels, row.pack_packaging_rs),
    pack_price_overrides: syncPackMoneyMapForLabels(labels, row.pack_price_overrides),
  };
}

function clearPackPriceOverride(row, label) {
  const next = { ...normalizePackMoneyMap(row.pack_price_overrides) };
  delete next[label];
  for (const key of Object.keys(next)) {
    if (key.toLowerCase() === label.toLowerCase()) delete next[key];
  }
  return next;
}

function clearAllPackPriceOverrides() {
  return {};
}

function CollapseSection(props) {
  return <AdminCollapseSection {...props} className="bg-rain-mist/10 border-border/50" />;
}

const PRICING_COLLAPSED_KEY = 'yasvik_pricing_collapsed_cats';
const PRICING_AUTOSAVE_KEY = 'yasvik_pricing_autosave';

function loadCollapsedCategories() {
  try {
    const raw = localStorage.getItem(PRICING_COLLAPSED_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function PricingStatusBadge({ status }) {
  if (status === 'synced') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-inter text-[10px] font-medium text-emerald-700">
        <CheckCircle2 className="h-3 w-3" /> Up to date
      </span>
    );
  }
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-inter text-[10px] font-medium text-amber-800">
        <AlertCircle className="h-3 w-3" /> Needs update
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rain-mist/60 px-2 py-0.5 font-inter text-[10px] text-rain-cloud/50">
      Add cost
    </span>
  );
}

function strategyRowPayload(row, strategy) {
  const resolve = (rowVal, globalVal) => {
    const rowNum = parseOptionalNumber(rowVal);
    if (rowNum != null) return rowNum;
    return parseOptionalNumber(globalVal);
  };
  return {
    ...row,
    price_inflate_percent: resolve(row.price_inflate_percent, strategy.price_inflate_percent),
    store_price_inflate_percent: resolve(row.store_price_inflate_percent, strategy.store_price_inflate_percent),
  };
}
function productWithPackSizes(product, row) {
  const packTokens = parsePackSizeList(row.pack_sizes);
  if (!packTokens.length) return product;
  const existing = (product.quick_variants ?? product.variants ?? []).filter((v) => v && !isPricingMetaVariant(v));
  const merged = mergeVariantsFromPackList(packTokens, existing);
  return { ...product, quick_variants: merged, variants: merged };
}

function NumberInput({ value, onChange, onBlur, placeholder, className = '', disabled = false }) {
  return (
    <input
      type="number"
      step="any"
      disabled={disabled}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? '' : e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      className={`w-full rounded-lg border border-border/70 bg-white px-2 py-1.5 font-inter text-sm text-rain-cloud focus:outline-none focus:border-wet-earth/60 disabled:bg-rain-mist/40 disabled:text-rain-cloud/45 ${className}`}
    />
  );
}

function BandSelect({ value, onChange, strategy, className = '' }) {
  const bands = getPricingBands(strategy);
  const resolved = resolveBandSelectValue(value, bands, bands, 'all');

  if (!bands.length) {
    return (
      <span className="font-inter text-[10px] text-rain-cloud/45">
        Add pricing bands above
      </span>
    );
  }

  return (
    <select
      value={resolved}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-lg border border-border/70 bg-white px-2 py-2 font-inter text-sm font-medium text-rain-cloud focus:outline-none focus:border-wet-earth/60 ${className}`}
    >
      {bands.map((band) => (
        <option key={band.id} value={band.id}>{band.label} ({band.margin_pct}%)</option>
      ))}
    </select>
  );
}

function slugifyBandId(label, index = 0) {
  const base = String(label || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  return base || `band_${index + 1}`;
}

function BandsEditor({ strategy, onChange }) {
  const bands = getPricingBands(strategy);

  const updateBand = (index, patch) => {
    const next = bands.map((band, i) => (i === index ? { ...band, ...patch } : band));
    onChange({ ...strategy, bands: next });
  };

  const addBand = () => {
    const label = `Band ${bands.length + 1}`;
    const id = slugifyBandId(label, bands.length);
    onChange({
      ...strategy,
      bands: [...bands, { id, label, margin_pct: 20, pack_charm: 'nine' }],
    });
  };

  const removeBand = (index) => {
    if (bands.length <= 1) return;
    const removed = bands[index];
    const nextBands = bands.filter((_, i) => i !== index);
    const nextDefaults = { ...strategy.category_channel_defaults };
    Object.entries(nextDefaults).forEach(([catId, entry]) => {
      if (entry?.store === removed.id || entry?.web === removed.id || entry?.band === removed.id) {
        nextDefaults[catId] = { store: 'mid', web: 'mid', band: 'mid' };
      }
    });
    onChange({ ...strategy, bands: nextBands, category_channel_defaults: nextDefaults });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-inter text-xs font-medium text-rain-cloud/70">Pricing bands</h3>
        <button
          type="button"
          onClick={addBand}
          className="font-inter text-[11px] text-wet-earth hover:text-wet-earth/80"
        >
          + Add band
        </button>
      </div>
      <p className="font-inter text-[10px] text-rain-cloud/40">
        Each pack picks a margin level (band) on the product card. These bands define the % options. Pack prices round to ₹…9 unless set to whole rupees.
      </p>
      <div className="space-y-2">
        {bands.map((band, index) => (
          <div key={band.id} className="grid grid-cols-[1fr_1fr_80px_100px_36px] gap-2 items-center rounded-xl border border-border/50 bg-rain-mist/20 px-3 py-2">
            <input
              value={band.label}
              onChange={(e) => updateBand(index, { label: e.target.value })}
              placeholder="Label"
              className="rounded-lg border border-border/60 bg-white px-2 py-1.5 font-inter text-xs"
            />
            <input
              value={band.id}
              onChange={(e) => updateBand(index, { id: slugifyBandId(e.target.value, index) })}
              placeholder="id"
              className="rounded-lg border border-border/60 bg-white px-2 py-1.5 font-inter text-[10px] text-rain-cloud/55"
            />
            <NumberInput
              value={band.margin_pct}
              onChange={(v) => updateBand(index, { margin_pct: v === '' ? '' : Number(v) })}
              placeholder="%"
            />
            <select
              value={band.pack_charm || 'nine'}
              onChange={(e) => updateBand(index, { pack_charm: e.target.value })}
              className="rounded-lg border border-border/60 bg-white px-2 py-1.5 font-inter text-[10px]"
            >
              <option value="nine">₹…9 charm</option>
              <option value="whole">Whole ₹</option>
            </select>
            <button
              type="button"
              onClick={() => removeBand(index)}
              disabled={bands.length <= 1}
              className="text-rain-cloud/30 hover:text-red-400 disabled:opacity-30 text-xs"
              title="Remove band"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function StrategyDefaultsPanel({ strategy, categories, onChange, onSave, saving }) {
  const categoryOptions = useMemo(
    () => buildCategorySelectOptions(categories),
    [categories],
  );
  const [open, setOpen] = useState(false);
  const f = (key) => (val) => onChange({ ...strategy, [key]: val });

  const setCategoryBand = (categoryId, band) => {
    onChange({
      ...strategy,
      category_channel_defaults: {
        ...strategy.category_channel_defaults,
        [categoryId]: { store: band, web: band, band },
      },
    });
  };

  const categoryDefaults = (catId) => defaultBandsForCategory(catId, strategy);

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
              One margin band per category — products inherit it. Same price for shop, POS, and labels.
            </p>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-rain-cloud/40" /> : <ChevronDown className="w-4 h-4 text-rain-cloud/40" />}
      </button>

      {open ? (
        <div className="px-5 pb-5 border-t border-border/40 space-y-4">
          <CollapseSection title="Pricing bands" description="Margin % per band — pack prices charm to ₹…9">
            <BandsEditor strategy={strategy} onChange={onChange} />
            <div className="rounded-xl bg-rain-mist/50 border border-temple-stone/20 px-4 py-3 font-inter text-xs text-rain-cloud/60">
              Cost ₹100 (per unit) →{' '}
              {getPricingBands(strategy).map((band) => (
                <span key={band.id} className="mr-3">
                  {band.label} {formatRupee(100 * (1 + band.margin_pct / 100))}
                </span>
              ))}
            </div>
          </CollapseSection>

          <CollapseSection title="Global MRP & pack rules" description="Defaults — override per product below when needed">
            <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
              <div>
                <label className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/50 block mb-1.5">MRP inflate %</label>
                <NumberInput value={strategy.price_inflate_percent} onChange={f('price_inflate_percent')} placeholder="15" />
              </div>
              <div>
                <label className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/50 block mb-1.5">Pack rounding</label>
                <select
                  value={strategy.pack_charm_mode || 'nine'}
                  onChange={(e) => onChange({ ...strategy, pack_charm_mode: e.target.value })}
                  className="w-full rounded-lg border border-border/70 bg-white px-2 py-2 font-inter text-sm"
                >
                  <option value="nine">Nearest ₹…9</option>
                  <option value="whole">Whole ₹</option>
                </select>
              </div>
            </div>
          </CollapseSection>

          {categoryOptions.length > 0 ? (
            <CollapseSection
              title="Default band per category"
              description="Inherited by products unless overridden below"
            >
              <div className="space-y-2 max-h-[320px] overflow-y-auto">
                {categoryOptions.map((opt) => (
                  <div key={opt.value} className="grid sm:grid-cols-[1fr_160px] gap-2 items-center rounded-xl border border-border/50 px-3 py-2 bg-white">
                    <span className="font-inter text-xs text-rain-cloud/70 truncate">
                      {opt.label}
                    </span>
                    <BandSelect
                      value={categoryDefaults(opt.value).band}
                      onChange={(band) => setCategoryBand(opt.value, band)}
                      strategy={strategy}
                      className="text-xs py-1 w-full"
                    />
                  </div>
                ))}
              </div>
            </CollapseSection>
          ) : null}

          <div className="flex justify-end pt-2">
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
  const categoryDefaults = defaultBandsForCategory(product.category_id, strategy);
  const sellable = (product.quick_variants ?? product.variants ?? []).filter((v) => v && !isPricingMetaVariant(v));
  const band = current.pricing_band || current.store_band || categoryDefaults.band;
  const hasOverride = current.web_override || current.store_override;
  const packSizes = packLabelsFromVariants(sellable);
  const defaultMargin = marginPctForBand(band, strategy);
  const packMargins = syncPackMarginsForLabels(
    parsePackSizeList(packSizes),
    current.pack_margins,
    defaultMargin,
  );
  const packLabels = parsePackSizeList(packSizes);
  return {
    purchase_rate_per_kg: current.purchase_rate_per_kg ?? '',
    pricing_band: band,
    store_band: band,
    web_band: band,
    pack_sizes: packSizes,
    pack_margins: packMargins,
    pack_packaging_rs: syncPackMoneyMapForLabels(packLabels, current.pack_packaging_rs),
    pack_price_overrides: syncPackMoneyMapForLabels(packLabels, current.pack_price_overrides),
    store_override: hasOverride,
    web_override: hasOverride,
    store_selling_price_per_kg: hasOverride ? (current.web_selling_price_per_kg ?? current.store_selling_price_per_kg ?? '') : '',
    web_selling_price_per_kg: hasOverride ? (current.web_selling_price_per_kg ?? current.store_selling_price_per_kg ?? '') : '',
    price_inflate_percent: readProductPackRuleOverride(product, 'price_inflate_percent'),
    store_price_inflate_percent: '',
    dirty: false,
  };
}

function computeRowPreview(row, strategy) {
  const purchase = row.purchase_rate_per_kg === '' ? null : Number(row.purchase_rate_per_kg);
  const band = normalizeBandId(row.pricing_band || row.store_band || row.web_band || 'mid', strategy);
  const tierRates = purchase != null ? computeTierSellRates(purchase, strategy) : {};
  const packLabels = parsePackSizeList(row.pack_sizes);
  const hasVaryingPackMargins = packMarginsDifferFromBand(row.pack_margins, band, strategy);

  const overrideSell = (row.web_override || row.store_override)
    && (row.web_selling_price_per_kg !== '' || row.store_selling_price_per_kg !== '');
  const primaryLabel = packLabels.find((label) => /1\s*kg/i.test(label)) || packLabels[0];
  const primaryMargin = primaryLabel
    ? resolvePackMarginPct(primaryLabel, row.pack_margins, band, strategy)
    : marginPctForBand(band, strategy);
  const sell = overrideSell
    ? Number(row.web_selling_price_per_kg || row.store_selling_price_per_kg)
    : sellPerKgFromPurchase(purchase, primaryMargin);

  return {
    storeBand: band,
    webBand: band,
    band,
    tierRates,
    storeSell: sell,
    webSell: sell,
    storeMargin: primaryMargin,
    webMargin: primaryMargin,
    lowMargin: sell && purchase && sell - purchase < purchase * 0.05,
    missingPurchase: purchase == null || purchase <= 0,
    hasOverride: row.store_override || row.web_override,
    hasCustomPackRules: hasCustomPackRules(row, strategy),
    hasVaryingPackMargins,
  };
}

function hasCustomPackRules(row = {}, strategy = DEFAULT_PRICING_STRATEGY) {
  const band = normalizeBandId(row.pricing_band || row.store_band || row.web_band || 'mid', strategy);
  return Boolean(
    (row.price_inflate_percent !== '' && row.price_inflate_percent != null)
    || packMarginsDifferFromBand(row.pack_margins, band, strategy),
  );
}

export default function AdminPricingStrategy() {
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const highlightProductId = searchParams.get('product') || '';
  const [strategy, setStrategy] = useState(DEFAULT_PRICING_STRATEGY);
  const [rowEdits, setRowEdits] = useState({});
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showWarningsOnly, setShowWarningsOnly] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState(loadCollapsedCategories);
  const [autosaveOnBlur, setAutosaveOnBlur] = useState(() => {
    try {
      return localStorage.getItem(PRICING_AUTOSAVE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const autosaveTimerRef = useRef(null);
  const productRowRefs = useRef({});

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

  useEffect(() => {
    const organicCat = categoryList.find((c) => c.slug === 'organic-essentials');
    if (!organicCat?.id) return;
    setStrategy((prev) => {
      if (prev.category_channel_defaults?.[organicCat.id]) return prev;
      const organicBand = getPricingBands(prev).find((b) => b.id === 'organic' || b.id === 'store_organic')?.id || 'organic';
      return {
        ...prev,
        category_channel_defaults: {
          ...prev.category_channel_defaults,
          [organicCat.id]: { store: organicBand, web: organicBand, band: organicBand },
        },
      };
    });
  }, [categoryList]);

  useEffect(() => {
    try {
      localStorage.setItem(PRICING_COLLAPSED_KEY, JSON.stringify(collapsedCategories));
    } catch {
      // ignore
    }
  }, [collapsedCategories]);

  useEffect(() => {
    try {
      localStorage.setItem(PRICING_AUTOSAVE_KEY, autosaveOnBlur ? '1' : '0');
    } catch {
      // ignore
    }
  }, [autosaveOnBlur]);

  useEffect(() => {
    if (!highlightProductId) return;
    const el = productRowRefs.current[highlightProductId];
    if (el?.scrollIntoView) {
      window.setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
    }
  }, [highlightProductId, productList, productsLoading]);

  const saveStrategyMut = useMutation({
    mutationFn: () => upsertAppSetting(settings, PRICING_STRATEGY_SETTING_KEY, strategy, {
      description: 'Global pricing strategy: min/mid/max margins, category defaults',
      data_type: 'json',
    }),
    onSuccess: () => qc.invalidateQueries(SETTINGS_QUERY_KEYS.all),
  });

  const applyMut = useMutation({
    mutationFn: async ({ productId, row }) => {
      const base = productList.find((p) => p.id === productId);
      if (!base) throw new Error('Product not found');
      const product = productWithPackSizes(base, row);
      const payload = buildProductUpdateFromStrategy(product, strategyRowPayload(row, strategy), strategy);
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
        const base = productList.find((p) => p.id === productId);
        if (!base) continue;
        const product = productWithPackSizes(base, row);
        const payload = buildProductUpdateFromStrategy(product, strategyRowPayload(row, strategy), strategy);
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
      if (patch.pricing_band || patch.store_band || patch.web_band) {
        const band = patch.pricing_band || patch.store_band || patch.web_band;
        next.pricing_band = band;
        next.store_band = band;
        next.web_band = band;
        if (!patch.store_override && !patch.web_override) {
          next.store_override = false;
          next.web_override = false;
          next.store_selling_price_per_kg = '';
          next.web_selling_price_per_kg = '';
        }
      }
      if (patch.pack_sizes != null && patch.pack_margins == null) {
        next.pack_margins = syncPackMarginsForLabels(
          parsePackSizeList(next.pack_sizes),
          base.pack_margins,
          marginPctForBand(next.pricing_band || next.store_band || 'mid', strategy),
        );
        next.pack_packaging_rs = syncPackMoneyMapForLabels(
          parsePackSizeList(next.pack_sizes),
          base.pack_packaging_rs,
        );
        next.pack_price_overrides = syncPackMoneyMapForLabels(
          parsePackSizeList(next.pack_sizes),
          base.pack_price_overrides,
        );
      }
      if (patch.pack_margins != null) {
        next.pack_margins = normalizePackMargins(patch.pack_margins);
      }
      if (patch.pack_packaging_rs != null) {
        next.pack_packaging_rs = normalizePackMoneyMap(patch.pack_packaging_rs);
      }
      if (patch.pack_price_overrides != null) {
        next.pack_price_overrides = normalizePackMoneyMap(patch.pack_price_overrides);
      }
      return { ...prev, [productId]: next };
    });
  }, [productList, strategy]);

  const scheduleAutosave = useCallback((productId) => {
    if (!autosaveOnBlur) return;
    if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = window.setTimeout(() => {
      setRowEdits((prev) => {
        const row = prev[productId];
        if (!row?.dirty) return prev;
        applyMut.mutate({ productId, row });
        return prev;
      });
    }, 800);
  }, [autosaveOnBlur, applyMut]);

  const categoryMap = useMemo(
    () => new Map(categoryList.map((c) => [c.id, categoryBreadcrumb(c.id, categoryList) || c.emotional_title || c.name])),
    [categoryList]
  );

  const categoryFilterOptions = useMemo(
    () => buildCategorySelectOptions(categoryList, productList),
    [categoryList, productList],
  );

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const categoryIds = categoryFilter === 'all'
      ? null
      : new Set(expandCategoryFilterIds(categoryFilter, categoryList));
    return productList.filter((product) => {
      if (categoryIds && !categoryIds.has(product.category_id)) return false;
      const row = getRow(product);
      const preview = computeRowPreview(row, strategy);
      if (showWarningsOnly && !preview.lowMargin && !preview.missingPurchase) return false;
      if (!q) return true;
      const hay = [product.title, product.name, product.sku, product.local_name]
        .filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [productList, search, categoryFilter, categoryList, showWarningsOnly, getRow, strategy]);

  const productsByCategory = useMemo(() => {
    const groups = new Map();
    filteredProducts.forEach((product) => {
      const key = product.category_id || 'uncategorized';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(product);
    });
    return [...groups.entries()].sort((a, b) => {
      const nameA = categoryMap.get(a[0]) || 'Uncategorized';
      const nameB = categoryMap.get(b[0]) || 'Uncategorized';
      return nameA.localeCompare(nameB);
    });
  }, [filteredProducts, categoryMap]);

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
    const defaults = defaultBandsForCategory(categoryFilter, strategy);
    const band = defaults.band;
    const categoryIds = new Set(expandCategoryFilterIds(categoryFilter, categoryList));
    const targets = productList.filter((p) => categoryIds.has(p.category_id));
    if (!targets.length) return;
    if (!window.confirm(`Set ${targets.length} product(s) to band "${band}" and mark for apply?`)) return;
    setRowEdits((prev) => {
      const next = { ...prev };
      for (const product of targets) {
        const base = prev[product.id] || buildRowState(product, strategy);
        next[product.id] = {
          ...base,
          pricing_band: band,
          store_band: band,
          web_band: band,
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

  const handleApplyCategoryDirty = (catId) => {
    const categoryIds = new Set(expandCategoryFilterIds(catId, categoryList));
    const rows = filteredProducts
      .filter((p) => categoryIds.has(p.category_id) && rowEdits[p.id]?.dirty)
      .map((p) => ({ productId: p.id, row: rowEdits[p.id] }));
    if (!rows.length) return;
    applyAllMut.mutate(rows);
  };

  const handleInvoiceBatch = (rows) => {
    if (!rows.length) return;
    applyAllMut.mutate(rows.map(({ productId, row }) => ({ productId, row })));
  };

  return (
    <div className="max-w-[1200px] mx-auto pb-28 px-6">
      <AdminCatalogueTabs />
      <AdminPageHeader
        title="Pricing Strategy"
        description="Shelf price is auto from cost + packaging + margin. Override only when needed."
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
                Save {dirtyCount} edited
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleRecalculateAll}
              disabled={applyAllMut.isPending || productsLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-white px-4 py-2 font-inter text-sm text-rain-cloud hover:bg-rain-mist/40 disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${applyAllMut.isPending ? 'animate-spin' : ''}`} />
              Recalculate all
            </button>
          </div>
        )}
      />

      {warningCount > 0 ? (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-inter text-sm text-amber-800 font-medium">{warningCount} product(s) missing cost</p>
            <p className="font-inter text-xs text-amber-700/80 mt-0.5">
              Add Cost ₹/kg, ₹/L, or ₹/pc (based on product measure) once, then set margin % on each pack size.
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
          {categoryFilterOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {categoryFilter !== 'all' ? (
          <button
            type="button"
            onClick={handleApplyCategoryDefaults}
            className="rounded-xl border border-wet-earth/30 bg-wet-earth/5 px-3 py-2 font-inter text-xs text-wet-earth hover:bg-wet-earth/10"
          >
            Set category defaults
          </button>
        ) : null}
        <label className="inline-flex items-center gap-2 font-inter text-sm text-rain-cloud/60 cursor-pointer">
          <input
            type="checkbox"
            checked={autosaveOnBlur}
            onChange={(e) => setAutosaveOnBlur(e.target.checked)}
            className="rounded border-border"
          />
          Auto-update on blur
        </label>
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
        ) : productsByCategory.map(([catId, catProducts]) => {
          const catName = categoryMap.get(catId) || 'Uncategorized';
          const catOpen = collapsedCategories[catId] !== true;
          const dirtyInCat = catProducts.filter((p) => rowEdits[p.id]?.dirty).length;

          return (
            <div key={catId} className="rounded-2xl border border-border/60 bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => setCollapsedCategories((prev) => ({ ...prev, [catId]: catOpen }))}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-rain-mist/30 transition-colors"
              >
                <div className="text-left">
                  <p className="font-inter text-sm font-medium text-rain-cloud">{catName}</p>
                  <p className="font-inter text-[10px] text-rain-cloud/40">
                    {catProducts.length} product{catProducts.length === 1 ? '' : 's'}
                    {dirtyInCat > 0 ? ` · ${dirtyInCat} edited` : ''}
                  </p>
                </div>
                {catOpen ? <ChevronUp className="w-4 h-4 text-rain-cloud/40" /> : <ChevronDown className="w-4 h-4 text-rain-cloud/40" />}
              </button>

              {catOpen ? (
                <div className="border-t border-border/40 space-y-3 p-3 bg-rain-mist/10">
                  {catProducts.map((product) => {
                    const row = getRow(product);
                    const preview = computeRowPreview(row, strategy);
                    const isDirty = rowEdits[product.id]?.dirty;
                    const applying = applyMut.isPending && applyMut.variables?.productId === product.id;
                    const packLabels = parsePackSizeList(row.pack_sizes);
                    const packProduct = productWithPackSizes(product, row);
                    const measureType = resolveProductMeasureType(product);
                    const rateLabels = getPricingRateLabels(measureType);
                    const rowStatus = getPricingRowStatus(packProduct, row, strategy);
                    const isHighlighted = highlightProductId === product.id;

                    return (
                      <div
                        key={product.id}
                        ref={(el) => { productRowRefs.current[product.id] = el; }}
                        className={`rounded-xl border bg-white overflow-hidden transition-colors ${
                          preview.missingPurchase ? 'border-amber-200' : 'border-border/50'
                        } ${isDirty ? 'ring-2 ring-wet-earth/20' : ''} ${isHighlighted ? 'ring-2 ring-forest-canopy/40' : ''}`}
                      >
                        <div className="p-4 space-y-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-inter text-sm font-medium text-rain-cloud">
                                {product.title || product.name}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                <PricingStatusBadge status={rowStatus} />
                                <span className="inline-flex rounded bg-rain-mist/80 px-1.5 py-0.5 font-inter text-[9px] font-semibold uppercase tracking-wide text-rain-cloud/50">
                                  {measureType === 'L' ? 'Litres' : measureType === 'units' ? 'Pieces' : 'kg'}
                                </span>
                                <Link
                                  to={`/admin/products?edit=${product.id}`}
                                  className="inline-flex items-center gap-1 font-inter text-[10px] text-rain-cloud/40 hover:text-wet-earth"
                                >
                                  <Pencil className="w-3 h-3" /> Edit product
                                </Link>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => applyMut.mutate({ productId: product.id, row })}
                              disabled={applying || applyAllMut.isPending}
                              className={`rounded-lg px-4 py-2 font-inter text-sm font-medium ${
                                isDirty
                                  ? 'bg-wet-earth text-white hover:bg-wet-earth/90'
                                  : 'border border-border/60 text-rain-cloud/60 hover:bg-rain-mist/50'
                              } disabled:opacity-50`}
                            >
                              {applying ? 'Saving…' : 'Save'}
                            </button>
                          </div>

                          <div className="flex flex-wrap items-end gap-4">
                            <div className="w-36">
                              <label className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/45 block mb-1">
                                {rateLabels.rateLabel}
                              </label>
                              <NumberInput
                                value={row.purchase_rate_per_kg}
                                onChange={(v) => updateRow(product.id, {
                                  purchase_rate_per_kg: v,
                                  pack_price_overrides: clearAllPackPriceOverrides(),
                                })}
                                onBlur={() => scheduleAutosave(product.id)}
                                placeholder={rateLabels.rateHint}
                                className={preview.missingPurchase ? 'border-amber-300 bg-amber-50/40' : ''}
                              />
                            </div>
                            <div className="w-36">
                              <label className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/45 block mb-1">
                                Web MRP inflate %
                              </label>
                              <NumberInput
                                value={row.price_inflate_percent}
                                onChange={(v) => updateRow(product.id, {
                                  price_inflate_percent: v,
                                  store_price_inflate_percent: v,
                                })}
                                onBlur={() => scheduleAutosave(product.id)}
                                placeholder={`Global ${strategy.price_inflate_percent ?? 15}`}
                                className="text-sm"
                              />
                            </div>
                          </div>

                          <div className="overflow-x-auto rounded-lg border border-border/50">
                            <table className="w-full min-w-[520px] text-left">
                              <thead>
                                <tr className="border-b border-border/40 bg-rain-mist/30">
                                  <th className="px-3 py-2 font-inter text-[10px] font-medium uppercase tracking-wider text-rain-cloud/45">
                                    Size
                                  </th>
                                  <th className="px-3 py-2 font-inter text-[10px] font-medium uppercase tracking-wider text-rain-cloud/45 w-28">
                                    Packaging ₹
                                  </th>
                                  <th className="px-3 py-2 font-inter text-[10px] font-medium uppercase tracking-wider text-rain-cloud/45 w-24">
                                    Margin %
                                  </th>
                                  <th className="px-3 py-2 font-inter text-[10px] font-medium uppercase tracking-wider text-rain-cloud/45 w-28">
                                    Shelf price
                                  </th>
                                  <th className="px-3 py-2 font-inter text-[10px] font-medium uppercase tracking-wider text-rain-cloud/45 w-28">
                                    MRP preview
                                  </th>
                                  <th className="px-3 py-2 font-inter text-[10px] font-medium uppercase tracking-wider text-rain-cloud/45 w-28">
                                    Gross profit
                                  </th>
                                  <th className="w-10 px-2 py-2" />
                                </tr>
                              </thead>
                              <tbody>
                                {packLabels.length === 0 ? (
                                  <tr>
                                    <td colSpan={7} className="px-3 py-4 font-inter text-xs text-rain-cloud/45 text-center">
                                      No pack sizes yet — add one below.
                                    </td>
                                  </tr>
                                ) : packLabels.map((label, index) => {
                                  const packQty = parsePackQuantity(null, label, measureType);
                                  const packagingValue = packMapString(row, 'pack_packaging_rs', label);
                                  const marginValue = packMarginValue(row, label);
                                  const marginPct = resolvePackMarginPct(
                                    label,
                                    row.pack_margins,
                                    row.pricing_band || 'mid',
                                    strategy,
                                  );
                                  const packagingRs = parseOptionalNumber(packagingValue) ?? 0;
                                  const packCharm = packCharmForBand(row.pricing_band || 'mid', strategy);
                                  const suggested = computeSuggestedPackShelfPrice({
                                    purchasePerKg: row.purchase_rate_per_kg,
                                    packKg: packQty,
                                    packagingRs,
                                    marginPct,
                                    packCharm,
                                  });
                                  const overrideVal = packMapString(row, 'pack_price_overrides', label);
                                  const isOverridden = overrideVal !== '' && parseOptionalNumber(overrideVal) != null;
                                  const shelfForMrp = isOverridden
                                    ? parseOptionalNumber(overrideVal)
                                    : suggested;
                                  const inflatePct = parseOptionalNumber(row.price_inflate_percent)
                                    ?? parseOptionalNumber(strategy.price_inflate_percent);
                                  const mrpPreview = computeMrpFromShelfPrice(shelfForMrp, inflatePct, packCharm);
                                  const grossProfit = computePackGrossProfit({
                                    purchasePerKg: row.purchase_rate_per_kg,
                                    packKg: packQty,
                                    packagingRs,
                                    shelfPrice: shelfForMrp,
                                  });
                                  const grossPct = shelfForMrp != null && shelfForMrp > 0 && grossProfit != null
                                    ? Math.round((grossProfit / shelfForMrp) * 100)
                                    : null;

                                  return (
                                    <tr key={`${product.id}-${index}-${label}`} className="border-b border-border/30 last:border-0">
                                      <td className="px-2 py-1.5">
                                        <input
                                          key={`${product.id}-size-${index}-${label}`}
                                          defaultValue={label}
                                          onBlur={(e) => {
                                            const next = String(e.target.value || '').trim();
                                            if (!next || next === label) return;
                                            const patch = renamePackAtIndex(row, strategy, index, next);
                                            if (patch) {
                                              updateRow(product.id, patch);
                                              scheduleAutosave(product.id);
                                            } else {
                                              e.target.value = label;
                                            }
                                          }}
                                          placeholder={rateLabels.packHint.includes('Bottle') ? '1L' : rateLabels.packHint.includes('Piece') ? '1 pc' : '1kg'}
                                          className="w-full rounded-md border border-transparent bg-transparent px-1.5 py-1 font-inter text-sm text-rain-cloud focus:border-wet-earth/50 focus:bg-white focus:outline-none"
                                        />
                                      </td>
                                      <td className="px-2 py-1.5">
                                        <NumberInput
                                          value={packagingValue}
                                          onChange={(v) => {
                                            updateRow(product.id, {
                                              pack_packaging_rs: {
                                                ...normalizePackMoneyMap(row.pack_packaging_rs),
                                                [label]: v,
                                              },
                                              pack_price_overrides: clearPackPriceOverride(row, label),
                                            });
                                          }}
                                          onBlur={() => scheduleAutosave(product.id)}
                                          placeholder="0"
                                          className="text-sm py-1"
                                        />
                                      </td>
                                      <td className="px-2 py-1.5">
                                        <div className="flex items-center gap-1">
                                          <NumberInput
                                            value={marginValue}
                                            onChange={(v) => {
                                              updateRow(product.id, {
                                                pack_margins: {
                                                  ...normalizePackMargins(row.pack_margins),
                                                  [label]: v,
                                                },
                                                pack_price_overrides: clearPackPriceOverride(row, label),
                                              });
                                            }}
                                            onBlur={() => scheduleAutosave(product.id)}
                                            placeholder={`${defaultMarginForRow(row, strategy)}`}
                                            className="text-sm py-1"
                                          />
                                          <span className="font-inter text-[10px] text-rain-cloud/40">%</span>
                                        </div>
                                      </td>
                                      <td className="px-2 py-1.5">
                                        {isOverridden ? (
                                          <div className="space-y-1">
                                            <NumberInput
                                              value={overrideVal}
                                              onChange={(v) => {
                                                if (v === '' || (suggested != null && Number(v) === suggested)) {
                                                  updateRow(product.id, {
                                                    pack_price_overrides: clearPackPriceOverride(row, label),
                                                  });
                                                  return;
                                                }
                                                updateRow(product.id, {
                                                  pack_price_overrides: {
                                                    ...normalizePackMoneyMap(row.pack_price_overrides),
                                                    [label]: v,
                                                  },
                                                });
                                              }}
                                              onBlur={() => scheduleAutosave(product.id)}
                                              placeholder={suggested != null ? String(suggested) : '₹'}
                                              className="text-sm py-1 font-semibold border-wet-earth/50 bg-wet-earth/5"
                                            />
                                            <button
                                              type="button"
                                              onClick={() => {
                                                updateRow(product.id, {
                                                  pack_price_overrides: clearPackPriceOverride(row, label),
                                                });
                                                scheduleAutosave(product.id);
                                              }}
                                              className="font-inter text-[10px] text-wet-earth hover:underline"
                                            >
                                              Reset to auto{suggested != null ? ` ${formatRupee(suggested)}` : ''}
                                            </button>
                                          </div>
                                        ) : (
                                          <div className="space-y-1">
                                            <p className="font-inter text-sm font-semibold tabular-nums text-rain-cloud px-1 py-1.5">
                                              {suggested != null ? formatRupee(suggested) : '—'}
                                            </p>
                                            <button
                                              type="button"
                                              disabled={suggested == null}
                                              onClick={() => {
                                                updateRow(product.id, {
                                                  pack_price_overrides: {
                                                    ...normalizePackMoneyMap(row.pack_price_overrides),
                                                    [label]: String(suggested),
                                                  },
                                                });
                                              }}
                                              className="font-inter text-[10px] text-rain-cloud/45 hover:text-wet-earth disabled:opacity-40"
                                            >
                                              Override…
                                            </button>
                                          </div>
                                        )}
                                      </td>
                                      <td className="px-3 py-1.5">
                                        <p className="font-inter text-sm tabular-nums text-rain-cloud/70">
                                          {mrpPreview != null ? formatRupee(mrpPreview) : '—'}
                                        </p>
                                        {mrpPreview != null && shelfForMrp != null && mrpPreview > shelfForMrp ? (
                                          <p className="font-inter text-[9px] text-forest-canopy">
                                            {Math.round(((mrpPreview - shelfForMrp) / mrpPreview) * 100)}% off
                                          </p>
                                        ) : null}
                                      </td>
                                      <td className="px-3 py-1.5">
                                        <p className={`font-inter text-sm font-semibold tabular-nums ${
                                          grossProfit == null
                                            ? 'text-rain-cloud/40'
                                            : grossProfit < 0
                                              ? 'text-red-600'
                                              : 'text-forest-canopy'
                                        }`}>
                                          {grossProfit != null ? formatRupee(grossProfit) : '—'}
                                        </p>
                                        {grossPct != null ? (
                                          <p className="font-inter text-[9px] text-rain-cloud/45">
                                            {grossPct}% of shelf
                                          </p>
                                        ) : null}
                                      </td>
                                      <td className="px-1 py-1.5">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            updateRow(product.id, removePackAtIndex(row, strategy, index));
                                            scheduleAutosave(product.id);
                                          }}
                                          className="rounded-md p-1.5 text-rain-cloud/30 hover:bg-red-50 hover:text-red-600"
                                          title="Remove size"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          <div>
                            <button
                              type="button"
                              onClick={() => {
                                updateRow(product.id, addPackSize(row, strategy, measureType));
                                scheduleAutosave(product.id);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-border/60 px-2.5 py-1.5 font-inter text-xs text-rain-cloud/70 hover:bg-rain-mist/40"
                            >
                              <Plus className="w-3.5 h-3.5" /> Add size
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="mt-8">
        <CollapseSection
          title="Advanced settings"
          description="Invoice repricing, margin bands, and category defaults"
          defaultOpen={false}
        >
          <InvoiceRepricingPanel
            products={filteredProducts}
            categories={categoryList}
            strategy={strategy}
            categoryFilter={categoryFilter}
            getRow={getRow}
            onApplyBatch={handleInvoiceBatch}
            applying={applyAllMut.isPending}
          />
          <StrategyDefaultsPanel
            strategy={strategy}
            categories={categoryList}
            onChange={setStrategy}
            onSave={() => saveStrategyMut.mutate()}
            saving={saveStrategyMut.isPending}
          />
        </CollapseSection>
      </div>

      <p className="mt-6 font-inter text-xs text-rain-cloud/40 max-w-2xl">
        Cost → packaging ₹ → margin % → auto shelf price. Use Override only when you need a fixed ₹.
      </p>

      {dirtyCount > 0 ? (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/70 bg-white/95 backdrop-blur px-6 py-3 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3">
            <p className="font-inter text-sm text-rain-cloud">
              <strong>{dirtyCount}</strong> product{dirtyCount === 1 ? '' : 's'} with unsaved changes
            </p>
            <div className="flex flex-wrap gap-2">
              {categoryFilter !== 'all' ? (
                <button
                  type="button"
                  onClick={() => handleApplyCategoryDirty(categoryFilter)}
                  disabled={applyAllMut.isPending}
                  className="rounded-xl border border-wet-earth/30 bg-wet-earth/5 px-4 py-2 font-inter text-sm text-wet-earth hover:bg-wet-earth/10 disabled:opacity-50"
                >
                  Save all in {categoryMap.get(categoryFilter) || 'category'}
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleApplyAllDirty}
                disabled={applyAllMut.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-wet-earth px-5 py-2.5 font-inter text-sm font-medium text-white hover:bg-wet-earth/90 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {applyAllMut.isPending ? 'Saving…' : `Save (${dirtyCount})`}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
