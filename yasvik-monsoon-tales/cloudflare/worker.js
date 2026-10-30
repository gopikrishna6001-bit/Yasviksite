import { handleMetaCatalogFeedRequest } from './metaCatalogFeed.js';
import {
  browserPdfOptions,
  compileCatalogue,
  defaultCatalogueOptions,
  slugify as slugifyCatalogue,
} from './cataloguePdf.js';

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
      // 204 responses must not include a body — json() would throw (CF 1101).
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request),
      });
    }

    if (request.method === 'POST' && pathname === '/webhooks/razorpay') {
      try {
        return await razorpayWebhook(request, env);
      } catch (error) {
        return new Response(error?.message || 'Webhook failed', { status: 500 });
      }
    }

    if (pathname === '/webhooks/whatsapp') {
      try {
        return await whatsappWebhook(request, env);
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

    if (request.method === 'POST' && pathname === '/ops/resend-order-email') {
      const opsKey = String(request.headers.get('X-Ops-Key') || '').trim();
      const expected = String(env.OPS_EMAIL_RESEND_KEY || '').trim();
      if (!expected || opsKey !== expected) {
        return json({ error: 'Forbidden' }, 403, request);
      }
      try {
        const payload = await request.json().catch(() => ({}));
        const orderId = payload?.orderId || payload?.order_id;
        if (!orderId) return json({ error: 'orderId required' }, 400, request);
        const data = await sendOrderNotification({
          orderId,
          status: payload?.status || 'confirmed',
          recordEvent: false,
        }, env);
        return json(data, 200, request);
      } catch (error) {
        return json({ error: error?.message || 'Resend failed' }, 500, request);
      }
    }

    if (request.method === 'POST' && pathname.startsWith('/functions/')) {
      const fnName = pathname.replace('/functions/', '');
      const payload = await request.json().catch(() => ({}));

      const handlers = {
        razorpayCreateOrder: async (p) => razorpayCreateOrder(p, env, request),
        createCodOrder: async (p) => createCodOrder(p, env, request),
        checkCodEligibility: async (p) => checkCodEligibility(p, env, request),
        razorpayVerifyPayment: async (p) => razorpayVerifyPayment(p, env, request),
        razorpayCreateSubscription: async (p) => razorpayCreateSubscription(p, env, request),
        razorpayHealth: async (p) => razorpayHealth(p, env, request),
        createPosSale: async (p) => createPosSale(p, env, request),
        validateDeliveryPincode: async (p) => validateDeliveryPincode(p, env),
        lookupPostalPincode: async (p) => lookupPostalPincode(p),
        syncDeliveryZones: async (p) => syncDeliveryZones(p, env, request),
        getOrderTrackingDetails: async (p) => getOrderTrackingDetails(p, env),
        getPublicInvoice: async (p) => getPublicInvoice(p, env),
        sendInvoiceWhatsApp: async (p) => sendInvoiceWhatsApp(p, env, request),
        sendOrderNotification: async (p) => sendOrderNotification(p, env, request),
        resendOrderConfirmation: async (p) => {
          await requireStaffUser(request, env);
          return sendOrderNotification({
            orderId: p?.orderId || p?.order_id,
            status: p?.status || 'confirmed',
            recordEvent: false,
          }, env);
        },
        adminUpdateOrderStatus: async (p) => adminUpdateOrderStatus(p, env, request),
        adminEditOrderItems: async (p) => adminEditOrderItems(p, env, request),
        listStockMovements: async (p) => listStockMovements(p, env, request),
        recordStockAdjustment: async (p) => recordStockAdjustment(p, env, request),
        sendEmail: async (p) => sendEmail(p, env),
        generateImage: async (p) => notImplemented('generateImage', p),
        listCoupons: async (p) => listCoupons(p, env, request),
        upsertCoupon: async (p) => upsertCoupon(p, env, request),
        deactivateCoupon: async (p) => deactivateCoupon(p, env, request),
        validateCouponPreview: async (p) => validateCouponPreview(p, env, request),
        listPackagingMaterials: async (p) => listPackagingMaterials(p, env, request),
        upsertPackagingMaterial: async (p) => upsertPackagingMaterial(p, env, request),
        listPackagingProfiles: async (p) => listPackagingProfiles(p, env, request),
        upsertPackagingProfile: async (p) => upsertPackagingProfile(p, env, request),
        listVariantPackaging: async (p) => listVariantPackaging(p, env, request),
        setVariantPackaging: async (p) => setVariantPackaging(p, env, request),
        bulkAssignPackagingProfiles: async (p) => bulkAssignPackagingProfiles(p, env, request),
        resolveLandedCosts: async (p) => resolveLandedCosts(p, env, request),
        listCustomers: async (p) => listCustomers(p, env, request),
        getCustomer: async (p) => getCustomer(p, env, request),
        updateCustomer: async (p) => updateCustomer(p, env, request),
        mergeCustomers: async (p) => mergeCustomers(p, env, request),
        lookupCustomerByPhone: async (p) => lookupCustomerByPhone(p, env, request),
        previewBonus: async (p) => previewBonus(p, env, request),
        grantSurpriseBonus: async (p) => grantSurpriseBonus(p, env, request),
        listCustomerBonusLedger: async (p) => listCustomerBonusLedger(p, env, request),
        getBonusDashboard: async (p) => getBonusDashboard(p, env, request),
        getRetentionStats: async (p) => getRetentionStats(p, env, request),
        exportConsentAudience: async (p) => exportConsentAudience(p, env, request),
        linkCustomerToUser: async (p) => linkCustomerToUser(p, env, request),
        listCustomerSegments: async (p) => listCustomerSegments(p, env, request),
        upsertCustomerSegment: async (p) => upsertCustomerSegment(p, env, request),
        listStaff: async () => listStaff(env, request),
        createStaff: async (p) => createStaff(p, env, request),
        updateStaff: async (p) => updateStaff(p, env, request),
        listCatalogueTemplates: async () => listCatalogueTemplates(env, request),
        listCatalogues: async (p) => listCatalogues(p, env, request),
        getCatalogue: async (p) => getCatalogue(p, env, request),
        upsertCatalogue: async (p) => upsertCatalogue(p, env, request),
        previewCatalogue: async (p) => previewCatalogue(p, env, request),
        generateCataloguePdf: async (p) => generateCataloguePdf(p, env, request),
        publishCatalogue: async (p) => publishCatalogue(p, env, request),
        listPublicCatalogues: async () => listPublicCatalogues(env),
      };

      const handler = handlers[fnName];
      if (!handler) {
        return json({ error: `Unknown function: ${fnName}` }, 404, request);
      }

      try {
        const data = await handler(payload, env, request);
        return json(data, 200, request);
      } catch (error) {
        return json({ error: error?.message || 'Function failed' }, error?.status || 500, request);
      }
    }

    if (pathname === '/' || pathname === '') {
      return json({ ok: true, message: 'Yasvik Cloudflare API online' }, 200, request);
    }

    return json({ error: 'Not found' }, 404, request);
  },

  async scheduled(_event, env) {
    try {
      await runBonusMaintenance(env);
    } catch (err) {
      console.error('[scheduled:bonus]', err?.message || err);
    }
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

const CASHIER_FUNCTIONS = new Set([
  'createPosSale',
  'adminUpdateOrderStatus',
  'adminEditOrderItems',
  'resendOrderConfirmation',
  'listStockMovements',
  'recordStockAdjustment',
  'lookupCustomerByPhone',
  'validateCouponPreview',
  'previewBonus',
  'sendInvoiceWhatsApp',
]);

function calendarDayInIst(value = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value instanceof Date ? value : new Date(value));
}

function userHasGoogleIdentity(user) {
  const identities = Array.isArray(user?.identities) ? user.identities : [];
  if (identities.some((identity) => String(identity?.provider || '').toLowerCase() === 'google')) {
    return true;
  }
  const metaProvider = String(user?.app_metadata?.provider || '').toLowerCase();
  if (metaProvider === 'google') return true;
  const providers = user?.app_metadata?.providers;
  return Array.isArray(providers) && providers.map((p) => String(p).toLowerCase()).includes('google');
}

function assertPrivilegedStaffAuthPolicy(user, role) {
  if (role !== 'admin' && role !== 'manager') return;

  if (!userHasGoogleIdentity(user)) {
    const err = new Error('Administrators and managers must sign in with Google');
    err.status = 403;
    throw err;
  }

  const lastSignInAt = user?.last_sign_in_at;
  if (!lastSignInAt || calendarDayInIst(lastSignInAt) !== calendarDayInIst(new Date())) {
    const err = new Error('Admin session expired. Sign in again with Google.');
    err.status = 401;
    throw err;
  }
}

async function requireStaffUser(request, env) {
  const user = await getAuthUser(request, env);
  if (!user?.id) {
    const err = new Error('Authentication required');
    err.status = 401;
    throw err;
  }

  const profiles = await supabaseFetch(
    env,
    `user_profiles?select=role,is_active&id=eq.${encodeURIComponent(user.id)}&limit=1`
  );
  const profile = profiles?.[0];
  const role = String(profile?.role || user?.app_metadata?.role || '').toLowerCase();

  if (profile?.is_active === false || !['admin', 'manager', 'cashier'].includes(role)) {
    const err = new Error('Admin access required');
    err.status = 403;
    throw err;
  }

  assertPrivilegedStaffAuthPolicy(user, role);

  if (role === 'cashier') {
    const fnName = new URL(request.url).pathname.split('/functions/')[1]?.split(/[/?#]/)[0] || '';
    if (!CASHIER_FUNCTIONS.has(fnName)) {
      const err = new Error('This action is not available to cashiers');
      err.status = 403;
      throw err;
    }
  }

  return { user, role };
}

async function requireAdminUser(request, env) {
  const auth = await requireStaffUser(request, env);
  if (auth.role !== 'admin') {
    const err = new Error('Administrator access required');
    err.status = 403;
    throw err;
  }
  return auth;
}

async function supabaseAuthAdminFetch(env, path, init = {}) {
  requireEnv(env, ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/${path}`, {
    ...init,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(data?.msg || data?.message || data?.error_description || `Auth admin request failed: ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

const MANAGED_STAFF_ROLES = new Set(['admin', 'manager', 'cashier']);

function normalizeManagedRole(value) {
  const role = String(value || '').trim().toLowerCase();
  if (!MANAGED_STAFF_ROLES.has(role)) {
    const err = new Error('Role must be admin, manager, or cashier');
    err.status = 400;
    throw err;
  }
  return role;
}

async function listStaff(env, request) {
  await requireAdminUser(request, env);
  const roles = encodeURIComponent('(admin,manager,cashier)');
  const staff = await supabaseFetch(
    env,
    `user_profiles?select=id,email,display_name,phone_number,role,is_active,created_at,updated_at&role=in.${roles}&order=created_at.asc`
  );
  return { staff: staff || [] };
}

async function createStaff(payload, env, request) {
  await requireAdminUser(request, env);
  const email = String(payload?.email || '').trim().toLowerCase();
  const password = String(payload?.password || '');
  const displayName = String(payload?.display_name || '').trim();
  const role = normalizeManagedRole(payload?.role);
  const googleOnlyRole = role === 'admin' || role === 'manager';

  if (!email || !email.includes('@')) {
    const err = new Error('A valid email is required');
    err.status = 400;
    throw err;
  }
  if (!googleOnlyRole && password.length < 8) {
    const err = new Error('Temporary password must be at least 8 characters');
    err.status = 400;
    throw err;
  }

  // Admin/manager: Google OAuth only. Promote an account that already signed in with Google.
  if (googleOnlyRole) {
    return promoteExistingUserToStaff({ email, role, displayName, password: '' }, env);
  }

  let created = null;
  try {
    created = await supabaseAuthAdminFetch(env, 'users', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        app_metadata: { role },
        user_metadata: displayName ? { display_name: displayName } : {},
      }),
    });
  } catch (error) {
    const alreadyExists = error?.status === 422 || /already (been )?registered|already exists/i.test(String(error?.message || ''));
    if (!alreadyExists) throw error;
    return promoteExistingUserToStaff({ email, role, displayName, password }, env);
  }
  const user = created?.user || created;
  if (!user?.id) throw new Error('Supabase did not return the created user');

  try {
    const rows = await supabaseFetch(env, 'user_profiles?on_conflict=id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({
        id: user.id,
        email,
        display_name: displayName || email.split('@')[0],
        role,
        is_active: true,
        email_verified: true,
      }),
    });
    return { staff: rows?.[0] || { id: user.id, email, display_name: displayName, role, is_active: true } };
  } catch (error) {
    await supabaseAuthAdminFetch(env, `users/${encodeURIComponent(user.id)}`, { method: 'DELETE' }).catch(() => {});
    throw error;
  }
}

async function promoteExistingUserToStaff({ email, role, displayName, password }, env) {
  const profiles = await supabaseFetch(
    env,
    `user_profiles?select=id,email,display_name,role,is_active&email=eq.${encodeURIComponent(email)}&limit=1`
  );
  let profile = profiles?.[0];

  if (!profile) {
    // Auth account exists but has no profile row — find it via the auth admin API.
    const result = await supabaseAuthAdminFetch(env, `users?page=1&per_page=1&email=${encodeURIComponent(email)}`);
    const authUser = (result?.users || []).find(
      (candidate) => String(candidate?.email || '').toLowerCase() === email
    );
    if (!authUser?.id) {
      const googleOnly = role === 'admin' || role === 'manager';
      const err = new Error(
        googleOnly
          ? 'Ask them to open Admin Login and Continue with Google once, then add them here.'
          : 'This email already has an account, but the profile could not be found'
      );
      err.status = googleOnly ? 404 : 409;
      throw err;
    }
    const rows = await supabaseFetch(env, 'user_profiles?on_conflict=id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({
        id: authUser.id,
        email,
        display_name: displayName || email.split('@')[0],
        role: 'customer',
        is_active: true,
      }),
    });
    profile = rows?.[0];
  }

  if (!profile?.id) throw new Error('Could not resolve the existing account for this email');

  if (role === 'admin' || role === 'manager') {
    const authUser = await supabaseAuthAdminFetch(env, `users/${encodeURIComponent(profile.id)}`).catch(() => null);
    if (!userHasGoogleIdentity(authUser?.user || authUser)) {
      const err = new Error(
        'This account has not signed in with Google yet. Ask them to use Continue with Google on Admin Login first.'
      );
      err.status = 400;
      throw err;
    }
  }

  const patch = { role, is_active: true };
  if (displayName) patch.display_name = displayName;

  const rows = await supabaseFetch(env, `user_profiles?id=eq.${encodeURIComponent(profile.id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(patch),
  });
  await supabaseAuthAdminFetch(env, `users/${encodeURIComponent(profile.id)}`, {
    method: 'PUT',
    body: JSON.stringify({
      app_metadata: { role },
      ban_duration: 'none',
      // Cashiers keep password login. Admin/manager are Google-only — do not set a password.
      ...(password && role === 'cashier' ? { password } : {}),
    }),
  });

  return { staff: rows?.[0] || { ...profile, ...patch }, promoted: true };
}

async function updateStaff(payload, env, request) {
  const { user: actor } = await requireAdminUser(request, env);
  const id = String(payload?.id || '').trim();
  if (!id) {
    const err = new Error('Staff id is required');
    err.status = 400;
    throw err;
  }

  const existingRows = await supabaseFetch(
    env,
    `user_profiles?select=id,email,display_name,role,is_active&id=eq.${encodeURIComponent(id)}&limit=1`
  );
  const existing = existingRows?.[0];
  if (!existing || !MANAGED_STAFF_ROLES.has(String(existing.role || '').toLowerCase())) {
    const err = new Error('Staff member not found');
    err.status = 404;
    throw err;
  }

  const nextRole = payload?.role == null ? existing.role : normalizeManagedRole(payload.role);
  const nextActive = payload?.is_active == null ? existing.is_active !== false : Boolean(payload.is_active);
  if (id === actor.id && (nextRole !== 'admin' || !nextActive)) {
    const err = new Error('You cannot remove your own administrator access');
    err.status = 400;
    throw err;
  }

  if (existing.role === 'admin' && (nextRole !== 'admin' || !nextActive)) {
    const admins = await supabaseFetch(
      env,
      `user_profiles?select=id&role=eq.admin&is_active=eq.true`
    );
    if ((admins || []).length <= 1) {
      const err = new Error('At least one active administrator is required');
      err.status = 400;
      throw err;
    }
  }

  if ((nextRole === 'admin' || nextRole === 'manager') && nextActive) {
    const authUser = await supabaseAuthAdminFetch(env, `users/${encodeURIComponent(id)}`).catch(() => null);
    if (!userHasGoogleIdentity(authUser?.user || authUser)) {
      const err = new Error(
        'Administrators and managers must have signed in with Google at least once before this role can be assigned.'
      );
      err.status = 400;
      throw err;
    }
  }

  const patch = {
    role: nextRole,
    is_active: nextActive,
  };
  if (payload?.display_name != null) patch.display_name = String(payload.display_name).trim();

  const rows = await supabaseFetch(env, `user_profiles?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(patch),
  });
  await supabaseAuthAdminFetch(env, `users/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({
      app_metadata: { role: nextRole },
      ban_duration: nextActive ? 'none' : '876000h',
    }),
  });
  return { staff: rows?.[0] || { ...existing, ...patch } };
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
  'invoices',
  'catalogues',
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
  if (value === 'hero') return 'heroes';
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

  // Any active staff role may upload; do not apply daily Google re-auth here
  // (that gate is for privileged admin RPCs and was blocking media silently).
  const user = await requireAuthenticatedUser(request, env);
  let staffRole = '';
  try {
    const profiles = await supabaseFetch(
      env,
      `user_profiles?select=role,is_active&id=eq.${encodeURIComponent(user.id)}&limit=1`,
    );
    const profile = profiles?.[0];
    staffRole = String(profile?.role || user?.app_metadata?.role || '').toLowerCase();
    if (profile?.is_active === false || !['admin', 'manager', 'cashier'].includes(staffRole)) {
      const err = new Error('Admin access required to upload media');
      err.status = 403;
      throw err;
    }
  } catch (error) {
    if (error?.status) throw error;
    // If profile lookup fails, still allow authenticated upload — R2 write is gated by auth.
    console.warn('[media/upload] staff profile check failed', error?.message || error);
  }

  const form = await request.formData();
  const file = form.get('file');
  const bucket = String(form.get('bucket') || 'media-assets').trim();
  const folder = normalizeMediaFolder(form.get('folder'));
  const isPrivate = String(form.get('private') || '0') === '1';
  const entityId = String(form.get('entity_id') || '').trim();
  const assetLabel = String(form.get('label') || form.get('seo_name') || '').trim();

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
  // Invoices: overwrite the same object key so re-sends do not create -2/-3 duplicates.
  const overwrite =
    String(form.get('overwrite') || '') === '1'
    || folder === 'invoices';
  const objectKey = overwrite
    ? buildMediaObjectKey(bucket, originalName, folder, {
      seoName,
      assetRole,
      entitySlug: seoName,
    }).objectKey
    : await buildUniqueMediaObjectKey(
      bucket,
      originalName,
      folder,
      { seoName, assetRole, entitySlug: seoName },
      env,
    );

  await env.MEDIA_BUCKET.put(objectKey, file.stream(), {
    httpMetadata: {
      contentType: file.type || 'application/octet-stream',
      cacheControl: overwrite
        ? 'public, max-age=60'
        : 'public, max-age=31536000, immutable',
    },
    customMetadata: {
      uploaded_by: user.id,
      original_name: originalName,
    },
  });

  if (isPrivate || bucket === 'user-uploads') {
    return { file_uri: objectKey };
  }

  const fileUrl = `${mediaPublicBase(env)}/${objectKey}`;
  let indexed = false;
  let index_error = null;

  // Index with service role so Media Library does not depend on client RLS.
  // Skip re-index on overwrite — same path already indexed; avoid duplicate rows.
  try {
    if (!overwrite) {
      const stem = objectKey.split('/').pop()?.replace(/\.[^.]+$/, '') || originalName;
      const name = (assetLabel || stem || originalName).slice(0, 240);
      await supabaseFetch(env, 'media_assets', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          name,
          slug: stem.slice(0, 240),
          file_path: objectKey,
          file_size: file.size,
          mime_type: file.type || null,
          media_type: String(file.type || '').startsWith('video/') ? 'video' : 'image',
          entity_type: folder,
          entity_id: null,
          upload_url: fileUrl,
          is_active: true,
          created_by: null,
        }),
      });
    }
    indexed = true;
  } catch (error) {
    index_error = error?.message || 'Media library index failed';
    console.error('[media/upload] index failed', index_error);
  }

  // Optional: attach hero image to product when editing an existing combo/product.
  if (entityId && assetRole === 'hero' && /^[0-9a-f-]{36}$/i.test(entityId)) {
    try {
      await supabaseFetch(env, `products?id=eq.${encodeURIComponent(entityId)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ featured_image_url: fileUrl }),
      });
      await supabaseFetch(env, `product_images?product_id=eq.${encodeURIComponent(entityId)}`, {
        method: 'DELETE',
      }).catch(() => null);
      await supabaseFetch(env, 'product_images', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify([{
          product_id: entityId,
          image_url: fileUrl,
          sort_order: 0,
          is_primary: true,
        }]),
      }).catch((err) => {
        console.warn('[media/upload] product_images sync failed', err?.message || err);
      });
    } catch (error) {
      console.warn('[media/upload] product hero attach failed', error?.message || error);
    }
  }

  return {
    file_url: fileUrl,
    file_path: objectKey,
    mime_type: file.type || null,
    file_size: file.size,
    original_name: originalName,
    folder,
    indexed,
    index_error,
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
  const warehouseId = await getDefaultWarehouseId(env);
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
        warehouse_id: warehouseId,
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
      warehouse_id: warehouseId,
    });
    deducted += 1;
  }

  return { deducted };
}

