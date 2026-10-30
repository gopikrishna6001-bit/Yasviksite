#!/usr/bin/env node
/**
 * Resend order confirmation email via production Worker.
 * Requires RESEND_API_KEY in env (or .env.local) only when using --direct.
 * Default: calls Worker resendOrderConfirmation (needs ADMIN_BEARER_TOKEN in env).
 *
 * Usage:
 *   ADMIN_BEARER_TOKEN=eyJ... node scripts/resend-order-email.mjs YV2606309208
 *   RESEND_API_KEY=re_... EMAIL_FROM="Yasvik <orders@yasvik.com>" node scripts/resend-order-email.mjs YV2606309208 --direct
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const orderRef = process.argv[2];
const useDirect = process.argv.includes('--direct');

if (!orderRef) {
  console.error('Usage: node scripts/resend-order-email.mjs <order_number>');
  process.exit(1);
}

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function env(key) {
  if (process.env[key]) return process.env[key];
  const local = readEnvFile(path.join(root, '.env.local'));
  if (local[key]) return local[key];
  const bak = readEnvFile(path.join(root, '.env.local.bak'));
  if (bak[key]) return bak[key];
  return '';
}

const SUPABASE_URL = env('SUPABASE_URL') || env('VITE_SUPABASE_URL');
const SERVICE_KEY = env('SUPABASE_SERVICE_ROLE_KEY');

async function fetchOrder() {
  const q = new URL(`${SUPABASE_URL}/rest/v1/orders`);
  q.searchParams.set('select', 'id,order_number,customer_email,customer_name,status');
  q.searchParams.set('order_number', `eq.${orderRef}`);
  q.searchParams.set('limit', '1');
  const res = await fetch(q, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
  });
  const rows = await res.json();
  if (!res.ok) throw new Error(rows?.message || `Supabase ${res.status}`);
  return rows?.[0];
}

async function viaWorker(orderId) {
  const token = env('ADMIN_BEARER_TOKEN');
  if (!token) throw new Error('Set ADMIN_BEARER_TOKEN (admin session JWT from browser)');
  const res = await fetch('https://www.yasvik.com/api/functions/resendOrderConfirmation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ orderId, status: 'confirmed' }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Worker ${res.status}`);
  return data;
}

async function viaWorkerPublic(orderId) {
  const res = await fetch('https://www.yasvik.com/api/functions/resendOrderConfirmation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, status: 'confirmed' }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env or .env.local');
    process.exit(1);
  }

  const order = await fetchOrder();
  if (!order) {
    console.error(`Order not found: ${orderRef}`);
    process.exit(1);
  }

  console.log(`Order ${order.order_number} → ${order.customer_email || '(no email)'}`);

  if (useDirect) {
    const key = env('RESEND_API_KEY');
    const from = env('EMAIL_FROM') || 'Yasvik <orders@yasvik.com>';
    if (!key) throw new Error('Set RESEND_API_KEY for --direct mode');
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        reply_to: 'yasvikfoods@gmail.com',
        to: [order.customer_email],
        subject: `Yasvik order ${order.order_number} — Confirmed`,
        html: `<p>Hi ${order.customer_name || 'there'},</p><p>Your Yasvik order <strong>${order.order_number}</strong> is <strong>Confirmed</strong>.</p><p><a href="https://www.yasvik.com/orders/${order.order_number}/track">Track your order</a></p>`,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || JSON.stringify(data));
    console.log('Resend OK:', data.id);
    return;
  }

  const token = env('ADMIN_BEARER_TOKEN');
  if (token) {
    const data = await viaWorker(order.id);
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  const attempt = await viaWorkerPublic(order.id);
  if (attempt.ok) {
    console.log(JSON.stringify(attempt.data, null, 2));
    return;
  }

  console.error('Need ADMIN_BEARER_TOKEN or use --direct with RESEND_API_KEY');
  console.error('Worker response:', attempt.data?.error || attempt.data);
  process.exit(1);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
