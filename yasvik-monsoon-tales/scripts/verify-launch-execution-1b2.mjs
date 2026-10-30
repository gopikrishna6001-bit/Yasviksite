/**
 * Phase 1B2 regression + signed before/after report.
 * Usage:
 *   node --env-file=.env.local scripts/verify-launch-execution-1b2.mjs
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '../.review-screenshots/launch-readiness');

const url = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const HERO_IDS = [
  '486919f8-f0e7-4911-8b8c-8471e6a6d795',
  '2f47f4cf-2002-4e8a-89ed-0400fc91a618',
  '4c4396d8-c1e4-4359-90fb-778105fd2c3f',
  '9bd19447-45d6-4c37-be1a-9849030365d0',
  '25873e11-436e-43e4-b2dd-acb9e1b9eb0e',
  '9153896a-27dd-47b9-a1a1-e608a8ef870a',
];
const HOLD_IDS = [
  '068c0cb6-8c29-4c53-a648-6bdc43cc0967',
  '20133192-15f7-43ba-b6af-944d3458bd8b',
];
const GONGURA_ID = 'f27b8b1f-553a-4a34-be5a-17da9dbbe16c';
const DAMPUDU_ID = '130cdfbf-ee5b-4650-bb24-09b17c162cad';

async function rest(path) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${path} → ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

function check(name, ok, detail = '') {
  return { name, ok, detail };
}

function grepStorefrontMerchConsumption() {
  const roots = [
    join(__dirname, '../src/pages'),
    join(__dirname, '../src/components'),
  ];
  const hits = [];
  const pattern = /merchandising_tier|merchandising_collection_items|show_in_yasvik_selection/;
  for (const root of roots) {
    if (!existsSync(root)) continue;
    const walk = (dir) => {
      for (const ent of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, ent.name);
        if (ent.isDirectory() && !ent.name.includes('admin')) walk(p);
        else if (ent.isFile() && /\.(jsx?|tsx?)$/.test(ent.name) && !p.includes('/admin/')) {
          const text = readFileSync(p, 'utf8');
          if (pattern.test(text)) hits.push(p.replace(join(__dirname, '..') + '/', ''));
        }
      }
    };
    walk(root);
  }
  return hits;
}

async function main() {
  if (!url || !key) {
    console.error('Missing Supabase env');
    process.exit(1);
  }

  const results = [];
  const idList = [...HERO_IDS, ...HOLD_IDS, GONGURA_ID, DAMPUDU_ID].join(',');

  const products = await rest(
    `products?id=in.(${idList})&select=id,name,slug,is_published,sell_online,price,discount_price,stock_quantity,shared_stock_kg,merchandising_tier,show_in_yasvik_selection,featured_image_url,seo_title,description,ingredients`
  );
  const byId = Object.fromEntries(products.map((p) => [p.id, p]));

  const aliases = await rest(
    `product_slug_aliases?or=(old_slug.eq.mixed-vegetable-pickle,old_slug.eq.mysore-malliga-l52dq)&select=old_slug,product_id`
  );
  const memberships = await rest(
    `merchandising_collection_items?product_id=in.(${HERO_IDS.join(',')})&select=*,collection:merchandising_collections(slug,title)`
  );
  const holdTiers = await rest(
    `products?id=in.(${HOLD_IDS.join(',')})&select=id,name,merchandising_tier`
  );
  const proposals = await rest(
    `merchandising_product_proposals?audit_run_id=eq.89da3a53-92a5-44e1-9fcc-5fe2ec7015eb&product_id=in.(${[...HERO_IDS, ...HOLD_IDS].join(',')})&select=product_id,owner_decision_status,owner_decision_action`
  );

  const gongura = byId[GONGURA_ID];
  const dampudu = byId[DAMPUDU_ID];

  results.push(check('Gongura slug canonical', gongura?.slug === 'gongura-pickle', gongura?.slug));
  results.push(check('Gongura unpublished', gongura?.is_published === false));
  results.push(check('Gongura no Mysore/mixed copy in description', !/mixed vegetable/i.test(gongura?.description || '')));
  results.push(check('Gongura ingredients set', Boolean(gongura?.ingredients)));
  results.push(check('Gongura hero not mixed-vegetable path', !/mixed-vegetable/i.test(gongura?.featured_image_url || '')));

  results.push(check('Dampudu slug canonical', dampudu?.slug === 'handpound-dampudu-biyyam', dampudu?.slug));
  results.push(check('Dampudu republished', dampudu?.is_published === true));
  results.push(check('Dampudu Mysore copy removed', !/mysore malliga|mysore mallige/i.test(dampudu?.description || '')));
  results.push(check('Dampudu hero present', Boolean(dampudu?.featured_image_url)));

  const aliasMap = Object.fromEntries(aliases.map((a) => [a.old_slug, a.product_id]));
  results.push(check('Alias mixed-vegetable-pickle → Gongura', aliasMap['mixed-vegetable-pickle'] === GONGURA_ID));
  results.push(check('Alias mysore-malliga-l52dq → Dampudu', aliasMap['mysore-malliga-l52dq'] === DAMPUDU_ID));

  for (const id of HERO_IDS) {
    const p = byId[id];
    results.push(check(`Hero tier ${p?.name}`, p?.merchandising_tier === 'hero', p?.merchandising_tier));
    results.push(check(`Selection flag off ${p?.name}`, p?.show_in_yasvik_selection === false));
  }
  for (const p of holdTiers) {
    results.push(check(`Hold tier null ${p.name}`, p.merchandising_tier == null, String(p.merchandising_tier)));
  }

  results.push(check('Collection memberships count = 6', memberships.length === 6, String(memberships.length)));
  const expectedCollections = {
    '486919f8-f0e7-4911-8b8c-8471e6a6d795': 'from-seed-to-oil',
    '2f47f4cf-2002-4e8a-89ed-0400fc91a618': 'from-seed-to-oil',
    '4c4396d8-c1e4-4359-90fb-778105fd2c3f': 'homemade-andhra-kitchen',
    '9bd19447-45d6-4c37-be1a-9849030365d0': 'heritage-and-natural-everyday-foods',
    '25873e11-436e-43e4-b2dd-acb9e1b9eb0e': 'heritage-and-natural-everyday-foods',
    '9153896a-27dd-47b9-a1a1-e608a8ef870a': 'heritage-and-natural-everyday-foods',
  };
  for (const m of memberships) {
    const exp = expectedCollections[m.product_id];
    results.push(check(
      `Membership ${m.collection?.slug}`,
      m.collection?.slug === exp && m.role === 'hero' && m.homepage_visible === false && m.selection_visible === false,
      `${m.collection?.slug} role=${m.role}`
    ));
  }

  for (const id of HERO_IDS) {
    const pr = proposals.find((r) => r.product_id === id);
    results.push(check(`Proposal approved ${id.slice(0, 8)}`, pr?.owner_decision_status === 'approved'));
  }
  for (const id of HOLD_IDS) {
    const pr = proposals.find((r) => r.product_id === id);
    results.push(check(`Proposal pending ${id.slice(0, 8)}`, pr?.owner_decision_status === 'pending'));
  }

  const storefrontHits = grepStorefrontMerchConsumption();
  results.push(check('No customer storefront merchandising consumption', storefrontHits.length === 0, storefrontHits.join(', ') || 'none'));

  const failed = results.filter((r) => !r.ok);
  const report = {
    generated_at: new Date().toISOString(),
    passed: results.filter((r) => r.ok).length,
    failed: failed.length,
    results,
    tier_writes: HERO_IDS.map((id) => ({ id, name: byId[id]?.name, tier: byId[id]?.merchandising_tier })),
    collection_memberships: memberships.map((m) => ({
      product_id: m.product_id,
      product: byId[m.product_id]?.name,
      collection: m.collection?.slug,
      role: m.role,
      homepage_visible: m.homepage_visible,
      selection_visible: m.selection_visible,
    })),
    aliases,
    identity: {
      gongura: { id: GONGURA_ID, slug: gongura?.slug, published: gongura?.is_published },
      dampudu: { id: DAMPUDU_ID, slug: dampudu?.slug, published: dampudu?.is_published },
    },
    storefront_merchandising_disabled: storefrontHits.length === 0,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const jsonPath = join(OUT_DIR, `1b2-apply-report-${stamp}.json`);
  const mdPath = join(OUT_DIR, `1b2-apply-report-${stamp}.md`);
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  const md = [
    '# Phase 1B2 signed apply report',
    '',
    `**Generated:** ${report.generated_at}`,
    `**Checks:** ${report.passed} passed · ${report.failed} failed`,
    '',
    '## Tier writes',
    '',
    '| Product | ID | Tier |',
    '|---|---|---|',
    ...report.tier_writes.map((r) => `| ${r.name} | \`${r.id}\` | ${r.tier} |`),
    '',
    '## Collection memberships',
    '',
    '| Product | Collection | Role | Homepage | Selection |',
    '|---|---|---|---|---|',
    ...report.collection_memberships.map((r) => `| ${r.product} | ${r.collection} | ${r.role} | ${r.homepage_visible} | ${r.selection_visible} |`),
    '',
    '## Aliases',
    '',
    ...aliases.map((a) => `- \`${a.old_slug}\` → \`${a.product_id}\``),
    '',
    '## Identity repairs',
    '',
    `- Gongura: slug \`${report.identity.gongura.slug}\` · published ${report.identity.gongura.published}`,
    `- Dampudu: slug \`${report.identity.dampudu.slug}\` · published ${report.identity.dampudu.published}`,
    '',
    '## Regression',
    '',
    ...results.map((r) => `- [${r.ok ? 'x' : ' '}] ${r.name}${r.detail ? ` — ${r.detail}` : ''}`),
    '',
    `**Storefront merchandising consumption disabled:** ${report.storefront_merchandising_disabled}`,
    '',
  ].join('\n');
  writeFileSync(mdPath, md);

  console.log(JSON.stringify({ jsonPath, mdPath, passed: report.passed, failed: report.failed }, null, 2));
  if (failed.length) {
    console.error('FAILED:', failed);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