async function applyStockAdjustment(env, {
  productId,
  variantSku = null,
  variantLabel = null,
  deltaUnits = 0,
  deltaKg = 0,
  reason = 'adjustment',
  notes = null,
  createdBy = null,
  referenceType = null,
  referenceId = null,
  inventorySourceType = null,
  sourceDocumentType = null,
  sourceDocumentId = null,
}) {
  const products = await fetchProductsByIds(env, [productId]);
  const product = products?.[0];
  if (!product) throw new Error('Product not found');

  const warehouseId = await getDefaultWarehouseId(env);
  const variant = findVariant(product, variantSku, variantLabel);
  const sku = variantSku || variant?.sku || null;
  const units = Number(deltaUnits) || 0;
  const kgDelta = Number(deltaKg) || 0;
  const sharedKg = sharedStockKg(product);

  if (kgDelta !== 0 && sharedKg !== null) {
    const nextKg = Number((sharedKg + kgDelta).toFixed(3));
    if (nextKg < 0) throw new Error('Bulk stock cannot go below zero');
    await supabaseFetch(env, `products?id=eq.${encodeURIComponent(product.id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ shared_stock_kg: nextKg }),
    });
  } else if (units !== 0) {
    const variants = parseVariants(product);
    let updated = false;
    const nextVariants = variants.map((v) => {
      const match = sku
        ? String(v.sku || '').toLowerCase() === String(sku).toLowerCase()
        : variantLabel
          ? String(v.label || '').toLowerCase() === String(variantLabel).toLowerCase()
          : v === variant;
      if (!match) return v;
      const current = variantStockUnits(v, product);
      const next = current + units;
      if (next < 0) throw new Error('Variant stock cannot go below zero');
      updated = true;
      return { ...v, stock: next };
    });

    if (!updated && variants.length === 0) {
      const current = Number(product.stock_quantity) || 0;
      const next = current + units;
      if (next < 0) throw new Error('Stock cannot go below zero');
      await supabaseFetch(env, `products?id=eq.${encodeURIComponent(product.id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ stock_quantity: next }),
      });
    } else if (!updated) {
      throw new Error('Variant not found for stock adjustment');
    } else {
      await supabaseFetch(env, `products?id=eq.${encodeURIComponent(product.id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ quick_variants: nextVariants }),
      });
    }
  } else {
    throw new Error('Provide delta_units or delta_kg');
  }

  const movementRow = {
    product_id: product.id,
    variant_sku: sku,
    delta_units: units,
    delta_kg: kgDelta,
    reason,
    notes,
    reference_type: referenceType,
    reference_id: referenceId,
    created_by: createdBy,
    warehouse_id: warehouseId,
  };
  // Phase 4 additive sourcing metadata (columns nullable; omit when unset)
  if (inventorySourceType) movementRow.inventory_source_type = inventorySourceType;
  if (sourceDocumentType) movementRow.source_document_type = sourceDocumentType;
  if (sourceDocumentId) movementRow.source_document_id = sourceDocumentId;

  await recordStockMovement(env, movementRow);

  return { success: true, product_id: product.id };
}

async function listStockMovements(payload, env, request) {
  await requireStaffUser(request, env);
  const limit = Math.min(Math.max(Number(payload?.limit) || 100, 1), 500);
  const productId = String(payload?.product_id || '').trim();
  let path = `stock_movements?select=*&order=created_at.desc&limit=${limit}`;
  if (productId) {
    path += `&product_id=eq.${encodeURIComponent(productId)}`;
  }
  const rows = await supabaseFetch(env, path) || [];
  const productIds = [...new Set(rows.map((r) => r.product_id).filter(Boolean))];
  const products = productIds.length ? await fetchProductsByIds(env, productIds) : [];
  const byId = Object.fromEntries(products.map((p) => [p.id, p]));
  return {
    movements: rows.map((row) => ({
      ...row,
      product_name: byId[row.product_id]?.name || null,
      product_sku: byId[row.product_id]?.sku || null,
    })),
  };
}

async function recordStockAdjustment(payload, env, request) {
  const { user } = await requireStaffUser(request, env);
  const productId = payload?.product_id || payload?.productId;
  if (!productId) throw new Error('product_id required');

  const reason = String(payload?.reason || 'adjustment').trim() || 'adjustment';
  const allowedReasons = new Set(['purchase', 'adjustment', 'return', 'damage', 'count', 'transfer']);
  if (!allowedReasons.has(reason)) {
    throw new Error(`Invalid reason. Use: ${[...allowedReasons].join(', ')}`);
  }

  return applyStockAdjustment(env, {
    productId,
    variantSku: payload?.variant_sku || payload?.variantSku || null,
    variantLabel: payload?.variant_label || payload?.variantLabel || null,
    deltaUnits: Number(payload?.delta_units ?? payload?.deltaUnits ?? 0),
    deltaKg: Number(payload?.delta_kg ?? payload?.deltaKg ?? 0),
    reason,
    notes: payload?.notes || null,
    createdBy: user.id,
    referenceType: payload?.reference_type || 'manual',
    referenceId: payload?.reference_id || null,
    inventorySourceType: payload?.inventory_source_type || payload?.inventorySourceType || null,
    sourceDocumentType: payload?.source_document_type || payload?.sourceDocumentType || null,
    sourceDocumentId: payload?.source_document_id || payload?.sourceDocumentId || null,
  });
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

  const from = String(env.EMAIL_FROM || 'Yasvik <orders@yasvik.com>').trim();
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      reply_to: payload?.reply_to || 'yasvikfoods@gmail.com',
      to: [to],
      subject,
      html: body,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data?.message || data?.error || JSON.stringify(data) || `HTTP ${res.status}`;
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
  }
  return { success: true, provider: 'resend', id: data.id, from };
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
  const deliveryTier = mergedZone.zone_tier || 'standard';
  const expressEta = mergedZone.express_eta_label || null;
  const etaLabel = deliveryTier === 'express' && expressEta
    ? expressEta
    : mergedZone.eta_label;

  return {
    serviceable: true,
    postal,
    zone: { ...mergedZone, eta_label: etaLabel },
    postal_label: mergedZone.postal_label,
    delivery_tier: deliveryTier,
    express_eta_label: expressEta,
  };
}

const LOCAL_COLONY_PINCODES = ['500050', '500020', '500019', '500032', '500018'];
const DEFAULT_WAREHOUSE_ID = 'a1111111-1111-4111-a111-111111111111';

function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '').slice(-10);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

async function getDefaultWarehouseId(env) {
  return String(env.DEFAULT_WAREHOUSE_ID || DEFAULT_WAREHOUSE_ID).trim();
}

async function recordOrderStatusEvent(env, { orderId, status, note, actorId = null, actorType = 'system', metadata = {} }) {
  if (!orderId || !status) return;
  try {
    await supabaseFetch(env, 'order_status_events', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        order_id: orderId,
        status,
        note: note || null,
        actor_id: actorId,
        actor_type: actorType,
        metadata,
      }),
    });
  } catch (_) { /* non-blocking audit trail */ }
}

async function logNotification(env, row) {
  try {
    await supabaseFetch(env, 'notification_log', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(row),
    });
    return { ok: true };
  } catch (err) {
    console.error('[notification_log]', err?.message || err);
    return { ok: false, error: err?.message || 'log failed' };
  }
}

function resolveOrderContact(order) {
  const email = String(
    order?.customer_email || order?.guest_email || '',
  ).trim() || null;
  const phoneDigits = String(
    order?.customer_phone || order?.guest_phone || '',
  ).replace(/\D/g, '').slice(-10);
  const name = order?.customer_name || 'there';
  return { email, phoneDigits, name };
}

function formatRupeeFromPaise(paise) {
  return `₹${((Number(paise) || 0) / 100).toFixed(0)}`;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildOrderEmailSubject(orderRef, status) {
  const subjects = {
    confirmed: `Thank you — your Yasvik order ${orderRef} is confirmed`,
    packing: `We’re packing your Yasvik order ${orderRef}`,
    ready_for_dispatch: `Your Yasvik order ${orderRef} is ready to go`,
    shipped: `Your Yasvik order ${orderRef} is on its way`,
    out_for_delivery: `Your Yasvik order ${orderRef} is out for delivery`,
    delivered: `Your Yasvik order ${orderRef} has been delivered`,
    cancelled: `Update on your Yasvik order ${orderRef}`,
  };
  return subjects[status] || `Yasvik order ${orderRef} — ${status}`;
}

function buildOrderEmailIntro(status) {
  const intros = {
    confirmed: 'Thank you for choosing Yasvik and trusting us with food for your home. Your order is confirmed — our team will prepare it with the same care we bring to our store in Ashok Nagar.',
    packing: 'Good news — our team has started packing your order. We’re checking each item before it leaves.',
    ready_for_dispatch: 'Your order is packed and ready to leave our store.',
    shipped: 'Your order has left our store and is on its way to you.',
    out_for_delivery: 'Your order is out for delivery and should reach you soon.',
    delivered: 'Your order has been delivered. We hope everything reached you well — thank you for shopping with Yasvik.',
    cancelled: 'There’s an update on your order. If you have questions, we’re here to help.',
  };
  return intros[status] || 'Here’s an update on your Yasvik order.';
}

function resolveOrderEtaDisplay(status, order) {
  const checkoutEta = String(order?.eta_label || '').trim();
  switch (String(status || order?.status || '').toLowerCase()) {
    case 'out_for_delivery':
      return { label: 'Arriving', value: 'Today' };
    case 'shipped':
    case 'ready_for_dispatch':
      return { label: 'Expected', value: 'Today' };
    case 'delivered':
    case 'cancelled':
    case 'refunded':
    case 'failed':
      return null;
    default:
      return checkoutEta ? { label: 'Expected', value: checkoutEta } : null;
  }
}

function etaLabelForStatus(status) {
  switch (String(status || '').toLowerCase()) {
    case 'out_for_delivery':
      return 'Arriving today';
    case 'shipped':
    case 'ready_for_dispatch':
      return 'Today';
    default:
      return null;
  }
}

function buildOrderEmailHtml(order, { statusLabel, trackUrl, status }) {
  const { name } = resolveOrderContact(order);
  const orderRef = order.order_number || order.id;
  const addr = order.address_snapshot || {};
  const items = Array.isArray(order.items_snapshot) ? order.items_snapshot : [];
  const safeName = escapeHtml(name);
  const intro = buildOrderEmailIntro(status || 'confirmed');
  const etaDisplay = resolveOrderEtaDisplay(status || order?.status, order);
  const etaLine = etaDisplay
    ? `<p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#5C6B58">${escapeHtml(etaDisplay.label)}: <strong style="color:#1F3D2B">${escapeHtml(etaDisplay.value)}</strong></p>`
    : '';
  const addressLine = escapeHtml(
    [addr.street, addr.city, addr.state, addr.zip].filter(Boolean).join(', '),
  );

  const itemRows = items.map((item) => {
    const title = escapeHtml(item?.title || 'Item');
    const variant = item?.variant ? ` <span style="color:#5C6B58">${escapeHtml(item.variant)}</span>` : '';
    const qty = Number(item?.qty) || 1;
    const linePaise = Math.round(Number(item?.price || 0) * 100) * qty;
    return `<tr>
      <td style="padding:14px 0;border-bottom:1px solid #E8E1D5;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:#1F3D2B;line-height:1.4">
        ${title}${variant}
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#8A9586;margin-top:4px">Qty ${qty}</div>
      </td>
      <td style="padding:14px 0;border-bottom:1px solid #E8E1D5;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1F3D2B;text-align:right;vertical-align:top">${formatRupeeFromPaise(linePaise)}</td>
    </tr>`;
  }).join('');

  const subtotal = formatRupeeFromPaise(order.subtotal_paise ?? order.amount_paise);
  const deliveryFee = Number(order.delivery_fee_paise) > 0
    ? formatRupeeFromPaise(order.delivery_fee_paise)
    : 'Free';
  const bonusRedeemed = Number(order.bonus_redeemed_paise || 0) > 0
    ? formatRupeeFromPaise(order.bonus_redeemed_paise)
    : null;
  const bonusEarned = Number(order.bonus_earned_paise || 0) > 0
    ? formatRupeeFromPaise(order.bonus_earned_paise)
    : null;
  const bonusBalance = order.bonus_balance_after_paise != null
    ? formatRupeeFromPaise(order.bonus_balance_after_paise)
    : null;
  const bonusExpiry = order.bonus_breakdown?.expires_at
    ? escapeHtml(new Date(order.bonus_breakdown.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }))
    : null;
  const total = formatRupeeFromPaise(order.amount_paise);
  const logoUrl = 'https://www.yasvik.com/media/brand/logo-horizontal-white.png?v=20260630';
  const siteUrl = 'https://www.yasvik.com';
  const contactUrl = 'https://www.yasvik.com/contact';
  const whatsappUrl = 'https://wa.me/917842938998';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Yasvik order ${escapeHtml(orderRef)}</title>
</head>
<body style="margin:0;padding:0;background:#FAF7EF;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">
    ${escapeHtml(intro.slice(0, 120))}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF7EF;padding:32px 16px">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border:1px solid #E8E1D5;border-radius:20px;overflow:hidden">
          <tr>
            <td style="background:#1F3D2B;padding:28px 32px 24px;text-align:center">
              <a href="${siteUrl}" style="text-decoration:none">
                <img src="${logoUrl}" alt="Yasvik" width="180" style="display:block;margin:0 auto 14px;max-width:180px;height:auto;border:0" />
              </a>
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#C8D4C4">
                Natural Foods &amp; Everyday Essentials
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 8px">
              <p style="margin:0 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.2;color:#1F3D2B">
                Thank you, ${safeName}.
              </p>
              <p style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#5C6B58">
                ${escapeHtml(intro)}
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px">
                <tr>
                  <td style="background:#F3EDE0;border-radius:14px;padding:16px 18px">
                    <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#8A9586">Order number</p>
                    <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#1F3D2B">${escapeHtml(orderRef)}</p>
                    <p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#5C6B58">Status: <strong style="color:#1F3D2B">${escapeHtml(statusLabel)}</strong></p>
                    ${etaLine}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${items.length ? `<tr>
            <td style="padding:8px 32px 0">
              <p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#8A9586">Your order</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itemRows}</table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0 0">
                <tr>
                  <td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#5C6B58">Subtotal</td>
                  <td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1F3D2B;text-align:right">${subtotal}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#5C6B58">Delivery</td>
                  <td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1F3D2B;text-align:right">${deliveryFee}</td>
                </tr>
                ${bonusRedeemed ? `<tr>
                  <td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#5C6B58">Yasvik Bonus</td>
                  <td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1F3D2B;text-align:right">- ${bonusRedeemed}</td>
                </tr>` : ''}
                <tr>
                  <td style="padding:10px 0 0;border-top:2px solid #E8E1D5;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#1F3D2B">Total paid</td>
                  <td style="padding:10px 0 0;border-top:2px solid #E8E1D5;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#1F3D2B;text-align:right">${total}</td>
                </tr>
                ${bonusEarned || bonusBalance ? `<tr>
                  <td colspan="2" style="padding:14px 0 0">
                    <div style="background:#EEF5EA;border-radius:12px;padding:12px 14px;border:1px solid #C8D9C0">
                      <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#5C6B58">Yasvik Bonus</p>
                      ${bonusEarned ? `<p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1F3D2B">Earned: <strong>${bonusEarned}</strong> (from next order)</p>` : ''}
                      ${bonusBalance ? `<p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1F3D2B">Balance: <strong>${bonusBalance}</strong></p>` : ''}
                      ${bonusExpiry ? `<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#5C6B58">Expires: ${bonusExpiry}</p>` : ''}
                    </div>
                  </td>
                </tr>` : ''}
              </table>
            </td>
          </tr>` : `<tr><td style="padding:8px 32px 0"><p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1F3D2B"><strong>Total paid:</strong> ${total}</p></td></tr>`}
          <tr>
            <td style="padding:24px 32px 0">
              <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#8A9586">Delivering to</p>
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#1F3D2B">${addressLine || 'Address on file'}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 12px;text-align:center">
              <a href="${trackUrl}" style="display:inline-block;padding:14px 28px;background:#1F3D2B;color:#FFFFFF;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;text-decoration:none;border-radius:999px">Track your order</a>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 28px;text-align:center">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#5C6B58">
                Questions? Reply to this email, <a href="${whatsappUrl}" style="color:#1F3D2B">WhatsApp us</a>, or visit <a href="${contactUrl}" style="color:#1F3D2B">yasvik.com/contact</a>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#F3EDE0;padding:22px 32px;border-top:1px solid #E8E1D5">
              <p style="margin:0 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#1F3D2B;text-align:center">
                Conscious Food · Responsible Sourcing · Honest Quality
              </p>
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#8A9586;text-align:center">
                Yasvik Natural Foods · Ashok Nagar, Hyderabad<br />
                <a href="${siteUrl}" style="color:#5C6B58;text-decoration:none">www.yasvik.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
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

/** Must match frontend `DELIVERY_FEE_AT_CHECKOUT` in commerceCopy.js.
 * When false, courier fee is confirmed before dispatch — not charged at checkout. */
const COLLECT_DELIVERY_FEE_AT_CHECKOUT = false;

async function computeExpectedDeliveryFeePaise(env, pincode, subtotalPaise, zone) {
  if (!COLLECT_DELIVERY_FEE_AT_CHECKOUT) return 0;

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
  const ref = orderId || orderNumber;
  if (!ref) {
    throw new Error('Provide orderId or orderNumber');
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(ref));
  const filter = isUuid
    ? `id=eq.${encodeURIComponent(ref)}`
    : `order_number=eq.${encodeURIComponent(ref)}`;
  const orders = await supabaseFetch(env, `orders?select=*&${filter}&limit=1`);
  const order = orders?.[0];
  if (!order) {
    return { success: false, error: 'Order not found' };
  }

  const orderEmail = order.customer_email || order.guest_email;
  if (email && orderEmail && orderEmail.toLowerCase() !== email.toLowerCase()) {
    return { success: false, error: 'Verification failed. Please check your details.' };
  }
  if (phone) {
    const norm = (v) => String(v || '').replace(/\D/g, '').slice(-10);
    const orderPhone = order.customer_phone || order.guest_phone;
    if (orderPhone && norm(orderPhone) !== norm(phone)) {
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
      payment_method: order.payment_method || null,
      order_channel: order.order_channel || 'web',
      customer_name: order.customer_name || null,
      customer_email: order.customer_email || order.guest_email || null,
      customer_phone: order.customer_phone || order.guest_phone || null,
      amount_paise: order.amount_paise ?? Math.round(Number(order.total_amount || 0) * 100),
      subtotal_paise: order.subtotal_paise ?? null,
      delivery_fee_paise: order.delivery_fee_paise ?? 0,
      items_snapshot: order.items_snapshot || [],
      shipping_address: order.address_snapshot || null,
      eta_label: resolveOrderEtaDisplay(order.status, order)?.value || order.eta_label || null,
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

/** Public invoice short-link resolver — returns only the PDF URL, no customer PII. */
async function getPublicInvoice(payload, env) {
  const ref = String(
    payload?.orderNumber || payload?.order_number || payload?.orderId || payload?.order_id || payload?.id || ''
  ).trim();
  if (!ref) {
    const err = new Error('Invoice reference is required');
    err.status = 400;
    throw err;
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(ref);
  const filter = isUuid
    ? `id=eq.${encodeURIComponent(ref)}`
    : `order_number=eq.${encodeURIComponent(ref)}`;
  const orders = await supabaseFetch(
    env,
    `orders?select=id,order_number,receipt_id,invoice_url&${filter}&limit=1`
  );
  let order = orders?.[0];

  if (!order && !isUuid) {
    const byReceipt = await supabaseFetch(
      env,
      `orders?select=id,order_number,receipt_id,invoice_url&receipt_id=eq.${encodeURIComponent(ref)}&limit=1`
    );
    order = byReceipt?.[0];
  }

  if (!order) {
    return { success: false, error: 'Invoice not found' };
  }
  if (!order.invoice_url) {
    return {
      success: false,
      order_number: order.order_number || order.receipt_id || ref,
      error: 'Invoice PDF is not ready yet. Please ask the store to resend it on WhatsApp.',
    };
  }

  return {
    success: true,
    order_number: order.order_number || order.receipt_id || ref,
    invoice_url: order.invoice_url,
  };
}

async function sendOrderNotification(payload, env, request = null) {
  const orderId = payload?.orderId;
  const status = payload?.status;
  if (!orderId || !status) {
    throw new Error('Missing orderId or status');
  }

  if (request) {
    await requireStaffUser(request, env);
  }

  if (payload?.recordEvent !== false) {
    await recordOrderStatusEvent(env, {
      orderId,
      status,
      note: payload?.note || `Notification sent for ${status}`,
      actorId: payload?.actorId || null,
      actorType: payload?.actorType || 'system',
    });
  }

  const orders = await supabaseFetch(
    env,
    `orders?select=id,order_number,status,customer_email,customer_phone,customer_name,guest_email,guest_phone,amount_paise,subtotal_paise,delivery_fee_paise,discount_paise,discount_label,bonus_earned_paise,bonus_redeemed_paise,bonus_balance_after_paise,bonus_breakdown,eta_label,address_snapshot,items_snapshot,user_id,created_by,updated_at&id=eq.${encodeURIComponent(orderId)}&limit=1`
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

  const { email: resolvedEmail, phoneDigits, name } = resolveOrderContact(order);
  if (!resolvedEmail && order.user_id) {
    const users = await supabaseFetch(
      env,
      `user_profiles?select=email&id=eq.${encodeURIComponent(order.user_id)}&limit=1`
    );
    const profileEmail = users?.[0]?.email || null;
    if (profileEmail) {
      order.customer_email = profileEmail;
    }
  }
  const email = resolveOrderContact(order).email;

  const trackUrl = `https://www.yasvik.com/orders/${encodeURIComponent(orderRef)}/track`;
  const emailBody = buildOrderEmailHtml(order, { statusLabel, trackUrl, status });
  const emailSubject = buildOrderEmailSubject(orderRef, status);

  let emailSent = false;
  let emailError = null;
  if (!email) {
    emailError = 'No customer email on order';
    await logNotification(env, {
      order_id: orderId,
      channel: 'email',
      recipient: null,
      template_key: `order_${status}`,
      status: 'skipped',
      payload: { order_number: orderRef, status, reason: emailError },
      error_message: emailError,
    });
  } else {
    try {
      const sendResult = await sendEmail(
    {
      to: email,
          subject: emailSubject,
          body: emailBody,
    },
    env
  );
      emailSent = true;
      await logNotification(env, {
        order_id: orderId,
        channel: 'email',
        recipient: email,
        template_key: `order_${status}`,
        status: 'sent',
        payload: { order_number: orderRef, status, resend_id: sendResult.id || null },
      });
    } catch (err) {
      emailError = err?.message || 'Email failed';
      console.error('[sendOrderNotification email]', orderRef, emailError);
      await logNotification(env, {
        order_id: orderId,
        channel: 'email',
        recipient: email,
        template_key: `order_${status}`,
        status: 'failed',
        payload: { order_number: orderRef, status },
        error_message: emailError,
      });
    }
  }

  const whatsappMessage = [
    `Hi ${name} 👋`,
    `Your Yasvik order *${orderRef}* is now *${statusLabel}*.`,
    (() => {
      const etaDisplay = resolveOrderEtaDisplay(status, order);
      return etaDisplay ? `${etaDisplay.label}: ${etaDisplay.value}` : null;
    })(),
    `Track: ${trackUrl}`,
    '',
    '— Yasvik',
  ].filter(Boolean).join('\n');

  const whatsappUrl = phoneDigits.length === 10
    ? `https://wa.me/91${phoneDigits}?text=${encodeURIComponent(whatsappMessage)}`
    : null;

  let whatsappSent = false;
  let whatsappApiError = null;

  if (phoneDigits.length === 10) {
    const apiResult = await sendWhatsAppApiMessage({
      to: phoneDigits,
      body: whatsappMessage,
      templateParams: [
        order.customer_name || 'there',
        orderRef,
        statusLabel,
        trackUrl,
      ],
    }, env);
    if (apiResult.sent) {
      whatsappSent = true;
      await logNotification(env, {
        order_id: orderId,
        channel: 'whatsapp',
        recipient: phoneDigits,
        template_key: `order_${status}`,
        status: 'sent',
        payload: {
          order_number: orderRef,
          status,
          api: true,
          message_id: apiResult.message_id || null,
        },
      });
    } else if (!apiResult.skipped) {
      whatsappApiError = apiResult.error || 'WhatsApp API failed';
      await logNotification(env, {
        order_id: orderId,
        channel: 'whatsapp',
        recipient: phoneDigits,
        template_key: `order_${status}`,
        status: 'failed',
        payload: { order_number: orderRef, status, message: whatsappMessage },
        error_message: whatsappApiError,
      });
    } else if (whatsappUrl) {
      await logNotification(env, {
        order_id: orderId,
        channel: 'whatsapp',
        recipient: phoneDigits,
        template_key: `order_${status}`,
        status: 'queued',
        payload: { order_number: orderRef, status, whatsapp_url: whatsappUrl, message: whatsappMessage },
      });
    }
  }

  return {
    success: emailSent || whatsappSent || Boolean(whatsappUrl),
    email_sent: emailSent,
    email_error: emailError,
    whatsapp_sent: whatsappSent,
    whatsapp_api_error: whatsappApiError,
    whatsapp_url: whatsappUrl,
    order_number: orderRef,
  };
}

async function sendWhatsAppApiMessage({ to, body, templateParams, documentUrl, documentFilename }, env) {
  const token = String(env.WHATSAPP_ACCESS_TOKEN || '').trim();
  const phoneNumberId = String(env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
  if (!token || !phoneNumberId) {
    return { sent: false, skipped: true, reason: 'not_configured' };
  }

  const digits = String(to || '').replace(/\D/g, '');
  const toNumber = digits.length === 10 ? `91${digits}` : digits;
  if (toNumber.length < 11) {
    return { sent: false, error: 'Invalid phone number for WhatsApp' };
  }

  const templateName = String(env.WHATSAPP_ORDER_TEMPLATE_NAME || '').trim();
  const templateLang = String(env.WHATSAPP_TEMPLATE_LANGUAGE || 'en').trim() || 'en';
  const params = Array.isArray(templateParams)
    ? templateParams.map((value) => String(value || '').slice(0, 1024))
    : [];

  let payload;
  if (documentUrl) {
    payload = {
      messaging_product: 'whatsapp',
      to: toNumber,
      type: 'document',
      document: {
        link: String(documentUrl),
        caption: String(body || '').slice(0, 1024),
        filename: String(documentFilename || 'Yasvik-Invoice.pdf').slice(0, 240),
      },
    };
  } else if (templateName && params.length > 0) {
    payload = {
      messaging_product: 'whatsapp',
      to: toNumber,
      type: 'template',
      template: {
        name: templateName,
        language: { code: templateLang },
        components: [{
          type: 'body',
          parameters: params.map((text) => ({ type: 'text', text })),
        }],
      },
    };
  } else {
    payload = {
      messaging_product: 'whatsapp',
      to: toNumber,
      type: 'text',
      text: { preview_url: true, body: String(body || '').slice(0, 4096) },
    };
  }

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { sent: false, error: data?.error?.message || `WhatsApp API ${res.status}` };
  }
  return { sent: true, message_id: data?.messages?.[0]?.id || null };
}

/**
 * POS / admin: send invoice PDF to customer via WhatsApp Cloud API (true attachment).
 * Falls back to client-side chat open when API is not configured or the 24h window blocks send.
 */
async function sendInvoiceWhatsApp(payload, env, request) {
  await requireStaffUser(request, env);

  const phone = String(payload?.phone || payload?.customer_phone || '').replace(/\D/g, '').slice(-10);
  const invoiceUrl = String(payload?.invoice_url || payload?.invoiceUrl || '').trim();
  const caption = String(payload?.caption || payload?.message || '').trim();
  const fileName = String(payload?.filename || payload?.fileName || 'Yasvik-Invoice.pdf').trim();
  const orderId = payload?.order_id || payload?.orderId || null;

  if (phone.length !== 10) {
    const err = new Error('A valid 10-digit customer phone is required');
    err.status = 400;
    throw err;
  }
  if (!invoiceUrl || !/^https:\/\//i.test(invoiceUrl)) {
    const err = new Error('A public https invoice URL is required');
    err.status = 400;
    throw err;
  }

  // Prefer document+caption in one message (customer sees PDF attachment).
  const docResult = await sendWhatsAppApiMessage({
    to: phone,
    body: caption.slice(0, 1024),
    documentUrl: invoiceUrl,
    documentFilename: fileName || 'Yasvik-Invoice.pdf',
  }, env);

  if (docResult.skipped) {
    return {
      sent: false,
      skipped: true,
      reason: 'not_configured',
      hint: 'WhatsApp Business API is not configured on the server.',
    };
  }

  if (docResult.sent) {
    if (orderId) {
      await logNotification(env, {
        order_id: orderId,
        channel: 'whatsapp',
        recipient: phone,
        template_key: 'pos_invoice_pdf',
        status: 'sent',
        payload: {
          invoice_url: invoiceUrl,
          message_id: docResult.message_id || null,
          api: true,
        },
      }).catch(() => {});
    }
    return {
      sent: true,
      message_id: docResult.message_id || null,
      hint: 'Invoice PDF sent on WhatsApp to the customer.',
    };
  }

  if (orderId) {
    await logNotification(env, {
      order_id: orderId,
      channel: 'whatsapp',
      recipient: phone,
      template_key: 'pos_invoice_pdf',
      status: 'failed',
      payload: { invoice_url: invoiceUrl },
      error_message: docResult.error || 'WhatsApp API failed',
    }).catch(() => {});
  }

  return {
    sent: false,
    skipped: false,
    error: docResult.error || 'WhatsApp API failed',
    hint: docResult.error || 'Could not send via WhatsApp API.',
  };
}

async function adminUpdateOrderStatus(payload, env, request) {
  const { user } = await requireStaffUser(request, env);
  const orderId = payload?.orderId || payload?.order_id;
  if (!orderId) throw new Error('orderId required');

  const newStatus = payload?.status;
  const previousStatus = payload?.previousStatus || payload?.previous_status;
  const statusNote = payload?.statusNote || payload?.note || '';
  const timeline = payload?.timeline;

  const existingRows = await supabaseFetch(
    env,
    `orders?select=id,payment_status,payment_method,status&id=eq.${encodeURIComponent(orderId)}&limit=1`
  );
  const existingOrder = existingRows?.[0];

  const patch = {
    ...(newStatus ? { status: newStatus } : {}),
    ...(timeline ? { timeline } : {}),
    ...(payload?.admin_notes !== undefined ? { admin_notes: payload.admin_notes } : {}),
    ...(payload?.tracking_id !== undefined ? { tracking_id: payload.tracking_id } : {}),
    ...(payload?.carrier !== undefined ? { carrier: payload.carrier } : {}),
    ...(payload?.rider_name !== undefined ? { rider_name: payload.rider_name } : {}),
    ...(payload?.rider_phone !== undefined ? { rider_phone: payload.rider_phone } : {}),
    ...(payload?.delivery_slot !== undefined ? { delivery_slot: payload.delivery_slot } : {}),
    ...(payload?.delivery_fee_charged_paise !== undefined
      ? { delivery_fee_charged_paise: Number(payload.delivery_fee_charged_paise) || 0 }
      : {}),
    ...(payload?.delivery_cost_actual_paise !== undefined
      ? { delivery_cost_actual_paise: Number(payload.delivery_cost_actual_paise) || 0 }
      : {}),
    ...(payload?.invoice_url !== undefined ? { invoice_url: payload.invoice_url || null } : {}),
  };

  const nextEta = newStatus ? etaLabelForStatus(newStatus) : null;
  if (nextEta) {
    patch.eta_label = nextEta;
  }

  if (
    newStatus === 'delivered'
    && existingOrder?.payment_status === 'pending_cod'
    && existingOrder?.payment_method === 'cod'
  ) {
    patch.payment_status = 'paid';
  }

  await supabaseFetch(env, `orders?id=eq.${encodeURIComponent(orderId)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(patch),
  });

  const statusChanged = Boolean(newStatus && previousStatus !== newStatus);

  if (statusChanged) {
    await recordOrderStatusEvent(env, {
      orderId,
      status: newStatus,
      note: statusNote || `Status updated to ${newStatus}`,
      actorId: user.id,
      actorType: 'staff',
    });
  }

  // COD becomes paid on delivery — earn then. Cancel/refund reverse bonus.
  let bonusResult = null;
  if (statusChanged) {
    if (newStatus === 'delivered' && existingOrder?.payment_method === 'cod') {
      bonusResult = await applyOrderBonusLifecycle(env, orderId, {
        earn: true,
        actorId: user.id,
      });
    }
    if (['cancelled', 'refunded'].includes(String(newStatus))) {
      bonusResult = (await callBonusRpc(env, 'reverse_bonus_for_order', {
        p_order_id: orderId,
        p_reason: statusNote || `Order ${newStatus}`,
        p_actor: user.id,
      })).data;
    }
  }

  let notifyResult = null;
  if (statusChanged && payload?.notify !== false) {
    notifyResult = await sendOrderNotification({
      orderId,
      status: newStatus,
      note: statusNote,
      actorId: user.id,
      actorType: 'staff',
      recordEvent: false,
    }, env);
  }

  let events = [];
  let notifications = [];
  try {
    events = await supabaseFetch(
      env,
      `order_status_events?select=*&order_id=eq.${encodeURIComponent(orderId)}&order=created_at.desc&limit=12`
    ) || [];
    notifications = await supabaseFetch(
      env,
      `notification_log?select=*&order_id=eq.${encodeURIComponent(orderId)}&order=created_at.desc&limit=12`
    ) || [];
  } catch (_) { /* non-blocking */ }

  return {
    success: true,
    status_changed: statusChanged,
    notifyResult,
    events,
    notifications,
    bonus: bonusResult,
  };
}

function orderEditLineKey(item = {}) {
  return [
    item.product_id || '',
    String(item.sku || '').toLowerCase(),
    String(item.variant || item.variant_label || '').toLowerCase(),
  ].join('::');
}

function qtyMapFromSnapshot(items = []) {
  const map = new Map();
  for (const item of items) {
    if (!item?.product_id || item.type === 'combo' || item.type === 'custom') continue;
    const key = orderEditLineKey(item);
    const prev = map.get(key) || { qty: 0, item };
    prev.qty += Math.max(0, Number(item.qty) || 0);
    prev.item = item;
    map.set(key, prev);
  }
  return map;
}

async function applyOrderItemStockDeltas(env, {
  orderId,
  previousItems = [],
  nextItems = [],
  createdBy = null,
}) {
  const before = qtyMapFromSnapshot(previousItems);
  const after = qtyMapFromSnapshot(nextItems);
  const keys = new Set([...before.keys(), ...after.keys()]);
  let adjusted = 0;

  for (const key of keys) {
    const oldQty = before.get(key)?.qty || 0;
    const newQty = after.get(key)?.qty || 0;
    const deltaQty = newQty - oldQty;
    if (!deltaQty) continue;

    const sample = after.get(key)?.item || before.get(key)?.item || {};
    const packKg = Number(sample.pack_kg);
    const useKg = Number.isFinite(packKg) && packKg > 0;
    try {
      await applyStockAdjustment(env, {
        productId: sample.product_id,
        variantSku: sample.sku || null,
        variantLabel: sample.variant || sample.variant_label || null,
        deltaUnits: useKg ? 0 : -deltaQty,
        deltaKg: useKg ? Number((-(packKg * deltaQty)).toFixed(3)) : 0,
        reason: 'order_edit',
        notes: `Order items edited (${deltaQty > 0 ? 'added' : 'removed'} ${Math.abs(deltaQty)})`,
        createdBy,
        referenceType: 'order',
        referenceId: orderId,
      });
      adjusted += 1;
    } catch (err) {
      // Stock sync is best-effort so a catalogue mismatch does not block invoice correction.
      console.error('[adminEditOrderItems] stock delta failed', key, err?.message || err);
    }
  }

  return { adjusted };
}

/**
 * Staff: replace order line items. Updates items_snapshot + totals + order_items,
 * adjusts stock deltas, clears hosted invoice_url so the next PDF send replaces
 * the same bill (no new order number / no duplicate invoice row).
 */
async function adminEditOrderItems(payload, env, request) {
  const { user } = await requireStaffUser(request, env);
  const orderId = payload?.orderId || payload?.order_id;
  if (!orderId) throw new Error('orderId required');

  const rawItems = Array.isArray(payload?.items) ? payload.items : null;
  if (!rawItems) throw new Error('items array required');
  if (!rawItems.length) throw new Error('Order must keep at least one item');

  const existingRows = await supabaseFetch(
    env,
    `orders?select=*&id=eq.${encodeURIComponent(orderId)}&limit=1`
  );
  const existing = existingRows?.[0];
  if (!existing?.id) throw new Error('Order not found');

  const blocked = ['cancelled', 'refunded'];
  if (blocked.includes(String(existing.status || '').toLowerCase())) {
    throw new Error('Cannot edit items on a cancelled or refunded order');
  }

  const normalized = normalizeCheckoutItems(rawItems).filter((item) => {
    const qty = Math.max(0, Number(item.qty) || 0);
    const price = Number(item.price);
    return qty > 0 && Number.isFinite(price) && price >= 0 && item.title;
  });
  if (!normalized.length) throw new Error('No valid items after normalisation');

  const enriched = await enrichItemsSnapshot(env, normalized);
  const subtotalPaise = enriched.reduce(
    (sum, item) => sum + Math.round(Number(item.price || 0) * 100) * Math.max(1, Number(item.qty) || 1),
    0,
  );

  const eligible = enriched.reduce((sum, item) => {
    if (item.exclude_from_discount) return sum;
    return sum + Math.round(Number(item.price || 0) * 100) * Math.max(1, Number(item.qty) || 1);
  }, 0);

  // If bill was a percent discount (label "10%"), recompute from current eligible lines
  // so the invoice stays 10% — not a stale paise amount spread oddly across lines.
  const label = String(
    payload?.discount_label !== undefined ? payload.discount_label : existing.discount_label || ''
  ).trim();
  const pctMatch = label.match(/^(\d+(?:\.\d+)?)\s*%/);
  let discountPaise;
  if (pctMatch && eligible > 0) {
    const pct = Number(pctMatch[1]);
    discountPaise = Math.min(
      eligible,
      Math.round((eligible * pct) / 100),
    );
  } else {
    discountPaise = Math.max(0, Math.round(Number(
      payload?.discount_paise != null ? payload.discount_paise : existing.discount_paise
    ) || 0));
    discountPaise = Math.min(discountPaise, eligible > 0 ? eligible : subtotalPaise);
  }

  const deliveryFeePaise = Math.max(0, Math.round(Number(
    payload?.delivery_fee_paise != null ? payload.delivery_fee_paise : existing.delivery_fee_paise
  ) || 0));
  const bonusRedeemed = Math.max(0, Math.round(Number(existing.bonus_redeemed_paise) || 0));

  const amountBeforeBonus = Math.max(0, subtotalPaise - discountPaise + deliveryFeePaise);
  const amountPaise = Math.max(0, amountBeforeBonus - Math.min(bonusRedeemed, amountBeforeBonus));

  const itemsSnapshot = mapItemsSnapshotWithDiscount(enriched, discountPaise, subtotalPaise);
  const previousSnapshot = Array.isArray(existing.items_snapshot) ? existing.items_snapshot : [];

  const now = new Date().toISOString();
  const timelineEntry = {
    timestamp: now,
    status: existing.status,
    note: payload?.note || `Items edited (${previousSnapshot.length} → ${itemsSnapshot.length} lines)`,
    updated_by: user.email || user.id || 'staff',
  };
  const timeline = [...(Array.isArray(existing.timeline) ? existing.timeline : []), timelineEntry];

  const patch = {
    items_snapshot: itemsSnapshot,
    subtotal_paise: subtotalPaise,
    discount_paise: discountPaise,
    discount_amount: discountPaise / 100,
    delivery_fee_paise: deliveryFeePaise,
    shipping_cost: deliveryFeePaise / 100,
    amount_paise: amountPaise,
    total_amount: amountPaise / 100,
    subtotal: subtotalPaise / 100,
    timeline,
    // Force hosted invoice refresh on next WhatsApp send (same order_number, overwrite PDF).
    invoice_url: null,
  };
  if (payload?.discount_label !== undefined) {
    patch.discount_label = payload.discount_label || null;
  }

  await supabaseFetch(env, `orders?id=eq.${encodeURIComponent(orderId)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(patch),
  });

  await supabaseFetch(env, `order_items?order_id=eq.${encodeURIComponent(orderId)}`, {
    method: 'DELETE',
    headers: { Prefer: 'return=minimal' },
  }).catch((err) => {
    console.error('[adminEditOrderItems] delete order_items', err?.message || err);
  });

  const lineRows = buildOrderItemRows(enriched);
  await insertOrderItems(env, orderId, lineRows);

  const stock = await applyOrderItemStockDeltas(env, {
    orderId,
    previousItems: previousSnapshot,
    nextItems: itemsSnapshot,
    createdBy: user.id,
  });

  await recordOrderStatusEvent(env, {
    orderId,
    status: existing.status,
    note: timelineEntry.note,
    actorId: user.id,
    actorType: 'staff',
  }).catch(() => null);

  const updatedRows = await supabaseFetch(
    env,
    `orders?select=*&id=eq.${encodeURIComponent(orderId)}&limit=1`
  );
  const order = updatedRows?.[0] || { ...existing, ...patch };

  return {
    success: true,
    order,
    stock,
    invoice_url_cleared: true,
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
    original_price: Number(item.original_price ?? item.originalPrice ?? item.compare_price ?? item.price ?? 0),
    type: item.type || 'product',
    exclude_from_discount: Boolean(
      item.exclude_from_discount || item.discount_excluded || item.excludeFromDiscount
    ),
  }));
}

function buildOrderItemRows(items = []) {
  return items
    .filter((i) => i.type !== 'combo' && i.type !== 'custom' && i.product_id)
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

const COD_MAX_ORDER_PAISE = 250000;

function normalizeCouponCode(code) {
  return String(code || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

function normalizePhoneDigits(value) {
  return String(value || '').replace(/\D/g, '').slice(-10);
}

/** Walk category → parents; true if any has exclude_from_bill_discount. */
function categoryExcludesBillDiscount(categoryId, catById) {
  let id = categoryId;
  const seen = new Set();
  while (id && !seen.has(id)) {
    seen.add(id);
    const cat = catById.get(id);
    if (!cat) break;
    if (cat.exclude_from_bill_discount) return true;
    id = cat.parent_id || null;
  }
  return false;
}

/** Enrich cart lines with category tags + auto exclude_from_discount by category. Fail-open. */
async function enrichItemsSnapshotCategories(env, items = []) {
  const ids = [...new Set(items.map((i) => i.product_id).filter(Boolean))];
  if (!ids.length) return items.map((i) => ({ ...i }));
  try {
    const filter = `id=in.(${ids.map((id) => encodeURIComponent(id)).join(',')})`;
    const [products, categories] = await Promise.all([
      supabaseFetch(
        env,
        `products?select=id,category_id,categories(id,name,slug)&${filter}`
      ),
      supabaseFetch(
        env,
        'categories?select=id,parent_id,exclude_from_bill_discount&limit=500'
      ),
    ]);
    const byId = Object.fromEntries((products || []).map((p) => [p.id, p]));
    const catById = new Map((categories || []).map((c) => [c.id, c]));
    return items.map((i) => {
      const p = byId[i.product_id];
      const cat = p?.categories;
      const categoryId = p?.category_id || i.category_id || null;
      const fromCategory = categoryExcludesBillDiscount(categoryId, catById);
      return {
        ...i,
        category_id: categoryId,
        category_name: cat?.name || i.category_name || null,
        category_slug: cat?.slug || i.category_slug || null,
        exclude_from_discount: Boolean(i.exclude_from_discount) || fromCategory,
      };
    });
  } catch (err) {
    console.error('[enrichItemsSnapshotCategories]', err?.message || err);
    return items.map((i) => ({ ...i }));
  }
}

const PRICING_META_LABEL = '__yasvik_pricing__';

function extractPurchaseRatePerKg(product) {
  const allVariants = parseVariants(product);
  const metaRow = allVariants.find(
    (v) => v?.label === PRICING_META_LABEL || v?.sku === PRICING_META_LABEL
  );
  if (metaRow?.notes) {
    try {
      const parsed = typeof metaRow.notes === 'string' ? JSON.parse(metaRow.notes) : metaRow.notes;
      const rate = Number(parsed?.purchase_rate_per_kg);
      if (Number.isFinite(rate) && rate > 0) return rate;
    } catch {
      /* ignore */
    }
  }
  const colRate = Number(product?.purchase_rate_per_kg);
  if (Number.isFinite(colRate) && colRate > 0) return colRate;
  return null;
}

function linePurchaseCostFields(item, product) {
  const purchaseRatePerKg = extractPurchaseRatePerKg(product);
  if (!Number.isFinite(purchaseRatePerKg) || purchaseRatePerKg <= 0) {
    return {
      purchase_rate_per_kg: null,
      purchase_cost_paise: null,
      line_cost_paise: null,
    };
  }

  const variant = findVariant(product, item.sku, item.variant);
  const measureType = String(product?.stock_measure_type || '').trim();
  const qty = Number(item.qty || 1);
  let packQty = Number(item.pack_kg ?? variant?.pack_kg);

  // Units/pieces: cost is ₹/pc × piece count (never invent kg)
  if (measureType === 'units') {
    if (!(Number.isFinite(packQty) && packQty > 0)) {
      const label = String(item.variant || variant?.label || '');
      const countMatch = label.toLowerCase().match(/(\d+)\s*(?:pc|pcs|piece|pieces|pack|count)\b/);
      packQty = countMatch ? Number(countMatch[1]) : 1;
    }
    const purchaseCostPaise = Math.round(purchaseRatePerKg * packQty * 100);
    return {
      purchase_rate_per_kg: purchaseRatePerKg,
      purchase_cost_paise: purchaseCostPaise,
      line_cost_paise: purchaseCostPaise * qty,
    };
  }

  if (Number.isFinite(packQty) && packQty > 0) {
    const purchaseCostPaise = Math.round(purchaseRatePerKg * packQty * 100);
    return {
      purchase_rate_per_kg: purchaseRatePerKg,
      purchase_cost_paise: purchaseCostPaise,
      line_cost_paise: purchaseCostPaise * qty,
    };
  }

  return {
    purchase_rate_per_kg: purchaseRatePerKg,
    purchase_cost_paise: null,
    line_cost_paise: null,
  };
}

/** Enrich cart lines with purchase cost for margin tracking. Fail-open. */
async function enrichItemsSnapshotCosts(env, items = []) {
  const ids = [...new Set(items.map((i) => i.product_id).filter(Boolean))];
  if (!ids.length) return items.map((i) => ({ ...i }));
  try {
    const filter = `id=in.(${ids.map((id) => encodeURIComponent(id)).join(',')})`;
    const products = await supabaseFetch(
      env,
      `products?select=id,quick_variants,purchase_rate_per_kg,stock_measure_type&${filter}`
    );
    const byId = Object.fromEntries((products || []).map((p) => [p.id, p]));
    return items.map((i) => ({
      ...i,
      ...linePurchaseCostFields(i, byId[i.product_id] || {}),
    }));
  } catch (err) {
    console.error('[enrichItemsSnapshotCosts]', err?.message || err);
    return items.map((i) => ({ ...i }));
  }
}

async function enrichItemsSnapshot(env, items = []) {
  const withCategories = await enrichItemsSnapshotCategories(env, items);
  return enrichItemsSnapshotCosts(env, withCategories);
}

function mapItemsSnapshotLine(i) {
  return {
    product_id: i.product_id || null,
    title: i.title,
    variant: i.variant,
    sku: i.sku,
    pack_kg: i.pack_kg,
    qty: i.qty,
    price: i.price,
    original_price: i.original_price,
    type: i.type || 'product',
    unit: null,
    category_id: i.category_id || null,
    category_name: i.category_name || null,
    category_slug: i.category_slug || null,
    purchase_rate_per_kg: i.purchase_rate_per_kg ?? null,
    purchase_cost_paise: i.purchase_cost_paise ?? null,
    line_cost_paise: i.line_cost_paise ?? null,
    exclude_from_discount: Boolean(i.exclude_from_discount),
  };
}

function mapItemsSnapshotWithDiscount(items = [], discountPaise = 0, subtotalPaise = null) {
  const mapped = items.map(mapItemsSnapshotLine);
  const lineSubtotals = mapped.map((line) => (
    Math.max(0, Math.round(Number(line.price || 0) * 100)) * Math.max(1, Number(line.qty) || 1)
  ));
  const excluded = mapped.map((line) => Boolean(line.exclude_from_discount));
  const eligibleSubtotal = lineSubtotals.reduce(
    (sum, value, index) => (excluded[index] ? sum : sum + value),
    0,
  );
  const subtotal = Math.max(
    0,
    Number(subtotalPaise) || lineSubtotals.reduce((sum, value) => sum + value, 0),
  );
  const discount = Math.min(
    Math.max(0, Math.round(Number(discountPaise) || 0)),
    eligibleSubtotal > 0 ? eligibleSubtotal : subtotal,
  );
  const rawAllocations = lineSubtotals.map((lineTotal, index) => (
    excluded[index] || eligibleSubtotal <= 0 ? 0 : (discount * lineTotal) / eligibleSubtotal
  ));
  const allocations = rawAllocations.map((value, index) => (
    excluded[index] ? 0 : Math.min(Math.floor(value), lineSubtotals[index])
  ));
  let remainder = discount - allocations.reduce((sum, value) => sum + value, 0);
  const priority = rawAllocations
    .map((value, index) => ({ index, fraction: value - Math.floor(value), excluded: excluded[index] }))
    .filter((row) => !row.excluded)
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (const { index } of priority) {
    if (remainder <= 0) break;
    if (allocations[index] >= lineSubtotals[index]) continue;
    allocations[index] += 1;
    remainder -= 1;
  }

  return mapped.map((line, index) => ({
    ...line,
    original_unit_price_paise: Math.max(0, Math.round(Number(line.price || 0) * 100)),
    line_subtotal_paise: lineSubtotals[index],
    discount_allocated_paise: allocations[index] || 0,
    line_total_after_discount_paise: Math.max(0, lineSubtotals[index] - (allocations[index] || 0)),
  }));
}

/** Call Yasvik Bonus RPCs (service role). Never throws — returns { ok, data|error }. */
async function callBonusRpc(env, fnName, args = {}) {
  try {
    const data = await supabaseFetch(env, `rpc/${fnName}`, {
      method: 'POST',
      body: JSON.stringify(args),
    });
    return { ok: true, data };
  } catch (err) {
    console.error(`[bonus:${fnName}]`, err?.message || err);
    return { ok: false, error: err?.message || String(err) };
  }
}

async function applyOrderBonusLifecycle(env, orderId, {
  redeemPaise = 0,
  redeemConfirmed = false,
  actorId = null,
  earn = true,
} = {}) {
  const result = {
    redeem: null,
    earn: null,
  };
  if (!orderId) return result;

  const requested = Math.max(0, Math.round(Number(redeemPaise) || 0));
  if (requested > 0) {
    if (!redeemConfirmed) {
      result.redeem = { applied: false, reason: 'not_confirmed' };
    } else {
      result.redeem = (await callBonusRpc(env, 'apply_bonus_redeem', {
        p_order_id: orderId,
        p_amount_paise: requested,
        p_confirmed: true,
        p_actor: actorId || null,
      })).data;
    }
  }

  if (earn) {
    result.earn = (await callBonusRpc(env, 'apply_bonus_earn', {
      p_order_id: orderId,
      p_actor: actorId || null,
    })).data;
  }
  return result;
}

async function previewBonus(payload, env, request) {
  await requireStaffUser(request, env);
  const orderId = payload?.order_id || payload?.orderId;
  if (orderId) {
    const res = await callBonusRpc(env, 'preview_bonus', { p_order_id: orderId });
    if (!res.ok) throw new Error(res.error || 'preview_bonus failed');
    return res.data;
  }

  // Cart preview without a persisted order: build ephemeral compute via settled balance + eligible lines
  const phone = normalizePhoneDigits(payload?.customer_phone || payload?.phone);
  let settled = 0;
  let customer = null;
  if (phone.length === 10) {
    const rows = await supabaseFetch(
      env,
      `customers?select=id,phone_digits,name,bonus_balance_paise,bonus_expires_at,bonus_earned_paise,bonus_redeemed_paise&phone_digits=eq.${encodeURIComponent(phone)}&limit=1`
    );
    customer = rows?.[0] || null;
    settled = Number(customer?.bonus_balance_paise || 0);
  }

  const settings = await supabaseFetch(
    env,
    'app_settings?select=setting_key,setting_value&setting_key=in.(bonus.max_redeem_percent,bonus.enabled)'
  );
  const map = Object.fromEntries((settings || []).map((s) => [s.setting_key, s.setting_value]));
  const maxRedeemPct = Number(map['bonus.max_redeem_percent'] || 5);
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const eligible = items.reduce((sum, item) => {
    const title = String(item?.title || item?.name || '').toLowerCase();
    if (/gift.?wrap|delivery|shipping|tax/.test(title)) return sum;
    const line = item?.line_total_after_discount_paise != null
      ? Math.round(Number(item.line_total_after_discount_paise) || 0)
      : Math.round((Number(item?.price) || 0) * (Number(item?.qty) || 1) * 100);
    return sum + Math.max(0, line);
  }, 0);
  const suggested = Math.min(settled, Math.floor(eligible * maxRedeemPct / 100));

  return {
    enabled: String(map['bonus.enabled'] || 'true').toLowerCase() !== 'false',
    customer_id: customer?.id || null,
    customer,
    settled_balance_paise: settled,
    eligible_bill_paise: eligible,
    max_redeem_percent: maxRedeemPct,
    suggested_redeem_paise: suggested,
    bonus_expires_at: customer?.bonus_expires_at || null,
  };
}

async function listCustomerBonusLedger(payload, env, request) {
  await requireStaffUser(request, env);
  const customerId = payload?.customer_id || payload?.customerId || payload?.id;
  if (!customerId) throw new Error('customer_id required');
  const limit = Math.min(200, Math.max(1, Number(payload?.limit) || 50));
  const rows = await supabaseFetch(
    env,
    `customer_bonus_ledger?select=*&customer_id=eq.${encodeURIComponent(customerId)}&order=created_at.desc&limit=${limit}`
  );
  return { entries: rows || [] };
}

async function grantSurpriseBonus(payload, env, request) {
  const { user } = await requireStaffUser(request, env);
  const customerId = payload?.customer_id || payload?.customerId;
  const amountPaise = Math.round(Number(payload?.amount_paise ?? (Number(payload?.amount_rupees) || 0) * 100));
  const reasonCode = String(payload?.reason_code || payload?.reasonCode || 'manual').trim();
  if (!customerId) throw new Error('customer_id required');
  if (amountPaise <= 0) throw new Error('amount must be positive');
  const res = await callBonusRpc(env, 'grant_surprise_bonus', {
    p_customer_id: customerId,
    p_amount_paise: amountPaise,
    p_reason_code: reasonCode,
    p_reason: payload?.reason || null,
    p_actor: user?.id || null,
    p_idempotency_key: payload?.idempotency_key || null,
  });
  if (!res.ok) throw new Error(res.error || 'grant_surprise_bonus failed');
  return res.data;
}

async function getBonusDashboard(_payload, env, request) {
  await requireStaffUser(request, env);
  const settings = await supabaseFetch(
    env,
    'app_settings?select=setting_key,setting_value&setting_key=eq.bonus.reminder_days_before'
  );
  const reminderDays = Number(settings?.[0]?.setting_value || 30);
  const customers = await supabaseFetch(
    env,
    'customers?select=id,bonus_balance_paise,bonus_earned_paise,bonus_redeemed_paise,bonus_expires_at,order_count'
  ) || [];
  const issued = customers.reduce((s, c) => s + Number(c.bonus_earned_paise || 0), 0);
  const redeemed = customers.reduce((s, c) => s + Number(c.bonus_redeemed_paise || 0), 0);
  const outstanding = customers.reduce((s, c) => s + Number(c.bonus_balance_paise || 0), 0);
  const withBonus = customers.filter((c) => Number(c.bonus_balance_paise || 0) > 0).length;
  const historicalRate = issued > 0 ? redeemed / issued : 0;
  const now = Date.now();
  const soonMs = reminderDays * 86400000;
  const expiringSoon = customers
    .filter((c) => c.bonus_expires_at && Number(c.bonus_balance_paise || 0) > 0)
    .filter((c) => {
      const t = new Date(c.bonus_expires_at).getTime();
      return t >= now && t <= now + soonMs;
    })
    .reduce((s, c) => s + Number(c.bonus_balance_paise || 0), 0);
  const avgRedemption = withBonus
    ? Math.round(redeemed / Math.max(1, customers.filter((c) => Number(c.bonus_redeemed_paise || 0) > 0).length))
    : 0;
  const repeat = customers.filter((c) => Number(c.order_count) >= 2).length;
  const repeatRate = customers.length ? repeat / customers.length : 0;

  return {
    bonus_issued_paise: issued,
    bonus_redeemed_paise: redeemed,
    outstanding_bonus_balance_paise: outstanding,
    expiring_soon_paise: expiringSoon,
    historical_redemption_rate: Math.round(historicalRate * 1000) / 1000,
    estimated_redemption_exposure_paise: Math.round(outstanding * historicalRate),
    customers_with_bonus: withBonus,
    average_redemption_paise: avgRedemption,
    repeat_purchase_rate: Math.round(repeatRate * 1000) / 1000,
    reminder_days_before: reminderDays,
  };
}

/** Daily: expire stale bonus entries + WhatsApp reminders before expiry. */
async function runBonusMaintenance(env) {
  const expired = await callBonusRpc(env, 'expire_bonus_entries', { p_as_of: new Date().toISOString() });
  console.log('[bonus:expire]', expired.ok ? expired.data : expired.error);

  const popular = await callBonusRpc(env, 'refresh_popular_product_sales_cache', {
    days_back: 90,
    max_products: 100,
  });
  console.log('[popular:refresh]', popular.ok ? popular.data : popular.error);

  const settings = await supabaseFetch(
    env,
    'app_settings?select=setting_key,setting_value&setting_key=in.(bonus.reminder_days_before,bonus.next_order_message)'
  );
  const map = Object.fromEntries((settings || []).map((s) => [s.setting_key, s.setting_value]));
  const reminderDays = Number(map['bonus.reminder_days_before'] || 30);
  const nextOrderLine = String(map['bonus.next_order_message'] || 'Share your number next time to use your Yasvik Bonus.');

  const customers = await supabaseFetch(
    env,
    'customers?select=id,phone_digits,name,bonus_balance_paise,bonus_expires_at,marketing_consent,bonus_reminder_sent_at&bonus_balance_paise=gt.0&bonus_expires_at=not.is.null&marketing_consent=eq.true'
  ) || [];

  const now = Date.now();
  const horizon = now + reminderDays * 86400000;
  let remindersSent = 0;

  for (const c of customers) {
    const exp = new Date(c.bonus_expires_at).getTime();
    if (!Number.isFinite(exp) || exp < now || exp > horizon) continue;
    if (c.bonus_reminder_sent_at) {
      const sentAt = new Date(c.bonus_reminder_sent_at).getTime();
      if (Number.isFinite(sentAt) && now - sentAt < reminderDays * 86400000) continue;
    }
    const digits = normalizePhoneDigits(c.phone_digits);
    if (digits.length !== 10) continue;

    const balanceRs = Math.round(Number(c.bonus_balance_paise || 0) / 100);
    const expiryLabel = new Date(c.bonus_expires_at).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const body = [
      `Hi ${c.name || 'there'},`,
      '',
      `Your Yasvik Bonus balance is *₹${balanceRs}*.`,
      `It expires on *${expiryLabel}*.`,
      nextOrderLine,
      '',
      '— Yasvik',
    ].join('\n');

    const apiResult = await sendWhatsAppApiMessage({ to: digits, body }, env);
    if (apiResult.sent) {
      remindersSent += 1;
      await supabaseFetch(env, `customers?id=eq.${encodeURIComponent(c.id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ bonus_reminder_sent_at: new Date().toISOString() }),
      });
    }
  }

  console.log('[bonus:reminders]', { remindersSent, eligible: customers.length });
  return { expired: expired.data || null, remindersSent };
}

/** After successful order — never throws (billing-safe). */
async function linkCustomerAfterOrder(env, orderLike = {}) {
  try {
    const phone = normalizePhoneDigits(orderLike.customer_phone || orderLike.guest_phone);
    if (phone.length !== 10) return null;

    const existing = await supabaseFetch(
      env,
      `customers?select=id,name,email,address_snapshot,user_id&phone_digits=eq.${encodeURIComponent(phone)}&limit=1`
    );
    const patch = {};
    const name = String(orderLike.customer_name || '').trim();
    const email = String(orderLike.customer_email || orderLike.guest_email || '').trim();
    if (name && name.toLowerCase() !== 'walk-in customer') patch.name = name;
    if (email) patch.email = email;
    if (orderLike.address_snapshot && typeof orderLike.address_snapshot === 'object') {
      patch.address_snapshot = orderLike.address_snapshot;
    }
    if (orderLike.user_id && orderLike.order_channel === 'web') {
      patch.user_id = orderLike.user_id;
    }

    if (!existing?.[0]?.id) {
      await supabaseFetch(env, 'customers', {
        method: 'POST',
        headers: { Prefer: 'return=minimal,resolution=merge-duplicates' },
        body: JSON.stringify({ phone_digits: phone, ...patch }),
      });
    } else if (Object.keys(patch).length) {
      const safe = { ...patch };
      if (!safe.name && existing[0].name) delete safe.name;
      if (!safe.email && existing[0].email) delete safe.email;
      if (!safe.user_id && existing[0].user_id) delete safe.user_id;
      if (Object.keys(safe).length) {
        await supabaseFetch(env, `customers?id=eq.${encodeURIComponent(existing[0].id)}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify(safe),
        });
      }
    }

    const customerId = await supabaseFetch(env, 'rpc/refresh_customer_crm', {
      method: 'POST',
      body: JSON.stringify({ p_phone: phone }),
    });
    if (orderLike.id && customerId) {
      await supabaseFetch(env, `orders?id=eq.${encodeURIComponent(orderLike.id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ customer_id: customerId }),
      });
    }
    return customerId;
  } catch (err) {
    console.error('[linkCustomerAfterOrder]', err?.message || err);
    return null;
  }
}

function customerListFilterQuery(filter = '') {
  const now = new Date();
  const daysAgo = (n) => new Date(now.getTime() - n * 86400000).toISOString();
  switch (filter) {
    case 'new': return `&first_order_at=gte.${encodeURIComponent(daysAgo(30))}`;
    case 'repeat': return '&order_count=gte.2';
    case 'one_time': return '&order_count=eq.1';
    case 'high_value': return '&auto_tags=cs.{high_value}';
    case 'inactive_30': return `&last_order_at=lt.${encodeURIComponent(daysAgo(30))}`;
    case 'inactive_60': return `&last_order_at=lt.${encodeURIComponent(daysAgo(60))}`;
    case 'inactive_90': return `&last_order_at=lt.${encodeURIComponent(daysAgo(90))}`;
    case 'channel_web': return '&preferred_channel=eq.web';
    case 'channel_pos': return '&preferred_channel=eq.pos';
    case 'channel_whatsapp': return '&preferred_channel=eq.whatsapp';
    case 'tag_rice_buyer': return '&auto_tags=cs.{rice_buyer}';
    case 'tag_honey_buyer': return '&auto_tags=cs.{honey_buyer}';
    case 'tag_pickle_buyer': return '&auto_tags=cs.{pickle_buyer}';
    case 'tag_dry_fruit_buyer': return '&auto_tags=cs.{dry_fruit_buyer}';
    case 'tag_organic_buyer': return '&auto_tags=cs.{organic_buyer}';
    case 'tag_millet_buyer': return '&auto_tags=cs.{millet_buyer}';
    case 'marketing_consent': return '&marketing_consent=eq.true';
    default: return '';
  }
}

async function listCustomers(payload, env, request) {
  await requireStaffUser(request, env);
  const q = String(payload?.q || '').trim();
  const filter = String(payload?.filter || '');
  const limit = Math.min(200, Math.max(1, Number(payload?.limit) || 50));

  if (q && (q.toUpperCase().startsWith('YAS') || q.startsWith('pos_') || q.includes('-'))) {
    const orders = await supabaseFetch(
      env,
      `orders?select=customer_id,order_number,receipt_id&or=(order_number.ilike.*${encodeURIComponent(q)}*,receipt_id.ilike.*${encodeURIComponent(q)}*)&limit=20`
    );
    const ids = [...new Set((orders || []).map((o) => o.customer_id).filter(Boolean))];
    if (ids.length) {
      const rows = await supabaseFetch(
        env,
        `customers?select=*&id=in.(${ids.map((id) => encodeURIComponent(id)).join(',')})`
      );
      return { customers: rows || [] };
    }
  }

  const digits = normalizePhoneDigits(q);
  let path = `customers?select=*&order=last_order_at.desc.nullslast&limit=${limit}${customerListFilterQuery(filter)}`;
  if (digits.length === 10 && q.replace(/\D/g, '').length >= 10) {
    path += `&phone_digits=eq.${encodeURIComponent(digits)}`;
  }

  const rows = await supabaseFetch(env, path);
  let customers = rows || [];
  if (q && digits.length !== 10) {
    const needle = q.toLowerCase();
    customers = customers.filter((c) =>
      [c.name, c.email, c.phone_digits].some((v) => String(v || '').toLowerCase().includes(needle)));
  }
  return { customers };
}

async function getCustomer(payload, env, request) {
  await requireStaffUser(request, env);
  const id = payload?.id || payload?.customerId;
  if (!id) throw new Error('Customer id required');
  const rows = await supabaseFetch(env, `customers?select=*&id=eq.${encodeURIComponent(id)}&limit=1`);
  const customer = rows?.[0];
  if (!customer) throw new Error('Customer not found');
  const orders = await supabaseFetch(
    env,
    `orders?select=id,order_number,receipt_id,status,payment_status,payment_method,order_channel,amount_paise,subtotal_paise,discount_paise,discount_label,bonus_earned_paise,bonus_redeemed_paise,bonus_balance_after_paise,items_snapshot,customer_name,customer_phone,created_at,completed_at&customer_id=eq.${encodeURIComponent(id)}&order=created_at.desc&limit=50`
  );
  const ledger = await supabaseFetch(
    env,
    `customer_bonus_ledger?select=id,entry_type,amount_paise,balance_after_paise,expires_at,reason,reason_code,order_id,created_at,rule_snapshot&customer_id=eq.${encodeURIComponent(id)}&order=created_at.desc&limit=40`
  );
  return { customer, orders: orders || [], bonus_ledger: ledger || [] };
}

async function updateCustomer(payload, env, request) {
  await requireStaffUser(request, env);
  const id = payload?.id;
  if (!id) throw new Error('Customer id required');
  const patch = {};
  if (payload.notes !== undefined) patch.notes = payload.notes;
  if (payload.manual_tags !== undefined) patch.manual_tags = payload.manual_tags;
  if (payload.marketing_consent !== undefined) {
    patch.marketing_consent = !!payload.marketing_consent;
    patch.marketing_consent_at = payload.marketing_consent ? new Date().toISOString() : null;
  }
  if (payload.name !== undefined) patch.name = payload.name;
  if (payload.email !== undefined) patch.email = payload.email;
  if (!Object.keys(patch).length) throw new Error('Nothing to update');
  patch.updated_at = new Date().toISOString();
  const updated = await supabaseFetch(env, `customers?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(patch),
  });
  return { customer: updated?.[0] };
}

async function mergeCustomers(payload, env, request) {
  await requireStaffUser(request, env);
  const primaryId = payload?.primaryId;
  const secondaryId = payload?.secondaryId;
  if (!primaryId || !secondaryId || primaryId === secondaryId) {
    throw new Error('primaryId and secondaryId required');
  }
  const rows = await supabaseFetch(
    env,
    `customers?select=*&id=in.(${encodeURIComponent(primaryId)},${encodeURIComponent(secondaryId)})`
  );
  const primary = (rows || []).find((c) => c.id === primaryId);
  const secondary = (rows || []).find((c) => c.id === secondaryId);
  if (!primary || !secondary) throw new Error('Customer not found');

  await supabaseFetch(env, `orders?customer_id=eq.${encodeURIComponent(secondaryId)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ customer_id: primaryId }),
  });

  const mergedTags = [...new Set([...(primary.manual_tags || []), ...(secondary.manual_tags || [])])];
  const notes = [primary.notes, secondary.notes].filter(Boolean).join('\n---\n') || null;
  await supabaseFetch(env, `customers?id=eq.${encodeURIComponent(primaryId)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      name: primary.name || secondary.name,
      email: primary.email || secondary.email,
      notes,
      manual_tags: mergedTags,
      marketing_consent: primary.marketing_consent || secondary.marketing_consent,
      user_id: primary.user_id || secondary.user_id,
      updated_at: new Date().toISOString(),
    }),
  });

  await supabaseFetch(env, `customers?id=eq.${encodeURIComponent(secondaryId)}`, {
    method: 'DELETE',
    headers: { Prefer: 'return=minimal' },
  });

  await linkCustomerAfterOrder(env, { customer_phone: primary.phone_digits });
  return getCustomer({ id: primaryId }, env, request);
}

async function lookupCustomerByPhone(payload, env, request) {
  await requireStaffUser(request, env);
  const phone = normalizePhoneDigits(payload?.phone);
  if (phone.length !== 10) return { customer: null };
  const rows = await supabaseFetch(
    env,
    `customers?select=id,phone_digits,name,email,address_snapshot,order_count,lifetime_spend_paise,avg_order_value_paise,last_order_at,notes,auto_tags,manual_tags,bonus_balance_paise,bonus_earned_paise,bonus_redeemed_paise,bonus_expires_at,insights&phone_digits=eq.${encodeURIComponent(phone)}&limit=1`
  );
  return { customer: rows?.[0] || null };
}

async function getRetentionStats(_payload, env, request) {
  await requireStaffUser(request, env);
  const all = await supabaseFetch(env, 'customers?select=id,order_count,lifetime_spend_paise,first_order_at,last_order_at,auto_tags,insights,preferred_channel,name,phone_digits');
  const customers = all || [];
  const now = Date.now();
  const day = 86400000;
  const daysSince = (iso) => (iso ? (now - new Date(iso).getTime()) / day : null);

  const newCustomers = customers.filter((c) => daysSince(c.first_order_at) != null && daysSince(c.first_order_at) <= 30);
  const repeat = customers.filter((c) => Number(c.order_count) >= 2);
  const inactive30 = customers.filter((c) => daysSince(c.last_order_at) >= 30);
  const inactive60 = customers.filter((c) => daysSince(c.last_order_at) >= 60);
  const inactive90 = customers.filter((c) => daysSince(c.last_order_at) >= 90);
  const needsReorder = customers.filter((c) => {
    const at = c.insights?.likely_reorder_at;
    if (!at) return false;
    return new Date(at).getTime() <= now + 7 * day;
  });
  const topValue = [...customers]
    .sort((a, b) => Number(b.lifetime_spend_paise) - Number(a.lifetime_spend_paise))
    .slice(0, 10);

  const returningRevenuePaise = repeat.reduce((s, c) => {
    const aov = Number(c.lifetime_spend_paise) / Math.max(1, Number(c.order_count));
    return s + Math.max(0, Number(c.lifetime_spend_paise) - aov);
  }, 0);

  const productMap = new Map();
  for (const c of customers) {
    for (const p of c.insights?.frequently_purchased || []) {
      const key = p.key || p.title;
      if (!key) continue;
      const prev = productMap.get(key) || { title: p.title, count: 0, qty: 0 };
      prev.count += Number(p.order_count) || 1;
      prev.qty += Number(p.total_qty) || 0;
      productMap.set(key, prev);
    }
  }
  const topReordered = [...productMap.values()].sort((a, b) => b.count - a.count).slice(0, 10);

  return {
    totals: {
      customers: customers.length,
      new_30d: newCustomers.length,
      repeat: repeat.length,
      inactive_30: inactive30.length,
      inactive_60: inactive60.length,
      inactive_90: inactive90.length,
      needs_reorder: needsReorder.length,
      returning_revenue_paise: Math.round(returningRevenuePaise),
    },
    top_value: topValue,
    needs_reorder: needsReorder.slice(0, 20),
    top_reordered_products: topReordered,
  };
}

async function exportConsentAudience(payload, env, request) {
  await requireStaffUser(request, env);
  const filter = String(payload?.filter || 'marketing_consent');
  const { customers } = await listCustomers({ filter, limit: 500, q: '' }, env, request);
  const consented = (customers || []).filter((c) => c.marketing_consent);
  return {
    count: consented.length,
    phones: consented.map((c) => ({
      phone: c.phone_digits,
      name: c.name,
      tags: [...(c.auto_tags || []), ...(c.manual_tags || [])],
    })),
    note: 'Export only — no WhatsApp messages were sent.',
  };
}

async function linkCustomerToUser(payload, env, request) {
  const user = await getAuthUser(request, env);
  if (!user?.id) throw new Error('Authentication required');
  const phone = normalizePhoneDigits(payload?.phone);
  if (phone.length !== 10) return { linked: false };
  const rows = await supabaseFetch(
    env,
    `customers?select=id,user_id&phone_digits=eq.${encodeURIComponent(phone)}&limit=1`
  );
  const cust = rows?.[0];
  if (!cust) return { linked: false };
  if (cust.user_id && cust.user_id !== user.id) return { linked: false, reason: 'phone_owned' };
  await supabaseFetch(env, `customers?id=eq.${encodeURIComponent(cust.id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ user_id: user.id, updated_at: new Date().toISOString() }),
  });
  return { linked: true, customer_id: cust.id };
}

async function listCustomerSegments(_payload, env, request) {
  await requireStaffUser(request, env);
  const rows = await supabaseFetch(env, 'customer_segments?select=*&order=created_at.desc');
  return { segments: rows || [] };
}

async function upsertCustomerSegment(payload, env, request) {
  const { user } = await requireStaffUser(request, env);
  const name = String(payload?.name || '').trim();
  if (!name) throw new Error('Segment name required');
  const row = {
    name,
    description: payload?.description || null,
    filter: payload?.filter || {},
    updated_at: new Date().toISOString(),
  };
  if (payload?.id) {
    const updated = await supabaseFetch(env, `customer_segments?id=eq.${encodeURIComponent(payload.id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(row),
    });
    return { segment: updated?.[0] };
  }
  const inserted = await supabaseFetch(env, 'customer_segments', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ ...row, created_by: user.id }),
  });
  return { segment: inserted?.[0] };
}

function computeCouponDiscountPaise(subtotalPaise, coupon) {
  const sub = Math.max(0, Math.round(Number(subtotalPaise) || 0));
  if (!sub || !coupon) return 0;
  let discount = 0;
  if (coupon.discount_type === 'percent') {
    discount = Math.round(sub * (Number(coupon.discount_value) / 100));
    if (coupon.max_discount_paise != null && Number(coupon.max_discount_paise) > 0) {
      discount = Math.min(discount, Math.round(Number(coupon.max_discount_paise)));
    }
  } else if (coupon.discount_type === 'fixed') {
    discount = Math.round(Number(coupon.discount_value) * 100);
  }
  return Math.max(0, Math.min(discount, sub));
}

async function fetchCouponByCode(env, code) {
  const normalized = normalizeCouponCode(code);
  if (!normalized) return null;
  const rows = await supabaseFetch(
    env,
    `coupons?select=*&code=eq.${encodeURIComponent(normalized)}&limit=1`
  );
  return rows?.[0] || null;
}

async function countCustomerCouponRedemptions(env, couponId, { customerPhone, customerEmail } = {}) {
  const phone = normalizePhoneDigits(customerPhone);
  const email = String(customerEmail || '').trim().toLowerCase();
  let count = 0;
  if (phone.length === 10) {
    const rows = await supabaseFetch(
      env,
      `coupon_redemptions?select=id&coupon_id=eq.${encodeURIComponent(couponId)}&customer_phone=eq.${encodeURIComponent(phone)}`
    );
    count = Math.max(count, Array.isArray(rows) ? rows.length : 0);
  }
  if (email) {
    const rows = await supabaseFetch(
      env,
      `coupon_redemptions?select=id&coupon_id=eq.${encodeURIComponent(couponId)}&customer_email=eq.${encodeURIComponent(email)}`
    );
    count = Math.max(count, Array.isArray(rows) ? rows.length : 0);
  }
  return count;
}

async function assertCouponUsable(env, coupon, { channel, subtotalPaise, customerPhone, customerEmail } = {}) {
  if (!coupon || coupon.is_active === false) {
    throw new Error('This coupon is not active');
  }
  const now = Date.now();
  if (coupon.starts_at && new Date(coupon.starts_at).getTime() > now) {
    throw new Error('This coupon is not active yet');
  }
  if (coupon.ends_at && new Date(coupon.ends_at).getTime() < now) {
    throw new Error('This coupon has expired');
  }
  const channels = coupon.channels || 'both';
  if (channels !== 'both' && channels !== channel) {
    throw new Error(channel === 'pos' ? 'This coupon is for online orders only' : 'This coupon is for in-store only');
  }
  if (coupon.usage_limit != null && Number(coupon.used_count || 0) >= Number(coupon.usage_limit)) {
    throw new Error('This coupon has reached its usage limit');
  }
  const minOrder = Number(coupon.min_order_paise) || 0;
  if (Number(subtotalPaise) < minOrder) {
    throw new Error(`Minimum order ₹${Math.ceil(minOrder / 100)} required for this coupon`);
  }
  if (coupon.per_customer_limit != null) {
    const prior = await countCustomerCouponRedemptions(env, coupon.id, { customerPhone, customerEmail });
    if (prior >= Number(coupon.per_customer_limit)) {
      throw new Error('You have already used this coupon');
    }
  }
  return true;
}

/**
 * Resolve one discount source: coupon XOR manual percent XOR manual fixed.
 */
async function resolveDiscount(env, {
  subtotalPaise,
  couponCode,
  manualPercent,
  manualFixedPaise,
  channel,
  customerPhone,
  customerEmail,
  allowManual = false,
} = {}) {
  const sub = Math.max(0, Math.round(Number(subtotalPaise) || 0));
  const code = normalizeCouponCode(couponCode);
  const pct = Number(manualPercent);
  const fixed = Math.round(Number(manualFixedPaise) || 0);

  const hasCoupon = Boolean(code);
  const hasPct = allowManual && Number.isFinite(pct) && pct > 0;
  const hasFixed = allowManual && fixed > 0;
  const sources = [hasCoupon, hasPct, hasFixed].filter(Boolean).length;
  if (sources > 1) {
    throw new Error('Apply either a coupon or a manual discount, not both');
  }
  if (!sources) {
    return {
      discountPaise: 0,
      discountType: null,
      discountLabel: null,
      couponCode: null,
      couponId: null,
    };
  }

  if (hasCoupon) {
    const coupon = await fetchCouponByCode(env, code);
    if (!coupon) throw new Error('Invalid coupon code');
    await assertCouponUsable(env, coupon, { channel, subtotalPaise: sub, customerPhone, customerEmail });
    const discountPaise = computeCouponDiscountPaise(sub, coupon);
    if (discountPaise <= 0) throw new Error('Coupon does not apply to this order');
    return {
      discountPaise,
      discountType: 'coupon',
      discountLabel: coupon.code,
      couponCode: coupon.code,
      couponId: coupon.id,
      coupon,
    };
  }

  if (hasPct) {
    if (pct > 100) throw new Error('Discount cannot exceed 100%');
    const discountPaise = Math.max(0, Math.min(sub, Math.round(sub * (pct / 100))));
    return {
      discountPaise,
      discountType: 'manual_percent',
      discountLabel: `${pct}%`,
      couponCode: null,
      couponId: null,
    };
  }

  const discountPaise = Math.max(0, Math.min(sub, fixed));
  return {
    discountPaise,
    discountType: 'manual_fixed',
    discountLabel: `₹${Math.round(discountPaise / 100)} off`,
    couponCode: null,
    couponId: null,
  };
}

async function recordCouponRedemption(env, {
  couponId,
  orderId,
  code,
  discountPaise,
  channel,
  customerPhone,
  customerEmail,
} = {}) {
  if (!couponId || !orderId) return;
  await supabaseFetch(env, 'coupon_redemptions', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      coupon_id: couponId,
      order_id: orderId,
      code: normalizeCouponCode(code),
      discount_paise: Math.round(Number(discountPaise) || 0),
      channel,
      customer_phone: normalizePhoneDigits(customerPhone) || null,
      customer_email: String(customerEmail || '').trim().toLowerCase() || null,
    }),
  });
  const coupons = await supabaseFetch(
    env,
    `coupons?select=used_count&id=eq.${encodeURIComponent(couponId)}&limit=1`
  );
  const used = Number(coupons?.[0]?.used_count || 0) + 1;
  await supabaseFetch(env, `coupons?id=eq.${encodeURIComponent(couponId)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ used_count: used, updated_at: new Date().toISOString() }),
  });
}

async function listCoupons(_payload, env, request) {
  await requireStaffUser(request, env);
  const rows = await supabaseFetch(
    env,
    'coupons?select=*&order=created_at.desc&limit=200'
  );
  return { success: true, coupons: Array.isArray(rows) ? rows : [] };
}

async function upsertCoupon(payload, env, request) {
  const { user } = await requireStaffUser(request, env);
  const code = normalizeCouponCode(payload?.code);
  if (!code || code.length < 3) throw new Error('Coupon code must be at least 3 characters');
  const discountType = payload?.discount_type === 'fixed' ? 'fixed' : 'percent';
  const discountValue = Number(payload?.discount_value);
  if (!(discountValue > 0)) throw new Error('Discount value must be greater than 0');
  if (discountType === 'percent' && discountValue > 100) throw new Error('Percent cannot exceed 100');

  const channels = ['both', 'pos', 'web'].includes(payload?.channels) ? payload.channels : 'both';
  const row = {
    code,
    name: String(payload?.name || code).trim().slice(0, 120) || code,
    description: payload?.description ? String(payload.description).slice(0, 500) : null,
    discount_type: discountType,
    discount_value: discountValue,
    min_order_paise: Math.max(0, Math.round(Number(payload?.min_order_paise) || 0)),
    max_discount_paise: payload?.max_discount_paise != null && payload.max_discount_paise !== ''
      ? Math.round(Number(payload.max_discount_paise))
      : null,
    starts_at: payload?.starts_at || null,
    ends_at: payload?.ends_at || null,
    is_active: payload?.is_active !== false,
    usage_limit: payload?.usage_limit != null && payload.usage_limit !== ''
      ? Math.round(Number(payload.usage_limit))
      : null,
    per_customer_limit: payload?.per_customer_limit === null || payload?.per_customer_limit === ''
      ? null
      : Math.max(1, Math.round(Number(payload?.per_customer_limit ?? 1))),
    channels,
    updated_at: new Date().toISOString(),
  };

  if (payload?.id) {
    await supabaseFetch(env, `coupons?id=eq.${encodeURIComponent(payload.id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(row),
    });
    const updated = await supabaseFetch(
      env,
      `coupons?select=*&id=eq.${encodeURIComponent(payload.id)}&limit=1`
    );
    return { success: true, coupon: updated?.[0] || null };
  }

  row.created_by = user.id;
  row.used_count = 0;
  const inserted = await supabaseFetch(env, 'coupons', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(row),
  });
  return { success: true, coupon: inserted?.[0] || null };
}

