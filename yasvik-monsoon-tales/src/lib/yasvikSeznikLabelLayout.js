/**
 * Yasvik grocery display label — exact 50mm × 25mm layout.
 * Coordinates traced from the approved 960×480 reference artwork (19.2 px/mm).
 */

import { fitTextToWidth, splitProductTitleLines } from '@/lib/labelTemplate/labelTextFit';

export const REF_WIDTH_PX = 960;
export const REF_HEIGHT_PX = 480;
export const PX_PER_MM = REF_WIDTH_PX / 50;

export const LABEL_TEXT_COLOR = '#000000';
export const YASVIK_FSSAI_LICENSE = '23626032001451';
export const YASVIK_LABEL_WEBSITE = 'www.yasvik.com';
export const YASVIK_SHELF_LIFE = 'Best before 6 months';

/** Safe print margin — ~2.6mm on every edge so a slight cut does not clip text. */
export const SAFE_MARGIN_X = 50;
export const SAFE_MARGIN_TOP = 36;
export const SAFE_MARGIN_BOTTOM = 38;

const FONT_LATIN = 'Arial, Helvetica, "Inter", sans-serif';
const FONT_TELUGU = '"Noto Sans Telugu", "Nirmala UI", Arial, sans-serif';
const FONT_MIXED = `Arial, Helvetica, ${FONT_TELUGU}`;

/** Fixed positions from reference label (960×480). */
export const LABEL_LAYOUT = {
  title: { y: 34, size: 44, minSize: 28, weight: '700' },
  divider: { y: 84, stroke: 2 },
  price: { x: SAFE_MARGIN_X, y: 106, size: 36, minSize: 28, weight: '700' },
  netWt: { x: SAFE_MARGIN_X, y: 150, size: 36, minSize: 28, weight: '700' },
  rightCol: { x: 508, y: 108, size: 26, lineGap: 34, weight: '400' },
  footer: { y: 448, size: 20, weight: '400' },
  fssai: { x: SAFE_MARGIN_X, y: 426, height: 22 },
};

let cachedFssaiLogo = null;
let fssaiLogoPromise = null;

function s(scale, value) {
  return value * scale;
}

function setFont(ctx, weight, sizePx, family) {
  ctx.font = `${weight} ${Math.round(sizePx * 10) / 10}px ${family}`;
}

function shrinkToFit(ctx, text, startSize, minSize, maxW, weight, family) {
  const fitted = fitTextToWidth(ctx, text, maxW, startSize, minSize, weight, family);
  setFont(ctx, weight, fitted.size, family);
  return fitted;
}

function primaryTeluguSegment(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw.split('/').map((part) => part.trim()).find(Boolean) || raw;
}

function englishSegment(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (!raw.includes('/')) return raw;
  const parts = raw.split('/').map((part) => part.trim()).filter(Boolean);
  return parts.find((part) => !/[\u0C00-\u0C7F]/.test(part)) || parts[0];
}

export function buildProductTitle(nameEn, nameTe) {
  const en = englishSegment(nameEn);
  const te = primaryTeluguSegment(nameTe);
  if (en && te && en !== te) return `${en}/${te}`;
  return en || te || 'Product';
}

export async function ensureFssaiLogoLoaded() {
  if (cachedFssaiLogo) return cachedFssaiLogo;
  if (fssaiLogoPromise) return fssaiLogoPromise;
  if (typeof Image === 'undefined') return null;

  fssaiLogoPromise = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      cachedFssaiLogo = img;
      resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = '/media/fssai-logo.svg';
  });

  return fssaiLogoPromise;
}

function drawDivider(ctx, scale, layout, settings = {}) {
  const inset = (Number(settings.marginInsetMm) || 0) * PX_PER_MM;
  const y = s(scale, layout.divider.y);
  const x1 = s(scale, SAFE_MARGIN_X + inset);
  const x2 = s(scale, REF_WIDTH_PX - SAFE_MARGIN_X - inset);
  ctx.save();
  ctx.strokeStyle = LABEL_TEXT_COLOR;
  ctx.lineWidth = Math.max(1, s(scale, layout.divider.stroke));
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.restore();
}

function drawFssaiFooter(ctx, scale, layout, labelData, fssaiLogo, settings = {}) {
  const foot = layout.footer;
  const fssaiSpec = layout.fssai;
  const leftX = s(scale, fssaiSpec.x + (Number(settings.leftOffsetMm) || 0) * PX_PER_MM);
  const footY = s(scale, foot.y + (Number(settings.topOffsetMm) || 0) * PX_PER_MM);
  const footSize = s(scale, foot.size) * (settings.fontScale || 1);
  const logoH = s(scale, fssaiSpec.height);
  const logoY = s(scale, fssaiSpec.y + (Number(settings.topOffsetMm) || 0) * PX_PER_MM);

  let licenseX = leftX;
  if (fssaiLogo) {
    const logoW = (fssaiLogo.width / fssaiLogo.height) * logoH;
    ctx.drawImage(fssaiLogo, leftX, logoY, logoW, logoH);
    licenseX = leftX + logoW + s(scale, 8);
  }

  setFont(ctx, foot.weight, footSize, FONT_LATIN);
  ctx.fillStyle = LABEL_TEXT_COLOR;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    `Lic.No.${labelData.fssaiLicense || YASVIK_FSSAI_LICENSE}`,
    licenseX,
    footY
  );

  ctx.textAlign = 'right';
  ctx.fillText(
    labelData.website || YASVIK_LABEL_WEBSITE,
    s(scale, REF_WIDTH_PX - SAFE_MARGIN_X),
    footY
  );
}

