import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Minus, Plus, Search, Trash2 } from 'lucide-react';
import { products } from '@/services/api';
import { getSellableVariants } from '@/lib/posCatalog';
import { resolvePosVariantPrice } from '@/lib/pricingStrategy';
import { normalizeProductVariant } from '@/lib/productVariantUtils';

function snapshotToDraft(items = []) {
  return (items || []).map((item, index) => ({
    key: `${item.product_id || 'x'}-${item.sku || ''}-${item.variant || ''}-${index}`,
    product_id: item.product_id || null,
    title: item.title || item.name || 'Item',
    variant: item.variant || null,
    sku: item.sku || null,
    pack_kg: item.pack_kg ?? null,
    qty: Math.max(1, Number(item.qty) || 1),
    price: Number(item.price) || 0,
    original_price: Number(item.original_price ?? item.price) || 0,
    type: item.type || 'product',
    exclude_from_discount: Boolean(item.exclude_from_discount),
  }));
}

function draftSubtotal(lines) {
  return lines.reduce((sum, line) => sum + Number(line.price || 0) * Number(line.qty || 0), 0);
}

export default function OrderItemsEditor({
  itemsSnapshot = [],
  amountPaise = 0,
  deliveryFeePaise = 0,
  discountPaise = 0,
  canEdit = true,
  saving = false,
  onSave,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => snapshotToDraft(itemsSnapshot));
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [variantPick, setVariantPick] = useState(null);

  const { data: catalog = [] } = useQuery({
    queryKey: ['admin-order-edit-products'],
    queryFn: () => products.list('-created_date', 1000),
    enabled: editing,
    staleTime: 5 * 60 * 1000,
  });

  const searchHits = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    return catalog
      .filter((p) => p.is_published !== false)
      .filter((p) => {
        const hay = [p.title, p.name, p.sku, p.local_name, ...(p.quick_variants || []).flatMap((v) => [v.sku, v.label])]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 8);
  }, [catalog, search]);

  const startEdit = () => {
    setDraft(snapshotToDraft(itemsSnapshot));
    setSearch('');
    setError('');
    setVariantPick(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft(snapshotToDraft(itemsSnapshot));
    setError('');
    setVariantPick(null);
  };

  const setQty = (key, qty) => {
    const next = Math.max(1, Math.round(Number(qty) || 1));
    setDraft((prev) => prev.map((line) => (line.key === key ? { ...line, qty: next } : line)));
  };

  const removeLine = (key) => {
    setDraft((prev) => prev.filter((line) => line.key !== key));
  };

  const addProduct = (product, variant = null) => {
    const variants = getSellableVariants(product);
    if (!variant && variants.length > 1) {
      setVariantPick(product);
      return;
    }
    const v = variant
      ? normalizeProductVariant(variant)
      : (variants.length === 1 ? normalizeProductVariant(variants[0]) : null);
    const price = v ? resolvePosVariantPrice(v, product) : Number(product.price) || 0;
    if (!(price > 0)) {
      setError('That product has no sellable price');
      return;
    }
    const key = `${product.id}-${v?.sku || ''}-${v?.label || ''}`;
    setDraft((prev) => {
      const existing = prev.find((line) => line.key === key);
      if (existing) {
        return prev.map((line) => (line.key === key ? { ...line, qty: line.qty + 1 } : line));
      }
      return [
        ...prev,
        {
          key,
          product_id: product.id,
          title: product.title || product.name || 'Item',
          variant: v?.label || null,
          sku: v?.sku || product.sku || null,
          pack_kg: v?.pack_kg ?? null,
          qty: 1,
          price,
          original_price: price,
          type: 'product',
          exclude_from_discount: false,
        },
      ];
    });
    setSearch('');
    setVariantPick(null);
    setError('');
  };

  const handleSave = async () => {
    if (!draft.length) {
      setError('Keep at least one item');
      return;
    }
    setError('');
    try {
      await onSave?.(draft.map(({ key, ...line }) => line));
      setEditing(false);
    } catch (err) {
      setError(err?.message || 'Could not save items');
    }
  };

  const lines = editing ? draft : snapshotToDraft(itemsSnapshot);
  const subtotal = draftSubtotal(lines);
  const displayTotal = editing
    ? Math.max(0, subtotal - (discountPaise || 0) / 100 + (deliveryFeePaise || 0) / 100)
    : (amountPaise || 0) / 100;

  return (
    <div className="bg-white rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="font-inter text-xs font-medium text-rain-cloud/50 uppercase tracking-wider">Items</p>
        {canEdit && !editing ? (
          <button
            type="button"
            onClick={startEdit}
            className="inline-flex items-center gap-1.5 rounded-full border border-forest-canopy/40 bg-forest-canopy/10 px-3 py-1.5 font-inter text-xs font-medium text-forest-canopy hover:bg-forest-canopy/15"
          >
            <Plus className="w-3.5 h-3.5" />
            Edit / add / remove
          </button>
        ) : null}
      </div>
      {canEdit && !editing ? (
        <p className="font-inter text-[11px] text-rain-cloud/45 mb-3">
          Change qty, delete lines, or add products — invoice updates on the same bill.
        </p>
      ) : null}

      <div className="space-y-2">
        {lines.map((item) => (
          <div key={item.key} className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-inter text-sm text-rain-cloud">{item.title}</p>
              <p className="font-inter text-xs text-rain-cloud/40">
                {item.variant ? `${item.variant} · ` : ''}₹{Number(item.price).toFixed(0)} each
              </p>
            </div>
            {editing ? (
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setQty(item.key, item.qty - 1)}
                  className="p-1 rounded-full border border-border text-rain-cloud/50 hover:border-forest-canopy/40"
                  aria-label="Decrease qty"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <input
                  type="number"
                  min={1}
                  value={item.qty}
                  onChange={(e) => setQty(item.key, e.target.value)}
                  className="w-10 text-center border border-border rounded-lg font-inter text-xs py-1"
                />
                <button
                  type="button"
                  onClick={() => setQty(item.key, item.qty + 1)}
                  className="p-1 rounded-full border border-border text-rain-cloud/50 hover:border-forest-canopy/40"
                  aria-label="Increase qty"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => removeLine(item.key)}
                  className="p-1 rounded-full text-amber-700/80 hover:bg-amber-50"
                  aria-label="Remove item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <p className="font-inter text-sm text-rain-cloud/70 shrink-0">
                ×{item.qty} · ₹{(Number(item.price) * Number(item.qty)).toFixed(0)}
              </p>
            )}
          </div>
        ))}

        {editing ? (
          <div className="pt-2 space-y-2 border-t border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-rain-cloud/35" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Add product…"
                className="w-full pl-8 pr-3 py-2 border border-border rounded-xl font-inter text-sm focus:outline-none focus:border-forest-canopy"
              />
            </div>
            {variantPick ? (
              <div className="rounded-xl border border-border bg-muted/30 p-2 space-y-1">
                <p className="font-inter text-[11px] text-rain-cloud/50 px-1">
                  Pick size for {variantPick.title || variantPick.name}
                </p>
                {getSellableVariants(variantPick).map((v) => (
                  <button
                    key={v.sku || v.label}
                    type="button"
                    onClick={() => addProduct(variantPick, v)}
                    className="w-full text-left px-2 py-1.5 rounded-lg font-inter text-xs hover:bg-white"
                  >
                    {v.label} · ₹{resolvePosVariantPrice(v, variantPick)}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setVariantPick(null)}
                  className="px-2 py-1 font-inter text-[11px] text-rain-cloud/45"
                >
                  Cancel
                </button>
              </div>
            ) : null}
            {searchHits.length > 0 ? (
              <div className="rounded-xl border border-border divide-y divide-border/60 max-h-40 overflow-y-auto">
                {searchHits.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addProduct(p)}
                    className="w-full text-left px-3 py-2 font-inter text-xs hover:bg-muted/40"
                  >
                    {p.title || p.name}
                    <span className="text-rain-cloud/40"> · ₹{Number(p.price || 0).toFixed(0)}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="border-t border-border pt-2 mt-2 flex justify-between">
          <p className="font-inter text-sm font-medium text-rain-cloud">Total</p>
          <p className="font-inter text-sm font-medium text-rain-cloud">₹{displayTotal.toFixed(0)}</p>
        </div>
        {editing && (discountPaise > 0 || deliveryFeePaise > 0) ? (
          <p className="font-inter text-[10px] text-rain-cloud/40">
            Preview keeps existing discount/delivery; save recalculates the bill on the same order.
          </p>
        ) : null}
      </div>

      {editing ? (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={cancelEdit}
            disabled={saving}
            className="flex-1 py-2 border border-border rounded-full font-inter text-xs text-rain-cloud/60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 bg-wet-earth text-white rounded-full font-inter text-xs disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save items'}
          </button>
        </div>
      ) : null}
      {error ? <p className="mt-2 font-inter text-[11px] text-amber-700">{error}</p> : null}
    </div>
  );
}
