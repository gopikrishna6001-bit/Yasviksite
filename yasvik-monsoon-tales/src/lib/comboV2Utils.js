import {
  buildBundleDisplayLines,
  computeBundleRetailValue,
  formatNetWeightLabel,
  formatQuantityLabel,
  isSellableBundleProduct,
  quantityToGrams,
  sumBundleNetWeightGrams,
} from '@/lib/productBundleUtils';
import { getComboLineImage, getComboProductTitle } from '@/lib/comboDisplayUtils';
import { productPrimaryImageUrl } from '@/lib/mediaUrl';
import { getProductPath } from '@/lib/productUrls';
import { formatRupee, getComboValuePresentation } from '@/lib/comboVisualUtils';

export const COMBO_MERCH_CATEGORIES = {
  SEPARATE: 'separate',
  MIXED: 'mixed',
  FREE_GIFT: 'free_gift',
};

export const COMBO_MERCH_LABELS = {
  separate: 'Separate Combos',
  mixed: 'Mixed Combos',
  free_gift: 'Free Gift Combos',
};

export const DISPLAY_GROUP_LABELS = {
  dry_fruits: 'Dry Fruits',
  seeds: 'Seeds',
  nuts: 'Nuts',
  snacks: 'Snacks',
  free_items: 'Free Items',
  other: 'More Items',
};

export const AUDIENCE_LABELS = {
  office: 'Office',
  kids: 'Kids',
  gym: 'Gym',
  parents: 'Parents',
  seniors: 'Senior Citizens',
  travellers: 'Travellers',
  monthly_grocery: 'Monthly Grocery',
  natural_snacking: 'Natural Snacking',
};

const DISPLAY_GROUP_ORDER = ['dry_fruits', 'nuts', 'seeds', 'snacks', 'other', 'free_items'];

function normalizeItemRow(row = {}, productsById = new Map()) {
  const product = productsById.get(row.product_id) || null;
  const rawTitle = row.component_title_snapshot
    || getComboProductTitle(product)
    || 'Included item';
  // Prefer customer-facing "Pista" wording for salted pistachios.
  const title = /pistachio|pista/i.test(rawTitle)
    ? (/\bsalted\b/i.test(rawTitle) || /salted-pista/i.test(product?.slug || '')
      ? 'Salted Pista'
      : rawTitle)
    : rawTitle;
  const quantityLabel = formatQuantityLabel(
    row.quantity_value,
    row.quantity_unit || 'g',
    row.pack_count || 1,
  );
  return {
    id: row.id || `${row.product_id}-${row.item_role || 'included'}`,
    productId: row.product_id,
    title,
    slug: product?.slug || null,
    href: product?.id ? getProductPath(product) : null,
    quantityValue: row.quantity_value,
    quantityUnit: row.quantity_unit,
    packCount: row.pack_count || 1,
    quantityLabel,
    variantSku: row.component_variant_sku || null,
    imageUrl: getComboLineImage(product, row.component_variant_sku) || productPrimaryImageUrl(product),
    itemRole: row.item_role || 'included',
    displayGroup: row.display_group || inferDisplayGroup(product, title),
    giftWorthPaise: row.gift_worth_paise ?? null,
    product,
  };
}

function inferDisplayGroup(product, title = '') {
  const hay = `${product?.category_name || ''} ${product?.name || ''} ${title}`.toLowerCase();
  if (/seed|chia|flax|sabja|halim|sunflower|pumpkin|watermelon|sesame/.test(hay)) return 'seeds';
  if (/almond|cashew|walnut|pista|nut|makhana/.test(hay)) return 'nuts';
  if (/raisin|anjeer|fig|date|dry fruit/.test(hay)) return 'dry_fruits';
  if (/chikki|cookie|snack|murukku/.test(hay)) return 'snacks';
  return 'other';
}

export function bundleHasCustomerOptions(bundle = {}) {
  return Boolean(
    bundle?.has_customer_options
    || (bundle?.option_groups || []).length > 0,
  );
}

export function getDefaultOptionChoice(bundle = {}) {
  const groups = bundle?.option_groups || [];
  if (!groups.length) return null;
  const group = groups[0];
  const choices = (group?.choices || []).filter((row) => row.is_active !== false);
  return choices.find((row) => row.is_default) || choices[0] || null;
}

export function findOptionChoice(bundle = {}, choiceId = null, choiceSlug = null) {
  if (!choiceId && !choiceSlug) return getDefaultOptionChoice(bundle);
  for (const group of bundle?.option_groups || []) {
    for (const choice of group?.choices || []) {
      if (choice.is_active === false) continue;
      if (choiceId && choice.id === choiceId) return choice;
      if (choiceSlug && choice.slug === choiceSlug) return choice;
    }
  }
  return getDefaultOptionChoice(bundle);
}

