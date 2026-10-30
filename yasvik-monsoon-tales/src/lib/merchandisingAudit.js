/**
 * Phase 1A merchandising dry-run audit (admin / scripts only).
 * Never mutates active product merchandising_tier or collection memberships.
 */

export const GENERATION_VERSION = '1a.1';
export const PROPOSAL_RULE_VERSION = '1a.1';

export const COLLECTION_SLUGS = {
  fromSeedToOil: 'from-seed-to-oil',
  homemadeAndhra: 'homemade-andhra-kitchen',
  heritageEveryday: 'heritage-and-natural-everyday-foods',
};

/**
 * Verified exact ID + slug pairs from Phase 1A resolution (2026-07-28).
 * Matching uses exact id OR exact slug OR exact name — never fuzzy title search.
 */
export const HERO_TARGETS = [
  {
    label: 'Cold Pressed Groundnut Oil',
    tier: 'hero',
    collectionSlug: COLLECTION_SLUGS.fromSeedToOil,
    role: 'hero',
    verifiedId: '486919f8-f0e7-4911-8b8c-8471e6a6d795',
    verifiedSlug: 'cold-pressed-groundnut-oil',
    exactNames: ['Cold Pressed Groundnut Oil'],
  },
  {
    label: 'Cold Pressed White Sesame Oil',
    tier: 'hero',
    collectionSlug: COLLECTION_SLUGS.fromSeedToOil,
    role: 'hero',
    verifiedId: '2f47f4cf-2002-4e8a-89ed-0400fc91a618',
    verifiedSlug: 'cold-pressed-sesame-oil',
    exactNames: ['Cold Pressed White Sesame Oil'],
  },
  {
    label: 'Cold Pressed Niger Oil',
    tier: 'hero',
    collectionSlug: COLLECTION_SLUGS.fromSeedToOil,
    role: 'hero',
    verifiedId: 'e7973f29-ddc9-412c-8da8-72298b188b3f',
    verifiedSlug: 'cold-pressed-niger-oil-c490b',
    exactNames: ['Cold Pressed Niger Oil'],
  },
  {
    label: 'Mango Pickle / Avakaya',
    tier: 'hero',
    collectionSlug: COLLECTION_SLUGS.homemadeAndhra,
    role: 'hero',
    verifiedId: '4c4396d8-c1e4-4359-90fb-778105fd2c3f',
    verifiedSlug: 'mango-pickle-avakaya',
    exactNames: ['Mango Pickle / Avakaya'],
  },
  {
    label: 'Gongura Pickle',
    tier: 'hero',
    collectionSlug: COLLECTION_SLUGS.homemadeAndhra,
    role: 'hero',
    verifiedId: 'f27b8b1f-553a-4a34-be5a-17da9dbbe16c',
    verifiedSlug: 'mixed-vegetable-pickle',
    exactNames: ['Gongura Pickle'],
    notes: [
      'Propose only — do not publish or change sell_online in Phase 1A.',
      'Slug currently mixed-vegetable-pickle (owner should verify naming).',
    ],
  },
  {
    label: 'Peanut Chutney Powder',
    tier: 'hero',
    collectionSlug: COLLECTION_SLUGS.homemadeAndhra,
    role: 'hero',
    verifiedId: '068c0cb6-8c29-4c53-a648-6bdc43cc0967',
    verifiedSlug: 'groundnut-chutney-powder-emu0x',
    exactNames: ['Peanut Chutney Powder'],
  },
  {
    label: 'Chegodilu',
    tier: 'hero',
    collectionSlug: COLLECTION_SLUGS.homemadeAndhra,
    role: 'hero',
    verifiedId: '20133192-15f7-43ba-b6af-944d3458bd8b',
    verifiedSlug: 'chekodilu-lth6d',
    exactNames: ['Chegodilu'],
  },
  {
    label: 'Organic Jaggery Powder',
    tier: 'hero',
    collectionSlug: COLLECTION_SLUGS.heritageEveryday,
    role: 'hero',
    verifiedId: '9bd19447-45d6-4c37-be1a-9849030365d0',
    verifiedSlug: 'yureka-jaggery-powder',
    exactNames: ['Organic Jaggery Powder'],
  },
  {
    label: 'Multi Floral Honey',
    tier: 'hero',
    collectionSlug: COLLECTION_SLUGS.heritageEveryday,
    role: 'hero',
    verifiedId: '25873e11-436e-43e4-b2dd-acb9e1b9eb0e',
    verifiedSlug: 'multi-floral-honey',
    exactNames: ['Multi Floral Honey'],
  },
  {
    label: 'Organic Kattuyanam Rice',
    tier: 'hero',
    collectionSlug: COLLECTION_SLUGS.heritageEveryday,
    role: 'hero',
    verifiedId: '9153896a-27dd-47b9-a1a1-e608a8ef870a',
    verifiedSlug: 'organic-kattuyanam-rice',
    exactNames: ['Organic Kattuyanam Rice'],
  },
];

