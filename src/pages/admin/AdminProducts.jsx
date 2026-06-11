import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { products, categories } from '@/services/api';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import ProductFormDrawer from '../../components/admin/ProductFormDrawer';
import { Plus, Search, Eye, EyeOff, Pencil, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

const EMPTY = {
  title: '', slug: '', short_description: '', story_description: '', sourcing_story: '',
  price: '', compare_price: '', stock: '', low_stock_threshold: 10,
  unit: '', weight_grams: '', hero_image: '', hero_video: '', images: [],
  category_id: '', journey_id: '', person_id: '', region_id: '',
  is_featured: false, featured_in_hero: false, is_published: false,
  availability: 'in_stock', tags: [], certifications: [], variants: [],
  sku: '', seo_title: '', seo_description: '', seo_keywords: '', delivery_estimate: '',
  sourcing_location: '', harvest_season: '', harvest_date: '', batch_tested_at: '',
  purity_badges: [], hover_media: [], inventory_notes: '', discount_note: '', preorder_note: '',
};

const STATUS_FILTERS = ['all', 'published', 'draft', 'low_stock', 'out_of_stock'];
function normalizeList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return trimmed.split('\n').map((line) => line.trim()).filter(Boolean);
    }
  }
  return [];
}

function StatusBadge({ item }) {
  const isLow = item.stock != null && item.stock <= (item.low_stock_threshold || 10) && item.stock > 0;
  const isOut = item.stock === 0;
  return (
    <div className="flex flex-col gap-1">
      <span className={`font-inter text-xs px-2 py-0.5 rounded-full w-fit ${item.is_published ? 'bg-forest-canopy/15 text-forest-canopy' : 'bg-temple-stone/30 text-rain-cloud/40'}`}>
        {item.is_published ? 'Live' : 'Draft'}
      </span>
      {isOut && <span className="font-inter text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-500 w-fit">Out of stock</span>}
      {!isOut && isLow && <span className="font-inter text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 w-fit">Low stock</span>}
      {item.featured_in_hero && <span className="font-inter text-[10px] px-2 py-0.5 rounded-full bg-warm-turmeric/15 text-warm-turmeric w-fit">⭐ Hero</span>}
    </div>
  );
}

