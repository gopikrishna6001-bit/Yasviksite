import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, ChevronDown, Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { appClient } from '@/api/appClient';
import { supabase } from '@/api/supabaseClient';
import { toast } from '@/components/ui/use-toast';
import { formatDisplayTitle } from '@/lib/formatDisplayTitle';
import { getCategoryDisplayName } from '@/lib/categoryDisplay';
import { useAllActiveCategories } from '@/hooks/useStorefrontCategories';
import {
  formatNetWeightLabel,
  formatQuantityLabel,
  isSellableBundleProduct,
} from '@/lib/productBundleUtils';
import { valueFromBundleAndParent, formatComboMetaLine } from '@/lib/comboVisualUtils';
import { productPrimaryImageUrl } from '@/lib/mediaUrl';
import ComboMosaic from '@/components/products/ComboMosaic';
import OptimizedImage from '@/components/ui/OptimizedImage';
import AdminComboEditorDrawer from '@/components/admin/AdminComboEditorDrawer';

const UNCATEGORISED = 'uncategorised';

async function fetchAdminCatalogueCombos() {
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .or('product_kind.eq.bundle_combo,product_kind.eq.gift_box,product_group.eq.packaged_combo')
    .order('updated_at', { ascending: false })
    .limit(100);
  if (error) throw error;

  const list = (products || []).filter((row) => (
    isSellableBundleProduct({
      ...row,
      title: row.title || row.name,
      hero_image: row.hero_image || row.featured_image_url,
    }) || row.product_kind === 'gift_box'
  )).map((row) => ({
    ...row,
    title: row.title || row.name,
    name: row.name || row.title,
    hero_image: row.hero_image || row.featured_image_url || '',
    featured_image_url: row.featured_image_url || row.hero_image || '',
  }));
  if (!list.length) return [];

  const parentIds = list.map((row) => row.id);
  const { data: bundles } = await supabase
    .from('product_bundles')
    .select('*')
    .in('parent_product_id', parentIds);

  const bundlesByParent = new Map((bundles || []).map((row) => [row.parent_product_id, row]));
  const bundleIds = (bundles || []).map((row) => row.id);
  let items = [];
  if (bundleIds.length) {
    const { data: itemRows } = await supabase
      .from('product_bundle_items')
      .select('*')
      .in('bundle_id', bundleIds)
      .order('sort_order', { ascending: true });
    items = itemRows || [];
  }

  const componentIds = [...new Set(items.map((row) => row.product_id).filter(Boolean))];
  let components = [];
  if (componentIds.length) {
    const { data } = await supabase
      .from('products')
      .select('id, name, featured_image_url, price, slug, is_published')
      .in('id', componentIds);
    components = (data || []).map((row) => ({
      ...row,
      title: row.name,
      hero_image: row.featured_image_url || '',
    }));
  }
  const componentsById = new Map(components.map((row) => [row.id, row]));

  return list.map((product) => {
    const bundle = bundlesByParent.get(product.id) || null;
    const bundleItems = bundle
      ? items.filter((row) => row.bundle_id === bundle.id && row.is_active !== false)
      : [];
    const linkedProducts = bundleItems
      .map((row) => componentsById.get(row.product_id))
      .filter(Boolean);
    const hydrated = bundle
      ? { ...bundle, items: bundleItems, products: linkedProducts, parent_product: product }
      : null;
    return { product, bundle: hydrated };
  });
}

function rowCategoryKey(product) {
  return product?.category_id || UNCATEGORISED;
}

