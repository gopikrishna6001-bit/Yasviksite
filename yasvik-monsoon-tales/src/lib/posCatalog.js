import { buildVariantOptions } from '@/lib/labelProductOptions';
import { isPricingMetaVariant } from '@/lib/productPricingMeta';

function productSearchHaystack(product) {
  return [
    product.title,
    product.name,
    product.sku,
    product.local_name,
    product.telugu_name,
    ...(product.quick_variants || []).flatMap((v) => [v.sku, v.label]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function getSellableVariants(product) {
  return buildVariantOptions(product).filter((v) => v?.label && !isPricingMetaVariant(v));
}

export function buildPosCatalog(products = [], categories = []) {
  const published = products.filter((p) => p.is_published !== false);
  const byId = new Map(published.map((p) => [p.id, p]));
  const bySku = new Map();
  const byCategory = new Map();

  for (const product of published) {
    const catId = product.category_id || 'uncategorized';
    if (!byCategory.has(catId)) byCategory.set(catId, []);
    byCategory.get(catId).push(product);

    if (product.sku) {
      bySku.set(String(product.sku).toLowerCase(), { product, variant: null });
    }
    for (const variant of getSellableVariants(product)) {
      if (variant.sku) {
        bySku.set(String(variant.sku).toLowerCase(), { product, variant });
      }
    }
  }

  const categoryList = categories
    .filter((c) => c.is_active !== false)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map((c) => ({
      ...c,
      products: (byCategory.get(c.id) || []).sort((a, b) =>
        String(a.title || a.name || '').localeCompare(String(b.title || b.name || ''))
      ),
    }));

  const uncategorized = (byCategory.get('uncategorized') || []).sort((a, b) =>
    String(a.title || a.name || '').localeCompare(String(b.title || b.name || ''))
  );

  function resolveBySku(sku) {
    if (!sku) return null;
    const key = String(sku).toLowerCase();
    // Product-level SKU scans should open variant picker, not auto-pick a variant.
    for (const product of published) {
      if (product.sku && String(product.sku).toLowerCase() === key) {
        return { product, variant: null };
      }
    }
    return bySku.get(key) || null;
  }

  function resolveProductVariant(productId, variantId) {
    const product = byId.get(productId);
    if (!product) return null;
    if (!variantId) return { product, variant: null };
    const variants = getSellableVariants(product);
    const variant = variants.find(
      (v) =>
        String(v.sku || '').toLowerCase() === String(variantId).toLowerCase()
        || String(v.label || '').toLowerCase() === String(variantId).toLowerCase()
    );
    return { product, variant: variant || null };
  }

  function search(query, limit = 36) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return published.slice(0, limit);
    return published
      .filter((p) => productSearchHaystack(p).includes(q))
      .slice(0, limit);
  }

  function searchFirst(query) {
    const exactSku = resolveBySku(query);
    if (exactSku) return exactSku;
    const hits = search(query, 1);
    if (!hits.length) return null;
    const product = hits[0];
    const variants = getSellableVariants(product);
    return { product, variant: variants.length === 1 ? variants[0] : null };
  }

  function productsForCategory(categoryId) {
    if (!categoryId || categoryId === 'all') return published;
    if (categoryId === 'uncategorized') return uncategorized;
    return byCategory.get(categoryId) || [];
  }

  return {
    products: published,
    byId,
    bySku,
    categoryList,
    uncategorized,
    resolveBySku,
    resolveProductVariant,
    search,
    searchFirst,
    productsForCategory,
  };
}