async function deactivateCoupon(payload, env, request) {
  await requireStaffUser(request, env);
  const id = payload?.id || payload?.coupon_id;
  if (!id) throw new Error('Coupon id required');
  const isActive = payload?.is_active === true;
  await supabaseFetch(env, `coupons?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ is_active: isActive, updated_at: new Date().toISOString() }),
  });
  return { success: true, id, is_active: isActive };
}

async function validateCouponPreview(payload, env, request) {
  const channel = payload?.channel === 'pos' ? 'pos' : 'web';
  if (channel === 'pos') {
    await requireStaffUser(request, env);
  }
  const subtotalPaise = Math.round(Number(payload?.subtotal_paise) || 0);
  const discount = await resolveDiscount(env, {
    subtotalPaise,
    couponCode: payload?.coupon_code || payload?.code,
    channel,
    customerPhone: payload?.customer_phone,
    customerEmail: payload?.customer_email,
    allowManual: false,
  });
  return {
    success: true,
    valid: discount.discountPaise > 0,
    discount_paise: discount.discountPaise,
    discount_label: discount.discountLabel,
    coupon_code: discount.couponCode,
    payable_paise: Math.max(0, subtotalPaise - discount.discountPaise),
  };
}

// ─── Packaging cost management ───────────────────────────────────────────────

const PACKAGING_MATERIAL_TYPES = new Set([
  'pp_cover', 'kraft_pouch', 'plastic_container', 'oil_bottle',
  'lid', 'cap', 'seal', 'sticker', 'label', 'tape', 'carton', 'other',
]);
const PACKAGING_PROFILE_FAMILIES = new Set([
  'pp_cover', 'kraft_pouch', 'plastic_container', 'oil_bottle', 'multicomponent', 'other',
]);
const PACKAGING_COMPONENT_ROLES = new Set([
  'container', 'lid', 'cap', 'seal', 'logo_sticker', 'price_label', 'pouch', 'cover', 'other',
]);

function calcMaterialCostPerPiecePaise(row = {}) {
  const qty = Number(row.purchase_quantity);
  const total = Math.max(0, Math.round(Number(row.total_purchase_cost_paise) || 0));
  const wastage = Math.max(0, Number(row.wastage_pct) || 0);
  if (!(qty > 0)) return 0;
  return Math.round((total / qty) * (1 + wastage / 100));
}

function materialUnitCostPaise(material = {}) {
  if (material.total_purchase_cost_paise != null && material.purchase_quantity != null) {
    return calcMaterialCostPerPiecePaise(material);
  }
  return Math.max(0, Math.round(Number(material.cost_per_piece_paise) || 0));
}

function resolvePackagingBom(components = [], overrides = []) {
  const base = (Array.isArray(components) ? components : []).map((c) => ({
    material_id: c.material_id,
    quantity: Number(c.quantity) || 1,
    component_role: c.component_role || 'other',
    sort_order: Number(c.sort_order) || 0,
    material: c.packaging_materials || null,
  }));
  const overrideList = Array.isArray(overrides) ? overrides : [];
  if (!overrideList.length) return base;
  const map = new Map(base.map((c) => [`${c.material_id}:${c.component_role}`, { ...c }]));
  for (const o of overrideList) {
    if (!o?.material_id) continue;
    const key = `${o.material_id}:${o.component_role || 'other'}`;
    const existing = map.get(key);
    if (existing) {
      map.set(key, {
        ...existing,
        quantity: Number(o.quantity) > 0 ? Number(o.quantity) : existing.quantity,
      });
    } else {
      map.set(key, {
        material_id: o.material_id,
        quantity: Number(o.quantity) || 1,
        component_role: o.component_role || 'other',
        sort_order: 999,
        material: null,
      });
    }
  }
  return [...map.values()];
}

function sumPackagingBomPaise(bomLines = [], materialsById = {}) {
  let sum = 0;
  const lines = [];
  for (const line of bomLines) {
    const material = line.material || materialsById[line.material_id];
    if (!material) continue;
    const unit = materialUnitCostPaise(material);
    const qty = Number(line.quantity) || 0;
    const lineCost = Math.round(unit * qty);
    sum += lineCost;
    lines.push({
      material_id: line.material_id,
      name: material.name,
      component_role: line.component_role,
      quantity: qty,
      unit_cost_paise: unit,
      line_cost_paise: lineCost,
    });
  }
  return { packaging_cost_paise: sum, lines };
}

function calculateLandedVariantCostWorker({
  purchaseRatePerKg = null,
  packKg = null,
  packagingCostPaise = 0,
  packingLabourPaise = 0,
  inwardTransportPaise = 0,
  wastagePct = 0,
  sellPriceRs = null,
  measureType = 'kg',
} = {}) {
  let pack = Number(packKg);
  const purchase = Number(purchaseRatePerKg);
  if (measureType === 'units' && !(Number.isFinite(pack) && pack > 0)) {
    pack = 1;
  }
  const contentPaise = (Number.isFinite(purchase) && purchase > 0 && Number.isFinite(pack) && pack > 0)
    ? Math.round(purchase * pack * 100)
    : 0;
  const packagingPaise = Math.max(0, Math.round(Number(packagingCostPaise) || 0));
  const labourPaise = Math.max(0, Math.round(Number(packingLabourPaise) || 0));
  const transportPaise = Math.max(0, Math.round(Number(inwardTransportPaise) || 0));
  const wastage = Math.max(0, Number(wastagePct) || 0);
  const wastagePaise = Math.round(packagingPaise * (wastage / 100));
  const landedPaise = contentPaise + packagingPaise + labourPaise + wastagePaise + transportPaise;
  const sellPaise = sellPriceRs != null && Number.isFinite(Number(sellPriceRs))
    ? Math.round(Number(sellPriceRs) * 100)
    : null;
  return {
    content_cost_paise: contentPaise,
    packaging_cost_paise: packagingPaise,
    packing_labour_paise: labourPaise,
    wastage_paise: wastagePaise,
    inward_transport_paise: transportPaise,
    landed_cost_paise: landedPaise,
    suggested_price_paise: sellPaise,
    gross_contribution_paise: sellPaise != null ? sellPaise - landedPaise : null,
    gross_margin_pct: sellPaise != null && sellPaise > 0
      ? Math.round(((sellPaise - landedPaise) / sellPaise) * 100)
      : null,
  };
}

async function getPackagingCostDefaults(env) {
  try {
    const rows = await supabaseFetch(
      env,
      `app_settings?select=setting_key,setting_value,key,value&setting_key=eq.${encodeURIComponent('packaging_cost_defaults')}&limit=1`
    );
    const row = rows?.[0];
    const value = row?.setting_value ?? row?.value;
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return {
      default_packing_labour_paise: Math.max(0, Math.round(Number(parsed?.default_packing_labour_paise) || 100)),
      default_inward_transport_paise: Math.max(0, Math.round(Number(parsed?.default_inward_transport_paise) || 0)),
      default_wastage_pct: Math.max(0, Number(parsed?.default_wastage_pct) || 2),
    };
  } catch {
    return {
      default_packing_labour_paise: 100,
      default_inward_transport_paise: 0,
      default_wastage_pct: 2,
    };
  }
}

async function listPackagingMaterials(_payload, env, request) {
  await requireStaffUser(request, env);
  const rows = await supabaseFetch(
    env,
    'packaging_materials?select=*&order=name.asc&limit=500'
  );
  return { success: true, materials: Array.isArray(rows) ? rows : [] };
}

async function upsertPackagingMaterial(payload, env, request) {
  await requireStaffUser(request, env);
  const name = String(payload?.name || '').trim();
  if (!name) throw new Error('Material name required');
  const materialType = PACKAGING_MATERIAL_TYPES.has(payload?.material_type)
    ? payload.material_type
    : 'other';
  const purchaseQty = Number(payload?.purchase_quantity);
  if (!(purchaseQty > 0)) throw new Error('Purchase quantity must be greater than 0');
  const totalCost = Math.max(0, Math.round(Number(payload?.total_purchase_cost_paise) || 0));
  const wastagePct = Math.min(100, Math.max(0, Number(payload?.wastage_pct) || 0));
  const costPerPiece = calcMaterialCostPerPiecePaise({
    purchase_quantity: purchaseQty,
    total_purchase_cost_paise: totalCost,
    wastage_pct: wastagePct,
  });

  const row = {
    name: name.slice(0, 160),
    material_type: materialType,
    size_label: payload?.size_label ? String(payload.size_label).slice(0, 80) : null,
    capacity_ml: payload?.capacity_ml != null && payload.capacity_ml !== '' ? Number(payload.capacity_ml) : null,
    capacity_g: payload?.capacity_g != null && payload.capacity_g !== '' ? Number(payload.capacity_g) : null,
    purchase_quantity: purchaseQty,
    total_purchase_cost_paise: totalCost,
    cost_per_piece_paise: costPerPiece,
    supplier_name: payload?.supplier_name ? String(payload.supplier_name).slice(0, 160) : null,
    stock_quantity: Math.max(0, Number(payload?.stock_quantity) || 0),
    wastage_pct: wastagePct,
    notes: payload?.notes ? String(payload.notes).slice(0, 1000) : null,
    is_active: payload?.is_active !== false,
    updated_at: new Date().toISOString(),
  };

  if (payload?.id) {
    await supabaseFetch(env, `packaging_materials?id=eq.${encodeURIComponent(payload.id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(row),
    });
    const updated = await supabaseFetch(
      env,
      `packaging_materials?select=*&id=eq.${encodeURIComponent(payload.id)}&limit=1`
    );
    return { success: true, material: updated?.[0] || null };
  }

  const inserted = await supabaseFetch(env, 'packaging_materials', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(row),
  });
  return { success: true, material: inserted?.[0] || null };
}

