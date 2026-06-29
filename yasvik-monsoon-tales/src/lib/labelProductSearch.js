import { parsePackKg } from '@/lib/productVariantUtils';
import { buildVariantOptions } from '@/lib/labelProductOptions';

function productLabelSearchHaystack(product) {
  return [
    product.title,
    product.name,
    product.name_en,
    product.sku,
    product.telugu_name,
    ...buildVariantOptions(product).flatMap((v) => [v.sku, v.label]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

/** Parse "250 besan", "besan 500g", "1kg rice" into name + pack tokens. */
export function parseLabelSearchTokens(query) {
  const tokens = String(query || '')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  const nameTokens = [];
  const packKgTargets = [];

  for (const token of tokens) {
    const packKg = tokenToPackKg(token);
    if (packKg != null) {
      packKgTargets.push(packKg);
    } else {
      nameTokens.push(token);
    }
  }

  return { nameTokens, packKgTargets };
}

function tokenToPackKg(token) {
  const withUnit = token.match(/^(\d+(?:\.\d+)?)(kg|g|gm|gram|grams)$/);
  if (withUnit) {
    const amount = Number(withUnit[1]);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    return withUnit[2] === 'kg' ? amount : amount / 1000;
  }

  if (/^\d+(?:\.\d+)?$/.test(token)) {
    const n = Number(token);
    if (!Number.isFinite(n) || n <= 0) return null;
    // 250, 500 → grams; 1, 2, 5 → kg (typical grocery packs)
    if (n >= 100) return n / 1000;
    if (n <= 30) return n;
  }

  return null;
}

function variantPackKg(variant) {
  return variant.pack_kg ?? parsePackKg(variant, variant.label);
}

function packKgMatchesTarget(variant, targetKg) {
  const kg = variantPackKg(variant);
  if (kg != null && Math.abs(kg - targetKg) < 0.0005) return true;

  const grams = Math.round(targetKg * 1000);
  const label = String(variant.label || '').toLowerCase();
  return (
    label.includes(`${grams}g`)
    || label.includes(`${grams} g`)
    || label.includes(`${grams}gm`)
    || label === String(grams)
  );
}

export function resolveVariantIndexForPack(product, packKgTargets = []) {
  const variants = buildVariantOptions(product);
  if (!packKgTargets.length) return 0;

  const target = packKgTargets[0];
  const exact = variants.findIndex((v) => packKgMatchesTarget(v, target));
  if (exact >= 0) return exact;

  let best = 0;
  let bestDist = Infinity;
  variants.forEach((variant, index) => {
    const kg = variantPackKg(variant);
    const dist = kg != null ? Math.abs(kg - target) : Infinity;
    if (dist < bestDist) {
      bestDist = dist;
      best = index;
    }
  });
  return best;
}

function scoreProductMatch(product, query, nameTokens, packKgTargets) {
  const hay = productLabelSearchHaystack(product);
  const q = query.toLowerCase();

  if (String(product.sku || '').toLowerCase() === q) return 200;

  const variantSkuHit = buildVariantOptions(product).some(
    (v) => String(v.sku || '').toLowerCase() === q
  );
  if (variantSkuHit) return 190;

  if (hay.includes(q)) return 50 + (nameTokens.length ? 10 : 0);

  if (nameTokens.length) {
    const allMatch = nameTokens.every((token) => hay.includes(token));
    if (!allMatch) return 0;
  } else if (packKgTargets.length) {
    const hasPack = buildVariantOptions(product).some((v) =>
      packKgMatchesTarget(v, packKgTargets[0])
    );
    if (!hasPack) return 0;
    return 20;
  } else {
    return 0;
  }

  let score = 30;
  const title = String(product.title || product.name || '').toLowerCase();
  if (nameTokens.every((token) => title.includes(token))) score += 15;

  if (packKgTargets.length) {
    const variant = buildVariantOptions(product)[
      resolveVariantIndexForPack(product, packKgTargets)
    ];
    if (packKgMatchesTarget(variant, packKgTargets[0])) score += 25;
  }

  return score;
}

/**
 * Search products for label batch picker.
 * Supports "250 besan", "besan 500g", SKU, and plain product name.
 */
export function searchLabelProducts(products, query, limit = 12) {
  const q = String(query || '').trim();
  if (!q) {
    return products.slice(0, limit).map((product) => ({
      product,
      variantIndex: 0,
      score: 0,
    }));
  }

  const { nameTokens, packKgTargets } = parseLabelSearchTokens(q);

  return products
    .map((product) => ({
      product,
      variantIndex: resolveVariantIndexForPack(product, packKgTargets),
      score: scoreProductMatch(product, q, nameTokens, packKgTargets),
    }))
    .filter((row) => row.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score
        || String(a.product.title || a.product.name || '').localeCompare(
          String(b.product.title || b.product.name || '')
        )
    )
    .slice(0, limit);
}
