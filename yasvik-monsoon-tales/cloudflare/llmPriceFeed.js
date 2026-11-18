import {
  buildLlmPriceCatalog,
  buildLlmPriceCsv,
  buildLlmPriceMarkdown,
} from '../lib/llmPriceFeedCore.mjs';

const PRODUCT_SELECT = [
  'id',
  'product_code',
  'name',
  'slug',
  'sku',
  'description',
  'short_description',
  'price',
  'discount_price',
  'currency',
  'stock_quantity',
  'is_published',
  'quick_variants',
  'category_id',
].join(',');

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

async function fetchPublishedProducts(env) {
  return supabaseFetch(
    env,
    `products?select=${PRODUCT_SELECT}&is_published=eq.true&order=sort_order.asc.nullslast,name.asc&limit=1000`,
  );
}

function cacheHeaders(contentType, filename) {
  return {
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
    'Content-Disposition': `inline; filename="${filename}"`,
    'X-Yasvik-Price-Source': 'quick_variants-current_price',
  };
}

export async function handleLlmPriceFeedRequest(request, env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return new Response('LLM price feed unavailable', { status: 503 });
  }

  const products = await fetchPublishedProducts(env);
  const catalog = buildLlmPriceCatalog(products, {
    siteOrigin: 'https://www.yasvik.com',
    updatedAt: new Date().toISOString(),
  });

  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api(?=\/|$)/, '') || '/';

  if (path.endsWith('.md')) {
    return new Response(buildLlmPriceMarkdown(catalog), {
      status: 200,
      headers: cacheHeaders('text/markdown; charset=utf-8', 'yasvik-llm-prices.md'),
    });
  }

  if (path.endsWith('.csv')) {
    return new Response(buildLlmPriceCsv(catalog), {
      status: 200,
      headers: cacheHeaders('text/csv; charset=utf-8', 'yasvik-llm-prices.csv'),
    });
  }

  return new Response(JSON.stringify(catalog, null, 2), {
    status: 200,
    headers: cacheHeaders('application/json; charset=utf-8', 'yasvik-llm-prices.json'),
  });
}
