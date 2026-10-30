import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, CheckCircle2, Download, History, Layers, RefreshCw, Shield,
} from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { products as productsApi, categories as categoriesApi } from '@/services/api';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { CATALOGUE_MASTER_FILENAME, CATALOGUE_SCHEMA_VERSION } from '@/lib/pim/catalogueConstants';
import { downloadCatalogueSimpleWorkbook } from '@/lib/pim/catalogueSimpleExport';
import {
  applyCatalogueIdStabilization,
  fetchLatestCatalogueVersion,
  planCatalogueIdStabilization,
  sellablePackCount,
} from '@/lib/pim/stabilizeCatalogueIds';
import CatalogueImportPanel from '@/components/admin/CatalogueImportPanel';
import CatalogueMediaPanel from '@/components/admin/CatalogueMediaPanel';
import { invalidatePublicProductQueries } from '@/lib/productQueryInvalidation';

const TABS = [
  { id: 'export', label: 'Export Catalogue', ready: true },
  { id: 'import', label: 'Import Catalogue', ready: true },
  { id: 'history', label: 'Import History', ready: true },
  { id: 'media', label: 'Media Library', ready: true },
  { id: 'batches', label: 'Batches', ready: false, phase: 5 },
  { id: 'labels', label: 'Label Printing', ready: false, phase: 5 },
  { id: 'settings', label: 'Settings', ready: false, phase: 4 },
];

function ComingSoon({ phase, title }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-10 text-center">
      <p className="font-cormorant text-2xl font-semibold text-rain-cloud">{title}</p>
      <p className="mt-2 font-inter text-sm text-rain-cloud/60">
        Scheduled for Phase {phase}.
      </p>
    </div>
  );
}

