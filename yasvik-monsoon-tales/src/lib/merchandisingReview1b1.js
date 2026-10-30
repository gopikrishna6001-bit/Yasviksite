/**
 * Phase 1B1 — catalogue identity + commercial readiness (admin only).
 * Never writes products.merchandising_tier or collection memberships.
 */

import { assessContentReadiness, assessDescriptionIssues, assessPricingIssues } from './merchandisingAudit.js';

export const PHASE_1B1_AUDIT_RUN_ID = '89da3a53-92a5-44e1-9fcc-5fe2ec7015eb';

export const OWNER_INPUT_DEFAULTS = {
  supplier_confirmed: null,
  supplier_type: '',
  supply_consistency: '',
  typical_restocking_time: '',
  minimum_order_quantity: '',
  subject_to_availability_risk: null,
  alternative_supplier_available: null,
  product_cost_rs: null,
  packaging_cost_rs: null,
  expected_wastage_pct: null,
  shelf_life: '',
  leakage_or_breakage_risk: '',
  strategic_importance: '',
  owner_remarks: '',
};

export const OWNER_DECISION_ACTIONS = [
  { value: 'approve_as_hero', label: 'Approve as Hero', tier: 'hero' },
  { value: 'approve_as_core', label: 'Approve as Core', tier: 'core' },
  { value: 'change_to_core', label: 'Change to Core', tier: 'core' },
  { value: 'change_to_local_store', label: 'Change to Local Store', tier: 'local_store' },
  { value: 'change_to_hidden', label: 'Change to Hidden', tier: 'hidden' },
  { value: 'confirm_hidden', label: 'Confirm Hidden', tier: 'hidden' },
  { value: 'keep_pending', label: 'Keep Pending', tier: null },
  { value: 'reject_proposal', label: 'Reject proposal', tier: null },
];

const IDENTITY_CASES = {
  'f27b8b1f-553a-4a34-be5a-17da9dbbe16c': {
    case_id: 'gongura_mixed_vegetable',
    severity: 'critical',
    has_conflict: true,
    summary: 'Title is Gongura Pickle but slug, image path, short description and SEO description still refer to Mixed Vegetable Pickle.',
    findings: [
      'Slug remains mixed-vegetable-pickle — no product_slug_aliases row for a Gongura slug.',
      'featured_image_url path contains yasvik-mixed-vegetable-pickle-hero.webp.',
      'short_description and seo_description still describe Mixed Vegetable Pickle.',
      'seo_title was updated to Gongura Pickle (తెలుగు) while body copy was not.',
      'No separate Gongura product record exists in catalogue.',
      'POS orders exist under the name Gongura Pickle against this product_id (and one historic line without product_id).',
      'Record is unpublished (is_published=false) with sell_online=true.',
    ],
    repair_plan: [
      'Do not approve as Hero until identity is repaired.',
      'Decide intended SKU: keep as Gongura OR restore Mixed Vegetable OR split into two products.',
      'If Gongura: rewrite short/long description, replace hero image, set ingredients/allergens, create slug gongura-pickle and alias mixed-vegetable-pickle → product_id.',
      'If Mixed Vegetable: restore title/SEO to Mixed Vegetable; create a new Gongura product if needed.',
      'Do not rename slug until alias + sitemap/redirect plan is ready — existing URLs use mixed-vegetable-pickle.',
      'Keep unpublished until copy/image/SEO match.',
    ],
  },
  '130cdfbf-ee5b-4650-bb24-09b17c162cad': {
    case_id: 'dampudu_mysore_malliga',
    severity: 'critical',
    has_conflict: true,
    summary: 'Title/SEO/short description point to Handpound Dampudu Biyyam, but slug and long description still describe Mysore Malliga / Mysore Malli rice.',
    findings: [
      'Slug remains mysore-malliga-l52dq with no slug alias for dampudu.',
      'Long description explicitly describes Mysore Mallige aromatic heirloom rice.',
      'short_description, seo_title, best_for, origin_state (Andhra Pradesh), supplier Kurma Gram align with Dampudu / handpound story.',
      'No featured image.',
      'No separate Dampudu or Mysore Malliga product record exists.',
      'Two POS sales recorded under Handpound Dampudu Biyyam for this product_id.',
    ],
    repair_plan: [
      'Owner must confirm which physical rice is stocked: Dampudu Biyyam vs Mysore Malliga.',
      'If Dampudu: rewrite long description to remove Mysore Malliga claims; change slug to handpound-dampudu-biyyam; alias mysore-malliga-l52dq; add image.',
      'If Mysore Malliga: restore title/SEO/short copy to Mysore Malliga; create a separate Dampudu product if both are sold.',
      'Do not feature as Core/Hero until title, slug, description and image agree.',
      'Review structured-data / sitemap once slug is corrected.',
    ],
  },
};

