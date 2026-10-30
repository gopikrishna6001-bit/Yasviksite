import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, FileUp, Loader2, RotateCcw, Upload } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { parseCatalogueSimpleWorkbook } from '@/lib/pim/catalogueSimpleParse';
import { validateAndDiffCatalogueSimple } from '@/lib/pim/catalogueSimpleValidateDiff';
import {
  getCatalogueImportRun,
  listCatalogueImportRuns,
  publishCatalogueImportRun,
  rollbackCatalogueImportRun,
  saveCatalogueImportDraft,
} from '@/lib/pim/catalogueSimplePublish';
import { invalidatePublicProductQueries } from '@/lib/productQueryInvalidation';

const MODES = [
  ['UPDATE_EXISTING', 'Update existing only (safest)'],
  ['ADD_AND_UPDATE', 'Add new + update existing'],
];

export default function CatalogueImportPanel({
  products = [],
  categories = [],
  liveCatalogueVersion = null,
  actorUserId = null,
}) {
  const qc = useQueryClient();
  const inputRef = useRef(null);
  const [mode, setMode] = useState('UPDATE_EXISTING');
  const [acknowledgeStale, setAcknowledgeStale] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [validation, setValidation] = useState(null);
  const [draftRun, setDraftRun] = useState(null);
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState('');

  const historyQuery = useQuery({
    queryKey: ['catalogue-import-runs'],
    queryFn: () => listCatalogueImportRuns(15),
    retry: false,
  });

  const filteredChanges = useMemo(() => {
    const list = validation?.changes || [];
    if (filter === 'all') return list;
    if (filter === 'product') return list.filter((c) => c.entity_type === 'product');
    if (filter === 'pack') return list.filter((c) => c.entity_type === 'pack');
    if (filter === 'price_up') return list.filter((c) => c.message === 'price increase');
    if (filter === 'price_down') return list.filter((c) => c.message === 'price reduction');
    if (filter === 'add') return list.filter((c) => c.change_type === 'add');
    return list;
  }, [validation, filter]);

  const onFile = async (file) => {
    if (!file) return;
    setBusy('parse');
    setDraftRun(null);
    try {
      const next = await parseCatalogueSimpleWorkbook(file);
      const report = validateAndDiffCatalogueSimple({
        parsed: next,
        products,
        categories,
        liveCatalogueVersion,
        importMode: mode,
      });
      setParsed(next);
      setValidation(report);
      toast({
        title: report.ok ? 'Workbook validated' : 'Validation found errors',
        description: `${report.summary.change_count ?? report.changes.length} changes · ${report.errors.length} errors · ${report.warnings.length} warnings`,
      });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Parse failed', description: err?.message || 'Could not read workbook' });
      setParsed(null);
      setValidation(null);
    } finally {
      setBusy('');
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const saveDraftMut = useMutation({
    mutationFn: async () => saveCatalogueImportDraft({
      parsed,
      validation,
      importMode: mode,
      actorUserId,
      acknowledgeStale,
      liveCatalogueVersion,
    }),
    onSuccess: (run) => {
      setDraftRun(run);
      qc.invalidateQueries({ queryKey: ['catalogue-import-runs'] });
      toast({ title: 'Draft saved', description: 'Review changes, then Publish. Nothing live yet.' });
    },
    onError: (err) => toast({ variant: 'destructive', title: 'Draft failed', description: err?.message }),
  });

  const publishMut = useMutation({
    mutationFn: async (importId) => publishCatalogueImportRun({
      importId,
      products,
      actorUserId,
    }),
    onSuccess: async (result) => {
      await invalidatePublicProductQueries(qc);
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      qc.invalidateQueries({ queryKey: ['catalogue-version-latest'] });
      qc.invalidateQueries({ queryKey: ['catalogue-import-runs'] });
      setDraftRun(result.run);
      toast({
        title: 'Catalogue published',
        description: `${result.published} updates applied · catalogue v${result.version?.version_number}`,
      });
    },
    onError: (err) => toast({ variant: 'destructive', title: 'Publish failed', description: err?.message }),
  });

  const rollbackMut = useMutation({
    mutationFn: async (importId) => rollbackCatalogueImportRun({ importId, actorUserId }),
    onSuccess: async (result) => {
      await invalidatePublicProductQueries(qc);
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      qc.invalidateQueries({ queryKey: ['catalogue-version-latest'] });
      qc.invalidateQueries({ queryKey: ['catalogue-import-runs'] });
      toast({
        title: 'Import rolled back',
        description: `Restored ${result.restored} products · orders untouched`,
      });
    },
    onError: (err) => toast({ variant: 'destructive', title: 'Rollback failed', description: err?.message }),
  });

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/60 bg-white p-5">
        <h2 className="font-cormorant text-xl font-semibold text-rain-cloud">Import simple workbook</h2>
        <p className="mt-2 font-inter text-sm text-rain-cloud/65">
          Upload does <strong>not</strong> publish. Flow: validate → save draft → publish → optional rollback.
          Use Product Code + SKU only — no UUID editing.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          {MODES.map(([id, label]) => (
            <label key={id} className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 font-inter text-xs text-rain-cloud">
              <input type="radio" checked={mode === id} onChange={() => setMode(id)} />
              {label}
            </label>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl bg-rain-cloud px-4 py-2.5 font-inter text-xs font-semibold text-white disabled:opacity-40"
          >
            {busy === 'parse' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload & validate
          </button>
          <button
            type="button"
            disabled={!validation?.ok || saveDraftMut.isPending}
            onClick={() => saveDraftMut.mutate()}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 font-inter text-xs font-semibold text-rain-cloud disabled:opacity-40"
          >
            <FileUp className="h-4 w-4" />
            Save draft
          </button>
          <button
            type="button"
            disabled={!draftRun?.id || draftRun.status === 'published' || publishMut.isPending}
            onClick={() => {
              if (!window.confirm('Publish this catalogue draft to the live store?')) return;
              publishMut.mutate(draftRun.id);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-wet-earth px-4 py-2.5 font-inter text-xs font-semibold text-white disabled:opacity-40"
          >
            {publishMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Publish approved draft
          </button>
        </div>

        {validation?.summary?.stale_workbook ? (
          <label className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 font-inter text-xs text-amber-950">
            <input type="checkbox" checked={acknowledgeStale} onChange={(e) => setAcknowledgeStale(e.target.checked)} className="mt-0.5" />
            <span>
              Workbook is older than the live catalogue version. Re-download is safer.
              Check this box only if you reviewed conflicts and still want to save a draft.
            </span>
          </label>
        ) : null}
      </div>

      {validation ? (
        <div className="rounded-2xl border border-border/60 bg-white p-5">
          <div className="flex flex-wrap gap-3 font-inter text-xs">
            <span className="rounded-full bg-rain-mist px-3 py-1">{validation.summary.products_updated} products updated</span>
            <span className="rounded-full bg-rain-mist px-3 py-1">{validation.summary.products_added} products added</span>
            <span className="rounded-full bg-rain-mist px-3 py-1">{validation.summary.packs_updated} packs updated</span>
            <span className="rounded-full bg-rain-mist px-3 py-1">{validation.summary.packs_added} packs added</span>
            <span className="rounded-full bg-rain-mist px-3 py-1">{validation.summary.price_increases} price ↑</span>
            <span className="rounded-full bg-rain-mist px-3 py-1">{validation.summary.price_reductions} price ↓</span>
            <span className={`rounded-full px-3 py-1 ${validation.errors.length ? 'bg-red-100 text-red-800' : 'bg-neon-paddy/15 text-deep-forest'}`}>
              {validation.errors.length} errors
            </span>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900">{validation.warnings.length} warnings</span>
          </div>

          {validation.errors.length ? (
            <div className="mt-4 max-h-40 overflow-auto rounded-xl border border-red-200 bg-red-50 p-3 font-inter text-xs text-red-800">
              {validation.errors.slice(0, 40).map((e, i) => (
                <p key={i}>Row {e.row || '—'} · {e.product_code || e.sku || e.entity}: {e.message}</p>
              ))}
            </div>
          ) : null}

          {validation.warnings.length ? (
            <div className="mt-3 max-h-32 overflow-auto rounded-xl border border-amber-200 bg-amber-50 p-3 font-inter text-xs text-amber-950">
              {validation.warnings.slice(0, 30).map((w, i) => (
                <p key={i}>{w.sku || w.product_code || w.code || 'warn'}: {w.message}</p>
              ))}
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            {[
              ['all', 'All changes'],
              ['product', 'Products'],
              ['pack', 'Packs'],
              ['price_up', 'Price ↑'],
              ['price_down', 'Price ↓'],
              ['add', 'Adds'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={`rounded-full px-3 py-1 font-inter text-[11px] font-semibold ${
                  filter === id ? 'bg-rain-cloud text-white' : 'border border-border text-rain-cloud/70'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-3 max-h-80 overflow-auto rounded-xl border border-border/60">
            <table className="min-w-full font-inter text-xs">
              <thead className="sticky top-0 bg-rain-mist/80 text-left text-rain-cloud/60">
                <tr>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Key</th>
                  <th className="px-3 py-2">Change</th>
                  <th className="px-3 py-2">Fields</th>
                </tr>
              </thead>
              <tbody>
                {filteredChanges.slice(0, 200).map((c, i) => (
                  <tr key={`${c.entity_key}-${i}`} className="border-t border-border/50">
                    <td className="px-3 py-2">{c.entity_type}</td>
                    <td className="px-3 py-2">{c.sku || c.product_code}</td>
                    <td className="px-3 py-2">{c.change_type} · {c.message}</td>
                    <td className="px-3 py-2 text-rain-cloud/70">
                      {(c.field_diffs || []).slice(0, 4).map((d) => `${d.field}: ${d.before ?? '—'} → ${d.after ?? '—'}`).join(' · ')}
                    </td>
                  </tr>
                ))}
                {!filteredChanges.length ? (
                  <tr><td colSpan={4} className="px-3 py-6 text-center text-rain-cloud/45">No changes in this filter</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-border/60 bg-white p-5">
        <div className="mb-3 flex items-center gap-2">
          <h3 className="font-inter text-sm font-semibold text-rain-cloud">Import history</h3>
          <button type="button" className="ml-auto font-inter text-[11px] text-rain-cloud/50" onClick={() => historyQuery.refetch()}>
            Refresh
          </button>
        </div>
        {historyQuery.isError ? (
          <p className="font-inter text-xs text-rain-cloud/50">History unavailable — confirm Phase 2 migration is applied.</p>
        ) : !(historyQuery.data || []).length ? (
          <p className="font-inter text-xs text-rain-cloud/50">No imports yet.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {(historyQuery.data || []).map((row) => (
              <li key={row.id} className="flex flex-wrap items-center gap-2 py-2.5 font-inter text-xs text-rain-cloud/75">
                <span className="font-semibold text-rain-cloud">{row.status}</span>
                <span>{row.workbook_filename}</span>
                <span>{row.change_count} changes</span>
                <span>{row.error_count} err / {row.warning_count} warn</span>
                <span className="text-rain-cloud/45">{row.imported_at ? new Date(row.imported_at).toLocaleString() : ''}</span>
                {row.status === 'published' ? (
                  <button
                    type="button"
                    disabled={rollbackMut.isPending}
                    onClick={async () => {
                      if (!window.confirm('Roll back this publish? Orders stay unchanged.')) return;
                      rollbackMut.mutate(row.id);
                    }}
                    className="ml-auto inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 font-semibold text-rain-cloud"
                  >
                    <RotateCcw className="h-3 w-3" /> Rollback
                  </button>
                ) : null}
                {row.status === 'draft' ? (
                  <button
                    type="button"
                    disabled={publishMut.isPending}
                    onClick={async () => {
                      const full = await getCatalogueImportRun(row.id);
                      setDraftRun(full);
                      if (!window.confirm('Publish this saved draft?')) return;
                      publishMut.mutate(row.id);
                    }}
                    className="ml-auto inline-flex items-center gap-1 rounded-full bg-wet-earth px-2.5 py-1 font-semibold text-white"
                  >
                    Publish
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 flex gap-2 font-inter text-[11px] text-rain-cloud/50">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Rollback restores product/pack fields from the pre-publish snapshot. Orders, payments, loyalty and reviews are never reversed.
        </p>
      </div>
    </div>
  );
}
