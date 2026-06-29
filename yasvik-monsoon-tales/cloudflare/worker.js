import { handleMetaCatalogFeedRequest } from './metaCatalogFeed.js';

const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/(www\.)?yasvik\.com$/,
  /^https:\/\/yasvik\.pages\.dev$/,
  /^https:\/\/[a-f0-9]+\.yasvik\.pages\.dev$/,
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
];

function isAllowedOrigin(origin) {
  if (!origin) return false;
  return ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin));
}

function corsHeaders(request) {
  const origin = request.headers.get('Origin');
  if (!origin || !isAllowedOrigin(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    Vary: 'Origin',
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/^\/api(?=\/|$)/, '') || '/';

    if (request.method === 'OPTIONS') {
      return json({}, 204, request);
    }

    if (request.method === 'POST' && pathname === '/webhooks/razorpay') {
      try {
        return await razorpayWebhook(request, env);
      } catch (error) {
        return new Response(error?.message || 'Webhook failed', { status: 500 });
      }
    }

    if (request.method === 'POST' && pathname === '/media/upload') {
      try {
        const data = await uploadMediaToR2(request, env);
        return json(data, 200, request);
      } catch (error) {
        const status = error?.status || 500;
        return json({ error: error?.message || 'Upload failed' }, status, request);
      }
    }

    if (request.method === 'POST' && pathname === '/media/delete') {
      try {
        const data = await deleteMediaFromR2(request, env);
        return json(data, 200, request);
      } catch (error) {
        const status = error?.status || 500;
        return json({ error: error?.message || 'Delete failed' }, status, request);
      }
    }

    if (request.method === 'GET' && pathname === '/catalog/meta-feed.csv') {
      try {
        return await handleMetaCatalogFeedRequest(request, env);
      } catch (error) {
        return json({ error: error?.message || 'Catalog feed failed' }, 500, request);
      }
    }

    if (request.method === 'GET' && pathname === '/media/private') {
      try {
        return await servePrivateMedia(request, env);
      } catch (error) {
        const status = error?.status || 500;
        return json({ error: error?.message || 'Serve failed' }, status, request);
      }
    }

    if (request.method === 'POST' && pathname === '/media/signed-url') {
      try {
        const payload = await request.json().catch(() => ({}));
        const data = await createMediaSignedUrl(payload, env, request);
        return json(data, 200, request);
      } catch (error) {
        const status = error?.status || 500;
        return json({ error: error?.message || 'Signed URL failed' }, status, request);
      }
    }

    if (request.method === 'POST' && pathname.startsWith('/functions/')) {
      const fnName = pathname.replace('/functions/', '');
      const payload = await request.json().catch(() => ({}));

      const handlers = {
        razorpayCreateOrder: async (p) => razorpayCreateOrder(p, env, request),
        razorpayVerifyPayment: async (p) => razorpayVerifyPayment(p, env, request),
        razorpayCreateSubscription: async (p) => razorpayCreateSubscription(p, env, request),
        razorpayHealth: async (p) => razorpayHealth(p, env, request),
        createPosSale: async (p) => createPosSale(p, env, request),
        validateDeliveryPincode: async (p) => validateDeliveryPincode(p, env),
        lookupPostalPincode: async (p) => lookupPostalPincode(p),
        syncDeliveryZones: async (p) => syncDeliveryZones(p, env, request),
        getOrderTrackingDetails: async (p) => getOrderTrackingDetails(p, env),
        sendOrderNotification: async (p) => sendOrderNotification(p, env),
        sendEmail: async (p) => sendEmail(p, env),
        generateImage: async (p) => notImplemented('generateImage', p),
      };

      const handler = handlers[fnName];
      if (!handler) {
        return json({ error: `Unknown function: ${fnName}` }, 404, request);
      }

      try {
        const data = await handler(payload, env, request);
        return json(data, 200, request);
      } catch (error) {
        return json({ error: error?.message || 'Function failed' }, 500, request);
      }
    }

    if (pathname === '/' || pathname === '') {
      return json({ ok: true, message: 'Yasvik Cloudflare API online' }, 200, request);
    }

    return json({ error: 'Not found' }, 404, request);
  },
};

function json(data, status = 200, request = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...(request ? corsHeaders(request) : {}),
    },
  });
}

function notImplemented(name, payload) {
  return {
    success: false,
    error: `${name} is not implemented on Cloudflare Worker yet`,
    payload,
  };
}

function requireEnv(env, keys) {
  const missing = keys.filter((key) => !env[key]);
  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
}

function supabaseHeaders(env, prefer = {}) {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    ...prefer,
  };
}

