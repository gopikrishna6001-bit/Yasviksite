/** POS QR / scan payload helpers — shared by labels and counter POS. */

export const POS_SCAN_LANDING_URL = 'https://www.yasvik.com/pos-scan';

export function buildPosScanCode(product, variant, price) {
  const sku = String(variant?.sku || product?.sku || '').trim();
  const token = sku || (product?.id ? `pid.${product.id}` : '');
  if (!token) return null;
  const p = Number(price ?? variant?.price ?? product?.price);
  return Number.isFinite(p) && p > 0 ? `YV:${token}:${Math.round(p)}` : `YV:${token}`;
}

/** URL payload for label QR — opens on phone; POS scanner types full URL. */
export function buildPosScanQrPayload(product, variant, price) {
  const inner = buildPosScanCode(product, variant, price);
  if (!inner) return '';
  return `${POS_SCAN_LANDING_URL}?c=${encodeURIComponent(inner)}`;
}

export function extractPosCodeFromScan(raw) {
  const code = String(raw || '').trim();
  if (!code) return '';

  if (code.startsWith('YV:')) return code;

  if (/yasvik\.com|pos-scan/i.test(code) || code.startsWith('http')) {
    try {
      const url = new URL(code.includes('://') ? code : `https://${code.replace(/^\/+/, '')}`);
      const c = url.searchParams.get('c');
      if (c) return decodeURIComponent(c).trim();
      const sku = url.searchParams.get('sku');
      const p = url.searchParams.get('p');
      if (sku) return p ? `YV:${sku}:${p}` : `YV:${sku}`;
    } catch {
      /* fall through */
    }
  }

  return code;
}

export function parsePosScanCode(posCode) {
  const code = extractPosCodeFromScan(posCode);
  if (!code || !code.startsWith('YV:')) return null;
  const parts = code.split(':');
  const token = parts[1] || '';
  const price = parts[2] ? Number(parts[2]) : null;
  if (token.startsWith('pid.')) {
    return { productId: token.slice(4), sku: null, price };
  }
  return { productId: null, sku: token, price };
}

export function formatSerialNo(index) {
  return String(Math.max(1, Number(index) || 1)).padStart(3, '0');
}

export function buildBatchBarcodeValue(batchNo, serialNo) {
  return `${String(batchNo).trim()}-${formatSerialNo(serialNo)}`;
}
