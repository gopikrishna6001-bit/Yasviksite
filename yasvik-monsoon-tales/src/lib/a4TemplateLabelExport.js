import { jsPDF } from 'jspdf';
import { createDefaultGroceryTemplate } from '@/lib/labelTemplate/defaultTemplates';
import {
  createLabelTemplateCanvas,
  ensureLabelTemplateFontsLoaded,
} from '@/lib/labelTemplate/renderLabelTemplate';
import {
  A4_HEIGHT_MM,
  A4_WIDTH_MM,
  computeA4Grid,
  generateBatchNo,
  getLabelPosition,
  LABEL_HEIGHT_MM,
  LABEL_WIDTH_MM,
  mmToPx,
} from '@/lib/priceLabelGenerator';
import { buildVariantOptions } from '@/lib/labelProductOptions';
import { buildSeznikLabelQueue } from '@/lib/seznikLabelGenerator';

export const A4_TEMPLATE_DPI = 300;
export const A4_PREVIEW_DPI = 180;

/**
 * Print line: one product variant with a label count.
 * @typedef {{ productId: string, variantIndex: number, quantity: number }} LabelPrintLine
 */

export function buildPrintLinesLabelQueue(
  productsById,
  printLines = [],
  { template, packedDate, batchNumbers = {} } = {}
) {
  const safeTemplate = template || createDefaultGroceryTemplate();
  const queue = [];
  let batchSeq = 0;

  printLines.forEach((line) => {
    const qty = Math.max(0, Number(line.quantity) || 0);
    if (!qty) return;

    const product = productsById[line.productId];
    if (!product) return;

    const variants = buildVariantOptions(product);
    const variant = variants[line.variantIndex] || variants[0] || null;
    const batchNo =
      line.batchNo ||
      batchNumbers[line.productId] ||
      generateBatchNo(packedDate, (batchSeq += 1));

    queue.push(
      ...buildSeznikLabelQueue(product, variant, { packedDate, batchNo, quantity: qty }, safeTemplate)
    );
  });

  return queue;
}

export function computeSheetStats(labelCount, perPage) {
  const total = Math.max(0, Number(labelCount) || 0);
  const slots = Math.max(1, Number(perPage) || 1);
  if (!total) {
    return { total: 0, pages: 0, usedOnLastPage: 0, emptyOnLastPage: 0, fullPages: 0 };
  }
  const pages = Math.ceil(total / slots);
  const usedOnLastPage = total % slots || slots;
  const emptyOnLastPage = pages * slots - total;
  return {
    total,
    pages,
    usedOnLastPage,
    emptyOnLastPage,
    fullPages: emptyOnLastPage > 0 ? pages - 1 : pages,
  };
}

/** @deprecated Use buildPrintLinesLabelQueue for multi-variant batches */
export function buildBatchTemplateLabelQueue(
  selectedProducts = [],
  { template, packedDate, quantities = {}, batchNumbers = {}, variants = {} } = {}
) {
  const safeTemplate = template || createDefaultGroceryTemplate();
  const queue = [];

  selectedProducts.forEach((product, index) => {
    const variant = variants[product.id] || null;
    const qty = Math.max(1, Number(quantities[product.id]) || 1);
    const batchNo = batchNumbers[product.id] || generateBatchNo(packedDate, index + 1);
    queue.push(
      ...buildSeznikLabelQueue(product, variant, { packedDate, batchNo, quantity: qty }, safeTemplate)
    );
  });

  return queue;
}

export function resolveTemplateGrid(template, gridOptions = {}) {
  const safeTemplate = template || createDefaultGroceryTemplate();
  return computeA4Grid({
    labelWidthMm: safeTemplate.widthMm || LABEL_WIDTH_MM,
    labelHeightMm: safeTemplate.heightMm || LABEL_HEIGHT_MM,
    ...gridOptions,
  });
}

