#!/usr/bin/env node
/**
 * Yasvik public media CDN (Cloudflare R2 + media.yasvik.com)
 *
 * Prerequisites (Cloudflare Dashboard — one-time):
 *   1. R2 → Overview → Enable R2 (may require billing method)
 *   2. After enable, run: npm run setup:r2-media
 *
 * Custom domain (Dashboard after bucket exists):
 *   R2 → your bucket → Settings → Custom Domains → Connect Domain → media.yasvik.com
 *   Cloudflare auto-creates the DNS record when yasvik.com is on the same account.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const BUCKET = process.env.YASVIK_R2_BUCKET || 'yasvik-media';
const MEDIA_DOMAIN = process.env.YASVIK_MEDIA_DOMAIN || 'media.yasvik.com';
const ACCOUNT_ID = '41871e772a12ed19e7353a9c071aa5f0';

function run(cmd, { ignoreError = false } = {}) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (error) {
    if (ignoreError) return error.stderr || error.stdout || '';
    throw error;
  }
}

function wrangler(args) {
  return run(`npx wrangler ${args}`, { ignoreError: true });
}

console.log('\n=== Yasvik R2 media setup ===\n');
console.log(`Account: ${ACCOUNT_ID}`);
console.log(`Bucket:  ${BUCKET}`);
console.log(`Domain:  https://${MEDIA_DOMAIN}\n`);

const whoami = wrangler('whoami');
if (!/logged in/i.test(whoami)) {
  console.error('Run: npx wrangler login');
  process.exit(1);
}

const buckets = wrangler('r2 bucket list');
if (/enable R2 through the Cloudflare Dashboard/i.test(buckets)) {
  console.log('R2 is NOT enabled on this Cloudflare account yet.\n');
  console.log('Do this first:');
  console.log('  1. Open https://dash.cloudflare.com → R2 Object Storage');
  console.log('  2. Click "Purchase R2 Plan" / "Enable R2" (free tier covers early usage)');
  console.log('  3. Re-run: npm run setup:r2-media\n');
  console.log('Until then:');
  console.log('  • https://media.yasvik.com will not resolve (NXDOMAIN)');
  console.log('  • Existing Supabase image URLs on the site still work');
  console.log('  • New R2 relative paths will fail until the bucket + domain are live\n');
  process.exit(0);
}

if (!buckets.includes(BUCKET)) {
  console.log(`Creating bucket "${BUCKET}"…`);
  const created = wrangler(`r2 bucket create ${BUCKET}`);
  if (/ERROR/i.test(created) && !/already exists/i.test(created)) {
    console.error(created);
    process.exit(1);
  }
  console.log('Bucket created.\n');
} else {
  console.log(`Bucket "${BUCKET}" already exists.\n`);
}

console.log('── Connect custom domain (required for media.yasvik.com) ──\n');
console.log('In Cloudflare Dashboard:');
console.log(`  R2 → ${BUCKET} → Settings → Custom Domains → Connect Domain`);
console.log(`  Enter: ${MEDIA_DOMAIN}`);
console.log('  (DNS is added automatically if yasvik.com uses Cloudflare DNS)\n');

console.log('── Upload hero assets (after domain is connected) ──\n');
const heroFiles = [
  ['public/media/hero/yasvik-hero-poster.webp', 'hero/yasvik-hero-poster.webp'],
  ['public/media/hero/yasvik-hero-desktop.mp4', 'hero/yasvik-hero-desktop.mp4'],
  ['public/media/hero/yasvik-hero-mobile.mp4', 'hero/yasvik-hero-mobile.mp4'],
];

for (const [local, key] of heroFiles) {
  const full = path.join(ROOT, local);
  const exists = fs.existsSync(full);
  console.log(`  ${exists ? '✓' : '○'} ${key}${exists ? '' : ' (local file not found — upload manually)'}`);
  if (exists) {
    console.log(`      npx wrangler r2 object put ${BUCKET}/${key} --file="${full}" --remote`);
  }
}

console.log('\n── Cloudflare Pages env var ──\n');
console.log('  VITE_MEDIA_BASE_URL=https://' + MEDIA_DOMAIN);
console.log('  (Redeploy Pages after setting)\n');

console.log('── Verify ──\n');
console.log(`  curl -I https://${MEDIA_DOMAIN}/hero/yasvik-hero-poster.webp\n`);
