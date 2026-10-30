/**
 * Generate a Phase 1A merchandising audit run and persist proposals.
 * Does NOT write products.merchandising_tier or collection memberships.
 *
 * Usage:
 *   node --env-file=.env.local scripts/generate-merchandising-audit.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const {
  GENERATION_VERSION,
  PROPOSAL_RULE_VERSION,
  buildMerchandisingProposals,
  proposalsToPersistRows,
} = await import('../src/lib/merchandisingAudit.js');

const url = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

async function rest(path, { method = 'GET', body, prefer } = {}) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: { ...headers, ...(prefer ? { Prefer: prefer } : {}) },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const msg = typeof data === 'object' ? (data.message || data.error || JSON.stringify(data)) : text;
    throw new Error(`${method} ${path} → ${res.status}: ${msg}`);
  }
  return data;
}

async function fetchAllProducts() {
  const pageSize = 200;
  let from = 0;
  const all = [];
  for (;;) {
    const to = from + pageSize - 1;
    const res = await fetch(
      `${url}/rest/v1/products?select=*&order=name.asc&offset=${from}&limit=${pageSize}`,
      { headers: { ...headers, Range: `${from}-${to}` } },
    );
    const text = await res.text();
    const data = text ? JSON.parse(text) : [];
    if (!res.ok) throw new Error(`products fetch ${res.status}: ${text}`);
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

async function main() {
  const products = await fetchAllProducts();
  const collections = await rest('merchandising_collections?select=id,slug,title&order=display_priority.asc');
  const collectionsBySlug = Object.fromEntries((collections || []).map((c) => [c.slug, c]));

  if (!collectionsBySlug['from-seed-to-oil']) {
    throw new Error('Missing seeded merchandising collections — run schema migration first.');
  }

  const { proposals, resolution, summary } = buildMerchandisingProposals({
    products,
    collectionsBySlug,
  });

  const auditRun = await rest('merchandising_audit_runs', {
    method: 'POST',
    body: {
      generation_version: GENERATION_VERSION,
      proposal_rule_version: PROPOSAL_RULE_VERSION,
      catalogue_snapshot_ref: `products:${products.length}`,
      notes: 'Phase 1A dry-run — proposals only; no active tier writes.',
    },
  });
  const run = Array.isArray(auditRun) ? auditRun[0] : auditRun;

  const rows = proposalsToPersistRows(proposals, run.id);
  // Insert in chunks
  const chunkSize = 80;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    await rest('merchandising_product_proposals', { method: 'POST', body: chunk });
    inserted += chunk.length;
  }

  const outDir = join(__dirname, '../.review-screenshots/merchandising-1a');
  mkdirSync(outDir, { recursive: true });
  const report = {
    audit_run_id: run.id,
    generated_at: run.generated_at,
    generation_version: GENERATION_VERSION,
    proposal_rule_version: PROPOSAL_RULE_VERSION,
    summary,
    resolution,
    note: 'Active products.merchandising_tier remains NULL. No collection_items inserted.',
  };
  writeFileSync(join(outDir, `audit-run-${run.id}.json`), JSON.stringify(report, null, 2));
  writeFileSync(join(outDir, 'latest-resolution.json'), JSON.stringify({ resolution, summary }, null, 2));

  // Verify no product tiers applied
  const tiered = await rest('products?merchandising_tier=not.is.null&select=id&limit=5');
  if (Array.isArray(tiered) && tiered.length) {
    console.error('REGRESSION: products have non-null merchandising_tier after dry-run!');
    process.exit(2);
  }

  const memberships = await rest('merchandising_collection_items?select=id&limit=5');
  if (Array.isArray(memberships) && memberships.length) {
    console.error('REGRESSION: collection memberships were inserted in Phase 1A!');
    process.exit(2);
  }

  console.log(JSON.stringify({
    ok: true,
    audit_run_id: run.id,
    inserted,
    summary,
    unmatched: resolution.filter((r) => r.status === 'unmatched'),
    ambiguous: resolution.filter((r) => r.status === 'ambiguous'),
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