export const CORE_TARGETS = [
  {
    label: 'Cold Pressed Coconut Oil',
    tier: 'core',
    collectionSlug: COLLECTION_SLUGS.fromSeedToOil,
    role: 'supporting',
    verifiedId: '49f585e8-e6dd-49d7-b410-63bcb1dbf098',
    verifiedSlug: 'cold-pressed-coconut-oil',
    exactNames: ['Cold Pressed Coconut Oil'],
  },
  {
    label: 'Cold Pressed Black Sesame Oil',
    tier: 'core',
    collectionSlug: COLLECTION_SLUGS.fromSeedToOil,
    role: 'supporting',
    verifiedId: '3ec1d011-f280-4fab-afa9-645348861a71',
    verifiedSlug: 'cold-pressed-black-sesame-oil',
    exactNames: ['Cold Pressed Black Sesame Oil'],
  },
  {
    label: 'Cold Pressed Safflower Oil',
    tier: 'core',
    collectionSlug: COLLECTION_SLUGS.fromSeedToOil,
    role: 'supporting',
    verifiedId: '4864c2fa-b8b7-4322-aff0-76cf1d78d7fd',
    verifiedSlug: 'cold-pressed-safflower-oil',
    exactNames: ['Cold Pressed Safflower Oil'],
  },
  {
    label: 'Chicken Pickle',
    tier: 'core',
    collectionSlug: COLLECTION_SLUGS.homemadeAndhra,
    role: 'supporting',
    verifiedId: '55c616a0-5fac-427a-ae4e-06831f43bb76',
    verifiedSlug: 'chicken-pickle-4juhx',
    exactNames: ['Chicken Pickle'],
  },
  {
    label: 'Red Chilli Pickle',
    tier: 'core',
    collectionSlug: COLLECTION_SLUGS.homemadeAndhra,
    role: 'supporting',
    verifiedId: '12548183-9256-410b-b058-21b5ddaa30bc',
    verifiedSlug: 'red-chilli-pickle',
    exactNames: ['Red Chilli Pickle'],
  },
  {
    label: 'Lemon Pickle',
    tier: 'core',
    collectionSlug: COLLECTION_SLUGS.homemadeAndhra,
    role: 'supporting',
    verifiedId: '755a2d62-70a1-4a9d-8585-551478c77930',
    verifiedSlug: 'lemon-pickle',
    exactNames: ['Lemon Pickle'],
  },
  {
    label: 'Niger Seeds Chutney Powder',
    tier: 'core',
    collectionSlug: COLLECTION_SLUGS.homemadeAndhra,
    role: 'supporting',
    verifiedId: '191115b7-cee8-4454-9113-c675c9cfd24d',
    verifiedSlug: 'niger-seeds-chutney-powder-el618',
    exactNames: ['Niger Seeds Chutney Powder'],
  },
  {
    label: 'Curry Leaves Chilli Powder',
    tier: 'core',
    collectionSlug: COLLECTION_SLUGS.homemadeAndhra,
    role: 'supporting',
    verifiedId: 'b4e90106-2b3a-46e1-8a4d-dee92d427e22',
    verifiedSlug: 'karivepaku-chilli-powder-fnw5a',
    exactNames: ['Curry Leaves Chilli Powder'],
  },
  {
    label: 'Homemade Turmeric Powder',
    tier: 'core',
    collectionSlug: COLLECTION_SLUGS.homemadeAndhra,
    role: 'supporting',
    verifiedId: '2e9fbb84-c308-4c7e-a861-f0d9a03b0aeb',
    verifiedSlug: 'homemade-turmeric-powder',
    exactNames: ['Homemade Turmeric Powder'],
  },
  {
    label: 'Chekkalu',
    tier: 'core',
    collectionSlug: COLLECTION_SLUGS.homemadeAndhra,
    role: 'supporting',
    verifiedId: '6ae2be38-201d-4382-97ea-0bafa1b55bac',
    verifiedSlug: 'chekkalu-0hj6i',
    exactNames: ['Chekkalu'],
  },
  {
    label: 'Janthikalu',
    tier: 'core',
    collectionSlug: COLLECTION_SLUGS.homemadeAndhra,
    role: 'supporting',
    verifiedId: '0f65424c-fe3a-42f0-9a2b-7d132808cd8d',
    verifiedSlug: 'janthikalu-0f836',
    exactNames: ['Janthikalu'],
  },
  {
    label: 'Ragi Murukulu',
    tier: 'core',
    collectionSlug: COLLECTION_SLUGS.homemadeAndhra,
    role: 'supporting',
    verifiedId: '15392d7d-a54b-4be7-8907-a194428e328d',
    verifiedSlug: 'ragi-murukulu-ns63a',
    exactNames: ['Ragi Murukulu'],
  },
  {
    label: 'Jonna Palli Pakodi',
    tier: 'core',
    collectionSlug: COLLECTION_SLUGS.homemadeAndhra,
    role: 'supporting',
    verifiedId: '7cb419dd-3cae-49e4-b468-715d9e1edad0',
    verifiedSlug: 'jonna-palli-pakodi-lx1ur',
    exactNames: ['Jonna Palli Pakodi'],
  },
  {
    label: 'Atreyapuram Spl Ghee Putharekulu',
    tier: 'core',
    collectionSlug: COLLECTION_SLUGS.homemadeAndhra,
    role: 'supporting',
    verifiedId: '06a8dcbc-2370-41a6-af7d-69621d578ff8',
    verifiedSlug: 'atreyapuram-spl-ghee-putharekulu-qjpex',
    exactNames: ['Atreyapuram Spl Ghee Putharekulu', 'Atreyapuram Special Ghee Putharekulu'],
  },
  {
    label: 'Sunnundalu',
    tier: 'core',
    collectionSlug: COLLECTION_SLUGS.homemadeAndhra,
    role: 'supporting',
    verifiedId: 'ea722271-a6da-4f55-bb2e-5ae56338c63b',
    verifiedSlug: 'sunnundalu-m1agq',
    exactNames: ['Sunnundalu'],
  },
  {
    label: 'Ragi Laddu',
    tier: 'core',
    collectionSlug: COLLECTION_SLUGS.homemadeAndhra,
    role: 'supporting',
    verifiedId: '8c67bb2e-0f87-4e34-b6dc-d62dea39453d',
    verifiedSlug: 'ragi-laddu',
    exactNames: ['Ragi Laddu'],
  },
  {
    label: 'Organic Black Rice',
    tier: 'core',
    collectionSlug: COLLECTION_SLUGS.heritageEveryday,
    role: 'supporting',
    verifiedId: '58cf4ed9-6d25-4f1a-9c5c-d4f018b39263',
    verifiedSlug: 'organic-black-rice',
    exactNames: ['Organic Black Rice'],
  },
  {
    label: 'Handpound Dampudu Biyyam',
    tier: 'core',
    collectionSlug: COLLECTION_SLUGS.heritageEveryday,
    role: 'supporting',
    verifiedId: '130cdfbf-ee5b-4650-bb24-09b17c162cad',
    verifiedSlug: 'mysore-malliga-l52dq',
    exactNames: ['Handpound Dampudu Biyyam'],
    notes: ['Slug currently mysore-malliga-l52dq — owner should verify product identity.'],
  },
  {
    label: 'Organic Palm Jaggery Balls',
    tier: 'core',
    collectionSlug: COLLECTION_SLUGS.heritageEveryday,
    role: 'supporting',
    verifiedId: '60f40bb4-96f5-4c73-9f3a-defae1366a27',
    verifiedSlug: 'organic-palm-jaggery-balls-6u5ih',
    exactNames: ['Organic Palm Jaggery Balls'],
  },
  {
    label: 'Pure Cow Ghee',
    tier: 'core',
    collectionSlug: COLLECTION_SLUGS.heritageEveryday,
    role: 'supporting',
    verifiedId: 'b8eec39e-1cc2-486d-b923-87acf393490f',
    verifiedSlug: 'cow-ghee',
    exactNames: ['Pure Cow Ghee'],
  },
  {
    label: 'Organic Multi Millet Dosa Mix',
    tier: 'core',
    collectionSlug: COLLECTION_SLUGS.heritageEveryday,
    role: 'supporting',
    verifiedId: '74f5e6e1-f00c-448f-b6ed-f15556c65d27',
    verifiedSlug: 'organic-multi-millet-dosa-mix',
    exactNames: ['Organic Multi Millet Dosa Mix'],
  },
];

