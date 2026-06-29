export const PRICING_META_LABEL = '__yasvik_pricing__';

export function isPricingMetaVariant(variant) {
  return variant?.label === PRICING_META_LABEL || variant?.sku === PRICING_META_LABEL;
}

export function extractPricingMetaFromVariants(variants = []) {
  const metaRow = (Array.isArray(variants) ? variants : []).find(isPricingMetaVariant);
  if (!metaRow) {
    return {
      selling_price_per_kg: '',
      store_selling_price_per_kg: '',
      purchase_rate_per_kg: '',
      pricing_band: '',
      store_tier: '',
      web_tier: '',
      use_web_override: false,
      use_store_override: false,
      price_inflate_percent: '',
      small_pack_margin_rs: '',
    };
  }

  try {
    const parsed = typeof metaRow.notes === 'string' ? JSON.parse(metaRow.notes) : metaRow.notes;
    return {
      selling_price_per_kg: parsed?.selling_price_per_kg ?? '',
      store_selling_price_per_kg: parsed?.store_selling_price_per_kg ?? '',
      purchase_rate_per_kg: parsed?.purchase_rate_per_kg ?? '',
      pricing_band: parsed?.pricing_band ?? '',
      store_tier: parsed?.store_tier ?? '',
      web_tier: parsed?.web_tier ?? '',
      use_web_override: parsed?.use_web_override ?? false,
      use_store_override: parsed?.use_store_override ?? false,
      price_inflate_percent: parsed?.price_inflate_percent ?? '',
      small_pack_margin_rs: parsed?.small_pack_margin_rs ?? '',
    };
  } catch {
    return {
      selling_price_per_kg: '',
      store_selling_price_per_kg: '',
      purchase_rate_per_kg: '',
      pricing_band: '',
      store_tier: '',
      web_tier: '',
      use_web_override: false,
      use_store_override: false,
      price_inflate_percent: '',
      small_pack_margin_rs: '',
    };
  }
}

export function mergePricingMetaIntoQuickVariants(quickVariants = [], meta = {}) {
  const visible = (Array.isArray(quickVariants) ? quickVariants : []).filter((variant) => !isPricingMetaVariant(variant));
  const hasMeta = [
    meta.selling_price_per_kg,
    meta.store_selling_price_per_kg,
    meta.purchase_rate_per_kg,
    meta.pricing_band,
    meta.store_tier,
    meta.web_tier,
    meta.price_inflate_percent,
    meta.small_pack_margin_rs,
  ].some((value) => value !== '' && value !== null && value !== undefined);

  if (!hasMeta) return visible;

  return [
    {
      label: PRICING_META_LABEL,
      sku: PRICING_META_LABEL,
      notes: JSON.stringify({
        selling_price_per_kg: meta.selling_price_per_kg ?? null,
        store_selling_price_per_kg: meta.store_selling_price_per_kg ?? null,
        purchase_rate_per_kg: meta.purchase_rate_per_kg ?? null,
        pricing_band: meta.pricing_band ?? null,
        store_tier: meta.store_tier ?? null,
        web_tier: meta.web_tier ?? null,
        use_web_override: meta.use_web_override ?? null,
        use_store_override: meta.use_store_override ?? null,
        price_inflate_percent: meta.price_inflate_percent ?? null,
        small_pack_margin_rs: meta.small_pack_margin_rs ?? null,
      }),
    },
    ...visible,
  ];
}

export function hydrateProductPricingFields(product = {}) {
  const variants = product.quick_variants ?? product.variants ?? [];
  const meta = extractPricingMetaFromVariants(variants);

  return {
    selling_price_per_kg: product.selling_price_per_kg ?? meta.selling_price_per_kg ?? '',
    price_inflate_percent: product.price_inflate_percent ?? meta.price_inflate_percent ?? '',
    small_pack_margin_rs: product.small_pack_margin_rs ?? meta.small_pack_margin_rs ?? '',
  };
}
