import { useCallback, useEffect, useRef } from 'react';
import { createLabelTemplateCanvas, ensureLabelTemplateFontsLoaded } from '@/lib/labelTemplate/renderLabelTemplate';

export default function LabelTemplatePreview({
  template,
  fieldValues,
  displayWidthPx = 360,
  showSafeMarginGuide = false,
  className = '',
}) {
  const canvasRef = useRef(null);
  const widthMm = template?.widthMm || 50;
  const heightMm = template?.heightMm || 25;
  const displayHeightPx = Math.round(displayWidthPx * (heightMm / widthMm));
  const dpi = 300;

  const paint = useCallback(async () => {
    if (!canvasRef.current || !template) return;
    const canvas = await createLabelTemplateCanvas(template, fieldValues, dpi, { showSafeMarginGuide });
    const target = canvasRef.current;
    target.width = canvas.width;
    target.height = canvas.height;
    const ctx = target.getContext('2d');
    ctx?.clearRect(0, 0, target.width, target.height);
    ctx?.drawImage(canvas, 0, 0);
  }, [template, fieldValues, showSafeMarginGuide]);

  useEffect(() => {
    let cancelled = false;
    ensureLabelTemplateFontsLoaded()
      .then(() => paint())
      .catch(() => paint());
    return () => {
      cancelled = true;
    };
  }, [paint]);

  if (!template) return null;

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
      aria-label={`Label template preview: ${template.name}`}
    />
  );
}
