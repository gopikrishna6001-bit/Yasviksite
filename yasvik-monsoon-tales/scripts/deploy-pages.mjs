#!/usr/bin/env node
/**
 * Deploy Cloudflare Pages without conflicting with wrangler.toml Worker config.
 * Usage: node scripts/deploy-pages.mjs
 */
import { spawnSync } from 'node:child_process';
import { existsSync, renameSync, copyFileSync, unlinkSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workerToml = resolve(root, 'wrangler.toml');
const workerBackup = resolve(root, 'wrangler.toml.worker.bak');
const pagesToml = resolve(root, 'wrangler.pages.toml');

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...opts,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (!existsSync(pagesToml)) {
  console.error('Missing wrangler.pages.toml');
  process.exit(1);
}

let restored = false;
function restoreWorkerToml() {
  if (restored) return;
  restored = true;
  if (existsSync(workerBackup)) {
    if (existsSync(workerToml)) unlinkSync(workerToml);
    renameSync(workerBackup, workerToml);
  }
}

process.on('SIGINT', () => { restoreWorkerToml(); process.exit(130); });
process.on('SIGTERM', () => { restoreWorkerToml(); process.exit(143); });

try {
  if (existsSync(workerToml)) {
    renameSync(workerToml, workerBackup);
  }
  copyFileSync(pagesToml, workerToml);

  const distDir = resolve(root, 'dist');
  if (existsSync(distDir)) rmSync(distDir, { recursive: true, force: true });

  run('npm', ['run', 'build']);
  run('node', ['scripts/verify-pages-asset-routing.mjs']);

  const deploy = spawnSync(
    'npx',
    [
      'wrangler', 'pages', 'deploy', 'dist',
      '--project-name=yasvik',
      '--commit-dirty=true',
      '--branch=main',
    ],
    { cwd: root, encoding: 'utf8', shell: process.platform === 'win32' },
  );
  if (deploy.status !== 0) {
    if (deploy.stdout) process.stdout.write(deploy.stdout);
    if (deploy.stderr) process.stderr.write(deploy.stderr);
    process.exit(deploy.status ?? 1);
  }
  if (deploy.stdout) process.stdout.write(deploy.stdout);

  const deployUrlMatch = String(deploy.stdout || '').match(/https:\/\/[a-z0-9]+\.yasvik\.pages\.dev/i);
  const verifyUrl = deployUrlMatch?.[0] || 'https://yasvik.pages.dev';
  run('node', ['scripts/verify-pages-asset-routing.mjs', verifyUrl]);
} finally {
  restoreWorkerToml();
}

console.log('Pages deploy complete.');
