import { FONT_FAMILY_OPTIONS } from '@/lib/labelTemplate/constants';
import { fitTextToWidth, splitProductTitleLines } from '@/lib/labelTemplate/labelTextFit';
import { drawQrElement } from '@/lib/labelTemplate/renderQrElement';
import { drawBarcodeElement } from '@/lib/labelTemplate/renderBarcodeElement';
import { mmToPx } from '@/lib/priceLabelGenerator';

const imageCache = new Map();

function fontCss(familyId = 'arial') {
  return FONT_FAMILY_OPTIONS.find((item) => item.id === familyId)?.css || 'Arial, Helvetica, sans-serif';
}

function mm(dpi, value) {
  return mmToPx(Number(value) || 0, dpi);
}

function resolveAnchorX(element, widthPx, dpi) {
  const x = mm(dpi, element.xMm);
  if (element.anchor === 'center') return x;
  if (element.anchor === 'right') return x;
  return x;
}

function applyTextAlign(ctx, element, xPx) {
  const align = element.align || element.anchor || 'left';
  ctx.textAlign = align === 'center' ? 'center' : align === 'right' ? 'right' : 'left';
  return xPx;
}

function applyBaseline(ctx, element) {
  const baseline = element.baseline || 'top';
  ctx.textBaseline = baseline === 'middle' ? 'middle' : baseline === 'bottom' ? 'bottom' : 'top';
}

function drawFittedText(ctx, {
  text,
  x,
  y,
  maxWidthPx,
  fontSizePx,
  minFontSizePx,
  weight,
  family,
  align,
  baseline,
}) {
  const fitted = fitTextToWidth(ctx, text, maxWidthPx, fontSizePx, minFontSizePx, weight, family);
  ctx.font = `${weight} ${fitted.size}px ${family}`;
  ctx.textAlign = align === 'center' ? 'center' : align === 'right' ? 'right' : 'left';
  ctx.textBaseline = baseline === 'middle' ? 'middle' : baseline === 'bottom' ? 'bottom' : 'top';
  ctx.fillText(fitted.text, x, y);
  return fitted.size;
}

function resolveElementText(element, fieldValues = {}) {
  if (element.type === 'text') {
    return String(element.text || '');
  }
  if (element.type === 'field') {
    const raw = fieldValues[element.fieldKey] ?? '';
    return `${element.prefix || ''}${raw}${element.suffix || ''}`;
  }
  return '';
}

async function loadImage(url) {
  const src = String(url || '').trim();
  if (!src) return null;
  if (imageCache.has(src)) return imageCache.get(src);
  if (typeof Image === 'undefined') return null;

  const promise = new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
  imageCache.set(src, promise);
  return promise;
}

function drawSafeMarginGuide(ctx, template, dpi, showGuide) {
  if (!showGuide) return;
  const margin = mm(dpi, template.safeMarginMm || 0);
  const widthPx = mm(dpi, template.widthMm);
  const heightPx = mm(dpi, template.heightMm);
  ctx.save();
  ctx.strokeStyle = 'rgba(52, 194, 48, 0.35)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(margin, margin, widthPx - margin * 2, heightPx - margin * 2);
  ctx.restore();
}

async function drawImageElement(ctx, element, template, dpi) {
  let url = element.imageUrl || '';
  if (element.assetKey === 'fssaiLogo') {
    url = template.assets?.fssaiLogoUrl || url;
  }
  const img = await loadImage(url);
  if (!img) return;

  const x = mm(dpi, element.xMm);
  const y = mm(dpi, element.yMm);
  const heightPx = mm(dpi, element.heightMm || 2);
  const widthPx = (img.width / img.height) * heightPx;
  let drawX = x;
  if (element.anchor === 'center') drawX = x - widthPx / 2;
  if (element.anchor === 'right') drawX = x - widthPx;
  ctx.drawImage(img, drawX, y, widthPx, heightPx);
}

function drawLineElement(ctx, element, dpi) {
  const x = mm(dpi, element.xMm);
  const y = mm(dpi, element.yMm);
  const widthPx = mm(dpi, element.widthMm || 0);
  ctx.save();
  ctx.strokeStyle = element.color || '#000000';
  ctx.lineWidth = Math.max(1, mm(dpi, element.strokeMm || 0.12));
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + widthPx, y);
  ctx.stroke();
  ctx.restore();
}

