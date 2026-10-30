import { supabase } from '@/api/supabaseClient';
import { appClient } from '@/api/appClient';
import { products as productsApi } from '@/services/api';
import { attachComboV2ToBundles } from '@/services/comboV2Api';
import {
  BUNDLE_DISPLAY_LOCATIONS,
  orderProductsByIds,
  RELATION_TYPES,
} from '@/lib/productRelationUtils';

async function fetchProductsByIds(ids = []) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return [];

  const rows = await productsApi.filter({ id: unique, is_published: true }, 'sort_order', unique.length);
  return orderProductsByIds(rows, unique);
}

/** Includes drafts; attaches title/hero aliases + product_images via appClient. */
async function fetchCatalogueProductsByIds(ids = []) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return [];
  const rows = await appClient.entities.Product.filter({ id: unique }, 'sort_order', unique.length);
  return orderProductsByIds(rows || [], unique);
}

export async function fetchProductRelations(productId, relationType, limit = 4) {
  if (!productId) return [];

  const { data: relations, error } = await supabase
    .from('product_related')
    .select('related_product_id, sort_order')
    .eq('product_id', productId)
    .eq('relation_type', relationType)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .limit(limit);

  if (error) {
    console.warn('product_related fetch failed', error.message);
    return [];
  }

  const ids = (relations || []).map((row) => row.related_product_id);
  return fetchProductsByIds(ids);
}

async function fetchSameCategoryFallback(productId, limit = 4) {
  const { data: product, error } = await supabase
    .from('products')
    .select('id, category_id')
    .eq('id', productId)
    .maybeSingle();

  if (error) {
    console.warn('product fallback lookup failed', error.message);
  }

  let rows = [];
  if (product?.category_id) {
    rows = await productsApi.listByCategory(product.category_id, limit + 6);
  } else {
    rows = await productsApi.listPublished('sort_order', limit + 6);
  }

  return rows.filter((row) => row.id !== productId).slice(0, limit);
}

export async function fetchFrequentlyBoughtTogether(productId, limit = 3) {
  const related = await fetchProductRelations(productId, RELATION_TYPES.FREQUENTLY_BOUGHT, limit);
  if (related.length) return related;
  return fetchSameCategoryFallback(productId, limit);
}

export async function fetchCompleteYourBasket(productId, limit = 4) {
  const related = await fetchProductRelations(productId, RELATION_TYPES.COMPLETE_BASKET, limit);
  if (related.length) return related;
  return fetchSameCategoryFallback(productId, limit);
}

export async function fetchActiveBundles({ location = null, limit = 3, productId = null } = {}) {
  let query = supabase
    .from('product_bundles')
    .select('id, bundle_name, bundle_slug, bundle_description, bundle_type, display_locations, sort_order, parent_product_id, item_count, total_net_weight_g, bundle_status, inventory_mode, combo_merch_category, purpose_label, audience_tags, worth_paise, has_customer_options')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .limit(Math.max(limit * 4, 12));

  const { data: bundles, error } = await query;
  if (error) {
    console.warn('product_bundles fetch failed', error.message);
    return [];
  }

  let list = (bundles || []).filter((bundle) => {
    // Hide unresolved empty shells from shop merchandising.
    if (bundle.bundle_status === 'unresolved') return false;
    if (Number(bundle.item_count) === 0 && bundle.bundle_type === 'bundle_combo') return false;
    return true;
  });

  if (location && BUNDLE_DISPLAY_LOCATIONS.includes(location)) {
    list = list.filter((bundle) => {
      const locs = bundle.display_locations || [];
      if (locs.includes(location)) return true;
      // Sellable catalogue combos (dry-fruit etc.) should appear on shop/home
      // even when originally tagged only for product/category PDP surfaces.
      if (
        (location === 'home' || location === 'category')
        && (bundle.parent_product_id || bundle.bundle_type === 'bundle_combo')
      ) {
        return true;
      }
      return false;
    });
  }

  if (productId) {
    const { data: bundleItems } = await supabase
      .from('product_bundle_items')
      .select('bundle_id')
      .eq('product_id', productId);

    const bundleIds = new Set((bundleItems || []).map((row) => row.bundle_id));
    if (bundleIds.size) {
      const matched = list.filter((bundle) => bundleIds.has(bundle.id));
      if (matched.length) list = matched;
    }
  }

  return list.slice(0, limit);
}

