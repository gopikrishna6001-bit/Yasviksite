import { useEffect, useRef } from 'react';
import { createA4SheetCanvas } from '@/lib/priceLabelGenerator';

export default function PriceLabelSheetPreview({ labelQueue, gridOptions, maxWidthPx = 360 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      if (!canvasRef.current || !labelQueue?.length) return;
      const { canvas } = await createA4SheetCanvas(labelQueue, gridOptions, 180);
      if (cancelled) return;

      const target = canvasRef.current;
      target.width = canvas.width;
      target.height = canvas.height;
      const ctx = target.getContext('2d');
      ctx.clearRect(0, 0, target.width, target.height);
      ctx.drawImage(canvas, 0, 0);
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [labelQueue, gridOptions]);

  if (!labelQueue?.length) return null;

  return (
    <canvas
      ref={canvasRef}
      className="mx-auto block rounded-lg border border-border/40 bg-white shadow-sm"
      style={{
        width: maxWidthPx,
        height: Math.round(maxWidthPx * (297 / 210)),
        maxWidth: '100%',
      }}
      aria-label="A4 sticker sheet preview"
    />
  );
}
