import { normalizeProductVariant } from '@/lib/productVariantUtils';
import { parseProductVariants } from '@/lib/productStockUtils';

function normalizeText(value = '') {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function lineProductId(line = {}) {
  return line.product_id || line.productId || null;
}

function lineVariantLabel(line = {}) {
  return String(line.variant || line.variant_label || line.unit || '').trim();
}

function snapshotLineKey(line = {}) {
  const productId = lineProductId(line);
  const variant = normalizeText(lineVariantLabel(line));
  const sku = normalizeText(line.sku);
  if (productId) return `p:${productId}::${variant || sku || 'default'}`;
  const title = normalizeText(line.title);
  if (!title) return null;
  return `t:${title}::${sku || variant || 'default'}`;
}

/** One pantry card per product — best variant by frequency, then recency. */
export function extractBuyAgainCandidates(orders = [], { limit = 8 } = {}) {
  const byProduct = new Map();

  const sortedOrders = [...orders].sort(
    (a, b) => new Date(b.created_date || b.created_at || 0) - new Date(a.created_date || a.created_at || 0),
  );

  for (const order of sortedOrders) {
    const orderAt = order.created_date || order.created_at || null;
    const snapshot = Array.isArray(order.items_snapshot) ? order.items_snapshot : [];

    for (const rawLine of snapshot) {
      if (!rawLine || rawLine.type === 'combo') continue;

      const productId = lineProductId(rawLine);
      const title = String(rawLine.title || '').trim();
      if (!productId && !title) continue;

      const productKey = productId
        ? `id:${productId}`
        : `title:${normalizeText(title)}`;

      const variantLabel = lineVariantLabel(rawLine);
      const qty = Number(rawLine.qty || 1) || 1;
      const line = {
        ...rawLine,
        productId,
        title,
        variant: variantLabel || rawLine.variant || null,
      };

      const existing = byProduct.get(productKey);
      if (!existing) {
        byProduct.set(productKey, {
          productKey,
          productId,
          title,
          line,
          orderCount: 1,
          totalQty: qty,
          lastOrderedAt: orderAt,
          variantStats: new Map([[normalizeText(variantLabel) || 'default', { label: variantLabel, orderCount: 1, lastOrderedAt: orderAt }]]),
        });
        continue;
      }

      existing.orderCount += 1;
      existing.totalQty += qty;
      if (orderAt && (!existing.lastOrderedAt || new Date(orderAt) > new Date(existing.lastOrderedAt))) {
        existing.lastOrderedAt = orderAt;
        existing.line = line;
      }

      const variantKey = normalizeText(variantLabel) || 'default';
      const variantStat = existing.variantStats.get(variantKey);
      if (variantStat) {
        variantStat.orderCount += 1;
        if (orderAt && (!variantStat.lastOrderedAt || new Date(orderAt) > new Date(variantStat.lastOrderedAt))) {
          variantStat.lastOrderedAt = orderAt;
        }
      } else {
        existing.variantStats.set(variantKey, {
          label: variantLabel,
          orderCount: 1,
          lastOrderedAt: orderAt,
        });
      }
    }
  }

  const ranked = [...byProduct.values()]
    .map((entry) => {
      const bestVariant = [...entry.variantStats.values()].sort((a, b) => {
        if (b.orderCount !== a.orderCount) return b.orderCount - a.orderCount;
        return new Date(b.lastOrderedAt || 0) - new Date(a.lastOrderedAt || 0);
      })[0];

      const preferredLine = {
        ...entry.line,
        variant: bestVariant?.label || entry.line.variant || null,
      };

      return {
        ...entry,
        line: preferredLine,
        preferredVariant: bestVariant?.label || null,
      };
    })
    .sort((a, b) => {
      if (b.orderCount !== a.orderCount) return b.orderCount - a.orderCount;
      return new Date(b.lastOrderedAt || 0) - new Date(a.lastOrderedAt || 0);
    });

  return ranked.slice(0, limit);
}

export function resolveReorderVariant(product, line = {}) {
  const variants = parseProductVariants(product).map((v) => normalizeProductVariant(v)).filter(Boolean);
  const targetSku = String(line.sku || '').trim();
  const targetLabel = lineVariantLabel(line);
  const targetPackKg = Number(line.pack_kg);

  if (targetSku) {
    const bySku = variants.find((v) => v.sku && v.sku === targetSku);
    if (bySku) return bySku;
  }

  if (targetLabel) {
    const normalized = normalizeText(targetLabel);
    const byLabel = variants.find((v) => normalizeText(v.label) === normalized);
    if (byLabel) return byLabel;
  }

  if (Number.isFinite(targetPackKg) && targetPackKg > 0) {
    const byPack = variants.find((v) => Number.isFinite(v.pack_kg) && Math.abs(v.pack_kg - targetPackKg) < 0.001);
    if (byPack) return byPack;
  }

  if (variants.length === 1) return variants[0];

  if (targetLabel || targetSku || Number.isFinite(targetPackKg)) {
    return normalizeProductVariant({
      label: targetLabel || undefined,
      sku: targetSku || undefined,
      pack_kg: Number.isFinite(targetPackKg) ? targetPackKg : undefined,
    });
  }

  return null;
}

export function buildReorderCartProduct(product, line = {}) {
  const variant = resolveReorderVariant(product, line);
  const sellPrice = variant?.price ?? product?.price ?? line.price ?? 0;

  return {
    product,
    variant,
    payload: {
      id: product?.id || lineProductId(line),
      productId: product?.id || lineProductId(line),
      title: product?.title || product?.name || line.title,
      price: sellPrice,
      hero_image: variant?.image_url || product?.hero_image || product?.featured_image_url || product?.image_url,
      unit: variant?.label || product?.unit || line.unit,
      sku: product?.sku,
    },
    qty: Number(line.qty || 1) || 1,
  };
}

/** Collapse title-only keys once catalog products are loaded. */
export function mergeBuyAgainByCatalog(candidates = [], products = []) {
  const productById = Object.fromEntries(products.map((p) => [p.id, p]));
  const titleToId = new Map();
  for (const product of products) {
    const titleKey = normalizeText(product.title || product.name);
    if (titleKey && !titleToId.has(titleKey)) titleToId.set(titleKey, product.id);
  }

  const merged = new Map();

  for (const candidate of candidates) {
    const resolvedId = candidate.productId || titleToId.get(normalizeText(candidate.title));
    const key = resolvedId ? `id:${resolvedId}` : candidate.productKey;
    const product = resolvedId ? productById[resolvedId] : null;

    const next = {
      ...candidate,
      productId: resolvedId || candidate.productId,
      product,
      line: {
        ...candidate.line,
        productId: resolvedId || candidate.productId,
      },
    };

    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, next);
      continue;
    }

    existing.orderCount += next.orderCount;
    existing.totalQty += next.totalQty;
    if (new Date(next.lastOrderedAt || 0) > new Date(existing.lastOrderedAt || 0)) {
      existing.lastOrderedAt = next.lastOrderedAt;
      existing.line = next.line;
      existing.preferredVariant = next.preferredVariant;
    }
  }

  return [...merged.values()].sort((a, b) => {
    if (b.orderCount !== a.orderCount) return b.orderCount - a.orderCount;
    return new Date(b.lastOrderedAt || 0) - new Date(a.lastOrderedAt || 0);
  });
}

export function buyAgainCardKey(candidate) {
  return candidate.productId || candidate.productKey || snapshotLineKey(candidate.line) || candidate.title;
}
