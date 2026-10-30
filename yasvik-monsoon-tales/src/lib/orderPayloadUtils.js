export function buildItemsSnapshot(cartItems = []) {
  return cartItems.map((item) => ({
    product_id: item.productId || item.product_id || null,
    productId: item.productId || item.product_id || null,
    title: item.title,
    productSlug: item.productSlug || null,
    imageUrl: item.hero_image || null,
    variant: item.variant || null,
    sku: item.variantSku || item.sku || null,
    pack_kg: item.pack_kg ?? item.variantMeta?.pack_kg ?? null,
    unit: item.unit || null,
    qty: item.qty,
    price: item.price,
    type: item.type || (item.isBundle ? 'combo' : 'product'),
    isBundle: Boolean(item.isBundle || item.type === 'combo'),
    yasvikMark: item.yasvikMark || null,
    bundleItemCount: item.bundleItemCount || null,
    bundlePackCount: item.bundlePackCount || null,
    bundleNetWeightG: item.bundleNetWeightG || null,
    bundleMetaLine: item.bundleMetaLine || null,
    mosaicUrls: item.mosaicUrls || null,
    bundleContents: Array.isArray(item.bundleContents)
      ? item.bundleContents.map((row) => ({
        productId: row.productId || row.id || null,
        title: row.title || null,
        slug: row.slug || null,
        imageUrl: row.imageUrl || null,
        quantityValue: row.quantityValue ?? null,
        quantityUnit: row.quantityUnit || null,
        packCount: row.packCount ?? null,
        quantityLabel: row.quantityLabel || null,
        variantLabel: row.variantLabel || null,
      }))
      : null,
  }));
}

export function buildShippingAddress(address = {}) {
  return {
    name: address.name || '',
    phone: address.phone || '',
    street: address.street || [address.building_name, address.area].filter(Boolean).join(', '),
    city: address.city || '',
    state: address.state || 'Telangana',
    zip: address.pincode || address.pin_code || address.postal_code || '',
    country: 'India',
  };
}

export function cartItemToOrderLine(item) {
  const unitPaise = Math.round(Number(item.price || 0) * 100);
  const qty = Number(item.qty || 1);
  return {
    product_id: item.productId,
    product_name: item.title,
    variant_label: item.variant || null,
    sku: item.variantSku || item.sku || null,
    pack_kg: item.pack_kg ?? item.variantMeta?.pack_kg ?? null,
    quantity: qty,
    unit_price: Number(item.price || 0),
    unit_price_paise: unitPaise,
    total_price: Number(item.price || 0) * qty,
    line_total_paise: unitPaise * qty,
    is_bundle: Boolean(item.isBundle || item.type === 'combo'),
    bundle_meta_line: item.bundleMetaLine || null,
    bundle_item_count: item.bundleItemCount || null,
    bundle_net_weight_g: item.bundleNetWeightG || null,
  };
}
