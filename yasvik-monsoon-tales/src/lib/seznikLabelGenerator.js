import { jsPDF } from 'jspdf';
import {
  buildVariantOptions,
  getProductNameEn,
  getProductNameTe,
  getProductVariants,
  getVariantWeightLabel,
} from '@/lib/labelProductOptions';
import { resolveLabelFieldValues } from '@/lib/labelTemplate/resolveLabelFieldValues';
import {
  createLabelTemplateCanvas,
  ensureLabelTemplateFontsLoaded,
} from '@/lib/labelTemplate/renderLabelTemplate';
import { createDefaultGroceryTemplate } from '@/lib/labelTemplate/defaultTemplates';
import { buildBatchBarcodeValue, buildPosScanCode, buildPosScanQrPayload, formatSerialNo } from '@/lib/posScanCode';
import {
  drawFixedYasvikSeznikLabel,
  ensureFssaiLogoLoaded,
} from '@/lib/yasvikSeznikLabelLayout';
import {
  formatBatchDatePart,
  formatMfgDate,
  formatPackedDate,
  generateBatchNo,
  LABEL_HEIGHT_MM,
  LABEL_WIDTH_MM,
  mmToPx,
} from '@/lib/priceLabelGenerator';

export const SEZNIK_DPI = 300;

export { buildVariantOptions, getProductNameEn, getProductNameTe, getProductVariants, getVariantWeightLabel };
export { buildPosScanCode, buildPosScanQrPayload, buildBatchBarcodeValue, formatSerialNo } from '@/lib/posScanCode';

export function buildBarcodeValue(batchNo, serialNo) {
  return buildBatchBarcodeValue(batchNo, serialNo);
}

export function resolveSeznikFieldValues(product, variant, { packedDate, batchNo, serialNo } = {}, template) {
  const serial = formatSerialNo(serialNo || 1);
  const batch = String(batchNo || '').trim() || generateBatchNo(packedDate, 1);
  const fieldValues = resolveLabelFieldValues(product, variant, { packedDate, batchNo: batch, serialNo: serial }, template);

  return {
    ...fieldValues,
    productId: product.id,
    variantId: variant?.sku || variant?.label || null,
    serialNo: serial,
    barcodeValue: buildBatchBarcodeValue(batch, serial),
    posScanCode: fieldValues.posScanCode || buildPosScanQrPayload(product, variant, variant?.price ?? product?.price),
    posScanInner: fieldValues.posScanInner || buildPosScanCode(product, variant, variant?.price ?? product?.price),
  };
}

/** @deprecated Use resolveSeznikFieldValues */
export function resolveSeznikLabelData(product, variant, options = {}, template) {
  return resolveSeznikFieldValues(product, variant, options, template);
}

export function buildSeznikLabelQueue(product, variant, { packedDate, batchNo, quantity = 1 }, template) {
  const qty = Math.max(1, Number(quantity) || 1);
  const batch = String(batchNo || '').trim() || generateBatchNo(packedDate, 1);
  const queue = [];

  for (let i = 1; i <= qty; i += 1) {
    queue.push(resolveSeznikFieldValues(product, variant, { packedDate, batchNo: batch, serialNo: i }, template));
  }
  return queue;
}

export async function ensureSeznikFontsLoaded() {
  return ensureLabelTemplateFontsLoaded();
}

/** Legacy fixed-layout preview renderer (960×480 reference artwork). */
export async function drawSeznikLabel(ctx, widthPx, heightPx, labelData, settings = {}) {
  const fssaiLogoImage = settings.fssaiLogoImage || await ensureFssaiLogoLoaded();
  drawFixedYasvikSeznikLabel(ctx, widthPx, heightPx, labelData, { ...settings, fssaiLogoImage });
}

async function renderSeznikLabelCanvases(labelQueue, template, dpi = SEZNIK_DPI) {
  await ensureLabelTemplateFontsLoaded();
  const safeTemplate = template || createDefaultGroceryTemplate();
  const canvases = [];
  for (const fieldValues of labelQueue) {
    canvases.push(await createLabelTemplateCanvas(safeTemplate, fieldValues, dpi));
  }
  return canvases;
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error(`Could not export ${type}`))),
      type,
      quality
    );
  });
}

function mergeCanvasesVertical(canvases) {
  if (!canvases.length) throw new Error('No label canvases to export');
  if (canvases.length === 1) return canvases[0];

  const strip = document.createElement('canvas');
  strip.width = canvases[0].width;
  strip.height = canvases.reduce((sum, canvas) => sum + canvas.height, 0);
  const ctx = strip.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, strip.width, strip.height);

  let offsetY = 0;
  canvases.forEach((canvas) => {
    ctx.drawImage(canvas, 0, offsetY);
    offsetY += canvas.height;
  });
  return strip;
}

export async function exportSeznikRollPdf(
  labelQueue,
  template,
  fileName = 'yasvik-seznik-labels.pdf',
  prefetchedCanvases = null
) {
  const safeTemplate = template || createDefaultGroceryTemplate();
  const widthMm = safeTemplate.widthMm || LABEL_WIDTH_MM;
  const heightMm = safeTemplate.heightMm || LABEL_HEIGHT_MM;
  const canvases = prefetchedCanvases || await renderSeznikLabelCanvases(labelQueue, safeTemplate, SEZNIK_DPI);
  const orientation = widthMm >= heightMm ? 'landscape' : 'portrait';

  const pdf = new jsPDF({
    unit: 'mm',
    format: [widthMm, heightMm],
    orientation,
    compress: true,
  });

  canvases.forEach((canvas, index) => {
    if (index > 0) {
      pdf.addPage([widthMm, heightMm], orientation);
    }
    pdf.addImage(
      canvas.toDataURL('image/png'),
      'PNG',
      0,
      0,
      widthMm,
      heightMm,
      undefined,
      'SLOW'
    );
  });

  pdf.save(fileName);
}

export async function exportSeznikRollPng(
  labelQueue,
  template,
  fileName = 'yasvik-seznik-labels.png',
  prefetchedCanvases = null
) {
  const safeTemplate = template || createDefaultGroceryTemplate();
  const canvases = prefetchedCanvases || await renderSeznikLabelCanvases(labelQueue, safeTemplate, SEZNIK_DPI);
  const strip = mergeCanvasesVertical(canvases);
  const blob = await canvasToBlob(strip, 'image/png');
  downloadBlob(blob, fileName);
}

export async function exportSeznikRollJpeg(
  labelQueue,
  template,
  fileName = 'yasvik-seznik-labels.jpg',
  prefetchedCanvases = null,
  quality = 1
) {
  const safeTemplate = template || createDefaultGroceryTemplate();
  const canvases = prefetchedCanvases || await renderSeznikLabelCanvases(labelQueue, safeTemplate, SEZNIK_DPI);
  const output = canvases.length === 1 ? canvases[0] : mergeCanvasesVertical(canvases);
  const blob = await canvasToBlob(output, 'image/jpeg', quality);
  downloadBlob(blob, fileName);
}

export function generatePrintJobNo(packedDate) {
  const datePart = formatBatchDatePart(packedDate);
  const suffix = Date.now().toString(36).slice(-4).toUpperCase();
  return `LPJ-${datePart}-${suffix}`;
}

export { formatBatchDatePart, generateBatchNo, formatMfgDate, formatPackedDate };