export default function AdminCatalogueManager() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState('export');

  const productsQuery = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => productsApi.list('-created_date', 1000),
  });
  const categoriesQuery = useQuery({
    queryKey: ['categories-all'],
    queryFn: () => categoriesApi.listActive(300),
  });
  const versionQuery = useQuery({
    queryKey: ['catalogue-version-latest'],
    queryFn: fetchLatestCatalogueVersion,
    retry: false,
  });
  const exportsQuery = useQuery({
    queryKey: ['catalogue-exports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('catalogue_exports')
        .select('*')
        .order('exported_at', { ascending: false })
        .limit(12);
      if (error) throw error;
      return data || [];
    },
    retry: false,
  });

  const productList = productsQuery.data || [];
  const categoryList = categoriesQuery.data || [];
  const stabilizePlan = useMemo(() => planCatalogueIdStabilization(productList), [productList]);
  const packCount = useMemo(() => sellablePackCount(productList), [productList]);

  const stabilizeMut = useMutation({
    mutationFn: async () => applyCatalogueIdStabilization(productList, { actorUserId: user?.id || null }),
    onSuccess: async (result) => {
      await invalidatePublicProductQueries(qc);
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      qc.invalidateQueries({ queryKey: ['catalogue-version-latest'] });
      toast({
        title: 'Catalogue IDs stabilized',
        description: `version ${result.version?.version_number} · ${result.variantIdsAssigned} variant IDs · ${result.skusAssigned} pack SKUs`,
      });
    },
    onError: (err) => {
      toast({
        variant: 'destructive',
        title: 'Stabilize failed',
        description: err?.message || 'Apply Phase 1 migration, then retry.',
      });
    },
  });

  const exportMut = useMutation({
    mutationFn: async () => {
      let version = versionQuery.data;
      try {
        version = await fetchLatestCatalogueVersion();
      } catch {
        version = version || { version_number: 1, schema_version: CATALOGUE_SCHEMA_VERSION };
      }
      return downloadCatalogueSimpleWorkbook({
        products: productList,
        categories: categoryList,
        version,
        exportedBy: user?.email || user?.id || '',
        actorUserId: user?.id || null,
        filename: CATALOGUE_MASTER_FILENAME,
      });
    },
    onSuccess: (meta) => {
      qc.invalidateQueries({ queryKey: ['catalogue-exports'] });
      toast({
        title: 'Master workbook downloaded',
        description: `${meta.filename} · v${meta.catalogueVersion} · ${meta.variantCount} packs`,
      });
    },
    onError: (err) => {
      toast({ variant: 'destructive', title: 'Export failed', description: err?.message || 'Export failed' });
    },
  });

  const migrationMissing = Boolean(
    versionQuery.error?.message?.includes('does not exist')
    || exportsQuery.error?.message?.includes('does not exist')
    || stabilizeMut.error?.message?.includes('does not exist'),
  );

  return (
    <div className="min-h-full bg-rain-mist p-5 md:p-8">
      <div className="mx-auto max-w-6xl">
        <AdminPageHeader
          title="Catalogue Manager"
          description="PIM-lite · Supabase is the official catalogue · Excel is for bulk editing · R2 holds media"
        />

        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-white px-4 py-3">
            <p className="font-inter text-[10px] font-bold uppercase tracking-[0.14em] text-rain-cloud/40">Products</p>
            <p className="mt-1 font-cormorant text-2xl font-semibold text-rain-cloud">{productList.length}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-white px-4 py-3">
            <p className="font-inter text-[10px] font-bold uppercase tracking-[0.14em] text-rain-cloud/40">Sellable packs</p>
            <p className="mt-1 font-cormorant text-2xl font-semibold text-rain-cloud">{packCount}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-white px-4 py-3">
            <p className="font-inter text-[10px] font-bold uppercase tracking-[0.14em] text-rain-cloud/40">Catalogue version</p>
            <p className="mt-1 font-cormorant text-2xl font-semibold text-rain-cloud">
              {versionQuery.data?.version_number ?? '—'}
            </p>
            <p className="font-inter text-[11px] text-rain-cloud/45">schema {CATALOGUE_SCHEMA_VERSION}</p>
          </div>
        </div>

        {migrationMissing ? (
          <div className="mb-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="font-inter text-sm">
              <p className="font-semibold">Phase 1 migration not applied yet</p>
              <p className="mt-1 text-amber-900/80">
                Apply <code className="text-xs">supabase/migrations/20260802010000_catalogue_pim_phase1.sql</code>,
                then Stabilize IDs. Export still works from live products.
              </p>
            </div>
          </div>
        ) : null}

        <div className="mb-5 flex flex-wrap gap-2">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-full px-3.5 py-1.5 font-inter text-xs font-semibold transition ${
                tab === item.id
                  ? 'bg-rain-cloud text-white'
                  : 'border border-border bg-white text-rain-cloud/70 hover:bg-rain-mist'
              }`}
            >
              {item.label}
              {!item.ready ? <span className="ml-1 opacity-50">· P{item.phase}</span> : null}
            </button>
          ))}
        </div>

        {tab === 'export' ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/60 bg-white p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl">
                  <h2 className="font-cormorant text-xl font-semibold text-rain-cloud">1. Stabilize permanent IDs</h2>
                  <p className="mt-2 font-inter text-sm leading-relaxed text-rain-cloud/65">
                    Assigns <strong>variant_id</strong> (UUID) and missing pack <strong>SKU</strong>s inside existing
                    <code className="mx-1 text-xs">quick_variants</code>, dual-writes <code className="mx-1 text-xs">product_variants</code>,
                    and bumps catalogue version. Storefront behaviour unchanged.
                  </p>
                  <ul className="mt-3 space-y-1 font-inter text-xs text-rain-cloud/55">
                    <li>Products needing write: {stabilizePlan.productsUpdated}</li>
                    <li>New variant IDs: {stabilizePlan.variantIdsAssigned}</li>
                    <li>New pack SKUs: {stabilizePlan.skusAssigned}</li>
                    <li>Product codes to fill: {stabilizePlan.productCodesFilled}</li>
                  </ul>
                </div>
                <button
                  type="button"
                  disabled={stabilizeMut.isPending || !productList.length}
                  onClick={() => stabilizeMut.mutate()}
                  className="inline-flex items-center gap-2 rounded-xl bg-wet-earth px-4 py-2.5 font-inter text-xs font-semibold text-white disabled:opacity-40"
                >
                  <Shield className="h-4 w-4" />
                  {stabilizeMut.isPending ? 'Stabilizing…' : 'Stabilize IDs'}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-white p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl">
                  <h2 className="font-cormorant text-xl font-semibold text-rain-cloud">2. Download simple workbook</h2>
                  <p className="mt-2 font-inter text-sm leading-relaxed text-rain-cloud/65">
                    Downloads <strong>{CATALOGUE_MASTER_FILENAME}</strong> — five practical sheets only:
                    START_HERE, PRODUCTS, PACKS_PRICING, BATCH_LABELS, SETTINGS.
                    No UUID / SEO / media URL columns. Yellow = your inputs; green formulas calculate landed cost and checks.
                  </p>
                  <p className="mt-2 font-inter text-xs text-rain-cloud/50">
                    Images: upload a ZIP named like <code className="text-[11px]">YAS-OIL-GROUNDNUT_hero.webp</code> — not an Excel media sheet.
                    Keep using{' '}
                    <Link to="/admin/products" className="font-medium text-wet-earth hover:underline">Products → Customer price list</Link>
                    {' '}and the{' '}
                    <a href="https://www.yasvik.com/shop" target="_blank" rel="noreferrer" className="font-medium text-wet-earth hover:underline">
                      live shop
                    </a>
                    {' '}for quick customer price checks.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={exportMut.isPending || productsQuery.isLoading || !productList.length}
                  onClick={() => exportMut.mutate()}
                  className="inline-flex items-center gap-2 rounded-xl bg-rain-cloud px-4 py-2.5 font-inter text-xs font-semibold text-white disabled:opacity-40"
                >
                  <Download className="h-4 w-4" />
                  {exportMut.isPending ? 'Building…' : 'Download YASVIK_CATALOGUE_SIMPLE.xlsx'}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-white p-5">
              <div className="mb-3 flex items-center gap-2">
                <History className="h-4 w-4 text-rain-cloud/45" />
                <h3 className="font-inter text-sm font-semibold text-rain-cloud">Recent exports</h3>
                <button
                  type="button"
                  className="ml-auto inline-flex items-center gap-1 font-inter text-[11px] text-rain-cloud/50"
                  onClick={() => {
                    productsQuery.refetch();
                    versionQuery.refetch();
                    exportsQuery.refetch();
                  }}
                >
                  <RefreshCw className="h-3 w-3" /> Refresh
                </button>
              </div>
              {exportsQuery.isError ? (
                <p className="font-inter text-xs text-rain-cloud/50">Export history available after migration.</p>
              ) : !(exportsQuery.data || []).length ? (
                <p className="font-inter text-xs text-rain-cloud/50">No exports logged yet.</p>
              ) : (
                <ul className="divide-y divide-border/60">
                  {(exportsQuery.data || []).map((row) => (
                    <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 font-inter text-xs text-rain-cloud/70">
                      <span>{row.filename}</span>
                      <span>v{row.catalogue_version_number} · {row.variant_count} packs</span>
                      <span>{row.exported_at ? new Date(row.exported_at).toLocaleString() : ''}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl border border-neon-paddy/25 bg-neon-paddy/5 px-4 py-3 font-inter text-xs text-deep-forest">
              <div className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-neon-paddy" />
                <div>
                  <p className="font-semibold">Phase 2 import is live</p>
                  <p className="mt-1 text-deep-forest/75">
                    Export → edit yellow cells → Import tab → validate → save draft → publish.
                    Rollback restores the pre-publish snapshot. Media ZIP is Phase 3.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {tab === 'import' || tab === 'history' ? (
          <CatalogueImportPanel
            products={productList}
            categories={categoryList}
            liveCatalogueVersion={versionQuery.data?.version_number ?? null}
            actorUserId={user?.id || null}
          />
        ) : null}
        {tab === 'media' ? (
          <CatalogueMediaPanel products={productList} />
        ) : null}
        {tab === 'batches' ? <ComingSoon phase={5} title="Batches" /> : null}
        {tab === 'labels' ? (
          <div className="rounded-2xl border border-border/60 bg-white px-6 py-8">
            <Layers className="mx-auto h-6 w-6 text-rain-cloud/35" />
            <p className="mt-3 text-center font-cormorant text-2xl font-semibold text-rain-cloud">Label Printing</p>
            <p className="mx-auto mt-2 max-w-md text-center font-inter text-sm text-rain-cloud/60">
              Batch-linked label queue lands in Phase 5. Until then use{' '}
              <Link to="/admin/labels" className="font-medium text-wet-earth hover:underline">Price Labels</Link>.
            </p>
          </div>
        ) : null}
        {tab === 'settings' ? <ComingSoon phase={4} title="Settings" /> : null}
      </div>
    </div>
  );
}