export function resolveActiveBundleItems(bundle = {}, choice = null) {
  if (bundleHasCustomerOptions(bundle) && choice) {
    return (choice.items || []).filter((row) => row.is_active !== false);
  }
  return (bundle?.items || []).filter((row) => row.is_active !== false);
}

export function resolveActiveGiftRules(bundle = {}, choice = null) {
  const bundleGifts = (bundle?.gift_rules || []).filter((row) => row.is_enabled !== false);
  const choiceGifts = (choice?.gift_rules || []).filter((row) => row.is_enabled !== false);
  if (bundleHasCustomerOptions(bundle) && choice) {
    return [...choiceGifts, ...bundleGifts];
  }
  return bundleGifts;
}

export function buildComboLineRows(bundle = {}, productsById = new Map(), choice = null) {
  const items = resolveActiveBundleItems(bundle, choice);
  const gifts = resolveActiveGiftRules(bundle, choice);

  const included = items
    .filter((row) => (row.item_role || 'included') !== 'free_gift')
    .map((row) => normalizeItemRow(row, productsById));

  const giftLinesFromItems = items
    .filter((row) => row.item_role === 'free_gift')
    .map((row) => normalizeItemRow(row, productsById));

  const giftLinesFromRules = gifts.map((rule) => normalizeItemRow({
    ...rule,
    item_role: 'free_gift',
    quantity_value: rule.quantity_value ?? 1,
    quantity_unit: rule.quantity_unit || 'pack',
    pack_count: rule.pack_count || 1,
    gift_worth_paise: rule.worth_paise,
    component_title_snapshot: rule.badge_text ? `${rule.badge_text}` : null,
  }, productsById));

  const freeGifts = [...giftLinesFromItems, ...giftLinesFromRules];
  return { included, freeGifts, all: [...included, ...freeGifts] };
}

export function groupComboLines(lines = []) {
  const buckets = new Map();
  for (const line of lines) {
    const key = line.displayGroup || 'other';
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(line);
  }
  return DISPLAY_GROUP_ORDER
    .filter((key) => buckets.has(key))
    .map((key) => ({
      key,
      label: DISPLAY_GROUP_LABELS[key] || key,
      lines: buckets.get(key),
    }));
}

export function resolveComboPresentation(bundle = {}, parentProduct = {}, choice = null) {
  const parent = parentProduct || bundle?.parent_product || {};
  const productsById = new Map((bundle?.products || []).map((row) => [row.id, row]));
  const { included, freeGifts, all } = buildComboLineRows(bundle, productsById, choice);

  // Count every line the customer receives, including free gifts
  // (e.g. 20 Item Variety = 19 + mini chikki; Five Dry Fruits = 4 + free seeds).
  const declaredCount = Number(
    choice?.item_count
    ?? bundle?.item_count
    ?? parent?.bundle_item_count
  ) || 0;
  const itemCount = all.length || declaredCount;
  const netWeightG = choice?.net_weight_g
    || bundle?.total_net_weight_g
    || parent?.bundle_net_weight_g
    || sumBundleNetWeightGrams(resolveActiveBundleItems(bundle, choice));

  const priceRs = choice?.price_override_paise != null
    ? Number(choice.price_override_paise) / 100
    : Number(parent.price) || 0;

  const workingBundle = {
    ...bundle,
    items: resolveActiveBundleItems(bundle, choice),
    products: bundle?.products || [],
    item_count: itemCount,
    total_net_weight_g: netWeightG,
  };

  const retail = computeBundleRetailValue({
    bundle: workingBundle,
    productsById,
    comboSellingPrice: priceRs,
  });

  const cardGift = freeGifts.find((row) => row.itemRole === 'free_gift') || freeGifts[0] || null;
  const heroImage = choice?.hero_image_url
    || parent.hero_image
    || parent.featured_image_url
    || (choice?.gallery_urls || [])[0]
    || null;

  const gallery = [
    ...(choice?.gallery_urls || []),
    ...(parent.images || []),
    parent.hero_image,
    parent.featured_image_url,
  ].filter(Boolean);

  return {
    choice,
    choiceLabel: choice?.label || null,
    choiceSlug: choice?.slug || null,
    purposeLabel: bundle?.purpose_label || parent.yasvik_mark || '',
    audienceTags: bundle?.audience_tags || normalizeAudienceTags(parent.best_for),
    merchCategory: bundle?.combo_merch_category || null,
    itemCount,
    netWeightG,
    netWeightLabel: formatNetWeightLabel(netWeightG),
    priceRs,
    heroImage,
    gallery: [...new Set(gallery)],
    includedPreview: all.slice(0, 2).map((row) => row.title),
    includedMoreCount: Math.max(0, all.length - 2),
    hasFreeGift: freeGifts.length > 0,
    freeGiftBadge: cardGift?.title || null,
    freeGifts,
    groupedIncluded: groupComboLines(included),
    groupedAll: groupComboLines(all),
    value: getComboValuePresentation({
      comboPrice: priceRs,
      separateTotalRs: retail.separateTotalRs,
      allExactMatches: retail.allExactMatches,
      allPriced: retail.allPriced,
      hasRealSave: retail.hasRealSave,
      saveAmountRs: retail.saveAmountRs,
      savePct: retail.savePct,
    }),
    worthPaise: bundle?.worth_paise ?? (retail.separateTotalRs ? Math.round(retail.separateTotalRs * 100) : null),
  };
}

