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
      store_price_inflate_percent: '',
      small_pack_margin_rs: '',
      pack_charm_mode: '',
      pack_margins: {},
      pack_packaging_rs: {},
      pack_price_overrides: {},
      benchmark_source: '',
      benchmark_handle: '',
      benchmark_url: '',
      benchmark_synced_at: '',
      benchmark_price_locked: false,
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
      store_price_inflate_percent: parsed?.store_price_inflate_percent ?? '',
      small_pack_margin_rs: parsed?.small_pack_margin_rs ?? '',
      pack_margins: parsed?.pack_margins && typeof parsed.pack_margins === 'object' ? parsed.pack_margins : {},
      pack_packaging_rs: parsed?.pack_packaging_rs && typeof parsed.pack_packaging_rs === 'object' ? parsed.pack_packaging_rs : {},
      pack_price_overrides: parsed?.pack_price_overrides && typeof parsed.pack_price_overrides === 'object' ? parsed.pack_price_overrides : {},
      benchmark_source: parsed?.benchmark_source ?? '',
      benchmark_handle: parsed?.benchmark_handle ?? '',
      benchmark_url: parsed?.benchmark_url ?? '',
      benchmark_synced_at: parsed?.benchmark_synced_at ?? '',
      benchmark_price_locked: parsed?.benchmark_price_locked ?? false,
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
      store_price_inflate_percent: '',
      small_pack_margin_rs: '',
      pack_charm_mode: '',
      pack_margins: {},
      pack_packaging_rs: {},
      pack_price_overrides: {},
      benchmark_source: '',
      benchmark_handle: '',
      benchmark_url: '',
      benchmark_synced_at: '',
      benchmark_price_locked: false,
    };
  }
}

export function mergePricingMetaIntoQuickVariants(quickVariants = [], meta = {}, existingVariants = []) {
  const visible = (Array.isArray(quickVariants) ? quickVariants : []).filter((variant) => !isPricingMetaVariant(variant));
  const existing = extractPricingMetaFromVariants(
    (Array.isArray(existingVariants) && existingVariants.length)
      ? existingVariants
      : quickVariants,
  );

  const merged = {
    ...existing,
    ...Object.fromEntries(
      Object.entries(meta || {}).filter(([, value]) => value !== '' && value !== null && value !== undefined),
    ),
  };

  const hasMeta = [
    merged.selling_price_per_kg,
    merged.store_selling_price_per_kg,
    merged.purchase_rate_per_kg,
    merged.pricing_band,
    merged.store_tier,
    merged.web_tier,
    merged.price_inflate_percent,
    merged.store_price_inflate_percent,
    merged.small_pack_margin_rs,
    merged.pack_charm_mode,
    merged.pack_margins,
    merged.pack_packaging_rs,
    merged.pack_price_overrides,
    merged.benchmark_source,
    merged.benchmark_handle,
    merged.benchmark_url,
    merged.benchmark_synced_at,
    merged.benchmark_price_locked,
  ].some((value) => {
    if (value && typeof value === 'object') return Object.keys(value).length > 0;
    return value !== '' && value !== null && value !== undefined;
  });

  if (!hasMeta) return visible;

  return [
    {
      label: PRICING_META_LABEL,
      sku: PRICING_META_LABEL,
      notes: JSON.stringify({
        selling_price_per_kg: merged.selling_price_per_kg ?? null,
        store_selling_price_per_kg: merged.store_selling_price_per_kg ?? null,
        purchase_rate_per_kg: merged.purchase_rate_per_kg ?? null,
        pricing_band: merged.pricing_band ?? null,
        store_tier: merged.store_tier ?? null,
        web_tier: merged.web_tier ?? null,
        use_web_override: merged.use_web_override ?? null,
        use_store_override: merged.use_store_override ?? null,
        price_inflate_percent: merged.price_inflate_percent ?? null,
        store_price_inflate_percent: merged.store_price_inflate_percent ?? null,
        small_pack_margin_rs: merged.small_pack_margin_rs ?? null,
        pack_charm_mode: merged.pack_charm_mode ?? null,
        pack_margins: merged.pack_margins && typeof merged.pack_margins === 'object' ? merged.pack_margins : null,
        pack_packaging_rs: merged.pack_packaging_rs && typeof merged.pack_packaging_rs === 'object' ? merged.pack_packaging_rs : null,
        pack_price_overrides: merged.pack_price_overrides && typeof merged.pack_price_overrides === 'object' ? merged.pack_price_overrides : null,
        benchmark_source: merged.benchmark_source ?? null,
        benchmark_handle: merged.benchmark_handle ?? null,
        benchmark_url: merged.benchmark_url ?? null,
        benchmark_synced_at: merged.benchmark_synced_at ?? null,
        benchmark_price_locked: merged.benchmark_price_locked ?? null,
      }),
    },
    ...visible,
  ];
}

export function hydrateProductPricingFields(product = {}) {
  const p = product || {};
  const variants = p.quick_variants ?? p.variants ?? [];
  const meta = extractPricingMetaFromVariants(variants);

  return {
    selling_price_per_kg: p.selling_price_per_kg ?? meta.selling_price_per_kg ?? '',
    store_selling_price_per_kg: p.store_selling_price_per_kg ?? meta.store_selling_price_per_kg ?? '',
    price_inflate_percent: p.price_inflate_percent ?? meta.price_inflate_percent ?? '',
    store_price_inflate_percent: p.store_price_inflate_percent ?? meta.store_price_inflate_percent ?? '',
    small_pack_margin_rs: p.small_pack_margin_rs ?? meta.small_pack_margin_rs ?? '',
    pack_charm_mode: p.pack_charm_mode ?? meta.pack_charm_mode ?? 'nine',
  };
}