/** Shop Combos tab / leading strip — catalogue product_bundles with contents. */
export async function fetchShopCatalogueBundles({ limit = 12 } = {}) {
  const rows = await fetchActiveBundlesWithProducts({
    location: 'home',
    limit: Math.max(limit * 3, 24),
  });
  return rows
    .filter((bundle) => {
      const parent = bundle.parent_product;
      if (!parent?.id) return false;
      // Storefront only — never surface draft/unpublished combo parents.
      if (parent.is_published === false) return false;
      return true;
    })
    .slice(0, limit);
}

/** Other published combos for a combo PDP (excludes the current parent product). */
export async function fetchSuggestedCombos({ excludeProductId = null, limit = 4 } = {}) {
  const rows = await fetchShopCatalogueBundles({ limit: Math.max(limit + 6, 12) });
  return rows
    .filter((bundle) => {
      const parent = bundle.parent_product;
      if (!parent?.id) return false;
      if (excludeProductId && parent.id === excludeProductId) return false;
      if (Number(parent.price) <= 0) return false;
      if (parent.sell_online === false) return false;
      return true;
    })
    .slice(0, limit);
}

export async function fetchActiveBundlesWithProducts({ location = null, limit = 3, productId = null } = {}) {
  const bundles = await fetchActiveBundles({ location, limit, productId });
  if (!bundles.length) return [];

  const bundleIds = bundles.map((bundle) => bundle.id);
  const { data: items, error: itemsError } = await supabase
    .from('product_bundle_items')
    .select('bundle_id, product_id, sort_order, quantity_value, quantity_unit, pack_count, component_title_snapshot, component_variant_sku, is_active, item_role, display_group, gift_worth_paise')
    .in('bundle_id', bundleIds)
    .order('sort_order', { ascending: true });

  if (itemsError) {
    console.warn('product_bundle_items fetch failed', itemsError.message);
    return bundles;
  }

  const productIds = [...new Set((items || []).map((row) => row.product_id).filter(Boolean))];
  // Always hydrate via appClient so hero/title aliases and product_images attach
  // (raw supabase rows omit hero_image and gallery → blank mosaics/cart thumbs).
  const products = await fetchCatalogueProductsByIds(productIds);
  const productsById = new Map(products.map((row) => [row.id, row]));

  const parentIds = [...new Set(bundles.map((b) => b.parent_product_id).filter(Boolean))];
  const parents = parentIds.length ? await fetchCatalogueProductsByIds(parentIds) : [];
  const parentsById = new Map(parents.map((row) => [row.id, row]));

  const hydrated = bundles.map((bundle) => {
    const bundleItems = (items || []).filter((row) => row.bundle_id === bundle.id && row.is_active !== false);
    const product_ids = bundleItems.map((row) => row.product_id);
    const bundleProducts = orderProductsByIds(
      product_ids.map((id) => productsById.get(id)).filter(Boolean),
      product_ids,
    );
    return {
      ...bundle,
      items: bundleItems,
      product_ids,
      products: bundleProducts,
      parent_product: bundle.parent_product_id
        ? parentsById.get(bundle.parent_product_id) || null
        : null,
    };
  });

  return attachComboV2ToBundles(hydrated, fetchCatalogueProductsByIds);
}

