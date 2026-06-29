#!/usr/bin/env node
/**
 * Prints one line: chunk index and MCP execute_sql args as JSON.
 * Usage: node scripts/print_mcp_chunk.mjs 0 | ...
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const idx = Number(process.argv[2] ?? 0);
const argsPath = path.join(root, 'import-preview', '.handoff', `chunk_${idx}.args.json`);
const args = JSON.parse(fs.readFileSync(argsPath, 'utf8'));
process.stdout.write(JSON.stringify({ chunk: idx, ...args }));
