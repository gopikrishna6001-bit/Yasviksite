/**
 * YASVIK_CATALOGUE_MASTER.xlsx export — Phase 1.
 * Supabase remains system of record; this workbook is a controlled editing interface.
 */

import {
  CATALOGUE_MASTER_FILENAME,
  CATALOGUE_SCHEMA_VERSION,
  IMPORT_MODES,
  MEDIA_ACTIONS,
  MEDIA_ENTITY_TYPES,
  MEDIA_ROLES,
  PACK_UNIT_VALUES,
  PRODUCT_STATUS_VALUES,
  VARIANT_STATUS_VALUES,
} from '@/lib/pim/catalogueConstants';
import {
  listSellablePackVariants,
  mapProductStatus,
  splitPackQuantityUnit,
} from '@/lib/pim/packUnits';
import { extractPricingMetaFromVariants } from '@/lib/productPricingMeta';
import { supabase } from '@/api/supabaseClient';

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

function categoryMap(categories = []) {
  return new Map((categories || []).map((c) => [String(c.id), c]));
}

function resolveCategoryIds(product, categoriesById) {
  const categoryId = product.category_id || '';
  const cat = categoriesById.get(String(categoryId));
  if (!cat) return { category_id: categoryId, subcategory_id: '' };
  if (cat.parent_id) {
    return { category_id: cat.parent_id, subcategory_id: cat.id };
  }
  return { category_id: cat.id, subcategory_id: '' };
}

function aoaSheet(XLSX, rows, colWidths = []) {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  if (colWidths.length) {
    // Accept either [18, 20] or [{ wch: 18 }, ...]. Never nest { wch: { wch } }
    // — nested objects make Excel open with column width 0 (looks blank).
    sheet['!cols'] = colWidths.map((entry) => {
      if (typeof entry === 'number') return { wch: entry };
      if (entry && typeof entry.wch === 'number') return { wch: entry.wch };
      if (entry && typeof entry.width === 'number') return { wch: entry.width };
      return { wch: 16 };
    });
  }
  return sheet;
}

