/** Product stock / inventory measure types (stored on products.stock_measure_type). */
export const STOCK_MEASURE_TYPES = {
  kg: {
    id: 'kg',
    label: 'Kilograms (kg)',
    short: 'kg',
    bulk: true,
    hint: 'Bulk weight — rice, dal, nuts, dry goods. POS deducts by pack kg.',
  },
  L: {
    id: 'L',
    label: 'Litres (L)',
    short: 'L',
    bulk: true,
    hint: 'Bulk volume — oils, honey, ghee. POS deducts by bottle size (500ml, 1L).',
  },
  units: {
    id: 'units',
    label: 'Units (pieces)',
    short: 'units',
    bulk: false,
    hint: 'Count stock — soaps, packs sold by piece, not weight/volume.',
  },
};

export const STOCK_MEASURE_TYPE_OPTIONS = Object.values(STOCK_MEASURE_TYPES);

export function isValidStockMeasureType(value) {
  return Boolean(value && STOCK_MEASURE_TYPES[value]);
}

/** Resolve measure type: explicit DB field, else legacy inference from variants. */
export function resolveStockMeasureType(product = {}, { parseVariants, productUsesBulkStock, productUsesVolumeStock } = {}) {
  const raw = product.stock_measure_type ?? product.stockMeasureType;
  if (isValidStockMeasureType(raw)) return raw;

  if (parseVariants && productUsesBulkStock && productUsesVolumeStock) {
    const variants = parseVariants(product);
    const hasBulk = productUsesBulkStock(product);
    if (hasBulk) {
      return productUsesVolumeStock(product) ? 'L' : 'kg';
    }
    if (variants.length > 0) return 'kg';
  }

  return 'units';
}

export function formatStockAmount(value, measureType = 'kg') {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  const trimmed = String(Number(n.toFixed(3)));

  switch (measureType) {
    case 'L':
      if (n >= 1) return `${trimmed} L`;
      return `${Math.round(n * 1000)} ml`;
    case 'kg':
      return `${trimmed} kg`;
    case 'units':
      return `${Math.round(n)}`;
    default:
      return trimmed;
  }
}

export function getStockInputMeta(measureType = 'kg') {
  const type = STOCK_MEASURE_TYPES[measureType] || STOCK_MEASURE_TYPES.kg;
  if (measureType === 'L') {
    return {
      label: 'Bulk stock (litres)',
      step: '0.1',
      suffix: 'L',
      hint: type.hint,
    };
  }
  if (measureType === 'units') {
    return {
      label: 'Stock (units)',
      step: '1',
      suffix: '',
      hint: type.hint,
    };
  }
  return {
    label: 'Bulk stock (kg)',
    step: '0.1',
    suffix: 'kg',
    hint: type.hint,
  };
}

export function usesBulkMeasureType(measureType) {
  return Boolean(STOCK_MEASURE_TYPES[measureType]?.bulk);
}