export const SPECIAL_OIL_TARGETS = [
  {
    label: 'Cold Pressed Neem Oil',
    verifiedId: '54f53471-3cfc-494d-bef1-efdfad33dc04',
    verifiedSlug: 'cold-pressed-neem-oil-c3hrb',
    exactNames: ['Cold Pressed Neem Oil'],
    reason: 'Special-use oil — never place in From Seed to Oil primary assortment without owner review.',
  },
  {
    label: 'Cold Pressed Castor Oil',
    verifiedId: 'e3d1a098-7bab-40dd-a6fd-d7777406ff3c',
    verifiedSlug: 'cold-pressed-castor-oil-1xe5u',
    exactNames: ['Cold Pressed Castor Oil'],
    reason: 'Special-use oil — never place in From Seed to Oil primary assortment without owner review.',
  },
  {
    label: 'Cold Pressed Almond Oil',
    verifiedId: '379ff8dc-d41d-49b7-890a-9c447cc0dfca',
    verifiedSlug: 'cold-pressed-almond-oil-v2dfs',
    exactNames: ['Cold Pressed Almond Oil'],
    reason: 'Specialty / cosmetic-leaning oil — owner review before brand assortment.',
  },
  {
    label: 'Extra Virgin Olive Oil',
    verifiedId: '6966d512-aab4-4fd3-929a-14bc1f3682e2',
    verifiedSlug: 'extra-virgin-olive-oil',
    exactNames: ['Extra Virgin Olive Oil'],
    reason: 'Imported specialty oil — not part of From Seed to Oil primary story.',
  },
  {
    label: 'Poojam Oil',
    verifiedId: '50c23432-fb6c-4db8-b94b-57bc9623836a',
    verifiedSlug: 'poojam-oil-s842d',
    exactNames: ['Poojam Oil'],
    reason: 'Ritual / pooja use — not kitchen cooking oil story.',
  },
];

