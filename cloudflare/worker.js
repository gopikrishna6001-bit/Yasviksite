export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/^\/api(?=\/|$)/, '') || '/';

    if (request.method === 'POST' && pathname.startsWith('/functions/')) {
      const fnName = pathname.replace('/functions/', '');
      const payload = await request.json().catch(() => ({}));

      const handlers = {
        razorpayCreateOrder: async (p) => razorpayCreateOrder(p, env),
        razorpayVerifyPayment: async (p) => razorpayVerifyPayment(p, env),
        razorpayCreateSubscription: async (p) => razorpayCreateSubscription(p, env),
        getOrderTrackingDetails: async (p) => getOrderTrackingDetails(p, env),
        sendOrderNotification: async (p) => sendOrderNotification(p, env),
        sendEmail: async (p) => sendEmail(p, env),
        generateImage: async (p) => notImplemented('generateImage', p),
      };

      const handler = handlers[fnName];
      if (!handler) {
        return json({ error: `Unknown function: ${fnName}` }, 404);
      }

      try {
        const data = await handler(payload, env, request);
        return json(data, 200);
      } catch (error) {
        return json({ error: error?.message || 'Function failed' }, 500);
      }
    }

    if (pathname === '/' || pathname === '') {
      return json({ ok: true, message: 'Yasvik Cloudflare API online' }, 200);
    }

    return json({ error: 'Not found' }, 404);
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
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

function supabaseHeaders(env) {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
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
    throw new Error(data?.message || data?.error || `Supabase request failed: ${res.status}`);
  }
  return data;
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

async function getOrderTrackingDetails(payload, env) {
  const orderId = payload?.orderId || payload?.order_id || payload?.id;
  const orderNumber = payload?.orderNumber || payload?.order_number;
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

  return {
    success: true,
    order: {
      id: order.id,
      order_number: order.order_number || order.id,
      status: order.status || 'pending',
      payment_status: order.payment_status || null,
      tracking_number: order.tracking_number || null,
      courier_name: order.courier_name || null,
      estimated_delivery_date: order.estimated_delivery_date || null,
      updated_date: order.updated_at || order.updated_date || null,
      created_date: order.created_at || order.created_date || null,
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
    `orders?select=id,order_number,status,customer_email,created_by,updated_at&id=eq.${encodeURIComponent(orderId)}&limit=1`
  );
  const order = orders?.[0];
  if (!order) throw new Error('Order not found');

  let email = order.customer_email || null;
  if (!email && order.created_by) {
    const users = await supabaseFetch(
      env,
      `user_profiles?select=email&id=eq.${encodeURIComponent(order.created_by)}&limit=1`
    );
    email = users?.[0]?.email || null;
  }

  if (!email) {
    return { success: false, error: 'Could not determine recipient email for order notification' };
  }

  await sendEmail(
    {
      to: email,
      subject: `Order ${order.order_number || order.id} status update`,
      body: `<p>Your order status is now <strong>${status}</strong>.</p><p>Order: ${order.order_number || order.id}</p>`,
    },
    env
  );

  return { success: true };
}

function toBasicAuth(id, secret) {
  const raw = `${id}:${secret}`;
  return `Basic ${btoa(raw)}`;
}

async function razorpayCreateOrder(payload, env) {
  requireEnv(env, ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET']);
  const amount = payload?.amount;
  const currency = payload?.currency || 'INR';
  const items = payload?.items || [];
  if (!amount) throw new Error('Amount is required');

  const rzRes = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: toBasicAuth(env.RAZORPAY_KEY_ID, env.RAZORPAY_KEY_SECRET),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount,
      currency,
      receipt: `yasvik_${Date.now()}`,
      notes: { source: 'yasvik-webapp' },
    }),
  });
  const orderData = await rzRes.json().catch(() => ({}));
  if (!rzRes.ok) throw new Error(orderData?.error?.description || 'Failed to create Razorpay order');

  return {
    order_id: orderData.id,
    amount: orderData.amount,
    currency: orderData.currency,
    key_id: env.RAZORPAY_KEY_ID,
    db_order_id: null,
    items_count: Array.isArray(items) ? items.length : 0,
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

async function razorpayVerifyPayment(payload, env) {
  requireEnv(env, ['RAZORPAY_KEY_SECRET']);
  const orderId = payload?.razorpay_order_id;
  const paymentId = payload?.razorpay_payment_id;
  const signature = payload?.razorpay_signature;
  if (!orderId || !paymentId || !signature) throw new Error('Missing Razorpay verification params');

  const computed = await hmacSHA256Hex(env.RAZORPAY_KEY_SECRET, `${orderId}|${paymentId}`);
  const success = computed === signature;
  return { success, verified: success };
}

async function razorpayCreateSubscription(payload, env) {
  requireEnv(env, ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET']);
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