function drawTextElement(ctx, element, fieldValues, dpi) {
  const text = resolveElementText(element, fieldValues);
  if (!text) return;

  const family = fontCss(element.fontFamily);
  const x = mm(dpi, element.xMm);
  const y = mm(dpi, element.yMm);
  const maxWidthPx = element.maxWidthMm ? mm(dpi, element.maxWidthMm) : undefined;
  const fontSizePx = mm(dpi, element.fontSizeMm || 2.5);
  const minFontSizePx = mm(dpi, element.minFontSizeMm || Math.max(1.5, (element.fontSizeMm || 2.5) * 0.65));
  const align = element.align || element.anchor || 'left';
  const baseline = element.baseline || 'top';
  const weight = element.fontWeight || 400;

  ctx.fillStyle = element.color || '#000000';

  if (maxWidthPx && element.multiLine && element.fieldKey === 'productTitle') {
    const lines = splitProductTitleLines(text).slice(0, 2);
    const lineGapPx = mm(dpi, element.lineGapMm || 0.85);
    let lineY = y;
    lines.forEach((line, index) => {
      const size = drawFittedText(ctx, {
        text: line,
        x,
        y: lineY,
        maxWidthPx,
        fontSizePx: index > 0 ? Math.min(fontSizePx, minFontSizePx + mm(dpi, 0.4)) : fontSizePx,
        minFontSizePx,
        weight,
        family,
        align,
        baseline,
      });
      lineY += size * 1.08 + lineGapPx;
    });
    return;
  }

  if (maxWidthPx) {
    drawFittedText(ctx, {
      text,
      x,
      y,
      maxWidthPx,
      fontSizePx,
      minFontSizePx,
      weight,
      family,
      align,
      baseline,
    });
    return;
  }

  ctx.font = `${weight} ${fontSizePx}px ${family}`;
  applyTextAlign(ctx, element, x);
  applyBaseline(ctx, element);
  ctx.fillText(text, x, y);
}

export async function ensureLabelTemplateFontsLoaded() {
  if (typeof document === 'undefined') return;
  try {
    if (!document.getElementById('yasvik-label-template-fonts')) {
      const link = document.createElement('link');
      link.id = 'yasvik-label-template-fonts';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+Telugu:wght@400;700&display=swap';
      document.head.appendChild(link);
      await new Promise((resolve) => {
        link.onload = resolve;
        link.onerror = resolve;
        setTimeout(resolve, 1200);
      });
    }
    await Promise.allSettled([
      document.fonts.load('700 14px Arial'),
      document.fonts.load('400 14px Arial'),
      document.fonts.load('700 14px "Noto Sans Telugu"'),
    ]);
    await document.fonts.ready;
  } catch {
    // System fonts are fine.
  }
}

export async function renderLabelTemplate(ctx, widthPx, heightPx, template, fieldValues = {}, options = {}) {
  const dpi = options.dpi || Math.round((widthPx / (template.widthMm || 50)) * 25.4);
  const scaleX = widthPx / mm(dpi, template.widthMm || 50);
  const scaleY = heightPx / mm(dpi, template.heightMm || 25);

  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, widthPx, heightPx);
  ctx.scale(scaleX, scaleY);

  drawSafeMarginGuide(ctx, template, dpi, options.showSafeMarginGuide);

  const elements = [...(template.elements || [])].filter((el) => el.visible !== false);
  for (const element of elements) {
    if (element.type === 'line') {
      drawLineElement(ctx, element, dpi);
      continue;
    }
    if (element.type === 'image') {
      await drawImageElement(ctx, element, template, dpi);
      continue;
    }
    if (element.type === 'qr') {
      await drawQrElement(ctx, element, fieldValues, dpi);
      continue;
    }
    if (element.type === 'barcode') {
      drawBarcodeElement(ctx, element, fieldValues, dpi);
      continue;
    }
    if (element.type === 'text' || element.type === 'field') {
      drawTextElement(ctx, element, fieldValues, dpi);
    }
  }

  ctx.restore();
}

export async function createLabelTemplateCanvas(template, fieldValues = {}, dpi = 300, options = {}) {
  await ensureLabelTemplateFontsLoaded();
  const widthPx = mmToPx(template.widthMm || 50, dpi);
  const heightPx = mmToPx(template.heightMm || 25, dpi);
  const canvas = document.createElement('canvas');
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext('2d');
  await renderLabelTemplate(ctx, widthPx, heightPx, template, fieldValues, { ...options, dpi });
  return canvas;
}

export function clearLabelTemplateImageCache() {
  imageCache.clear();
}
