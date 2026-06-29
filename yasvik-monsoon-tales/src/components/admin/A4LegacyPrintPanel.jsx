import { useMemo, useState } from 'react';
import { Download, Loader2, Printer } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import PriceLabelPreview from '@/components/admin/PriceLabelPreview';
import PriceLabelSheetPreview from '@/components/admin/PriceLabelSheetPreview';
import {
  LabelBatchAddProductSection,
  LabelBatchPrintManifest,
  LabelBatchQueueSection,
} from '@/components/admin/LabelBatchProductSections';
import { useLabelBatchQueue } from '@/components/admin/useLabelBatchQueue';
import { useInlineProductEditor } from '@/components/admin/useInlineProductEditor';
import {
  buildLabelQueue,
  buildLegacyRowsFromPrintLines,
  computeA4Grid,
  DEFAULT_GAP_MM,
  DEFAULT_MARGIN_MM,
  exportLabelsPdf,
  exportLabelsPngSheet,
  exportSingleLabelPng,
  formatMfgDate,
  slugifyFileName,
} from '@/lib/priceLabelGenerator';

export default function A4LegacyPrintPanel() {
  const { openProductEditor, productEditorDrawer } = useInlineProductEditor();
  const batch = useLabelBatchQueue();
  const [marginMm, setMarginMm] = useState(DEFAULT_MARGIN_MM);
  const [gapMm, setGapMm] = useState(DEFAULT_GAP_MM);
  const [exporting, setExporting] = useState('');

  const selectedRows = useMemo(
    () =>
      buildLegacyRowsFromPrintLines(batch.printLines, batch.productsById, {
        mfgDate: batch.packedDate,
        batchNumbers: batch.batchNumbers,
      }),
    [batch.printLines, batch.productsById, batch.packedDate, batch.batchNumbers]
  );

  const labelQueue = useMemo(() => buildLabelQueue(selectedRows), [selectedRows]);

  const grid = useMemo(
    () => computeA4Grid({ marginMm: Number(marginMm), gapMm: Number(gapMm) }),
    [marginMm, gapMm]
  );

  const previewLabels = useMemo(
    () => labelQueue.slice(0, Math.min(labelQueue.length, grid.perPage)),
    [labelQueue, grid.perPage]
  );

  const sheetGridOptions = useMemo(
    () => ({ marginMm: Number(marginMm), gapMm: Number(gapMm) }),
    [marginMm, gapMm]
  );

  const runExport = async (type) => {
    if (labelQueue.length === 0) {
      toast({ variant: 'destructive', title: 'Add at least one product' });
      return;
    }
    setExporting(type);
    try {
      const gridOptions = { marginMm: Number(marginMm), gapMm: Number(gapMm) };
      const stamp = formatMfgDate(batch.packedDate).replace(/\//g, '-');

      if (type === 'pdf') {
        await exportLabelsPdf(labelQueue, gridOptions, `yasvik-labels-${stamp}.pdf`);
      } else if (type === 'png-sheet') {
        await exportLabelsPngSheet(labelQueue, gridOptions, `yasvik-labels-${stamp}-a4.png`);
      } else if (type === 'png-single' && selectedRows[0]) {
        const slug = slugifyFileName(selectedRows[0].labelData.productName);
        await exportSingleLabelPng(selectedRows[0].labelData, `yasvik-label-${slug}.png`);
      }
      toast({ title: 'Download started', description: 'Your label file is ready.' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Export failed',
        description: error?.message || 'Could not generate labels.',
      });
    } finally {
      setExporting('');
    }
  };

  return (
    <>
      {productEditorDrawer}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm">
            <h2 className="font-inter text-sm font-semibold text-rain-cloud">A4 legacy (no QR)</h2>
            <p className="mt-2 font-inter text-xs text-rain-cloud/55 leading-relaxed">
              Classic 50×25 mm stickers without POS QR. Same search, pack picker, and pencil edit as Epson/Seznik.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="font-inter text-xs text-rain-cloud/55">Sheet margin (mm)</span>
                <input
                  type="number"
                  min="0"
                  max="20"
                  step="0.5"
                  value={marginMm}
                  onChange={(e) => setMarginMm(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border px-3 py-2 font-inter text-sm text-rain-cloud focus:border-forest-canopy focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="font-inter text-xs text-rain-cloud/55">Label gap (mm)</span>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.5"
                  value={gapMm}
                  onChange={(e) => setGapMm(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border px-3 py-2 font-inter text-sm text-rain-cloud focus:border-forest-canopy focus:outline-none"
                />
              </label>
            </div>
            <p className="mt-3 font-inter text-xs text-rain-cloud/45">
              A4 grid: {grid.cols} × {grid.rows} = {grid.perPage} labels per page
            </p>
          </section>

          {labelQueue.length > 0 ? (
            <section className="rounded-2xl border border-warm-turmeric/30 bg-warm-turmeric/10 px-4 py-3">
              <p className="font-inter text-sm font-semibold text-rain-cloud">
                {labelQueue.length} labels queued
              </p>
            </section>
          ) : null}

          <LabelBatchAddProductSection
            search={batch.search}
            onSearchChange={batch.handleSearchChange}
            onSearchEnter={batch.addFirstSearchResult}
            isLoading={batch.isLoading}
            searchResults={batch.searchResults}
            getPickerDraft={batch.getPickerDraft}
            updatePickerDraft={batch.updatePickerDraft}
            addProductRow={batch.addProductRow}
            onEditProduct={openProductEditor}
          />

          <LabelBatchQueueSection
            queueRows={batch.queueRows}
            productsById={batch.productsById}
            activeRowCount={batch.activeRowCount}
            packedDate={batch.packedDate}
            onPackedDateChange={batch.setPackedDate}
            onRegenerateBatchNumbers={batch.regenerateBatchNumbers}
            updateRow={batch.updateRow}
            removeRow={batch.removeRow}
            duplicateRow={batch.duplicateRow}
            onEditProduct={openProductEditor}
            packedDateLabel="Mfg date"
          />
        </div>

        <div className="space-y-5">
          <LabelBatchPrintManifest
            printLines={batch.printLines}
            productsById={batch.productsById}
            onEditProduct={openProductEditor}
          />

          <section className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-inter text-sm font-semibold text-rain-cloud">Preview</h2>
                <p className="font-inter text-xs text-rain-cloud/45 mt-1">
                  {labelQueue.length} label{labelQueue.length === 1 ? '' : 's'} queued
                </p>
              </div>
              <Printer className="h-4 w-4 text-rain-cloud/35" />
            </div>

            {previewLabels.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-border/70 bg-rain-mist/30 px-4 py-16 text-center">
                <p className="font-inter text-sm text-rain-cloud/50">Add products to preview stickers</p>
              </div>
            ) : (
              <div className="mt-5 space-y-5">
                <div className="rounded-xl border border-border/50 bg-[#f3f3f3] p-4">
                  <p className="mb-3 font-inter text-[11px] uppercase tracking-[0.14em] text-rain-cloud/45">
                    Single label (50 × 25 mm)
                  </p>
                  <div className="flex justify-center">
                    <PriceLabelPreview labelData={previewLabels[0]} displayWidthPx={320} />
                  </div>
                </div>

                <div className="rounded-xl border border-border/50 bg-[#f3f3f3] p-4">
                  <p className="mb-3 font-inter text-[11px] uppercase tracking-[0.14em] text-rain-cloud/45">
                    A4 sheet layout
                  </p>
                  <PriceLabelSheetPreview
                    labelQueue={previewLabels}
                    gridOptions={sheetGridOptions}
                    maxWidthPx={340}
                  />
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm">
            <h2 className="font-inter text-sm font-semibold text-rain-cloud">Download</h2>
            <p className="font-inter text-xs text-rain-cloud/45 mt-1">
              PDF and PNG exports keep exact 50 × 25 mm label dimensions on A4.
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => runExport('pdf')}
                disabled={Boolean(exporting) || labelQueue.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-forest-canopy px-5 py-2.5 font-inter text-sm text-white hover:bg-forest-canopy/90 disabled:opacity-60"
              >
                {exporting === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Download A4 PDF
              </button>
              <button
                type="button"
                onClick={() => runExport('png-sheet')}
                disabled={Boolean(exporting) || labelQueue.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-5 py-2.5 font-inter text-sm text-rain-cloud hover:bg-rain-mist disabled:opacity-60"
              >
                {exporting === 'png-sheet' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Download A4 PNG
              </button>
              <button
                type="button"
                onClick={() => runExport('png-single')}
                disabled={Boolean(exporting) || selectedRows.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-5 py-2.5 font-inter text-sm text-rain-cloud hover:bg-rain-mist disabled:opacity-60"
              >
                {exporting === 'png-single' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Download single label PNG
              </button>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
