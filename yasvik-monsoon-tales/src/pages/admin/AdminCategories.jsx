import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appClient } from '@/api/appClient';
import { supabase } from '@/api/supabaseClient';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminCollapseSection from '../../components/admin/AdminCollapseSection';
import EntityFormModal from '../../components/admin/EntityFormModal';
import CategoryTreePanel, { orphanCategories } from '../../components/admin/CategoryTreePanel';
import ImageUploadField from '../../components/admin/ImageUploadField';
import HomepageCategoryMerchandisingPanel from '../../components/admin/HomepageCategoryMerchandisingPanel';
import {
  buildCategoryTree,
  categoryLabel,
  listChildCategories,
  listRootCategories,
} from '@/lib/categoryTree';
import {
  countProductsByCategory,
  isLegacyCategory,
  planLegacyCategoryDeletes,
} from '@/lib/adminCategoryCleanup';
import { STOREFRONT_CATEGORIES_QUERY_KEY, HOMEPAGE_CATEGORIES_QUERY_KEY } from '@/hooks/useStorefrontCategories';

const EMPTY = {
  name: '',
  slug: '',
  seo_slug: '',
  seo_title: '',
  seo_description: '',
  seo_intro: '',
  seo_faqs: '[]',
  canonical_override: '',
  indexable: true,
  emotional_title: '',
  short_intro: '',
  cover_image: '',
  color_accent: '#5B7A4B',
  sort_order: 0,
  is_active: true,
  exclude_from_bill_discount: false,
  parent_id: '',
};

