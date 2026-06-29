/** Shrink font, then ellipsize if still wider than max width. */
export function fitTextToWidth(ctx, text, maxWidthPx, startPx, minPx, weight, family) {
  const value = String(text || '').trim();
  if (!value) return { text: '', size: startPx };

  let size = startPx;
  ctx.font = `${weight} ${size}px ${family}`;

  while (size > minPx && ctx.measureText(value).width > maxWidthPx) {
    size -= 0.5;
    ctx.font = `${weight} ${size}px ${family}`;
  }

  if (ctx.measureText(value).width <= maxWidthPx) {
    return { text: value, size };
  }

  let truncated = value;
  while (truncated.length > 1 && ctx.measureText(`${truncated}…`).width > maxWidthPx) {
    truncated = truncated.slice(0, -1);
  }

  return {
    text: truncated.length < value.length ? `${truncated}…` : truncated,
    size,
  };
}

export function splitProductTitleLines(text = '') {
  const raw = String(text || '').trim();
  if (!raw) return ['Product'];
  if (!raw.includes('/')) return [raw];

  const slashIndex = raw.indexOf('/');
  const line1 = raw.slice(0, slashIndex).trim();
  const line2 = raw.slice(slashIndex + 1).trim();

  if (line1 && line2) return [line1, line2];
  return [line1 || line2 || 'Product'];
}
