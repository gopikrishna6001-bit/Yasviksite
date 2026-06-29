import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, LayoutTemplate, Loader2, Printer } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import LabelTemplatePreview from '@/components/admin/LabelTemplatePreview';
import TemplateA4SheetPreview from '@/components/admin/TemplateA4SheetPreview';
import {
  LabelBatchAddProductSection,
  LabelBatchPrintManifest,
  LabelBatchQueueSection,
} from '@/components/admin/LabelBatchProductSections';
import { useLabelBatchQueue } from '@/components/admin/useLabelBatchQueue';
import { useInlineProductEditor } from '@/components/admin/useInlineProductEditor';
import {
  buildPrintLinesLabelQueue,
  computeSheetStats,
  exportTemplateA4Pdf,
  openTemplateA4PdfForPrint,
  resolveTemplateGrid,
} from '@/lib/a4TemplateLabelExport';
import { getActiveLabelTemplate } from '@/lib/labelTemplate/templateStorage';
import { DEFAULT_GAP_MM, DEFAULT_MARGIN_MM, formatMfgDate } from '@/lib/priceLabelGenerator';
import { fetchAllAppSettings, SETTINGS_QUERY_KEYS } from '@/services/settingsService';

export default function A4EpsonPrintPanel({ onOpenTemplateBuilder }) {
  const { openProductEditor, productEditorDrawer } = useInlineProductEditor();
  const batch = useLabelBatchQueue();
  const [marginMm, setMarginMm] = useState(DEFAULT_MARGIN_MM);
  const [gapMm, setGapMm] = useState(DEFAULT_GAP_MM);
  const [exporting, setExporting] = useState('');

  const { data: settings = [] } = useQuery({
    queryKey: SETTINGS_QUERY_KEYS.all,
    queryFn: fetchAllAppSettings,
  });

  const activeTemplate = useMemo(() => getActiveLabelTemplate(settings), [settings]);

  const labelQueue = useMemo(
    () =>
      buildPrintLinesLabelQueue(batch.productsById, batch.printLines, {
        template: activeTemplate,
        packedDate: batch.packedDate,
        batchNumbers: batch.batchNumbers,
      }),
    [batch.productsById, batch.printLines, activeTemplate, batch.packedDate, batch.batchNumbers]
  );

  const grid = useMemo(
    () => resolveTemplateGrid(activeTemplate, { marginMm: Number(marginMm), gapMm: Number(gapMm) }),
    [activeTemplate, marginMm, gapMm]
  );

  const sheetGridOptions = useMemo(
    () => ({ marginMm: Number(marginMm), gapMm: Number(gapMm) }),
    [marginMm, gapMm]
  );

  const sheetStats = useMemo(
    () => computeSheetStats(labelQueue.length, grid.perPage),
    [labelQueue.length, grid.perPage]
  );

  const previewLabels = useMemo(
    () => labelQueue.slice(0, Math.min(labelQueue.length, grid.perPage)),
    [labelQueue, grid.perPage]
  );

  const previewFieldValues = previewLabels[0] || null;

  const runExport = async (type) => {
    if (labelQueue.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No labels to print',
        description: 'Add products and set pack + quantity.',
      });
      return;
    }
    setExporting(type);
    try {
      const stamp = formatMfgDate(batch.packedDate).replace(/\//g, '-');

      if (type === 'print') {
        await openTemplateA4PdfForPrint(labelQueue, activeTemplate, sheetGridOptions);
        toast({
          title: 'Print dialog opened',
          description: `${sheetStats.total} labels · ${sheetStats.pages} sheet(s).`,
        });
      } else if (type === 'pdf') {
        await exportTemplateA4Pdf(
          labelQueue,
          activeTemplate,
          sheetGridOptions,
          `yasvik-a4-labels-${stamp}.pdf`
        );
        toast({
          title: 'PDF downloaded',
          description: `${sheetStats.total} labels · ${sheetStats.pages} page(s).`,
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: type === 'print' ? 'Print failed' : 'Export failed',
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
          <section className="rounded-2xl border border-forest-canopy/25 bg-forest-canopy/5 p-5 shadow-sm">
            <h2 className="font-inter text-sm font-semibold text-rain-cloud">Epson L8050 · label batch</h2>
            <p className="mt-2 font-inter text-xs text-rain-cloud/55 leading-relaxed">
              Search products below. On each row pick <strong>pack</strong> and <strong>qty</strong>, then tap{' '}
              <strong>Add</strong>. Use the pencil to fix variants or prices without leaving this screen.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-white px-3 py-1 font-inter text-[11px] text-rain-cloud/70 border border-border/60">
                {activeTemplate.name}
              </span>
              {onOpenTemplateBuilder ? (
                <button
                  type="button"
                  onClick={onOpenTemplateBuilder}
                  className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 font-inter text-[11px] text-rain-cloud/70 hover:bg-white"
                >
                  <LayoutTemplate className="h-3 w-3" />
                  Edit template
                </button>
              ) : null}
            </div>
          </section>

          {sheetStats.total > 0 ? (
            <section className="rounded-2xl border border-warm-turmeric/30 bg-warm-turmeric/10 px-4 py-3">
              <p className="font-inter text-sm font-semibold text-rain-cloud">
                {sheetStats.total} labels → {sheetStats.pages} A4 sheet{sheetStats.pages === 1 ? '' : 's'}
              </p>
              <p className="font-inter text-xs text-rain-cloud/60 mt-0.5">
                {grid.perPage}/sheet
                {sheetStats.emptyOnLastPage > 0
                  ? ` · last sheet: ${sheetStats.usedOnLastPage} used, ${sheetStats.emptyOnLastPage} empty`
                  : ' · exact fit'}
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
          />
        </div>

        <div className="space-y-5">
          <LabelBatchPrintManifest
            printLines={batch.printLines}
            productsById={batch.productsById}
            onEditProduct={openProductEditor}
          />

          <section className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm">
            <h2 className="font-inter text-sm font-semibold text-rain-cloud">Preview</h2>
            {!previewFieldValues ? (
              <div className="mt-6 rounded-xl border border-dashed border-border/70 bg-rain-mist/30 px-4 py-12 text-center">
                <p className="font-inter text-sm text-rain-cloud/50">Add lines to preview</p>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <LabelTemplatePreview
                  template={activeTemplate}
                  fieldValues={previewFieldValues}
                  displayWidthPx={320}
                />
                <TemplateA4SheetPreview
                  labelQueue={previewLabels}
                  template={activeTemplate}
                  gridOptions={sheetGridOptions}
                  maxWidthPx={340}
                />
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm">
            <h2 className="font-inter text-sm font-semibold text-rain-cloud">Print on Epson</h2>
            <p className="font-inter text-xs text-rain-cloud/45 mt-1">A4 · 100% scale · High quality</p>
            <div className="mt-4 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => runExport('print')}
                disabled={Boolean(exporting) || labelQueue.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-wet-earth px-5 py-3 font-inter text-sm font-semibold text-white hover:bg-wet-earth/90 disabled:opacity-60"
              >
                {exporting === 'print' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                Print {sheetStats.pages || 0} sheet{sheetStats.pages === 1 ? '' : 's'}
              </button>
              <button
                type="button"
                onClick={() => runExport('pdf')}
                disabled={Boolean(exporting) || labelQueue.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-forest-canopy px-5 py-2.5 font-inter text-sm text-white hover:bg-forest-canopy/90 disabled:opacity-60"
              >
                {exporting === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Download PDF
              </button>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
