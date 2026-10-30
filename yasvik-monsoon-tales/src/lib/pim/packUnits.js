import { parsePackKg, parsePackPieces } from '@/lib/productVariantUtils';
import { isPricingMetaVariant } from '@/lib/productPricingMeta';
import { normalizeProductSku } from '@/lib/productSku';

/** Split pack into quantity + unit for the master workbook. */
export function splitPackQuantityUnit(variant = {}, measureType = 'kg') {
  const label = String(variant.label || '').trim();
  const packKg = parsePackKg(variant.pack_kg ?? variant, label);

  const text = label.toLowerCase();
  if (/\bml\b|millilitre|milliliter/.test(text)) {
    const m = text.match(/(\d+(?:\.\d+)?)\s*ml/);
    if (m) return { pack_quantity: Number(m[1]), pack_unit: 'ml', display_pack: `${m[1]} ml` };
  }
  if (/\b(l|lt|ltr|litre|liter)s?\b/.test(text) && !/\bml\b/.test(text)) {
    const m = text.match(/(\d+(?:\.\d+)?)\s*(?:l|lt|ltr|litre|liter)s?\b/);
    if (m) {
      const q = Number(m[1]);
      return { pack_quantity: q, pack_unit: 'L', display_pack: q === 1 ? '1 L' : `${q} L` };
    }
  }
  if (/\bg\b|gram/.test(text) && !/\bkg\b/.test(text)) {
    const m = text.match(/(\d+(?:\.\d+)?)\s*(?:g|gm|gram|grams)\b/);
    if (m) return { pack_quantity: Number(m[1]), pack_unit: 'g', display_pack: `${m[1]} g` };
  }
  if (/\bkg\b/.test(text)) {
    const m = text.match(/(\d+(?:\.\d+)?)\s*kg\b/);
    if (m) {
      const q = Number(m[1]);
      return { pack_quantity: q, pack_unit: 'kg', display_pack: q === 1 ? '1 kg' : `${q} kg` };
    }
  }

  const pieces = parsePackPieces(variant.pack_kg ?? variant, label);
  if (pieces != null && (measureType === 'units' || /\bpc|pcs|piece|pack of\b/i.test(label))) {
    return {
      pack_quantity: pieces,
      pack_unit: 'pcs',
      display_pack: pieces === 1 ? '1 pc' : `${pieces} pcs`,
    };
  }

  if (packKg != null && packKg > 0) {
    if (measureType === 'L') {
      if (packKg < 1) {
        const ml = Math.round(packKg * 1000);
        return { pack_quantity: ml, pack_unit: 'ml', display_pack: `${ml} ml` };
      }
      return {
        pack_quantity: packKg,
        pack_unit: 'L',
        display_pack: packKg === 1 ? '1 L' : `${packKg} L`,
      };
    }
    if (packKg < 1) {
      const g = Math.round(packKg * 1000);
      return { pack_quantity: g, pack_unit: 'g', display_pack: `${g} g` };
    }
    return {
      pack_quantity: packKg,
      pack_unit: 'kg',
      display_pack: packKg === 1 ? '1 kg' : `${packKg} kg`,
    };
  }

  return {
    pack_quantity: null,
    pack_unit: '',
    display_pack: label || '',
  };
}

export function listSellablePackVariants(product = {}) {
  const raw = Array.isArray(product.quick_variants) ? product.quick_variants : [];
  return raw.filter((v) => v && !isPricingMetaVariant(v));
}

export function suggestPackSku(productSku, displayPack, usedLower = new Set()) {
  const base = normalizeProductSku(productSku) || 'YAS-PACK';
  const packPart = String(displayPack || 'PACK')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 16) || 'PACK';
  let candidate = `${base}-${packPart}`.slice(0, 40);
  let n = 2;
  while (usedLower.has(candidate.toLowerCase())) {
    candidate = `${base}-${packPart}-${n}`.slice(0, 40);
    n += 1;
  }
  return candidate;
}

export function mapProductStatus(product = {}) {
  if (product.is_published === false) return 'Draft';
  if (product.sell_online === false) return 'Temporarily Unavailable';
  const stock = Number(product.shared_stock_kg ?? product.stock_quantity ?? product.stock);
  if (Number.isFinite(stock) && stock <= 0) return 'Out of Stock';
  return 'Published';
}
