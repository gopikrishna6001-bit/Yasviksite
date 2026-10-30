/** Customer-facing cart line helpers — no internal stock/ops jargon. */

export function formatCartLineVariant(item = {}) {
  return String(item.variant || item.unit || '').trim();
}

export function getCartLineSavings(item = {}) {
  const price = Number(item.price);
  const compare = Number(item.compare_price);
  const qty = Math.max(1, Number(item.qty) || 1);
  if (!Number.isFinite(price) || !Number.isFinite(compare) || compare <= price) return null;

  const savePerUnit = compare - price;
  const pct = Math.round((savePerUnit / compare) * 100);
  if (pct < 1) return null;

  return {
    compare,
    savePerUnit,
    saveTotal: savePerUnit * qty,
    pct,
  };
}
