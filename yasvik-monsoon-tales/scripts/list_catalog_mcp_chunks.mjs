/**
 * Imports catalog SQL chunks through Supabase MCP-compatible SQL execution.
 * Reads chunk files and prints instructions; actual execution uses Cursor Supabase MCP.
 *
 * Prefer: ask Cursor agent to run all mcp_chunk_*.sql via Supabase execute_sql.
 */
import fs from 'node:fs/promises';

const dir = new URL('../import-preview/', import.meta.url);
const files = (await fs.readdir(dir))
  .filter((name) => name.startsWith('mcp_chunk_') && name.endsWith('.sql'))
  .sort();

console.log(`Found ${files.length} SQL chunks to import.`);
for (const file of files) {
  const stat = await fs.stat(new URL(file, dir));
  console.log(`- ${file} (${(stat.size / 1024).toFixed(1)} KB)`);
}
