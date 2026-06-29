#!/usr/bin/env node
/**
 * Mirror public Supabase storage objects to R2 (no DB password required).
 * Run: node scripts/mirror_public_storage_to_r2.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'yasvik-r2-'));
const SUPABASE = 'https://cpksnpuavywbmhrzglyh.supabase.co';
const R2_BUCKET = 'yasvik-media';

const objects = JSON.parse(fs.readFileSync(path.join(__dirname, 'mirror-objects.json'), 'utf8'));

function publicUrl(bucket, name) {
  const segments = [bucket, ...name.split('/')].map((s) => encodeURIComponent(s));
  return `${SUPABASE}/storage/v1/object/public/${segments.join('/')}`;
}

function wranglerPut(key, file) {
  execSync(`npx wrangler r2 object put ${R2_BUCKET}/${key} --file=${JSON.stringify(file)} --remote`, {
    cwd: ROOT,
    stdio: 'pipe',
  });
}

async function existsOnR2(key) {
  const url = `https://media.yasvik.com/${key.split('/').map((s) => encodeURIComponent(s)).join('/')}`;
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  let ok = 0;
  let skip = 0;
  let fail = 0;
  for (const { bucket_id, name } of objects) {
    const key = `${bucket_id}/${name}`;
    if (await existsOnR2(key)) {
      skip += 1;
      if ((ok + skip) % 10 === 0) console.log(`  … ${ok + skip}/${objects.length} (${ok} new, ${skip} skipped)`);
      continue;
    }
    const url = publicUrl(bucket_id, name);
    const safe = key.replace(/[/\\]/g, '__');
    const tmp = path.join(TMP, safe);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(tmp, buf);
      wranglerPut(key, tmp);
      ok += 1;
      if ((ok + skip) % 10 === 0) console.log(`  … ${ok + skip}/${objects.length} (${ok} new, ${skip} skipped)`);
    } catch (err) {
      fail += 1;
      console.warn(`skip ${key}: ${err.message}`);
    }
  }
  console.log(`Done: ${ok} copied, ${skip} already on R2, ${fail} failed`);
  fs.rmSync(TMP, { recursive: true, force: true });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
