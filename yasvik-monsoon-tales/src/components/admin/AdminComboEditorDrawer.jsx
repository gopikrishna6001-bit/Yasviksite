import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Search, Trash2, X } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { appClient } from '@/api/appClient';
import { saveProductBundle } from '@/services/productRelationsApi';
import { toast } from '@/components/ui/use-toast';
import { getCategoryDisplayName } from '@/lib/categoryDisplay';
import { slugifyProduct } from '@/lib/productDuplicateUtils';
import {
  BUNDLE_BADGE_OPTIONS,
  formatNetWeightLabel,
  formatQuantityLabel,
  getBundleEditorWarnings,
  sumBundleNetWeightGrams,
  validateBundleForPublish,
  validateBundleForSave,
} from '@/lib/productBundleUtils';
import { getComboProductTitle } from '@/lib/comboDisplayUtils';
import ImageUploadField from '@/components/admin/ImageUploadField';

const DRY_FRUIT_COMBOS_CATEGORY_SLUG = 'dry-fruits-combos';

function emptyForm(defaultCategoryId = '') {
  return {
    title: '',
    slug: '',
    short_description: '',
    description: '',
    category_id: defaultCategoryId,
    hero_image: '',
    price: '',
    stock: '',
    yasvik_mark: '',
    combo_merch_category: '',
    purpose_label: '',
    audience_tags: '',
    is_published: false,
    sell_online: false,
  };
}

function itemsFromBundle(bundle) {
  return (bundle?.items || [])
    .filter((row) => row?.is_active !== false)
    .sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0))
    .map((row) => ({
      product_id: row.product_id,
      quantity_value: Number(row.quantity_value) || 100,
      quantity_unit: row.quantity_unit || 'g',
      pack_count: Math.max(1, Number(row.pack_count) || 1),
      component_title_snapshot: row.component_title_snapshot || '',
      component_variant_sku: row.component_variant_sku || '',
      is_active: true,
    }));
}

/**
 * Focused combo editor — title, category, image, price, contents.
 * Saves as catalogue parent product + product_bundles (draft by default).
 */