function CategoryForm({ data, onChange, categories, parentPreset }) {
  const f = (key) => (e) => onChange({ ...data, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const isSubcategory = Boolean(data.parent_id);
  const parent = data.parent_id
    ? categories.find((cat) => cat.id === data.parent_id)
    : null;

  const parentOptions = [
    { value: '', label: 'Top-level (parent aisle)' },
    ...listRootCategories(categories)
      .filter((cat) => cat.id !== data.id)
      .map((cat) => ({ value: cat.id, label: categoryLabel(cat) })),
  ];

  return (
    <div className="space-y-4">
      {isSubcategory && parent ? (
        <div className="rounded-xl border border-forest-canopy/25 bg-forest-canopy/5 px-3 py-2.5">
          <p className="font-inter text-xs font-medium text-forest-canopy">Subcategory under</p>
          <p className="font-inter text-sm text-rain-cloud">{categoryLabel(parent)}</p>
        </div>
      ) : parentPreset === 'parent' ? (
        <div className="rounded-xl border border-wet-earth/20 bg-wet-earth/5 px-3 py-2.5">
          <p className="font-inter text-xs text-rain-cloud/65">Creating a <strong>parent aisle</strong> (e.g. Rice, Pulses, Oils). Add Regular / Organic as subcategories after.</p>
        </div>
      ) : null}

      {[
        { key: 'name', label: 'Name *', type: 'text', placeholder: isSubcategory ? 'e.g. Organic' : 'e.g. Rice & Grains' },
        { key: 'emotional_title', label: 'Shop label (shown on website)', type: 'text', placeholder: 'e.g. Heritage Rices' },
        { key: 'slug', label: 'Slug (optional)', type: 'text' },
        { key: 'seo_slug', label: 'Canonical public SEO slug', type: 'text', placeholder: isSubcategory ? 'Leave blank for subcategories' : 'e.g. homemade-snacks-sweets' },
        { key: 'seo_title', label: 'SEO title', type: 'text', placeholder: 'Optional override' },
        { key: 'color_accent', label: 'Accent color', type: 'text' },
        { key: 'sort_order', label: 'Sort order (lower = first in shop)', type: 'number' },
      ].map(({ key, label, type, placeholder }) => (
        <div key={key}>
          <label className="font-inter text-xs text-rain-cloud/55 block mb-1">{label}</label>
          <input
            type={type}
            value={data[key] ?? ''}
            onChange={f(key)}
            placeholder={placeholder}
            className="w-full border border-border rounded-xl px-4 py-2.5 font-inter text-sm focus:outline-none focus:border-forest-canopy"
          />
        </div>
      ))}

      <div>
        <label className="font-inter text-xs text-rain-cloud/55 block mb-1">Category type</label>
        <select
          value={data.parent_id || ''}
          onChange={f('parent_id')}
          className="w-full border border-border rounded-xl px-4 py-2.5 font-inter text-sm focus:outline-none focus:border-forest-canopy bg-white"
        >
          {parentOptions.map((opt) => (
            <option key={opt.value || 'root'} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <p className="mt-1 font-inter text-[10px] text-rain-cloud/40">
          Products are assigned to a parent or subcategory. Shop groups by parent aisle, then subcategory.
        </p>
      </div>

      <ImageUploadField
        label="Cover image"
        value={data.cover_image}
        onChange={(url) => onChange({ ...data, cover_image: url })}
        aspectClass="aspect-video"
        folder="categories"
        entityId={data.id}
        seoName={data.slug || data.name}
        assetRole="cover"
        entityTitle={data.name || data.emotional_title}
      />

      <div>
        <label className="font-inter text-xs text-rain-cloud/55 block mb-1">Short intro</label>
        <textarea value={data.short_intro || ''} onChange={f('short_intro')} rows={2} className="w-full border border-border rounded-xl px-4 py-2.5 font-inter text-sm focus:outline-none resize-none" />
      </div>

      <div>
        <label className="font-inter text-xs text-rain-cloud/55 block mb-1">SEO description</label>
        <textarea value={data.seo_description || ''} onChange={f('seo_description')} rows={3} className="w-full border border-border rounded-xl px-4 py-2.5 font-inter text-sm focus:outline-none resize-none" />
      </div>

      <div>
        <label className="font-inter text-xs text-rain-cloud/55 block mb-1">SEO intro</label>
        <textarea value={data.seo_intro || ''} onChange={f('seo_intro')} rows={3} className="w-full border border-border rounded-xl px-4 py-2.5 font-inter text-sm focus:outline-none resize-none" />
      </div>

      <div>
        <label className="font-inter text-xs text-rain-cloud/55 block mb-1">Category FAQs (JSON array)</label>
        <textarea value={data.seo_faqs || '[]'} onChange={f('seo_faqs')} rows={4} className="w-full border border-border rounded-xl px-4 py-2.5 font-inter text-sm focus:outline-none resize-none" />
      </div>

      <div>
        <label className="font-inter text-xs text-rain-cloud/55 block mb-1">Canonical override</label>
        <input
          type="text"
          value={data.canonical_override || ''}
          onChange={f('canonical_override')}
          placeholder="Optional absolute or relative canonical URL"
          className="w-full border border-border rounded-xl px-4 py-2.5 font-inter text-sm focus:outline-none focus:border-forest-canopy"
        />
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={!!data.is_active} onChange={f('is_active')} className="w-4 h-4 accent-forest-canopy" />
        <span className="font-inter text-sm text-rain-cloud/70">Active on shop</span>
      </label>

      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={!!data.exclude_from_bill_discount}
          onChange={f('exclude_from_bill_discount')}
          className="w-4 h-4 mt-0.5 accent-forest-canopy"
        />
        <span className="font-inter text-sm text-rain-cloud/70">
          Exclude from bill discount
          <span className="block text-[11px] text-rain-cloud/45 mt-0.5">
            POS / coupon flat discounts skip products in this category. Parent aisles also cover their subcategories.
          </span>
        </span>
      </label>

      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={data.indexable !== false} onChange={f('indexable')} className="w-4 h-4 accent-forest-canopy" />
        <span className="font-inter text-sm text-rain-cloud/70">Indexable by search engines</span>
      </label>
    </div>
  );
}

function invalidateCategoryQueries(qc) {
  qc.invalidateQueries(['admin-categories']);
  qc.invalidateQueries(['categories-all']);
  qc.invalidateQueries(STOREFRONT_CATEGORIES_QUERY_KEY);
  qc.invalidateQueries(['categories', 'active', 'all']);
  qc.invalidateQueries(['categories-nav']);
  qc.invalidateQueries({ queryKey: STOREFRONT_CATEGORIES_QUERY_KEY });
  qc.invalidateQueries({ queryKey: HOMEPAGE_CATEGORIES_QUERY_KEY });
}

export default function AdminCategories() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [modalKind, setModalKind] = useState('parent');
  const [view, setView] = useState('launch');

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => appClient.entities.Category.list('sort_order', 200),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['admin-categories-product-counts'],
    queryFn: () => appClient.entities.Product.list('name', 500),
    staleTime: 60 * 1000,
  });

  const productCounts = useMemo(() => countProductsByCategory(products), [products]);

  const filteredCategories = useMemo(() => {
    if (view === 'all' || view === 'homepage') return categories;
    return categories.filter((cat) => {
      const legacy = isLegacyCategory(cat, categories);
      return view === 'legacy' ? legacy : !legacy;
    });
  }, [categories, view]);

  const tree = useMemo(() => buildCategoryTree(filteredCategories), [filteredCategories]);
  const orphans = useMemo(() => orphanCategories(filteredCategories), [filteredCategories]);

  const legacyStats = useMemo(() => {
    const legacyRows = categories.filter((cat) => isLegacyCategory(cat, categories));
    const { deletable, blocked } = planLegacyCategoryDeletes(categories, productCounts);
    return {
      legacyCount: legacyRows.length,
      emptyLegacyCount: deletable.length,
      blockedCount: blocked.length,
      deletable,
    };
  }, [categories, productCounts]);

  const createMut = useMutation({
    mutationFn: (d) => appClient.entities.Category.create(d),
    onSuccess: () => { invalidateCategoryQueries(qc); closeModal(); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, d }) => appClient.entities.Category.update(id, d),
    onSuccess: () => { invalidateCategoryQueries(qc); closeModal(); },
  });
  const deleteMut = useMutation({
    mutationFn: (id) => appClient.entities.Category.delete(id),
    onSuccess: () => invalidateCategoryQueries(qc),
    onError: (error) => {
      window.alert(error?.message || 'Could not delete category. Products may still be tagged to it.');
    },
  });
  const hideMut = useMutation({
    mutationFn: (item) => appClient.entities.Category.update(item.id, { is_active: false }),
    onSuccess: () => invalidateCategoryQueries(qc),
  });
  const bulkDeleteMut = useMutation({
    mutationFn: async (rows) => {
      for (const row of rows) {
        await appClient.entities.Category.delete(row.id);
      }
    },
    onSuccess: () => invalidateCategoryQueries(qc),
    onError: (error) => {
      window.alert(error?.message || 'Bulk cleanup failed.');
    },
  });

  const openCreateParent = () => {
    const nextOrder = (listRootCategories(categories).length + 1) * 10;
    setEditing(null);
    setModalKind('parent');
    setForm({ ...EMPTY, parent_id: '', sort_order: nextOrder });
    setModal(true);
  };

  const openCreateSubcategory = (parent) => {
    if (!parent?.id) return;
    const siblings = listChildCategories(parent.id, categories);
    setEditing(null);
    setModalKind('sub');
    setForm({
      ...EMPTY,
      parent_id: parent.id,
      sort_order: (siblings.length + 1) * 10,
    });
    setModal(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setModalKind(item.parent_id ? 'sub' : 'parent');
    setForm({
      ...item,
      parent_id: item.parent_id || '',
      seo_faqs: JSON.stringify(Array.isArray(item.seo_faqs) ? item.seo_faqs : [], null, 2),
    });
    setModal(true);
  };

  const closeModal = () => {
    setModal(false);
    setEditing(null);
    setForm(EMPTY);
    setModalKind('parent');
  };

  const handleSave = () => {
    let parsedFaqs = [];
    try {
      parsedFaqs = Array.isArray(form.seo_faqs) ? form.seo_faqs : JSON.parse(form.seo_faqs || '[]');
    } catch {
      window.alert('Category FAQs must be valid JSON.');
      return;
    }

    const payload = {
      ...form,
      parent_id: form.parent_id || null,
      sort_order: Number(form.sort_order) || 0,
      seo_faqs: parsedFaqs,
    };
    if (editing) {
      updateMut.mutate(
        { id: editing.id, d: payload },
        {
          onSuccess: async () => {
            const previousSlug = String(editing.seo_slug || editing.slug || '').trim();
            const nextSlug = String(payload.seo_slug || '').trim();
            if (previousSlug && nextSlug && previousSlug !== nextSlug) {
              await supabase.from('category_slug_aliases').upsert({
                old_slug: previousSlug,
                category_id: editing.id,
              });
            }
          },
        },
      );
    }
    else createMut.mutate(payload);
  };

  const countTreeProducts = (categoryId) => {
    let total = productCounts.get(categoryId) || 0;
    listChildCategories(categoryId, categories).forEach((child) => {
      total += productCounts.get(child.id) || 0;
    });
    return total;
  };

  const handleDelete = async (item) => {
    const kids = listChildCategories(item.id, categories);
    const directCount = productCounts.get(item.id) || 0;
    const treeCount = countTreeProducts(item.id);

    if (treeCount > 0) {
      window.alert(
        `Cannot delete "${categoryLabel(item)}": ${treeCount} product${treeCount === 1 ? '' : 's'} still tagged.\n\nReassign them in Products admin first, or run catalog cleanup to retag onto launch categories.`,
      );
      return;
    }

    const msg = kids.length
      ? `Delete "${categoryLabel(item)}" and ${kids.length} empty subcategor${kids.length === 1 ? 'y' : 'ies'}?`
      : `Delete "${categoryLabel(item)}"?`;
    if (!window.confirm(msg)) return;

    try {
      for (const kid of kids) {
        if ((productCounts.get(kid.id) || 0) === 0) {
          await deleteMut.mutateAsync(kid.id);
        }
      }
      await deleteMut.mutateAsync(item.id);
    } catch {
      // onError alert handled by mutation
    }
  };

  const handleHide = (item) => {
    if (!window.confirm(`Hide "${categoryLabel(item)}" from shop?`)) return;
    hideMut.mutate(item);
  };

  const handleBulkDeleteEmptyLegacy = () => {
    const rows = legacyStats.deletable;
    if (!rows.length) {
      window.alert('No empty legacy categories to remove.');
      return;
    }
    if (!window.confirm(`Delete ${rows.length} empty legacy categor${rows.length === 1 ? 'y' : 'ies'}?`)) return;
    bulkDeleteMut.mutate(rows);
  };

  const modalTitle = editing
    ? (editing.parent_id ? 'Edit subcategory' : 'Edit parent category')
    : (modalKind === 'sub' ? 'New subcategory' : 'New parent category');

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <AdminPageHeader
        title="Categories"
        description="Launch aisles for shop · legacy rows can be cleaned up after products are retagged"
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {[
          { id: 'launch', label: 'Launch aisles' },
          { id: 'homepage', label: 'Homepage merchandising' },
          { id: 'legacy', label: `Legacy (${legacyStats.legacyCount})` },
          { id: 'all', label: 'All' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setView(tab.id)}
            className={`rounded-full px-4 py-2 font-inter text-xs font-bold transition-colors ${
              view === tab.id
                ? 'bg-wet-earth text-white'
                : 'border border-border bg-white text-rain-cloud/65 hover:border-wet-earth/30'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {view === 'homepage' ? (
        <HomepageCategoryMerchandisingPanel />
      ) : null}

      {view === 'legacy' ? (
        <div className="mb-4 rounded-2xl border border-amber-200/80 bg-amber-50/70 px-4 py-3">
          <p className="font-inter text-sm text-amber-950/85">
            Legacy categories stay until products are moved off them. Delete is blocked while products are tagged.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleBulkDeleteEmptyLegacy}
              disabled={!legacyStats.emptyLegacyCount || bulkDeleteMut.isPending}
              className="rounded-full bg-amber-900 px-4 py-2 font-inter text-xs font-bold text-white disabled:opacity-40"
            >
              Remove {legacyStats.emptyLegacyCount} empty legacy
            </button>
            <p className="self-center font-inter text-[11px] text-amber-900/70">
              {legacyStats.blockedCount} legacy row{legacyStats.blockedCount === 1 ? '' : 's'} still have products
            </p>
          </div>
        </div>
      ) : null}

      {view !== 'homepage' ? (
      <AdminCollapseSection
        title="How to set up"
        description="Two-level structure used across shop, products, and filters"
        defaultOpen
        className="mb-4"
      >
        <ol className="list-decimal space-y-2 pl-4 font-inter text-sm text-rain-cloud/70">
          <li><strong className="text-rain-cloud">Parent category</strong> — shop aisle. Shop order uses Sort order; homepage uses Homepage merchandising.</li>
          <li><strong className="text-rain-cloud">Subcategory</strong> — under a parent. Assign products here when you split Regular / Organic / Traditional.</li>
          <li><strong className="text-rain-cloud">Homepage merchandising</strong> — visibility, hero/featured flags, and marketing order without changing the tree.</li>
          <li><strong className="text-rain-cloud">Legacy tab</strong> — old duplicate categories. Retag products, then delete empty rows.</li>
        </ol>
      </AdminCollapseSection>
      ) : null}

      {view !== 'homepage' ? (
      <CategoryTreePanel
        tree={tree}
        orphans={orphans}
        isLoading={isLoading}
        categories={categories}
        productCounts={productCounts}
        legacyMode={view === 'legacy'}
        onEdit={openEdit}
        onDelete={handleDelete}
        onHide={handleHide}
        onAddParent={openCreateParent}
        onAddSubcategory={openCreateSubcategory}
      />
      ) : null}

      <EntityFormModal open={modal} onClose={closeModal} title={modalTitle}>
        <CategoryForm
          data={form}
          onChange={setForm}
          categories={categories}
          parentPreset={modalKind}
        />
        <div className="flex gap-3 mt-6 pt-4 border-t border-border">
          <button type="button" onClick={closeModal} className="flex-1 py-2.5 rounded-full border border-border font-inter text-sm text-rain-cloud/60">Cancel</button>
          <button
            type="button"
            onClick={handleSave}
            disabled={createMut.isPending || updateMut.isPending || !String(form.name || '').trim()}
            className="flex-1 py-2.5 rounded-full bg-wet-earth text-white font-inter text-sm disabled:opacity-50"
          >
            {editing ? 'Save' : 'Create'}
          </button>
        </div>
      </EntityFormModal>
    </div>
  );
}