export function buildCatalogueMasterSheets({
  products = [],
  categories = [],
  imagesByProduct = {},
  version = null,
  exportedBy = '',
  exportedAt = new Date().toISOString(),
} = {}) {
  const categoriesById = categoryMap(categories);
  const catalogueVersion = Number(version?.version_number || 1);
  const schemaVersion = version?.schema_version || CATALOGUE_SCHEMA_VERSION;

  const instructions = [
    ['YASVIK CATALOGUE MASTER — Phase 1'],
    [''],
    ['WHERE THE DATA IS'],
    ['Open sheet → PRODUCTS  (all products, one row each)'],
    ['Open sheet → VARIANTS  (all packs / SKUs)'],
    ['Open sheet → CATEGORIES'],
    ['Open sheet → PRICING   (selling + MRP live today; cost columns blank until Phase 4)'],
    ['Open sheet → MEDIA / SEO_CONTENT'],
    ['Sheets SUPPLIERS, COMBOS, LABEL_DATA, BATCHES are placeholders only in Phase 1 — they look almost empty on purpose.'],
    [''],
    ['Operating model'],
    ['Supabase = official catalogue'],
    ['This Excel workbook = bulk editing interface'],
    ['Cloudflare R2 = image storage'],
    ['Admin import = validation, preview, approval, rollback (Phase 2+)'],
    [''],
    ['Rules'],
    ['1. Always download the latest workbook from Admin → Catalogue Manager before editing.'],
    ['2. Never identify rows by product name alone — use product_id / sku / category_id.'],
    ['3. Do not change permanent IDs after they are assigned.'],
    ['4. Blank media cells keep existing images (never delete).'],
    ['5. Upload does NOT auto-publish (Phase 2).'],
    ['6. Pricing Strategy still owns live shelf/MRP until Phase 4 pricing publish lands.'],
    [''],
    ['This export'],
    [`catalogue_version`, catalogueVersion],
    [`schema_version`, schemaVersion],
    [`exported_at`, exportedAt],
    [`exported_by`, exportedBy || ''],
    [`product_count`, products.length],
    [`variant_count`, products.reduce((n, p) => n + listSellablePackVariants(p).length, 0)],
  ];

  const importControl = [
    ['key', 'value'],
    ['catalogue_version', catalogueVersion],
    ['schema_version', schemaVersion],
    ['exported_at', exportedAt],
    ['exported_by', exportedBy || ''],
    ['import_mode_default', 'UPDATE_EXISTING'],
    ['phase', '1_export_only'],
    ['import_enabled', 'false'],
    ['notes', 'Phase 1: export + ID stabilization only. Import/publish arrives in Phase 2.'],
  ];

  const productHeader = [
    'product_id', 'product_name', 'local_name', 'brand', 'product_type',
    'category_id', 'subcategory_id', 'short_description', 'full_description',
    'ingredients', 'allergen_information', 'usage_instructions', 'storage_instructions',
    'origin', 'processing_method', 'food_type', 'product_highlights', 'search_keywords',
    'status', 'featured', 'bestseller', 'sort_order', 'default_slug',
    'product_code', 'product_sku', 'sell_online', 'hero_image_url',
  ];
  const productRows = [productHeader];
  for (const p of products) {
    const { category_id, subcategory_id } = resolveCategoryIds(p, categoriesById);
    productRows.push([
      p.id,
      p.title || p.name || '',
      p.local_name || '',
      'Yasvik',
      p.product_kind || 'individual_product',
      category_id,
      subcategory_id,
      p.short_description || '',
      p.description || p.story_description || '',
      p.ingredients || '',
      p.allergen_info || '',
      p.best_for || '',
      p.storage_note || '',
      p.origin_state || p.source_type || '',
      p.process_method || p.processing_method || '',
      '',
      p.yasvik_mark || '',
      p.seo_keywords || '',
      mapProductStatus(p),
      p.is_featured ? 'yes' : 'no',
      p.featured_in_hero ? 'yes' : 'no',
      p.sort_order ?? '',
      p.slug || '',
      p.product_code || '',
      p.sku || '',
      p.sell_online === false ? 'no' : 'yes',
      p.featured_image_url || p.hero_image || '',
    ]);
  }

  const variantHeader = [
    'variant_id', 'sku', 'product_id', 'pack_quantity', 'pack_unit', 'display_pack',
    'barcode', 'shipping_weight', 'stock_tracking_enabled', 'low_stock_level',
    'status', 'default_variant', 'sort_order', 'pack_kg', 'selling_price', 'mrp',
  ];
  const variantRows = [variantHeader];
  for (const p of products) {
    const packs = listSellablePackVariants(p);
    packs.forEach((v, index) => {
      const split = splitPackQuantityUnit(v, p.stock_measure_type || 'kg');
      variantRows.push([
        v.variant_id || '',
        v.sku || '',
        p.id,
        split.pack_quantity ?? '',
        split.pack_unit || '',
        split.display_pack || v.label || '',
        v.barcode || v.sku || '',
        '',
        'yes',
        p.low_stock_threshold ?? '',
        'Active',
        index === 0 ? 'yes' : 'no',
        (index + 1) * 10,
        v.pack_kg ?? '',
        v.price ?? '',
        v.compare_price ?? '',
      ]);
    });
  }

  const categoryHeader = [
    'category_id', 'category_name', 'parent_category_id', 'slug', 'short_description',
    'full_description', 'media_id', 'seo_title', 'seo_description', 'sort_order', 'status',
  ];
  const categoryRows = [categoryHeader];
  for (const c of categories) {
    categoryRows.push([
      c.id,
      c.name || '',
      c.parent_id || '',
      c.slug || c.seo_slug || '',
      c.short_intro || c.emotional_title || '',
      c.description || '',
      '',
      c.seo_title || '',
      c.seo_description || '',
      c.sort_order ?? '',
      c.is_active === false ? 'Inactive' : 'Active',
    ]);
  }

  const pricingHeader = [
    'sku', 'product_id', 'supplier_cost', 'freight_allocation', 'packaging_cost',
    'bottle_or_pouch_cost', 'label_cost', 'packing_labour', 'wastage_percentage',
    'other_direct_cost', 'calculated_landed_cost', 'target_margin_percentage',
    'calculated_minimum_price', 'recommended_selling_price', 'approved_selling_price',
    'approved_mrp', 'compare_price_enabled', 'effective_from', 'price_status', 'owner_notes',
    'purchase_rate_per_kg', 'pricing_band',
  ];
  const pricingRows = [pricingHeader];
  for (const p of products) {
    const meta = extractPricingMetaFromVariants(p.quick_variants || []);
    for (const v of listSellablePackVariants(p)) {
      const mrp = v.compare_price;
      const sell = v.price;
      pricingRows.push([
        v.sku || '',
        p.id,
        '', '', '', '', '', '', '', '',
        '',
        '',
        '',
        '',
        sell ?? '',
        mrp ?? '',
        mrp != null && sell != null && Number(mrp) > Number(sell) ? 'yes' : 'no',
        '',
        'Live',
        'Phase 1 export — cost columns filled in Phase 4',
        meta.purchase_rate_per_kg || '',
        meta.pricing_band || '',
      ]);
    }
  }

  const mediaHeader = [
    'media_id', 'product_id', 'sku', 'category_id', 'entity_type', 'media_role',
    'filename', 'r2_key', 'alt_text', 'sort_order', 'status', 'action', 'public_url',
  ];
  const mediaRows = [mediaHeader];
  for (const p of products) {
    if (p.featured_image_url || p.hero_image) {
      const url = p.featured_image_url || p.hero_image;
      mediaRows.push([
        '', p.id, '', '', 'Product', 'Hero',
        String(url).split('/').pop() || '', '', p.title || p.name || '', 0, 'Active', '', url,
      ]);
    }
    const gallery = imagesByProduct[p.id] || [];
    gallery.forEach((img, i) => {
      const url = img.image_url || img;
      if (!url || url === (p.featured_image_url || p.hero_image)) return;
      mediaRows.push([
        img.id || '', p.id, '', '', 'Product', 'Gallery',
        String(url).split('/').pop() || '', '', img.alt_text || '', i + 1, 'Active', '', url,
      ]);
    });
  }

  const seoHeader = [
    'entity_type', 'entity_id', 'slug', 'seo_title', 'seo_description',
    'canonical_url', 'search_keywords', 'faq_content', 'related_entity_ids',
    'redirect_from_slug', 'index_status',
  ];
  const seoRows = [seoHeader];
  for (const p of products) {
    seoRows.push([
      'Product', p.id, p.slug || '', p.seo_title || '', p.seo_description || '',
      '', p.seo_keywords || '', '', '', '', p.indexable === false ? 'noindex' : 'index',
    ]);
  }
  for (const c of categories) {
    seoRows.push([
      'Category', c.id, c.slug || c.seo_slug || '', c.seo_title || '', c.seo_description || '',
      '', '', '', '', '', 'index',
    ]);
  }

  const validationLists = [
    ['list_name', 'value'],
    ...PRODUCT_STATUS_VALUES.map((v) => ['product_status', v]),
    ...VARIANT_STATUS_VALUES.map((v) => ['variant_status', v]),
    ...PACK_UNIT_VALUES.map((v) => ['pack_unit', v]),
    ...MEDIA_ENTITY_TYPES.map((v) => ['media_entity_type', v]),
    ...MEDIA_ROLES.map((v) => ['media_role', v]),
    ...MEDIA_ACTIONS.filter(Boolean).map((v) => ['media_action', v]),
    ...IMPORT_MODES.map((v) => ['import_mode', v]),
  ];

  const stub = (headers, note) => [
    headers,
    headers.map((_, i) => (i === 0 ? `PHASE PLACEHOLDER — ${note}` : '')),
  ];

  const errorCheck = [
    ['check', 'status', 'detail'],
    ['schema_version_present', 'ok', schemaVersion],
    ['catalogue_version_present', 'ok', String(catalogueVersion)],
    ['permanent_product_ids', products.every((p) => p.id) ? 'ok' : 'fail', `${products.length} products`],
    ['packs_with_sku', variantRows.length > 1 && variantRows.slice(1).every((r) => r[1]) ? 'ok' : 'warn', `${variantRows.length - 1} packs`],
    ['packs_with_variant_id', variantRows.slice(1).every((r) => r[0]) ? 'ok' : 'warn', 'Run Stabilize IDs if warn'],
    ['import_enabled', 'info', 'false — Phase 2'],
  ];

  return {
    meta: {
      catalogueVersion,
      schemaVersion,
      exportedAt,
      exportedBy,
      productCount: products.length,
      variantCount: variantRows.length - 1,
      mediaCount: mediaRows.length - 1,
    },
    sheets: {
      INSTRUCTIONS: instructions,
      IMPORT_CONTROL: importControl,
      PRODUCTS: productRows,
      VARIANTS: variantRows,
      CATEGORIES: categoryRows,
      PRICING: pricingRows,
      SUPPLIERS: stub(['supplier_id', 'supplier_name', 'active', 'notes'], 'supplier register arrives in Phase 5'),
      MEDIA: mediaRows,
      COMBOS: stub(['combo_sku', 'combo_name', 'status'], 'combo export arrives in Phase 6'),
      COMBO_COMPONENTS: stub(['combo_sku', 'component_sku', 'component_quantity'], 'Phase 6'),
      LABEL_DATA: stub(['sku', 'label_template', 'product_name_on_label', 'status'], 'use Price Labels admin until Phase 5'),
      BATCHES: stub(['batch_id', 'sku', 'batch_status', 'printed_mrp'], 'batch register arrives in Phase 5'),
      SEO_CONTENT: seoRows,
      VALIDATION_LISTS: validationLists,
      ERROR_CHECK: errorCheck,
    },
  };
}

