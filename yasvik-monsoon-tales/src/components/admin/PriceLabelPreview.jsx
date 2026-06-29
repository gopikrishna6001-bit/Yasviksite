import { useCallback, useEffect, useRef } from 'react';
import {
  drawLabel,
  ensureLabelFontsLoaded,
  LABEL_HEIGHT_MM,
  LABEL_WIDTH_MM,
  mmToPx,
} from '@/lib/priceLabelGenerator';

const PREVIEW_DPI = 240;

export default function PriceLabelPreview({
  labelData,
  displayWidthPx = 320,
  transparent = false,
  className = '',
}) {
  const canvasRef = useRef(null);
  const displayHeightPx = Math.round(displayWidthPx * (LABEL_HEIGHT_MM / LABEL_WIDTH_MM));

  const paint = useCallback(() => {
    if (!canvasRef.current || !labelData) return;
    const widthPx = mmToPx(LABEL_WIDTH_MM, PREVIEW_DPI);
    const heightPx = mmToPx(LABEL_HEIGHT_MM, PREVIEW_DPI);
    const canvas = canvasRef.current;
    canvas.width = widthPx;
    canvas.height = heightPx;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawLabel(ctx, widthPx, heightPx, labelData, { transparent });
  }, [labelData, transparent]);

  useEffect(() => {
    paint();
    let cancelled = false;
    ensureLabelFontsLoaded()
      .then(() => {
        if (!cancelled) paint();
      })
      .catch(() => {
        if (!cancelled) paint();
      });
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
      aria-label={`Price label preview for ${labelData.productName}`}
    />
  );
}
