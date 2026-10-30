#!/usr/bin/env node
/**
 * Ensures deploy won't ship a build where missing JS chunks SPA-fallback to index.html.
 * Usage:
 *   node scripts/verify-pages-asset-routing.mjs
 *   node scripts/verify-pages-asset-routing.mjs https://yasvik.pages.dev
 */
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets404 = resolve(root, 'dist/assets/404.html');

if (!existsSync(assets404)) {
  console.error('[verify-pages] Missing dist/assets/404.html');
  console.error('[verify-pages] Add public/assets/404.html so Cloudflare returns 404 for missing bundles.');
  process.exit(1);
}

console.log('[verify-pages] dist/assets/404.html present');

const baseUrl = String(process.argv[2] || process.env.VERIFY_PAGES_URL || '').trim();
if (!baseUrl) {
  console.log('[verify-pages] Skipping live URL check (pass deploy URL as argv[1] to verify production).');
  process.exit(0);
}

const probeUrl = `${baseUrl.replace(/\/$/, '')}/assets/yasvik-missing-chunk-probe-${Date.now()}.js`;
const response = await fetch(probeUrl, { redirect: 'follow' });
const contentType = String(response.headers.get('content-type') || '').toLowerCase();
const body = await response.text();
const looksLikeSpaShell = body.includes('id="root"') && body.includes('yasvik-chunk-recovery');

if (response.status === 404) {
  console.log(`[verify-pages] Live probe OK: ${probeUrl} → 404`);
  process.exit(0);
}

if (response.status === 200 && looksLikeSpaShell) {
  console.error(`[verify-pages] FAIL: ${probeUrl} returned index.html (blank-screen risk after deploys)`);
  process.exit(1);
}

if (response.status === 200 && contentType.includes('text/html')) {
  console.error(`[verify-pages] FAIL: ${probeUrl} returned HTML with status 200`);
  process.exit(1);
}

console.warn(`[verify-pages] Unexpected probe result: status=${response.status} type=${contentType}`);
process.exit(0);
