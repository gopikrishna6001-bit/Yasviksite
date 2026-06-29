import { appClient } from '@/api/appClient';
import { extractPosCodeFromScan, parsePosScanCode } from '@/lib/posScanCode';

/**
 * Yasvik label batch barcode: YV260619001-001
 * Label QR URL: https://www.yasvik.com/pos-scan?c=YV:SKU:price
 *
 * Plain SKU scans (e.g. TOOR-DAL) resolve via product-level products.sku first,
 * then variant SKUs for legacy labels. New shelf labels encode product SKU only.
 */
export function parseScanCode(raw) {
  const code = String(raw || '').trim();
  if (!code) return { kind: 'empty', code: '' };

  const embedded = extractPosCodeFromScan(code);
  if (embedded.startsWith('YV:')) {
    const parsed = parsePosScanCode(embedded);
    return {
      kind: 'pos_embedded',
      code: embedded,
      sku: parsed?.sku || null,
      productId: parsed?.productId || null,
      price: parsed?.price ?? null,
    };
  }

  if (/^YV\d{6,}-\d{3}$/i.test(code)) {
    return { kind: 'label_batch', code, barcodeValue: code };
  }

  return { kind: 'sku', code, sku: code };
}

export async function lookupLabelBarcode(barcodeValue) {
  const code = String(barcodeValue || '').trim();
  if (!code) return null;
  try {
    const rows = await appClient.entities.LabelItem.filter({ barcode_value: code }, '-created_date', 1);
    return rows?.[0] || null;
  } catch {
    return null;
  }
}

export async function markLabelItemsSold(barcodes = []) {
  const unique = [...new Set(barcodes.filter(Boolean))];
  const now = new Date().toISOString();
  await Promise.all(
    unique.map(async (barcode) => {
      try {
        const rows = await appClient.entities.LabelItem.filter({ barcode_value: barcode }, '-created_date', 5);
        await Promise.all(
          (rows || []).map((row) =>
            row.id
              ? appClient.entities.LabelItem.update(row.id, {
                  status: 'sold',
                  sold_at: now,
                })
              : Promise.resolve()
          )
        );
      } catch {
        /* non-blocking */
      }
    })
  );
}

export async function resolveScanToProduct(scanCode, catalog, options = {}) {
  const online = options.online !== false
    && (typeof navigator === 'undefined' || navigator.onLine);

  const local = resolveScanLocally(scanCode, catalog);
  if (local) return local;

  const parsed = parseScanCode(scanCode);
  if (parsed.kind === 'empty') return null;

  if (parsed.kind === 'label_batch' && online) {
    const label = await lookupLabelBarcode(parsed.barcodeValue);
    if (label?.product_id) {
      const hit = catalog.resolveProductVariant(label.product_id, label.variant_id);
      if (hit) {
        return {
          ...hit,
          labelBarcode: parsed.barcodeValue,
          scanSource: 'label_batch',
        };
      }
    }
  }

  return null;
}

/** Catalog-only resolution — works offline for product SKUs and legacy YV payloads. */
export function resolveScanLocally(scanCode, catalog) {
  const parsed = parseScanCode(scanCode);
  if (parsed.kind === 'empty') return null;

  if (parsed.kind === 'pos_embedded') {
    if (parsed.productId) {
      const product = catalog.byId.get(parsed.productId);
      if (product) {
        return {
          product,
          variant: null,
          priceOverride: Number.isFinite(parsed.price) ? parsed.price : null,
          scanSource: 'pos_embedded',
        };
      }
    }
    if (parsed.sku) {
      const hit = catalog.resolveBySku(parsed.sku);
      if (hit) {
        return {
          ...hit,
          priceOverride: Number.isFinite(parsed.price) ? parsed.price : null,
          scanSource: 'pos_embedded',
        };
      }
    }
  }

  const skuHit = catalog.resolveBySku(parsed.sku || parsed.code);
  if (skuHit) {
    return { ...skuHit, scanSource: 'sku' };
  }

  const searchHit = catalog.searchFirst(parsed.code);
  return searchHit ? { ...searchHit, scanSource: 'search' } : null;
}
