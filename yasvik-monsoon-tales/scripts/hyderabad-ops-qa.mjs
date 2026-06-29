#!/usr/bin/env node
/**
 * Hyderabad ops platform readiness checks (no live payment).
 * Run: node scripts/hyderabad-ops-qa.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const checks = [];

function pass(msg) { checks.push({ ok: true, msg }); }
function fail(msg) { checks.push({ ok: false, msg }); }

const migrationPath = join(root, '..', 'supabase', 'migrations', '006_hyderabad_ops.sql');
if (existsSync(migrationPath)) {
  const sql = readFileSync(migrationPath, 'utf8');
  for (const table of ['delivery_zones', 'stock_movements']) {
    if (sql.includes(table)) pass(`Migration defines ${table}`);
    else fail(`Migration missing ${table}`);
  }
  for (const col of ['amount_paise', 'order_channel', 'address_snapshot']) {
    if (sql.includes(col)) pass(`Migration adds orders.${col}`);
    else fail(`Migration missing orders.${col}`);
  }
} else {
  fail('Migration 006_hyderabad_ops.sql not found');
}

const workerPath = join(root, 'cloudflare', 'worker.js');
const worker = readFileSync(workerPath, 'utf8');
for (const fn of ['razorpayCreateOrder', 'razorpayVerifyPayment', 'createPosSale', 'deductInventory', 'validateDeliveryPincode']) {
  if (worker.includes(fn)) pass(`Worker implements ${fn}`);
  else fail(`Worker missing ${fn}`);
}
if (worker.includes('db_order_id: dbOrder.id')) pass('Worker returns real db_order_id');
else fail('Worker still returns null db_order_id');

const appJsx = readFileSync(join(root, 'src', 'App.jsx'), 'utf8');
if (appJsx.includes('AdminPOS') && appJsx.includes('path="pos"')) pass('Admin POS route registered');
else fail('Admin POS route missing');

const checkout = readFileSync(join(root, 'src', 'pages', 'CheckoutSummary.jsx'), 'utf8');
if (checkout.includes('lookupDeliveryZone') && (checkout.includes('deliveryFeePaise') || checkout.includes('delivery_fee_paise'))) pass('Checkout uses delivery zones');
else fail('Checkout delivery integration incomplete');

const drawer = readFileSync(join(root, 'src', 'components', 'admin', 'OrderDetailDrawer.jsx'), 'utf8');
if (drawer.includes('rider_name') && drawer.includes('WhatsApp')) pass('OrderDetailDrawer delivery ops');
else fail('OrderDetailDrawer delivery ops incomplete');

const failed = checks.filter(c => !c.ok);
checks.forEach(c => console.log(c.ok ? `✓ ${c.msg}` : `✗ ${c.msg}`));
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
process.exit(failed.length ? 1 : 0);
