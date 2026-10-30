import { extractPricingMetaFromVariants } from '@/lib/productPricingMeta';
import { isPricingMetaVariant } from '@/lib/productPricingMeta';
import { parseProductVariants } from '@/lib/productStockUtils';
import { getComboLineImage, getComboProductTitle, isComboLineUnavailable } from '@/lib/comboDisplayUtils';
import { getProductPath } from '@/lib/productUrls';

export const PRODUCT_KINDS = {
  INDIVIDUAL: 'individual_product',
  TRUE_MIX: 'true_mix',
  BUNDLE_COMBO: 'bundle_combo',
  GIFT_BOX: 'gift_box',
};

export function isSellableBundleProduct(product = {}) {
  const kind = String(product?.product_kind || '').trim();
  if (kind === PRODUCT_KINDS.BUNDLE_COMBO || kind === PRODUCT_KINDS.GIFT_BOX) return true;
  const group = String(product?.product_group || '').trim();
  return group === 'packaged_combo' || product?.inventory_mode === 'prepacked_stock';
}

export function quantityToGrams(quantityValue, quantityUnit = 'g') {
  const value = Number(quantityValue);
  if (!Number.isFinite(value) || value < 0) return 0;
  const unit = String(quantityUnit || 'g').toLowerCase();
  if (unit === 'kg') return value * 1000;
  if (unit === 'g') return value;
  return 0;
}

export function formatQuantityLabel(quantityValue, quantityUnit = 'g', packCount = 1) {
  const qty = Number(quantityValue);
  const packs = Math.max(1, Number(packCount) || 1);
  if (!Number.isFinite(qty)) return '';
  const unit = String(quantityUnit || 'g');
  const qtyPart = unit === 'g' || unit === 'kg' || unit === 'ml' || unit === 'l'
    ? `${qty} ${unit}`
    : `${qty} ${unit}`;
  if (packs > 1) return `${qtyPart} × ${packs} packs`;
  return `${qtyPart} × 1 pack`;
}

export function formatNetWeightLabel(grams) {
  const g = Number(grams);
  if (!Number.isFinite(g) || g <= 0) return '';
  if (g >= 1000) {
    const kg = g / 1000;
    return Number.isInteger(kg) ? `${kg} kg` : `${kg.toFixed(2).replace(/\.?0+$/, '')} kg`;
  }
  return `${Math.round(g)} g`;
}

export function sumBundleNetWeightGrams(items = []) {
  return (Array.isArray(items) ? items : []).reduce((sum, row) => {
    if (row?.is_active === false) return sum;
    const packs = Math.max(1, Number(row.pack_count) || 1);
    return sum + quantityToGrams(row.quantity_value, row.quantity_unit) * packs;
  }, 0);
}

export function buildBundleDisplayLines(bundle = null, productsById = new Map()) {
  if (!bundle) return [];
  const items = Array.isArray(bundle.items) ? bundle.items : [];
  return items
    .filter((row) => row && row.is_active !== false)
    .sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0))
    .map((row) => {
      const product = productsById.get(row.product_id) || row.product || null;
      const title = row.component_title_snapshot || getComboProductTitle(product) || 'Product';
      const packs = Math.max(1, Number(row.pack_count) || 1);
      const quantityLabel = formatQuantityLabel(row.quantity_value, row.quantity_unit, packs);
      const priced = resolveBundleLineRetail(
        product,
        row.quantity_value,
        row.quantity_unit || 'g',
        packs,
      );
      const variant = priced.variant;
      const rawVariantLabel = priced.priceBasisLabel
        || variant?.label
        || (row.component_variant_sku ? String(row.component_variant_sku) : null);
      // Skip labels that only repeat the pack size already in quantityLabel (e.g. "200g").
      const variantLabel = (() => {
        if (priced.matchMode === 'covering' && priced.priceBasisLabel) {
          return priced.priceBasisLabel;
        }
        const label = String(rawVariantLabel || '').trim();
        if (!label) return null;
        const qtyNorm = String(quantityLabel || '').toLowerCase().replace(/\s+/g, '');
        const labelNorm = label.toLowerCase().replace(/\s+/g, '');
        if (!labelNorm) return null;
        if (qtyNorm.includes(labelNorm)) return null;
        const qtyCore = qtyNorm.replace(/×.*$/, '');
        if (labelNorm === qtyCore || qtyCore.includes(labelNorm) || labelNorm.includes(qtyCore)) return null;
        return label;
      })();
      const unavailable = product ? isComboLineUnavailable(product) : true;
      const archived = Boolean(
        product?.slug?.includes('-archived-')
        || (product?.indexable === false
          && product?.is_published === false
          && String(product?.slug || '').includes('archived')),
      );
      const missingLinked = !product?.id;
      const linkDisabled = missingLinked || archived || !product?.slug;
      const canLink = Boolean(product?.slug && !archived && product.is_published !== false);
      return {
        id: row.id || `${row.product_id}-${row.sort_order}`,
        productId: row.product_id,
        product,
        title,
        quantityLabel,
        quantityValue: Number(row.quantity_value) || 0,
        quantityUnit: row.quantity_unit || 'g',
        packCount: packs,
        variantLabel,
        variantSku: variant?.sku || row.component_variant_sku || '',
        linePriceRs: priced.hasPrice ? priced.lineTotal : null,
        matchMode: priced.matchMode,
        required: row.is_required !== false,
        substitutionAllowed: row.substitution_allowed === true,
        imageUrl: getComboLineImage(product, variant),
        href: canLink ? getProductPath(product) : null,
        unavailable,
        archived,
        missingLinked,
        linkDisabled,
        netWeightGrams: quantityToGrams(row.quantity_value, row.quantity_unit) * packs,
      };
    });
}