async function renderTemplateLabelCanvases(labelQueue, template, dpi = A4_TEMPLATE_DPI) {
  await ensureLabelTemplateFontsLoaded();
  const safeTemplate = template || createDefaultGroceryTemplate();
  const canvases = [];
  for (const fieldValues of labelQueue) {
    canvases.push(await createLabelTemplateCanvas(safeTemplate, fieldValues, dpi));
  }
  return canvases;
}

export async function createTemplateA4SheetCanvas(
  labelQueue,
  template,
  gridOptions = {},
  dpi = A4_PREVIEW_DPI
) {
  const safeTemplate = template || createDefaultGroceryTemplate();
  const grid = resolveTemplateGrid(safeTemplate, gridOptions);
  const pageCount = Math.max(1, Math.ceil(labelQueue.length / grid.perPage));
  const pageWidthPx = mmToPx(A4_WIDTH_MM, dpi);
  const pageHeightPx = mmToPx(A4_HEIGHT_MM, dpi);
  const labelWidthPx = mmToPx(grid.labelWidthMm, dpi);
  const labelHeightPx = mmToPx(grid.labelHeightMm, dpi);

  const canvas = document.createElement('canvas');
  canvas.width = pageWidthPx;
  canvas.height = pageHeightPx * pageCount;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < labelQueue.length; i += 1) {
    const { x, y, pageOffset } = getLabelPosition(i, grid);
    const labelCanvas = await createLabelTemplateCanvas(safeTemplate, labelQueue[i], dpi);
    const destX = mmToPx(x, dpi);
    const destY = pageOffset * pageHeightPx + mmToPx(y, dpi);
    ctx.drawImage(labelCanvas, destX, destY, labelWidthPx, labelHeightPx);
  }

  return { canvas, grid, pageCount };
}

async function buildTemplateA4Pdf(labelQueue, template, gridOptions = {}) {
  const safeTemplate = template || createDefaultGroceryTemplate();
  const widthMm = safeTemplate.widthMm || LABEL_WIDTH_MM;
  const heightMm = safeTemplate.heightMm || LABEL_HEIGHT_MM;
  const grid = resolveTemplateGrid(safeTemplate, gridOptions);
  const canvases = await renderTemplateLabelCanvases(labelQueue, safeTemplate, A4_TEMPLATE_DPI);

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });

  canvases.forEach((canvas, index) => {
    const { x, y, pageOffset } = getLabelPosition(index, grid);
    if (pageOffset > 0 && index % grid.perPage === 0) {
      pdf.addPage();
    }
    pdf.addImage(
      canvas.toDataURL('image/png'),
      'PNG',
      x,
      y,
      widthMm,
      heightMm,
      undefined,
      'SLOW'
    );
  });

  return pdf;
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function exportTemplateA4Pdf(
  labelQueue,
  template,
  gridOptions = {},
  fileName = 'yasvik-a4-labels.pdf'
) {
  const pdf = await buildTemplateA4Pdf(labelQueue, template, gridOptions);
  pdf.save(fileName);
}

export async function exportTemplateA4PngSheet(
  labelQueue,
  template,
  gridOptions = {},
  fileName = 'yasvik-a4-labels.png'
) {
  const { canvas } = await createTemplateA4SheetCanvas(labelQueue, template, gridOptions, A4_TEMPLATE_DPI);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  downloadBlob(blob, fileName);
}

export async function openTemplateA4PdfForPrint(labelQueue, template, gridOptions = {}) {
  const pdf = await buildTemplateA4Pdf(labelQueue, template, gridOptions);
  const blob = pdf.output('blob');
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank', 'noopener,noreferrer');
  if (!printWindow) {
    URL.revokeObjectURL(url);
    throw new Error('Pop-up blocked. Allow pop-ups to print, or download the PDF instead.');
  }
  printWindow.addEventListener('load', () => {
    printWindow.focus();
    try {
      printWindow.print();
    } catch {
      /* user can print manually from PDF viewer */
    }
  });
  setTimeout(() => URL.revokeObjectURL(url), 120_000);
}
