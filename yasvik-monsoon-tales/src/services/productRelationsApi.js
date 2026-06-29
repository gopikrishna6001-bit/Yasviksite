import { supabase } from '@/api/supabaseClient';
import { products as productsApi } from '@/services/api';
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

export async function fetchFrequentlyBoughtTogether(productId, limit = 3) {
  return fetchProductRelations(productId, RELATION_TYPES.FREQUENTLY_BOUGHT, limit);
}

export async function fetchCompleteYourBasket(productId, limit = 4) {
  return fetchProductRelations(productId, RELATION_TYPES.COMPLETE_BASKET, limit);
}

export async function fetchActiveBundles({ location = null, limit = 3, productId = null } = {}) {
  let query = supabase
    .from('product_bundles')
    .select('id, bundle_name, bundle_slug, bundle_description, bundle_type, display_locations, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .limit(limit * 3);

  const { data: bundles, error } = await query;
  if (error) {
    console.warn('product_bundles fetch failed', error.message);
    return [];
  }

  let list = bundles || [];
  if (location && BUNDLE_DISPLAY_LOCATIONS.includes(location)) {
    list = list.filter((bundle) => (bundle.display_locations || []).includes(location));
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

export async function fetchBundleBySlug(slug) {
  const { data: bundle, error } = await supabase
    .from('product_bundles')
    .select('*')
    .eq('bundle_slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw error;
  if (!bundle) return null;

  const { data: items, error: itemsError } = await supabase
    .from('product_bundle_items')
    .select('product_id, sort_order, is_required')
    .eq('bundle_id', bundle.id)
    .order('sort_order', { ascending: true });

  if (itemsError) throw itemsError;

  const productIds = (items || []).map((item) => item.product_id);
  const products = await fetchProductsByIds(productIds);

  return {
    ...bundle,
    items: items || [],
    products,
  };
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