export function normalizeAudienceTags(bestFor = '') {
  if (Array.isArray(bestFor)) return bestFor.filter(Boolean);
  const text = String(bestFor || '').toLowerCase();
  const tags = [];
  if (/office/.test(text)) tags.push('office');
  if (/kid|child/.test(text)) tags.push('kids');
  if (/gym|fitness|protein/.test(text)) tags.push('gym');
  if (/parent|family/.test(text)) tags.push('parents');
  if (/senior|elder/.test(text)) tags.push('seniors');
  if (/travel/.test(text)) tags.push('travellers');
  if (/month|pantry|grocery/.test(text)) tags.push('monthly_grocery');
  if (/snack/.test(text)) tags.push('natural_snacking');
  return tags;
}

export function getComboCartKey(parentProductId, choice = null) {
  if (!choice?.id) return null;
  return `combo_opt__${parentProductId}__${choice.id}`;
}

export function buildComboV2CartSnapshot({
  parentProduct = {},
  bundle = null,
  choice = null,
} = {}) {
  if (!isSellableBundleProduct(parentProduct)) return null;
  const presentation = resolveComboPresentation(bundle, parentProduct, choice);
  const productsById = new Map((bundle?.products || []).map((row) => [row.id, row]));
  const workingBundle = {
    ...(bundle || {}),
    items: resolveActiveBundleItems(bundle, choice),
    products: bundle?.products || [],
    item_count: presentation.itemCount,
    total_net_weight_g: presentation.netWeightG,
  };
  const lines = buildBundleDisplayLines(workingBundle, productsById);

  const contents = presentation.all.map((line) => ({
    id: line.id,
    productId: line.productId,
    title: line.title,
    slug: line.slug,
    href: line.href,
    quantityValue: line.quantityValue,
    quantityUnit: line.quantityUnit,
    packCount: line.packCount,
    quantityLabel: line.quantityLabel,
    variantSku: line.variantSku,
    imageUrl: line.imageUrl,
    itemRole: line.itemRole,
    displayGroup: line.displayGroup,
    isFreeGift: line.itemRole === 'free_gift',
    giftWorthPaise: line.giftWorthPaise,
  }));

  return {
    isBundle: true,
    isComboV2: true,
    productKind: parentProduct.product_kind || 'bundle_combo',
    productGroup: parentProduct.product_group || 'packaged_combo',
    inventoryMode: parentProduct.inventory_mode || bundle?.inventory_mode || 'prepacked_stock',
    yasvikMark: presentation.purposeLabel || parentProduct.yasvik_mark || '',
    title: parentProduct.title || parentProduct.name || bundle?.bundle_name || null,
    productSlug: parentProduct.slug || bundle?.bundle_slug || null,
    href: getProductPath(parentProduct),
    imageUrl: presentation.heroImage,
    mosaicUrls: presentation.gallery.slice(0, 4),
    shortDescription: String(parentProduct.short_description || bundle?.bundle_description || '').split('\n')[0].trim(),
    price: presentation.priceRs,
    bundleItemCount: presentation.itemCount,
    bundleNetWeightG: presentation.netWeightG,
    bundleMetaLine: [
      presentation.itemCount ? `${presentation.itemCount} items` : null,
      presentation.netWeightLabel,
    ].filter(Boolean).join(' · '),
    bundleContents: contents,
    comboOption: choice ? {
      id: choice.id,
      label: choice.label,
      slug: choice.slug,
    } : null,
    freeGifts: presentation.freeGifts.map((row) => ({
      productId: row.productId,
      title: row.title,
      quantityLabel: row.quantityLabel,
      imageUrl: row.imageUrl,
      worthPaise: row.giftWorthPaise,
    })),
    purposeLabel: presentation.purposeLabel,
    merchCategory: presentation.merchCategory,
    worthLabel: presentation.value.worthLabel,
    saveLabel: presentation.value.saveLabel,
  };
}

export function partitionBundlesByMerchCategory(bundles = []) {
  const buckets = {
    separate: [],
    mixed: [],
    free_gift: [],
    other: [],
  };
  for (const row of bundles) {
    const key = row?.combo_merch_category;
    if (key && buckets[key]) buckets[key].push(row);
    else buckets.other.push(row);
  }
  return buckets;
}
