import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, LayoutTemplate, Loader2, Printer } from 'lucide-react';
import { appClient } from '@/api/appClient';
import { toast } from '@/components/ui/use-toast';
import LabelTemplatePreview from '@/components/admin/LabelTemplatePreview';
import {
  LabelBatchAddProductSection,
  LabelBatchPrintManifest,
  LabelBatchQueueSection,
} from '@/components/admin/LabelBatchProductSections';
import { useLabelBatchQueue } from '@/components/admin/useLabelBatchQueue';
import { useInlineProductEditor } from '@/components/admin/useInlineProductEditor';
import { buildPrintLinesLabelQueue } from '@/lib/a4TemplateLabelExport';
import { getActiveLabelTemplate } from '@/lib/labelTemplate/templateStorage';
import {
  exportSeznikRollJpeg,
  exportSeznikRollPdf,
  exportSeznikRollPng,
  getProductNameEn,
} from '@/lib/seznikLabelGenerator';
import { formatMfgDate } from '@/lib/priceLabelGenerator';
import { createSeznikPrintJob } from '@/services/labelPrintService';
import { fetchAllAppSettings, SETTINGS_QUERY_KEYS } from '@/services/settingsService';
import { buildVariantOptions } from '@/lib/labelProductOptions';

export default function SeznikPrintPanel({ onOpenTemplateBuilder }) {
  const { openProductEditor, productEditorDrawer } = useInlineProductEditor();
  const batch = useLabelBatchQueue();
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

  const previewFieldValues = labelQueue[0] || null;
  const totalLabels = labelQueue.length;

  const handleExport = async (format) => {
    if (labelQueue.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No labels to export',
        description: 'Add products and set pack + quantity.',
      });
      return;
    }

    setExporting(format);
    try {
      const stamp = formatMfgDate(batch.packedDate).replace(/\//g, '-');
      const firstProduct = batch.productsById[batch.printLines[0]?.productId];
      const slug = getProductNameEn(firstProduct || {})
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .slice(0, 40);
      const baseName = `yasvik-seznik-${slug || 'batch'}-${stamp}`;

      let queue = labelQueue;

      if (format === 'pdf' && batch.printLines.length === 1) {
        const line = batch.printLines[0];
        const product = batch.productsById[line.productId];
        const variant = buildVariantOptions(product)[line.variantIndex] || null;
        const batchNo = batch.batchNumbers[line.productId] || queue[0]?.batchNo;

        let userId = null;
        try {
          const me = await appClient.auth.me();
          userId = me?.id || null;
        } catch {
          userId = null;
        }

        const result = await createSeznikPrintJob({
          product,
          variant,
          quantity: line.quantity,
          packedDate: batch.packedDate,
          batchNo,
          generatedBy: userId,
          template: activeTemplate,
        });
        queue = result.labelQueue;
      }

      if (format === 'pdf') {
        await exportSeznikRollPdf(queue, activeTemplate, `${baseName}.pdf`);
      } else if (format === 'png') {
        await exportSeznikRollPng(queue, activeTemplate, `${baseName}.png`);
      } else if (format === 'jpeg') {
        await exportSeznikRollJpeg(queue, activeTemplate, `${baseName}.jpg`);
      }

      const formatLabel = format === 'jpeg' ? 'JPEG' : format.toUpperCase();
      toast({
        title: `${formatLabel} ready`,
        description: `${queue.length} label${queue.length === 1 ? '' : 's'} · ${activeTemplate.name}`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Export failed',
        description: error?.message || `Could not generate ${format.toUpperCase()} file.`,
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
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-inter text-sm font-semibold text-rain-cloud">Seznik roll print job</h2>
                <p className="mt-1 font-inter text-xs text-rain-cloud/45">
                  Same batch workflow as Epson — search <strong>250 besan</strong>, pick pack & qty, add lines.
                  Template: <strong>{activeTemplate.name}</strong>
                </p>
              </div>
              {onOpenTemplateBuilder ? (
                <button
                  type="button"
                  onClick={onOpenTemplateBuilder}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 font-inter text-xs text-rain-cloud/75 hover:bg-rain-mist"
                >
                  <LayoutTemplate className="h-3.5 w-3.5" />
                  Edit template
                </button>
              ) : null}
            </div>
          </section>

          {totalLabels > 0 ? (
            <section className="rounded-2xl border border-warm-turmeric/30 bg-warm-turmeric/10 px-4 py-3">
              <p className="font-inter text-sm font-semibold text-rain-cloud">
                {totalLabels} label{totalLabels === 1 ? '' : 's'} in roll file
              </p>
              <p className="font-inter text-xs text-rain-cloud/60 mt-0.5">
                {activeTemplate.widthMm} × {activeTemplate.heightMm} mm · 300 DPI
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
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-inter text-sm font-semibold text-rain-cloud">Label preview</h2>
                <p className="font-inter text-xs text-rain-cloud/45 mt-1">
                  {activeTemplate.widthMm} × {activeTemplate.heightMm} mm · template-driven
                </p>
              </div>
              <Printer className="h-4 w-4 text-rain-cloud/35" />
            </div>

            {!previewFieldValues ? (
              <div className="mt-6 rounded-xl border border-dashed border-border/70 bg-rain-mist/30 px-4 py-16 text-center">
                <p className="font-inter text-sm text-rain-cloud/50">Add products to preview</p>
              </div>
            ) : (
              <div className="mt-5 flex justify-center rounded-xl border border-border/50 bg-[#ececec] p-6">
                <LabelTemplatePreview
                  template={activeTemplate}
                  fieldValues={previewFieldValues}
                  displayWidthPx={360}
                />
              </div>
            )}

            {totalLabels > 0 ? (
              <div className="mt-4 rounded-xl bg-rain-mist/50 p-4 font-inter text-xs text-rain-cloud/70 space-y-1">
                <p>
                  <strong>{totalLabels}</strong> labels in this print file
                </p>
                <p>
                  Template: <strong>{activeTemplate.name}</strong>
                </p>
                {labelQueue[0]?.serialNo ? (
                  <p>
                    Serials: <strong>{labelQueue[0]?.serialNo}</strong> →{' '}
                    <strong>{labelQueue[labelQueue.length - 1]?.serialNo}</strong>
                  </p>
                ) : null}
                <p className="text-rain-cloud/45">JPEG/PDF/PNG at 300 DPI · print at 100% scale</p>
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border-2 border-forest-canopy/30 bg-forest-canopy/5 p-5 shadow-sm space-y-3">
            <h2 className="font-inter text-sm font-semibold text-rain-cloud">Download label file</h2>
            <p className="font-inter text-xs text-rain-cloud/55">
              {totalLabels > 0
                ? `${totalLabels} label${totalLabels === 1 ? '' : 's'} ready`
                : 'Add products to the queue first'}
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              {[
                { id: 'jpeg', label: 'JPEG' },
                { id: 'pdf', label: 'PDF' },
                { id: 'png', label: 'PNG' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleExport(id)}
                  disabled={!!exporting || totalLabels === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-forest-canopy px-3 py-3 font-inter text-sm font-medium text-white transition-colors hover:bg-forest-canopy/90 disabled:cursor-not-allowed disabled:bg-rain-cloud/20 disabled:text-rain-cloud/45"
                >
                  {exporting === id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {label}
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
