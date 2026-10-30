import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, ChevronUp, ChevronDown } from 'lucide-react';
import { appClient } from '@/api/appClient';
import ImageUploadField from '@/components/admin/ImageUploadField';
import { listRootCategories, categoryLabel } from '@/lib/categoryTree';
import {
  HOMEPAGE_CATEGORIES_QUERY_KEY,
  STOREFRONT_CATEGORIES_QUERY_KEY,
} from '@/hooks/useStorefrontCategories';
import {
  assignHomepageOrder,
  buildHomepageTilePreview,
  homepageDisplayLabel,
} from '@/lib/homepageCategoryMerchandising';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'hidden', label: 'Hidden' },
  { value: 'seasonal', label: 'Seasonal' },
];

function Toggle({ checked, onChange, label }) {
  return (
    <label className="inline-flex items-center gap-2 font-inter text-xs text-rain-cloud cursor-pointer">
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} className="rounded border-border" />
      {label}
    </label>
  );
}

export default function HomepageCategoryMerchandisingPanel() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [previewId, setPreviewId] = useState(null);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['admin-categories-all-merch'],
    queryFn: () => appClient.entities.Category.filter({}, 'sort_order', 200),
  });

  const roots = useMemo(() => listRootCategories(categories), [categories]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = [...roots].sort((a, b) => (Number(a.homepage_order) || 1000) - (Number(b.homepage_order) || 1000));
    if (!q) return rows;
    return rows.filter((cat) => {
      const hay = `${cat.name || ''} ${cat.emotional_title || ''} ${cat.slug || ''} ${cat.homepage_label || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [roots, search]);

  const homepageQueue = useMemo(
    () => filtered.filter((cat) => cat.show_on_homepage),
    [filtered],
  );

  const saveMut = useMutation({
    mutationFn: ({ id, patch }) => appClient.entities.Category.update(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-categories-all-merch'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
      qc.invalidateQueries({ queryKey: HOMEPAGE_CATEGORIES_QUERY_KEY });
      qc.invalidateQueries({ queryKey: STOREFRONT_CATEGORIES_QUERY_KEY });
    },
  });

  const patch = (id, fields) => saveMut.mutate({ id, patch: fields });

  const move = (id, direction) => {
    const queue = [...homepageQueue];
    const index = queue.findIndex((cat) => cat.id === id);
    if (index < 0) return;
    const next = index + direction;
    if (next < 0 || next >= queue.length) return;
    const swapped = [...queue];
    [swapped[index], swapped[next]] = [swapped[next], swapped[index]];
    const orders = assignHomepageOrder(swapped.map((cat) => cat.id));
    orders.forEach((row) => patch(row.id, { homepage_order: row.homepage_order }));
  };

  const preview = previewId
    ? buildHomepageTilePreview(categories.find((c) => c.id === previewId) || {})
    : null;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-wet-earth/20 bg-wet-earth/5 px-4 py-3">
        <p className="font-inter text-sm text-rain-cloud/80">
          Homepage order is a marketing control. It does not change Shop aisle order, POS categories, or product tags.
          Hide from homepage without deactivating a category.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rain-cloud/35" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search parent categories…"
          className="w-full rounded-xl border border-border bg-white py-2.5 pl-10 pr-3 font-inter text-sm"
        />
      </div>

      {isLoading ? (
        <p className="font-inter text-sm text-rain-cloud/50">Loading categories…</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((cat) => (
            <div key={cat.id} className="rounded-2xl border border-border/60 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-inter text-sm font-medium text-rain-cloud">{categoryLabel(cat)}</p>
                  <p className="font-inter text-[11px] text-rain-cloud/45">{cat.slug} · shop order {cat.sort_order ?? 0}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Toggle
                    checked={cat.show_on_homepage}
                    onChange={(v) => patch(cat.id, { show_on_homepage: v })}
                    label="Show on homepage"
                  />
                  <Toggle
                    checked={cat.is_hero_category}
                    onChange={(v) => patch(cat.id, { is_hero_category: v, show_on_homepage: v ? true : cat.show_on_homepage })}
                    label="Hero"
                  />
                  <Toggle
                    checked={cat.is_featured_category}
                    onChange={(v) => patch(cat.id, { is_featured_category: v })}
                    label="Featured"
                  />
                  <Toggle
                    checked={cat.is_seasonal_category}
                    onChange={(v) => patch(cat.id, {
                      is_seasonal_category: v,
                      homepage_status: v ? 'seasonal' : (cat.homepage_status === 'seasonal' ? 'active' : cat.homepage_status),
                    })}
                    label="Seasonal"
                  />
                </div>
              </div>

              {cat.show_on_homepage ? (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block font-inter text-[10px] uppercase tracking-wider text-rain-cloud/45">Homepage label</span>
                    <input
                      defaultValue={cat.homepage_label || ''}
                      onBlur={(e) => {
                        if (e.target.value !== (cat.homepage_label || '')) {
                          patch(cat.id, { homepage_label: e.target.value });
                        }
                      }}
                      placeholder={homepageDisplayLabel(cat)}
                      className="w-full rounded-xl border border-border px-3 py-2 font-inter text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block font-inter text-[10px] uppercase tracking-wider text-rain-cloud/45">Status</span>
                    <select
                      value={cat.homepage_status || 'active'}
                      onChange={(e) => patch(cat.id, { homepage_status: e.target.value })}
                      className="w-full rounded-xl border border-border px-3 py-2 font-inter text-sm"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block md:col-span-2">
                    <span className="mb-1 block font-inter text-[10px] uppercase tracking-wider text-rain-cloud/45">Homepage description</span>
                    <textarea
                      defaultValue={cat.homepage_description || ''}
                      onBlur={(e) => {
                        if (e.target.value !== (cat.homepage_description || '')) {
                          patch(cat.id, { homepage_description: e.target.value });
                        }
                      }}
                      rows={2}
                      className="w-full rounded-xl border border-border px-3 py-2 font-inter text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block font-inter text-[10px] uppercase tracking-wider text-rain-cloud/45">CTA label</span>
                    <input
                      defaultValue={cat.homepage_cta_label || ''}
                      onBlur={(e) => {
                        if (e.target.value !== (cat.homepage_cta_label || '')) {
                          patch(cat.id, { homepage_cta_label: e.target.value });
                        }
                      }}
                      placeholder="Shop"
                      className="w-full rounded-xl border border-border px-3 py-2 font-inter text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block font-inter text-[10px] uppercase tracking-wider text-rain-cloud/45">CTA URL (optional)</span>
                    <input
                      defaultValue={cat.homepage_cta_url || ''}
                      onBlur={(e) => {
                        if (e.target.value !== (cat.homepage_cta_url || '')) {
                          patch(cat.id, { homepage_cta_url: e.target.value });
                        }
                      }}
                      placeholder="/shop?category=…"
                      className="w-full rounded-xl border border-border px-3 py-2 font-inter text-sm"
                    />
                  </label>
                  {cat.is_seasonal_category || cat.homepage_status === 'seasonal' ? (
                    <>
                      <label className="block">
                        <span className="mb-1 block font-inter text-[10px] uppercase tracking-wider text-rain-cloud/45">Seasonal starts</span>
                        <input
                          type="datetime-local"
                          defaultValue={cat.seasonal_starts_at ? String(cat.seasonal_starts_at).slice(0, 16) : ''}
                          onBlur={(e) => patch(cat.id, { seasonal_starts_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                          className="w-full rounded-xl border border-border px-3 py-2 font-inter text-sm"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block font-inter text-[10px] uppercase tracking-wider text-rain-cloud/45">Seasonal ends</span>
                        <input
                          type="datetime-local"
                          defaultValue={cat.seasonal_ends_at ? String(cat.seasonal_ends_at).slice(0, 16) : ''}
                          onBlur={(e) => patch(cat.id, { seasonal_ends_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                          className="w-full rounded-xl border border-border px-3 py-2 font-inter text-sm"
                        />
                      </label>
                    </>
                  ) : null}
                  <div className="md:col-span-2">
                    <ImageUploadField
                      label="Homepage image override"
                      value={cat.homepage_image_override || ''}
                      onChange={(url) => patch(cat.id, { homepage_image_override: url })}
                      folder="categories"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 md:col-span-2">
                    <button
                      type="button"
                      onClick={() => move(cat.id, -1)}
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 font-inter text-xs text-rain-cloud"
                    >
                      <ChevronUp className="h-3.5 w-3.5" /> Up
                    </button>
                    <button
                      type="button"
                      onClick={() => move(cat.id, 1)}
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 font-inter text-xs text-rain-cloud"
                    >
                      <ChevronDown className="h-3.5 w-3.5" /> Down
                    </button>
                    <span className="font-inter text-[11px] text-rain-cloud/45">Order {cat.homepage_order ?? '—'}</span>
                    <button
                      type="button"
                      onClick={() => setPreviewId(cat.id)}
                      className="ml-auto rounded-lg border border-wet-earth/30 bg-wet-earth/5 px-2.5 py-1.5 font-inter text-xs text-wet-earth"
                    >
                      Preview tile
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {preview ? (
        <div className="rounded-2xl border border-border bg-warm-cream/50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-inter text-xs font-bold uppercase tracking-wider text-rain-cloud/50">Tile preview</p>
            <button type="button" onClick={() => setPreviewId(null)} className="font-inter text-xs text-rain-cloud/50">Close</button>
          </div>
          <div className="max-w-sm rounded-2xl border border-soft-border bg-white p-4">
            {preview.imageUrl ? (
              <img src={preview.imageUrl} alt="" className="mb-3 aspect-[4/3] w-full rounded-xl object-cover" />
            ) : (
              <div className="mb-3 flex aspect-[4/3] items-center justify-center rounded-xl bg-soft-border/30 font-cormorant text-lg text-deep-forest/40">
                {preview.label}
              </div>
            )}
            <p className="font-cormorant text-xl font-semibold text-deep-forest">{preview.label}</p>
            {preview.description ? <p className="mt-1 font-inter text-sm text-deep-forest/65">{preview.description}</p> : null}
            <p className="mt-3 font-inter text-xs font-bold text-neon-paddy">{preview.ctaLabel}</p>
          </div>
        </div>
      ) : null}

      {saveMut.isError ? (
        <p className="font-inter text-sm text-red-600">{saveMut.error?.message || 'Save failed'}</p>
      ) : null}
    </div>
  );
}
