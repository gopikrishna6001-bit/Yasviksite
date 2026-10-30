#!/usr/bin/env node
/**
 * Upload local files to Yasvik R2 (media.yasvik.com).
 *
 * Usage:
 *   node scripts/media/publish-to-r2.mjs --file ./path.webp --folder hero --name yasvik-home-hero-desktop
 *   node scripts/media/publish-to-r2.mjs --dir ./media-inbox/products --folder products
 *
 * Requires: wrangler logged in (`npx wrangler whoami`)
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const R2_BUCKET = 'yasvik-media';
const MEDIA_BASE = 'https://media.yasvik.com';

function parseArgs(argv) {
  const opts = { file: '', dir: '', folder: 'general', name: '' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--file') opts.file = argv[++i] || '';
    else if (arg === '--dir') opts.dir = argv[++i] || '';
    else if (arg === '--folder') opts.folder = argv[++i] || 'general';
    else if (arg === '--name') opts.name = argv[++i] || '';
  }
  return opts;
}

function slugify(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'yasvik-asset';
}

function extFor(filePath) {
  const ext = path.extname(filePath).replace(/^\./, '').toLowerCase();
  return ext || 'webp';
}

function wranglerPut(objectKey, filePath) {
  execSync(
    `npx wrangler r2 object put ${R2_BUCKET}/${objectKey} --file=${JSON.stringify(filePath)} --remote --content-type=${JSON.stringify(guessMime(filePath))}`,
    { cwd: ROOT, stdio: 'inherit' },
  );
}

function guessMime(filePath) {
  const ext = extFor(filePath);
  const map = {
    webp: 'image/webp',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    svg: 'image/svg+xml',
    mp4: 'video/mp4',
  };
  return map[ext] || 'application/octet-stream';
}

function publishFile(filePath, folder, name = '') {
  const stem = slugify(name || path.basename(filePath, path.extname(filePath)));
  const objectKey = `media-assets/${folder}/${stem}.${extFor(filePath)}`;
  wranglerPut(objectKey, filePath);
  const url = `${MEDIA_BASE}/${objectKey}`;
  return { objectKey, url };
}

function listFiles(dirPath) {
  return fs
    .readdirSync(dirPath)
    .filter((f) => !f.startsWith('.'))
    .map((f) => path.join(dirPath, f))
    .filter((f) => fs.statSync(f).isFile());
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const results = [];

  if (opts.file) {
    if (!fs.existsSync(opts.file)) {
      console.error(`File not found: ${opts.file}`);
      process.exit(1);
    }
    results.push(publishFile(opts.file, opts.folder, opts.name));
  } else if (opts.dir) {
    if (!fs.existsSync(opts.dir)) {
      console.error(`Directory not found: ${opts.dir}`);
      process.exit(1);
    }
    for (const filePath of listFiles(opts.dir)) {
      const base = path.basename(filePath, path.extname(filePath));
      results.push(publishFile(filePath, opts.folder, base));
    }
  } else {
    console.error('Pass --file or --dir');
    process.exit(1);
  }

  console.log('\nPublished:');
  for (const row of results) {
    console.log(`  ${row.url}`);
  }
}

main();