async function listPackagingProfiles(payload, env, request) {
  await requireStaffUser(request, env);
  const scope = payload?.packaging_scope;
  let path = 'packaging_profiles?select=*,packaging_profile_components(*,packaging_materials(*))&order=name.asc&limit=300';
  if (scope === 'primary' || scope === 'fulfiliment') {
    path += `&packaging_scope=eq.${encodeURIComponent(scope)}`;
  }
  const rows = await supabaseFetch(env, path);
  return { success: true, profiles: Array.isArray(rows) ? rows : [] };
}

async function upsertPackagingProfile(payload, env, request) {
  await requireStaffUser(request, env);
  const name = String(payload?.name || '').trim();
  if (!name) throw new Error('Profile name required');
  const family = PACKAGING_PROFILE_FAMILIES.has(payload?.profile_family)
    ? payload.profile_family
    : 'other';
  const scope = payload?.packaging_scope === 'fulfiliment' ? 'fulfiliment' : 'primary';

  const row = {
    name: name.slice(0, 160),
    profile_family: family,
    size_label: payload?.size_label ? String(payload.size_label).slice(0, 80) : null,
    pack_kg: payload?.pack_kg != null && payload.pack_kg !== '' ? Number(payload.pack_kg) : null,
    packing_labour_paise: Math.max(0, Math.round(Number(payload?.packing_labour_paise) || 0)),
    inward_transport_paise: Math.max(0, Math.round(Number(payload?.inward_transport_paise) || 0)),
    packaging_scope: scope,
    notes: payload?.notes ? String(payload.notes).slice(0, 1000) : null,
    is_active: payload?.is_active !== false,
    updated_at: new Date().toISOString(),
  };

  let profileId = payload?.id || null;
  if (profileId) {
    await supabaseFetch(env, `packaging_profiles?id=eq.${encodeURIComponent(profileId)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(row),
    });
  } else {
    const inserted = await supabaseFetch(env, 'packaging_profiles', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(row),
    });
    profileId = inserted?.[0]?.id;
    if (!profileId) throw new Error('Failed to create packaging profile');
  }

  if (Array.isArray(payload?.components)) {
    await supabaseFetch(
      env,
      `packaging_profile_components?profile_id=eq.${encodeURIComponent(profileId)}`,
      { method: 'DELETE', headers: { Prefer: 'return=minimal' } }
    );
    const componentRows = payload.components
      .filter((c) => c?.material_id)
      .map((c, idx) => ({
        profile_id: profileId,
        material_id: c.material_id,
        quantity: Number(c.quantity) > 0 ? Number(c.quantity) : 1,
        component_role: PACKAGING_COMPONENT_ROLES.has(c.component_role) ? c.component_role : 'other',
        sort_order: Number.isFinite(Number(c.sort_order)) ? Number(c.sort_order) : idx,
      }));
    if (componentRows.length) {
      await supabaseFetch(env, 'packaging_profile_components', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(componentRows),
      });
    }
  }

  const full = await supabaseFetch(
    env,
    `packaging_profiles?select=*,packaging_profile_components(*,packaging_materials(*))&id=eq.${encodeURIComponent(profileId)}&limit=1`
  );
  return { success: true, profile: full?.[0] || null };
}

async function listVariantPackaging(payload, env, request) {
  await requireStaffUser(request, env);
  const productId = payload?.product_id;
  let path = 'product_variant_packaging?select=*,packaging_profiles(id,name,profile_family,size_label,pack_kg,packaging_scope,packing_labour_paise,inward_transport_paise)&order=updated_at.desc&limit=2000';
  if (productId) {
    path += `&product_id=eq.${encodeURIComponent(productId)}`;
  }
  const rows = await supabaseFetch(env, path);
  return { success: true, mappings: Array.isArray(rows) ? rows : [] };
}

async function setVariantPackaging(payload, env, request) {
  await requireStaffUser(request, env);
  const productId = payload?.product_id;
  if (!productId) throw new Error('product_id required');
  if (!payload?.profile_id) throw new Error('profile_id required');

  const overrides = Array.isArray(payload?.component_overrides)
    ? payload.component_overrides
      .filter((o) => o?.material_id)
      .map((o) => ({
        material_id: o.material_id,
        quantity: Number(o.quantity) > 0 ? Number(o.quantity) : 1,
        component_role: PACKAGING_COMPONENT_ROLES.has(o.component_role) ? o.component_role : 'other',
      }))
    : [];

  const row = {
    product_id: productId,
    variant_sku: payload?.variant_sku ? String(payload.variant_sku).slice(0, 80) : null,
    variant_label: payload?.variant_label ? String(payload.variant_label).slice(0, 80) : null,
    pack_kg: payload?.pack_kg != null && payload.pack_kg !== '' ? Number(payload.pack_kg) : null,
    profile_id: payload.profile_id,
    component_overrides: overrides,
    packing_labour_override_paise: payload?.packing_labour_override_paise != null && payload.packing_labour_override_paise !== ''
      ? Math.max(0, Math.round(Number(payload.packing_labour_override_paise)))
      : null,
    inward_transport_override_paise: payload?.inward_transport_override_paise != null && payload.inward_transport_override_paise !== ''
      ? Math.max(0, Math.round(Number(payload.inward_transport_override_paise)))
      : null,
    wastage_override_pct: payload?.wastage_override_pct != null && payload.wastage_override_pct !== ''
      ? Math.min(100, Math.max(0, Number(payload.wastage_override_pct)))
      : null,
    notes: payload?.notes ? String(payload.notes).slice(0, 500) : null,
    updated_at: new Date().toISOString(),
  };

  if (payload?.id) {
    await supabaseFetch(env, `product_variant_packaging?id=eq.${encodeURIComponent(payload.id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(row),
    });
    const updated = await supabaseFetch(
      env,
      `product_variant_packaging?select=*&id=eq.${encodeURIComponent(payload.id)}&limit=1`
    );
    return { success: true, mapping: updated?.[0] || null };
  }

  // Upsert by product + sku when possible
  if (row.variant_sku) {
    const existing = await supabaseFetch(
      env,
      `product_variant_packaging?select=id&product_id=eq.${encodeURIComponent(productId)}&variant_sku=eq.${encodeURIComponent(row.variant_sku)}&limit=1`
    );
    if (existing?.[0]?.id) {
      await supabaseFetch(env, `product_variant_packaging?id=eq.${encodeURIComponent(existing[0].id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(row),
      });
      const updated = await supabaseFetch(
        env,
        `product_variant_packaging?select=*&id=eq.${encodeURIComponent(existing[0].id)}&limit=1`
      );
      return { success: true, mapping: updated?.[0] || null };
    }
  }

  const inserted = await supabaseFetch(env, 'product_variant_packaging', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(row),
  });
  return { success: true, mapping: inserted?.[0] || null };
}

async function bulkAssignPackagingProfiles(payload, env, request) {
  await requireStaffUser(request, env);
  const profileId = payload?.profile_id;
  if (!profileId) throw new Error('profile_id required');

  const categoryId = payload?.category_id || null;
  const packKg = payload?.pack_kg != null && payload.pack_kg !== '' ? Number(payload.pack_kg) : null;
  const sizeLabel = payload?.size_label ? String(payload.size_label).trim().toLowerCase() : null;
  const productIds = Array.isArray(payload?.product_ids) ? payload.product_ids.filter(Boolean) : [];

  let products = [];
  if (productIds.length) {
    const filter = `id=in.(${productIds.map((id) => encodeURIComponent(id)).join(',')})`;
    products = await supabaseFetch(env, `products?select=id,name,category_id,quick_variants&${filter}&limit=500`) || [];
  } else if (categoryId) {
    products = await supabaseFetch(
      env,
      `products?select=id,name,category_id,quick_variants&category_id=eq.${encodeURIComponent(categoryId)}&limit=500`
    ) || [];
  } else {
    throw new Error('Provide category_id or product_ids');
  }

  let assigned = 0;
  for (const product of products) {
    const variants = parseVariants(product).filter(
      (v) => v?.label !== PRICING_META_LABEL && v?.sku !== PRICING_META_LABEL
    );
    const targets = variants.filter((v) => {
      if (packKg != null && Number.isFinite(packKg)) {
        return Math.abs(Number(v.pack_kg) - packKg) < 0.0001;
      }
      if (sizeLabel) {
        return String(v.label || '').trim().toLowerCase() === sizeLabel;
      }
      return true;
    });

    for (const variant of targets) {
      await setVariantPackaging({
        product_id: product.id,
        variant_sku: variant.sku || null,
        variant_label: variant.label || null,
        pack_kg: variant.pack_kg ?? packKg ?? null,
        profile_id: profileId,
        component_overrides: payload?.component_overrides || [],
      }, env, request);
      assigned += 1;
    }
  }

  return { success: true, products_scanned: products.length, variants_assigned: assigned };
}

async function resolveLandedCosts(payload, env, request) {
  await requireStaffUser(request, env);
  const productIds = [...new Set((payload?.product_ids || []).filter(Boolean))].slice(0, 200);
  if (!productIds.length) return { success: true, variants: [], defaults: await getPackagingCostDefaults(env) };

  const defaults = await getPackagingCostDefaults(env);
  const filter = `id=in.(${productIds.map((id) => encodeURIComponent(id)).join(',')})`;
  const products = await supabaseFetch(
    env,
    `products?select=id,name,category_id,quick_variants,price,stock_measure_type&${filter}`
  ) || [];
  const mappings = await supabaseFetch(
    env,
    `product_variant_packaging?select=*&product_id=in.(${productIds.map((id) => encodeURIComponent(id)).join(',')})&limit=2000`
  ) || [];
  const profiles = await supabaseFetch(
    env,
    'packaging_profiles?select=*,packaging_profile_components(*,packaging_materials(*))&is_active=eq.true&limit=300'
  ) || [];
  const materials = await supabaseFetch(env, 'packaging_materials?select=*&is_active=eq.true&limit=500') || [];
  const materialsById = Object.fromEntries(materials.map((m) => [m.id, m]));
  const profilesById = Object.fromEntries(profiles.map((p) => [p.id, p]));

  const mappingsByProduct = {};
  for (const m of mappings) {
    if (!mappingsByProduct[m.product_id]) mappingsByProduct[m.product_id] = [];
    mappingsByProduct[m.product_id].push(m);
  }

  const variantsOut = [];
  for (const product of products) {
    const purchaseRate = extractPurchaseRatePerKg(product);
    const measureType = String(product.stock_measure_type || 'kg');
    const sellable = parseVariants(product).filter(
      (v) => v?.label !== PRICING_META_LABEL && v?.sku !== PRICING_META_LABEL
    );
    const productMaps = mappingsByProduct[product.id] || [];

    for (const variant of sellable) {
      const mapping = productMaps.find((m) => {
        if (m.variant_sku && variant.sku) {
          return String(m.variant_sku).toLowerCase() === String(variant.sku).toLowerCase();
        }
        if (m.variant_label && variant.label) {
          return String(m.variant_label).toLowerCase() === String(variant.label).toLowerCase();
        }
        if (m.pack_kg != null && variant.pack_kg != null) {
          return Math.abs(Number(m.pack_kg) - Number(variant.pack_kg)) < 0.0001;
        }
        return false;
      }) || null;

      const profile = mapping?.profile_id ? profilesById[mapping.profile_id] : null;
      const components = profile?.packaging_profile_components || [];
      const bom = resolvePackagingBom(components, mapping?.component_overrides);
      // Attach materials for overrides missing join
      for (const line of bom) {
        if (!line.material) line.material = materialsById[line.material_id] || null;
      }
      const { packaging_cost_paise, lines } = sumPackagingBomPaise(bom, materialsById);
      const labour = mapping?.packing_labour_override_paise != null
        ? mapping.packing_labour_override_paise
        : (profile?.packing_labour_paise ?? defaults.default_packing_labour_paise);
      const transport = mapping?.inward_transport_override_paise != null
        ? mapping.inward_transport_override_paise
        : (profile?.inward_transport_paise ?? defaults.default_inward_transport_paise);
      const wastage = mapping?.wastage_override_pct != null
        ? mapping.wastage_override_pct
        : defaults.default_wastage_pct;

      let packQty = Number(variant.pack_kg ?? mapping?.pack_kg ?? profile?.pack_kg);
      if (measureType === 'units' && !(Number.isFinite(packQty) && packQty > 0)) {
        const label = String(variant.label || '');
        const countMatch = label.toLowerCase().match(/(\d+)\s*(?:pc|pcs|piece|pieces|pack|count)\b/);
        packQty = countMatch ? Number(countMatch[1]) : 1;
      }

      const landed = calculateLandedVariantCostWorker({
        purchaseRatePerKg: purchaseRate,
        packKg: packQty,
        packagingCostPaise: packaging_cost_paise,
        packingLabourPaise: labour,
        inwardTransportPaise: transport,
        wastagePct: wastage,
        sellPriceRs: variant.price ?? product.price,
        measureType,
      });

      variantsOut.push({
        product_id: product.id,
        product_name: product.name,
        variant_sku: variant.sku || null,
        variant_label: variant.label || null,
        pack_kg: packQty ?? null,
        measure_type: measureType,
        profile_id: profile?.id || null,
        profile_name: profile?.name || null,
        packaging_scope: profile?.packaging_scope || null,
        mapping_id: mapping?.id || null,
        bom_lines: lines,
        ...landed,
      });
    }
  }

  return { success: true, defaults, variants: variantsOut };
}

async function validateWebCheckoutPayload(payload, env, request, { requireAuth = false } = {}) {
  const authUser = await getAuthUser(request, env);
  if (requireAuth && !authUser?.id) {
    throw new Error('Sign in required for this checkout option');
  }

  const amount = payload?.amount;
  const rawItems = payload?.items || [];
  const customer = payload?.customer || {};
  const shippingAddress = payload?.shipping_address || {};
  const subtotalPaise = Number(payload?.subtotal_paise ?? amount) || 0;
  const deliveryFeePaise = payload?.delivery_fee_paise ?? 0;
  const pincode = payload?.pincode || shippingAddress?.zip || '';

  const guestEmail = String(customer.email || shippingAddress.email || '').trim();
  const guestPhone = normalizePhone(customer.phone || shippingAddress.phone);

  if (!authUser?.id) {
    if (!isValidEmail(guestEmail) || guestPhone.length !== 10) {
      throw new Error('Email and a valid 10-digit phone are required for guest checkout');
    }
  }

  if (!amount || !Number.isFinite(Number(amount)) || Number(amount) < 100) {
    throw new Error('Invalid order amount');
  }

  const zoneCheck = await validateDeliveryPincode({ pincode }, env);
  if (!zoneCheck.serviceable) {
    throw new Error(zoneCheck.error || 'Unserviceable delivery pincode');
  }

  const expectedFeePaise = await computeExpectedDeliveryFeePaise(env, pincode, subtotalPaise, zoneCheck.zone);

  const discount = await resolveDiscount(env, {
    subtotalPaise,
    couponCode: payload?.coupon_code,
    channel: 'web',
    customerPhone: guestPhone || customer.phone,
    customerEmail: guestEmail || customer.email || authUser?.email,
  });

  const expectedTotalPaise = Number(subtotalPaise) - discount.discountPaise + expectedFeePaise;
  if (Math.abs(Number(amount) - expectedTotalPaise) > 1) {
    throw new Error('Order total changed. Please refresh checkout and try again.');
  }
  if (Math.abs(Number(deliveryFeePaise) - expectedFeePaise) > 1) {
    throw new Error('Delivery fee mismatch. Please refresh checkout.');
  }

  const normalizedItems = await enrichItemsSnapshot(env, normalizeCheckoutItems(rawItems));
  await validateCartStock(env, normalizedItems);

  return {
    authUser,
    amount: Number(amount),
    subtotalPaise: Number(subtotalPaise),
    deliveryFeePaise: Number(deliveryFeePaise),
    discount,
    customer,
    shippingAddress,
    deliveryInstructions: payload?.delivery_instructions || '',
    etaLabel: payload?.eta_label || null,
    deliverySlot: payload?.delivery_slot || null,
    pincode,
    guestEmail,
    guestPhone,
    zoneCheck,
    normalizedItems,
  };
}

async function countPriorPaidOrders(env, userId) {
  if (!userId) return 0;
  const rows = await supabaseFetch(
    env,
    `orders?select=id&user_id=eq.${encodeURIComponent(userId)}&payment_status=eq.paid&limit=1`
  );
  return Array.isArray(rows) ? rows.length : 0;
}

async function checkCodEligibility(payload, env, request) {
  const authUser = await getAuthUser(request, env);
  if (!authUser?.id) {
    return { eligible: false, reason: 'Sign in to use cash on delivery' };
  }

  const amountPaise = Number(payload?.amount_paise || payload?.amount || 0);
  if (amountPaise > COD_MAX_ORDER_PAISE) {
    return {
      eligible: false,
      reason: `COD is available up to ₹${COD_MAX_ORDER_PAISE / 100}. Pay online for larger orders.`,
    };
  }

  const priorPaid = await countPriorPaidOrders(env, authUser.id);
  if (!priorPaid) {
    return {
      eligible: false,
      reason: 'COD unlocks after your first successful online order',
      prior_paid_orders: 0,
    };
  }

  return { eligible: true, prior_paid_orders: priorPaid, max_paise: COD_MAX_ORDER_PAISE };
}

function buildWebOrderRow({
  authUser,
  amount,
  subtotalPaise,
  deliveryFeePaise,
  discount = null,
  customer,
  shippingAddress,
  deliveryInstructions,
  etaLabel,
  deliverySlot,
  pincode,
  guestEmail,
  guestPhone,
  zoneCheck,
  normalizedItems,
  paymentMethod,
  paymentStatus,
  orderStatus,
  receipt,
  razorpayOrderId = null,
  warehouseId,
  timelineNote,
}) {
  const orderNumber = generateOrderNumber();
  const now = new Date().toISOString();
  const currency = 'INR';
  const discountPaise = Number(discount?.discountPaise) || 0;
  const itemsSnapshot = mapItemsSnapshotWithDiscount(
    normalizedItems,
    discountPaise,
    subtotalPaise,
  );

  return {
    row: {
      user_id: authUser?.id || null,
      created_by: authUser?.id || null,
      guest_email: authUser?.id ? null : guestEmail,
      guest_phone: authUser?.id ? null : guestPhone,
      warehouse_id: warehouseId,
      order_number: orderNumber,
      status: orderStatus,
      payment_status: paymentStatus,
      payment_method: paymentMethod,
      order_channel: 'web',
      amount_paise: amount,
      subtotal_paise: subtotalPaise,
      delivery_fee_paise: deliveryFeePaise,
      delivery_fee_charged_paise: COLLECT_DELIVERY_FEE_AT_CHECKOUT ? deliveryFeePaise : null,
      discount_paise: discountPaise,
      discount_type: discount?.discountType || null,
      discount_label: discount?.discountLabel || null,
      discount_amount: discountPaise / 100,
      coupon_code: discount?.couponCode || null,
      total_amount: amount / 100,
      subtotal: subtotalPaise / 100,
      shipping_cost: deliveryFeePaise / 100,
      currency,
      receipt_id: receipt,
      razorpay_order_id: razorpayOrderId,
      items_snapshot: itemsSnapshot,
      timeline: [{ timestamp: now, status: orderStatus, note: timelineNote, updated_by: 'system' }],
      customer_name: customer.name || shippingAddress.name || null,
      customer_email: customer.email || authUser?.email || guestEmail || null,
      customer_phone: customer.phone || shippingAddress.phone || guestPhone || null,
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
    },
    orderNumber,
    itemsSnapshot,
  };
}

async function createCodOrder(payload, env, request) {
  const checkout = await validateWebCheckoutPayload(payload, env, request, { requireAuth: true });
  const { authUser, amount, normalizedItems } = checkout;

  if (amount > COD_MAX_ORDER_PAISE) {
    throw new Error(`Cash on delivery is available up to ₹${COD_MAX_ORDER_PAISE / 100}`);
  }

  const priorPaid = await countPriorPaidOrders(env, authUser.id);
  if (!priorPaid) {
    throw new Error('Cash on delivery unlocks after your first successful online order');
  }

  const receipt = `yasvik_cod_${Date.now()}`;
  const warehouseId = await getDefaultWarehouseId(env);
  const { row: orderRow, orderNumber } = buildWebOrderRow({
    ...checkout,
    paymentMethod: 'cod',
    paymentStatus: 'pending_cod',
    orderStatus: 'confirmed',
    receipt,
    warehouseId,
    timelineNote: 'COD order placed',
  });

  const inserted = await supabaseFetch(env, 'orders', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(orderRow),
  });
  const dbOrder = inserted?.[0];
  if (!dbOrder?.id) throw new Error('Failed to persist order');

  await recordOrderStatusEvent(env, {
    orderId: dbOrder.id,
    status: 'confirmed',
    note: 'COD order confirmed — pay driver on delivery',
  });

  const lineRows = buildOrderItemRows(normalizedItems);
  if (lineRows.length) {
    await insertOrderItems(env, dbOrder.id, lineRows);
  }

  await deductInventory(env, dbOrder.id, authUser.id);

  if (checkout.discount?.couponId) {
    await recordCouponRedemption(env, {
      couponId: checkout.discount.couponId,
      orderId: dbOrder.id,
      code: checkout.discount.couponCode,
      discountPaise: checkout.discount.discountPaise,
      channel: 'web',
      customerPhone: checkout.guestPhone || checkout.customer?.phone,
      customerEmail: checkout.guestEmail || checkout.customer?.email || authUser?.email,
    });
  }

  let notification = { email_sent: false, email_error: null };
  try {
    notification = await sendOrderNotification({ orderId: dbOrder.id, status: 'confirmed', recordEvent: false }, env);
  } catch (err) {
    notification.email_error = err?.message || 'Notification failed';
  }

  await linkCustomerAfterOrder(env, dbOrder);

  return {
    success: true,
    db_order_id: dbOrder.id,
    order_number: orderNumber,
    payment_method: 'cod',
    email_sent: notification?.email_sent || false,
    email_error: notification?.email_error || null,
  };
}

async function razorpayCreateOrder(payload, env, request) {
  requireEnv(env, ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET']);
  const checkout = await validateWebCheckoutPayload(payload, env, request);
  const {
    authUser,
    amount,
    subtotalPaise,
    deliveryFeePaise,
    customer,
    shippingAddress,
    deliveryInstructions,
    etaLabel,
    deliverySlot,
    pincode,
    guestEmail,
    guestPhone,
    zoneCheck,
    normalizedItems,
  } = checkout;
  const currency = payload?.currency || 'INR';

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
      notes: {
        source: 'yasvik-webapp',
        user_id: authUser?.id || null,
        guest: !authUser?.id,
      },
    }),
  });
  const orderData = await rzRes.json().catch(() => ({}));
  if (!rzRes.ok) throw new Error(orderData?.error?.description || 'Failed to create Razorpay order');

  const warehouseId = await getDefaultWarehouseId(env);
  const { row: orderRow } = buildWebOrderRow({
    authUser,
    amount,
    subtotalPaise,
    deliveryFeePaise,
    customer,
    shippingAddress,
    deliveryInstructions,
    etaLabel,
    deliverySlot,
    pincode,
    guestEmail,
    guestPhone,
    zoneCheck,
    normalizedItems,
    paymentMethod: 'razorpay',
    paymentStatus: 'unpaid',
    orderStatus: 'pending',
    receipt,
    razorpayOrderId: orderData.id,
    warehouseId,
    timelineNote: authUser?.id ? 'Order created' : 'Guest order created',
  });
  const orderNumber = orderRow.order_number;

  const inserted = await supabaseFetch(env, 'orders', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(orderRow),
  });
  const dbOrder = inserted?.[0];
  if (!dbOrder?.id) throw new Error('Failed to persist order');

  await recordOrderStatusEvent(env, {
    orderId: dbOrder.id,
    status: 'pending',
    note: authUser?.id ? 'Order created' : 'Guest order created',
  });

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
    const bonus = await applyOrderBonusLifecycle(env, dbOrder.id, { earn: true });
    return {
      success: true,
      verified: true,
      already_paid: true,
      db_order_id: dbOrder.id,
      order_number: dbOrder.order_number,
      bonus,
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

  await recordOrderStatusEvent(env, {
    orderId: dbOrder.id,
    status: 'confirmed',
    note,
  });

  await deductInventory(env, dbOrder.id, dbOrder.user_id || dbOrder.created_by);

  if (dbOrder.coupon_code && Number(dbOrder.discount_paise) > 0) {
    try {
      const code = normalizeCouponCode(dbOrder.coupon_code);
      const coupons = await supabaseFetch(
        env,
        `coupons?select=id,used_count&code=eq.${encodeURIComponent(code)}&limit=1`
      );
      const coupon = coupons?.[0];
      if (coupon?.id) {
        const existing = await supabaseFetch(
          env,
          `coupon_redemptions?select=id&order_id=eq.${encodeURIComponent(dbOrder.id)}&limit=1`
        );
        if (!existing?.length) {
          await recordCouponRedemption(env, {
            couponId: coupon.id,
            orderId: dbOrder.id,
            code,
            discountPaise: Number(dbOrder.discount_paise) || 0,
            channel: 'web',
            customerPhone: dbOrder.customer_phone || dbOrder.guest_phone,
            customerEmail: dbOrder.customer_email || dbOrder.guest_email,
          });
        }
      }
    } catch (err) {
      console.error('[finalizePaidOrder coupon]', dbOrder.id, err?.message || err);
    }
  }

  try {
    const notification = await sendOrderNotification({ orderId: dbOrder.id, status: 'confirmed', recordEvent: false }, env);
    await linkCustomerAfterOrder(env, dbOrder);
    const bonus = await applyOrderBonusLifecycle(env, dbOrder.id, {
      redeemPaise: 0,
      redeemConfirmed: false,
      actorId: null,
      earn: true,
    });
    return {
      success: true,
      verified: true,
      db_order_id: dbOrder.id,
      order_number: dbOrder.order_number,
      email_sent: notification?.email_sent || false,
      email_error: notification?.email_error || null,
      bonus,
    };
  } catch (err) {
    console.error('[finalizePaidOrder notification]', dbOrder.id, err?.message || err);
    await linkCustomerAfterOrder(env, dbOrder);
    const bonus = await applyOrderBonusLifecycle(env, dbOrder.id, {
      redeemPaise: 0,
      redeemConfirmed: false,
      actorId: null,
      earn: true,
    });
    return {
      success: true,
      verified: true,
      db_order_id: dbOrder.id,
      order_number: dbOrder.order_number,
      email_sent: false,
      email_error: err?.message || 'Notification failed',
      bonus,
    };
  }
}

async function whatsappWebhook(request, env) {
  const url = new URL(request.url);

  if (request.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    const expected = String(env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '').trim();

    if (!expected) {
      return new Response('WhatsApp verify token not configured on server', { status: 503 });
    }
    if (mode === 'subscribe' && token === expected && challenge) {
      return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }
    return new Response('Forbidden', { status: 403 });
  }

  if (request.method === 'POST') {
    const appSecret = String(env.WHATSAPP_APP_SECRET || '').trim();
    const rawBody = await request.text();

    if (appSecret) {
      const signature = request.headers.get('X-Hub-Signature-256') || '';
      const expectedSig = `sha256=${await hmacSHA256Hex(appSecret, rawBody)}`;
      if (!signature || signature !== expectedSig) {
        return new Response('Invalid signature', { status: 403 });
      }
    }

    try {
      const payload = JSON.parse(rawBody);
      const entries = payload?.entry || [];
      for (const entry of entries) {
        const changes = entry?.changes || [];
        for (const change of changes) {
          const value = change?.value;
          if (!value) continue;
          const statuses = value?.statuses || [];
          for (const status of statuses) {
            if (status?.id) {
              await logNotification(env, {
                order_id: null,
                channel: 'whatsapp',
                recipient: status?.recipient_id || null,
                template_key: 'delivery_status',
                status: status?.status || 'update',
                payload: { wa_message_id: status.id, meta: status },
              });
            }
          }
        }
      }
    } catch (_) { /* always ack Meta */ }

    return new Response('OK', { status: 200 });
  }

  return new Response('Method not allowed', { status: 405 });
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
  if (!authUser?.id && dbOrder.user_id) {
    throw new Error('Login required to verify this order');
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
    email_sent: result.email_sent,
    email_error: result.email_error,
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
  const eligibleDiscountPaise = items.reduce((s, i) => (
    i.exclude_from_discount ? s : s + Math.round(i.price * 100) * i.qty
  ), 0);
  const discount = await resolveDiscount(env, {
    subtotalPaise: eligibleDiscountPaise > 0 ? eligibleDiscountPaise : subtotalPaise,
    couponCode: payload?.coupon_code,
    manualPercent: payload?.manual_discount_percent,
    manualFixedPaise: payload?.manual_discount_paise,
    channel: 'pos',
    customerPhone: payload?.customer_phone,
    customerEmail: payload?.customer_email,
    allowManual: true,
  });
  // Cap again in case coupon was validated on a larger base elsewhere.
  discount.discountPaise = Math.min(
    Number(discount.discountPaise) || 0,
    eligibleDiscountPaise > 0 ? eligibleDiscountPaise : subtotalPaise,
  );
  const amountPaise = Math.max(0, subtotalPaise - discount.discountPaise);
  if (amountPaise < 100 && items.length) {
    throw new Error('Order total after discount is too low');
  }

  const paymentMethod = payload?.payment_method || 'cash';
  const now = new Date().toISOString();
  const soldAtRaw = payload?.sold_at;
  const soldAt = soldAtRaw && !Number.isNaN(Date.parse(soldAtRaw))
    ? new Date(soldAtRaw).toISOString()
    : now;
  const orderNumber = generateOrderNumber();
  const receipt = clientSaleId || `pos_${Date.now()}`;

  const warehouseId = await getDefaultWarehouseId(env);

  const channel = ['whatsapp', 'pos'].includes(String(payload?.order_channel || ''))
    ? String(payload.order_channel)
    : 'pos';

  const enrichedItems = await enrichItemsSnapshot(env, items);
  const itemsSnapshot = mapItemsSnapshotWithDiscount(
    enrichedItems,
    discount.discountPaise,
    subtotalPaise,
  );

  const offlineNote = clientSaleId ? `Offline sale synced ${now.slice(0, 16).replace('T', ' ')}` : null;
  const adminNotes = [payload?.notes, offlineNote].filter(Boolean).join(' · ') || null;

  const orderRow = {
    user_id: user.id,
    created_by: user.id,
    warehouse_id: warehouseId,
    order_number: orderNumber,
    status: 'delivered',
    payment_status: 'paid',
    payment_method: paymentMethod,
    order_channel: channel,
    amount_paise: amountPaise,
    subtotal_paise: subtotalPaise,
    delivery_fee_paise: 0,
    discount_paise: discount.discountPaise,
    discount_type: discount.discountType,
    discount_label: discount.discountLabel,
    discount_amount: discount.discountPaise / 100,
    coupon_code: discount.couponCode,
    total_amount: amountPaise / 100,
    subtotal: subtotalPaise / 100,
    currency: 'INR',
    receipt_id: receipt,
    items_snapshot: itemsSnapshot,
    timeline: [
      {
        timestamp: soldAt,
        status: 'delivered',
        note: `POS sale (${paymentMethod})${discount.discountLabel ? ` · ${discount.discountLabel}` : ''}${clientSaleId ? ' · offline sync' : ''}`,
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

  if (discount.couponId) {
    await recordCouponRedemption(env, {
      couponId: discount.couponId,
      orderId: dbOrder.id,
      code: discount.couponCode,
      discountPaise: discount.discountPaise,
      channel: 'pos',
      customerPhone: payload?.customer_phone,
      customerEmail: payload?.customer_email,
    });
  }

  await recordOrderStatusEvent(env, {
    orderId: dbOrder.id,
    status: 'delivered',
    note: `POS sale (${paymentMethod})`,
    actorId: user.id,
    actorType: 'staff',
  });

  await linkCustomerAfterOrder(env, {
    ...dbOrder,
    customer_phone: payload?.customer_phone,
    customer_name: payload?.customer_name,
    customer_email: payload?.customer_email,
    order_channel: channel,
  });

  const bonus = await applyOrderBonusLifecycle(env, dbOrder.id, {
    redeemPaise: payload?.bonus_redeem_paise ?? payload?.store_credit_redeem_paise ?? 0,
    redeemConfirmed: payload?.bonus_redeem_confirmed === true
      || payload?.apply_yasvik_bonus === true
      || payload?.apply_bonus === true,
    actorId: user.id,
    earn: true,
  });

  const refreshed = await supabaseFetch(
    env,
    `orders?select=id,bonus_earned_paise,bonus_redeemed_paise,bonus_balance_after_paise,bonus_breakdown,amount_paise&id=eq.${encodeURIComponent(dbOrder.id)}&limit=1`
  );
  const orderBonus = refreshed?.[0] || {};

  return {
    success: true,
    order_id: dbOrder.id,
    order_number: orderNumber,
    receipt_id: receipt,
    amount_paise: Math.max(0, amountPaise - (Number(orderBonus.bonus_redeemed_paise) || 0)),
    subtotal_paise: subtotalPaise,
    discount_paise: discount.discountPaise,
    discount_label: discount.discountLabel,
    order_channel: channel,
    bonus_earned_paise: Number(orderBonus.bonus_earned_paise) || 0,
    bonus_redeemed_paise: Number(orderBonus.bonus_redeemed_paise) || 0,
    bonus_balance_after_paise: orderBonus.bonus_balance_after_paise ?? null,
    bonus,
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

async function loadCatalogueSettingsMap(env) {
  const rows = await supabaseFetch(
    env,
    'app_settings?select=setting_key,setting_value,key,value&or=(setting_key.not.is.null,key.not.is.null)'
  );
  const map = {};
  for (const row of rows || []) {
    const key = row.setting_key || row.key;
    if (!key) continue;
    map[key] = row.setting_value ?? row.value ?? '';
  }
  return map;
}

async function loadCatalogueSourceData(env) {
  const [products, categories, settings, salesRanks] = await Promise.all([
    supabaseFetch(
      env,
      'products?select=id,name,slug,local_name,short_description,description,price,discount_price,featured_image_url,quick_variants,purity_badges,category_id,is_published,sell_online,is_featured,featured_in_hero,sort_order,group_sort_order,shared_stock_kg,stock_quantity,stock_measure_type,created_at,show_in_public_catalogue,show_in_dealer_catalogue,show_in_gifting_catalogue,exclude_from_catalogues,catalogue_priority,catalogue_image_override,catalogue_short_description_override&order=sort_order.asc.nullslast'
    ),
    supabaseFetch(
      env,
      'categories?select=id,name,slug,parent_id,sort_order,is_active,cover_image,icon_url,show_on_homepage,homepage_order,is_hero_category,homepage_label,homepage_image_override,homepage_description&is_active=eq.true&order=sort_order.asc.nullslast'
    ),
    loadCatalogueSettingsMap(env),
    supabaseFetch(env, 'rpc/get_popular_product_sales', {
      method: 'POST',
      body: JSON.stringify({ days_back: 90, max_products: 100 }),
    }).catch(() => []),
  ]);
  return {
    products: products || [],
    categories: categories || [],
    settings,
    salesRanks: Array.isArray(salesRanks) ? salesRanks : [],
  };
}

async function listCatalogueTemplates(env, request) {
  await requireStaffUser(request, env);
  const templates = await supabaseFetch(
    env,
    'catalogue_templates?select=*&is_active=eq.true&order=sort_order.asc'
  );
  return { templates: templates || [] };
}

async function listCatalogues(payload, env, request) {
  await requireStaffUser(request, env);
  const status = String(payload?.status || '').trim();
  let path = 'catalogues?select=id,name,slug,catalogue_type,status,is_public,is_latest_public,summary,cover_image_url,template_id,latest_generation_id,published_at,updated_at,created_at&order=updated_at.desc';
  if (status) path += `&status=eq.${encodeURIComponent(status)}`;
  const catalogues = await supabaseFetch(env, path);
  return { catalogues: catalogues || [] };
}

async function getCatalogue(payload, env, request) {
  await requireStaffUser(request, env);
  const id = String(payload?.id || '').trim();
  if (!id) {
    const err = new Error('Catalogue id is required');
    err.status = 400;
    throw err;
  }
  const rows = await supabaseFetch(
    env,
    `catalogues?select=*,catalogue_generations:catalogue_generations(*)&id=eq.${encodeURIComponent(id)}&limit=1`
  );
  const catalogue = rows?.[0];
  if (!catalogue) {
    const err = new Error('Catalogue not found');
    err.status = 404;
    throw err;
  }
  return { catalogue };
}

/** Slugs are unique; append -2, -3, ... when another catalogue already owns the base slug. */
async function resolveUniqueCatalogueSlug(env, baseSlug, currentId = null) {
  const pattern = `${baseSlug}%`;
  const rows = await supabaseFetch(
    env,
    `catalogues?select=id,slug&slug=like.${encodeURIComponent(pattern)}`,
  );
  const taken = new Set(
    (rows || [])
      .filter((r) => !currentId || String(r.id) !== String(currentId))
      .map((r) => r.slug),
  );
  if (!taken.has(baseSlug)) return baseSlug;
  for (let n = 2; n <= 200; n += 1) {
    const candidate = `${baseSlug}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${baseSlug}-${Date.now()}`;
}

async function upsertCatalogue(payload, env, request) {
  const { user } = await requireStaffUser(request, env);
  const id = payload?.id ? String(payload.id) : null;
  const name = String(payload?.name || '').trim();
  const catalogueType = String(payload?.catalogue_type || 'customer').trim();
  if (!name) {
    const err = new Error('Catalogue name is required');
    err.status = 400;
    throw err;
  }
  if (!['customer', 'whatsapp', 'dealer', 'gifting', 'lookbook'].includes(catalogueType)) {
    const err = new Error('Invalid catalogue type');
    err.status = 400;
    throw err;
  }
  if (catalogueType === 'dealer') {
    await requireAdminUser(request, env);
  }

  const options = {
    ...defaultCatalogueOptions(catalogueType, payload?.options?.design),
    ...(payload?.options || {}),
    content: {
      ...defaultCatalogueOptions(catalogueType, payload?.options?.design).content,
      ...(payload?.options?.content || {}),
    },
    selection: {
      ...defaultCatalogueOptions(catalogueType, payload?.options?.design).selection,
      ...(payload?.selection || payload?.options?.selection || {}),
    },
  };

  const densityLimits = {
    classic: 4,
    whatsapp_compact: 6,
    premium_magazine: 2,
    festival_specials: 4,
    dealer_price_list: 14,
  };
  const maxDensity = densityLimits[options.design] || 4;
  options.products_per_page = Math.max(
    1,
    Math.min(Number(options.products_per_page) || maxDensity, maxDensity),
  );

  if (options.dealer_mode || catalogueType === 'dealer') {
    options.dealer_pricing_configured = false;
  }

  const baseSlug = String(payload?.slug || slugifyCatalogue(name)).trim() || 'catalogue';
  const slug = await resolveUniqueCatalogueSlug(env, baseSlug, id);

  const row = {
    name,
    slug,
    catalogue_type: catalogueType,
    template_id: payload?.template_id || null,
    summary: payload?.summary || null,
    cover_image_url: payload?.cover_image_url || options.cover_image_url || null,
    options,
    selection: options.selection,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };

  if (id) {
    const rows = await supabaseFetch(env, `catalogues?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(row),
    });
    return { catalogue: rows?.[0] };
  }

  const created = await supabaseFetch(env, 'catalogues', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      ...row,
      status: 'draft',
      is_public: false,
      created_by: user.id,
    }),
  });
  return { catalogue: created?.[0] };
}

