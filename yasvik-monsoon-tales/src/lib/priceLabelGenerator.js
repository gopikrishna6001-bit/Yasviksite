import { jsPDF } from 'jspdf';

import { getVariantWeightLabel, resolveVariantPricing, buildVariantOptions } from '@/lib/labelProductOptions';

export const LABEL_WIDTH_MM = 50;
export const LABEL_HEIGHT_MM = 25;
export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;
export const DEFAULT_DPI = 300;
export const DEFAULT_MARGIN_MM = 5;
export const DEFAULT_GAP_MM = 2;

const COLORS = {
  bg: '#FAF8F5',
  border: '#1F3D2B',
  brand: '#1F3D2B',
  text: '#1A1A1A',
  muted: '#4A4A4A',
  price: '#1F3D2B',
};

const FONT_STACK = '"Inter", "Noto Sans", sans-serif';

let fontsReadyPromise = null;

export function mmToPx(mm, dpi = DEFAULT_DPI) {
  return Math.round((mm / 25.4) * dpi);
}

export function formatPrice(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '—';
  if (Number.isInteger(n) || Math.abs(n - Math.round(n)) < 0.001) {
    return String(Math.round(n));
  }
  return n.toFixed(2);
}

export function formatPackedDate(dateInput) {
  const d = dateInput instanceof Date ? dateInput : new Date(`${dateInput}T12:00:00`);
  if (Number.isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = String(d.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

export function formatMfgDate(dateInput) {
  const d = dateInput instanceof Date ? dateInput : new Date(`${dateInput}T12:00:00`);
  if (Number.isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

export function formatBatchDatePart(dateInput) {
  const d = dateInput instanceof Date ? dateInput : new Date(`${dateInput}T12:00:00`);
  if (Number.isNaN(d.getTime())) return '000000';
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

export function generateBatchNo(dateInput, sequence = 1) {
  const seq = Math.max(1, Math.min(999, Number(sequence) || 1));
  return `YV${formatBatchDatePart(dateInput)}${String(seq).padStart(3, '0')}`;
}

export function getProductNetWt(product = {}) {
  const variants = product.quick_variants || product.variants || [];
  const firstVariant = Array.isArray(variants) ? variants[0] : null;
  const label = firstVariant?.label || '';
  return String(
    product.unit ||
      product.weight ||
      product.pack_size ||
      label ||
      ''
  ).trim() || '—';
}

export function resolveProductLabelData(product, variant, { mfgDate, batchNo } = {}) {
  const pricing = resolveVariantPricing(product, variant);
  return {
    productId: product.id,
    productName: String(product.title || product.name || 'Product').trim(),
    netWt: getVariantWeightLabel(variant, product),
    mrp: formatPrice(pricing.mrp),
    sellingPrice: formatPrice(pricing.sellingPrice),
    mfgDate: formatMfgDate(mfgDate),
    batchNo: String(batchNo || '').trim() || generateBatchNo(mfgDate, 1),
  };
}

export function computeA4Grid({
  labelWidthMm = LABEL_WIDTH_MM,
  labelHeightMm = LABEL_HEIGHT_MM,
  marginMm = DEFAULT_MARGIN_MM,
  gapMm = DEFAULT_GAP_MM,
  pageWidthMm = A4_WIDTH_MM,
  pageHeightMm = A4_HEIGHT_MM,
} = {}) {
  const usableW = pageWidthMm - marginMm * 2;
  const usableH = pageHeightMm - marginMm * 2;
  const cols = Math.max(1, Math.floor((usableW + gapMm) / (labelWidthMm + gapMm)));
  const rows = Math.max(1, Math.floor((usableH + gapMm) / (labelHeightMm + gapMm)));
  return {
    cols,
    rows,
    perPage: cols * rows,
    marginMm: Number(marginMm) || DEFAULT_MARGIN_MM,
    gapMm: Number(gapMm) || DEFAULT_GAP_MM,
    labelWidthMm,
    labelHeightMm,
  };
}

export function buildLabelQueue(selectedRows = []) {
  const queue = [];
  selectedRows.forEach((row) => {
    const qty = Math.max(1, Number(row.quantity) || 1);
    for (let i = 0; i < qty; i += 1) {
      queue.push({
        ...row.labelData,
        copyIndex: i + 1,
        copyTotal: qty,
      });
    }
  });
  return queue;
}

export function buildSelectedRows(products = [], selections = {}) {
  const {
    mfgDate,
    quantities = {},
    batchNumbers = {},
    netWtOverrides = {},
    variants = {},
  } = selections;
  let sequence = 1;

  return products.map((product) => {
    const batchNo = batchNumbers[product.id] || generateBatchNo(mfgDate, sequence);
    sequence += 1;
    const variant = variants[product.id] || null;
    const labelData = resolveProductLabelData(product, variant, { mfgDate, batchNo });
    if (netWtOverrides[product.id]) {
      labelData.netWt = String(netWtOverrides[product.id]).trim();
    }
    return {
      productId: product.id,
      variant,
      quantity: Math.max(1, Number(quantities[product.id]) || 1),
      labelData,
    };
  });
}

/** Build legacy (no-template) label rows from merged print lines. */
export function buildLegacyRowsFromPrintLines(
  printLines = [],
  productsById = {},
  { mfgDate, batchNumbers = {} } = {}
) {
  let sequence = 0;

  return printLines.map((line) => {
    const product = productsById[line.productId];
    if (!product) return null;

    const variants = buildVariantOptions(product);
    const variant = variants[line.variantIndex] || variants[0] || null;
    const batchNo = batchNumbers[line.productId] || generateBatchNo(mfgDate, (sequence += 1));
    const labelData = resolveProductLabelData(product, variant, { mfgDate, batchNo });

    return {
      productId: line.productId,
      variant,
      quantity: Math.max(1, Number(line.quantity) || 1),
      labelData,
    };
  }).filter(Boolean);
}

export async function ensureLabelFontsLoaded() {
  if (fontsReadyPromise) return fontsReadyPromise;

  fontsReadyPromise = (async () => {
    try {
      if (!document.getElementById('yasvik-label-fonts')) {
        const link = document.createElement('link');
        link.id = 'yasvik-label-fonts';
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap';
        document.head.appendChild(link);
        await new Promise((resolve) => {
          link.onload = resolve;
          link.onerror = resolve;
          setTimeout(resolve, 1000);
        });
      }
      await Promise.allSettled([
        document.fonts.load('400 14px Inter'),
        document.fonts.load('700 14px Inter'),
      ]);
      await document.fonts.ready;
    } catch {
      // System font fallback is fine for preview/export.
    }
  })();

  return fontsReadyPromise;
}

function fitText(ctx, text, maxWidth) {
  if (!text) return '';
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 1 && ctx.measureText(`${truncated}…`).width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated}…`;
}

function setFont(ctx, weight, sizePx) {
  ctx.font = `${weight} ${Math.round(sizePx)}px ${FONT_STACK}`;
}

function shrinkFontToFit(ctx, weight, startSizePx, minSizePx, text, maxWidth) {
  let size = startSizePx;
  setFont(ctx, weight, size);
  while (size > minSizePx && ctx.measureText(text).width > maxWidth) {
    size -= 0.5;
    setFont(ctx, weight, size);
  }
  return size;
}

export function drawLabel(ctx, widthPx, heightPx, labelData, { transparent = false } = {}) {
  const x = (mm) => (mm / LABEL_WIDTH_MM) * widthPx;
  const y = (mm) => (mm / LABEL_HEIGHT_MM) * heightPx;
  const fontSize = (mm) => Math.max(7, (mm / LABEL_WIDTH_MM) * widthPx);

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (!transparent) {
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, widthPx, heightPx);
  } else {
    ctx.clearRect(0, 0, widthPx, heightPx);
  }

  const borderWidth = Math.max(1, x(0.28));
  ctx.lineWidth = borderWidth;
  ctx.strokeStyle = COLORS.border;
  ctx.strokeRect(
    borderWidth / 2,
    borderWidth / 2,
    widthPx - borderWidth,
    heightPx - borderWidth
  );

  const padL = x(1.4);
  const padR = widthPx - x(1.4);
  const contentW = padR - padL;

  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';

  setFont(ctx, 700, fontSize(2.35));
  ctx.fillStyle = COLORS.brand;
  ctx.fillText('YASVIK', padL, y(1.0));

  ctx.textAlign = 'right';
  setFont(ctx, 600, fontSize(1.7));
  ctx.fillStyle = COLORS.muted;
  ctx.fillText(`Net Wt: ${labelData.netWt || '—'}`, padR, y(1.15));
  ctx.textAlign = 'left';

  setFont(ctx, 600, fontSize(2.05));
  ctx.fillStyle = COLORS.text;
  ctx.fillText(fitText(ctx, labelData.productName || 'Product', contentW), padL, y(4.0));

  setFont(ctx, 500, fontSize(1.75));
  ctx.fillStyle = COLORS.muted;
  ctx.fillText(`MRP ₹${labelData.mrp}`, padL, y(7.6));

  const priceText = `YASVIK PRICE ₹${labelData.sellingPrice}`;
  shrinkFontToFit(ctx, 700, fontSize(2.95), fontSize(2.1), priceText, contentW);
  ctx.fillStyle = COLORS.price;
  ctx.fillText(priceText, padL, y(10.8));

  const footText = `Mfg: ${labelData.mfgDate}   Batch: ${labelData.batchNo}`;
  setFont(ctx, 500, fontSize(1.55));
  ctx.fillStyle = COLORS.muted;
  ctx.fillText(fitText(ctx, footText, contentW), padL, y(20.8));

  ctx.restore();
}

export function createLabelCanvas(labelData, dpi = DEFAULT_DPI, { transparent = false } = {}) {
  const widthPx = mmToPx(LABEL_WIDTH_MM, dpi);
  const heightPx = mmToPx(LABEL_HEIGHT_MM, dpi);
  const canvas = document.createElement('canvas');
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext('2d');
  drawLabel(ctx, widthPx, heightPx, labelData, { transparent });
  return canvas;
}

export function getLabelPosition(index, grid) {
  const indexOnPage = index % grid.perPage;
  const col = indexOnPage % grid.cols;
  const row = Math.floor(indexOnPage / grid.cols);
  const pageOffset = Math.floor(index / grid.perPage);
  const x = grid.marginMm + col * (grid.labelWidthMm + grid.gapMm);
  const y = grid.marginMm + row * (grid.labelHeightMm + grid.gapMm);
  return { x, y, pageOffset, col, row };
}

export async function createA4SheetCanvas(labelQueue, gridOptions = {}, dpi = DEFAULT_DPI) {
  await ensureLabelFontsLoaded();
  const grid = computeA4Grid(gridOptions);
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
    const labelCanvas = createLabelCanvas(labelQueue[i], dpi);
    const destX = mmToPx(x, dpi);
    const destY = pageOffset * pageHeightPx + mmToPx(y, dpi);
    ctx.drawImage(labelCanvas, destX, destY, labelWidthPx, labelHeightPx);
  }

  return { canvas, grid, pageCount };
}

export async function exportLabelsPdf(labelQueue, gridOptions = {}, fileName = 'yasvik-price-labels.pdf') {
  await ensureLabelFontsLoaded();
  const grid = computeA4Grid(gridOptions);
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });

  for (let i = 0; i < labelQueue.length; i += 1) {
    const { x, y, pageOffset } = getLabelPosition(i, grid);
    if (pageOffset > 0 && i % grid.perPage === 0) {
      pdf.addPage();
    }
    const canvas = createLabelCanvas(labelQueue[i], DEFAULT_DPI);
    pdf.addImage(
      canvas.toDataURL('image/png'),
      'PNG',
      x,
      y,
      grid.labelWidthMm,
      grid.labelHeightMm,
      undefined,
      'SLOW'
    );
  }

  pdf.save(fileName);
}

export async function exportLabelsPngSheet(labelQueue, gridOptions = {}, fileName = 'yasvik-price-labels-a4.png') {
  const { canvas } = await createA4SheetCanvas(labelQueue, gridOptions, DEFAULT_DPI);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  downloadBlob(blob, fileName);
}

export async function exportSingleLabelPng(labelData, fileName = 'yasvik-label.png', { transparent = false } = {}) {
  await ensureLabelFontsLoaded();
  const canvas = createLabelCanvas(labelData, DEFAULT_DPI, { transparent });
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  downloadBlob(blob, fileName);
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function slugifyFileName(value = 'label') {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'label';
}