async function supabaseFetch(env, path, init = {}) {
  requireEnv(env, ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
  const url = `${env.SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      ...supabaseHeaders(env),
      ...(init.headers || {}),
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data?.message || data?.error || data?.hint || `Supabase request failed: ${res.status}`;
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }
  return data;
}

async function getAuthUser(request, env) {
  const auth = request?.headers?.get?.('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) return null;
  return res.json().catch(() => null);
}

async function requireStaffUser(request, env) {
  const user = await getAuthUser(request, env);
  if (!user?.id) {
    const err = new Error('Authentication required');
    err.status = 401;
    throw err;
  }

  let role = user?.app_metadata?.role || user?.user_metadata?.role;

  if (!['admin', 'staff'].includes(role)) {
    const profiles = await supabaseFetch(
      env,
      `user_profiles?select=role,is_active&id=eq.${encodeURIComponent(user.id)}&limit=1`
    );
    const profile = profiles?.[0];
    if (profile && profile.is_active !== false) {
      role = profile.role;
    }
  }

  if (!['admin', 'staff'].includes(role)) {
    const err = new Error('Admin access required');
    err.status = 403;
    throw err;
  }

  return { user, role };
}

const MEDIA_UPLOAD_BUCKETS = new Set([
  'media-assets',
  'product-images',
  'story-images',
  'person-images',
  'recipe-images',
  'journey-images',
  'user-uploads',
]);

const MEDIA_MAX_BYTES = 25 * 1024 * 1024;

function mediaPublicBase(env) {
  return String(env.MEDIA_PUBLIC_BASE || 'https://media.yasvik.com').replace(/\/$/, '');
}

function sanitizeUploadFilename(name = '') {
  const base = String(name).split(/[/\\]/).pop() || 'file';
  return base.replace(/[^\w.\-() ]+/g, '_').slice(0, 120);
}

const MEDIA_FOLDER_ALLOWLIST = new Set([
  'products',
  'categories',
  'combos',
  'heroes',
  'stories',
  'people',
  'illustrations',
  'brand',
  'customers',
  'general',
]);

function slugifyForPath(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\w.\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'asset';
}

function buildSeoMediaStem(options = {}) {
  const folder = String(options.folder || 'general').trim().toLowerCase();
  const seoName = slugifyForPath(options.seoName || options.entitySlug || '');
  const assetRole = slugifyForPath(options.assetRole || '');
  const fallback = slugifyForPath(String(options.fallbackName || '').replace(/\.[^.]+$/, ''));
  const subject = seoName || fallback;
  const parts = [];

  if (['products', 'categories', 'combos', 'brand', 'customers'].includes(folder)) {
    parts.push('yasvik');
  }
  if (subject) parts.push(subject);
  if (assetRole && assetRole !== subject && !subject.endsWith(`-${assetRole}`)) {
    parts.push(assetRole);
  }

  return parts.join('-') || 'yasvik-asset';
}

async function resolveUniqueObjectKey(bucket, env, stem, ext) {
  const safeExt = String(ext || 'webp').replace(/[^\w]+/g, '') || 'webp';
  const basePath = `${bucket}/${stem}.${safeExt}`;

  const head = await env.MEDIA_BUCKET.head(basePath);
  if (!head) return basePath;

  for (let version = 2; version < 100; version += 1) {
    const candidate = `${bucket}/${stem}-${version}.${safeExt}`;
    const exists = await env.MEDIA_BUCKET.head(candidate);
    if (!exists) return candidate;
  }

  return `${bucket}/${stem}-${Date.now()}.${safeExt}`;
}

function normalizeMediaFolder(folder = '') {
  const value = String(folder || 'general').trim().toLowerCase();
  return MEDIA_FOLDER_ALLOWLIST.has(value) ? value : 'general';
}

function buildMediaObjectKey(bucket, originalName, folder = 'general', options = {}) {
  const ext = originalName.includes('.') ? originalName.split('.').pop() : 'bin';
  const safeExt = ext.replace(/[^\w]+/g, '') || 'bin';
  const safeFolder = normalizeMediaFolder(folder);
  const stem = `${safeFolder}/${buildSeoMediaStem({
    folder: safeFolder,
    seoName: options.seoName,
    entitySlug: options.entitySlug,
    assetRole: options.assetRole,
    fallbackName: originalName,
  })}`;
  return { objectKey: `${bucket}/${stem}.${safeExt}`, stem, safeExt, safeFolder };
}

async function buildUniqueMediaObjectKey(bucket, originalName, folder = 'general', options = {}, env) {
  const { stem, safeExt } = buildMediaObjectKey(bucket, originalName, folder, options);
  const uniqueKey = await resolveUniqueObjectKey(bucket, env, stem, safeExt);
  return uniqueKey;
}

async function requireAuthenticatedUser(request, env) {
  const user = await getAuthUser(request, env);
  if (!user?.id) {
    const err = new Error('Authentication required');
    err.status = 401;
    throw err;
  }
  return user;
}

async function uploadMediaToR2(request, env) {
  if (!env.MEDIA_BUCKET) {
    const err = new Error('Media storage is not configured');
    err.status = 503;
    throw err;
  }

  const user = await requireAuthenticatedUser(request, env);
  const form = await request.formData();
  const file = form.get('file');
  const bucket = String(form.get('bucket') || 'media-assets').trim();
  const folder = normalizeMediaFolder(form.get('folder'));
  const isPrivate = String(form.get('private') || '0') === '1';

  if (!(file instanceof File)) {
    const err = new Error('Missing file');
    err.status = 400;
    throw err;
  }

  if (!MEDIA_UPLOAD_BUCKETS.has(bucket)) {
    const err = new Error('Invalid upload bucket');
    err.status = 400;
    throw err;
  }

  if (file.size > MEDIA_MAX_BYTES) {
    const err = new Error('File exceeds 25MB limit');
    err.status = 413;
    throw err;
  }

  const originalName = sanitizeUploadFilename(file.name);
  const seoName = String(form.get('seo_name') || form.get('entity_slug') || '').trim();
  const assetRole = String(form.get('asset_role') || '').trim();
  const objectKey = await buildUniqueMediaObjectKey(
    bucket,
    originalName,
    folder,
    { seoName, assetRole, entitySlug: seoName },
    env,
  );

  await env.MEDIA_BUCKET.put(objectKey, file.stream(), {
    httpMetadata: {
      contentType: file.type || 'application/octet-stream',
      cacheControl: 'public, max-age=31536000, immutable',
    },
    customMetadata: {
      uploaded_by: user.id,
      original_name: originalName,
    },
  });

  if (isPrivate || bucket === 'user-uploads') {
    return { file_uri: objectKey };
  }

  return {
    file_url: `${mediaPublicBase(env)}/${objectKey}`,
    file_path: objectKey,
    mime_type: file.type || null,
    file_size: file.size,
    original_name: originalName,
    folder,
  };
}

function normalizeStorageKey(input = '') {
  let value = String(input || '').trim();
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://')) {
    try {
      const url = new URL(value);
      value = decodeURIComponent(url.pathname.replace(/^\//, ''));
    } catch {
      return '';
    }
  }
  return value.replace(/^\/+/, '').replace(/^yasvik-media\//, '');
}

function isAllowedDeleteKey(key = '') {
  const allowedPrefixes = [
    'media-assets/',
    'product-images/',
    'story-images/',
    'person-images/',
    'journey-images/',
    'recipe-images/',
    'user-uploads/',
  ];
  return allowedPrefixes.some((prefix) => key.startsWith(prefix));
}

async function deleteMediaFromR2(request, env) {
  if (!env.MEDIA_BUCKET) {
    const err = new Error('Media storage is not configured');
    err.status = 503;
    throw err;
  }

  await requireStaffUser(request, env);
  const payload = await request.json().catch(() => ({}));
  const keys = [...new Set(
    [
      ...(Array.isArray(payload.file_paths) ? payload.file_paths : []),
      payload.file_path,
      payload.file_url,
    ]
      .map(normalizeStorageKey)
      .filter(Boolean),
  )];

  if (!keys.length) {
    const err = new Error('Missing file_path');
    err.status = 400;
    throw err;
  }

  for (const key of keys) {
    if (!isAllowedDeleteKey(key)) {
      const err = new Error(`Forbidden storage key: ${key}`);
      err.status = 403;
      throw err;
    }
  }

  const results = [];
  for (const key of keys) {
    const head = await env.MEDIA_BUCKET.head(key);
    if (!head) {
      results.push({ key, deleted: false, missing: true });
      continue;
    }
    await env.MEDIA_BUCKET.delete(key);
    results.push({ key, deleted: true, bytes: head.size || 0 });
  }

  const deletedBytes = results.filter((row) => row.deleted).reduce((sum, row) => sum + (row.bytes || 0), 0);
  return {
    deleted: results.filter((row) => row.deleted).length,
    deleted_bytes: deletedBytes,
    results,
  };
}

async function servePrivateMedia(request, env) {
  if (!env.MEDIA_BUCKET) {
    const err = new Error('Media storage is not configured');
    err.status = 503;
    throw err;
  }

  await requireAuthenticatedUser(request, env);
  const key = new URL(request.url).searchParams.get('key') || '';
  if (!key.startsWith('user-uploads/')) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }

  const object = await env.MEDIA_BUCKET.get(key);
  if (!object) {
    const err = new Error('Not found');
    err.status = 404;
    throw err;
  }

  return new Response(object.body, {
    status: 200,
    headers: {
      'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
      'Cache-Control': 'private, max-age=60',
      ...corsHeaders(request),
    },
  });
}

async function createMediaSignedUrl(payload, env, request) {
  await requireAuthenticatedUser(request, env);
  const fileUri = String(payload?.file_uri || '').trim();
  const expiresIn = Number(payload?.expires_in || 300);

  if (!fileUri) {
    const err = new Error('file_uri is required');
    err.status = 400;
    throw err;
  }

  if (fileUri.startsWith('user-uploads/')) {
    const origin = new URL(request.url).origin;
    return {
      signed_url: `${origin}/api/media/private?key=${encodeURIComponent(fileUri)}`,
      expires_in: expiresIn,
    };
  }

  const publicUrl = fileUri.startsWith('http')
    ? fileUri
    : `${mediaPublicBase(env)}/${fileUri.replace(/^\//, '')}`;

  return { signed_url: publicUrl, expires_in: expiresIn };
}

function generateOrderNumber() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `YV${yy}${mm}${dd}${seq}`;
}

function parseVariants(product) {
  const raw = product?.quick_variants ?? product?.variants ?? [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function findVariant(product, sku, label) {
  const variants = parseVariants(product);
  if (sku) {
    const bySku = variants.find((v) => String(v.sku || '').toLowerCase() === String(sku).toLowerCase());
    if (bySku) return bySku;
  }
  if (label) {
    const byLabel = variants.find((v) => String(v.label || '').toLowerCase() === String(label).toLowerCase());
    if (byLabel) return byLabel;
  }
  return variants[0] || null;
}

function variantStockUnits(variant, product) {
  const vStock = Number(variant?.stock ?? variant?.visible_stock_units);
  if (Number.isFinite(vStock) && vStock >= 0) return vStock;
  const pStock = Number(product?.stock_quantity ?? product?.stock);
  return Number.isFinite(pStock) && pStock >= 0 ? pStock : 0;
}

function sharedStockKg(product) {
  const kg = Number(product?.shared_stock_kg);
  return Number.isFinite(kg) && kg >= 0 ? kg : null;
}

async function fetchProductsByIds(env, productIds) {
  const unique = [...new Set(productIds.filter(Boolean))];
  if (!unique.length) return [];
  const filter = `id=in.(${unique.map((id) => encodeURIComponent(id)).join(',')})`;
  return supabaseFetch(
    env,
    `products?select=id,name,sku,stock_quantity,quick_variants,shared_stock_kg,inventory_group&${filter}`
  );
}

async function validateCartStock(env, items = []) {
  const stockItems = items.filter((i) => i.type !== 'combo' && i.type !== 'custom' && i.product_id);
  const productIds = stockItems.map((i) => i.product_id);
  const products = await fetchProductsByIds(env, productIds);
  const byId = Object.fromEntries(products.map((p) => [p.id, p]));

  for (const item of stockItems) {
    const product = byId[item.product_id];
    if (!product) throw new Error(`Product not found: ${item.title || item.product_id}`);

    const variant = findVariant(product, item.sku, item.variant);
    const qty = Number(item.qty || 1);
    const packKg = Number(item.pack_kg ?? variant?.pack_kg);
    const sharedKg = sharedStockKg(product);

    if (Number.isFinite(packKg) && packKg > 0 && sharedKg !== null) {
      const neededKg = packKg * qty;
      if (neededKg > sharedKg) {
        throw new Error(`Insufficient stock for ${item.title} (${variant?.label || 'default'})`);
      }
      continue;
    }

    const available = variantStockUnits(variant, product);
    if (qty > available) {
      throw new Error(`Only ${available} left for ${item.title}${variant?.label ? ` · ${variant.label}` : ''}`);
    }
  }
}

async function recordStockMovement(env, row) {
  await supabaseFetch(env, 'stock_movements', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(row),
  });
}

async function deductInventory(env, orderId, createdBy = null, reason = 'sale_web') {
  const items = await supabaseFetch(
    env,
    `order_items?select=*&order_id=eq.${encodeURIComponent(orderId)}`
  );
  if (!items?.length) return { deducted: 0 };

  const productIds = items.map((i) => i.product_id).filter(Boolean);
  const products = await fetchProductsByIds(env, productIds);
  const byId = Object.fromEntries(products.map((p) => [p.id, p]));

  let deducted = 0;

  for (const line of items) {
    if (!line.product_id) continue;
    const product = byId[line.product_id];

    const sku = line.sku || null;
    const label = line.variant_label || null;
    const variant = findVariant(product, sku, label);
    const qty = Number(line.quantity || 0);
    const packKg = Number(line.pack_kg ?? variant?.pack_kg);
    const sharedKg = sharedStockKg(product);

    if (Number.isFinite(packKg) && packKg > 0 && sharedKg !== null) {
      const deltaKg = Number((packKg * qty).toFixed(3));
      const nextKg = Number((sharedKg - deltaKg).toFixed(3));
      if (nextKg < 0) {
        throw new Error(`Insufficient bulk stock for ${line.product_name || product.name}`);
      }
      await supabaseFetch(env, `products?id=eq.${encodeURIComponent(product.id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ shared_stock_kg: nextKg }),
      });
      await recordStockMovement(env, {
        product_id: product.id,
        variant_sku: sku,
        delta_units: 0,
        delta_kg: -deltaKg,
        reason,
        reference_type: 'order',
        reference_id: orderId,
        created_by: createdBy,
      });
      deducted += 1;
      continue;
    }

    const variants = parseVariants(product);
    let updated = false;
    const nextVariants = variants.map((v) => {
      const match = sku
        ? String(v.sku || '').toLowerCase() === String(sku).toLowerCase()
        : label
          ? String(v.label || '').toLowerCase() === String(label).toLowerCase()
          : v === variant;
      if (!match) return v;
      const current = variantStockUnits(v, product);
      const next = current - qty;
      if (next < 0) {
        throw new Error(`Insufficient stock for ${line.product_name || product.name}`);
      }
      updated = true;
      return { ...v, stock: next };
    });

    if (!updated && variants.length === 0) {
      const current = Number(product.stock_quantity) || 0;
      const next = current - qty;
      if (next < 0) throw new Error(`Insufficient stock for ${line.product_name || product.name}`);
      await supabaseFetch(env, `products?id=eq.${encodeURIComponent(product.id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ stock_quantity: next }),
      });
    } else {
      await supabaseFetch(env, `products?id=eq.${encodeURIComponent(product.id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ quick_variants: nextVariants }),
      });
    }

    await recordStockMovement(env, {
      product_id: product.id,
      variant_sku: sku,
      delta_units: -qty,
      delta_kg: Number.isFinite(packKg) && packKg > 0 ? -Number((packKg * qty).toFixed(3)) : 0,
      reason,
      reference_type: 'order',
      reference_id: orderId,
      created_by: createdBy,
    });
    deducted += 1;
  }

  return { deducted };
}

async function insertOrderItems(env, orderId, items = []) {
  if (!items.length) return;
  const rows = items.map((item) => ({
    order_id: orderId,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.total_price,
    variant_label: item.variant_label || null,
    sku: item.sku || null,
    pack_kg: item.pack_kg ?? null,
    product_name: item.product_name || null,
    unit_price_paise: item.unit_price_paise ?? Math.round(Number(item.unit_price || 0) * 100),
    line_total_paise: item.line_total_paise ?? Math.round(Number(item.total_price || 0) * 100),
  }));
  await supabaseFetch(env, 'order_items', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(rows),
  });
}

async function sendEmail(payload, env) {
  requireEnv(env, ['RESEND_API_KEY']);
  const to = payload?.to;
  const subject = payload?.subject;
  const body = payload?.body;
  if (!to || !subject || !body) {
    throw new Error('Missing required email fields: to, subject, body');
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM || 'Yasvik <noreply@yasvik.com>',
      to: [to],
      subject,
      html: body,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || data?.error || 'Failed to send email');
  }
  return { success: true, provider: 'resend', id: data.id };
}

const POSTAL_API_BASE = 'https://api.postalpincode.in/pincode';
const POSTAL_SOURCE = 'postalpincode.in';
const POSTAL_SYNC_STALE_MS = 30 * 24 * 60 * 60 * 1000;

function pickPrimaryPostOffice(offices = []) {
  if (!offices?.length) return null;
  const delivery = offices.filter((o) => String(o.DeliveryStatus || '').toLowerCase() === 'delivery');
  const pool = delivery.length ? delivery : offices;
  const withoutSuffix = pool.find((o) => !/\(delivery\)|\(nd\)/i.test(String(o.Name || '')));
  return withoutSuffix || pool[0];
}

function parsePostalApiResponse(payload, pincode) {
  const rows = Array.isArray(payload) ? payload : [];
  const head = rows[0];
  if (!head || head.Status !== 'Success' || !Array.isArray(head.PostOffice) || !head.PostOffice.length) {
    return {
      valid: false,
      pincode,
      error: head?.Message || 'Pincode not found in India Post directory',
    };
  }

  const offices = head.PostOffice.map((office) => ({
    name: office.Name || '',
    branch_type: office.BranchType || '',
    delivery_status: office.DeliveryStatus || '',
    district: office.District || '',
    state: office.State || '',
    block: office.Block || '',
    division: office.Division || '',
    region: office.Region || '',
    circle: office.Circle || '',
    country: office.Country || 'India',
    pincode: office.Pincode || pincode,
  }));

  const primaryRaw = pickPrimaryPostOffice(head.PostOffice);
  const primary = offices.find((o) => o.name === primaryRaw?.Name) || offices[0];

  return {
    valid: true,
    pincode,
    primary_name: primary?.name || '',
    district: primary?.district || '',
    state: primary?.state || '',
    block: primary?.block || '',
    offices,
    office_count: offices.length,
    source: POSTAL_SOURCE,
    synced_at: new Date().toISOString(),
  };
}

function isPostalSyncStale(syncedAt) {
  if (!syncedAt) return true;
  const ts = new Date(syncedAt).getTime();
  if (Number.isNaN(ts)) return true;
  return Date.now() - ts > POSTAL_SYNC_STALE_MS;
}

async function fetchPostalPincode(pincode) {
  const res = await fetch(`${POSTAL_API_BASE}/${encodeURIComponent(pincode)}`, {
    headers: { Accept: 'application/json' },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error('Could not reach India Post pincode directory');
  }
  return parsePostalApiResponse(data, pincode);
}

async function applyPostalToZone(env, zone, postal) {
  if (!zone?.id || !postal?.valid) return zone;
  const now = new Date().toISOString();
  const patch = {
    area_name: postal.primary_name || zone.area_name,
    district: postal.district || zone.district,
    state: postal.state || zone.state,
    block: postal.block || zone.block,
    post_offices: postal.offices,
    postal_source: POSTAL_SOURCE,
    postal_synced_at: now,
    updated_at: now,
  };
  await supabaseFetch(env, `delivery_zones?id=eq.${encodeURIComponent(zone.id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(patch),
  });
  return { ...zone, ...patch };
}

function mergeZoneWithPostal(zone, postal) {
  if (!zone) return null;
  return {
    ...zone,
    area_name: postal?.primary_name || zone.area_name,
    district: postal?.district || zone.district,
    state: postal?.state || zone.state,
    block: postal?.block || zone.block,
    post_offices: postal?.offices || zone.post_offices,
    postal_label: postal?.valid
      ? [postal.primary_name, postal.district].filter(Boolean).join(', ')
      : zone.area_name,
  };
}

async function lookupPostalPincode(payload) {
  const pincode = String(payload?.pincode || '').trim();
  if (!/^\d{6}$/.test(pincode)) {
    return { valid: false, error: 'Enter a valid 6-digit pincode' };
  }
  const postal = await fetchPostalPincode(pincode);
  return postal;
}

async function syncDeliveryZones(payload, env, request) {
  await requireStaffUser(request, env);
  const pincode = payload?.pincode ? String(payload.pincode).trim() : null;
  const force = Boolean(payload?.force);

  let zones = [];
  if (pincode) {
    zones = await supabaseFetch(
      env,
      `delivery_zones?select=*&pincode=eq.${encodeURIComponent(pincode)}&limit=1`
    );
  } else {
    zones = await supabaseFetch(env, 'delivery_zones?select=*&is_active=eq.true&order=pincode.asc');
  }

  const results = [];
  for (const zone of zones || []) {
    try {
      if (!force && !isPostalSyncStale(zone.postal_synced_at)) {
        results.push({ pincode: zone.pincode, skipped: true, area_name: zone.area_name });
        continue;
      }
      const postal = await fetchPostalPincode(zone.pincode);
      if (!postal.valid) {
        results.push({ pincode: zone.pincode, error: postal.error });
        continue;
      }
      const updated = await applyPostalToZone(env, zone, postal);
      results.push({
        pincode: zone.pincode,
        synced: true,
        area_name: updated.area_name,
        district: updated.district,
        office_count: postal.office_count,
      });
      await new Promise((r) => setTimeout(r, 250));
    } catch (err) {
      results.push({ pincode: zone.pincode, error: err?.message || 'Sync failed' });
    }
  }

  return {
    success: true,
    synced: results.filter((r) => r.synced).length,
    skipped: results.filter((r) => r.skipped).length,
    failed: results.filter((r) => r.error).length,
    results,
  };
}

async function validateDeliveryPincode(payload, env) {
  const pincode = String(payload?.pincode || '').trim();
  if (!/^\d{6}$/.test(pincode)) {
    return { serviceable: false, error: 'Enter a valid 6-digit pincode', postal: null, zone: null };
  }

  let postal;
  try {
    postal = await fetchPostalPincode(pincode);
  } catch (err) {
    return {
      serviceable: false,
      error: err?.message || 'Could not verify pincode with India Post',
      postal: null,
      zone: null,
    };
  }

  if (!postal.valid) {
    return {
      serviceable: false,
      error: 'This pincode is not listed in the India Post directory. Please double-check the 6 digits.',
      postal,
      zone: null,
    };
  }

  const zones = await supabaseFetch(
    env,
    `delivery_zones?select=*&pincode=eq.${encodeURIComponent(pincode)}&is_active=eq.true&limit=1`
  );
  let zone = zones?.[0];

  if (zone && isPostalSyncStale(zone.postal_synced_at)) {
    try {
      zone = await applyPostalToZone(env, zone, postal);
    } catch (_) { /* non-blocking refresh */ }
  }

  if (!zone) {
    const label = [postal.primary_name, postal.district, postal.state].filter(Boolean).join(', ');
    return {
      serviceable: false,
      postal,
      zone: null,
      postal_label: label,
      error: `We don't deliver to ${label || pincode} yet. WhatsApp us to check availability.`,
    };
  }

  const mergedZone = mergeZoneWithPostal(zone, postal);
  return {
    serviceable: true,
    postal,
    zone: mergedZone,
    postal_label: mergedZone.postal_label,
  };
}

const LOCAL_COLONY_PINCODES = ['500050', '500020', '500019', '500032', '500018'];
const DEFAULT_FREE_DELIVERY_THRESHOLD_RS = 999;
const APP_SETTINGS_CACHE_MS = 5 * 60 * 1000;
let appSettingsCache = { fetchedAt: 0, values: {} };

async function fetchAppSettingNumber(env, key, fallback = DEFAULT_FREE_DELIVERY_THRESHOLD_RS) {
  const now = Date.now();
  if (now - appSettingsCache.fetchedAt < APP_SETTINGS_CACHE_MS && appSettingsCache.values[key] !== undefined) {
    return appSettingsCache.values[key];
  }

  try {
    const rows = await supabaseFetch(
      env,
      `app_settings?select=setting_key,setting_value,key,value&setting_key=eq.${encodeURIComponent(key)}&limit=1`,
    );
    const row = rows?.[0];
    const raw = row?.setting_value ?? row?.value;
    const parsed = Number(raw);
    appSettingsCache.values[key] = Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
    appSettingsCache.fetchedAt = now;
    return appSettingsCache.values[key];
  } catch {
    return fallback;
  }
}

async function getFreeDeliveryThresholdRs(env) {
  return fetchAppSettingNumber(env, 'free_delivery_threshold', DEFAULT_FREE_DELIVERY_THRESHOLD_RS);
}

async function computeExpectedDeliveryFeePaise(env, pincode, subtotalPaise, zone) {
  const pin = String(pincode || '').trim();
  const subtotalRs = (Number(subtotalPaise) || 0) / 100;
  const freeThresholdRs = await getFreeDeliveryThresholdRs(env);

  if (LOCAL_COLONY_PINCODES.includes(pin)) {
    if (subtotalRs < 299) return 3000;
    if (subtotalRs < freeThresholdRs) return subtotalRs < 500 ? 3000 : 4900;
    return 0;
  }

  const freeAbove = freeThresholdRs * 100;
  if (!zone) return 0;
  if (subtotalPaise >= freeAbove) return 0;
  return Number(zone.delivery_fee_paise) || 0;
}

async function getOrderTrackingDetails(payload, env) {
  const orderId = payload?.orderId || payload?.order_id || payload?.id;
  const orderNumber = payload?.orderNumber || payload?.order_number;
  const email = payload?.email;
  const phone = payload?.phone;
  if (!orderId && !orderNumber) {
    throw new Error('Provide orderId or orderNumber');
  }

  const filter = orderId
    ? `id=eq.${encodeURIComponent(orderId)}`
    : `order_number=eq.${encodeURIComponent(orderNumber)}`;
  const orders = await supabaseFetch(env, `orders?select=*&${filter}&limit=1`);
  const order = orders?.[0];
  if (!order) {
    return { success: false, error: 'Order not found' };
  }

  if (email && order.customer_email && order.customer_email.toLowerCase() !== email.toLowerCase()) {
    return { success: false, error: 'Verification failed. Please check your details.' };
  }
  if (phone) {
    const norm = (v) => String(v || '').replace(/\D/g, '').slice(-10);
    if (order.customer_phone && norm(order.customer_phone) !== norm(phone)) {
      return { success: false, error: 'Verification failed. Please check your details.' };
    }
  }

  return {
    success: true,
    order: {
      id: order.id,
      order_number: order.order_number || order.id,
      receipt_id: order.receipt_id || null,
      status: order.status || 'pending',
      payment_status: order.payment_status || null,
      amount_paise: order.amount_paise ?? Math.round(Number(order.total_amount || 0) * 100),
      items_snapshot: order.items_snapshot || [],
      shipping_address: order.address_snapshot || null,
      eta_label: order.eta_label || null,
      delivery_slot: order.delivery_slot || null,
      timeline: order.timeline || [],
      tracking_id: order.tracking_id || order.tracking_number || null,
      carrier: order.carrier || order.courier_name || null,
      rider_name: order.rider_name || null,
      estimated_delivery_date: order.estimated_delivery_date || null,
      updated_date: order.updated_at || null,
      created_date: order.created_at || null,
    },
  };
}

async function sendOrderNotification(payload, env) {
  const orderId = payload?.orderId;
  const status = payload?.status;
  if (!orderId || !status) {
    throw new Error('Missing orderId or status');
  }

  const orders = await supabaseFetch(
    env,
    `orders?select=id,order_number,status,customer_email,customer_phone,customer_name,amount_paise,eta_label,address_snapshot,user_id,created_by,updated_at&id=eq.${encodeURIComponent(orderId)}&limit=1`
  );
  const order = orders?.[0];
  if (!order) throw new Error('Order not found');

  const orderRef = order.order_number || order.id;
  const statusLabel = {
    confirmed: 'Confirmed',
    packing: 'Being packed',
    ready_for_dispatch: 'Ready to dispatch',
    shipped: 'Shipped',
    out_for_delivery: 'Out for delivery',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  }[status] || status;

  let email = order.customer_email || null;
  if (!email && order.user_id) {
    const users = await supabaseFetch(
      env,
      `user_profiles?select=email&id=eq.${encodeURIComponent(order.user_id)}&limit=1`
    );
    email = users?.[0]?.email || null;
  }

  const addr = order.address_snapshot || {};
  const trackUrl = `https://www.yasvik.com/orders/${encodeURIComponent(orderRef)}/track`;
  const emailBody = `
    <div style="font-family:sans-serif;max-width:520px;color:#333">
      <p>Hi ${order.customer_name || 'there'},</p>
      <p>Your Yasvik order <strong>${orderRef}</strong> is now <strong>${statusLabel}</strong>.</p>
      ${order.eta_label ? `<p>Expected: ${order.eta_label}</p>` : ''}
      <p>Total: ₹${((order.amount_paise || 0) / 100).toFixed(0)}</p>
      <p><a href="${trackUrl}">Track your order</a></p>
      <p style="color:#666;font-size:12px">Delivering to ${[addr.street, addr.city, addr.zip].filter(Boolean).join(', ')}</p>
    </div>
  `;

  let emailSent = false;
  let emailError = null;
  if (email) {
    try {
      await sendEmail(
        {
          to: email,
          subject: `Yasvik order ${orderRef} — ${statusLabel}`,
          body: emailBody,
        },
        env
      );
      emailSent = true;
    } catch (err) {
      emailError = err?.message || 'Email failed';
    }
  }

  const phoneDigits = String(order.customer_phone || '').replace(/\D/g, '').slice(-10);
  const whatsappMessage = [
    `Hi ${order.customer_name || 'there'} 👋`,
    `Your Yasvik order *${orderRef}* is now *${statusLabel}*.`,
    order.eta_label ? `ETA: ${order.eta_label}` : null,
    `Track: ${trackUrl}`,
    '',
    '— Yasvik',
  ].filter(Boolean).join('\n');

  const whatsappUrl = phoneDigits.length === 10
    ? `https://wa.me/91${phoneDigits}?text=${encodeURIComponent(whatsappMessage)}`
    : null;

  return {
    success: emailSent || Boolean(whatsappUrl),
    email_sent: emailSent,
    email_error: emailError,
    whatsapp_url: whatsappUrl,
    order_number: orderRef,
  };
}

function toBasicAuth(id, secret) {
  const raw = `${id}:${secret}`;
  return `Basic ${btoa(raw)}`;
}

function normalizeCheckoutItems(items = []) {
  return items.map((item) => ({
    product_id: item.product_id || item.productId,
    title: item.title,
    variant: item.variant || item.variant_label || null,
    sku: item.sku || item.variantSku || null,
    pack_kg: item.pack_kg ?? item.variantMeta?.pack_kg ?? null,
    qty: Number(item.qty || 1),
    price: Number(item.price || 0),
    type: item.type || 'product',
  }));
}

function buildOrderItemRows(items = []) {
  return items
    .filter((i) => i.type !== 'combo')
    .map((item) => {
      const unitPaise = Math.round(item.price * 100);
      const qty = item.qty;
      return {
        product_id: item.product_id,
        product_name: item.title,
        variant_label: item.variant,
        sku: item.sku,
        pack_kg: item.pack_kg,
        quantity: qty,
        unit_price: item.price,
        total_price: item.price * qty,
        unit_price_paise: unitPaise,
        line_total_paise: unitPaise * qty,
      };
    });
}

async function razorpayCreateOrder(payload, env, request) {
  requireEnv(env, ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET']);
  const authUser = await getAuthUser(request, env);
  if (!authUser?.id) throw new Error('Login required to place an order');

  const amount = payload?.amount;
  const currency = payload?.currency || 'INR';
  const rawItems = payload?.items || [];
  const customer = payload?.customer || {};
  const shippingAddress = payload?.shipping_address || {};
  const deliveryInstructions = payload?.delivery_instructions || '';
  const subtotalPaise = payload?.subtotal_paise ?? amount;
  const deliveryFeePaise = payload?.delivery_fee_paise ?? 0;
  const etaLabel = payload?.eta_label || null;
  const deliverySlot = payload?.delivery_slot || null;
  const pincode = payload?.pincode || shippingAddress?.zip || '';

  if (!amount || !Number.isFinite(Number(amount)) || Number(amount) < 100) {
    throw new Error('Invalid order amount');
  }

  const zoneCheck = await validateDeliveryPincode({ pincode }, env);
  if (!zoneCheck.serviceable) {
    throw new Error(zoneCheck.error || 'Unserviceable delivery pincode');
  }

  const expectedFeePaise = await computeExpectedDeliveryFeePaise(env, pincode, subtotalPaise, zoneCheck.zone);
  const expectedTotalPaise = Number(subtotalPaise) + expectedFeePaise;
  if (Math.abs(Number(amount) - expectedTotalPaise) > 1) {
    throw new Error('Order total changed. Please refresh checkout and try again.');
  }
  if (Math.abs(Number(deliveryFeePaise) - expectedFeePaise) > 1) {
    throw new Error('Delivery fee mismatch. Please refresh checkout.');
  }

  const normalizedItems = normalizeCheckoutItems(rawItems);
  await validateCartStock(env, normalizedItems);

  const receipt = `yasvik_${Date.now()}`;
  const rzRes = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: toBasicAuth(env.RAZORPAY_KEY_ID, env.RAZORPAY_KEY_SECRET),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount,
      currency,
      receipt,
      notes: { source: 'yasvik-webapp', user_id: authUser.id },
    }),
  });
  const orderData = await rzRes.json().catch(() => ({}));
  if (!rzRes.ok) throw new Error(orderData?.error?.description || 'Failed to create Razorpay order');

  const orderNumber = generateOrderNumber();
  const now = new Date().toISOString();
  const itemsSnapshot = normalizedItems.map((i) => ({
    title: i.title,
    variant: i.variant,
    sku: i.sku,
    pack_kg: i.pack_kg,
    qty: i.qty,
    price: i.price,
    unit: null,
  }));

  const orderRow = {
    user_id: authUser.id,
    created_by: authUser.id,
    order_number: orderNumber,
    status: 'pending',
    payment_status: 'unpaid',
    payment_method: 'razorpay',
    order_channel: 'web',
    amount_paise: amount,
    subtotal_paise: subtotalPaise,
    delivery_fee_paise: deliveryFeePaise,
    total_amount: amount / 100,
    subtotal: subtotalPaise / 100,
    shipping_cost: deliveryFeePaise / 100,
    currency,
    receipt_id: receipt,
    razorpay_order_id: orderData.id,
    items_snapshot: itemsSnapshot,
    timeline: [{ timestamp: now, status: 'pending', note: 'Order created', updated_by: 'system' }],
    customer_name: customer.name || shippingAddress.name || null,
    customer_email: customer.email || authUser.email || null,
    customer_phone: customer.phone || shippingAddress.phone || null,
    address_snapshot: shippingAddress,
    delivery_instructions: deliveryInstructions || null,
    delivery_slot: deliverySlot,
    eta_label: etaLabel || zoneCheck.zone?.eta_label || null,
    shipping_name: customer.name || shippingAddress.name || null,
    shipping_address: [shippingAddress.street, shippingAddress.city, shippingAddress.state, shippingAddress.zip]
      .filter(Boolean)
      .join(', '),
    shipping_city: shippingAddress.city || null,
    shipping_state: shippingAddress.state || 'Telangana',
    shipping_postal_code: shippingAddress.zip || pincode,
    shipping_country: 'India',
    shipping_phone: customer.phone || shippingAddress.phone || null,
  };

  const inserted = await supabaseFetch(env, 'orders', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(orderRow),
  });
  const dbOrder = inserted?.[0];
  if (!dbOrder?.id) throw new Error('Failed to persist order');

  const lineRows = buildOrderItemRows(normalizedItems);
  if (lineRows.length) {
    await insertOrderItems(env, dbOrder.id, lineRows);
  }

  return {
    order_id: orderData.id,
    amount: orderData.amount,
    currency: orderData.currency,
    key_id: env.RAZORPAY_KEY_ID,
    db_order_id: dbOrder.id,
    order_number: orderNumber,
    receipt_id: receipt,
    items_count: normalizedItems.length,
  };
}

async function hmacSHA256Hex(key, message) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function finalizePaidOrder(dbOrder, paymentId, env, { updatedBy = 'system', note = 'Payment verified' } = {}) {
  if (!dbOrder?.id) throw new Error('Order record not found for payment');

  if (dbOrder.payment_status === 'paid' && dbOrder.razorpay_payment_id) {
    return {
      success: true,
      verified: true,
      already_paid: true,
      db_order_id: dbOrder.id,
      order_number: dbOrder.order_number,
    };
  }

  const now = new Date().toISOString();
  const timeline = [...(dbOrder.timeline || []), {
    timestamp: now,
    status: 'confirmed',
    note,
    updated_by: updatedBy,
  }];

  await supabaseFetch(env, `orders?id=eq.${encodeURIComponent(dbOrder.id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      payment_status: 'paid',
      status: 'confirmed',
      razorpay_payment_id: paymentId,
      timeline,
      completed_at: now,
    }),
  });

  await deductInventory(env, dbOrder.id, dbOrder.user_id || dbOrder.created_by);

  try {
    await sendOrderNotification({ orderId: dbOrder.id, status: 'confirmed' }, env);
  } catch (_) { /* non-blocking */ }

  return {
    success: true,
    verified: true,
    db_order_id: dbOrder.id,
    order_number: dbOrder.order_number,
  };
}

async function razorpayWebhook(request, env) {
  const secret = String(env.RAZORPAY_WEBHOOK_SECRET || '').trim();
  if (!secret) {
    return new Response('Webhook secret not configured', { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get('X-Razorpay-Signature') || '';
  const expected = await hmacSHA256Hex(secret, rawBody);
  if (!signature || signature !== expected) {
    return new Response('Invalid signature', { status: 400 });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const event = payload?.event;
  if (event === 'payment.captured' || event === 'order.paid') {
    const payment = payload?.payload?.payment?.entity;
    const rzOrderId = payment?.order_id;
    const paymentId = payment?.id;
    if (rzOrderId && paymentId) {
      const rows = await supabaseFetch(
        env,
        `orders?select=*&razorpay_order_id=eq.${encodeURIComponent(rzOrderId)}&limit=1`,
      );
      const dbOrder = rows?.[0];
      if (dbOrder) {
        await finalizePaidOrder(dbOrder, paymentId, env, {
          updatedBy: 'razorpay_webhook',
          note: 'Payment captured (webhook)',
        });
      }
    }
  }

  return new Response('OK', { status: 200 });
}

async function razorpayVerifyPayment(payload, env, request) {
  requireEnv(env, ['RAZORPAY_KEY_SECRET']);
  const authUser = await getAuthUser(request, env);
  if (!authUser?.id) throw new Error('Login required');

  const orderId = payload?.razorpay_order_id;
  const paymentId = payload?.razorpay_payment_id;
  const signature = payload?.razorpay_signature;
  const dbOrderId = payload?.db_order_id;
  if (!orderId || !paymentId || !signature) throw new Error('Missing Razorpay verification params');

  const computed = await hmacSHA256Hex(env.RAZORPAY_KEY_SECRET, `${orderId}|${paymentId}`);
  const success = computed === signature;
  if (!success) return { success: false, verified: false };

  let dbOrder = null;
  if (dbOrderId) {
    const rows = await supabaseFetch(env, `orders?select=*&id=eq.${encodeURIComponent(dbOrderId)}&limit=1`);
    dbOrder = rows?.[0];
  }
  if (!dbOrder) {
    const rows = await supabaseFetch(
      env,
      `orders?select=*&razorpay_order_id=eq.${encodeURIComponent(orderId)}&limit=1`
    );
    dbOrder = rows?.[0];
  }
  if (!dbOrder) throw new Error('Order record not found for payment');

  if (authUser?.id && dbOrder.user_id && dbOrder.user_id !== authUser.id) {
    throw new Error('Order does not belong to this account');
  }

  const result = await finalizePaidOrder(dbOrder, paymentId, env, {
    updatedBy: authUser?.id || 'client_verify',
    note: 'Payment verified',
  });

  return {
    success: result.success,
    verified: result.verified,
    already_paid: result.already_paid,
    db_order_id: result.db_order_id,
    order_number: result.order_number,
  };
}

async function createPosSale(payload, env, request) {
  const { user } = await requireStaffUser(request, env);

  const items = normalizeCheckoutItems(payload?.items || []);
  if (!items.length) throw new Error('Cart is empty');

  const clientSaleId = String(payload?.client_sale_id || payload?.offline_sale_id || '').trim();
  if (clientSaleId) {
    const existing = await supabaseFetch(
      env,
      `orders?select=id,order_number,receipt_id,amount_paise&receipt_id=eq.${encodeURIComponent(clientSaleId)}&limit=1`
    );
    if (existing?.[0]) {
      const row = existing[0];
      return {
        success: true,
        order_id: row.id,
        order_number: row.order_number,
        receipt_id: row.receipt_id,
        amount_paise: row.amount_paise,
        already_synced: true,
      };
    }
  }

  await validateCartStock(env, items);

  const subtotalPaise = items.reduce((s, i) => s + Math.round(i.price * 100) * i.qty, 0);
  const paymentMethod = payload?.payment_method || 'cash';
  const now = new Date().toISOString();
  const soldAtRaw = payload?.sold_at;
  const soldAt = soldAtRaw && !Number.isNaN(Date.parse(soldAtRaw))
    ? new Date(soldAtRaw).toISOString()
    : now;
  const orderNumber = generateOrderNumber();
  const receipt = clientSaleId || `pos_${Date.now()}`;

  const itemsSnapshot = items.map((i) => ({
    title: i.title,
    variant: i.variant,
    sku: i.sku,
    qty: i.qty,
    price: i.price,
  }));

  const offlineNote = clientSaleId ? `Offline sale synced ${now.slice(0, 16).replace('T', ' ')}` : null;
  const adminNotes = [payload?.notes, offlineNote].filter(Boolean).join(' · ') || null;

  const orderRow = {
    user_id: user.id,
    created_by: user.id,
    order_number: orderNumber,
    status: 'delivered',
    payment_status: 'paid',
    payment_method: paymentMethod,
    order_channel: 'pos',
    amount_paise: subtotalPaise,
    subtotal_paise: subtotalPaise,
    delivery_fee_paise: 0,
    total_amount: subtotalPaise / 100,
    subtotal: subtotalPaise / 100,
    currency: 'INR',
    receipt_id: receipt,
    items_snapshot: itemsSnapshot,
    timeline: [
      {
        timestamp: soldAt,
        status: 'delivered',
        note: `POS sale (${paymentMethod})${clientSaleId ? ' · offline sync' : ''}`,
        updated_by: user.email || 'staff',
      },
    ],
    customer_name: payload?.customer_name || 'Walk-in customer',
    customer_phone: payload?.customer_phone || null,
    admin_notes: adminNotes,
    completed_at: soldAt,
  };

  const inserted = await supabaseFetch(env, 'orders', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(orderRow),
  });
  const dbOrder = inserted?.[0];
  if (!dbOrder?.id) throw new Error('Failed to create POS order');

  const lineRows = buildOrderItemRows(items).map((row) => ({
    ...row,
    reason: 'sale_pos',
  }));
  await insertOrderItems(env, dbOrder.id, lineRows);

  await deductInventory(env, dbOrder.id, user.id, 'sale_pos');

  return {
    success: true,
    order_id: dbOrder.id,
    order_number: orderNumber,
    receipt_id: receipt,
    amount_paise: subtotalPaise,
  };
}

async function razorpayHealth(_payload, env, request) {
  await requireStaffUser(request, env);

  const missing = ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'].filter((key) => !env[key]);
  if (missing.length) {
    return {
      configured: false,
      missing,
      mode: null,
      key_id_masked: null,
      api_ok: false,
    };
  }

  const keyId = String(env.RAZORPAY_KEY_ID);
  const mode = keyId.startsWith('rzp_live_') ? 'live' : keyId.startsWith('rzp_test_') ? 'test' : 'unknown';
  const masked = keyId.length > 16
    ? `${keyId.slice(0, 12)}…${keyId.slice(-4)}`
    : `${keyId.slice(0, 4)}…`;

  let apiOk = false;
  try {
    const rzRes = await fetch('https://api.razorpay.com/v1/orders?count=1', {
      headers: { Authorization: toBasicAuth(env.RAZORPAY_KEY_ID, env.RAZORPAY_KEY_SECRET) },
    });
    apiOk = rzRes.ok;
  } catch {
    apiOk = false;
  }

  return {
    configured: true,
    mode,
    key_id_masked: masked,
    api_ok: apiOk,
  };
}

async function razorpayCreateSubscription(payload, env, request) {
  requireEnv(env, ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET']);
  const authUser = await getAuthUser(request, env);
  if (!authUser?.id) throw new Error('Login required');

  const plan_id = payload?.razorpay_plan_id || payload?.plan_id;
  const total_count = payload?.total_count || 12;
  if (!plan_id) throw new Error('Missing razorpay plan id');

  const rzRes = await fetch('https://api.razorpay.com/v1/subscriptions', {
    method: 'POST',
    headers: {
      Authorization: toBasicAuth(env.RAZORPAY_KEY_ID, env.RAZORPAY_KEY_SECRET),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      plan_id,
      total_count,
      customer_notify: 1,
      notes: { source: 'yasvik-webapp' },
    }),
  });
  const data = await rzRes.json().catch(() => ({}));
  if (!rzRes.ok) throw new Error(data?.error?.description || 'Failed to create Razorpay subscription');

  return {
    success: true,
    subscription_id: data.id,
    key_id: env.RAZORPAY_KEY_ID,
    status: data.status,
  };
}