function parseVariants(product) {
  const raw = product?.quick_variants ?? product?.variants ?? [];
  if (Array.isArray(raw)) return raw.filter((v) => v && typeof v === 'object');
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((v) => v && typeof v === 'object') : [];
    } catch {
      return [];
    }
  }
  return [];
}

function sellableVariants(product) {
  return parseVariants(product).filter((v) => {
    if (!v || v.__pricing_meta || v.is_pricing_meta) return false;
    const label = String(v.label || v.sku || '');
    return !label.includes('__yasvik_pricing__');
  });
}

function pricingMeta(product) {
  const meta = parseVariants(product).find((v) => String(v.sku || v.label || '').includes('__yasvik_pricing__'));
  if (!meta?.notes) return null;
  try {
    return typeof meta.notes === 'string' ? JSON.parse(meta.notes) : meta.notes;
  } catch {
    return null;
  }
}

function slugifyLoose(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function tokenOverlap(a, b) {
  const ta = new Set(slugifyLoose(a).split('-').filter((t) => t.length > 2));
  const tb = new Set(slugifyLoose(b).split('-').filter((t) => t.length > 2));
  if (!ta.size || !tb.size) return 0;
  let hit = 0;
  for (const t of ta) if (tb.has(t)) hit += 1;
  return hit / Math.max(ta.size, tb.size);
}

export function assessProductIdentity(product, { aliases = [] } = {}) {
  if (!product) {
    return {
      has_conflict: true,
      severity: 'critical',
      summary: 'Missing product record',
      findings: ['No product linked to proposal'],
      flags: { missing_product: true },
    };
  }

  const known = IDENTITY_CASES[product.id];
  if (known) {
    return {
      ...known,
      product_id: product.id,
      title: product.name,
      slug: product.slug,
      aliases: aliases.map((a) => a.old_slug),
      flags: {
        identity_conflict: true,
        title_slug_mismatch: true,
        copy_mismatch: true,
      },
    };
  }

  const findings = [];
  const flags = {};
  const expectedSlug = slugifyLoose(product.name);
  const overlap = tokenOverlap(product.name, product.slug);
  if (overlap < 0.35) {
    findings.push(`Title/slug token overlap low (${(overlap * 100).toFixed(0)}%): "${product.name}" vs "${product.slug}"`);
    flags.title_slug_mismatch = true;
  }

  const body = `${product.short_description || ''} ${product.description || ''} ${product.seo_description || ''}`;
  const nameBits = String(product.name || '').split(/[^A-Za-z]+/).filter((t) => t.length > 4);
  const missingNameInCopy = nameBits.length && !nameBits.some((b) => body.toLowerCase().includes(b.toLowerCase()));
  if (missingNameInCopy && (product.short_description || product.description)) {
    findings.push('Primary product name tokens are weak/absent in short/long description');
    flags.copy_mismatch = true;
  }

  if (product.featured_image_url && /mixed-vegetable|mysore-malliga|wrong|placeholder/i.test(product.featured_image_url)) {
    findings.push('Image URL path may not match current product title');
    flags.image_mismatch = true;
  }

  if (!product.featured_image_url) {
    findings.push('Missing hero image');
    flags.missing_image = true;
  }

  if (!sellableVariants(product).length) {
    findings.push('No sellable variants');
    flags.missing_variants = true;
  }

  const hasConflict = Boolean(flags.title_slug_mismatch || flags.copy_mismatch || flags.image_mismatch);
  return {
    case_id: hasConflict ? 'generic_identity_warning' : 'ok',
    severity: hasConflict ? 'warning' : 'ok',
    has_conflict: hasConflict,
    summary: hasConflict ? 'Potential catalogue identity inconsistency' : 'Title, slug and copy appear consistent enough for review',
    findings,
    flags,
    product_id: product.id,
    title: product.name,
    slug: product.slug,
    aliases: aliases.map((a) => a.old_slug),
  };
}

function scoreFromChecks(passed, total, unknown = 0) {
  if (unknown > 0 && passed === 0) return 'needs_owner_input';
  const ratio = total ? passed / total : 0;
  if (ratio >= 0.8) return 'strong';
  if (ratio >= 0.5) return 'acceptable';
  if (ratio >= 0.25) return 'weak';
  return 'poor';
}

export function buildReadinessScorecard(product, {
  ownerInputs = {},
  demand = null,
  identity = null,
  proposal = null,
} = {}) {
  const inputs = { ...OWNER_INPUT_DEFAULTS, ...(ownerInputs || {}) };
  const meta = pricingMeta(product) || {};
  const variants = sellableVariants(product);
  const descIssues = assessDescriptionIssues(product, { get: () => [], productNames: [] });
  const priceIssues = assessPricingIssues(product);
  const content = assessContentReadiness(product || {});

  const purchaseRate = meta.purchase_rate_per_kg != null && meta.purchase_rate_per_kg !== ''
    ? Number(meta.purchase_rate_per_kg)
    : (inputs.product_cost_rs != null ? Number(inputs.product_cost_rs) : null);
  const packagingFromMeta = meta.pack_packaging_rs
    ? Object.values(meta.pack_packaging_rs).map(Number).filter((n) => Number.isFinite(n))
    : [];
  const packagingCost = inputs.packaging_cost_rs != null
    ? Number(inputs.packaging_cost_rs)
    : (packagingFromMeta.length ? Math.min(...packagingFromMeta) : null);

  const selling = Number(product?.price) || 0;
  const costKnown = purchaseRate != null && Number.isFinite(purchaseRate) && purchaseRate >= 0;
  const packKnown = packagingCost != null && Number.isFinite(packagingCost);
  let contributionRs = null;
  let contributionPct = null;
  if (costKnown && selling > 0) {
    // purchase_rate is typically ₹/kg; approximate pack contribution using smallest pack_kg when available
    const packKg = variants.map((v) => Number(v.pack_kg)).filter((n) => n > 0).sort((a, b) => a - b)[0] || 1;
    const unitCost = purchaseRate * packKg + (packKnown ? packagingCost : 0);
    contributionRs = Math.round((selling - unitCost) * 100) / 100;
    contributionPct = Math.round((contributionRs / selling) * 1000) / 10;
  }

  const supplyChecks = {
    supplier_confirmed: inputs.supplier_confirmed === true || Boolean(product?.supplier_name),
    supplier_type: Boolean(inputs.supplier_type || product?.source_type),
    supply_consistency: Boolean(inputs.supply_consistency),
    restocking_time: Boolean(inputs.typical_restocking_time),
    moq: Boolean(inputs.minimum_order_quantity),
    availability_risk_assessed: inputs.subject_to_availability_risk != null || product?.subject_to_availability != null,
    alt_supplier: inputs.alternative_supplier_available != null,
  };
  const supplyUnknown = Object.values(supplyChecks).filter((v) => v === false).length;
  const supplyPassed = Object.values(supplyChecks).filter(Boolean).length;

  const commercialChecks = {
    selling_price: selling > 0,
    cost_known: costKnown,
    packaging_known: packKnown,
    variants_priced: variants.some((v) => Number(v.price) > 0),
    no_critical_price_conflict: priceIssues.length === 0,
  };

  const demandChecks = {
    has_sales: Boolean(demand?.orders > 0),
    has_recent_sale: Boolean(demand?.last_sold),
    multi_customer: Boolean(demand?.unique_customers > 1),
    repeat_signal: Boolean(demand?.repeat_customers > 0),
  };

  const brandChecks = {
    clear_benefit: Boolean(String(product?.best_for || '').trim().length >= 8 || String(product?.short_description || '').trim().length >= 20),
    process_story: Boolean(String(product?.processing_method || product?.process_method || '').trim()),
    regional_relevance: Boolean(String(product?.origin_state || product?.local_name || '').trim()),
    visual_story: Boolean(product?.featured_image_url),
    yasvik_fit: proposal?.proposed_tier === 'hero' || proposal?.proposed_tier === 'core',
  };

  const operationalChecks = {
    shelf_life: Boolean(inputs.shelf_life || product?.shelf_life_text),
    storage: Boolean(String(product?.storage_note || '').trim() || inputs.leakage_or_breakage_risk),
    packaging_ready: variants.length > 0,
    label_ready: Boolean(product?.sku || product?.product_code),
    not_unpublished_conflict: !(proposal?.proposed_tier === 'hero' && product && !product.is_published),
  };

  const contentChecks = content.checks || {};
  const contentPassed = content.passed || 0;
  const contentTotal = content.total || Object.keys(contentChecks).length;

  const identityBlocksHero = identity?.has_conflict && identity?.severity === 'critical';

  const strategicHeroMarginConcern = Boolean(
    !identityBlocksHero
    && proposal?.proposed_tier === 'hero'
    && contributionPct != null
    && contributionPct < 20
    && (inputs.strategic_importance === 'high' || brandChecks.yasvik_fit),
  );

  return {
    supply: {
      score: scoreFromChecks(supplyPassed, Object.keys(supplyChecks).length, supplyUnknown > 4 ? 1 : 0),
      checks: supplyChecks,
      supplier_name: product?.supplier_name || null,
      source_type: product?.source_type || null,
      subject_to_availability: product?.subject_to_availability ?? null,
      missing: Object.entries(supplyChecks).filter(([, v]) => !v).map(([k]) => k),
    },
    commercial: {
      score: costKnown ? scoreFromChecks(
        Object.values(commercialChecks).filter(Boolean).length,
        Object.keys(commercialChecks).length,
      ) : 'needs_owner_input',
      selling_price_rs: selling || null,
      product_cost_rs: costKnown ? purchaseRate : 'needs_owner_input',
      packaging_cost_rs: packKnown ? packagingCost : 'needs_owner_input',
      payment_cost_estimate: 'needs_owner_input',
      delivery_burden: selling >= 800 || (variants.some((v) => Number(v.pack_kg) >= 2)) ? 'elevated' : 'normal',
      expected_gross_contribution_rs: contributionRs == null ? 'needs_owner_input' : contributionRs,
      gross_contribution_pct: contributionPct == null ? 'needs_owner_input' : contributionPct,
      likely_discount_pressure: priceIssues.some((w) => /compare-price|permanent-discount/i.test(w)) ? 'high' : 'unknown',
      breakage_or_leakage_risk: inputs.leakage_or_breakage_risk || 'needs_owner_input',
      checks: commercialChecks,
      price_warnings: priceIssues,
    },
    demand: {
      score: demand
        ? scoreFromChecks(Object.values(demandChecks).filter(Boolean).length, Object.keys(demandChecks).length)
        : 'needs_owner_input',
      snapshot: demand || { data_status: 'missing_or_incomplete' },
      checks: demandChecks,
    },
    brand: {
      score: scoreFromChecks(Object.values(brandChecks).filter(Boolean).length, Object.keys(brandChecks).length),
      checks: brandChecks,
    },
    operational: {
      score: scoreFromChecks(Object.values(operationalChecks).filter(Boolean).length, Object.keys(operationalChecks).length),
      checks: operationalChecks,
      shelf_life_text: product?.shelf_life_text || inputs.shelf_life || null,
    },
    content: {
      score: scoreFromChecks(contentPassed, contentTotal),
      recommendation: content.recommendation,
      checks: contentChecks,
      description_warnings: descIssues,
      incomplete: contentPassed < Math.ceil(contentTotal * 0.6),
    },
    hero_gate: {
      identity_ok: !identityBlocksHero,
      supply_ok: supplyPassed >= 2,
      brand_ok: brandChecks.clear_benefit && brandChecks.yasvik_fit,
      commercial_ok: contributionPct == null ? false : contributionPct >= 20,
      packaging_ok: variants.length > 0,
      visual_ok: Boolean(product?.featured_image_url),
      no_critical_catalogue_errors: !identityBlocksHero && descIssues.length < 3,
      strategic_hero_margin_concern: strategicHeroMarginConcern,
      eligible_without_exception: !identityBlocksHero
        && supplyPassed >= 2
        && brandChecks.clear_benefit
        && variants.length > 0
        && Boolean(product?.featured_image_url)
        && (contributionPct == null || contributionPct >= 15),
    },
    core_gate: {
      identity_ok: !identityBlocksHero,
      supply_reasonable: supplyPassed >= 1 || Boolean(product?.supplier_name),
      basket_or_repeat: Boolean(demand?.orders > 0) || brandChecks.clear_benefit,
      ops_ok: variants.length > 0 && selling > 0,
      commerce_data_ok: selling > 0 && variants.some((v) => Number(v.price) > 0),
      eligible: !identityBlocksHero && selling > 0 && variants.length > 0,
    },
    flags: {
      identity_conflict: Boolean(identity?.has_conflict),
      margin_unknown: !costKnown,
      supply_unknown: supplyPassed < 2,
      high_delivery_burden: selling >= 800 || variants.some((v) => Number(v.pack_kg) >= 2),
      content_incomplete: contentPassed < Math.ceil(contentTotal * 0.6),
      strategic_hero_margin_concern: strategicHeroMarginConcern,
    },
  };
}

export function classifyHiddenReason(product, proposal) {
  const warnings = proposal?.warnings || [];
  if ((Number(product?.price) || 0) <= 0) return 'zero_price';
  if (!product?.is_published && !product?.featured_image_url) return 'incomplete_catalogue_record';
  if (warnings.some((w) => /duplicate/i.test(w))) return 'duplicate';
  if (!product?.is_published) return 'intentionally_unpublished';
  if (!sellableVariants(product || {}).length) return 'missing_valid_variant';
  return 'other';
}

export function classifyPendingGroup(product, proposal) {
  if (proposal?.match_status === 'special_review' || proposal?.report_flags?.special_oil) return 'special_use_oil';
  if (product?.product_kind === 'bundle' || product?.bundle_id || /combo/i.test(product?.name || '')) return 'bundle_combo';
  if ((Number(product?.price) || 0) <= 0) return 'missing_pricing';
  if (!product?.featured_image_url) return 'missing_images';
  if (!product?.is_published && product?.sell_online === false) return 'draft';
  if (proposal?.warnings?.some((w) => /identity|slug|mismatch/i.test(w))) return 'catalogue_conflict';
  if (proposal?.classification_reason?.includes('Uncertain')) return 'unclear_intended_use';
  return 'requires_business_decision';
}

export function specialOilRecommendation(product) {
  const name = String(product?.name || '').toLowerCase();
  if (name.includes('poojam') || name.includes('pooja')) {
    return {
      recommended_location: 'Pooja collection',
      use_class: 'pooja',
      note: 'Ritual oil — Local Store or dedicated pooja merchandising; not From Seed to Oil.',
    };
  }
  if (name.includes('neem') || name.includes('castor') || name.includes('almond')) {
    return {
      recommended_location: 'Natural-care collection',
      use_class: 'personal_care_or_unclear',
      note: 'Verify edible vs topical claims with supplier docs before any food assortment placement.',
    };
  }
  if (name.includes('olive')) {
    return {
      recommended_location: 'Local Store only',
      use_class: 'food_specialty_import',
      note: 'Edible specialty import — not primary Seed-to-Oil story; Local Store unless owner elevates.',
    };
  }
  return {
    recommended_location: 'Hidden until verified',
    use_class: 'unclear',
    note: 'Needs owner classification.',
  };
}

export function filterProposals1b1(proposals, filterKey) {
  const list = proposals || [];
  switch (filterKey) {
    case 'hero':
      return list.filter((p) => p.proposed_tier === 'hero');
    case 'core':
      return list.filter((p) => p.proposed_tier === 'core');
    case 'hidden':
      return list.filter((p) => p.proposed_tier === 'hidden');
    case 'pending':
      return list.filter((p) => p.proposed_tier == null || p.owner_decision_status === 'pending');
    case 'identity_conflict':
      return list.filter((p) => p.identity_assessment?.has_conflict || p.readiness_scorecard?.flags?.identity_conflict);
    case 'margin_unknown':
      return list.filter((p) => p.readiness_scorecard?.flags?.margin_unknown);
    case 'supply_unknown':
      return list.filter((p) => p.readiness_scorecard?.flags?.supply_unknown);
    case 'high_delivery_burden':
      return list.filter((p) => p.readiness_scorecard?.flags?.high_delivery_burden);
    case 'content_incomplete':
      return list.filter((p) => p.readiness_scorecard?.flags?.content_incomplete || p.readiness_scorecard?.content?.incomplete);
    case 'special_oils':
      return list.filter((p) => p.report_flags?.special_oil || p.match_status === 'special_review');
    case 'commercial':
      return list.filter((p) => p.proposed_tier === 'hero' || p.proposed_tier === 'core');
    case 'supply':
      return list.filter((p) => p.proposed_tier === 'hero' || p.proposed_tier === 'core');
    case 'demand':
      return list.filter((p) => p.proposed_tier === 'hero' || p.proposed_tier === 'core');
    case 'operational':
      return list.filter((p) => p.proposed_tier === 'hero' || p.proposed_tier === 'core');
    case 'content_readiness':
      return list.filter((p) => p.proposed_tier === 'hero' || p.proposed_tier === 'core');
    default:
      return list;
  }
}

export function scorecardToCsv(rows) {
  const headers = [
    'proposal_id', 'product_name', 'slug', 'proposed_tier', 'owner_decision_status', 'owner_decision_action',
    'identity_conflict', 'identity_summary',
    'supply_score', 'commercial_score', 'demand_score', 'brand_score', 'operational_score', 'content_score',
    'selling_price_rs', 'product_cost_rs', 'packaging_cost_rs', 'contribution_rs', 'contribution_pct',
    'orders', 'units', 'revenue_rs', 'unique_customers', 'last_sold',
    'hero_eligible', 'strategic_hero_margin_concern', 'core_eligible',
    'hidden_reason_code', 'pending_reason_group', 'special_oil_recommendation',
    'needs_owner_input', 'decision_note',
  ];
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(',')];
  for (const r of rows) {
    const sc = r.readiness_scorecard || {};
    const dem = r.demand_snapshot || sc.demand?.snapshot || {};
    const needs = [
      sc.commercial?.product_cost_rs === 'needs_owner_input' ? 'cost' : null,
      sc.flags?.supply_unknown ? 'supply' : null,
      sc.flags?.identity_conflict ? 'identity' : null,
    ].filter(Boolean).join('|');
    lines.push([
      r.id,
      r.product?.name || r.unmatched_label,
      r.product?.slug,
      r.proposed_tier,
      r.owner_decision_status,
      r.owner_decision_action,
      r.identity_assessment?.has_conflict,
      r.identity_assessment?.summary,
      sc.supply?.score,
      sc.commercial?.score,
      sc.demand?.score,
      sc.brand?.score,
      sc.operational?.score,
      sc.content?.score,
      sc.commercial?.selling_price_rs,
      sc.commercial?.product_cost_rs,
      sc.commercial?.packaging_cost_rs,
      sc.commercial?.expected_gross_contribution_rs,
      sc.commercial?.gross_contribution_pct,
      dem.orders,
      dem.units,
      dem.revenue_rs,
      dem.unique_customers,
      dem.last_sold,
      sc.hero_gate?.eligible_without_exception,
      sc.hero_gate?.strategic_hero_margin_concern,
      sc.core_gate?.eligible,
      r.hidden_reason_code,
      r.pending_reason_group,
      r.special_oil_recommendation,
      needs,
      r.decision_note,
    ].map(esc).join(','));
  }
  return lines.join('\n');
}

export function recommendedForPhase1b2(proposals) {
  return (proposals || []).filter((p) => {
    if (!['approved', 'changed'].includes(p.owner_decision_status)) return false;
    if (p.identity_assessment?.has_conflict && p.identity_assessment?.severity === 'critical') return false;
    const action = p.owner_decision_action;
    const tier = p.owner_selected_tier || (
      action === 'approve_as_hero' ? 'hero'
        : (action === 'approve_as_core' || action === 'change_to_core') ? 'core'
          : action === 'change_to_local_store' ? 'local_store'
            : (action === 'change_to_hidden' || action === 'confirm_hidden') ? 'hidden'
              : null
    );
    return Boolean(tier);
  }).map((p) => ({
    proposal_id: p.id,
    product_id: p.product_id,
    name: p.product?.name,
    apply_tier: p.owner_selected_tier || null,
    apply_collection_id: p.owner_selected_collection_id || p.proposed_collection_id || null,
    apply_role: p.owner_selected_collection_role || p.proposed_collection_role || null,
    action: p.owner_decision_action,
    note: p.decision_note,
  }));
}
