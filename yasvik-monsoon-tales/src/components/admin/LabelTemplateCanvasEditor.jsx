import { useEffect, useMemo, useRef } from 'react';
import { Move, ZoomIn } from 'lucide-react';
import LabelTemplatePreview from '@/components/admin/LabelTemplatePreview';
import {
  clampMm,
  displayPxToMm,
  getElementBoundsMm,
  getElementLabel,
  mmToDisplayPx,
} from '@/lib/labelTemplate/elementBounds';

export default function LabelTemplateCanvasEditor({
  template,
  fieldValues,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  showSafeMarginGuide = true,
  displayWidthPx = 480,
}) {
  const measureCtxRef = useRef(null);

  const widthMm = template?.widthMm || 50;
  const heightMm = template?.heightMm || 25;
  const displayHeightPx = Math.round(displayWidthPx * (heightMm / widthMm));

  useEffect(() => {
    const canvas = document.createElement('canvas');
    measureCtxRef.current = canvas.getContext('2d');
  }, []);

  const elementBoxes = useMemo(() => {
    const ctx = measureCtxRef.current;
    return (template?.elements || [])
      .filter((el) => el.visible !== false)
      .map((element) => {
        const bounds = getElementBoundsMm(element, fieldValues, template, ctx);
        return {
          element,
          label: getElementLabel(element),
          style: {
            left: mmToDisplayPx(bounds.leftMm, displayWidthPx, widthMm),
            top: mmToDisplayPx(bounds.topMm, displayWidthPx, widthMm),
            width: Math.max(4, mmToDisplayPx(bounds.widthMm, displayWidthPx, widthMm)),
            height: Math.max(4, mmToDisplayPx(bounds.heightMm, displayWidthPx, widthMm)),
          },
        };
      });
  }, [template, fieldValues, displayWidthPx, widthMm]);

  const dragRef = useRef(null);

  const handleStartDrag = (event, element, mode) => {
    event.preventDefault();
    event.stopPropagation();
    onSelectElement(element.id);

    const onPointerMove = (moveEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dxPx = moveEvent.clientX - drag.startClientX;
      const dyPx = moveEvent.clientY - drag.startClientY;
      const dxMm = displayPxToMm(dxPx, displayWidthPx, widthMm);
      const dyMm = displayPxToMm(dyPx, displayWidthPx, widthMm);

      if (drag.mode === 'move') {
        onUpdateElement(drag.elementId, {
          xMm: clampMm(Math.round((drag.startXMm + dxMm) * 10) / 10, 0, widthMm),
          yMm: clampMm(Math.round((drag.startYMm + dyMm) * 10) / 10, 0, heightMm),
        });
      } else if (drag.mode === 'resize-br') {
        const el = drag.element;
        if (el.type === 'field' || el.type === 'text') {
          onUpdateElement(drag.elementId, {
            fontSizeMm: clampMm(Math.round((drag.startFontSizeMm + dyMm * 0.85) * 10) / 10, 1.2, 8),
            maxWidthMm: clampMm(Math.round((drag.startMaxWidthMm + dxMm) * 10) / 10, 3, widthMm),
          });
        } else if (el.type === 'image') {
          onUpdateElement(drag.elementId, {
            heightMm: clampMm(Math.round((drag.startHeightMm + dyMm) * 10) / 10, 0.8, heightMm),
          });
        } else if (el.type === 'line') {
          onUpdateElement(drag.elementId, {
            widthMm: clampMm(Math.round((drag.startLineWidthMm + dxMm) * 10) / 10, 1, widthMm),
          });
        } else if (el.type === 'qr') {
          onUpdateElement(drag.elementId, {
            sizeMm: clampMm(Math.round((drag.startQrSizeMm + Math.max(dxMm, dyMm)) * 10) / 10, 4, Math.min(widthMm, heightMm)),
          });
        } else if (el.type === 'barcode') {
          onUpdateElement(drag.elementId, {
            widthMm: clampMm(Math.round((drag.startBarcodeWidthMm + dxMm) * 10) / 10, 10, widthMm),
            heightMm: clampMm(Math.round((drag.startBarcodeHeightMm + dyMm) * 10) / 10, 4, heightMm),
          });
        }
      } else if (drag.mode === 'resize-r') {
        const el = drag.element;
        if (el.type === 'field' || el.type === 'text') {
          onUpdateElement(drag.elementId, {
            maxWidthMm: clampMm(Math.round((drag.startMaxWidthMm + dxMm) * 10) / 10, 3, widthMm),
          });
        } else if (el.type === 'line') {
          onUpdateElement(drag.elementId, {
            widthMm: clampMm(Math.round((drag.startLineWidthMm + dxMm) * 10) / 10, 1, widthMm),
          });
        }
      }
    };

    const onPointerUp = () => {
      dragRef.current = null;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    dragRef.current = {
      elementId: element.id,
      element,
      mode,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startXMm: element.xMm,
      startYMm: element.yMm,
      startFontSizeMm: element.fontSizeMm || 2.5,
      startMaxWidthMm: element.maxWidthMm || widthMm,
      startHeightMm: element.heightMm || 2,
      startLineWidthMm: element.widthMm || 20,
      startQrSizeMm: element.sizeMm || 10,
      startBarcodeWidthMm: element.widthMm || 40,
      startBarcodeHeightMm: element.heightMm || 8,
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3 font-inter text-[11px] text-rain-cloud/55">
        <span className="inline-flex items-center gap-1"><Move className="h-3.5 w-3.5" /> Drag to move</span>
        <span className="inline-flex items-center gap-1"><ZoomIn className="h-3.5 w-3.5" /> Corner = size · orange dot = width</span>
        <span>Click canvas to deselect</span>
      </div>

      <div
        className="relative mx-auto select-none rounded-lg bg-[#ececec] p-4"
        style={{ width: displayWidthPx + 32, minHeight: displayHeightPx + 32 }}
        onPointerDown={() => onSelectElement('')}
      >
        <div className="relative mx-auto" style={{ width: displayWidthPx, height: displayHeightPx }}>
          <LabelTemplatePreview
            template={template}
            fieldValues={fieldValues}
            displayWidthPx={displayWidthPx}
            showSafeMarginGuide={showSafeMarginGuide}
            className="pointer-events-none"
          />

          {elementBoxes.map(({ element, label, style }) => {
            const selected = selectedElementId === element.id;
            const canResizeFont = element.type === 'field' || element.type === 'text';
            const canResizeWidth = canResizeFont || element.type === 'line';
            const canResizeBox = canResizeFont || element.type === 'image' || element.type === 'line' || element.type === 'qr' || element.type === 'barcode';

            return (
              <div
                key={element.id}
                className={`absolute touch-none ${selected ? 'z-20' : 'z-10'}`}
                style={style}
                onPointerDown={(e) => handleStartDrag(e, element, 'move')}
              >
                <div
                  className={`absolute inset-0 rounded-sm border-2 transition-colors cursor-move ${
                    selected
                      ? 'border-forest-canopy bg-forest-canopy/8'
                      : 'border-transparent hover:border-forest-canopy/35 hover:bg-forest-canopy/5'
                  }`}
                />
                {selected ? (
                  <span className="pointer-events-none absolute -top-5 left-0 whitespace-nowrap rounded bg-forest-canopy px-1.5 py-0.5 font-inter text-[10px] font-semibold text-white">
                    {label}
                  </span>
                ) : null}

                {selected && canResizeBox ? (
                  <div
                    role="presentation"
                    className="absolute -bottom-1.5 -right-1.5 z-30 h-3.5 w-3.5 cursor-se-resize rounded-sm border-2 border-white bg-forest-canopy shadow-md"
                    onPointerDown={(e) => handleStartDrag(e, element, 'resize-br')}
                  />
                ) : null}

                {selected && canResizeWidth ? (
                  <div
                    role="presentation"
                    className="absolute top-1/2 -right-1.5 z-30 h-3.5 w-3.5 -translate-y-1/2 cursor-e-resize rounded-full border-2 border-white bg-sun-dried-clay shadow-md"
                    onPointerDown={(e) => handleStartDrag(e, element, 'resize-r')}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