export function getPurchaseRatePerKg(product = {}) {
  const meta = extractPricingMetaFromVariants(product.quick_variants || product.variants || []);
  const rate = Number(meta.purchase_rate_per_kg ?? product.purchase_rate_per_kg);
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

/** Component food cost from purchase rate × included kg (not retail selling price). */
export function estimateComponentFoodCostRs(product, quantityValue, quantityUnit, packCount = 1) {
  const rate = getPurchaseRatePerKg(product);
  if (rate == null) return null;
  const grams = quantityToGrams(quantityValue, quantityUnit) * Math.max(1, Number(packCount) || 1);
  return (rate * grams) / 1000;
}

export function summarizeBundleCosts({
  lines = [],
  productsById = new Map(),
  outerPackagingCostPaise = 0,
  proposedSellingPrice = 0,
  maxDiscountPct = 20,
} = {}) {
  let foodCostSum = 0;
  let foodCostKnown = true;
  let packagingCostSum = 0;
  let packagingKnown = true;

  lines.forEach((line) => {
    const product = productsById.get(line.product_id || line.productId) || line.product;
    const food = estimateComponentFoodCostRs(
      product,
      line.quantity_value ?? line.quantityValue,
      line.quantity_unit ?? line.quantityUnit,
      line.pack_count ?? line.packCount,
    );
    if (food == null) foodCostKnown = false;
    else foodCostSum += food;

    // Packaging BOM links are often missing; treat unknown as 0 but flag.
    const packPaise = Number(product?.packaging_cost_paise);
    if (Number.isFinite(packPaise) && packPaise > 0) packagingCostSum += packPaise / 100;
    else packagingKnown = false;
  });

  const outerRs = Math.max(0, Number(outerPackagingCostPaise) || 0) / 100;
  const landed = foodCostSum + packagingCostSum + outerRs;
  const sell = Number(proposedSellingPrice) || 0;
  const grossProfit = sell > 0 && foodCostKnown ? sell - landed : null;
  const grossMargin = sell > 0 && foodCostKnown && landed >= 0 ? ((sell - landed) / sell) * 100 : null;
  const maxSafeDiscount = sell > 0 && foodCostKnown && landed > 0
    ? Math.max(0, Math.min(maxDiscountPct, ((sell - landed) / sell) * 100))
    : null;

  return {
    componentFoodCostRs: foodCostSum,
    componentFoodCostKnown: foodCostKnown,
    componentPackagingCostRs: packagingCostSum,
    componentPackagingKnown: packagingKnown,
    outerPackagingCostRs: outerRs,
    totalLandedCostRs: landed,
    proposedSellingPriceRs: sell,
    grossProfitRs: grossProfit,
    grossMarginPct: grossMargin,
    maximumSafeDiscountPct: maxSafeDiscount,
  };
}

export function validateBundleForSave(bundle = {}, items = []) {
  const errors = [];
  const active = (Array.isArray(items) ? items : []).filter((row) => row && row.is_active !== false);

  if (active.length < 2 && bundle.bundle_status !== 'unresolved') {
    errors.push('Every bundle must contain at least 2 products.');
  }

  const seen = new Set();
  active.forEach((row, index) => {
    const pid = row.product_id || row.productId;
    if (!pid) errors.push(`Row ${index + 1}: select a catalogue product.`);
    if (pid && seen.has(pid)) errors.push('Duplicate component products are not allowed.');
    if (pid) seen.add(pid);
    const qty = Number(row.quantity_value ?? row.quantityValue);
    const unit = String(row.quantity_unit || row.quantityUnit || '').trim();
    if (!Number.isFinite(qty) || qty <= 0) errors.push(`Row ${index + 1}: quantity is required.`);
    if (!unit) errors.push(`Row ${index + 1}: quantity unit is required.`);
  });

  const computed = sumBundleNetWeightGrams(active);
  const declared = Number(bundle.total_net_weight_g);
  if (Number.isFinite(declared) && declared > 0 && Math.abs(declared - computed) > 0.5) {
    errors.push(`Total weight (${declared} g) must equal component sum (${computed} g).`);
  }

  return errors;
}

export function validateBundleForPublish(product = {}, bundle = {}, items = []) {
  const errors = [...validateBundleForSave(bundle, items)];
  const active = (Array.isArray(items) ? items : []).filter((row) => row && row.is_active !== false);

  if (bundle.has_unresolved_components || bundle.bundle_status === 'unresolved') {
    errors.push('Bundle cannot publish while unresolved components exist.');
  }
  if (Number(product.price) <= 0) {
    errors.push('Bundle cannot publish with price 0.');
  }
  if (
    (bundle.inventory_mode || product.inventory_mode) === 'prepacked_stock'
    && Number(product.stock ?? product.stock_quantity) <= 0
    && product.subject_to_availability !== true
  ) {
    errors.push('Bundle cannot publish with stock 0 under prepacked mode.');
  }
  if (active.length < 2) {
    errors.push('Bundle cannot publish without a customer-facing breakdown (at least 2 components).');
  }
  if (!(product.title || product.name)) {
    errors.push('Bundle cannot publish without a parent product title.');
  }
  if (!String(product.slug || '').trim()) {
    errors.push('Bundle cannot publish without a parent product slug (customer PDP URL).');
  }
  if (String(product.product_kind) === PRODUCT_KINDS.TRUE_MIX) {
    if (product.composition_status !== 'confirmed') {
      errors.push('True mix cannot publish without confirmed ingredients.');
    }
  }
  active.forEach((row) => {
    const productRow = row.product;
    if (!row.product_id && !row.productId) {
      errors.push('Every component must link to a catalogue product before publish.');
    }
    if (productRow?.slug?.includes('-archived-')) {
      errors.push(`Archived component flagged: ${productRow.slug}`);
    }
  });

  return errors;
}

/** Non-blocking admin warnings for combo editor (drafts may still save). */
export function getBundleEditorWarnings(product = {}, bundle = {}, items = [], productsById = new Map()) {
  const warnings = [];
  const active = (Array.isArray(items) ? items : []).filter((row) => row && row.is_active !== false);

  if (!(product.title || product.name)) warnings.push('Missing parent product title.');
  if (!String(product.slug || '').trim()) warnings.push('Missing parent product slug — no customer PDP URL.');
  if (!(product.hero_image || product.featured_image_url || product.image_url)) {
    warnings.push('Missing parent combo image — storefront will use a component mosaic.');
  }
  if (!active.length) warnings.push('Combo has no customer-facing contents yet.');

  const computed = sumBundleNetWeightGrams(active);
  const declared = Number(bundle.total_net_weight_g ?? product.bundle_total_net_weight_g);
  if (Number.isFinite(declared) && declared > 0 && Math.abs(declared - computed) > 0.5) {
    warnings.push(`Total weight mismatch: declared ${declared} g vs components ${computed} g.`);
  }

  active.forEach((row, index) => {
    const pid = row.product_id || row.productId;
    const linked = productsById.get(pid) || row.product || null;
    if (!pid) warnings.push(`Row ${index + 1}: missing linked product.`);
    else if (!linked) warnings.push(`Row ${index + 1}: linked product not found in catalogue.`);
    else {
      if (String(linked.slug || '').includes('-archived-')) {
        warnings.push(`Row ${index + 1}: component is archived (${linked.slug}).`);
      }
      if (!(linked.hero_image || linked.featured_image_url || linked.image_url || (linked.images || [])[0])) {
        warnings.push(`Row ${index + 1}: missing component image (${linked.title || linked.name || pid}).`);
      }
    }
    const qty = Number(row.quantity_value ?? row.quantityValue);
    const unit = String(row.quantity_unit || row.quantityUnit || '').trim();
    if (!Number.isFinite(qty) || qty <= 0) warnings.push(`Row ${index + 1}: missing quantity.`);
    if (!unit) warnings.push(`Row ${index + 1}: missing unit.`);
  });

  return warnings;
}

export function findVariantSkuForQuantity(product, quantityValue, quantityUnit = 'g') {
  const match = findExactVariantForQuantity(product, quantityValue, quantityUnit);
  return match?.sku || null;
}

function variantGrams(row) {
  const packKg = Number(row?.pack_kg);
  if (Number.isFinite(packKg) && packKg > 0) return Math.round(packKg * 1000);
  const label = String(row?.label || '').toLowerCase().replace(/\s+/g, '');
  const kg = label.match(/^(\d+(?:\.\d+)?)kg$/);
  if (kg) return Math.round(Number(kg[1]) * 1000);
  const g = label.match(/^(\d+(?:\.\d+)?)g$/);
  if (g) return Math.round(Number(g[1]));
  return 0;
}

/**
 * Exact pack match only — no proportional ₹/kg pricing.
 * Matches pack_kg (grams) or common label forms (100g, 250 g, etc.).
 */
export function findExactVariantForQuantity(product, quantityValue, quantityUnit = 'g') {
  const grams = quantityToGrams(quantityValue, quantityUnit);
  if (!grams) return null;
  const variants = parseProductVariants(product).filter((row) => row && !isPricingMetaVariant(row));
  return variants.find((row) => {
    const packGrams = variantGrams(row);
    if (packGrams > 0 && Math.abs(packGrams - grams) < 0.51) return true;
    const label = String(row.label || '').toLowerCase().replace(/\s+/g, '');
    const targets = [
      `${Math.round(grams)}g`,
      `${grams}g`,
    ];
    if (grams >= 1000 && Math.abs(grams % 1000) < 0.51) {
      targets.push(`${Math.round(grams / 1000)}kg`, `${grams / 1000}kg`);
    }
    return targets.some((t) => label === t || label.includes(t));
  }) || null;
}

/**
 * Price one combo line from catalogue packs.
 * 1) Exact pack match
 * 2) Else integer covering packs (e.g. 200g → 2 × 100g) — never proportional ₹/kg
 */
export function resolveBundleLineRetail(product, quantityValue, quantityUnit = 'g', packCount = 1) {
  const grams = quantityToGrams(quantityValue, quantityUnit);
  const outerPacks = Math.max(1, Number(packCount) || 1);
  const empty = {
    hasPrice: false,
    matchMode: 'none',
    unitPrice: null,
    lineTotal: null,
    variant: null,
    coverPacks: 0,
    priceBasisLabel: null,
  };
  if (!product || !grams) return empty;

  const exact = findExactVariantForQuantity(product, quantityValue, quantityUnit);
  const exactPrice = Number(exact?.price);
  if (exact && Number.isFinite(exactPrice) && exactPrice > 0) {
    return {
      hasPrice: true,
      matchMode: 'exact',
      unitPrice: exactPrice,
      lineTotal: exactPrice * outerPacks,
      variant: exact,
      coverPacks: 1,
      priceBasisLabel: exact.label || null,
    };
  }

  const candidates = parseProductVariants(product)
    .filter((row) => row && !isPricingMetaVariant(row))
    .map((row) => ({ row, grams: variantGrams(row), price: Number(row.price) }))
    .filter((row) => (
      row.grams > 0
      && row.grams < grams
      && Number.isFinite(row.price)
      && row.price > 0
      && Math.abs(grams % row.grams) < 0.51
    ));

  let best = null;
  candidates.forEach((candidate) => {
    const coverCount = Math.round(grams / candidate.grams);
    if (coverCount < 2) return;
    const unitPrice = candidate.price * coverCount;
    const score = { coverCount, unitPrice, candidate };
    if (
      !best
      || score.coverCount < best.coverCount
      || (score.coverCount === best.coverCount && score.unitPrice < best.unitPrice)
    ) {
      best = score;
    }
  });

  if (!best) return empty;

  const label = best.candidate.row.label || `${best.candidate.grams}g`;
  return {
    hasPrice: true,
    matchMode: 'covering',
    unitPrice: best.unitPrice,
    lineTotal: best.unitPrice * outerPacks,
    variant: best.candidate.row,
    coverPacks: best.coverCount,
    priceBasisLabel: `${best.coverCount} × ${label}`,
  };
}

/**
 * Customer-facing retail value of a bundle from catalogue pack prices.
 * Exact pack preferred; otherwise integer covering packs (2×100g for 200g).
 * Never uses proportional ₹/kg (pack tiers are non-linear).
 */
export function computeBundleRetailValue({
  bundle = null,
  productsById = new Map(),
  comboSellingPrice = 0,
} = {}) {
  const items = (Array.isArray(bundle?.items) ? bundle.items : [])
    .filter((row) => row && row.is_active !== false);
  const lines = [];
  let separateTotal = 0;
  let allExact = items.length > 0;
  let allPriced = items.length > 0;
  let matchedCount = 0;
  let coveringCount = 0;

  items.forEach((row) => {
    const product = productsById.get(row.product_id) || row.product || null;
    const packs = Math.max(1, Number(row.pack_count) || 1);
    const priced = resolveBundleLineRetail(
      product,
      row.quantity_value,
      row.quantity_unit || 'g',
      packs,
    );
    const hasExact = priced.matchMode === 'exact';
    const hasPrice = priced.hasPrice;
    if (!hasExact) allExact = false;
    if (!hasPrice) allPriced = false;
    else {
      matchedCount += 1;
      if (priced.matchMode === 'covering') coveringCount += 1;
      separateTotal += priced.lineTotal;
    }
    lines.push({
      productId: row.product_id,
      title: row.component_title_snapshot || getComboProductTitle(product),
      quantityLabel: formatQuantityLabel(row.quantity_value, row.quantity_unit, packs),
      hasExactMatch: hasExact,
      hasPrice,
      matchMode: priced.matchMode,
      unitPrice: hasPrice ? priced.unitPrice : null,
      lineTotal: hasPrice ? priced.lineTotal : null,
      variantLabel: priced.priceBasisLabel || priced.variant?.label || null,
      variantSku: priced.variant?.sku || row.component_variant_sku || null,
      priceBasisLabel: priced.priceBasisLabel,
    });
  });

  const comboPrice = Number(comboSellingPrice) || 0;
  const saveAmount = allPriced && comboPrice > 0
    ? Math.max(0, separateTotal - comboPrice)
    : null;
  const savePct = allPriced && separateTotal > 0 && saveAmount != null
    ? (saveAmount / separateTotal) * 100
    : null;
  const hasRealSave = Boolean(allPriced && saveAmount != null && saveAmount > 0);

  const itemCount = Number(bundle?.item_count) || items.length;
  const netWeightG = Number(bundle?.total_net_weight_g) || sumBundleNetWeightGrams(items);

  return {
    lines,
    itemCount,
    netWeightG,
    netWeightLabel: formatNetWeightLabel(netWeightG),
    separateTotalRs: allPriced ? separateTotal : null,
    separateTotalPartialRs: matchedCount ? separateTotal : null,
    allExactMatches: allExact,
    allPriced,
    hasRealSave,
    matchedLineCount: matchedCount,
    coveringLineCount: coveringCount,
    totalLineCount: items.length,
    comboPriceRs: comboPrice > 0 ? comboPrice : null,
    saveAmountRs: hasRealSave ? saveAmount : (allPriced ? 0 : null),
    savePct: hasRealSave ? savePct : null,
    valueLabel: 'If purchased separately',
  };
}

export const BUNDLE_BADGE_OPTIONS = [
  '',
  'Best Value',
  'Family Favourite',
  'Most Popular',
  'Festival Special',
];

export function parsePerfectForTags(value = '') {
  return String(value || '')
    .split(/[\n,|•·]+/)
    .map((part) => part.replace(/^[\s\-✔✓]+/, '').trim())
    .filter(Boolean)
    .slice(0, 8);
}
