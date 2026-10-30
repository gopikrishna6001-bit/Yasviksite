/**
 * YASVIK_CATALOGUE_SIMPLE.xlsx — owner-facing catalogue workbook.
 * Supabase remains system of record. Technical UUIDs / SEO / media URLs stay in the DB.
 */

import { CATALOGUE_SCHEMA_VERSION } from '@/lib/pim/catalogueConstants';
import {
  listSellablePackVariants,
  mapProductStatus,
  splitPackQuantityUnit,
} from '@/lib/pim/packUnits';
import { extractPricingMetaFromVariants } from '@/lib/productPricingMeta';
import { supabase } from '@/api/supabaseClient';

export const CATALOGUE_SIMPLE_FILENAME = 'YASVIK_CATALOGUE_SIMPLE.xlsx';
export const CATALOGUE_SIMPLE_SCHEMA = '2.0.0-simple';

const BATCH_TEMPLATE_ROWS = 80;
const TABLE_PAD = 50; // extra formula rows beyond current data for owner additions

function triggerDownload(buffer, filename) {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function sha256Hex(buffer) {
  if (typeof crypto === 'undefined' || !crypto.subtle) return '';
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function cleanText(value) {
  const raw = String(value ?? '').trim();
  if (!raw || raw === '1' || raw === '0' || raw.toLowerCase() === 'null' || raw.toLowerCase() === 'undefined') {
    return '';
  }
  return raw;
}

function moneyOrBlank(value) {
  if (value === '' || value === null || value === undefined) return '';
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '';
  // Treat lone placeholder 1 as blank for prices (not for pack qty)
  if (n === 1 && String(value).trim() === '1') return '';
  return Math.round(n);
}

function categoryMaps(categories = []) {
  const byId = new Map((categories || []).map((c) => [String(c.id), c]));
  return byId;
}

function resolveCategoryNames(product, byId) {
  const cat = byId.get(String(product.category_id || ''));
  if (!cat) return { category: '', subcategory: '' };
  if (cat.parent_id) {
    const parent = byId.get(String(cat.parent_id));
    return {
      category: cleanText(parent?.name) || cleanText(cat.name),
      subcategory: cleanText(cat.name),
    };
  }
  return { category: cleanText(cat.name), subcategory: '' };
}

function productCodeOf(product) {
  return cleanText(product.product_code) || cleanText(product.sku) || cleanText(product.slug);
}

function productTypeOf(product) {
  const kind = String(product.product_kind || '').toLowerCase();
  if (kind.includes('bundle') || kind.includes('combo') || kind.includes('gift')) return 'Combo';
  return 'Product';
}

function packagingFor(product, categoryName) {
  const hay = `${categoryName} ${product.title || product.name || ''}`.toLowerCase();
  if (/oil|ghee/.test(hay) && /oil/.test(hay)) return 'Bottle';
  if (/pickle|honey|ghee|jam|chutney/.test(hay)) return 'Jar';
  if (/combo|gift|box/.test(hay)) return 'Box';
  return 'Pouch';
}

function rateBasisFor(product) {
  const m = String(product.stock_measure_type || 'kg').toLowerCase();
  if (m === 'l') return 'Per L';
  if (m === 'units') return 'Per pack';
  return 'Per kg';
}

function setCols(sheet, widths) {
  sheet['!cols'] = widths.map((wch) => ({ wch }));
}

function aoa(XLSX, rows) {
  return XLSX.utils.aoa_to_sheet(rows);
}

function computeIssueCounts(products, categories) {
  const byId = categoryMaps(categories);
  let zeroSell = 0;
  let missingMrp = 0;
  let sellAboveMrp = 0;
  let noPack = 0;
  let highDiscount = 0;
  let packCount = 0;

  for (const product of products) {
    const packs = listSellablePackVariants(product);
    if (!packs.length) noPack += 1;
    for (const v of packs) {
      packCount += 1;
      const sell = Number(v.price);
      const mrp = Number(v.compare_price);
      const sellOk = Number.isFinite(sell) && sell > 0 && !(sell === 1 && String(v.price).trim() === '1');
      const mrpOk = Number.isFinite(mrp) && mrp > 0 && !(mrp === 1 && String(v.compare_price).trim() === '1');
      if (!sellOk) zeroSell += 1;
      if (!mrpOk) missingMrp += 1;
      if (sellOk && mrpOk && sell > mrp) sellAboveMrp += 1;
      if (sellOk && mrpOk && mrp > sell && ((mrp - sell) / mrp) > 0.4) highDiscount += 1;
    }
  }

  return { zeroSell, missingMrp, sellAboveMrp, noPack, highDiscount, packCount, productCount: products.length, byId };
}

function buildStartHere(issues, meta) {
  return [
    ['YASVIK — SIMPLE CATALOGUE WORKBOOK'],
    [],
    ['You normally edit', 'PRODUCTS and PACKS_PRICING', '', 'CURRENT DATA ISSUES FOUND'],
    ['Occasional use', 'BATCH_LABELS', '', 'Selling price is zero', issues.zeroSell],
    ['Rare setup', 'SETTINGS', '', 'MRP is missing / placeholder', issues.missingMrp],
    ['Images', 'Upload a ZIP; do not maintain URLs or file paths in Excel', '', 'Selling price is above MRP', issues.sellAboveMrp],
    ['System-owned', 'UUIDs, slugs, SEO, image URLs, shipping weight, sort order', '', 'Products without any pack', issues.noPack],
    ['Current products', issues.productCount, '', 'Discount above 40%', issues.highDiscount],
    ['Current pack variants', issues.packCount],
    ['Workbook generated', meta.exportedAt, '', 'COLOUR GUIDE'],
    ['Yellow', 'Owner input / editable'],
    ['WHAT WAS REMOVED OR AUTOMATED', '', '', 'Grey', 'System or copied reference — do not maintain manually'],
    ['Old workbook burden', 'New handling', '', 'Green', 'Calculated automatically'],
    ['15 sheets', 'Reduced to 5 practical sheets'],
    ['Technical UUID columns', 'Kept in the database; owner uses Product Code and SKU'],
    ['Separate VARIANTS + PRICING', 'Combined into PACKS_PRICING'],
    ['MEDIA sheet with URLs and R2 keys', 'Removed; upload files by naming convention'],
    ['SEO sheet', 'Website generates SEO from product name, category and short description'],
    ["Repeated placeholder value '1'", 'Converted to blanks so it cannot be imported as real data'],
    ['Batch IDs and best-before dates', 'Calculated automatically in BATCH_LABELS / website'],
    [],
    ['IMAGE WORKFLOW — NO PATHS OR MEDIA SHEET'],
    ['Hero image', '<PRODUCT_CODE>_hero.webp'],
    ['Gallery image 2', '<PRODUCT_CODE>_2.webp'],
    ['Gallery image 3', '<PRODUCT_CODE>_3.webp'],
    ['Example', 'YAS-OIL-GROUNDNUT_hero.webp'],
    ['Upload rule', 'Missing file keeps the existing image; an uploaded matching file replaces it'],
    ['Deletion', 'Delete images only from admin, never through a blank Excel cell'],
    [],
    ['NORMAL WORKFLOW'],
    ['1', 'Download latest workbook from admin'],
    ['2', 'Edit only yellow cells (product copy, pack prices, costs, batch dates)'],
    ['3', 'Add image files to a ZIP only when replacing or adding images'],
    ['4', 'Upload → validate → review changes → publish (Phase 2)'],
    [],
    ['catalogue_version', meta.catalogueVersion],
    ['schema_version', meta.schemaVersion],
    ['exported_by', meta.exportedBy || ''],
  ];
}

function buildSettingsSheet(categories) {
  const roots = (categories || [])
    .filter((c) => !c.parent_id && c.is_active !== false)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || String(a.name).localeCompare(String(b.name)));

  const rows = [
    ['CATEGORY DEFAULTS — REVIEW ONCE, THEN RARELY EDIT', '', '', '', '', '', '', 'Packaging Profile', 'Container Cost', 'Label Cost', 'Packing Cost', '', 'Lists', 'Value'],
    ['', '', '', '', '', '', '', 'Pouch', 0, 0, 0, '', 'YesNo', 'yes'],
    ['General default', 'Value', '', '', '', '', '', 'Bottle', 0, 0, 0, '', 'YesNo', 'no'],
    ['Global target margin', 0.25, '', '', '', '', '', 'Jar', 0, 0, 0, '', 'ProductType', 'Product'],
    ['Global shelf life (months)', 6, '', '', '', '', '', 'Box', 0, 0, 0, '', 'ProductType', 'Combo'],
    ['MRP buffer for recommendation', 0.15, '', '', '', '', '', 'Vendor Packed', 0, 0, 0, '', 'FoodType', 'Veg'],
    ['', '', '', '', '', '', '', '', '', '', '', '', 'FoodType', 'Non-Veg'],
    ['', '', '', '', '', '', '', '', '', '', '', '', 'ProductStatus', 'Draft'],
    ['Category', 'Default Margin %', 'Shelf Life Months', 'Default Storage', 'Default Packaging', 'Active', '', '', '', '', '', '', 'ProductStatus', 'Published'],
  ];

  const defaultMargin = {
    oil: 0.15,
    pickle: 0.35,
    snack: 0.3,
    honey: 0.25,
    ghee: 0.2,
    dry: 0.25,
    spice: 0.25,
    rice: 0.2,
    millet: 0.2,
  };

  roots.forEach((cat) => {
    const name = cleanText(cat.name) || 'Category';
    const lower = name.toLowerCase();
    let margin = 0.25;
    let pack = 'Pouch';
    if (/oil/.test(lower)) { margin = defaultMargin.oil; pack = 'Bottle'; }
    else if (/pickle/.test(lower)) { margin = defaultMargin.pickle; pack = 'Jar'; }
    else if (/snack|sweet/.test(lower)) { margin = defaultMargin.snack; pack = 'Pouch'; }
    else if (/honey/.test(lower)) { margin = defaultMargin.honey; pack = 'Jar'; }
    else if (/ghee/.test(lower)) { margin = defaultMargin.ghee; pack = 'Jar'; }
    else if (/dry|nut|seed/.test(lower)) { margin = defaultMargin.dry; pack = 'Pouch'; }
    else if (/spice|podi|powder/.test(lower)) { margin = defaultMargin.spice; pack = 'Pouch'; }
    else if (/rice/.test(lower)) { margin = defaultMargin.rice; pack = 'Pouch'; }
    else if (/millet/.test(lower)) { margin = defaultMargin.millet; pack = 'Pouch'; }
    rows.push([name, margin, '', '', pack, 'yes']);
  });

  // Validation lists (right side continuation for remaining statuses)
  const extras = [
    ['ProductStatus', 'Out of Stock'],
    ['ProductStatus', 'Temporarily Unavailable'],
    ['ProductStatus', 'Archived'],
    ['ProductStatus', 'Discontinued'],
    ['PackStatus', 'Active'],
    ['PackStatus', 'Out of Stock'],
    ['PackStatus', 'Draft'],
    ['PackStatus', 'Archived'],
    ['PackStatus', 'Discontinued'],
    ['RateBasis', 'Per kg'],
    ['RateBasis', 'Per L'],
    ['RateBasis', 'Per pack'],
    ['Unit', 'g'],
    ['Unit', 'kg'],
    ['Unit', 'ml'],
    ['Unit', 'L'],
    ['Unit', 'pcs'],
    ['BatchStatus', 'Draft'],
    ['BatchStatus', 'Packed'],
    ['BatchStatus', 'Active'],
    ['BatchStatus', 'Exhausted'],
    ['BatchStatus', 'Archived'],
  ];
  extras.forEach((pair, i) => {
    const rowIndex = 7 + i;
    while (rows.length <= rowIndex) rows.push(Array(14).fill(''));
    const row = [...rows[rowIndex]];
    while (row.length < 14) row.push('');
    row[12] = pair[0];
    row[13] = pair[1];
    rows[rowIndex] = row;
  });

  return rows;
}

/**
 * Build workbook object (sheets as AOA + formula patches).
 */
export function buildCatalogueSimpleWorkbookData({
  products = [],
  categories = [],
  version = null,
  exportedBy = '',
  exportedAt = new Date().toISOString(),
} = {}) {
  const byId = categoryMaps(categories);
  const issues = computeIssueCounts(products, categories);
  const catalogueVersion = Number(version?.version_number || 1);
  const schemaVersion = CATALOGUE_SIMPLE_SCHEMA;
  const meta = { catalogueVersion, schemaVersion, exportedAt, exportedBy };

  const startHere = buildStartHere(issues, meta);

  const productHeader = [
    'Product Code', 'Product Name', 'Local Name', 'Category', 'Subcategory',
    'Product Type', 'Food Type', 'Short Description', 'Ingredients', 'Allergen Information',
    'Shelf Life Override (Months)', 'Storage Override', 'Status', 'Sell Online',
    'Featured', 'Bestseller', 'Product Check', 'Notes',
  ];
  const productRows = [productHeader];
  const sortedProducts = [...products].sort((a, b) =>
    productCodeOf(a).localeCompare(productCodeOf(b)) || String(a.title || a.name || '').localeCompare(String(b.title || b.name || '')),
  );

  for (const p of sortedProducts) {
    const { category, subcategory } = resolveCategoryNames(p, byId);
    productRows.push([
      productCodeOf(p),
      cleanText(p.title || p.name),
      cleanText(p.local_name),
      category,
      subcategory,
      productTypeOf(p),
      'Veg',
      cleanText(p.short_description),
      cleanText(p.ingredients),
      cleanText(p.allergen_info),
      '',
      cleanText(p.storage_note),
      mapProductStatus(p),
      p.sell_online === false ? 'no' : 'yes',
      p.is_featured ? 'yes' : 'no',
      p.featured_in_hero ? 'yes' : 'no',
      '', // Product Check formula
      '',
    ]);
  }

  const packsHeader = [
    'Product Code', 'Product Name', 'Category', 'SKU', 'Pack Qty', 'Unit',
    'Purchase Rate', 'Rate Basis', 'Packaging Profile', 'Other Cost', 'Margin Override %',
    'Landed Cost', 'Recommended Price', 'Selling Price', 'MRP', 'Availability',
    'Default Pack', 'Price Check', 'Notes',
  ];
  const packsRows = [packsHeader];
  for (const p of sortedProducts) {
    const { category } = resolveCategoryNames(p, byId);
    const code = productCodeOf(p);
    const name = cleanText(p.title || p.name);
    const metaPricing = extractPricingMetaFromVariants(p.quick_variants || []);
    const purchase = moneyOrBlank(metaPricing.purchase_rate_per_kg);
    const packs = listSellablePackVariants(p);
    packs.forEach((v, index) => {
      const split = splitPackQuantityUnit(v, p.stock_measure_type || 'kg');
      const sell = moneyOrBlank(v.price);
      let mrp = moneyOrBlank(v.compare_price);
      packsRows.push([
        code,
        name,
        category,
        cleanText(v.sku),
        split.pack_quantity ?? '',
        split.pack_unit || '',
        purchase,
        rateBasisFor(p),
        packagingFor(p, category),
        '',
        '',
        '', // Landed Cost formula
        '', // Recommended formula
        sell,
        mrp,
        'Active',
        index === 0 ? 'yes' : 'no',
        '', // Price Check formula
        '',
      ]);
    });
  }

  const batchHeader = [
    'SKU', 'Product Name', 'Pack', 'Packed Date', 'Quantity Packed',
    'Shelf Life Override (Months)', 'Shelf Life Used', 'MRP Override', 'Printed MRP',
    'Batch No', 'Best Before', 'Labels to Print', 'Status', 'Notes',
  ];
  const batchRows = [batchHeader];
  for (let i = 0; i < BATCH_TEMPLATE_ROWS; i += 1) {
    batchRows.push(['', '', '', '', '', '', '', '', '', '', '', '', 'Draft', '']);
  }

  const settingsRows = buildSettingsSheet(categories);
  const packsTableEnd = Math.max(packsRows.length + TABLE_PAD, 100);
  const productsTableEnd = Math.max(productRows.length + TABLE_PAD, 100);

  return {
    meta: { ...meta, productCount: issues.productCount, packCount: issues.packCount, issues },
    sheets: {
      START_HERE: startHere,
      PRODUCTS: productRows,
      PACKS_PRICING: packsRows,
      BATCH_LABELS: batchRows,
      SETTINGS: settingsRows,
    },
    formulaRanges: {
      productsTableEnd,
      packsTableEnd,
      productDataRows: productRows.length - 1,
      packsDataRows: packsRows.length - 1,
      batchRows: BATCH_TEMPLATE_ROWS,
    },
  };
}

function applyProductFormulas(sheet, dataRows, packsTableEnd) {
  for (let i = 0; i < dataRows; i += 1) {
    const r = i + 2;
    sheet[`Q${r}`] = {
      t: 's',
      f: `IF(A${r}="","",IF(COUNTIF(PACKS_PRICING!$A$2:$A$${packsTableEnd},A${r})=0,"MISSING PACK","OK"))`,
      v: '',
    };
  }
}

function applyPackFormulas(sheet, dataRows) {
  for (let i = 0; i < dataRows; i += 1) {
    const r = i + 2;
    sheet[`L${r}`] = {
      t: 'n',
      f: `IF(OR(G${r}="",H${r}=""),"",ROUND(IF(H${r}="Per pack",G${r},G${r}*IF(F${r}="g",E${r}/1000,IF(F${r}="kg",E${r},IF(F${r}="ml",E${r}/1000,IF(F${r}="L",E${r},1)))))+IFERROR(VLOOKUP(I${r},SETTINGS!$H$2:$K$6,2,FALSE),0)+IFERROR(VLOOKUP(I${r},SETTINGS!$H$2:$K$6,3,FALSE),0)+IFERROR(VLOOKUP(I${r},SETTINGS!$H$2:$K$6,4,FALSE),0)+IF(J${r}="",0,J${r}),2))`,
      v: 0,
    };
    sheet[`M${r}`] = {
      t: 'n',
      f: `IF(L${r}="","",CEILING(L${r}/(1-IF(K${r}<>"",K${r},IFERROR(VLOOKUP(C${r},SETTINGS!$A$10:$F$30,2,FALSE),SETTINGS!$B$4))),10)-1)`,
      v: 0,
    };
    sheet[`R${r}`] = {
      t: 's',
      f: `IF(OR(N${r}="",N${r}=0),"MISSING SELLING",IF(O${r}="","MISSING MRP",IF(N${r}>O${r},"SELLING > MRP",IF(G${r}="","COST NOT SET",IF(AND(M${r}<>"",N${r}<M${r}),"BELOW TARGET","OK")))))`,
      v: '',
    };
  }
}

function applyBatchFormulas(sheet, batchRows, packsTableEnd) {
  for (let i = 0; i < batchRows; i += 1) {
    const r = i + 2;
    sheet[`B${r}`] = {
      t: 's',
      f: `IFERROR(INDEX(PACKS_PRICING!$B$2:$B$${packsTableEnd},MATCH(A${r},PACKS_PRICING!$D$2:$D$${packsTableEnd},0)),"")`,
      v: '',
    };
    sheet[`C${r}`] = {
      t: 's',
      f: `IF(A${r}="","",IFERROR(INDEX(PACKS_PRICING!$E$2:$E$${packsTableEnd},MATCH(A${r},PACKS_PRICING!$D$2:$D$${packsTableEnd},0))&" "&INDEX(PACKS_PRICING!$F$2:$F$${packsTableEnd},MATCH(A${r},PACKS_PRICING!$D$2:$D$${packsTableEnd},0)),""))`,
      v: '',
    };
    sheet[`G${r}`] = {
      t: 'n',
      f: `IF(A${r}="","",IF(F${r}<>"",F${r},IFERROR(VLOOKUP(INDEX(PACKS_PRICING!$C$2:$C$${packsTableEnd},MATCH(A${r},PACKS_PRICING!$D$2:$D$${packsTableEnd},0)),SETTINGS!$A$10:$F$30,3,FALSE),SETTINGS!$B$5)))`,
      v: 0,
    };
    sheet[`I${r}`] = {
      t: 'n',
      f: `IF(A${r}="","",IF(H${r}<>"",H${r},IFERROR(INDEX(PACKS_PRICING!$O$2:$O$${packsTableEnd},MATCH(A${r},PACKS_PRICING!$D$2:$D$${packsTableEnd},0)),"")))`,
      v: 0,
    };
    sheet[`J${r}`] = {
      t: 's',
      f: `IF(OR(A${r}="",D${r}=""),"",A${r}&"-"&TEXT(D${r},"YYMMDD")&"-"&TEXT(ROW()-1,"000"))`,
      v: '',
    };
    sheet[`K${r}`] = {
      t: 'n',
      f: `IF(OR(D${r}="",G${r}=""),"",EDATE(D${r},G${r}))`,
      v: 0,
    };
    sheet[`L${r}`] = {
      t: 'n',
      f: `IF(E${r}>0,E${r},"")`,
      v: 0,
    };
  }
}

export async function downloadCatalogueSimpleWorkbook({
  products,
  categories,
  version,
  exportedBy,
  actorUserId = null,
  filename = CATALOGUE_SIMPLE_FILENAME,
} = {}) {
  const XLSX = await import('xlsx');
  const exportedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);
  const built = buildCatalogueSimpleWorkbookData({
    products,
    categories,
    version,
    exportedBy,
    exportedAt,
  });

  const workbook = XLSX.utils.book_new();

  const startSheet = aoa(XLSX, built.sheets.START_HERE);
  setCols(startSheet, [28, 56, 8, 36, 12]);
  XLSX.utils.book_append_sheet(workbook, startSheet, 'START_HERE');

  const productsSheet = aoa(XLSX, built.sheets.PRODUCTS);
  setCols(productsSheet, [22, 32, 18, 24, 22, 12, 10, 40, 28, 22, 12, 18, 14, 10, 10, 10, 14, 20]);
  applyProductFormulas(productsSheet, built.formulaRanges.productDataRows, built.formulaRanges.packsTableEnd);
  XLSX.utils.book_append_sheet(workbook, productsSheet, 'PRODUCTS');

  const packsSheet = aoa(XLSX, built.sheets.PACKS_PRICING);
  setCols(packsSheet, [18, 28, 22, 18, 10, 8, 12, 12, 14, 10, 12, 12, 14, 12, 10, 12, 10, 16, 18]);
  applyPackFormulas(packsSheet, built.formulaRanges.packsDataRows);
  XLSX.utils.book_append_sheet(workbook, packsSheet, 'PACKS_PRICING');

  const batchSheet = aoa(XLSX, built.sheets.BATCH_LABELS);
  setCols(batchSheet, [18, 28, 12, 12, 12, 12, 12, 12, 12, 22, 12, 12, 10, 18]);
  applyBatchFormulas(batchSheet, built.formulaRanges.batchRows, built.formulaRanges.packsTableEnd);
  XLSX.utils.book_append_sheet(workbook, batchSheet, 'BATCH_LABELS');

  const settingsSheet = aoa(XLSX, built.sheets.SETTINGS);
  setCols(settingsSheet, [28, 14, 14, 16, 16, 8, 4, 16, 12, 10, 12, 4, 16, 14]);
  XLSX.utils.book_append_sheet(workbook, settingsSheet, 'SETTINGS');

  const buffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
    bookSST: true,
    compression: true,
  });
  const workbookHash = await sha256Hex(buffer instanceof ArrayBuffer ? buffer : new Uint8Array(buffer).buffer);
  triggerDownload(buffer, filename);

  try {
    await supabase.from('catalogue_exports').insert({
      catalogue_version_id: version?.id || null,
      catalogue_version_number: built.meta.catalogueVersion,
      schema_version: built.meta.schemaVersion,
      filename,
      workbook_hash: workbookHash || null,
      exported_by: actorUserId,
      product_count: built.meta.productCount,
      variant_count: built.meta.packCount,
      sheet_summary: {
        format: 'simple_v2',
        sheets: ['START_HERE', 'PRODUCTS', 'PACKS_PRICING', 'BATCH_LABELS', 'SETTINGS'],
        issues: built.meta.issues,
      },
    });
  } catch {
    /* optional until migration */
  }

  return { ...built.meta, workbookHash, filename };
}

/** @deprecated Use downloadCatalogueSimpleWorkbook — kept as alias for Catalogue Manager. */
export async function downloadCatalogueMasterWorkbook(args) {
  return downloadCatalogueSimpleWorkbook(args);
}
