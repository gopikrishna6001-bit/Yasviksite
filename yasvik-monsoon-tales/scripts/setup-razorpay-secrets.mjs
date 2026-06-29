#!/usr/bin/env node
/**
 * Push Razorpay credentials to Cloudflare Worker secrets (never to git or Supabase).
 *
 * Usage:
 *   RAZORPAY_KEY_ID=rzp_test_xxx RAZORPAY_KEY_SECRET=yyy npm run setup:razorpay
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const keyId = String(process.env.RAZORPAY_KEY_ID || '').trim();
const keySecret = String(process.env.RAZORPAY_KEY_SECRET || '').trim();
const webhookSecret = String(process.env.RAZORPAY_WEBHOOK_SECRET || '').trim();

if (!keyId || !keySecret) {
  console.error('\nMissing credentials. Set env vars and retry:\n');
  console.error('  RAZORPAY_KEY_ID=rzp_test_xxx RAZORPAY_KEY_SECRET=your_secret npm run setup:razorpay\n');
  process.exit(1);
}

if (!keyId.startsWith('rzp_')) {
  console.error('RAZORPAY_KEY_ID should start with rzp_test_ or rzp_live_');
  process.exit(1);
}

function putSecret(name, value) {
  console.log(`\n→ wrangler secret put ${name}`);
  const result = spawnSync('npx', ['wrangler', 'secret', 'put', name], {
    cwd: root,
    input: value,
    stdio: ['pipe', 'inherit', 'inherit'],
    env: process.env,
  });
  if (result.status !== 0) {
    console.error(`Failed to set ${name}`);
    process.exit(result.status || 1);
  }
}

console.log('Setting Razorpay secrets on Cloudflare Worker (yasvik-app-api)…');
putSecret('RAZORPAY_KEY_ID', keyId);
putSecret('RAZORPAY_KEY_SECRET', keySecret);
if (webhookSecret) {
  putSecret('RAZORPAY_WEBHOOK_SECRET', webhookSecret);
} else {
  console.log('\nTip: set RAZORPAY_WEBHOOK_SECRET for payment webhooks (Razorpay Dashboard → Webhooks).');
}
console.log('Webhook URL (after deploy): https://www.yasvik.com/api/webhooks/razorpay');
console.log('Subscribe to: payment.captured, order.paid\n');
console.log('✓ Secrets saved. Deploy worker: npx wrangler deploy\n');
