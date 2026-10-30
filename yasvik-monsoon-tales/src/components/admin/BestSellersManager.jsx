import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save, Search, Star, X } from 'lucide-react';
import { productPrimaryImageUrl } from '@/lib/mediaUrl';
import {
  HOME_BEST_SELLERS_SETTING_KEY,
  parseBestSellerPicks,
  picksFromFeaturedProducts,
  variantOptionsForProduct,
} from '@/lib/homeBestSellers';
import { invalidatePublicProductQueries } from '@/lib/productQueryInvalidation';
import {
  fetchAllAppSettings,
  resolveSetting,
  SETTINGS_QUERY_KEYS,
  upsertAppSetting,
} from '@/services/settingsService';

function productById(products, id) {
  return products.find((product) => product.id === id) || null;
}

export default function BestSellersManager({ products = [], settings = [], onSyncFeatured }) {
  const qc = useQueryClient();
  const [query, setQuery] = useState('');
  const [pendingVariants, setPendingVariants] = useState({});
  const [picks, setPicks] = useState([]);
  const [dirty, setDirty] = useState(false);

  const savedPicks = useMemo(
    () => parseBestSellerPicks(resolveSetting(settings, HOME_BEST_SELLERS_SETTING_KEY, [])),
    [settings],
  );

  useEffect(() => {
    if (dirty) return;
    if (savedPicks.length) {
      setPicks(savedPicks);
      return;
    }
    setPicks(picksFromFeaturedProducts(products));
  }, [savedPicks, products, dirty]);

  const saveMut = useMutation({
    mutationFn: async (nextPicks) => {
      const allSettings = settings.length ? settings : await fetchAllAppSettings();
      return upsertAppSetting(allSettings, HOME_BEST_SELLERS_SETTING_KEY, nextPicks, {
        description: 'Homepage Best Sellers: product, pack variant, display order',
        data_type: 'json',
      });
    },
    onSuccess: () => {
      qc.invalidateQueries(SETTINGS_QUERY_KEYS.all);
      qc.invalidateQueries(SETTINGS_QUERY_KEYS.home);
      invalidatePublicProductQueries(qc);
      setDirty(false);
    },
    onError: (err) => alert(err?.message || 'Failed to save Best Sellers'),
  });

  const searchMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((product) => product?.id && String(product.title || '').toLowerCase().includes(q))
      .slice(0, 8);
  }, [products, query]);

  const commitPicks = (nextPicks) => {
    const normalized = parseBestSellerPicks(nextPicks);
    setPicks(normalized);
    setDirty(true);
    return normalized;
  };

  const handleAdd = (product, variantLabel = '') => {
    if (!product?.id) return;
    const maxOrder = picks.reduce((max, pick) => Math.max(max, Number(pick.order) || 0), 0);
    const next = commitPicks([
      ...picks.filter((pick) => !(pick.product_id === product.id && pick.variant_label === variantLabel)),
      {
        product_id: product.id,
        variant_label: variantLabel,
        order: maxOrder + 1,
      },
    ]);
    onSyncFeatured?.(product.id, { is_featured: true, featured_in_hero: true });
    setQuery('');
    saveMut.mutate(next);
  };

  const handleRemove = (index) => {
    const removed = picks[index];
    const next = commitPicks(picks.filter((_, i) => i !== index));
    if (removed && !next.some((pick) => pick.product_id === removed.product_id)) {
      onSyncFeatured?.(removed.product_id, { is_featured: false, featured_in_hero: false });
    }
    saveMut.mutate(next);
  };

  const handleOrderChange = (index, value) => {
    const order = Number(value);
    if (!Number.isFinite(order) || order < 1) return;
    const next = picks.map((pick, i) => (i === index ? { ...pick, order } : pick));
    commitPicks(next);
  };

  const handleSaveOrder = () => {
    saveMut.mutate(parseBestSellerPicks(picks));
  };

  const sortedPicks = useMemo(
    () => [...picks].sort((a, b) => a.order - b.order || a.product_id.localeCompare(b.product_id)),
    [picks],
  );

  return (
    <div className="mb-4 rounded-2xl border border-amber-300/60 bg-amber-50/50 p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 font-inter text-sm font-semibold text-rain-cloud">
            <Star className="h-4 w-4 fill-amber-400 text-amber-500" /> Best Sellers on homepage
          </p>
          <p className="mt-0.5 font-inter text-xs text-rain-cloud/50">
            Pick exact pack (500ml ghee, 1kg pickle, etc.). Set display order with numbers — lower shows first.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap rounded-full border border-border bg-white px-3 py-1 font-inter text-xs font-medium text-rain-cloud/60">
            {sortedPicks.length} selected
          </span>
          {dirty ? (
            <button
              type="button"
              onClick={handleSaveOrder}
              disabled={saveMut.isPending}
              className="inline-flex items-center gap-1 rounded-full bg-wet-earth px-3 py-1 font-inter text-xs font-medium text-white hover:bg-wet-earth/90 disabled:opacity-60"
            >
              {saveMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save order
            </button>
          ) : null}
        </div>
      </div>

      {sortedPicks.length > 0 ? (
        <div className="mb-3 overflow-x-auto">
          <table className="min-w-full font-inter text-xs">
            <thead>
              <tr className="text-left text-rain-cloud/45">
                <th className="pb-2 pr-3 font-medium">#</th>
                <th className="pb-2 pr-3 font-medium">Product</th>
                <th className="pb-2 pr-3 font-medium">Pack</th>
                <th className="pb-2 pr-3 font-medium w-20">Order</th>
                <th className="pb-2 font-medium w-10" />
              </tr>
            </thead>
            <tbody>
              {sortedPicks.map((pick, index) => {
                const product = productById(products, pick.product_id);
                const variants = product ? variantOptionsForProduct(product) : [];
                const variant = variants.find((row) => row.label === pick.variant_label);
                return (
                  <tr key={`${pick.product_id}-${pick.variant_label || 'default'}`} className="border-t border-amber-200/50">
                    <td className="py-2 pr-3 text-rain-cloud/50">{index + 1}</td>
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-2 min-w-[10rem]">
                        <img
                          src={productPrimaryImageUrl(product, variant) || ''}
                          alt=""
                          className="h-8 w-8 rounded-lg bg-white object-cover"
                        />
                        <span className="font-medium text-rain-cloud truncate max-w-[12rem]" title={product?.title}>
                          {product?.title || 'Missing product'}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 pr-3">
                      {variants.length > 1 ? (
                        <select
                          value={pick.variant_label}
                          onChange={(e) => {
                            const next = picks.map((row) => (
                              row.product_id === pick.product_id && row.variant_label === pick.variant_label
                                ? { ...row, variant_label: e.target.value }
                                : row
                            ));
                            const normalized = commitPicks(next);
                            saveMut.mutate(normalized);
                          }}
                          className="rounded-lg border border-border bg-white px-2 py-1 text-xs"
                        >
                          {variants.map((row) => (
                            <option key={row.label} value={row.label}>{row.label}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-rain-cloud/70">{pick.variant_label || variants[0]?.label || 'Default'}</span>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={pick.order}
                        onChange={(e) => {
                          const realIndex = picks.findIndex(
                            (row) => row.product_id === pick.product_id && row.variant_label === pick.variant_label,
                          );
                          handleOrderChange(realIndex, e.target.value);
                        }}
                        className="w-16 rounded-lg border border-border bg-white px-2 py-1 text-center"
                      />
                    </td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => {
                          const realIndex = picks.findIndex(
                            (row) => row.product_id === pick.product_id && row.variant_label === pick.variant_label,
                          );
                          handleRemove(realIndex);
                        }}
                        className="rounded p-1 text-rain-cloud/40 hover:bg-red-50 hover:text-red-500"
                        aria-label="Remove"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mb-3 font-inter text-xs text-rain-cloud/45">
          No Best Sellers yet — search below to add products and packs.
        </p>
      )}

      <div className="relative max-w-md space-y-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rain-cloud/35" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search product to add…"
            className="w-full rounded-xl border border-border bg-white py-2 pl-9 pr-3 font-inter text-sm text-rain-cloud focus:border-forest-canopy focus:outline-none"
          />
        </div>

        {query.trim() && searchMatches.length > 0 ? (
          <div className="rounded-xl border border-border bg-white p-3 space-y-2">
            <p className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/45">Add to Best Sellers</p>
            {searchMatches.map((product) => {
              const variants = variantOptionsForProduct(product);
              const chosenVariant = pendingVariants[product.id] ?? variants[0]?.label ?? '';
              return (
                <div key={product.id} className="flex flex-wrap items-center gap-2 border-t border-border/40 pt-2 first:border-t-0 first:pt-0">
                  <span className="flex-1 min-w-[8rem] truncate font-inter text-sm text-rain-cloud">{product.title}</span>
                  {variants.length > 1 ? (
                    <select
                      value={chosenVariant}
                      onChange={(e) => setPendingVariants((prev) => ({ ...prev, [product.id]: e.target.value }))}
                      className="rounded-lg border border-border px-2 py-1 font-inter text-xs"
                    >
                      {variants.map((row) => (
                        <option key={row.label} value={row.label}>{row.label}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="font-inter text-xs text-rain-cloud/50">{variants[0]?.label || 'Default pack'}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleAdd(product, chosenVariant)}
                    disabled={saveMut.isPending}
                    className="rounded-lg bg-forest-canopy px-3 py-1 font-inter text-xs font-medium text-white hover:bg-forest-canopy/90 disabled:opacity-60"
                  >
                    Add
                  </button>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