async function buildLiveCataloguePreview(payload, env, request) {
  const { user } = await requireStaffUser(request, env);
  const catalogueType = String(payload?.catalogue_type || payload?.catalogue?.catalogue_type || 'customer');
  if (catalogueType === 'dealer') await requireAdminUser(request, env);

  const options = payload?.options || payload?.catalogue?.options || {};
  if ((options.dealer_mode || catalogueType === 'dealer') && options.dealer_pricing_configured !== true) {
    // Still allow preview of gated state, but mark clearly
    options.dealer_pricing_configured = false;
    options.dealer_mode = true;
  }

  const catalogue = {
    id: payload?.id || payload?.catalogue?.id || null,
    name: payload?.name || payload?.catalogue?.name || 'Yasvik Catalogue',
    slug: payload?.slug || payload?.catalogue?.slug || slugifyCatalogue(payload?.name || 'yasvik-catalogue'),
    catalogue_type: catalogueType,
    cover_image_url: payload?.cover_image_url || payload?.catalogue?.cover_image_url || options.cover_image_url || null,
    options,
    selection: payload?.selection || payload?.catalogue?.selection || options.selection || {},
  };

  const { products, categories, settings, salesRanks } = await loadCatalogueSourceData(env);
  const { snapshot, html, pdfOptions } = compileCatalogue({
    catalogue,
    products,
    categories,
    settings,
    salesRanks,
    generatedBy: user.id,
  });
  return { snapshot, html, pdfOptions, user };
}