function norm(s) {
  return String(s || '').trim().toLowerCase();
}

function textLen(s) {
  return String(s || '').trim().length;
}

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

function variantPrice(v) {
  const n = Number(v.price ?? v.selling_price ?? v.mrp ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function variantCompare(v) {
  const n = Number(v.compare_price ?? v.compare_at_price ?? v.mrp ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function resolveExactMatches(products, target) {
  const byId = products.filter((p) => p.id === target.verifiedId);
  if (byId.length === 1) return { status: 'matched', products: byId };
  if (byId.length > 1) return { status: 'ambiguous', products: byId };

  const bySlug = products.filter((p) => norm(p.slug) === norm(target.verifiedSlug));
  if (bySlug.length === 1) return { status: 'matched', products: bySlug };
  if (bySlug.length > 1) return { status: 'ambiguous', products: bySlug };

  const names = new Set((target.exactNames || [target.label]).map(norm));
  const byName = products.filter((p) => names.has(norm(p.name)));
  if (byName.length === 1) return { status: 'matched', products: byName };
  if (byName.length > 1) return { status: 'ambiguous', products: byName };

  return { status: 'unmatched', products: [] };
}

export function assessContentReadiness(product) {
  const checks = {
    short_description: textLen(product.short_description) >= 20,
    description: textLen(product.description) >= 80,
    primary_benefit: textLen(product.best_for) >= 8 || textLen(product.yasvik_mark) >= 8,
    ingredients: textLen(product.ingredients) >= 4,
    allergens: textLen(product.allergen_info) >= 2,
    processing_method: textLen(product.processing_method || product.process_method) >= 4,
    best_for: textLen(product.best_for) >= 4,
    storage: textLen(product.storage_note) >= 4,
    sourcing: textLen(product.origin_state) >= 2 || textLen(product.sourcing_card) >= 8 || textLen(product.supplier_name) >= 2,
    natural_variation: /natural|batch|harvest|season/i.test(
      `${product.description || ''} ${product.short_description || ''} ${product.storage_note || ''}`,
    ),
    hero_image: Boolean(product.featured_image_url),
    supporting_image: Boolean(product.hover_media),
    story_description: textLen(product.description) >= 120,
    video: Boolean(product.hero_video),
    seo_title: textLen(product.seo_title) >= 10,
    seo_description: textLen(product.seo_description) >= 40,
  };
  const passed = Object.values(checks).filter(Boolean).length;
  const total = Object.keys(checks).length;
  let recommendation = 'needs_source_information';
  if (passed >= total - 2) recommendation = 'complete';
  else if (passed >= 10 && checks.hero_image && checks.description) recommendation = 'ready_for_video';
  else if (passed >= 7) recommendation = 'ready_for_copy';
  else if (passed >= 3) recommendation = 'needs_source_information';
  else recommendation = 'not_started';
  return { checks, passed, total, recommendation };
}

export function assessDescriptionIssues(product, descriptionIndex) {
  const warnings = [];
  const desc = String(product.description || '').trim();
  const short = String(product.short_description || '').trim();
  if (!desc && !short) {
    warnings.push('Missing product description');
    return warnings;
  }
  if (desc && textLen(desc) < 40) warnings.push('Description too short / generic');
  if (short && textLen(short) < 12) warnings.push('Short description too thin');

  const key = norm(desc).slice(0, 180);
  if (key && descriptionIndex?.get(key)?.length > 1) {
    const others = descriptionIndex.get(key).filter((id) => id !== product.id);
    if (others.length) warnings.push(`Same description reused on ${others.length} other product(s)`);
  }

  const nameTokens = norm(product.name).split(/[^a-z0-9]+/).filter((t) => t.length > 3);
  const body = norm(`${desc} ${short}`);
  for (const other of descriptionIndex?.productNames || []) {
    if (other.id === product.id) continue;
    const otherName = norm(other.name);
    if (otherName.length < 8) continue;
    if (body.includes(otherName) && !nameTokens.every((t) => otherName.includes(t))) {
      warnings.push(`Another product name appears in copy: ${other.name}`);
      break;
    }
  }

  if (/cold.?pressed|oil/i.test(product.name) && /pickle|chutney|snack/i.test(desc)) {
    warnings.push('Oil product may have incorrect category wording in description');
  }
  if (/pickle/i.test(product.name) && /cold.?pressed oil|sesame oil|groundnut oil/i.test(desc) && !/pickle/i.test(desc)) {
    warnings.push('Pickle product may have incorrect oil-oriented description');
  }

  return warnings;
}

export function assessPricingIssues(product) {
  const warnings = [];
  const price = Number(product.price) || 0;
  const compare = Number(product.discount_price) || 0;
  const variants = parseVariants(product).filter((v) => !v?.__pricing_meta && !v?.is_pricing_meta);
  const sellable = variants.filter((v) => variantPrice(v) > 0);

  if (price <= 0) warnings.push('Zero or missing product price');

  if (sellable.length) {
    const prices = sellable.map(variantPrice).sort((a, b) => a - b);
    const lowest = prices[0];
    const highest = prices[prices.length - 1];
    if (price > lowest * 1.05 && price >= highest * 0.95) {
      warnings.push('Product-level price appears based on largest pack rather than lowest pack');
    } else if (price > lowest * 1.15) {
      warnings.push('Product-level price higher than lowest valid variant');
    }
    for (const v of sellable) {
      const vp = variantPrice(v);
      const vc = variantCompare(v);
      if (vc > 0 && vp > 0 && vc < vp) {
        warnings.push('Variant compare price lower than selling price');
        break;
      }
      if (vc > 0 && vp > 0 && vc / vp >= 1.8) {
        warnings.push('Suspicious compare-price gap on a variant (permanent-discount appearance)');
        break;
      }
    }
  }

  if (compare > 0 && price > 0) {
    if (compare < price) warnings.push('Product compare/discount price lower than selling price');
    if (compare / price >= 1.8) warnings.push('Suspicious product compare-price gap');
  }

  return warnings;
}

export function computeConfidence({ matchStatus, warnings, product }) {
  if (matchStatus === 'ambiguous' || matchStatus === 'unmatched') return 'low';
  const major = (warnings || []).some((w) =>
    /ambiguous|duplicate|zero or missing|missing essential|conflicting|unmatched/i.test(w),
  );
  if (major || !product) return 'low';
  if ((warnings || []).length > 0) return 'medium';
  if (!product.is_published || product.price <= 0) return 'medium';
  return 'high';
}

function buildDescriptionIndex(products) {
  const map = new Map();
  for (const p of products) {
    const key = norm(p.description).slice(0, 180);
    if (!key || key.length < 40) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(p.id);
  }
  map.productNames = products.map((p) => ({ id: p.id, name: p.name }));
  return map;
}

function classifyRemaining(product, { isSpecialOil }) {
  const warnings = [];
  const price = Number(product.price) || 0;
  const variants = parseVariants(product);
  const incomplete =
    !product.featured_image_url
    && textLen(product.description) < 20
    && textLen(product.short_description) < 10;

  if (isSpecialOil) {
    return {
      proposed_tier: null,
      match_status: 'special_review',
      classification_reason: 'Special oil flagged for owner review — not auto-assigned to Local Store or From Seed to Oil.',
      owner_decision_status: 'pending',
      warnings,
    };
  }

  if (!product.is_published && incomplete) {
    return {
      proposed_tier: 'hidden',
      match_status: 'matched',
      classification_reason: 'Unpublished and incomplete — propose Hidden pending owner confirmation.',
      owner_decision_status: 'pending',
      warnings: [...warnings, 'Unpublished incomplete draft'],
    };
  }

  if (price <= 0 && variants.every((v) => variantPrice(v) <= 0)) {
    return {
      proposed_tier: 'hidden',
      match_status: 'matched',
      classification_reason: 'Zero-priced product — propose Hidden until pricing is fixed.',
      owner_decision_status: 'pending',
      warnings: [...warnings, 'Zero or missing product price'],
    };
  }

  if (product.product_kind === 'bundle' || product.bundle_id) {
    return {
      proposed_tier: null,
      match_status: 'matched',
      classification_reason: 'Bundle/combo product — pending owner decision (not auto Local Store).',
      owner_decision_status: 'pending',
      warnings,
    };
  }

  if (product.is_published && price > 0) {
    return {
      proposed_tier: 'local_store',
      match_status: 'matched',
      classification_reason: 'Valid published catalogue item outside Hero/Core — propose Local Store for POS / wider catalogue.',
      owner_decision_status: 'pending',
      warnings,
    };
  }

  return {
    proposed_tier: null,
    match_status: 'matched',
    classification_reason: 'Uncertain fit — pending owner decision (not auto-classified as Local Store).',
    owner_decision_status: 'pending',
    warnings: [...warnings, 'Uncertain intended use / publication state'],
  };
}

/**
 * Build dry-run proposal rows (not yet persisted).
 * @param {{ products: object[], collectionsBySlug: Record<string, {id:string,slug:string}> }} input
 */
export function buildMerchandisingProposals({ products, collectionsBySlug }) {
  const list = Array.isArray(products) ? products : [];
  const descIndex = buildDescriptionIndex(list);
  const claimed = new Set();
  const proposals = [];
  const resolution = [];

  const handleTarget = (target) => {
    const resolved = resolveExactMatches(list, target);
    resolution.push({
      label: target.label,
      tier: target.tier,
      status: resolved.status,
      candidates: resolved.products.map((p) => ({ id: p.id, slug: p.slug, name: p.name })),
    });

    if (resolved.status === 'unmatched') {
      proposals.push({
        product_id: null,
        unmatched_label: target.label,
        proposed_tier: target.tier,
        proposed_collection_id: collectionsBySlug[target.collectionSlug]?.id || null,
        proposed_collection_role: target.role,
        classification_reason: `Unmatched Hero/Core target: ${target.label}`,
        warnings: ['No exact ID/slug/name match'],
        confidence: 'low',
        match_status: 'unmatched',
        candidate_product_ids: [],
        report_flags: { unmatched: true, target_label: target.label },
        content_readiness_recommendation: null,
        owner_decision_status: 'pending',
      });
      return;
    }

    if (resolved.status === 'ambiguous') {
      proposals.push({
        product_id: null,
        unmatched_label: target.label,
        proposed_tier: target.tier,
        proposed_collection_id: collectionsBySlug[target.collectionSlug]?.id || null,
        proposed_collection_role: target.role,
        classification_reason: `Ambiguous match for ${target.label} — owner must choose.`,
        warnings: [`${resolved.products.length} candidate products`],
        confidence: 'low',
        match_status: 'ambiguous',
        candidate_product_ids: resolved.products.map((p) => p.id),
        report_flags: { ambiguous: true, target_label: target.label },
        content_readiness_recommendation: null,
        owner_decision_status: 'pending',
      });
      return;
    }

    const product = resolved.products[0];
    claimed.add(product.id);
    const readiness = assessContentReadiness(product);
    const descWarnings = assessDescriptionIssues(product, descIndex);
    const priceWarnings = assessPricingIssues(product);
    const warnings = [
      ...(target.notes || []),
      ...descWarnings,
      ...priceWarnings,
    ];
    if (!product.is_published) warnings.push('Not published (proposal only — Phase 1A will not publish)');
    if (product.sell_online === false) warnings.push('sell_online is false');

    const report_flags = {
      description_issue: descWarnings.length > 0,
      pricing_issue: priceWarnings.length > 0,
      content_readiness: readiness.recommendation,
      gongura_do_not_publish: target.label === 'Gongura Pickle',
    };

    proposals.push({
      product_id: product.id,
      unmatched_label: null,
      proposed_tier: target.tier,
      proposed_collection_id: collectionsBySlug[target.collectionSlug]?.id || null,
      proposed_collection_role: target.role,
      classification_reason: `Approved ${target.tier} list → ${target.collectionSlug} (${target.role})`,
      warnings,
      confidence: computeConfidence({ matchStatus: 'matched', warnings, product }),
      match_status: 'matched',
      candidate_product_ids: [],
      report_flags,
      content_readiness_recommendation: readiness.recommendation,
      owner_decision_status: 'pending',
      _product: product,
      _readiness: readiness,
    });
  };

  HERO_TARGETS.forEach(handleTarget);
  CORE_TARGETS.forEach(handleTarget);

  const specialById = new Map();
  for (const target of SPECIAL_OIL_TARGETS) {
    const resolved = resolveExactMatches(list, target);
    resolution.push({
      label: target.label,
      tier: 'special_oil',
      status: resolved.status,
      candidates: resolved.products.map((p) => ({ id: p.id, slug: p.slug, name: p.name })),
    });
    if (resolved.status === 'matched') {
      specialById.set(resolved.products[0].id, { target, product: resolved.products[0] });
    } else if (resolved.status === 'unmatched') {
      proposals.push({
        product_id: null,
        unmatched_label: target.label,
        proposed_tier: null,
        proposed_collection_id: null,
        proposed_collection_role: null,
        classification_reason: `Unmatched special oil: ${target.label}`,
        warnings: ['No exact ID/slug/name match', target.reason],
        confidence: 'low',
        match_status: 'unmatched',
        candidate_product_ids: [],
        report_flags: { special_oil: true, unmatched: true },
        content_readiness_recommendation: null,
        owner_decision_status: 'pending',
      });
    } else {
      proposals.push({
        product_id: null,
        unmatched_label: target.label,
        proposed_tier: null,
        proposed_collection_id: null,
        proposed_collection_role: null,
        classification_reason: `Ambiguous special oil: ${target.label}`,
        warnings: [`${resolved.products.length} candidates`, target.reason],
        confidence: 'low',
        match_status: 'ambiguous',
        candidate_product_ids: resolved.products.map((p) => p.id),
        report_flags: { special_oil: true, ambiguous: true },
        content_readiness_recommendation: null,
        owner_decision_status: 'pending',
      });
    }
  }

  for (const product of list) {
    if (claimed.has(product.id)) continue;
    const special = specialById.get(product.id);
    const descWarnings = assessDescriptionIssues(product, descIndex);
    const priceWarnings = assessPricingIssues(product);
    const base = classifyRemaining(product, { isSpecialOil: Boolean(special) });
    const warnings = [
      ...base.warnings,
      ...descWarnings,
      ...priceWarnings,
      ...(special ? [special.target.reason, 'requires_owner_review'] : []),
    ];

    proposals.push({
      product_id: product.id,
      unmatched_label: null,
      proposed_tier: base.proposed_tier,
      proposed_collection_id: null,
      proposed_collection_role: null,
      classification_reason: base.classification_reason,
      warnings,
      confidence: computeConfidence({
        matchStatus: base.match_status,
        warnings,
        product,
      }),
      match_status: base.match_status,
      candidate_product_ids: [],
      report_flags: {
        description_issue: descWarnings.length > 0,
        pricing_issue: priceWarnings.length > 0,
        special_oil: Boolean(special),
        requires_owner_review: Boolean(special),
      },
      content_readiness_recommendation: null,
      owner_decision_status: 'pending',
      _product: product,
    });
  }

  const summary = {
    total_products: list.length,
    proposal_rows: proposals.length,
    hero: proposals.filter((p) => p.proposed_tier === 'hero').length,
    core: proposals.filter((p) => p.proposed_tier === 'core').length,
    local_store: proposals.filter((p) => p.proposed_tier === 'local_store').length,
    hidden: proposals.filter((p) => p.proposed_tier === 'hidden').length,
    pending_null_tier: proposals.filter((p) => p.proposed_tier == null && p.match_status !== 'unmatched').length,
    unmatched: proposals.filter((p) => p.match_status === 'unmatched').length,
    ambiguous: proposals.filter((p) => p.match_status === 'ambiguous').length,
    special_oils: proposals.filter((p) => p.report_flags?.special_oil).length,
    description_issues: proposals.filter((p) => p.report_flags?.description_issue).length,
    pricing_issues: proposals.filter((p) => p.report_flags?.pricing_issue).length,
  };

  return { proposals, resolution, summary };
}

export function proposalsToPersistRows(proposals, auditRunId) {
  return proposals.map((p) => ({
    audit_run_id: auditRunId,
    product_id: p.product_id,
    proposed_tier: p.proposed_tier,
    proposed_collection_id: p.proposed_collection_id,
    proposed_collection_role: p.proposed_collection_role,
    classification_reason: p.classification_reason,
    warnings: p.warnings || [],
    confidence: p.confidence,
    match_status: p.match_status,
    candidate_product_ids: p.candidate_product_ids || [],
    unmatched_label: p.unmatched_label,
    report_flags: p.report_flags || {},
    content_readiness_recommendation: p.content_readiness_recommendation,
    owner_decision_status: 'pending',
    generated_at: new Date().toISOString(),
  }));
}

export function filterProposals(proposals, filterKey) {
  const list = proposals || [];
  switch (filterKey) {
    case 'hero':
      return list.filter((p) => p.proposed_tier === 'hero');
    case 'core':
      return list.filter((p) => p.proposed_tier === 'core');
    case 'local_store':
      return list.filter((p) => p.proposed_tier === 'local_store');
    case 'hidden':
      return list.filter((p) => p.proposed_tier === 'hidden');
    case 'pending':
      return list.filter((p) => p.owner_decision_status === 'pending');
    case 'unmatched':
      return list.filter((p) => p.match_status === 'unmatched');
    case 'ambiguous':
      return list.filter((p) => p.match_status === 'ambiguous');
    case 'special_oils':
      return list.filter((p) => p.report_flags?.special_oil || p.match_status === 'special_review');
    case 'description':
      return list.filter((p) => p.report_flags?.description_issue);
    case 'pricing':
      return list.filter((p) => p.report_flags?.pricing_issue);
    case 'content_readiness':
      return list.filter((p) => p.proposed_tier === 'hero' || p.proposed_tier === 'core');
    default:
      return list;
  }
}

export function proposalsToCsv(rows) {
  const headers = [
    'proposal_id',
    'product_id',
    'product_name',
    'product_slug',
    'proposed_tier',
    'collection_slug',
    'collection_role',
    'match_status',
    'confidence',
    'owner_decision_status',
    'classification_reason',
    'warnings',
    'content_readiness_recommendation',
    'unmatched_label',
  ];
  const escape = (v) => {
    const s = v == null ? '' : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push([
      r.id,
      r.product_id,
      r.product?.name || r.products?.name || '',
      r.product?.slug || r.products?.slug || '',
      r.proposed_tier,
      r.collection?.slug || r.merchandising_collections?.slug || '',
      r.proposed_collection_role,
      r.match_status,
      r.confidence,
      r.owner_decision_status,
      r.classification_reason,
      Array.isArray(r.warnings) ? r.warnings.join(' | ') : '',
      r.content_readiness_recommendation,
      r.unmatched_label,
    ].map(escape).join(','));
  }
  return lines.join('\n');
}