/**
 * Draw the approved Yasvik grocery label onto a canvas context.
 */
export function drawFixedYasvikSeznikLabel(ctx, widthPx, heightPx, labelData, settings = {}) {
  const scale = widthPx / REF_WIDTH_PX;
  const layout = LABEL_LAYOUT;
  const fontScale = settings.fontScale || 1;
  const offsetX = s(scale, (Number(settings.leftOffsetMm) || 0) * PX_PER_MM);
  const offsetY = s(scale, (Number(settings.topOffsetMm) || 0) * PX_PER_MM);
  const fssaiLogo = settings.fssaiLogoImage || cachedFssaiLogo;
  const titleMaxW = s(scale, REF_WIDTH_PX - SAFE_MARGIN_X * 2);

  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, widthPx, heightPx);
  ctx.translate(offsetX, offsetY);
  ctx.fillStyle = LABEL_TEXT_COLOR;

  const title = buildProductTitle(labelData.nameEn, labelData.nameTe);
  const titleLines = splitProductTitleLines(title).slice(0, 2);
  const titleStartSize = s(scale, layout.title.size) * fontScale;
  const titleMinSize = s(scale, layout.title.minSize) * fontScale;
  const titleX = s(scale, REF_WIDTH_PX / 2);
  let titleY = s(scale, layout.title.y);
  const titleLineGap = s(scale, 6);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  titleLines.forEach((line, index) => {
    const startSize = index > 0 ? Math.min(titleStartSize, titleMinSize + s(scale, 2)) : titleStartSize;
    const fitted = shrinkToFit(
      ctx,
      line,
      startSize,
      titleMinSize,
      titleMaxW,
      layout.title.weight,
      FONT_MIXED
    );
    ctx.fillText(fitted.text, titleX, titleY);
    titleY += fitted.size * 1.08 + titleLineGap;
  });

  drawDivider(ctx, scale, layout, settings);

  const priceText = `Price: ₹${labelData.sellingPrice || '—'}`;
  const netWtText = `Net wt: ${labelData.weight || '—'}`;
  const leftMaxW = s(scale, layout.rightCol.x - layout.price.x - 12);

  const priceFitted = shrinkToFit(
    ctx,
    priceText,
    s(scale, layout.price.size) * fontScale,
    s(scale, layout.price.minSize) * fontScale,
    leftMaxW,
    layout.price.weight,
    FONT_LATIN
  );
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(priceFitted.text, s(scale, layout.price.x), s(scale, layout.price.y));

  const netFitted = shrinkToFit(
    ctx,
    netWtText,
    s(scale, layout.netWt.size) * fontScale,
    s(scale, layout.netWt.minSize) * fontScale,
    leftMaxW,
    layout.netWt.weight,
    FONT_LATIN
  );
  ctx.fillText(netFitted.text, s(scale, layout.netWt.x), s(scale, layout.netWt.y));

  const detailSize = s(scale, layout.rightCol.size) * fontScale;
  const detailX = s(scale, layout.rightCol.x);
  const detailY = s(scale, layout.rightCol.y);
  const detailGap = s(scale, layout.rightCol.lineGap);
  const detailMaxW = s(scale, REF_WIDTH_PX - SAFE_MARGIN_X - layout.rightCol.x);
  setFont(ctx, layout.rightCol.weight, detailSize, FONT_LATIN);
  ctx.textAlign = 'left';

  const packedFitted = shrinkToFit(
    ctx,
    `Pkd: ${labelData.packedDate || '—'}`,
    detailSize,
    detailSize * 0.75,
    detailMaxW,
    layout.rightCol.weight,
    FONT_LATIN
  );
  ctx.fillText(packedFitted.text, detailX, detailY);

  const batchFitted = shrinkToFit(
    ctx,
    `B: ${labelData.batchNo || '—'}`,
    detailSize,
    detailSize * 0.75,
    detailMaxW,
    layout.rightCol.weight,
    FONT_LATIN
  );
  ctx.fillText(batchFitted.text, detailX, detailY + detailGap);

  const shelfFitted = shrinkToFit(
    ctx,
    YASVIK_SHELF_LIFE,
    detailSize,
    detailSize * 0.7,
    detailMaxW,
    layout.rightCol.weight,
    FONT_LATIN
  );
  ctx.fillText(shelfFitted.text, detailX, detailY + detailGap * 2);

  drawFssaiFooter(ctx, scale, layout, labelData, fssaiLogo, settings);

  ctx.restore();
}
