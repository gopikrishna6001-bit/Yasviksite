import JsBarcode from 'jsbarcode';
import { jsPDF } from 'jspdf';
import { LABEL_HEIGHT_MM, LABEL_WIDTH_MM, mmToPx } from '@/lib/priceLabelGenerator';
import { getProductTeluguName } from '@/lib/teluguProductNames';
import { ensureLabelTemplateFontsLoaded } from '@/lib/labelTemplate/renderLabelTemplate';

export const SKU_BARCODE_LABEL_WIDTH_MM = LABEL_WIDTH_MM;
export const SKU_BARCODE_LABEL_HEIGHT_MM = LABEL_HEIGHT_MM;
export const SKU_BARCODE_LABEL_DPI = 300;

const FONT_LATIN = 'Arial, Helvetica, sans-serif';
const FONT_TELUGU = '"Noto Sans Telugu", "Nirmala UI", Arial, sans-serif';

function mm(dpi, value) {
  return mmToPx(Number(value) || 0, dpi);
}

function slugifyFileName(value) {
  return String(value || 'product')
    .trim()
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64) || 'product';
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

function truncateToWidth(ctx, text, maxWidthPx) {
  let value = String(text || '').trim();
  if (!value) return '';
  if (ctx.measureText(value).width <= maxWidthPx) return value;
  while (value.length > 1 && ctx.measureText(`${value}…`).width > maxWidthPx) {
    value = value.slice(0, -1);
  }
  return `${value}…`;
}

function shrinkToFit(ctx, text, startSizePx, minSizePx, maxWidthPx, weight, family) {
  let size = startSizePx;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > minSizePx && ctx.measureText(text).width > maxWidthPx) {
    size -= 0.5;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

function drawCenteredLine(ctx, text, centerX, y, maxWidthPx, startSizePx, minSizePx, weight, family) {
  const raw = String(text || '').trim();
  if (!raw) return 0;

  ctx.font = `${weight} ${startSizePx}px ${family}`;
  const line = truncateToWidth(ctx, raw, maxWidthPx);
  shrinkToFit(ctx, line, startSizePx, minSizePx, maxWidthPx, weight, family);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(line, centerX, y);
  return Number.parseFloat(ctx.font.match(/(\d+(?:\.\d+)?)px/)?.[1] || startSizePx);
}

/**
 * 50×25 mm shelf label — Code128 encodes product.sku only.
 * Telugu name up top; English SKU prints under the barcode.
 */
export async function renderSkuBarcodeCanvas(product, dpi = SKU_BARCODE_LABEL_DPI) {
  const sku = String(product?.sku || '').trim();
  if (!sku) throw new Error('Assign a product SKU before generating the barcode label.');

  await ensureLabelTemplateFontsLoaded();

  const widthPx = mm(dpi, SKU_BARCODE_LABEL_WIDTH_MM);
  const heightPx = mm(dpi, SKU_BARCODE_LABEL_HEIGHT_MM);
  const canvas = document.createElement('canvas');
  canvas.width = widthPx;
  canvas.height = heightPx;

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, widthPx, heightPx);

  const marginPx = mm(dpi, 1.6);
  const textMaxWidthPx = widthPx - marginPx * 2;
  const centerX = widthPx / 2;
  const teluguName = getProductTeluguName(product);

  ctx.fillStyle = '#111111';

  let textBottomPx = mm(dpi, 1.1);
  if (teluguName) {
    const teluguSizePx = drawCenteredLine(
      ctx,
      teluguName,
      centerX,
      textBottomPx,
      textMaxWidthPx,
      Math.max(13, mm(dpi, 4.1)),
      Math.max(10, mm(dpi, 2.65)),
      700,
      FONT_TELUGU,
    );
    textBottomPx += teluguSizePx + mm(dpi, 0.5);
  }

  const barcodeCanvas = document.createElement('canvas');
  try {
    JsBarcode(barcodeCanvas, sku, {
      format: 'CODE128',
      displayValue: true,
      font: FONT_LATIN,
      fontSize: Math.max(8, mm(dpi, 1.85)),
      textMargin: Math.max(1, mm(dpi, 0.35)),
      height: Math.max(24, mm(dpi, 8.5)),
      margin: 0,
      lineColor: '#000000',
      background: '#ffffff',
    });
  } catch (error) {
    throw new Error(error?.message || `Could not encode SKU "${sku}" as Code128`);
  }

  const barWidthPx = widthPx - marginPx * 2;
  const barTopPx = Math.max(textBottomPx + mm(dpi, 0.35), mm(dpi, teluguName ? 7.2 : 4.5));
  const barBottomMarginPx = mm(dpi, 1.2);
  const barHeightPx = Math.max(mm(dpi, 11.5), heightPx - barTopPx - barBottomMarginPx);
  ctx.drawImage(barcodeCanvas, marginPx, barTopPx, barWidthPx, barHeightPx);

  return canvas;
}

export function buildSkuBarcodeFileName(product, extension = 'jpg') {
  const sku = slugifyFileName(product?.sku);
  return `${sku}-barcode-50x25mm.${extension}`;
}

export async function downloadSkuBarcodeJpeg(product, options = {}) {
  const dpi = options.dpi || SKU_BARCODE_LABEL_DPI;
  const quality = options.quality ?? 0.95;
  const canvas = await renderSkuBarcodeCanvas(product, dpi);
  const blob = await canvasToBlob(canvas, 'image/jpeg', quality);
  const fileName = options.fileName || buildSkuBarcodeFileName(product, 'jpg');
  downloadBlob(blob, fileName);
  return fileName;
}

export async function exportSkuBarcodePdf(products = [], fileName = 'yasvik-sku-barcodes-50x25.pdf') {
  const list = (products || []).filter((product) => String(product?.sku || '').trim());
  if (!list.length) throw new Error('No products with SKU to export.');

  const widthMm = SKU_BARCODE_LABEL_WIDTH_MM;
  const heightMm = SKU_BARCODE_LABEL_HEIGHT_MM;
  const orientation = widthMm >= heightMm ? 'landscape' : 'portrait';
  const pdf = new jsPDF({
    unit: 'mm',
    format: [widthMm, heightMm],
    orientation,
    compress: true,
  });

  for (let index = 0; index < list.length; index += 1) {
    const canvas = await renderSkuBarcodeCanvas(list[index]);
    if (index > 0) pdf.addPage([widthMm, heightMm], orientation);
    pdf.addImage(
      canvas.toDataURL('image/jpeg', 0.95),
      'JPEG',
      0,
      0,
      widthMm,
      heightMm,
      undefined,
      'FAST'
    );
  }

  pdf.save(fileName);
  return list.length;
}
