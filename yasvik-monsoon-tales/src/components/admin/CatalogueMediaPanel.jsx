import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, ImagePlus, Loader2, Upload } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import {
  applyCatalogueMediaMatches,
  processCatalogueMediaZipFile,
} from '@/lib/pim/catalogueMediaZip';
import { invalidatePublicProductQueries } from '@/lib/productQueryInvalidation';

export default function CatalogueMediaPanel({ products = [] }) {
  const qc = useQueryClient();
  const inputRef = useRef(null);
  const [busy, setBusy] = useState('');
  const [preview, setPreview] = useState(null);
  const [progress, setProgress] = useState(null);
  const [lastResults, setLastResults] = useState(null);

  const onPick = async (file) => {
    if (!file) return;
    setBusy('parse');
    setLastResults(null);
    try {
      const report = await processCatalogueMediaZipFile(file, products);
      setPreview(report);
      toast({
        title: 'ZIP scanned',
        description: `${report.matched.length} matched · ${report.unmatched.length} unmatched · ${report.warnings.length} naming warnings`,
      });
    } catch (err) {
      setPreview(null);
      toast({ variant: 'destructive', title: 'ZIP failed', description: err?.message || 'Could not read ZIP' });
    } finally {
      setBusy('');
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const onApply = async () => {
    if (!preview?.byProduct?.length) return;
    if (!window.confirm(`Upload and apply images for ${preview.byProduct.length} product(s)? Existing images not in the ZIP are kept.`)) {
      return;
    }
    setBusy('apply');
    setProgress({ index: 0, total: preview.byProduct.length });
    try {
      const results = await applyCatalogueMediaMatches(preview.byProduct, {
        onProgress: setProgress,
      });
      setLastResults(results);
      await invalidatePublicProductQueries(qc);
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      toast({
        title: 'Images applied',
        description: `${results.length} product(s) updated on R2 / storefront`,
      });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Apply failed', description: err?.message || 'Upload failed' });
    } finally {
      setBusy('');
      setProgress(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/60 bg-white p-5">
        <h2 className="font-cormorant text-xl font-semibold text-rain-cloud">Media ZIP</h2>
        <p className="mt-2 font-inter text-sm leading-relaxed text-rain-cloud/65">
          No Excel media sheet. Name files with Product Code, zip them, upload here.
        </p>
        <ul className="mt-3 space-y-1 font-inter text-xs text-rain-cloud/60">
          <li><code className="text-[11px]">YAS-OIL-GROUNDNUT_hero.webp</code> → hero</li>
          <li><code className="text-[11px]">YAS-OIL-GROUNDNUT_2.webp</code> → gallery 2</li>
          <li><code className="text-[11px]">YAS-OIL-GROUNDNUT_3.webp</code> → gallery 3</li>
          <li>Missing file = keep existing image. Never deletes by omission.</li>
        </ul>

        <div className="mt-4 flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            onChange={(e) => onPick(e.target.files?.[0])}
          />
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl bg-rain-cloud px-4 py-2.5 font-inter text-xs font-semibold text-white disabled:opacity-40"
          >
            {busy === 'parse' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Scan ZIP
          </button>
          <button
            type="button"
            disabled={!preview?.byProduct?.length || Boolean(busy)}
            onClick={onApply}
            className="inline-flex items-center gap-2 rounded-xl bg-wet-earth px-4 py-2.5 font-inter text-xs font-semibold text-white disabled:opacity-40"
          >
            {busy === 'apply' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            Upload & apply matched
          </button>
        </div>

        {progress ? (
          <p className="mt-3 font-inter text-xs text-rain-cloud/60">
            Uploading {progress.index}/{progress.total}
            {progress.productCode ? ` · ${progress.productCode}` : ''}
          </p>
        ) : null}
      </div>

      {preview ? (
        <div className="rounded-2xl border border-border/60 bg-white p-5">
          <div className="flex flex-wrap gap-2 font-inter text-xs">
            <span className="rounded-full bg-rain-mist px-3 py-1">{preview.matched.length} files matched</span>
            <span className="rounded-full bg-rain-mist px-3 py-1">{preview.byProduct.length} products</span>
            <span className={`rounded-full px-3 py-1 ${preview.unmatched.length ? 'bg-amber-100 text-amber-900' : 'bg-neon-paddy/15 text-deep-forest'}`}>
              {preview.unmatched.length} unmatched
            </span>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-900">{preview.warnings.length} naming warnings</span>
          </div>

          {preview.errors?.length ? (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 font-inter text-xs text-red-800">
              {preview.errors.map((e, i) => <p key={i}>{e.message}</p>)}
            </div>
          ) : null}

          <div className="mt-4 max-h-72 overflow-auto rounded-xl border border-border/60">
            <table className="min-w-full font-inter text-xs">
              <thead className="sticky top-0 bg-rain-mist/80 text-left text-rain-cloud/55">
                <tr>
                  <th className="px-3 py-2">Product Code</th>
                  <th className="px-3 py-2">Hero</th>
                  <th className="px-3 py-2">Gallery</th>
                  <th className="px-3 py-2">Product</th>
                </tr>
              </thead>
              <tbody>
                {preview.byProduct.map((g) => (
                  <tr key={g.product.id} className="border-t border-border/50">
                    <td className="px-3 py-2 font-semibold text-rain-cloud">{g.productCode}</td>
                    <td className="px-3 py-2">{g.hero ? g.hero.filename : '— keep'}</td>
                    <td className="px-3 py-2">{g.gallery.length ? g.gallery.map((x) => x.filename).join(', ') : '— keep'}</td>
                    <td className="px-3 py-2 text-rain-cloud/65">{g.product.title || g.product.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {preview.unmatched.length ? (
            <div className="mt-3 max-h-32 overflow-auto rounded-xl border border-amber-200 bg-amber-50 p-3 font-inter text-xs text-amber-950">
              <p className="mb-1 flex items-center gap-1 font-semibold"><AlertTriangle className="h-3.5 w-3.5" /> Unmatched files</p>
              {preview.unmatched.slice(0, 40).map((u, i) => (
                <p key={i}>{u.filename}: {u.reason}</p>
              ))}
            </div>
          ) : null}

          {preview.warnings.length ? (
            <div className="mt-3 max-h-28 overflow-auto font-inter text-[11px] text-rain-cloud/55">
              {preview.warnings.slice(0, 30).map((w, i) => <p key={i}>{w.message}</p>)}
            </div>
          ) : null}
        </div>
      ) : null}

      {lastResults?.length ? (
        <div className="rounded-2xl border border-neon-paddy/25 bg-neon-paddy/5 px-4 py-3 font-inter text-xs text-deep-forest">
          <p className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="h-4 w-4 text-neon-paddy" />
            Applied {lastResults.length} product(s)
          </p>
          <ul className="mt-2 space-y-1 text-deep-forest/75">
            {lastResults.slice(0, 20).map((r) => (
              <li key={r.product_id}>
                {r.product_code}: {r.uploads.map((u) => u.role).join(', ') || 'no change'}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
