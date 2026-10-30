/**
 * Parse YASVIK_CATALOGUE_SIMPLE.xlsx into normalized rows.
 */

import { CATALOGUE_SIMPLE_SCHEMA } from '@/lib/pim/catalogueSimpleExport';

function cleanText(value) {
  const raw = String(value ?? '').trim();
  if (!raw || raw === '1' || raw.toLowerCase() === 'null' || raw.toLowerCase() === 'undefined') return '';
  return raw;
}

function numOrNull(value) {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function yesNo(value, fallback = null) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return fallback;
  if (['yes', 'y', 'true', '1'].includes(raw)) return true;
  if (['no', 'n', 'false', '0'].includes(raw)) return false;
  return fallback;
}

function sheetToObjects(XLSX, workbook, name) {
  const sheet = workbook.Sheets[name];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
  return rows.filter((row) => Object.values(row).some((v) => String(v ?? '').trim()));
}

function parseStartMeta(XLSX, workbook) {
  const sheet = workbook.Sheets.START_HERE;
  if (!sheet) return {};
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const meta = {};
  for (const row of rows) {
    const key = cleanText(row[0]).toLowerCase();
    const val = row[1];
    if (key === 'catalogue_version') meta.catalogue_version = numOrNull(val);
    if (key === 'schema_version') meta.schema_version = cleanText(val);
    if (key === 'exported_by') meta.exported_by = cleanText(val);
    if (key === 'workbook generated') meta.exported_at = cleanText(val);
  }
  return meta;
}

export async function parseCatalogueSimpleWorkbook(file) {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const names = workbook.SheetNames || [];

  const required = ['PRODUCTS', 'PACKS_PRICING'];
  const missing = required.filter((n) => !names.includes(n));
  if (missing.length) {
    throw new Error(`Not a simple catalogue workbook. Missing sheets: ${missing.join(', ')}. Download YASVIK_CATALOGUE_SIMPLE.xlsx from admin.`);
  }

  const meta = parseStartMeta(XLSX, workbook);
  const productRows = sheetToObjects(XLSX, workbook, 'PRODUCTS');
  const packRows = sheetToObjects(XLSX, workbook, 'PACKS_PRICING');
  const batchRows = names.includes('BATCH_LABELS')
    ? sheetToObjects(XLSX, workbook, 'BATCH_LABELS').filter((r) => cleanText(r.SKU || r.sku))
    : [];

  const products = productRows.map((row, index) => ({
    row: index + 2,
    product_code: cleanText(row['Product Code']),
    product_name: cleanText(row['Product Name']),
    local_name: cleanText(row['Local Name']),
    category: cleanText(row.Category),
    subcategory: cleanText(row.Subcategory),
    product_type: cleanText(row['Product Type']) || 'Product',
    food_type: cleanText(row['Food Type']) || 'Veg',
    short_description: cleanText(row['Short Description']),
    ingredients: cleanText(row.Ingredients),
    allergen_information: cleanText(row['Allergen Information']),
    shelf_life_override_months: numOrNull(row['Shelf Life Override (Months)']),
    storage_override: cleanText(row['Storage Override']),
    status: cleanText(row.Status) || 'Draft',
    sell_online: yesNo(row['Sell Online'], true),
    featured: yesNo(row.Featured, false),
    bestseller: yesNo(row.Bestseller, false),
    notes: cleanText(row.Notes),
  })).filter((p) => p.product_code || p.product_name);

  const packs = packRows.map((row, index) => ({
    row: index + 2,
    product_code: cleanText(row['Product Code']),
    product_name: cleanText(row['Product Name']),
    category: cleanText(row.Category),
    sku: cleanText(row.SKU),
    pack_qty: numOrNull(row['Pack Qty']),
    unit: cleanText(row.Unit).toLowerCase(),
    purchase_rate: numOrNull(row['Purchase Rate']),
    rate_basis: cleanText(row['Rate Basis']) || 'Per kg',
    packaging_profile: cleanText(row['Packaging Profile']) || 'Pouch',
    other_cost: numOrNull(row['Other Cost']) || 0,
    margin_override: numOrNull(row['Margin Override %']),
    selling_price: numOrNull(row['Selling Price']),
    mrp: numOrNull(row.MRP),
    availability: cleanText(row.Availability) || 'Active',
    default_pack: yesNo(row['Default Pack'], false),
    notes: cleanText(row.Notes),
  })).filter((p) => p.sku || (p.product_code && p.pack_qty != null));

  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const workbook_hash = [...new Uint8Array(hashBuffer)].map((b) => b.toString(16).padStart(2, '0')).join('');

  return {
    filename: file.name || 'YASVIK_CATALOGUE_SIMPLE.xlsx',
    workbook_hash,
    schema_version: meta.schema_version || CATALOGUE_SIMPLE_SCHEMA,
    catalogue_version: meta.catalogue_version,
    sheets: names,
    products,
    packs,
    batches: batchRows,
    meta,
  };
}