export default function AdminProducts() {
  const qc = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const { data: productList = [], isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => products.list('-created_date', 200),
  });
  const { data: categoryList = [] } = useQuery({
    queryKey: ['categories-all'],
    queryFn: () => categories.listActive(20),
  });

  const createMut = useMutation({
    mutationFn: (d) => products.create(d),
    onSuccess: () => { qc.invalidateQueries(['admin-products']); closeDrawer(); },
    onError: (err) => { alert(err?.message || 'Failed to create product'); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, d }) => products.update(id, d),
    onSuccess: () => { qc.invalidateQueries(['admin-products']); closeDrawer(); },
    onError: (err) => { alert(err?.message || 'Failed to update product'); },
  });
  const deleteMut = useMutation({
    mutationFn: (id) => products.delete(id),
    onSuccess: () => qc.invalidateQueries(['admin-products']),
  });

  const openCreate = () => { setEditing(null); setForm(EMPTY); setDrawerOpen(true); };
  const openEdit = (item) => { setEditing(item); setForm({ ...EMPTY, ...item }); setDrawerOpen(true); };
  const closeDrawer = () => { setDrawerOpen(false); setEditing(null); setForm(EMPTY); };

  const handleSave = () => {
    const variants = normalizeList(form.variants).filter((variant) => variant && variant.label);
    const quickVariants = variants.map((variant) => ({
      label: variant.label,
      price: variant.price ? Number(variant.price) : undefined,
      compare_price: variant.compare_price ? Number(variant.compare_price) : undefined,
      image_url: variant.image_url || variant.image_urls?.[0] || '',
      image_urls: Array.isArray(variant.image_urls) ? variant.image_urls.filter(Boolean) : [],
      stock: variant.stock ? Number(variant.stock) : undefined,
    }));

    const payload = {
      ...form,
      price: Number(form.price) || 0,
      compare_price: form.compare_price ? Number(form.compare_price) : undefined,
      stock: Number(form.stock) || 0,
      weight_grams: form.weight_grams ? Number(form.weight_grams) : undefined,
      low_stock_threshold: Number(form.low_stock_threshold) || 10,
      harvest_date: form.harvest_date || undefined,
      batch_tested_at: form.batch_tested_at || undefined,
      variants,
      quick_variants: quickVariants,
      hover_media: normalizeList(form.hover_media),
      purity_badges: normalizeList(form.purity_badges),
    };

    if (editing) updateMut.mutate({ id: editing.id, d: payload });
    else createMut.mutate(payload);
  };

  const handleToggle = (item) => {
    const nextPublished = !item.is_published;
    updateMut.mutate({ id: item.id, d: { is_published: nextPublished } });
  };

  const handleDelete = (item) => {
    if (window.confirm(`Delete "${item.title}"? This cannot be undone.`)) {
      deleteMut.mutate(item.id);
    }
  };

  const filtered = useMemo(() => {
    return productList.filter(p => {
      const matchSearch = !search || p.title?.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all'
        || (statusFilter === 'published' && p.is_published)
        || (statusFilter === 'draft' && !p.is_published)
        || (statusFilter === 'low_stock' && p.stock <= (p.low_stock_threshold || 10) && p.stock > 0)
        || (statusFilter === 'out_of_stock' && p.stock === 0);
      const matchCategory = categoryFilter === 'all' || p.category_id === categoryFilter;
      return matchSearch && matchStatus && matchCategory;
    });
  }, [productList, search, statusFilter, categoryFilter]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <AdminPageHeader
        title="Products"
        description={`${productList.length} products · ${productList.filter(p => p.is_published).length} live`}
        action={
          <button
            onClick={openCreate}
            className="flex items-center gap-2 py-2.5 px-5 bg-wet-earth text-white font-inter text-sm rounded-full hover:bg-wet-earth/90 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        }
      />

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rain-cloud/35" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title or SKU…"
            className="w-full pl-9 pr-4 py-2 border border-border rounded-xl font-inter text-sm text-rain-cloud focus:outline-none focus:border-forest-canopy transition-colors"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-border rounded-xl px-3 py-2 font-inter text-sm text-rain-cloud focus:outline-none bg-white"
        >
          {STATUS_FILTERS.map(f => (
            <option key={f} value={f}>{f === 'all' ? 'All Status' : f.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="border border-border rounded-xl px-3 py-2 font-inter text-sm text-rain-cloud focus:outline-none bg-white"
        >
          <option value="all">All Categories</option>
          {categoryList.map(c => <option key={c.id} value={c.id}>{c.emotional_title || c.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-temple-stone/15 rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-inter text-sm text-rain-cloud/40">{search || statusFilter !== 'all' ? 'No products match your filters.' : 'No products yet. Create your first.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 font-inter text-[11px] text-rain-cloud/40 uppercase tracking-wider font-normal w-12"></th>
                  <th className="text-left py-3 px-4 font-inter text-[11px] text-rain-cloud/40 uppercase tracking-wider font-normal">Product</th>
                  <th className="text-left py-3 px-4 font-inter text-[11px] text-rain-cloud/40 uppercase tracking-wider font-normal">Price</th>
                  <th className="text-left py-3 px-4 font-inter text-[11px] text-rain-cloud/40 uppercase tracking-wider font-normal">Stock</th>
                  <th className="text-left py-3 px-4 font-inter text-[11px] text-rain-cloud/40 uppercase tracking-wider font-normal">Status</th>
                  <th className="text-right py-3 px-4 font-inter text-[11px] text-rain-cloud/40 uppercase tracking-wider font-normal">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, i) => (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                  >
                    <td className="py-3 px-4">
                      {item.hero_image
                        ? <img src={item.hero_image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                        : <div className="w-10 h-10 rounded-lg bg-temple-stone/20 flex items-center justify-center"><span className="text-lg">🌾</span></div>
                      }
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-inter text-sm font-medium text-rain-cloud">{item.title}</p>
                      <p className="font-inter text-xs text-rain-cloud/40 mt-0.5">{item.unit || ''}{item.sku ? ` · ${item.sku}` : ''}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-inter text-sm text-rain-cloud/80">₹{item.price}</p>
                      {item.compare_price > item.price && (
                        <p className="font-inter text-xs text-rain-cloud/35 line-through">₹{item.compare_price}</p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`font-inter text-sm ${item.stock === 0 ? 'text-red-500' : item.stock <= (item.low_stock_threshold || 10) ? 'text-amber-500' : 'text-rain-cloud/60'}`}>
                        {item.stock ?? '—'}
                      </span>
                    </td>
                    <td className="py-3 px-4"><StatusBadge item={item} /></td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleToggle(item)}
                          className="p-1.5 rounded-lg text-rain-cloud/35 hover:text-forest-canopy hover:bg-forest-canopy/10 transition-all"
                          title={item.is_published ? 'Unpublish' : 'Publish'}
                        >
                          {item.is_published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => openEdit(item)}
                          className="p-1.5 rounded-lg text-rain-cloud/35 hover:text-wet-earth hover:bg-wet-earth/10 transition-all"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-1.5 rounded-lg text-rain-cloud/35 hover:text-red-500 hover:bg-red-50 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-border/50">
              <p className="font-inter text-xs text-rain-cloud/35">
                Showing {filtered.length} of {productList.length} products
              </p>
            </div>
          </div>
        )}
      </div>

      <ProductFormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        data={form}
        onChange={setForm}
        onSave={handleSave}
        isSaving={createMut.isPending || updateMut.isPending}
        isEditing={!!editing}
      />
    </div>
  );
}
