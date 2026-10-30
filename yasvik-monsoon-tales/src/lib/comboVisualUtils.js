import {
  formatNetWeightLabel,
  computeBundleRetailValue,
  isSellableBundleProduct,
  buildBundleDisplayLines,
  formatQuantityLabel,
  quantityToGrams,
  sumBundleNetWeightGrams,
} from '@/lib/productBundleUtils';
import { getComboLineImage } from '@/lib/comboDisplayUtils';
import { productPrimaryImageUrl } from '@/lib/mediaUrl';
import { formatDisplayTitle } from '@/lib/formatDisplayTitle';
import { getProductPath } from '@/lib/productUrls';

export function formatComboMetaLine({ itemCount, netWeightG, netWeightLabel } = {}) {
  const count = Number(itemCount) || 0;
  const weight = netWeightLabel || formatNetWeightLabel(netWeightG);
  const parts = [];
  if (count > 0) parts.push(`${count} product${count === 1 ? '' : 's'}`);
  if (weight) parts.push(weight);
  return parts.join(' · ');
}

export function formatRupee(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

/**
 * Single primary savings message for cards/PDP.
 * Hide when price is 0, incomplete pack pricing, or no real save.
 */
export function getComboValuePresentation({
  comboPrice,
  separateTotalRs,
  allExactMatches,
  allPriced,
  hasRealSave,
  saveAmountRs,
  savePct,
} = {}) {
  const price = Number(comboPrice);
  if (!Number.isFinite(price) || price <= 0) {
    return { showSavings: false, priceLabel: price === 0 ? 'Price soon' : null };
  }
  const priced = allPriced != null ? Boolean(allPriced) : Boolean(allExactMatches);
  const worth = priced ? Number(separateTotalRs) : null;
  const save = priced ? Number(saveAmountRs) : null;
  const showSavings = Boolean(
    (hasRealSave != null ? hasRealSave : priced)
    && Number.isFinite(worth)
    && worth > price
    && Number.isFinite(save)
    && save > 0,
  );
  return {
    showSavings,
    priceLabel: formatRupee(price),
    worthLabel: showSavings ? formatRupee(worth) : null,
    saveLabel: showSavings ? `Save ${formatRupee(save)}` : null,
    savePctLabel: showSavings && Number(savePct) >= 1
      ? `${Math.round(savePct)}% better value`
      : null,
    saveAmount: showSavings ? Math.round(save) : null,
    separateTotalRs: priced && Number.isFinite(worth) ? Math.round(worth) : null,
  };
}

export function valueFromBundleAndParent(bundle, parentProduct) {
  if (!bundle) {
    return getComboValuePresentation({ comboPrice: parentProduct?.price });
  }
  const productsById = new Map((bundle.products || []).map((row) => [row.id, row]));
  const retail = computeBundleRetailValue({
    bundle,
    productsById,
    comboSellingPrice: parentProduct?.price ?? bundle.parent_product?.price,
  });
  return {
    retail,
    presentation: getComboValuePresentation({
      comboPrice: parentProduct?.price ?? bundle.parent_product?.price,
      separateTotalRs: retail.separateTotalRs,
      allExactMatches: retail.allExactMatches,
      allPriced: retail.allPriced,
      hasRealSave: retail.hasRealSave,
      saveAmountRs: retail.saveAmountRs,
      savePct: retail.savePct,
    }),
  };
}

/** Parent combo image priority: hero → featured → bundle mosaic → null. */
export function resolveComboParentImage(parentProduct = {}, bundle = null) {
  const parentHero = productPrimaryImageUrl(parentProduct);
  if (parentHero) return parentHero;

  const bundleHero = productPrimaryImageUrl(bundle || {})
    || bundle?.hero_image
    || bundle?.featured_image_url
    || '';
  if (bundleHero) return bundleHero;

  const mosaic = getComboMosaicUrls({
    ...parentProduct,
    products: bundle?.products || parentProduct?.bundleProducts || [],
  }, 1);
  return mosaic[0] || null;
}

/** Component image priority: variant → hero → gallery → null. */
export function resolveComboComponentImage(product = {}, variant = null) {
  return getComboLineImage(product, variant) || productPrimaryImageUrl(product, variant) || null;
}

/** Up to 4 image URLs for mosaic fallback (components or parent hero). */
export function getComboMosaicUrls(productOrBundle = {}, limit = 4) {
  const products = productOrBundle.products
    || productOrBundle.bundleProducts
    || productOrBundle.componentProducts
    || [];
  const fromComponents = products
    .map((row) => resolveComboComponentImage(row) || productPrimaryImageUrl(row))
    .filter(Boolean);
  if (fromComponents.length) return fromComponents.slice(0, limit);

  const hero = productPrimaryImageUrl(productOrBundle)
    || productOrBundle.hero_image
    || productOrBundle.featured_image_url;
  return hero ? [hero] : [];
}

export function isCartBundleLine(item = {}) {
  if (!item) return false;
  if (item.type === 'combo' || item.isBundle === true) return true;
  return isSellableBundleProduct({
    product_kind: item.productKind,
    product_group: item.productGroup,
    inventory_mode: item.inventoryMode,
  });
}

export function getParentComboTitle(parentProduct = {}, bundle = null) {
  const raw = parentProduct?.title || parentProduct?.name || bundle?.bundle_name || '';
  const title = formatDisplayTitle(raw);
  if (!title) {
    if (parentProduct?.id || bundle?.parent_product_id) {
      console.warn('[combo] Missing parent product title', {
        productId: parentProduct?.id || bundle?.parent_product_id,
        slug: parentProduct?.slug || bundle?.bundle_slug,
      });
    }
    return '';
  }
  return title;
}

/** Compact “Includes: A, B, C +N more” for shop cards. */
export function formatComboIncludesPreview(bundle = null, limit = 3) {
  const productsById = new Map((bundle?.products || []).map((row) => [row.id, row]));
  const lines = buildBundleDisplayLines(bundle, productsById);
  if (!lines.length) return '';
  const names = lines.slice(0, limit).map((row) => row.title).filter(Boolean);
  const more = Math.max(0, lines.length - names.length);
  if (!names.length) return '';
  return more > 0
    ? `Includes: ${names.join(', ')} +${more} more`
    : `Includes: ${names.join(', ')}`;
}

export function formatScaledComponentQuantity({
  quantityValue,
  quantityUnit = 'g',
  packCount = 1,
  comboQty = 1,
} = {}) {
  const packs = Math.max(1, Number(packCount) || 1);
  const qty = Math.max(1, Number(comboQty) || 1);
  const baseLabel = formatQuantityLabel(quantityValue, quantityUnit, packs);
  if (qty <= 1) return baseLabel;

  const unitGrams = quantityToGrams(quantityValue, quantityUnit) * packs;
  const totalGrams = unitGrams * qty;
  const totalLabel = formatNetWeightLabel(totalGrams);
  const q = Number(quantityValue);
  const unit = String(quantityUnit || 'g');
  if (!Number.isFinite(q)) return baseLabel;
  if (packs > 1) {
    return `${q} ${unit} × ${packs} packs × ${qty} = ${totalLabel}`;
  }
  return `${q} ${unit} × ${qty} = ${totalLabel}`;
}

export function formatComboQtySummary({
  comboQty = 1,
  itemCount = 0,
  packCount = 0,
  netWeightG = 0,
} = {}) {
  const qty = Math.max(1, Number(comboQty) || 1);
  const items = Number(itemCount) || 0;
  const packs = Number(packCount) || items;
  const weight = Number(netWeightG) || 0;
  if (qty <= 1) {
    return formatComboMetaLine({ itemCount: items, netWeightG: weight });
  }
  const parts = [
    `${qty} combo unit${qty === 1 ? '' : 's'}`,
    `${packs * qty} included pack${packs * qty === 1 ? '' : 's'}`,
  ];
  const weightLabel = formatNetWeightLabel(weight * qty);
  if (weightLabel) parts.push(`${weightLabel} total`);
  return parts.join(' · ');
}

/**
 * Reusable customer-facing bundle snapshot for Add to Cart / drawer / checkout / orders.
 */
export function buildBundleCartSnapshot(parentProduct = {}, bundle = null, bundleItems = null, products = null) {
  const parent = parentProduct || bundle?.parent_product || {};
  const itemsSource = Array.isArray(bundleItems)
    ? bundleItems
    : (bundle?.items || []);
  const productRows = Array.isArray(products)
    ? products
    : (bundle?.products || parent.bundleProducts || []);
  const productsById = new Map(productRows.filter(Boolean).map((row) => [row.id, row]));

  const workingBundle = {
    ...(bundle || {}),
    items: itemsSource,
    products: productRows,
    item_count: bundle?.item_count || itemsSource.filter((row) => row?.is_active !== false).length,
    total_net_weight_g: bundle?.total_net_weight_g
      || parent.bundle_net_weight_g
      || sumBundleNetWeightGrams(itemsSource),
  };

  const lines = buildBundleDisplayLines(workingBundle, productsById);
  const itemCount = Number(workingBundle.item_count) || lines.length;
  const packCount = lines.reduce((sum, row) => sum + (Number(row.packCount) || 1), 0);
  const netWeightG = Number(workingBundle.total_net_weight_g) || sumBundleNetWeightGrams(itemsSource);
  const title = getParentComboTitle(parent, workingBundle);
  const slug = parent.slug || workingBundle.bundle_slug || null;
  const imageUrl = resolveComboParentImage(parent, workingBundle);
  const mosaicUrls = getComboMosaicUrls({
    ...parent,
    products: productRows,
  }, 4);

  const contents = lines.map((line) => ({
    id: line.productId,
    productId: line.productId,
    title: line.title,
    slug: line.product?.slug || null,
    href: line.href,
    quantityValue: line.quantityValue,
    quantityUnit: line.quantityUnit,
    packCount: line.packCount,
    quantityLabel: line.quantityLabel,
    variantLabel: line.variantLabel || null,
    variantSku: line.variantSku || null,
    imageUrl: line.imageUrl || resolveComboComponentImage(line.product),
    archived: Boolean(line.archived),
    unavailable: Boolean(line.unavailable),
    linkDisabled: Boolean(line.linkDisabled),
  }));

  return {
    isBundle: true,
    productKind: parent.product_kind || 'bundle_combo',
    productGroup: parent.product_group || 'packaged_combo',
    inventoryMode: parent.inventory_mode || bundle?.inventory_mode || 'prepacked_stock',
    yasvikMark: parent.yasvik_mark || '',
    title: title || null,
    productSlug: slug,
    href: parent?.id || slug ? getProductPath(parent) : null,
    imageUrl,
    mosaicUrls,
    shortDescription: String(parent.short_description || bundle?.bundle_description || '')
      .split('\n')[0]
      .trim(),
    price: Number(parent.price) || 0,
    bundleItemCount: itemCount || null,
    bundlePackCount: packCount || null,
    bundleNetWeightG: netWeightG || null,
    bundleMetaLine: formatComboMetaLine({ itemCount, netWeightG }),
    bundleContents: contents,
    missingParentTitle: !title,
  };
}

/** @deprecated Prefer buildBundleCartSnapshot — kept for call-site compatibility. */
export function buildCartBundleMeta(product = {}, bundle = null) {
  const snap = buildBundleCartSnapshot(product, bundle, bundle?.items, bundle?.products);
  return {
    isBundle: true,
    productKind: snap.productKind,
    productGroup: snap.productGroup,
    inventoryMode: snap.inventoryMode,
    yasvikMark: snap.yasvikMark,
    bundleItemCount: snap.bundleItemCount,
    bundlePackCount: snap.bundlePackCount,
    bundleNetWeightG: snap.bundleNetWeightG,
    bundleMetaLine: snap.bundleMetaLine,
    bundleContents: snap.bundleContents,
    mosaicUrls: snap.mosaicUrls,
    productSlug: snap.productSlug,
  };
}
