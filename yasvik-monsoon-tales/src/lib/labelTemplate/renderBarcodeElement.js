import JsBarcode from 'jsbarcode';
import { mmToPx } from '@/lib/priceLabelGenerator';

function mm(dpi, value) {
  return mmToPx(Number(value) || 0, dpi);
}

export function drawBarcodeElement(ctx, element, fieldValues, dpi) {
  const value = String(fieldValues[element.fieldKey] || fieldValues.productBarcode || '').trim();
  if (!value) return;

  const heightMm = element.heightMm || 8;
  const widthMm = element.widthMm || 40;
  const heightPx = mm(dpi, heightMm);
  const widthPx = mm(dpi, widthMm);
  const x = mm(dpi, element.xMm);
  const y = mm(dpi, element.yMm);

  const off = document.createElement('canvas');
  try {
    JsBarcode(off, value, {
      format: 'CODE128',
      displayValue: element.showValue !== false,
      font: 'Arial, Helvetica, sans-serif',
      fontSize: Math.max(8, Math.round(heightPx * 0.2)),
      textMargin: 1,
      height: Math.max(24, Math.round(heightPx * 0.72)),
      margin: 0,
      lineColor: element.color || '#000000',
      background: '#ffffff',
    });
  } catch {
    return;
  }

  const drawW = widthPx || off.width;
  const drawH = heightPx || off.height;
  let drawX = x;
  if (element.anchor === 'center') drawX = x - drawW / 2;
  if (element.anchor === 'right') drawX = x - drawW;

  ctx.drawImage(off, drawX, y, drawW, drawH);
}
