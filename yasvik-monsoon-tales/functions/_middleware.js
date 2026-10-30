import {
  buildProductSeoMeta,
  injectProductSeoIntoHtml,
  isSearchBot,
} from '../lib/productSeoCore.mjs';
import {
  categoryShopPath,
  resolveCategorySlugParam,
  normalizeSeoSlug,
} from '../src/lib/seoEntity.js';

const BOT_CACHE_TTL_MS = 5 * 60 * 1000;
const botHtmlCache = new Map();
const categoryRouteCache = new Map();

function getEnv(env, key, fallback = '') {
  return String(env?.[key] || fallback).trim();
}

async function fetchProductBySlug(env, slugOrId) {
  const supabaseUrl = getEnv(env, 'VITE_SUPABASE_URL', getEnv(env, 'SUPABASE_URL', 'https://cpksnpuavywbmhrzglyh.supabase.co'));
  const anonKey = getEnv(env, 'VITE_SUPABASE_ANON_KEY', getEnv(env, 'SUPABASE_ANON_KEY'));
  if (!anonKey) return null;

  const key = encodeURIComponent(String(slugOrId || '').trim());
  if (!key) return null;

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slugOrId);
  const filter = isUuid ? `id=eq.${key}` : `slug=eq.${key}`;
  const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/products?select=*&${filter}&is_published=eq.true&limit=1`;

  const headers = {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
  };

  let res = await fetch(url, { headers });
  if (!res.ok) return null;
  let rows = await res.json();
  let product = rows?.[0];

  // Resolve legacy product URL aliases (soft-retired slugs).
  if (!product && !isUuid) {
    const aliasRes = await fetch(
      `${supabaseUrl.replace(/\/$/, '')}/rest/v1/product_slug_aliases?select=product_id&old_slug=eq.${key}&limit=1`,
      { headers },
    );
    if (aliasRes.ok) {
      const aliases = await aliasRes.json();
      const productId = aliases?.[0]?.product_id;
      if (productId) {
        const byIdRes = await fetch(
          `${supabaseUrl.replace(/\/$/, '')}/rest/v1/products?select=*&id=eq.${encodeURIComponent(productId)}&is_published=eq.true&limit=1`,
          { headers },
        );
        if (byIdRes.ok) {
          rows = await byIdRes.json();
          product = rows?.[0];
        }
      }
    }
  }

  if (!product) return null;

  return {
    ...product,
    title: product.name || product.title,
    hero_image: product.featured_image_url || product.hero_image,
    stock: product.stock_quantity ?? product.stock,
  };
}

async function fetchJson(env, resourcePath) {
  const supabaseUrl = getEnv(env, 'VITE_SUPABASE_URL', getEnv(env, 'SUPABASE_URL', 'https://cpksnpuavywbmhrzglyh.supabase.co'));
  const anonKey = getEnv(env, 'VITE_SUPABASE_ANON_KEY', getEnv(env, 'SUPABASE_ANON_KEY'));
  if (!anonKey) return null;

  const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}${resourcePath}`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  });
  if (!res.ok) return null;
  return res.json();
}

async function loadCategoryRouteMap(env) {
  const cacheKey = 'category-routes';
  const cached = categoryRouteCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const [categories, aliases] = await Promise.all([
    fetchJson(env, '/rest/v1/categories?select=*&is_active=eq.true&limit=200'),
    fetchJson(env, '/rest/v1/category_slug_aliases?select=old_slug,category_id&limit=200'),
  ]);

  const byId = new Map((categories || []).map((category) => [category.id, category]));
  const value = {
    byDbSlug: new Map(),
    byLegacySlug: new Map(),
    byId,
  };

  for (const category of categories || []) {
    if (category.parent_id) continue;
    const dbSlug = resolveCategorySlugParam(category.slug || category.name || '');
    if (!dbSlug) continue;
    value.byDbSlug.set(dbSlug, category);
    value.byLegacySlug.set(normalizeSeoSlug(category.slug || ''), category);
    if (category.seo_slug) value.byLegacySlug.set(normalizeSeoSlug(category.seo_slug), category);
  }

  for (const alias of aliases || []) {
    const category = byId.get(alias.category_id);
    if (!category) continue;
    value.byLegacySlug.set(normalizeSeoSlug(alias.old_slug || ''), category);
  }

  categoryRouteCache.set(cacheKey, {
    value,
    expiresAt: Date.now() + BOT_CACHE_TTL_MS,
  });
  return value;
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  if (url.pathname.startsWith('/shop')) {
    const routeMap = await loadCategoryRouteMap(env);
    const queryCategory = url.searchParams.get('category');
    if (queryCategory) {
      const byId = routeMap.byId.get(queryCategory);
      const bySlug = routeMap.byDbSlug.get(resolveCategorySlugParam(queryCategory));
      const resolved = byId || bySlug || routeMap.byLegacySlug.get(normalizeSeoSlug(queryCategory));
      if (resolved) {
        return Response.redirect(new URL(categoryShopPath(resolved), url.origin), 301);
      }
    }

    const slug = decodeURIComponent(url.pathname.replace(/^\/shop\/?/, '').replace(/\/$/, ''));
    if (slug) {
      const resolved = routeMap.byLegacySlug.get(normalizeSeoSlug(slug))
        || routeMap.byDbSlug.get(resolveCategorySlugParam(slug));
      if (resolved) {
        const canonicalPath = categoryShopPath(resolved);
        if (canonicalPath !== url.pathname) {
          return Response.redirect(new URL(canonicalPath, url.origin), 301);
        }
      }
    }

    return next();
  }

  if (!url.pathname.startsWith('/product/')) {
    return next();
  }

  const userAgent = request.headers.get('User-Agent') || '';
  if (!isSearchBot(userAgent)) {
    return next();
  }

  const slug = decodeURIComponent(url.pathname.replace(/^\/product\//, '').replace(/\/$/, ''));
  const cacheKey = slug;
  const cached = botHtmlCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return new Response(cached.html, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=300',
      },
    });
  }

  const response = await next();
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) {
    return response;
  }

  const product = await fetchProductBySlug(env, slug);
  if (!product) {
    return response;
  }

  const html = await response.text();
  const seo = buildProductSeoMeta(product);
  const price = Number(product.price || 0);
  const inStock = Number(product.stock_quantity ?? product.stock ?? 1) > 0;
  const injected = injectProductSeoIntoHtml(html, product, { price, inStock });

  botHtmlCache.set(cacheKey, {
    html: injected,
    expiresAt: Date.now() + BOT_CACHE_TTL_MS,
  });

  return new Response(injected, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=300',
    },
  });
}
