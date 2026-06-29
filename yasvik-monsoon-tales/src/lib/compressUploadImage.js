/**
 * Client-side image compression before R2 upload.
 * Skips SVG/GIF/video; converts large raster images to WebP.
 */
const DEFAULTS = {
  maxWidth: 1400,
  maxHeight: 1400,
  quality: 0.78,
  minBytesToCompress: 200 * 1024,
};

function scaledDimensions(width, height, maxWidth, maxHeight) {
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height };
  }
  const ratio = Math.min(maxWidth / width, maxHeight / height);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Image compression failed'))),
      type,
      quality
    );
  });
}

/**
 * @param {File} file
 * @param {{ maxWidth?: number, maxHeight?: number, quality?: number, minBytesToCompress?: number }} [options]
 * @returns {Promise<File>}
 */
export async function prepareUploadFile(file, options = {}) {
  if (!(file instanceof File)) return file;

  const opts = { ...DEFAULTS, ...options };
  const type = file.type || '';

  if (!type.startsWith('image/')) return file;
  if (type === 'image/svg+xml' || type === 'image/gif' || type === 'image/webp') return file;
  if (file.size < opts.minBytesToCompress) return file;

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  const { width, height } = scaledDimensions(
    bitmap.width,
    bitmap.height,
    opts.maxWidth,
    opts.maxHeight
  );

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close?.();
    return file;
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  try {
    const blob = await canvasToBlob(canvas, 'image/webp', opts.quality);
    if (blob.size >= file.size) return file;

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'upload';
    return new File([blob], `${baseName}.webp`, {
      type: 'image/webp',
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}
