import { useCallback, useRef, useState } from 'react';

import OptimizedImage from '@/components/ui/OptimizedImage';

/**
 * Renders a slide image with an accurate CSS-transform crop applied on load.
 *
 * If `slide.crop` (react-image-crop % format) is present, it computes the
 * precise translate+scale needed to fill the container with exactly the
 * selected rectangle.  Falls back to objectPosition for slides without a crop.
 *
 * @param {{ url:string, x?:number, y?:number, crop?:{x,y,width,height,unit} }} slide
 * @param {string}  [className]   extra Tailwind classes for the outer div
 * @param {object}  [imgStyle]    extra inline styles on the <img> (e.g. for motion.img variants)
 */
export default function SlideCropImage({ slide, className = '', imgStyle = {} }) {
  const containerRef = useRef(null);
  const [transform, setTransform] = useState(null);

  const handleLoad = useCallback(
    (e) => {
      const crop = slide.crop;
      if (!crop || !crop.width || !containerRef.current) return;

      const img = e.target;
      const { naturalWidth: nW, naturalHeight: nH } = img;
      const el = containerRef.current;
      const cW = el.offsetWidth;
      const cH = el.offsetHeight;
      if (!cW || !cH) return;

      // crop values are percentages of the image's natural dimensions
      const { x: cx, y: cy, width: cw, height: ch } = crop;

      // How the image is displayed by object-fit: cover at scale=1:
      const imgAspect = nW / nH;
      const contAspect = cW / cH;
      let dW, dH;
      if (imgAspect > contAspect) {
        dH = cH; dW = cH * imgAspect;
      } else {
        dW = cW; dH = cW / imgAspect;
      }

      // Centre of the image content in img-element space (px)
      const imgOffsetX = (cW - dW) / 2; // negative if image wider than container
      const imgOffsetY = (cH - dH) / 2;

      // Crop centre in img-element space
      const cropCenterX = imgOffsetX + (cx / 100 + cw / 200) * dW;
      const cropCenterY = imgOffsetY + (cy / 100 + ch / 200) * dH;

      // Scale so the crop area covers the container (cover behaviour)
      const cropW = (cw / 100) * dW;
      const cropH = (ch / 100) * dH;
      const scale = Math.max(cW / cropW, cH / cropH);

      // Translate so crop centre lands at container centre
      // Formula: tx = scale * (cW/2 - cropCenterX)  (derived from transform-origin: 50% 50%)
      const tx = scale * (cW / 2 - cropCenterX);
      const ty = scale * (cH / 2 - cropCenterY);

      setTransform({ tx, ty, scale });
    },
    [slide.crop],
  );

  const hasCrop = Boolean(slide.crop && slide.crop.width);

  return (
    <div ref={containerRef} className={`absolute inset-0 overflow-hidden ${className}`}>
      <OptimizedImage
        src={slide.url}
        alt=""
        preset="banner"
        draggable={false}
        onLoad={handleLoad}
        className="absolute inset-0 h-full w-full object-cover"
        style={{
          objectPosition: hasCrop && transform ? '50% 50%' : `${slide.x ?? 50}% ${slide.y ?? 50}%`,
          transformOrigin: 'center center',
          transform: transform
            ? `translate(${transform.tx}px, ${transform.ty}px) scale(${transform.scale})`
            : 'none',
          ...imgStyle,
        }}
      />
    </div>
  );
}
