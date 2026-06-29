import { useCallback, useEffect, useRef } from 'react';
import { drawSeznikLabel, ensureSeznikFontsLoaded, SEZNIK_DPI } from '@/lib/seznikLabelGenerator';
import { ensureFssaiLogoLoaded } from '@/lib/yasvikSeznikLabelLayout';
import { LABEL_HEIGHT_MM, LABEL_WIDTH_MM, mmToPx } from '@/lib/priceLabelGenerator';

export default function SeznikLabelPreview({
  labelData,
  settings = {},
  displayWidthPx = 340,
  className = '',
}) {
  const canvasRef = useRef(null);
  const widthMm = settings.labelWidthMm || LABEL_WIDTH_MM;
  const heightMm = settings.labelHeightMm || LABEL_HEIGHT_MM;
  const displayHeightPx = Math.round(displayWidthPx * (heightMm / widthMm));

  const paint = useCallback(async () => {
    if (!canvasRef.current || !labelData) return;
    const widthPx = mmToPx(widthMm, SEZNIK_DPI);
    const heightPx = mmToPx(heightMm, SEZNIK_DPI);
    const canvas = canvasRef.current;
    canvas.width = widthPx;
    canvas.height = heightPx;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const fssaiLogoImage = await ensureFssaiLogoLoaded();
    drawSeznikLabel(ctx, widthPx, heightPx, labelData, { ...settings, fssaiLogoImage });
  }, [labelData, settings, widthMm, heightMm]);

  useEffect(() => {
    let cancelled = false;
    ensureSeznikFontsLoaded()
      .then(() => paint())
      .catch(() => paint());
    return () => {
      cancelled = true;
    };
  }, [paint]);

  if (!labelData) return null;

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        width: displayWidthPx,
        height: displayHeightPx,
        display: 'block',
        maxWidth: '100%',
        background: '#fff',
        border: '1px solid #ddd',
      }}
      aria-label={`Seznik label preview for ${labelData.nameTe || labelData.nameEn}`}
    />
  );
}