function AdminComboRow({ row, categoriesById, onEdit, onArchive, onDelete, archiving, deleting }) {
  const [open, setOpen] = useState(false);
  const { product, bundle } = row;
  const title = formatDisplayTitle(product.title || product.name);
  const category = categoriesById.get(product.category_id);
  const categoryLabel = category ? getCategoryDisplayName(category) : 'Uncategorised';
  const itemCount = Number(bundle?.item_count || product.bundle_item_count) || (bundle?.items || []).length;
  const weightLabel = formatNetWeightLabel(bundle?.total_net_weight_g || product.bundle_net_weight_g);
  const meta = formatComboMetaLine({ itemCount, netWeightLabel: weightLabel });
  const { presentation } = valueFromBundleAndParent(bundle, product);
  const hero = productPrimaryImageUrl(product);
  const published = product.is_published === true;
  const featured = Boolean(product.is_featured);
  const contents = (bundle?.items || []).map((item) => {
    const linked = (bundle.products || []).find((p) => p.id === item.product_id);
    return {
      title: item.component_title_snapshot || linked?.title || linked?.name || 'Product',
      quantityLabel: formatQuantityLabel(item.quantity_value, item.quantity_unit, item.pack_count),
    };
  });

  return (
    <article className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-muted">
          {hero ? (
            <OptimizedImage src={hero} alt={title} preset="thumb" className="h-full w-full object-cover" />
          ) : (
            <ComboMosaic
              product={product}
              products={bundle?.products || []}
              alt={title}
              totalCount={itemCount}
              className="h-full w-full"
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-cormorant text-xl font-semibold text-rain-cloud">{title}</h3>
            {featured ? (
              <span className="rounded-full bg-sun-dried-clay/15 px-2 py-0.5 font-inter text-[10px] font-bold uppercase tracking-wide text-sun-dried-clay">
                Featured
              </span>
            ) : null}
            <span className={`rounded-full px-2 py-0.5 font-inter text-[10px] font-bold uppercase tracking-wide ${
              published ? 'bg-forest-canopy/15 text-forest-canopy' : 'bg-amber-100 text-amber-800'
            }`}
            >
              {published ? 'Published' : 'Draft'}
            </span>
          </div>
          <p className="mt-0.5 font-inter text-xs text-rain-cloud/50">{categoryLabel}</p>
          {meta ? <p className="mt-1 font-inter text-sm text-rain-cloud/65">{meta}</p> : null}
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-inter text-base font-bold text-rain-cloud">
              {presentation.priceLabel || `₹${Number(product.price) || 0}`}
            </span>
            {presentation.worthLabel ? (
              <span className="font-inter text-xs text-rain-cloud/40 line-through">
                Worth {presentation.worthLabel}
              </span>
            ) : null}
            {presentation.saveLabel ? (
              <span className="font-inter text-xs font-bold text-forest-canopy">{presentation.saveLabel}</span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 md:flex-col md:items-stretch">
          <button
            type="button"
            onClick={() => onEdit(row)}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-forest-canopy px-4 py-2 font-inter text-xs font-bold text-white hover:bg-forest-canopy/90"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border px-4 py-2 font-inter text-xs font-bold text-rain-cloud hover:bg-muted/40"
          >
            Contents
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => onArchive(product)}
            disabled={archiving || deleting || !published}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border px-4 py-2 font-inter text-xs font-bold text-rain-cloud/70 hover:bg-muted/40 disabled:opacity-50"
          >
            <Archive className="h-3.5 w-3.5" /> Unpublish
          </button>
          <button
            type="button"
            onClick={() => onDelete(product)}
            disabled={archiving || deleting}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-red-200 px-4 py-2 font-inter text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Delete
          </button>
        </div>
      </div>

      {open ? (
        <ul className="mt-4 space-y-1.5 rounded-xl border border-border bg-muted/20 p-3">
          {contents.length ? contents.map((line, index) => (
            <li key={`${line.title}-${index}`} className="flex items-center justify-between gap-3 font-inter text-xs">
              <span className="font-semibold text-rain-cloud">{line.title}</span>
              <span className="text-rain-cloud/55">{line.quantityLabel}</span>
            </li>
          )) : (
            <li className="font-inter text-xs text-rain-cloud/50">No contents linked yet.</li>
          )}
        </ul>
      ) : null}
    </article>
  );
}

function FilterChip({ active, onClick, children, count = null }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-inter text-xs font-bold transition-colors ${
        active
          ? 'bg-forest-canopy text-white'
          : 'border border-border bg-white text-rain-cloud/70 hover:border-forest-canopy/40'
      }`}
    >
      <span>{children}</span>
      {count != null ? (
        <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${
          active ? 'bg-white/20 text-white' : 'bg-muted text-rain-cloud/55'
        }`}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

export default function AdminCombos() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [groupByCategory, setGroupByCategory] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [createCategoryId, setCreateCategoryId] = useState('');
  const { data: categories = [] } = useAllActiveCategories();
  const categoriesById = useMemo(
    () => new Map(categories.map((row) => [row.id, row])),
    [categories],
  );

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['admin-catalogue-combos'],
    queryFn: fetchAdminCatalogueCombos,
    staleTime: 60 * 1000,
  });

  const archiveMutation = useMutation({
    mutationFn: async (product) => {
      await appClient.entities.Product.update(product.id, {
        is_published: false,
        sell_online: false,
        availability: 'out_of_stock',
      });
      await supabase
        .from('product_bundles')
        .update({ is_active: true, bundle_status: 'draft' })
        .eq('parent_product_id', product.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-catalogue-combos'] });
      toast({ title: 'Combo unpublished', description: 'Hidden from shop. Still editable as draft.' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Could not unpublish',
        description: error?.message || 'Please try again.',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (product) => {
      // Bundle parent FK is ON DELETE SET NULL — remove bundle (+ items) first so nothing is orphaned.
      const { data: bundles, error: bundleLookupError } = await supabase
        .from('product_bundles')
        .select('id')
        .eq('parent_product_id', product.id);
      if (bundleLookupError) throw bundleLookupError;

      const bundleIds = (bundles || []).map((row) => row.id).filter(Boolean);
      if (bundleIds.length) {
        const { error: bundleDeleteError } = await supabase
          .from('product_bundles')
          .delete()
          .in('id', bundleIds);
        if (bundleDeleteError) throw bundleDeleteError;
      }

      await appClient.entities.Product.delete(product.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-catalogue-combos'] });
      toast({ title: 'Combo deleted', description: 'Removed from catalogue and shop.' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Could not delete combo',
        description: error?.message
          || 'It may be linked to past orders or stock history. Unpublish instead, or clear linked records first.',
      });
    },
  });

  const categoryCounts = useMemo(() => {
    const counts = new Map();
    rows.forEach(({ product }) => {
      const key = rowCategoryKey(product);
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [rows]);

  const categoryOptions = useMemo(() => {
    const usedIds = [...categoryCounts.keys()].filter((id) => id !== UNCATEGORISED);
    const used = usedIds
      .map((id) => categoriesById.get(id))
      .filter(Boolean)
      .sort((a, b) => getCategoryDisplayName(a).localeCompare(getCategoryDisplayName(b)));

    // Also surface common combo categories even if empty, so admins can create into them.
    const preferredSlugs = [
      'dry-fruits-combos',
      'dry-fruits',
      'millets-millet-foods',
      'homemade-snacks-sweets',
      'cold-pressed-oils',
      'heritage-rice',
    ];
    const preferred = preferredSlugs
      .map((slug) => categories.find((row) => row.slug === slug))
      .filter(Boolean)
      .filter((row) => !used.some((u) => u.id === row.id));

    const options = [
      ...used,
      ...preferred,
    ];

    if (categoryCounts.get(UNCATEGORISED)) {
      options.push({ id: UNCATEGORISED, name: 'Uncategorised', emotional_title: 'Uncategorised' });
    }
    return options;
  }, [categoryCounts, categoriesById, categories]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(({ product, bundle }) => {
      if (categoryFilter !== 'all') {
        const key = rowCategoryKey(product);
        if (key !== categoryFilter) return false;
      }
      if (statusFilter === 'draft' && product.is_published === true) return false;
      if (statusFilter === 'published' && product.is_published !== true) return false;
      if (!q) return true;
      const category = categoriesById.get(product.category_id);
      const hay = [
        product.title,
        product.name,
        product.slug,
        product.yasvik_mark,
        product.best_for,
        bundle?.bundle_name,
        category ? getCategoryDisplayName(category) : 'Uncategorised',
      ].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query, categoryFilter, statusFilter, categoriesById]);

  const groupedSections = useMemo(() => {
    if (!groupByCategory || categoryFilter !== 'all') {
      return [{ key: categoryFilter, label: null, rows: filtered }];
    }
    const groups = new Map();
    filtered.forEach((row) => {
      const key = rowCategoryKey(row.product);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    });

    const orderedKeys = [
      ...categoryOptions.map((row) => row.id).filter((id) => groups.has(id)),
      ...[...groups.keys()].filter((key) => !categoryOptions.some((row) => row.id === key)),
    ];

    return orderedKeys.map((key) => {
      const category = key === UNCATEGORISED ? null : categoriesById.get(key);
      return {
        key,
        label: category ? getCategoryDisplayName(category) : 'Uncategorised',
        rows: groups.get(key) || [],
      };
    }).filter((section) => section.rows.length > 0);
  }, [filtered, groupByCategory, categoryFilter, categoryOptions, categoriesById]);

  const draftCount = rows.filter((row) => row.product.is_published !== true).length;
  const publishedCount = rows.length - draftCount;
  const preferredCategoryId = createCategoryId
    || (categoryFilter !== 'all' ? categoryFilter : '');
  const activeCategoryLabel = categoryFilter === 'all'
    ? null
    : categoryFilter === UNCATEGORISED
      ? 'Uncategorised'
      : getCategoryDisplayName(categoriesById.get(categoryFilter) || { name: 'Category' });

  const openNewCombo = (categoryId = '') => {
    setEditingRow(null);
    setCreateCategoryId(categoryId || (categoryFilter !== 'all' ? categoryFilter : ''));
    setEditorOpen(true);
  };

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-cormorant text-3xl font-medium text-rain-cloud">Combos &amp; Value Packs</h1>
          <p className="mt-1 max-w-xl font-inter text-sm text-rain-cloud/50">
            Manage catalogue combos by category. Filter, group, then edit title, image, price and contents.
          </p>
          <p className="mt-2 font-inter text-xs text-rain-cloud/45">
            {rows.length} combos · {draftCount} drafts · {publishedCount} published
            {activeCategoryLabel ? ` · showing ${activeCategoryLabel}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={openNewCombo}
          className="inline-flex items-center gap-2 rounded-full bg-forest-canopy px-5 py-2.5 font-inter text-sm font-bold text-white hover:bg-forest-canopy/90"
        >
          <Plus className="h-4 w-4" />
          {activeCategoryLabel ? `New in ${activeCategoryLabel}` : 'New combo'}
        </button>
      </div>

      <div className="mb-4 space-y-3 rounded-2xl border border-border bg-white p-4">
        <div>
          <p className="mb-2 font-inter text-[10px] font-bold uppercase tracking-[0.14em] text-rain-cloud/45">
            Category
          </p>
          <div className="flex flex-wrap gap-2">
            <FilterChip
              active={categoryFilter === 'all'}
              onClick={() => setCategoryFilter('all')}
              count={rows.length}
            >
              All
            </FilterChip>
            {categoryOptions.map((category) => (
              <FilterChip
                key={category.id}
                active={categoryFilter === category.id}
                onClick={() => setCategoryFilter(category.id)}
                count={categoryCounts.get(category.id) || 0}
              >
                {getCategoryDisplayName(category)}
              </FilterChip>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border/70 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 font-inter text-[10px] font-bold uppercase tracking-[0.14em] text-rain-cloud/45">
              Status
            </p>
            <div className="flex flex-wrap gap-2">
              <FilterChip active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>All</FilterChip>
              <FilterChip active={statusFilter === 'draft'} onClick={() => setStatusFilter('draft')} count={draftCount}>
                Drafts
              </FilterChip>
              <FilterChip
                active={statusFilter === 'published'}
                onClick={() => setStatusFilter('published')}
                count={publishedCount}
              >
                Published
              </FilterChip>
            </div>
          </div>
          <label className="inline-flex items-center gap-2 font-inter text-xs text-rain-cloud/65">
            <input
              type="checkbox"
              checked={groupByCategory}
              onChange={(e) => setGroupByCategory(e.target.checked)}
              disabled={categoryFilter !== 'all'}
            />
            Group by category
          </label>
        </div>
      </div>

      <div className="relative mb-5">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rain-cloud/35" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search combos by name, badge, or category…"
          className="w-full rounded-full border border-border bg-white py-2.5 pl-10 pr-4 font-inter text-sm text-rain-cloud focus:border-forest-canopy focus:outline-none"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-rain-cloud/45">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-12 text-center">
          <p className="font-inter text-sm text-rain-cloud/55">
            {activeCategoryLabel
              ? `No combos in ${activeCategoryLabel} yet.`
              : 'No catalogue combos match these filters.'}
          </p>
          <button
            type="button"
            onClick={openNewCombo}
            className="mt-4 font-inter text-sm font-bold text-forest-canopy"
          >
            {activeCategoryLabel ? `Create combo in ${activeCategoryLabel}` : 'Create your first combo'}
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedSections.map((section) => (
            <section key={section.key} className="space-y-3">
              {section.label ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-cormorant text-2xl font-semibold text-rain-cloud">
                    {section.label}
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="font-inter text-xs text-rain-cloud/45">
                      {section.rows.length} combo{section.rows.length === 1 ? '' : 's'}
                    </span>
                    <button
                      type="button"
                      onClick={() => openNewCombo(section.key)}
                      className="rounded-full border border-border px-3 py-1 font-inter text-[11px] font-bold text-rain-cloud/70 hover:border-forest-canopy hover:text-forest-canopy"
                    >
                      + Add here
                    </button>
                  </div>
                </div>
              ) : null}
              {section.rows.map((row) => (
                <AdminComboRow
                  key={row.product.id}
                  row={row}
                  categoriesById={categoriesById}
                  archiving={archiveMutation.isPending && archiveMutation.variables?.id === row.product.id}
                  deleting={deleteMutation.isPending && deleteMutation.variables?.id === row.product.id}
                  onEdit={(next) => {
                    setEditingRow(next);
                    setEditorOpen(true);
                  }}
                  onArchive={(product) => {
                    if (window.confirm(`Unpublish “${formatDisplayTitle(product.title || product.name)}”?`)) {
                      archiveMutation.mutate(product);
                    }
                  }}
                  onDelete={(product) => {
                    const name = formatDisplayTitle(product.title || product.name);
                    const ok = window.confirm(
                      `Permanently delete “${name}”?\n\nThis removes the combo product and its contents list from the catalogue. This cannot be undone.\n\nIf it has past orders, deletion may fail — use Unpublish instead.`,
                    );
                    if (ok) deleteMutation.mutate(product);
                  }}
                />
              ))}
            </section>
          ))}
        </div>
      )}

      <AdminComboEditorDrawer
        open={editorOpen}
        onClose={() => {
          setEditorOpen(false);
          setEditingRow(null);
          setCreateCategoryId('');
        }}
        categories={categories}
        preferredCategoryId={preferredCategoryId}
        initialRow={editingRow}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['admin-catalogue-combos'] })}
      />
    </div>
  );
}
