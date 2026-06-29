import QRCode from 'qrcode';
import { mmToPx } from '@/lib/priceLabelGenerator';

export function resolveQrPayload(element, fieldValues = {}) {
  const key = element.fieldKey || 'posScanCode';
  const raw = fieldValues[key] ?? '';
  return String(raw).trim();
}

export async function drawQrElement(ctx, element, fieldValues, dpi) {
  const payload = resolveQrPayload(element, fieldValues);
  if (!payload) return;

  const sizePx = mmToPx(Number(element.sizeMm) || 10, dpi);
  const margin = Math.max(0, Number(element.margin) || 0);

  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, payload, {
    width: sizePx,
    margin,
    errorCorrectionLevel: element.errorCorrection || 'M',
    color: {
      dark: element.color || '#000000',
      light: '#ffffff',
    },
  });

  const x = mmToPx(Number(element.xMm) || 0, dpi);
  const y = mmToPx(Number(element.yMm) || 0, dpi);
  let drawX = x;
  if (element.anchor === 'center') drawX = x - sizePx / 2;
  if (element.anchor === 'right') drawX = x - sizePx;

  ctx.drawImage(qrCanvas, drawX, y, sizePx, sizePx);
}