async function hydrateBundleItems(bundle, { includeDraftComponents = false } = {}) {
  if (!bundle?.id) return null;

  const { data: items, error: itemsError } = await supabase
    .from('product_bundle_items')
    .select('*')
    .eq('bundle_id', bundle.id)
    .order('sort_order', { ascending: true });

  if (itemsError) throw itemsError;

  const activeItems = (items || []).filter((item) => item.is_active !== false);
  const productIds = [...new Set(activeItems.map((item) => item.product_id).filter(Boolean))];

  let products = [];
  if (productIds.length) {
    // Always attach linked components (incl. drafts) with images for mosaics / What’s Inside.
    products = await fetchCatalogueProductsByIds(productIds);
  }

  const hydrated = {
    ...bundle,
    items: activeItems,
    products,
  };

  const [withV2] = await attachComboV2ToBundles([hydrated], fetchCatalogueProductsByIds);
  return withV2 || hydrated;
}

export async function fetchBundleBySlug(slug) {
  const { data: bundle, error } = await supabase
    .from('product_bundles')
    .select('*')
    .eq('bundle_slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw error;
  if (!bundle) return null;
  return hydrateBundleItems(bundle);
}

/**
 * Bundles that include this catalogue product (for "Available in these Yasvik Combos").
 * Hydrates items + component products + parent product for retail savings.
 */
export async function fetchBundlesContainingProduct(productId, { limit = 6 } = {}) {
  if (!productId) return [];

  const { data: itemRows, error } = await supabase
    .from('product_bundle_items')
    .select('bundle_id')
    .eq('product_id', productId)
    .eq('is_active', true);

  if (error) {
    console.warn('fetchBundlesContainingProduct items failed', error.message);
    return [];
  }

  const bundleIds = [...new Set((itemRows || []).map((row) => row.bundle_id).filter(Boolean))];
  if (!bundleIds.length) return [];

  const { data: bundles, error: bundlesError } = await supabase
    .from('product_bundles')
    .select('*')
    .in('id', bundleIds)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .limit(limit * 2);

  if (bundlesError) {
    console.warn('fetchBundlesContainingProduct bundles failed', bundlesError.message);
    return [];
  }

  const list = (bundles || []).filter((bundle) => {
    if (bundle.bundle_status === 'unresolved') return false;
    if (!bundle.parent_product_id && bundle.bundle_type !== 'bundle_combo') return false;
    return true;
  });

  const hydrated = [];
  for (const bundle of list.slice(0, limit)) {
    const full = await hydrateBundleItems(bundle, { includeDraftComponents: false });
    if (!full) continue;

    let parentProduct = null;
    if (bundle.parent_product_id) {
      const parents = await fetchCatalogueProductsByIds([bundle.parent_product_id]);
      parentProduct = parents[0] || null;
    }

    hydrated.push({
      ...full,
      parent_product: parentProduct,
    });
  }

  return hydrated.filter((row) => row.parent_product?.id);
}

/** Bundle linked to a sellable parent product (dry-fruit packaged combo). */
export async function fetchBundleForProduct(productId, { includeDraftComponents = true } = {}) {
  if (!productId) return null;

  const { data: byParent, error } = await supabase
    .from('product_bundles')
    .select('*')
    .eq('parent_product_id', productId)
    .maybeSingle();

  if (error) {
    console.warn('fetchBundleForProduct failed', error.message);
    return null;
  }

  let bundle = byParent;
  if (!bundle) {
    const { data: product } = await supabase
      .from('products')
      .select('bundle_id')
      .eq('id', productId)
      .maybeSingle();
    if (product?.bundle_id) {
      const { data } = await supabase
        .from('product_bundles')
        .select('*')
        .eq('id', product.bundle_id)
        .maybeSingle();
      bundle = data;
    }
  }

  if (!bundle) return null;
  return hydrateBundleItems(bundle, { includeDraftComponents });
}

export async function saveProductBundle({
  parentProductId,
  bundleId = null,
  bundle = {},
  items = [],
} = {}) {
  if (!parentProductId) throw new Error('parentProductId is required');

  const payload = {
    bundle_name: String(bundle.bundle_name || bundle.bundleName || '').trim() || 'Bundle',
    bundle_slug: String(bundle.bundle_slug || bundle.bundleSlug || '').trim() || null,
    bundle_description: String(bundle.bundle_description || '').trim() || null,
    bundle_type: bundle.bundle_type || 'bundle_combo',
    display_locations: bundle.display_locations || ['product', 'category'],
    is_active: bundle.is_active !== false,
    sort_order: Number(bundle.sort_order) || 0,
    parent_product_id: parentProductId,
    bundle_status: bundle.bundle_status || 'draft',
    inventory_mode: bundle.inventory_mode || 'prepacked_stock',
    packaging_mode: bundle.packaging_mode || 'separately_packed',
    substitution_policy: bundle.substitution_policy || null,
    total_net_weight_g: bundle.total_net_weight_g ?? null,
    item_count: Number(bundle.item_count) || (items || []).filter((row) => row?.is_active !== false).length,
    outer_packaging_cost_paise: Number(bundle.outer_packaging_cost_paise) || 0,
    has_unresolved_components: Boolean(bundle.has_unresolved_components),
    mapping_notes: bundle.mapping_notes || null,
    combo_merch_category: bundle.combo_merch_category || null,
    purpose_label: bundle.purpose_label || null,
    audience_tags: Array.isArray(bundle.audience_tags) ? bundle.audience_tags : [],
    worth_paise: bundle.worth_paise != null ? Number(bundle.worth_paise) : null,
    has_customer_options: Boolean(bundle.has_customer_options),
    updated_at: new Date().toISOString(),
  };

  let savedBundle;
  if (bundleId) {
    const { data, error } = await supabase
      .from('product_bundles')
      .update(payload)
      .eq('id', bundleId)
      .select('*')
      .single();
    if (error) throw error;
    savedBundle = data;
  } else {
    const { data, error } = await supabase
      .from('product_bundles')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw error;
    savedBundle = data;
  }

  await supabase.from('product_bundle_items').delete().eq('bundle_id', savedBundle.id);

  const rows = (Array.isArray(items) ? items : [])
    .filter((row) => row?.product_id || row?.productId)
    .map((row, index) => ({
      bundle_id: savedBundle.id,
      product_id: row.product_id || row.productId,
      sort_order: Number(row.sort_order ?? index) || index,
      is_required: row.is_required !== false,
      component_variant_sku: row.component_variant_sku || row.variantSku || null,
      component_title_snapshot: row.component_title_snapshot || row.title || null,
      quantity_value: Number(row.quantity_value ?? row.quantityValue) || null,
      quantity_unit: row.quantity_unit || row.quantityUnit || 'g',
      pack_count: Math.max(1, Number(row.pack_count ?? row.packCount) || 1),
      substitution_allowed: Boolean(row.substitution_allowed ?? row.substitutionAllowed),
      is_active: row.is_active !== false,
    }));

  if (rows.length) {
    const { error: insertError } = await supabase.from('product_bundle_items').insert(rows);
    if (insertError) throw insertError;
  }

  await supabase
    .from('products')
    .update({ bundle_id: savedBundle.id, updated_at: new Date().toISOString() })
    .eq('id', parentProductId);

  return fetchBundleForProduct(parentProductId, { includeDraftComponents: true });
}

export async function fetchCartCrossSell(cartProductIds = [], limit = 3) {
  const ids = [...new Set(cartProductIds.filter(Boolean))];
  if (!ids.length) return [];

  const { data: relations, error } = await supabase
    .from('product_related')
    .select('related_product_id, sort_order')
    .in('product_id', ids)
    .eq('relation_type', RELATION_TYPES.COMPLETE_BASKET)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .limit(limit * 4);

  if (error) return [];

  const cartSet = new Set(ids);
  const relatedIds = [];
  for (const row of relations || []) {
    if (cartSet.has(row.related_product_id)) continue;
    if (relatedIds.includes(row.related_product_id)) continue;
    relatedIds.push(row.related_product_id);
    if (relatedIds.length >= limit) break;
  }

  return fetchProductsByIds(relatedIds);
}
