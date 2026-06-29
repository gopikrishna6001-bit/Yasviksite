export function buildItemsSnapshot(cartItems = []) {
  return cartItems.map((item) => ({
    product_id: item.productId || item.product_id || null,
    productId: item.productId || item.product_id || null,
    title: item.title,
    variant: item.variant || null,
    sku: item.variantSku || item.sku || null,
    pack_kg: item.pack_kg ?? item.variantMeta?.pack_kg ?? null,
    unit: item.unit || null,
    qty: item.qty,
    price: item.price,
    type: item.type || 'product',
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
  };
}
