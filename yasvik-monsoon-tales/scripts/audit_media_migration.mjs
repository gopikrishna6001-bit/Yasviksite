#!/usr/bin/env node
/**
 * Non-blocking audit: surfaces remaining Supabase media URLs and raw <img> usage.
 * Does not fail the build.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

const SUPABASE_MEDIA_RE = /supabase\.co\/storage\/v1\/(object|render)\//gi;
const HARDCODED_MEDIA_RE = /https?:\/\/[^\s'"`]+\.(?:webp|jpg|jpeg|png|gif|mp4|webm|mov)/gi;
const RAW_IMG_SRC_RE = /<img\s+[^>]*src=\{([^}]+)\}/g;
const MEDIA_FIELD_RE = /(hero_image|image_url|cover_image|portrait_image|featured_image_url|media_url|image_urls)/;

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      walk(full, files);
    } else if (/\.(jsx?|tsx?)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

function rel(file) {
  return path.relative(ROOT, file);
}

const files = walk(SRC);
const report = {
  supabaseUrlsInSource: [],
  hardcodedMediaUrls: [],
  rawImgWithoutSafeMedia: [],
  largeLocalVideos: [],
  usesMediaUrlHelper: [],
};

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const fileRel = rel(file);

  if (text.includes('safeMedia') || text.includes('optimizeMediaUrl') || text.includes('OptimizedImage') || text.includes("from '@/lib/media'") || text.includes('mediaUrl(')) {
    report.usesMediaUrlHelper.push(fileRel);
  }

  const supabaseMatches = text.match(SUPABASE_MEDIA_RE);
  if (supabaseMatches?.length) {
    report.supabaseUrlsInSource.push({ file: fileRel, count: supabaseMatches.length });
  }

  const hardcoded = [...new Set(text.match(HARDCODED_MEDIA_RE) || [])];
  if (hardcoded.length) {
    report.hardcodedMediaUrls.push({ file: fileRel, urls: hardcoded.slice(0, 5) });
  }

  let match;
  while ((match = RAW_IMG_SRC_RE.exec(text)) !== null) {
    const expr = match[1].trim();
    if (
      expr.includes('safeMedia(') ||
      expr.includes('optimizeMediaUrl(') ||
      expr.includes('mediaUrl(') ||
      expr.includes('getAssetUrl(') ||
      expr.includes('buildResponsiveImage')
    ) {
      continue;
    }
    report.rawImgWithoutSafeMedia.push({ file: fileRel, expr });
  }
}

const publicDir = path.join(ROOT, 'public');
if (fs.existsSync(publicDir)) {
  for (const entry of fs.readdirSync(publicDir, { withFileTypes: true })) {
    if (entry.isFile() && /\.(mp4|webm|mov)$/i.test(entry.name)) {
      const stat = fs.statSync(path.join(publicDir, entry.name));
      if (stat.size > 2 * 1024 * 1024) {
        report.largeLocalVideos.push({ file: `public/${entry.name}`, sizeMb: (stat.size / (1024 * 1024)).toFixed(1) });
      }
    }
  }
}

console.log('\n=== Yasvik media migration audit (non-blocking) ===\n');
console.log(`Files using media helpers: ${report.usesMediaUrlHelper.length}`);
console.log(`Files with Supabase storage URL strings: ${report.supabaseUrlsInSource.length}`);
console.log(`Raw <img src={...}> without mediaUrl/safeMedia: ${report.rawImgWithoutSafeMedia.length}`);
console.log(`Files with hardcoded external media URLs: ${report.hardcodedMediaUrls.length}`);
console.log(`Large local videos in public/: ${report.largeLocalVideos.length}`);

if (report.supabaseUrlsInSource.length) {
  console.log('\n— Supabase URL references in source (expected during migration) —');
  for (const row of report.supabaseUrlsInSource.slice(0, 15)) {
    console.log(`  ${row.file} (${row.count})`);
  }
}

if (report.rawImgWithoutSafeMedia.length) {
  console.log('\n— Raw image src expressions to migrate —');
  for (const row of report.rawImgWithoutSafeMedia.slice(0, 20)) {
    console.log(`  ${row.file}: src={${row.expr}}`);
  }
  if (report.rawImgWithoutSafeMedia.length > 20) {
    console.log(`  … and ${report.rawImgWithoutSafeMedia.length - 20} more`);
  }
}

if (report.hardcodedMediaUrls.length) {
  console.log('\n— Hardcoded media URLs —');
  for (const row of report.hardcodedMediaUrls.slice(0, 10)) {
    console.log(`  ${row.file}: ${row.urls.join(', ')}`);
  }
}

if (report.largeLocalVideos.length) {
  console.log('\n— Large local videos (consider R2) —');
  for (const row of report.largeLocalVideos) {
    console.log(`  ${row.file} (${row.sizeMb} MB)`);
  }
}

console.log('\nAudit complete. No build failure.\n');