export async function downloadCatalogueMasterWorkbook({
  products,
  categories,
  imagesByProduct,
  version,
  exportedBy,
  actorUserId = null,
  filename = CATALOGUE_MASTER_FILENAME,
} = {}) {
  const XLSX = await import('xlsx');
  const exportedAt = new Date().toISOString();
  const built = buildCatalogueMasterSheets({
    products,
    categories,
    imagesByProduct,
    version,
    exportedBy,
    exportedAt,
  });

  const workbook = XLSX.utils.book_new();
  const widths = {
    INSTRUCTIONS: [{ wch: 88 }],
    IMPORT_CONTROL: [{ wch: 28 }, { wch: 48 }],
    PRODUCTS: Array(27).fill({ wch: 18 }),
    VARIANTS: Array(16).fill({ wch: 14 }),
    CATEGORIES: Array(11).fill({ wch: 18 }),
    PRICING: Array(22).fill({ wch: 14 }),
    MEDIA: Array(13).fill({ wch: 16 }),
    SEO_CONTENT: Array(11).fill({ wch: 18 }),
    VALIDATION_LISTS: [{ wch: 22 }, { wch: 28 }],
    ERROR_CHECK: [{ wch: 28 }, { wch: 10 }, { wch: 40 }],
  };

  for (const [name, rows] of Object.entries(built.sheets)) {
    const sheet = aoaSheet(XLSX, rows, widths[name] || [{ wch: 18 }]);
    XLSX.utils.book_append_sheet(workbook, sheet, name.slice(0, 31));
  }

  const buffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
    // Required for Microsoft Excel / Numbers — default inline t="str" cells often show blank.
    bookSST: true,
    compression: true,
  });
  const workbookHash = await sha256Hex(buffer instanceof ArrayBuffer ? buffer : new Uint8Array(buffer).buffer);
  triggerDownload(buffer, filename);

  // Best-effort audit row — ignore if migration not applied yet
  try {
    await supabase.from('catalogue_exports').insert({
      catalogue_version_id: version?.id || null,
      catalogue_version_number: built.meta.catalogueVersion,
      schema_version: built.meta.schemaVersion,
      filename,
      workbook_hash: workbookHash || null,
      exported_by: actorUserId,
      product_count: built.meta.productCount,
      variant_count: built.meta.variantCount,
      sheet_summary: {
        media: built.meta.mediaCount,
        categories: categories.length,
        phase: 1,
      },
    });
  } catch {
    /* audit optional until migration applied */
  }

  return { ...built.meta, workbookHash, filename };
}
