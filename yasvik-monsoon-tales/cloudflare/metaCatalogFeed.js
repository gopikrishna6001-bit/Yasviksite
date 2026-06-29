import {
  buildMetaCatalogCsv,
  buildMetaCatalogRows,
} from '../lib/metaCatalogFeedCore.mjs';

const PRODUCT_SELECT = [
  'id',
  'product_code',
  'name',
  'slug',
  'sku',
  'local_name',
  'description',
  'short_description',
  'price',
  'discount_price',
  'currency',
  'stock_quantity',
  'is_published',
  'featured_image_url',
  'quick_variants',
  'seo_title',
  'seo_description',
].join(',');

function isAuthorized(request, env) {
  const token = String(env.META_CATALOG_FEED_TOKEN || '').trim();
  if (!token) return true;
  const url = new URL(request.url);
  return url.searchParams.get('token') === token;
}

async function fetchPublishedProducts(env) {
  const products = await supabaseFetch(
    env,
    `products?select=${PRODUCT_SELECT}&is_published=eq.true&order=sort_order.asc.nullslast,name.asc&limit=1000`,
  );

  if (!Array.isArray(products) || products.length === 0) return [];

  const productIds = products.map((row) => row.id).filter(Boolean);
  const idFilter = productIds.map((id) => encodeURIComponent(id)).join(',');
  const imageRows = await supabaseFetch(
    env,
    `product_images?select=product_id,image_url,sort_order,is_primary&product_id=in.(${idFilter})&order=sort_order.asc`,
  ).catch(() => []);

  const imagesByProduct = new Map();
  (imageRows || []).forEach((row) => {
    const list = imagesByProduct.get(row.product_id) || [];
    list.push(row);
    imagesByProduct.set(row.product_id, list);
  });

  return products.map((product) => {
    const imageList = imagesByProduct.get(product.id) || [];
    const primary = imageList.find((img) => img.is_primary) || imageList[0];
    const gallery = imageList.map((img) => img.image_url).filter(Boolean);
    return {
      ...product,
      featured_image_url: primary?.image_url || product.featured_image_url || '',
      images: gallery,
      hero_image: primary?.image_url || product.featured_image_url || gallery[0] || '',
    };
  });
}

async function supabaseFetch(env, path) {
  const url = `${env.SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data?.message || data?.error || `Supabase request failed: ${res.status}`;
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }
  return data;
}

export async function handleMetaCatalogFeedRequest(request, env) {
  if (!isAuthorized(request, env)) {
    return new Response('Unauthorized', { status: 401 });
  }

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return new Response('Catalog feed unavailable', { status: 503 });
  }

  const products = await fetchPublishedProducts(env);
  const mediaBase = String(env.MEDIA_PUBLIC_BASE || 'https://media.yasvik.com').replace(/\/$/, '');
  const csv = buildMetaCatalogCsv(products, {
    siteOrigin: 'https://www.yasvik.com',
    mediaBase,
  });

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Cache-Control': 'public, max-age=900',
      'Content-Disposition': 'inline; filename="yasvik-meta-catalog.csv"',
    },
  });
}

export async function getMetaCatalogStats(env) {
  const products = await fetchPublishedProducts(env);
  const rows = buildMetaCatalogRows(products, {
    siteOrigin: 'https://www.yasvik.com',
    mediaBase: String(env.MEDIA_PUBLIC_BASE || 'https://media.yasvik.com').replace(/\/$/, ''),
  });
  return {
    productCount: products.length,
    catalogItemCount: rows.length,
  };
}
