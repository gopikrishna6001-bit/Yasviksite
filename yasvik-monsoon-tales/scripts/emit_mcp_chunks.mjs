#!/usr/bin/env node
/**
 * Executes all catalog chunks via Supabase MCP execute_sql using stdio JSON lines.
 * Each line: {"chunk":N,"project_id":"...","query":"..."}
 * Parent agent should read stdout lines and call execute_sql per chunk.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const handoff = path.join(root, 'import-preview', '.handoff');

for (let i = 0; i < 8; i++) {
  const args = JSON.parse(fs.readFileSync(path.join(handoff, `chunk_${i}.args.json`), 'utf8'));
  process.stdout.write(JSON.stringify({ chunk: i, ...args }) + '\n');
}
