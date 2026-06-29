import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { products, categories } from '@/services/api';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import ProductFormDrawer from '../../components/admin/ProductFormDrawer';
import {
  PRODUCT_EDITOR_EMPTY,
  buildProductSavePayload,
  normalizeEditorList,
  productToEditorForm,
} from '@/lib/adminProductFormUtils';
import { Plus, Search, Barcode, Download, Upload } from 'lucide-react';
import { assignMissingProductSkus } from '@/lib/productSku';
import { exportSkuBarcodePdf } from '@/lib/skuBarcodeLabel';
import { getProductEffectiveStock } from '@/lib/productStockUtils';
import ProductQuickOpsRow from '../../components/admin/ProductQuickOpsRow';
import { buildQuickStockPayload } from '../../components/admin/ProductQuickStockEditor';
import {
  applyProductSpreadsheetImport,
  downloadProductSpreadsheet,
  parseProductSpreadsheetFile,
  planProductSpreadsheetImport,
} from '@/lib/productSpreadsheet';
import { invalidatePublicProductQueries } from '@/lib/productQueryInvalidation';

const EMPTY = PRODUCT_EDITOR_EMPTY;

const STATUS_FILTERS = ['all', 'published', 'draft', 'low_stock', 'out_of_stock'];
const normalizeList = normalizeEditorList;

function productToDuplicateForm(item = {}) {
  const base = productToEditorForm(item);
  const baseTitle = (base.title || 'Product').trim();

  const {
    id: _id,
    created_date: _createdDate,
    updated_date: _updatedDate,
    created_at: _createdAt,
    updated_at: _updatedAt,
    slug: _slug,
    sku: _sku,
    product_code: _code,
    seo_title: _seoTitle,
    seo_description: _seoDesc,
    seo_keywords: _seoKeys,
    ...rest
  } = base;

  return {
    ...rest,
    title: `${baseTitle} (Copy)`,
    slug: '',
    sku: '',
    product_code: '',
    seo_title: '',
    seo_description: '',
    seo_keywords: '',
    is_published: true,
    is_featured: false,
    featured_in_hero: false,
    variants: normalizeList(rest.variants).map((variant) => ({
      ...variant,
      sku: '',
    })),
  };
}

