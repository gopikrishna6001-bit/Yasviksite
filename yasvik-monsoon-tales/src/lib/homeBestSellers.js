import { appClient } from '@/api/appClient';
import { supabase } from '@/api/supabaseClient';
import { listSellableVariants } from '@/lib/productVariantUtils';
import { filterOnlineProducts } from '@/lib/productVisibility';
import { products as productsApi } from '@/services/api';
import { fetchAllAppSettings, resolveSetting } from '@/services/settingsService';

export const HOME_BEST_SELLERS_SETTING_KEY = 'home_best_sellers';

// Sales ranking only counts as "reliable" when at least this many distinct
// products sold in the window; otherwise fall back to curated picks.
export const POPULAR_SALES_MIN_PRODUCTS = 4;
export const POPULAR_SALES_DAYS = 90;

/**
 * Ranked product ids from completed POS + website sales over the last N days.
 * Backed by the `get_popular_product_sales` SQL function (excludes pending,
 * cancelled, failed, refunded and best-effort test orders).
 * Returns [] when the RPC is missing or errors, so callers can fall back.
 */
export async function fetchPopularProductSalesIds({
  daysBack = POPULAR_SALES_DAYS,
  maxProducts = 24,
} = {}) {
  try {
    const { data, error } = await supabase.rpc('get_popular_product_sales', {
      days_back: daysBack,
      max_products: maxProducts,
    });
    if (error || !Array.isArray(data)) return [];
    return data
      .map((row) => String(row?.product_id || '').trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function parseBestSellerPicks(value) {
  if (value == null || value === '') return [];

  let raw = value;
  if (typeof value === 'string') {
    try {
      raw = JSON.parse(value);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(raw)) return [];

  return raw
    .map((row, index) => ({
      product_id: String(row?.product_id || row?.productId || '').trim(),
      variant_label: String(row?.variant_label || row?.variantLabel || '').trim(),
      order: Number(row?.order ?? row?.sort ?? index + 1) || index + 1,
    }))
    .filter((row) => row.product_id)
    .sort((a, b) => a.order - b.order || a.product_id.localeCompare(b.product_id));
}

export function resolveBestSellerCarouselItems(picks = [], productsById = new Map()) {
  return picks
    .map((pick) => {
      const product = productsById.get(pick.product_id);
      if (!product) return null;
      return {
        ...product,
        preferredVariantLabel: pick.variant_label || undefined,
      };
    })
    .filter(Boolean);
}

export function picksFromFeaturedProducts(products = []) {
  return products
    .filter((product) => product?.id && product.is_featured)
    .sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0))
    .map((product, index) => ({
      product_id: product.id,
      variant_label: '',
      order: index + 1,
    }));
}

export function getBestSellerPicksFromSettings(settings = []) {
  return parseBestSellerPicks(resolveSetting(settings, HOME_BEST_SELLERS_SETTING_KEY, []));
}

async function fetchPublishedProductsByIds(ids = [], limit = 12) {
  if (!ids.length) return [];
  return filterOnlineProducts(await appClient.entities.Product.filter(
    { is_published: true, sell_online: true, id: ids },
    'sort_order',
    Math.max(ids.length, limit),
  ));
}

/**
 * "Popular at Yasvik" products, in order of preference:
 * 1. Real completed sales across POS + website (last 90 days) when reliable.
 * 2. Manually curated picks from the `home_best_sellers` setting.
 * 3. Featured products as the last resort.
 */
export async function fetchHomeBestSellerProducts({ settings = null, featuredLimit = 12 } = {}) {
  const salesIds = await fetchPopularProductSalesIds({ maxProducts: featuredLimit * 2 });
  if (salesIds.length >= POPULAR_SALES_MIN_PRODUCTS) {
    const products = await fetchPublishedProductsByIds(salesIds, featuredLimit);
    const byId = new Map(products.map((product) => [product.id, product]));
    const ranked = salesIds.map((id) => byId.get(id)).filter(Boolean);
    if (ranked.length >= POPULAR_SALES_MIN_PRODUCTS) return ranked.slice(0, featuredLimit);
  }

  const rows = settings || await fetchAllAppSettings();
  const picks = getBestSellerPicksFromSettings(rows);

  if (picks.length > 0) {
    const ids = [...new Set(picks.map((pick) => pick.product_id))];
    const products = await fetchPublishedProductsByIds(ids, featuredLimit);
    const byId = new Map(products.map((product) => [product.id, product]));
    const resolved = resolveBestSellerCarouselItems(picks, byId);
    if (resolved.length > 0) return resolved.slice(0, featuredLimit);
  }

  return productsApi.listFeatured(featuredLimit);
}

export function variantOptionsForProduct(product = {}) {
  return listSellableVariants(product);
}