async function previewCatalogue(payload, env, request) {
  const { snapshot, html } = await buildLiveCataloguePreview(payload, env, request);
  return {
    snapshot,
    html,
    warnings: snapshot.warnings || [],
    stats: snapshot.stats,
    pages: (snapshot.pages || []).map((p) => ({ type: p.type, page_number: p.page_number, category_name: p.category_name })),
    dealer_gated: Boolean(snapshot.dealer_gated),
  };
}

async function putCataloguePdfToR2(env, bytes, catalogueId, generationHint, fileName) {
  if (!env.MEDIA_BUCKET) throw new Error('MEDIA_BUCKET binding missing');
  const safeCatalogue = String(catalogueId || 'draft').replace(/[^a-zA-Z0-9_-]/g, '');
  const safeGen = String(generationHint || Date.now()).replace(/[^a-zA-Z0-9_-]/g, '');
  const key = `media-assets/catalogues/${safeCatalogue}/${safeGen}-${fileName}`;
  await env.MEDIA_BUCKET.put(key, bytes, {
    httpMetadata: {
      contentType: 'application/pdf',
      cacheControl: 'public, max-age=31536000, immutable',
      contentDisposition: `inline; filename="${fileName}"`,
    },
  });
  const base = mediaPublicBase(env);
  return { key, url: `${base}/${key}` };
}