export default function AdminProducts() {
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [bulkStockKg, setBulkStockKg] = useState('10');
  const [savingOpsId, setSavingOpsId] = useState(null);
  const [savedOpsId, setSavedOpsId] = useState(null);
  const [pendingOps, setPendingOps] = useState({});
  const [batchSaving, setBatchSaving] = useState(false);
  const [barcodeExportBusy, setBarcodeExportBusy] = useState(false);
  const [spreadsheetImportBusy, setSpreadsheetImportBusy] = useState(false);
  const importInputRef = useRef(null);

  const { data: productList = [], isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => products.list('sort_order', 500),
  });
  const { data: categoryList = [] } = useQuery({
    queryKey: ['categories-all'],
    queryFn: () => categories.listActive(50),
  });

  const createMut = useMutation({
    mutationFn: (d) => products.create(d),
    onSuccess: () => {
      qc.invalidateQueries(['admin-products']);
      qc.invalidateQueries(['admin-label-products']);
      invalidatePublicProductQueries(qc);
      closeDrawer();
    },
    onError: (err) => { alert(err?.message || 'Failed to create product'); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, d }) => products.update(id, d),
    onSuccess: () => {
      qc.invalidateQueries(['admin-products']);
      qc.invalidateQueries(['admin-label-products']);
      invalidatePublicProductQueries(qc);
      closeDrawer();
    },
    onError: (err) => { alert(err?.message || 'Failed to update product'); },
  });
  const opsUpdateMut = useMutation({
    mutationFn: ({ id, d }) => products.update(id, d),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries(['admin-products']);
      qc.invalidateQueries(['admin-label-products']);
      invalidatePublicProductQueries(qc);
      setSavingOpsId(null);
      setSavedOpsId(id);
      setPendingOps((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      window.setTimeout(() => {
        setSavedOpsId((current) => (current === id ? null : current));
      }, 2000);
    },
    onError: (err) => {
      setSavingOpsId(null);
      setBatchSaving(false);
      alert(err?.message || 'Failed to update product');
    },
  });

  const handleOpsDraftChange = useCallback((productId, { dirty, payload }) => {
    setPendingOps((prev) => {
      const next = { ...prev };
      if (dirty && payload) next[productId] = payload;
      else delete next[productId];
      return next;
    });
  }, []);

  const handleOpsSave = (product, payload) => {
    setSavingOpsId(product.id);
    opsUpdateMut.mutate({ id: product.id, d: payload });
  };

  const handleSaveAllOps = async () => {
    const entries = Object.entries(pendingOps);
    if (!entries.length) return;
    if (!window.confirm(`Save changes for ${entries.length} product${entries.length === 1 ? '' : 's'}?`)) return;

    setBatchSaving(true);
    try {
      await Promise.all(entries.map(([id, payload]) => products.update(id, payload)));
      qc.invalidateQueries(['admin-products']);
      qc.invalidateQueries(['admin-label-products']);
      invalidatePublicProductQueries(qc);
      setPendingOps({});
      alert(`Saved ${entries.length} product${entries.length === 1 ? '' : 's'}.`);
    } catch (err) {
      alert(err?.message || 'Batch save failed');
    } finally {
      setBatchSaving(false);
    }
  };

  const handleBulkStockApply = () => {
    const kg = Number(bulkStockKg);
    if (!Number.isFinite(kg) || kg < 0) {
      alert('Enter a valid kg amount');
      return;
    }
    const targets = filtered.length ? filtered : productList;
    if (!window.confirm(`Set bulk stock to ${kg} (kg for solids, L for oils/honey/ghee) for ${targets.length} products?`)) return;

    Promise.all(
      targets.map((item) =>
        products.update(item.id, buildQuickStockPayload(item, { bulkKg: kg }))
      )
    )
      .then(() => {
        qc.invalidateQueries(['admin-products']);
        alert(`Updated stock for ${targets.length} products.`);
      })
      .catch((err) => alert(err?.message || 'Bulk stock update failed'));
  };

  const assignSkusMut = useMutation({
    mutationFn: async () => {
      const updates = assignMissingProductSkus(productList);
      await Promise.all(updates.map((item) => products.update(item.id, { sku: item.sku })));
      return updates;
    },
    onSuccess: (updates) => {
      qc.invalidateQueries(['admin-products']);
      qc.invalidateQueries(['admin-label-products']);
      alert(updates.length ? `Assigned SKUs to ${updates.length} products.` : 'All products already have SKUs.');
    },
    onError: (err) => { alert(err?.message || 'Failed to assign SKUs'); },
  });

  const openCreate = () => { setEditing(null); setIsDuplicating(false); setForm(EMPTY); setDrawerOpen(true); };
  const openEdit = (item) => { setEditing(item); setIsDuplicating(false); setForm(productToEditorForm(item)); setDrawerOpen(true); };
  const openDuplicate = (item) => {
    setEditing(null);
    setIsDuplicating(true);
    setForm(productToDuplicateForm(item));
    setDrawerOpen(true);
  };
  const closeDrawer = () => { setDrawerOpen(false); setEditing(null); setIsDuplicating(false); setForm(EMPTY); };

  const editProductId = searchParams.get('edit');

  useEffect(() => {
    if (!editProductId || isLoading) return;
    const item = productList.find((p) => p.id === editProductId);
    if (!item) return;

    setEditing(item);
    setIsDuplicating(false);
    setForm(productToEditorForm(item));
    setDrawerOpen(true);

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('edit');
      return next;
    }, { replace: true });
  }, [editProductId, productList, isLoading, setSearchParams]);

  const handleSave = () => {
    const payload = buildProductSavePayload(form, { isDuplicating });

    if (editing) updateMut.mutate({ id: editing.id, d: payload });
    else createMut.mutate(payload);
  };

  const filtered = useMemo(() => {
    return productList.filter(p => {
      const matchSearch = !search || p.title?.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all'
        || (statusFilter === 'published' && p.is_published)
        || (statusFilter === 'draft' && !p.is_published)
        || (statusFilter === 'low_stock' && getProductEffectiveStock(p) > 0 && getProductEffectiveStock(p) <= (p.low_stock_threshold || 10))
        || (statusFilter === 'out_of_stock' && getProductEffectiveStock(p) === 0);
      const matchCategory = categoryFilter === 'all' || p.category_id === categoryFilter;
      return matchSearch && matchStatus && matchCategory;
    });
  }, [productList, search, statusFilter, categoryFilter]);

  const pendingCount = Object.keys(pendingOps).length;

  const handleBulkBarcodePdf = async () => {
    const targets = filtered.filter((item) => String(item.sku || '').trim());
    if (!targets.length) {
      alert('No products with SKU in the current list. Assign SKUs first.');
      return;
    }
    setBarcodeExportBusy(true);
    try {
      const count = await exportSkuBarcodePdf(targets);
      alert(`Downloaded PDF with ${count} barcode label${count === 1 ? '' : 's'} (50×25 mm, one per page).`);
    } catch (err) {
      alert(err?.message || 'Barcode PDF export failed');
    } finally {
      setBarcodeExportBusy(false);
    }
  };

  const handleExportSpreadsheet = () => {
    const targets = filtered.length ? filtered : productList;
    if (!targets.length) {
      alert('No products to export.');
      return;
    }
    const suffix = filtered.length && filtered.length !== productList.length ? 'filtered' : 'all';
    downloadProductSpreadsheet(
      targets,
      categoryList,
      `yasvik-products-${suffix}-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  };

  const handleImportSpreadsheet = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setSpreadsheetImportBusy(true);
    try {
      const { rows, sheetName } = await parseProductSpreadsheetFile(file);
      const { planned, skipped } = planProductSpreadsheetImport(rows, productList, categoryList);

      if (!planned.length) {
        const sample = skipped.slice(0, 3).map((item) => `Row ${item.row}: ${item.reason}`).join('\n');
        alert(`No products to update.\n\n${sample || 'Check that id column matches exported file.'}`);
        return;
      }

      const skipNote = skipped.length
        ? `\n\nSkipping ${skipped.length} row${skipped.length === 1 ? '' : 's'} (missing id, unknown product, or no changes).`
        : '';

      if (!window.confirm(
        `Import ${planned.length} product update${planned.length === 1 ? '' : 's'} from "${file.name}" (${sheetName})?${skipNote}\n\nKeep the id column unchanged. Only existing products are updated.`,
      )) {
        return;
      }

      const results = await applyProductSpreadsheetImport(
        planned,
        (id, payload) => products.update(id, payload),
      );

      qc.invalidateQueries(['admin-products']);
      qc.invalidateQueries(['admin-label-products']);

      const failedNote = results.failed.length
        ? `\n\nFailed (${results.failed.length}):\n${results.failed.slice(0, 5).map((item) => `Row ${item.row} · ${item.title}: ${item.reason}`).join('\n')}`
        : '';

      alert(`Updated ${results.updated} product${results.updated === 1 ? '' : 's'}.${failedNote}`);
    } catch (err) {
      alert(err?.message || 'Import failed');
    } finally {
      setSpreadsheetImportBusy(false);
    }
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <AdminPageHeader
        title="Products"
        description={`${productList.length} products · export to Excel · re-import after bulk edits · quick ops table`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportSpreadsheet}
              className="flex items-center gap-2 py-2.5 px-4 border border-border font-inter text-sm rounded-full text-rain-cloud hover:bg-rain-mist/50 transition-all"
              title="Download CSV for Excel — edit and re-upload"
            >
              <Download className="w-4 h-4" /> Export Excel
            </button>
            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              disabled={spreadsheetImportBusy}
              className="flex items-center gap-2 py-2.5 px-4 border border-border font-inter text-sm rounded-full text-rain-cloud hover:bg-rain-mist/50 transition-all disabled:opacity-50"
              title="Upload edited CSV from Excel"
            >
              <Upload className="w-4 h-4" /> {spreadsheetImportBusy ? 'Importing…' : 'Import Excel'}
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={handleImportSpreadsheet}
            />
            <button
              type="button"
              onClick={() => {
                const missing = productList.filter((p) => !String(p.sku || '').trim()).length;
                if (!missing) {
                  alert('All products already have SKUs.');
                  return;
                }
                if (window.confirm(`Assign readable SKUs to ${missing} products without one?`)) {
                  assignSkusMut.mutate();
                }
              }}
              disabled={assignSkusMut.isPending}
              className="flex items-center gap-2 py-2.5 px-4 border border-border font-inter text-sm rounded-full text-rain-cloud hover:bg-rain-mist/50 transition-all disabled:opacity-50"
            >
              <Barcode className="w-4 h-4" /> Assign missing SKUs
            </button>
            <button
              type="button"
              onClick={handleBulkBarcodePdf}
              disabled={barcodeExportBusy}
              className="flex items-center gap-2 py-2.5 px-4 border border-border font-inter text-sm rounded-full text-rain-cloud hover:bg-rain-mist/50 transition-all disabled:opacity-50"
            >
              <Barcode className="w-4 h-4" /> {barcodeExportBusy ? 'Building PDF…' : 'Barcode PDF (list)'}
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 py-2.5 px-5 bg-wet-earth text-white font-inter text-sm rounded-full hover:bg-wet-earth/90 transition-all"
            >
              <Plus className="w-4 h-4" /> Add Product
            </button>
          </div>
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

      <p className="mb-4 font-inter text-xs leading-relaxed text-rain-cloud/45">
        <strong className="font-medium text-rain-cloud/60">Excel workflow:</strong> Export catalog, edit in Excel, then Import the same file (.xlsx or CSV).
        Upload workbooks with a <code className="rounded bg-temple-stone/20 px-1">Products Upload</code> sheet (47 columns).
        Includes pricing, stock, SEO, storytelling, media, variants, and publish flags.
        Keep the <code className="rounded bg-temple-stone/20 px-1">id</code> column unchanged.
        Pack sizes: edit <code className="rounded bg-temple-stone/20 px-1">variants_json</code> or quick stock via <code className="rounded bg-temple-stone/20 px-1">variant_stocks</code> (e.g. 500g=12; 1kg=8).
        Exports {filtered.length} of {productList.length} products (current filters).
      </p>

      {/* Quick stock refill bar */}
      <div className="bg-forest-canopy/5 border border-forest-canopy/15 rounded-2xl p-4 mb-4 flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
          <p className="font-inter text-sm font-medium text-rain-cloud">Quick stock refill</p>
          <p className="font-inter text-xs text-rain-cloud/45 mt-0.5">
            Bulk apply sets stock for filtered products · respects each product&apos;s measure (kg / L / units).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            step="0.5"
            value={bulkStockKg}
            onChange={(e) => setBulkStockKg(e.target.value)}
            className="w-24 rounded-xl border border-border px-3 py-2 font-inter text-sm focus:outline-none focus:border-forest-canopy bg-white"
            aria-label="Bulk stock amount"
          />
          <span className="font-inter text-xs text-rain-cloud/50">kg / L / units</span>
          <button
            type="button"
            onClick={handleBulkStockApply}
            className="rounded-full bg-forest-canopy px-4 py-2 font-inter text-sm text-white hover:bg-forest-canopy/90 transition-colors"
          >
            Apply to list
          </button>
          {pendingCount > 0 ? (
            <button
              type="button"
              onClick={handleSaveAllOps}
              disabled={batchSaving}
              className="rounded-full border-2 border-amber-500 bg-amber-50 px-4 py-2 font-inter text-sm font-medium text-amber-800 hover:bg-amber-100 transition-colors disabled:opacity-50"
            >
              {batchSaving ? 'Saving…' : `Save all (${pendingCount})`}
            </button>
          ) : null}
        </div>
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
            <table className="w-full min-w-[1110px] table-fixed">
              <colgroup>
                <col className="w-11" />
                <col className="w-[11%]" />
                <col className="w-[4.5rem]" />
                <col className="w-[11%]" />
                <col className="w-[11%]" />
                <col className="w-[5.75rem]" />
                <col className="w-[6.5rem]" />
                <col className="w-[6.5rem]" />
                <col className="w-[3.25rem]" />
                <col className="w-10" />
                <col className="w-[4.5rem]" />
                <col className="w-[7rem]" />
              </colgroup>
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-2 py-2.5 text-left font-inter text-[10px] font-medium uppercase tracking-wider text-rain-cloud/45" />
                  <th className="px-2 py-2.5 text-left font-inter text-[10px] font-medium uppercase tracking-wider text-rain-cloud/45">Product</th>
                  <th className="px-2 py-2.5 text-left font-inter text-[10px] font-medium uppercase tracking-wider text-rain-cloud/45">Unit</th>
                  <th className="px-2 py-2.5 text-left font-inter text-[10px] font-medium uppercase tracking-wider text-rain-cloud/45">Category</th>
                  <th className="px-2 py-2.5 text-left font-inter text-[10px] font-medium uppercase tracking-wider text-rain-cloud/45">Telugu</th>
                  <th className="px-2 py-2.5 text-right font-inter text-[10px] font-medium uppercase tracking-wider text-rain-cloud/45">Stock</th>
                  <th className="px-2 py-2.5 text-left font-inter text-[10px] font-medium uppercase tracking-wider text-rain-cloud/45">SKU</th>
                  <th className="px-2 py-2.5 text-right font-inter text-[10px] font-medium uppercase tracking-wider text-rain-cloud/45">Price</th>
                  <th className="px-2 py-2.5 text-center font-inter text-[10px] font-medium uppercase tracking-wider text-rain-cloud/45" title="Lower = first">Order</th>
                  <th className="px-2 py-2.5 text-center font-inter text-[10px] font-medium uppercase tracking-wider text-rain-cloud/45">Live</th>
                  <th className="px-2 py-2.5 text-center font-inter text-[10px] font-medium uppercase tracking-wider text-rain-cloud/45">Save</th>
                  <th className="px-2 py-2.5 text-right font-inter text-[10px] font-medium uppercase tracking-wider text-rain-cloud/45">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <ProductQuickOpsRow
                    key={item.id}
                    product={item}
                    categories={categoryList}
                    onSave={(payload) => handleOpsSave(item, payload)}
                    onEdit={openEdit}
                    onDuplicate={openDuplicate}
                    isSaving={savingOpsId === item.id}
                    saveStatus={savedOpsId === item.id ? 'saved' : null}
                    onDraftChange={handleOpsDraftChange}
                  />
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-2">
              <p className="font-inter text-xs text-rain-cloud/35">
                Showing {filtered.length} of {productList.length} products
                {pendingCount > 0 ? ` · ${pendingCount} unsaved` : ''}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const missing = productList.filter((p) => !String(p.sku || '').trim()).length;
                    if (!missing) { alert('All products already have SKUs.'); return; }
                    if (window.confirm(`Assign readable SKUs to ${missing} products?`)) assignSkusMut.mutate();
                  }}
                  disabled={assignSkusMut.isPending}
                  className="font-inter text-xs text-rain-cloud/50 hover:text-forest-canopy"
                >
                  Assign missing SKUs
                </button>
              </div>
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
        isDuplicating={isDuplicating}
      />
    </div>
  );
}
