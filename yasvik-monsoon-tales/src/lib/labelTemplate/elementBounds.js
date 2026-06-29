import { FONT_FAMILY_OPTIONS } from '@/lib/labelTemplate/constants';
import { mmToPx } from '@/lib/priceLabelGenerator';

function fontCss(familyId = 'arial') {
  return FONT_FAMILY_OPTIONS.find((item) => item.id === familyId)?.css || 'Arial, Helvetica, sans-serif';
}

export function resolveElementText(element, fieldValues = {}) {
  if (element.type === 'text') return String(element.text || '');
  if (element.type === 'field') {
    const raw = fieldValues[element.fieldKey] ?? '';
    return `${element.prefix || ''}${raw}${element.suffix || ''}`;
  }
  return '';
}

function measureTextWidthMm(ctx, text, fontSizeMm, fontWeight, fontFamily, maxWidthMm, pxPerMm) {
  if (!text) return 0;
  const fontSizePx = fontSizeMm * pxPerMm;
  const minFontSizePx = Math.max(1.5, fontSizeMm * 0.65) * pxPerMm;
  const maxWidthPx = maxWidthMm ? maxWidthMm * pxPerMm : undefined;
  ctx.font = `${fontWeight || 400} ${fontSizePx}px ${fontCss(fontFamily)}`;
  let size = fontSizePx;
  if (maxWidthPx) {
    while (size > minFontSizePx && ctx.measureText(text).width > maxWidthPx) {
      size -= 0.5;
      ctx.font = `${fontWeight || 400} ${size}px ${fontCss(fontFamily)}`;
    }
  }
  const widthPx = ctx.measureText(text).width;
  const usedFontSizeMm = size / pxPerMm;
  return { widthMm: widthPx / pxPerMm, heightMm: usedFontSizeMm * 1.25, usedFontSizeMm };
}

/**
 * Returns element bounding box in mm (left, top, width, height) for editor overlays.
 */
export function getElementBoundsMm(element, fieldValues = {}, template = {}, measureCtx = null) {
  const pxPerMm = 12;
  const ctx = measureCtx || (typeof document !== 'undefined'
    ? document.createElement('canvas').getContext('2d')
    : null);

  if (element.type === 'line') {
    return {
      leftMm: element.xMm,
      topMm: element.yMm - (element.strokeMm || 0.12) / 2,
      widthMm: element.widthMm || 0,
      heightMm: Math.max(element.strokeMm || 0.12, 0.5),
    };
  }

  if (element.type === 'image') {
    const heightMm = element.heightMm || 2;
    const aspect = element.assetKey === 'fssaiLogo' ? 72 / 26 : 1;
    const widthMm = heightMm * aspect;
    let leftMm = element.xMm;
    if (element.anchor === 'center') leftMm = element.xMm - widthMm / 2;
    if (element.anchor === 'right') leftMm = element.xMm - widthMm;
    return { leftMm, topMm: element.yMm, widthMm, heightMm };
  }

  if (element.type === 'qr') {
    const sizeMm = element.sizeMm || 10;
    let leftMm = element.xMm;
    if (element.anchor === 'center') leftMm = element.xMm - sizeMm / 2;
    if (element.anchor === 'right') leftMm = element.xMm - sizeMm;
    return { leftMm, topMm: element.yMm, widthMm: sizeMm, heightMm: sizeMm };
  }

  if (element.type === 'barcode') {
    const widthMm = element.widthMm || 40;
    const heightMm = element.heightMm || 8;
    let leftMm = element.xMm;
    if (element.anchor === 'center') leftMm = element.xMm - widthMm / 2;
    if (element.anchor === 'right') leftMm = element.xMm - widthMm;
    return { leftMm, topMm: element.yMm, widthMm, heightMm };
  }

  if ((element.type === 'field' || element.type === 'text') && ctx) {
    const text = resolveElementText(element, fieldValues);
    const fontSizeMm = element.fontSizeMm || 2.5;
    const maxWidthMm = element.maxWidthMm || template.widthMm || 50;
    const measured = measureTextWidthMm(
      ctx,
      text,
      fontSizeMm,
      element.fontWeight,
      element.fontFamily,
      maxWidthMm,
      pxPerMm
    );
    const widthMm = measured.widthMm;
    const heightMm = measured.heightMm;
    const anchor = element.anchor || 'left';
    const align = element.align || anchor;
    let leftMm = element.xMm;
    if (align === 'center' || anchor === 'center') leftMm = element.xMm - widthMm / 2;
    else if (align === 'right' || anchor === 'right') leftMm = element.xMm - widthMm;

    let topMm = element.yMm;
    const baseline = element.baseline || 'top';
    if (baseline === 'middle') topMm = element.yMm - heightMm / 2;
    if (baseline === 'bottom') topMm = element.yMm - heightMm;

    return { leftMm, topMm, widthMm, heightMm };
  }

  return {
    leftMm: element.xMm,
    topMm: element.yMm,
    widthMm: element.maxWidthMm || 10,
    heightMm: element.fontSizeMm || 2.5,
  };
}

export function mmToDisplayPx(mmValue, displayWidthPx, labelWidthMm) {
  return (mmValue / labelWidthMm) * displayWidthPx;
}

export function displayPxToMm(pxValue, displayWidthPx, labelWidthMm) {
  return (pxValue / displayWidthPx) * labelWidthMm;
}

export function clampMm(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function getElementLabel(element) {
  if (element.type === 'field') return element.fieldKey || 'field';
  if (element.type === 'text') return element.text?.slice(0, 16) || 'text';
  if (element.type === 'line') return 'divider';
  if (element.type === 'image') return element.assetKey || 'image';
  if (element.type === 'qr') return `qr · ${element.fieldKey || 'posScanCode'}`;
  if (element.type === 'barcode') return `barcode · ${element.fieldKey || 'productBarcode'}`;
  return element.type;
}
