import { buildVariantOptions } from '@/lib/labelProductOptions';
import { isPricingMetaVariant } from '@/lib/productPricingMeta';
import {
  categoryHasTaggedProducts,
  expandCategoryFilterIds,
  listChildCategories,
  listRootCategories,
} from '@/lib/categoryTree';

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

  function productsInCategoryScope(categoryId) {
    if (!categoryId || categoryId === 'all') return published;
    if (categoryId === 'uncategorized') {
      return (byCategory.get('uncategorized') || []).slice();
    }
    const ids = expandCategoryFilterIds(categoryId, categories);
    const seen = new Set();
    const rows = [];
    for (const id of ids) {
      for (const product of byCategory.get(id) || []) {
        if (seen.has(product.id)) continue;
        seen.add(product.id);
        rows.push(product);
      }
    }
    return rows.sort((a, b) =>
      String(a.title || a.name || '').localeCompare(String(b.title || b.name || '')),
    );
  }

  // Prefer selectable leaves / roots that actually have products.
  // Skip empty parent aisles (children hold the products).
  const activeCats = (categories || []).filter((c) => c.is_active !== false);
  const roots = listRootCategories(activeCats);
  const chips = [];

  for (const root of roots) {
    const children = listChildCategories(root.id, activeCats);
    if (children.length) {
      for (const child of children) {
        if (!categoryHasTaggedProducts(child.id, activeCats, published)) continue;
        chips.push({
          ...child,
          products: productsInCategoryScope(child.id),
          parent_label: root.emotional_title || root.name,
        });
      }
      continue;
    }
    if (!categoryHasTaggedProducts(root.id, activeCats, published)) continue;
    chips.push({
      ...root,
      products: productsInCategoryScope(root.id),
    });
  }

  // Orphan subcategories (parent missing from list)
  for (const cat of activeCats) {
    if (!cat.parent_id) continue;
    if (roots.some((r) => r.id === cat.parent_id)) continue;
    if (!categoryHasTaggedProducts(cat.id, activeCats, published)) continue;
    if (chips.some((c) => c.id === cat.id)) continue;
    chips.push({
      ...cat,
      products: productsInCategoryScope(cat.id),
    });
  }

  chips.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)
    || String(a.emotional_title || a.name || '').localeCompare(String(b.emotional_title || b.name || '')));

  const uncategorized = (byCategory.get('uncategorized') || []).sort((a, b) =>
    String(a.title || a.name || '').localeCompare(String(b.title || b.name || '')),
  );

  function resolveBySku(sku) {
    if (!sku) return null;
    const key = String(sku).toLowerCase();
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
        || String(v.label || '').toLowerCase() === String(variantId).toLowerCase(),
    );
    return { product, variant: variant || null };
  }

  function search(query, limit = 36) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return published.slice(0, limit);
    const tokens = q.split(/\s+/).filter(Boolean);
    return published
      .filter((p) => {
        const hay = productSearchHaystack(p);
        return tokens.every((token) => hay.includes(token));
      })
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
    return productsInCategoryScope(categoryId);
  }

  return {
    products: published,
    byId,
    bySku,
    categoryList: chips,
    uncategorized,
    resolveBySku,
    resolveProductVariant,
    search,
    searchFirst,
    productsForCategory,
  };
}
