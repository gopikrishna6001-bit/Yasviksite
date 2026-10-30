#!/usr/bin/env node
/**
 * Deploy Cloudflare Worker API.
 * Usage: node scripts/deploy-worker.mjs
 */
import { spawnSync } from 'node:child_process';
import { existsSync, renameSync, copyFileSync, unlinkSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workerToml = resolve(root, 'wrangler.toml');
const workerBackup = resolve(root, 'wrangler.toml.pages.bak');
const apiToml = resolve(root, 'wrangler.worker.toml');

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...opts,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (!existsSync(apiToml)) {
  console.error('Missing wrangler.worker.toml');
  process.exit(1);
}

let restored = false;
function restorePagesToml() {
  if (restored) return;
  restored = true;
  if (existsSync(workerBackup)) {
    if (existsSync(workerToml)) unlinkSync(workerToml);
    renameSync(workerBackup, workerToml);
  }
}

process.on('SIGINT', () => { restorePagesToml(); process.exit(130); });
process.on('SIGTERM', () => { restorePagesToml(); process.exit(143); });

try {
  if (existsSync(workerToml)) {
    renameSync(workerToml, workerBackup);
  }
  copyFileSync(apiToml, workerToml);
  run('npx', ['wrangler', 'deploy']);
} finally {
  restorePagesToml();
}

console.log('Worker deploy complete.');
