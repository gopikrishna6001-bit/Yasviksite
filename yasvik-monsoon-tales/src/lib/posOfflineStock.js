import { getVariantStockUnits } from '@/lib/productStockUtils';

function parseVariants(product) {
  const raw = product?.quick_variants ?? product?.variants ?? [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function findVariant(product, sku, label) {
  const variants = parseVariants(product);
  if (sku) {
    const bySku = variants.find((v) => String(v.sku || '').toLowerCase() === String(sku).toLowerCase());
    if (bySku) return bySku;
  }
  if (label) {
    const byLabel = variants.find((v) => String(v.label || '').toLowerCase() === String(label).toLowerCase());
    if (byLabel) return byLabel;
  }
  return variants[0] || null;
}

function variantStockUnits(variant, product) {
  return getVariantStockUnits(variant, product);
}

function sharedStockKg(product) {
  const kg = Number(product?.shared_stock_kg);
  return Number.isFinite(kg) && kg >= 0 ? kg : null;
}

function cartLineToItem(line) {
  return {
    product_id: line.productId,
    title: line.title,
    variant: line.variant,
    sku: line.sku,
    pack_kg: line.pack_kg,
    qty: line.qty,
    type: line.type || 'product',
  };
}

export function validateOfflineCartStock(cart = [], productsById = {}) {
  const stockItems = cart.filter(
    (line) => line.type !== 'combo' && line.type !== 'custom' && line.productId
  );

  for (const line of stockItems) {
    const product = productsById[line.productId];
    if (!product) {
      throw new Error(`Product not in offline catalog: ${line.title || line.productId}`);
    }

    const variant = findVariant(product, line.sku, line.variant);
    const qty = Number(line.qty || 1);
    const packKg = Number(line.pack_kg ?? variant?.pack_kg);
    const sharedKg = sharedStockKg(product);

    if (Number.isFinite(packKg) && packKg > 0 && sharedKg !== null) {
      const neededKg = packKg * qty;
      if (neededKg > sharedKg) {
        throw new Error(`Insufficient stock (offline) for ${line.title} (${variant?.label || 'default'})`);
      }
      continue;
    }

    const available = variantStockUnits(variant, product);
    if (qty > available) {
      throw new Error(
        `Only ${available} left (offline) for ${line.title}${variant?.label ? ` · ${variant.label}` : ''}`
      );
    }
  }
}

export function applyOfflineStockDeduction(products = [], cart = []) {
  const byId = Object.fromEntries(products.map((p) => [p.id, structuredCloneSafe(p)]));

  cart.forEach((line) => {
    if (line.type === 'combo' || line.type === 'custom' || !line.productId) return;
    const product = byId[line.productId];
    if (!product) return;

    const variant = findVariant(product, line.sku, line.variant);
    const qty = Number(line.qty || 1);
    const packKg = Number(line.pack_kg ?? variant?.pack_kg);
    const sharedKg = sharedStockKg(product);

    if (Number.isFinite(packKg) && packKg > 0 && sharedKg !== null) {
      product.shared_stock_kg = Math.max(0, Number((sharedKg - packKg * qty).toFixed(3)));
      return;
    }

    const variants = parseVariants(product);
    const variantIndex = variants.findIndex(
      (v) => v === variant || (variant?.sku && v.sku === variant.sku) || (variant?.label && v.label === variant.label)
    );

    if (variantIndex >= 0) {
      const current = variantStockUnits(variants[variantIndex], product);
      variants[variantIndex] = {
        ...variants[variantIndex],
        stock: Math.max(0, current - qty),
        visible_stock_units: Math.max(0, current - qty),
      };
      product.quick_variants = variants;
      product.variants = variants;
    } else if (Number.isFinite(Number(product.stock))) {
      product.stock = Math.max(0, Number(product.stock) - qty);
    } else if (Number.isFinite(Number(product.stock_quantity))) {
      product.stock_quantity = Math.max(0, Number(product.stock_quantity) - qty);
    }
  });

  return Object.values(byId);
}

function structuredCloneSafe(value) {
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value));
  }
}

export { cartLineToItem };