export default function AdminComboEditorDrawer({
  open,
  onClose,
  categories = [],
  initialRow = null,
  preferredCategoryId = '',
  onSaved,
}) {
  const defaultCategoryId = useMemo(() => {
    if (preferredCategoryId && preferredCategoryId !== 'uncategorised') {
      return preferredCategoryId;
    }
    const match = categories.find((row) => row.slug === DRY_FRUIT_COMBOS_CATEGORY_SLUG);
    return match?.id || categories.find((row) => /dry.?fruit/i.test(row.slug || row.name || ''))?.id || '';
  }, [categories, preferredCategoryId]);

  const [form, setForm] = useState(() => emptyForm(defaultCategoryId));
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const editingId = initialRow?.product?.id || null;

  useEffect(() => {
    if (!open) return;
    if (initialRow?.product) {
      const product = initialRow.product;
      setForm({
        title: product.title || product.name || '',
        slug: product.slug || '',
        short_description: product.short_description || '',
        description: product.description || product.story_description || '',
        category_id: product.category_id || defaultCategoryId,
        hero_image: product.hero_image || product.featured_image_url || '',
        price: product.price != null ? String(product.price) : '',
        stock: product.stock != null
          ? String(product.stock)
          : (product.stock_quantity != null ? String(product.stock_quantity) : ''),
        yasvik_mark: product.yasvik_mark || '',
        combo_merch_category: initialRow.bundle?.combo_merch_category || '',
        purpose_label: initialRow.bundle?.purpose_label || '',
        audience_tags: Array.isArray(initialRow.bundle?.audience_tags)
          ? initialRow.bundle.audience_tags.join(', ')
          : '',
        is_published: product.is_published === true,
        sell_online: product.sell_online !== false && product.is_published === true,
      });
      setItems(itemsFromBundle(initialRow.bundle));
    } else {
      setForm(emptyForm(defaultCategoryId));
      setItems([]);
    }
    setSearch('');
  }, [open, initialRow, defaultCategoryId]);

  const { data: catalogProducts = [] } = useQuery({
    queryKey: ['admin-combo-catalog-products'],
    queryFn: () => appClient.entities.Product.filter({}, 'name', 500),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const productsById = useMemo(
    () => new Map((catalogProducts || []).map((row) => [row.id, row])),
    [catalogProducts],
  );

  const searchable = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = (catalogProducts || []).filter((row) => {
      if (!row?.id) return false;
      if (row.product_kind === 'bundle_combo' || row.product_kind === 'gift_box') return false;
      if (String(row.slug || '').includes('-archived-')) return false;
      if (items.some((item) => item.product_id === row.id)) return false;
      return true;
    });
    if (!q) return list.slice(0, 30);
    return list
      .filter((row) => {
        const hay = `${row.title || row.name || ''} ${row.sku || ''} ${row.slug || ''}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 30);
  }, [catalogProducts, search, items]);

  const computedWeight = sumBundleNetWeightGrams(items);
  const warnings = getBundleEditorWarnings(
    {
      ...form,
      title: form.title,
      slug: form.slug || slugifyProduct(form.title),
      hero_image: form.hero_image,
    },
    { total_net_weight_g: computedWeight },
    items,
    productsById,
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const title = String(form.title || '').trim();
      if (!title) throw new Error('Combo title is required.');
      const slug = String(form.slug || '').trim() || slugifyProduct(title);
      const saveErrors = validateBundleForSave(
        { total_net_weight_g: computedWeight, bundle_status: 'draft' },
        items,
      );
      if (saveErrors.length && items.length) throw new Error(saveErrors.join('\n'));

      const publish = form.is_published === true;
      if (publish) {
        const publishErrors = validateBundleForPublish(
          {
            title,
            slug,
            price: Number(form.price) || 0,
            stock: Number(form.stock) || 0,
            inventory_mode: 'prepacked_stock',
            product_kind: 'bundle_combo',
            hero_image: form.hero_image,
            subject_to_availability: true,
          },
          {
            bundle_status: 'active',
            inventory_mode: 'prepacked_stock',
            has_unresolved_components: false,
          },
          items.map((row) => ({ ...row, product: productsById.get(row.product_id) })),
        );
        if (publishErrors.length) throw new Error(publishErrors.join('\n'));
      }

      const productPayload = {
        title,
        name: title,
        slug,
        short_description: String(form.short_description || '').trim(),
        description: String(form.description || form.short_description || '').trim(),
        category_id: form.category_id || null,
        hero_image: String(form.hero_image || '').trim(),
        featured_image_url: String(form.hero_image || '').trim(),
        images: String(form.hero_image || '').trim() ? [String(form.hero_image).trim()] : [],
        price: Number(form.price) || 0,
        stock: Number(form.stock) || 0,
        stock_quantity: Number(form.stock) || 0,
        yasvik_mark: String(form.yasvik_mark || '').trim(),
        product_kind: 'bundle_combo',
        product_group: 'packaged_combo',
        inventory_mode: 'prepacked_stock',
        is_published: publish,
        sell_online: publish,
        subject_to_availability: true,
        bundle_item_count: items.length,
        bundle_net_weight_g: computedWeight,
      };

      let product;
      if (editingId) {
        product = await appClient.entities.Product.update(editingId, productPayload);
      } else {
        product = await appClient.entities.Product.create(productPayload);
      }

      await saveProductBundle({
        parentProductId: product.id,
        bundleId: initialRow?.bundle?.id || null,
        bundle: {
          bundle_name: title,
          bundle_slug: slug,
          bundle_description: productPayload.short_description,
          bundle_type: 'bundle_combo',
          display_locations: ['home', 'category', 'product'],
          is_active: true,
          sort_order: 0,
          bundle_status: publish ? 'active' : 'draft',
          inventory_mode: 'prepacked_stock',
          packaging_mode: 'separately_packed',
          total_net_weight_g: computedWeight,
          item_count: items.length,
          has_unresolved_components: false,
          combo_merch_category: form.combo_merch_category || null,
          purpose_label: String(form.purpose_label || form.yasvik_mark || '').trim() || null,
          audience_tags: String(form.audience_tags || '')
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean),
        },
        items: items.map((row, index) => ({
          ...row,
          sort_order: index,
          component_title_snapshot: row.component_title_snapshot
            || getComboProductTitle(productsById.get(row.product_id))
            || '',
        })),
      });

      return product;
    },
    onSuccess: (product) => {
      toast({
        title: editingId ? 'Combo updated' : 'Combo created',
        description: form.is_published
          ? 'Saved and published to shop.'
          : 'Saved as draft — not visible in shop until you publish.',
      });
      onSaved?.(product);
      onClose?.();
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Could not save combo',
        description: error?.message || 'Please try again.',
      });
    },
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex justify-end">
      <button type="button" className="absolute inset-0 bg-rain-cloud/30" aria-label="Close" onClick={onClose} />
      <aside className="relative z-10 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="font-cormorant text-2xl font-semibold text-rain-cloud">
              {editingId ? 'Edit combo' : 'New combo'}
            </h2>
            <p className="font-inter text-xs text-rain-cloud/50">
              Title, category, image, price, and what’s inside — without the full product form.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-muted" aria-label="Close editor">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <label className="block">
            <span className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/50">Combo title</span>
            <input
              value={form.title}
              onChange={(e) => setForm((prev) => ({
                ...prev,
                title: e.target.value,
                slug: prev.slug || slugifyProduct(e.target.value),
              }))}
              className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 font-inter text-sm"
              placeholder="Yasvik Everyday Dry Fruit Combo"
            />
          </label>

          <label className="block">
            <span className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/50">URL slug</span>
            <input
              value={form.slug}
              onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 font-inter text-sm"
            />
          </label>

          <label className="block">
            <span className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/50">Short description</span>
            <textarea
              value={form.short_description}
              onChange={(e) => setForm((prev) => ({ ...prev, short_description: e.target.value }))}
              rows={2}
              className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 font-inter text-sm"
              placeholder="One line customers see on the card"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/50">Shop section</span>
              <select
                value={form.combo_merch_category || ''}
                onChange={(e) => setForm((prev) => ({ ...prev, combo_merch_category: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 font-inter text-sm"
              >
                <option value="">Auto</option>
                <option value="separate">Separate Combos</option>
                <option value="mixed">Mixed Combos</option>
                <option value="free_gift">Free Gift Combos</option>
              </select>
            </label>
            <label className="block">
              <span className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/50">Purpose badge</span>
              <input
                value={form.purpose_label}
                onChange={(e) => setForm((prev) => ({ ...prev, purpose_label: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 font-inter text-sm"
                placeholder="Daily Nutrition"
              />
            </label>
          </div>

          <label className="block">
            <span className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/50">Who is this for?</span>
            <input
              value={form.audience_tags}
              onChange={(e) => setForm((prev) => ({ ...prev, audience_tags: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 font-inter text-sm"
              placeholder="office, kids, parents, gym"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/50">Category</span>
              <select
                value={form.category_id || ''}
                onChange={(e) => setForm((prev) => ({ ...prev, category_id: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 font-inter text-sm"
              >
                <option value="">Select category</option>
                {categories.map((row) => (
                  <option key={row.id} value={row.id}>{getCategoryDisplayName(row)}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/50">Badge</span>
              <select
                value={form.yasvik_mark || ''}
                onChange={(e) => setForm((prev) => ({ ...prev, yasvik_mark: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 font-inter text-sm"
              >
                <option value="">None</option>
                {BUNDLE_BADGE_OPTIONS.filter(Boolean).map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </label>
          </div>

          <ImageUploadField
            label="Hero image"
            value={form.hero_image}
            onChange={async (url) => {
              const next = url || '';
              setForm((prev) => ({ ...prev, hero_image: next }));
              // Worker may already PATCH featured_image_url when entityId + assetRole=hero.
              // Still sync form state; only re-save if URL changed and editor has an id.
              if (!editingId || !next) return;
              try {
                await appClient.entities.Product.update(editingId, {
                  hero_image: next,
                  featured_image_url: next,
                  images: [next],
                });
                toast({
                  title: 'Hero image saved',
                  description: 'Combo image is live on the product page.',
                });
              } catch (error) {
                toast({
                  variant: 'destructive',
                  title: 'Image uploaded — save the combo to attach it',
                  description: error?.message || 'Click Save to finish attaching the image.',
                });
              }
            }}
            aspectClass="aspect-square sm:aspect-video"
            accept="image/*"
            folder="combos"
            entityId={editingId}
            seoName={form.slug || form.title}
            assetRole="hero"
            entityTitle={form.title}
            hideUrlField
          />
          <p className="font-inter text-[11px] text-rain-cloud/50">
            These combos use Subject to availability — stock may stay at 0. Hero image saves as soon as you upload.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/50">Selling price (₹)</span>
              <input
                type="number"
                min="0"
                value={form.price}
                onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 font-inter text-sm"
              />
            </label>
            <label className="block">
              <span className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/50">Stock (boxes)</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={form.stock}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === '' || /^\d*$/.test(raw)) {
                    setForm((prev) => ({ ...prev, stock: raw }));
                  }
                }}
                className="admin-number-box mt-1 w-full rounded-xl border border-border px-3 py-2.5 font-inter text-sm"
              />
            </label>
          </div>

          <div className="rounded-2xl border border-border p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="font-inter text-sm font-semibold text-rain-cloud">What’s inside</h3>
                <p className="font-inter text-[11px] text-rain-cloud/50">
                  {items.length} products · {formatNetWeightLabel(computedWeight) || '—'}
                </p>
              </div>
            </div>

            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-rain-cloud/35" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search catalogue products to add…"
                className="w-full rounded-full border border-border py-2 pl-9 pr-3 font-inter text-xs"
              />
            </div>
            {search.trim() ? (
              <ul className="mt-2 max-h-36 space-y-1 overflow-y-auto rounded-xl border border-border bg-muted/20 p-2">
                {searchable.map((product) => (
                  <li key={product.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setItems((prev) => [
                          ...prev,
                          {
                            product_id: product.id,
                            quantity_value: 100,
                            quantity_unit: 'g',
                            pack_count: 1,
                            component_title_snapshot: getComboProductTitle(product),
                            is_active: true,
                          },
                        ]);
                        setSearch('');
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left hover:bg-white"
                    >
                      <span className="font-inter text-xs font-semibold text-rain-cloud">
                        {getComboProductTitle(product)}
                      </span>
                      <Plus className="h-3.5 w-3.5 text-forest-canopy" />
                    </button>
                  </li>
                ))}
                {!searchable.length ? (
                  <li className="px-2 py-2 font-inter text-[11px] text-rain-cloud/45">No matching products</li>
                ) : null}
              </ul>
            ) : null}

            <ul className="mt-3 space-y-2">
              {items.map((row, index) => {
                const linked = productsById.get(row.product_id);
                return (
                  <li key={`${row.product_id}-${index}`} className="rounded-xl border border-border bg-white p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-inter text-xs font-semibold text-rain-cloud">
                        {row.component_title_snapshot || getComboProductTitle(linked) || 'Product'}
                      </p>
                      <button
                        type="button"
                        onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                        className="rounded-full p-1 text-rain-cloud/40 hover:bg-muted hover:text-red-600"
                        aria-label="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <input
                        type="number"
                        min="0"
                        value={row.quantity_value}
                        onChange={(e) => setItems((prev) => prev.map((item, i) => (
                          i === index ? { ...item, quantity_value: Number(e.target.value) || 0 } : item
                        )))}
                        className="rounded-lg border border-border px-2 py-1.5 font-inter text-xs"
                      />
                      <select
                        value={row.quantity_unit}
                        onChange={(e) => setItems((prev) => prev.map((item, i) => (
                          i === index ? { ...item, quantity_unit: e.target.value } : item
                        )))}
                        className="rounded-lg border border-border px-2 py-1.5 font-inter text-xs"
                      >
                        <option value="g">g</option>
                        <option value="kg">kg</option>
                        <option value="ml">ml</option>
                        <option value="pcs">pcs</option>
                      </select>
                      <input
                        type="number"
                        min="1"
                        value={row.pack_count}
                        onChange={(e) => setItems((prev) => prev.map((item, i) => (
                          i === index ? { ...item, pack_count: Math.max(1, Number(e.target.value) || 1) } : item
                        )))}
                        className="rounded-lg border border-border px-2 py-1.5 font-inter text-xs"
                        title="Pack count"
                      />
                    </div>
                    <p className="mt-1 font-inter text-[10px] text-rain-cloud/45">
                      {formatQuantityLabel(row.quantity_value, row.quantity_unit, row.pack_count)}
                    </p>
                  </li>
                );
              })}
              {!items.length ? (
                <li className="rounded-xl border border-dashed border-border px-3 py-6 text-center font-inter text-xs text-rain-cloud/45">
                  Add at least 2 catalogue products for a sellable combo.
                </li>
              ) : null}
            </ul>
          </div>

          {warnings.length ? (
            <div className="rounded-xl border border-amber-700/25 bg-amber-50 px-3 py-2">
              <p className="font-inter text-[11px] font-semibold text-amber-900">Warnings (drafts can still save)</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {warnings.slice(0, 6).map((warning) => (
                  <li key={warning} className="font-inter text-[10px] text-amber-900/85">{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <label className="flex items-center gap-2 rounded-xl border border-border px-3 py-2.5">
            <input
              type="checkbox"
              checked={form.is_published === true}
              onChange={(e) => setForm((prev) => ({
                ...prev,
                is_published: e.target.checked,
                sell_online: e.target.checked,
              }))}
            />
            <span className="font-inter text-xs text-rain-cloud">
              Publish to shop (leave off while you finish pricing/stock/images)
            </span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border px-4 py-2 font-inter text-xs font-bold text-rain-cloud"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
            className="inline-flex items-center gap-2 rounded-full bg-forest-canopy px-5 py-2 font-inter text-xs font-bold text-white disabled:opacity-60"
          >
            {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Save combo
          </button>
        </div>
      </aside>
    </div>
  );
}
