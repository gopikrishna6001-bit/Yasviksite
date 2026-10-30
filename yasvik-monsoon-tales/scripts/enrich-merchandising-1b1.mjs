/**
 * Enrich Phase 1A audit run with Phase 1B1 identity + scorecards + demand.
 * Does NOT write products.merchandising_tier or collection memberships.
 *
 * Usage:
 *   node --env-file=.env.local scripts/enrich-merchandising-1b1.mjs
 *   node --env-file=.env.local scripts/enrich-merchandising-1b1.mjs --run=<uuid>
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PHASE_1B1_AUDIT_RUN_ID,
  assessProductIdentity,
  buildReadinessScorecard,
  classifyHiddenReason,
  classifyPendingGroup,
  specialOilRecommendation,
  recommendedForPhase1b2,
  scorecardToCsv,
} from '../src/lib/merchandisingReview1b1.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const url = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const runArg = process.argv.find((a) => a.startsWith('--run='));
const AUDIT_RUN_ID = runArg ? runArg.slice(6) : PHASE_1B1_AUDIT_RUN_ID;

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

async function rest(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${typeof data === 'object' ? JSON.stringify(data) : text}`);
  return data;
}

async function fetchDemandByProduct(productIds) {
  if (!productIds.length) return {};
  // Pull recent orders and aggregate client-side (service role)
  const orders = [];
  let from = 0;
  const page = 500;
  for (;;) {
    const chunk = await rest(`orders?select=id,order_channel,created_at,customer_phone,guest_phone,user_id,items_snapshot&order=created_at.desc&offset=${from}&limit=${page}`);
    orders.push(...(chunk || []));
    if (!chunk?.length || chunk.length < page) break;
    from += page;
    if (from > 5000) break;
  }

  const idSet = new Set(productIds);
  const map = {};
  for (const id of productIds) {
    map[id] = {
      orders: 0,
      units: 0,
      revenue_rs: 0,
      unique_customers: 0,
      repeat_customers: 0,
      last_sold: null,
      web_units: 0,
      pos_units: 0,
      avg_qty_per_order: null,
      customers: new Map(),
      orderIds: new Set(),
      data_status: 'ok',
    };
  }

  for (const o of orders) {
    const items = Array.isArray(o.items_snapshot) ? o.items_snapshot : [];
    const customerKey = o.customer_phone || o.guest_phone || o.user_id || o.id;
    for (const item of items) {
      const pid = item.product_id;
      if (!pid || !idSet.has(pid)) continue;
      const row = map[pid];
      const qty = Number(item.quantity ?? item.qty ?? 1) || 1;
      let paise = Number(item.line_total_paise ?? item.total_paise ?? 0);
      if (!paise && item.price_paise != null) paise = Number(item.price_paise) * qty;
      if (!paise && item.price != null) paise = Number(item.price) * 100 * qty;
      row.units += qty;
      row.revenue_rs += paise / 100;
      row.orderIds.add(o.id);
      if (!row.customers.has(customerKey)) row.customers.set(customerKey, 0);
      row.customers.set(customerKey, row.customers.get(customerKey) + 1);
      if (o.order_channel === 'web') row.web_units += qty;
      if (o.order_channel === 'pos') row.pos_units += qty;
      if (!row.last_sold || o.created_at > row.last_sold) row.last_sold = o.created_at;
    }
  }

  for (const id of Object.keys(map)) {
    const row = map[id];
    row.orders = row.orderIds.size;
    row.unique_customers = row.customers.size;
    row.repeat_customers = [...row.customers.values()].filter((n) => n > 1).length;
    row.avg_qty_per_order = row.orders ? Math.round((row.units / row.orders) * 100) / 100 : null;
    row.revenue_rs = Math.round(row.revenue_rs * 100) / 100;
    row.units = Math.round(row.units * 100) / 100;
    if (!row.orders) row.data_status = 'no_sales_in_available_history';
    delete row.customers;
    delete row.orderIds;
  }
  return map;
}

async function main() {
  const proposals = await rest(
    `merchandising_product_proposals?audit_run_id=eq.${AUDIT_RUN_ID}&select=*&order=proposed_tier.asc`,
  );
  const productIds = [...new Set(proposals.map((p) => p.product_id).filter(Boolean))];
  const products = [];
  for (let i = 0; i < productIds.length; i += 80) {
    const slice = productIds.slice(i, i + 80);
    const chunk = await rest(`products?id=in.(${slice.join(',')})&select=*`);
    products.push(...(chunk || []));
  }
  const byId = Object.fromEntries(products.map((p) => [p.id, p]));

  const aliases = await rest('product_slug_aliases?select=*');
  const aliasesByProduct = {};
  for (const a of aliases || []) {
    if (!aliasesByProduct[a.product_id]) aliasesByProduct[a.product_id] = [];
    aliasesByProduct[a.product_id].push(a);
  }

  const demandMap = await fetchDemandByProduct(productIds);

  let updated = 0;
  const enriched = [];
  for (const proposal of proposals) {
    const product = proposal.product_id ? byId[proposal.product_id] : null;
    const identity = assessProductIdentity(product, { aliases: aliasesByProduct[proposal.product_id] || [] });
    const demand = proposal.product_id ? demandMap[proposal.product_id] : null;
    const scorecard = buildReadinessScorecard(product, {
      ownerInputs: proposal.owner_inputs || {},
      demand,
      identity,
      proposal,
    });

    const patch = {
      identity_assessment: identity,
      readiness_scorecard: scorecard,
      demand_snapshot: demand || {},
      review_phase: '1b1',
      report_flags: {
        ...(proposal.report_flags || {}),
        identity_conflict: Boolean(identity.has_conflict),
        margin_unknown: Boolean(scorecard.flags?.margin_unknown),
        supply_unknown: Boolean(scorecard.flags?.supply_unknown),
        high_delivery_burden: Boolean(scorecard.flags?.high_delivery_burden),
        content_incomplete: Boolean(scorecard.flags?.content_incomplete),
        strategic_hero_margin_concern: Boolean(scorecard.flags?.strategic_hero_margin_concern),
      },
      updated_at: new Date().toISOString(),
    };

    if (proposal.proposed_tier === 'hidden') {
      patch.hidden_reason_code = classifyHiddenReason(product, proposal);
    }
    if (proposal.proposed_tier == null || proposal.match_status === 'special_review') {
      patch.pending_reason_group = classifyPendingGroup(product, proposal);
    }
    if (proposal.report_flags?.special_oil || proposal.match_status === 'special_review') {
      const rec = specialOilRecommendation(product);
      patch.special_oil_recommendation = rec.recommended_location;
      patch.identity_assessment = {
        ...identity,
        special_oil: rec,
      };
    }

    await rest(`merchandising_product_proposals?id=eq.${proposal.id}`, {
      method: 'PATCH',
      body: patch,
    });
    updated += 1;
    enriched.push({
      ...proposal,
      ...patch,
      product: product ? { id: product.id, name: product.name, slug: product.slug, price: product.price, is_published: product.is_published, sell_online: product.sell_online } : null,
    });
  }

  // Guardrails
  const tiered = await rest('products?merchandising_tier=not.is.null&select=id&limit=5');
  const items = await rest('merchandising_collection_items?select=id&limit=5');
  if ((tiered || []).length || (items || []).length) {
    console.error('REGRESSION: active tiers or memberships present');
    process.exit(2);
  }

  const outDir = join(__dirname, '../.review-screenshots/merchandising-1b1');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, `enriched-${AUDIT_RUN_ID}.json`), JSON.stringify({ audit_run_id: AUDIT_RUN_ID, updated, rows: enriched }, null, 2));
  writeFileSync(join(outDir, `scorecard-${AUDIT_RUN_ID}.csv`), scorecardToCsv(enriched));
  writeFileSync(join(outDir, 'phase1b2-recommended-empty.json'), JSON.stringify({
    note: 'Empty until owner decisions are recorded. Phase 1B2 must not start yet.',
    recommended: recommendedForPhase1b2(enriched),
  }, null, 2));

  const summary = {
    ok: true,
    audit_run_id: AUDIT_RUN_ID,
    updated,
    identity_conflicts: enriched.filter((r) => r.identity_assessment?.has_conflict).length,
    hero: enriched.filter((r) => r.proposed_tier === 'hero').length,
    core: enriched.filter((r) => r.proposed_tier === 'core').length,
    hidden: enriched.filter((r) => r.proposed_tier === 'hidden').length,
    pending_null: enriched.filter((r) => r.proposed_tier == null).length,
    margin_unknown: enriched.filter((r) => r.readiness_scorecard?.flags?.margin_unknown).length,
    active_tiers_written: 0,
    collection_memberships_written: 0,
  };
  writeFileSync(join(outDir, 'enrichment-summary.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
