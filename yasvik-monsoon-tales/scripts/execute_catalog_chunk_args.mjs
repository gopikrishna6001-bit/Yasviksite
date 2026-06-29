#!/usr/bin/env node
/**
 * Outputs MCP execute_sql arguments JSON for a chunk index.
 * Usage: node scripts/execute_catalog_chunk_args.mjs 0
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const idx = Number(process.argv[2] ?? 0);
const payloadPath = path.join(root, 'import-preview', 'mcp_payloads', `chunk_${idx}.json`);

if (!fs.existsSync(payloadPath)) {
  console.error(`Missing ${payloadPath}`);
  process.exit(1);
}

const { query } = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));
process.stdout.write(JSON.stringify({ project_id: 'cpksnpuavywbmhrzglyh', query }));