async function generateCataloguePdf(payload, env, request) {
  const { snapshot, html, pdfOptions, user } = await buildLiveCataloguePreview(payload, env, request);
  const catalogueId = String(payload?.id || payload?.catalogue?.id || '').trim();
  if (!catalogueId) {
    const err = new Error('Save the catalogue before generating a PDF');
    err.status = 400;
    throw err;
  }

  if (snapshot.dealer_gated) {
    const err = new Error('Dealer pricing is not configured yet. Dealer catalogues cannot be generated until dealer price and MOQ fields are available.');
    err.status = 400;
    throw err;
  }

  let pdfBytes = null;
  let errorMessage = null;
  if (env.BROWSER?.quickAction) {
    try {
      // Browser Rendering rejects gotoOptions.timeout above 60000ms.
      const pdfResponse = await env.BROWSER.quickAction('pdf', {
        html,
        pdfOptions: pdfOptions || browserPdfOptions(snapshot.format || {}),
        gotoOptions: { waitUntil: 'networkidle0', timeout: 55000 },
      });
      const bytes = new Uint8Array(await pdfResponse.arrayBuffer());
      // On failure the API returns a JSON error body instead of throwing; never store that as a PDF.
      const isPdf = bytes.length > 4
        && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
      if (isPdf) {
        pdfBytes = bytes;
      } else {
        let detail = '';
        try {
          detail = new TextDecoder().decode(bytes.slice(0, 500));
        } catch { /* ignore */ }
        errorMessage = `Browser PDF generation returned a non-PDF response: ${detail || 'empty body'}`;
      }
    } catch (error) {
      errorMessage = error?.message || 'Browser PDF generation failed';
    }
  } else {
    errorMessage = 'Browser Run binding is not configured. HTML preview was saved; enable [browser] binding to generate PDFs.';
  }

  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const fileName = `${slugifyCatalogue(snapshot.catalogue.name)}-${stamp}.pdf`;
  const generationIdHint = crypto.randomUUID?.() || String(Date.now());

  let fileMeta = { file_key: null, file_url: null, file_name: null, file_size: null };
  if (pdfBytes?.length) {
    const uploaded = await putCataloguePdfToR2(env, pdfBytes, catalogueId, generationIdHint, fileName);
    fileMeta = {
      file_key: uploaded.key,
      file_url: uploaded.url,
      file_name: fileName,
      file_size: pdfBytes.length,
    };
  }

  const storedSnapshot = {
    template_version: snapshot.template_version,
    generated_at: snapshot.generated_at,
    catalogue: snapshot.catalogue,
    options: snapshot.options,
    format: snapshot.format,
    brand: snapshot.brand,
    stats: snapshot.stats,
    warnings: snapshot.warnings,
    pages: (snapshot.pages || []).map((p) => ({
      type: p.type,
      page_number: p.page_number,
      category_id: p.category_id,
      category_name: p.category_name,
      product_ids: (p.products || []).map((prod) => prod.id),
    })),
    products: (snapshot.products || []).map((p) => ({
      id: p.id,
      name: p.name,
      local_name: p.local_name,
      category_id: p.category_id,
      category_name: p.category_name,
      product_url: p.product_url,
      image_url: p.image_url,
      availability: p.availability,
      variants: p.variants,
      badges: p.badges,
      hide_price: p.hide_price,
    })),
  };

  const generationRows = await supabaseFetch(env, 'catalogue_generations', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      id: generationIdHint.match(/^[0-9a-f-]{36}$/i) ? generationIdHint : undefined,
      catalogue_id: catalogueId,
      template_version: snapshot.template_version || '2',
      status: pdfBytes?.length ? 'ready' : 'failed',
      snapshot: storedSnapshot,
      warnings: snapshot.warnings || [],
      page_count: snapshot.stats?.page_count || null,
      estimated_bytes: snapshot.stats?.estimated_bytes || null,
      html_preview: html,
      error_message: errorMessage,
      generated_by: user.id,
      mime_type: 'application/pdf',
      ...fileMeta,
    }),
  });
  const generation = generationRows?.[0];
  if (generation?.id) {
    await supabaseFetch(env, `catalogues?id=eq.${encodeURIComponent(catalogueId)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        latest_generation_id: generation.id,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      }),
    });
  }

  if (!pdfBytes?.length) {
    const err = new Error(errorMessage || 'PDF generation failed');
    err.status = 503;
    throw err;
  }

  return {
    generation,
    file_url: fileMeta.file_url,
    warnings: snapshot.warnings || [],
    stats: snapshot.stats,
  };
}

async function publishCatalogue(payload, env, request) {
  const { user } = await requireStaffUser(request, env);
  const id = String(payload?.id || '').trim();
  const makeLatest = payload?.is_latest_public !== false;
  if (!id) {
    const err = new Error('Catalogue id is required');
    err.status = 400;
    throw err;
  }
  const rows = await supabaseFetch(
    env,
    `catalogues?select=id,catalogue_type,latest_generation_id&id=eq.${encodeURIComponent(id)}&limit=1`
  );
  const catalogue = rows?.[0];
  if (!catalogue) {
    const err = new Error('Catalogue not found');
    err.status = 404;
    throw err;
  }
  if (catalogue.catalogue_type === 'dealer') {
    const err = new Error('Dealer catalogues cannot be published publicly');
    err.status = 400;
    throw err;
  }
  if (!catalogue.latest_generation_id) {
    const err = new Error('Generate a PDF before publishing');
    err.status = 400;
    throw err;
  }

  if (makeLatest) {
    await supabaseFetch(env, 'catalogues?is_latest_public=eq.true', {
      method: 'PATCH',
      body: JSON.stringify({ is_latest_public: false }),
    });
  }

  const updated = await supabaseFetch(env, `catalogues?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      status: 'published',
      is_public: true,
      is_latest_public: makeLatest,
      published_at: new Date().toISOString(),
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }),
  });
  return { catalogue: updated?.[0] };
}

async function listPublicCatalogues(env) {
  const catalogues = await supabaseFetch(
    env,
    'catalogues?select=id,name,slug,catalogue_type,summary,cover_image_url,is_latest_public,published_at,latest_generation_id&status=eq.published&is_public=eq.true&order=published_at.desc'
  );
  const ids = (catalogues || []).map((c) => c.latest_generation_id).filter(Boolean);
  let generations = [];
  if (ids.length) {
    generations = await supabaseFetch(
      env,
      `catalogue_generations?select=id,file_url,file_name,file_size,page_count,generated_at&id=in.(${ids.map(encodeURIComponent).join(',')})`
    ) || [];
  }
  const byId = new Map(generations.map((g) => [g.id, g]));
  return {
    catalogues: (catalogues || []).map((c) => ({
      ...c,
      generation: byId.get(c.latest_generation_id) || null,
    })),
  };
}
