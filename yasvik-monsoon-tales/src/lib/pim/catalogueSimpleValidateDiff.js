/**
 * Validate + diff simple catalogue workbook against live products.
 */

import { isPricingMetaVariant, extractPricingMetaFromVariants } from '@/lib/productPricingMeta';
import { listSellablePackVariants, splitPackQuantityUnit } from '@/lib/pim/packUnits';

function cleanText(value) {
  return String(value ?? '').trim();
}

function productCodeOf(product) {
  return cleanText(product.product_code) || cleanText(product.sku) || cleanText(product.slug);
}

function normMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

function displayPack(qty, unit) {
  if (qty == null || !unit) return '';
  return `${qty} ${unit}`;
}

function packKgFromQtyUnit(qty, unit) {
  const q = Number(qty);
  if (!Number.isFinite(q) || q <= 0) return null;
  const u = String(unit || '').toLowerCase();
  if (u === 'g' || u === 'ml') return q / 1000;
  if (u === 'kg' || u === 'l') return q;
  if (u === 'pcs' || u === 'pack') return q;
  return q;
}

function statusFlags(status) {
  const s = cleanText(status).toLowerCase();
  if (s === 'published') return { is_published: true, sell_online: true };
  if (s === 'out of stock') return { is_published: true, sell_online: true };
  if (s === 'temporarily unavailable') return { is_published: true, sell_online: false };
  if (s === 'archived' || s === 'discontinued') return { is_published: false, sell_online: false };
  return { is_published: false, sell_online: false }; // Draft
}

function resolveCategoryId(row, categories) {
  const byName = new Map();
  for (const c of categories || []) {
    byName.set(cleanText(c.name).toLowerCase(), c);
  }
  const sub = cleanText(row.subcategory);
  const parent = cleanText(row.category);
  if (sub) {
    const hit = byName.get(sub.toLowerCase());
    if (hit) return hit.id;
  }
  if (parent) {
    const hit = byName.get(parent.toLowerCase());
    if (hit) return hit.id;
  }
  return null;
}

function fieldDiff(field, before, after) {
  const b = before == null || before === '' ? null : before;
  const a = after == null || after === '' ? null : after;
  if (String(b ?? '') === String(a ?? '')) return null;
  return { field, before: b, after: a };
}

export function validateAndDiffCatalogueSimple({
  parsed,
  products = [],
  categories = [],
  liveCatalogueVersion = null,
  importMode = 'UPDATE_EXISTING',
} = {}) {
  const errors = [];
  const warnings = [];
  const changes = [];

  const productsByCode = new Map();
  const productsById = new Map();
  for (const p of products) {
    const code = productCodeOf(p).toLowerCase();
    if (code) productsByCode.set(code, p);
    productsById.set(p.id, p);
  }

  const packSkuSet = new Set();
  const workbookProductCodes = new Set();

  if (parsed.catalogue_version != null && liveCatalogueVersion != null
    && Number(parsed.catalogue_version) < Number(liveCatalogueVersion)) {
    warnings.push({
      code: 'stale_workbook',
      message: `Workbook was exported at catalogue v${parsed.catalogue_version}; live is v${liveCatalogueVersion}. Re-download or explicitly acknowledge conflicts.`,
    });
  }

  // PRODUCTS
  for (const row of parsed.products || []) {
    if (!row.product_code) {
      errors.push({ entity: 'product', row: row.row, message: 'Missing Product Code' });
      continue;
    }
    const key = row.product_code.toLowerCase();
    if (workbookProductCodes.has(key)) {
      errors.push({ entity: 'product', row: row.row, product_code: row.product_code, message: 'Duplicate Product Code in workbook' });
      continue;
    }
    workbookProductCodes.add(key);

    if (!row.product_name) {
      errors.push({ entity: 'product', row: row.row, product_code: row.product_code, message: 'Missing Product Name' });
    }

    const categoryId = resolveCategoryId(row, categories);
    if ((row.category || row.subcategory) && !categoryId) {
      errors.push({
        entity: 'product',
        row: row.row,
        product_code: row.product_code,
        message: `Unknown category "${row.subcategory || row.category}"`,
      });
    }

    const existing = productsByCode.get(key);
    if (!existing) {
      if (importMode === 'UPDATE_EXISTING') {
        errors.push({
          entity: 'product',
          row: row.row,
          product_code: row.product_code,
          message: 'Product Code not found (UPDATE_EXISTING cannot create)',
        });
      } else {
        changes.push({
          entity_type: 'product',
          entity_key: row.product_code,
          product_code: row.product_code,
          change_type: 'add',
          severity: 'info',
          field_diffs: [{ field: 'product_name', before: null, after: row.product_name }],
          message: 'New product',
          apply: { kind: 'product_add', row, category_id: categoryId },
        });
      }
      continue;
    }

    const flags = statusFlags(row.status);
    const diffs = [
      fieldDiff('product_name', existing.title || existing.name, row.product_name),
      fieldDiff('local_name', existing.local_name, row.local_name),
      fieldDiff('short_description', existing.short_description, row.short_description),
      fieldDiff('ingredients', existing.ingredients, row.ingredients),
      fieldDiff('allergen_info', existing.allergen_info, row.allergen_information),
      fieldDiff('storage_note', existing.storage_note, row.storage_override),
      fieldDiff('category_id', existing.category_id, categoryId || existing.category_id),
      fieldDiff('is_published', Boolean(existing.is_published), flags.is_published),
      fieldDiff('sell_online', existing.sell_online !== false, row.sell_online !== false && flags.sell_online),
      fieldDiff('is_featured', Boolean(existing.is_featured), Boolean(row.featured)),
      fieldDiff('featured_in_hero', Boolean(existing.featured_in_hero), Boolean(row.bestseller)),
    ].filter(Boolean);

    if (diffs.length) {
      changes.push({
        entity_type: 'product',
        entity_key: row.product_code,
        product_code: row.product_code,
        change_type: 'update',
        severity: 'info',
        field_diffs: diffs,
        message: `${diffs.length} field(s)`,
        apply: {
          kind: 'product_update',
          product_id: existing.id,
          row,
          category_id: categoryId || existing.category_id,
          flags: {
            is_published: flags.is_published,
            sell_online: row.sell_online === false ? false : flags.sell_online,
            is_featured: Boolean(row.featured),
            featured_in_hero: Boolean(row.bestseller),
          },
        },
      });
    }
  }

  // PACKS
  const packsByProductCode = new Map();
  for (const pack of parsed.packs || []) {
    if (!pack.sku) {
      errors.push({ entity: 'pack', row: pack.row, message: 'Missing SKU' });
      continue;
    }
    const skuKey = pack.sku.toLowerCase();
    if (packSkuSet.has(skuKey)) {
      errors.push({ entity: 'pack', row: pack.row, sku: pack.sku, message: 'Duplicate SKU in workbook' });
      continue;
    }
    packSkuSet.add(skuKey);

    if (!pack.product_code) {
      errors.push({ entity: 'pack', row: pack.row, sku: pack.sku, message: 'Missing Product Code' });
      continue;
    }
    if (pack.pack_qty == null || !pack.unit) {
      errors.push({ entity: 'pack', row: pack.row, sku: pack.sku, message: 'Missing Pack Qty / Unit' });
      continue;
    }

    const sell = normMoney(pack.selling_price);
    const mrp = normMoney(pack.mrp);
    if (sell != null && mrp != null && sell > mrp) {
      errors.push({ entity: 'pack', row: pack.row, sku: pack.sku, message: `Selling ₹${sell} > MRP ₹${mrp}` });
    }
    if (sell == null) warnings.push({ entity: 'pack', row: pack.row, sku: pack.sku, message: 'Missing selling price' });
    if (mrp == null) warnings.push({ entity: 'pack', row: pack.row, sku: pack.sku, message: 'Missing MRP' });
    if (pack.purchase_rate == null) warnings.push({ entity: 'pack', row: pack.row, sku: pack.sku, message: 'Cost not set' });

    if (!packsByProductCode.has(pack.product_code.toLowerCase())) {
      packsByProductCode.set(pack.product_code.toLowerCase(), []);
    }
    packsByProductCode.get(pack.product_code.toLowerCase()).push(pack);

    const product = productsByCode.get(pack.product_code.toLowerCase());
    if (!product) {
      if (importMode === 'UPDATE_EXISTING') {
        errors.push({ entity: 'pack', row: pack.row, sku: pack.sku, message: 'Parent product not found' });
      }
      continue;
    }

    const existingPacks = listSellablePackVariants(product);
    const existing = existingPacks.find((v) => cleanText(v.sku).toLowerCase() === skuKey);
    const label = displayPack(pack.pack_qty, pack.unit);
    const packKg = packKgFromQtyUnit(pack.pack_qty, pack.unit);

    if (!existing) {
      if (importMode === 'UPDATE_EXISTING') {
        errors.push({ entity: 'pack', row: pack.row, sku: pack.sku, message: 'SKU not found (UPDATE_EXISTING cannot create packs)' });
      } else {
        changes.push({
          entity_type: 'pack',
          entity_key: pack.sku,
          product_code: pack.product_code,
          sku: pack.sku,
          change_type: 'add',
          severity: 'info',
          field_diffs: [
            { field: 'selling_price', before: null, after: sell },
            { field: 'mrp', before: null, after: mrp },
            { field: 'pack', before: null, after: label },
          ],
          message: 'New pack',
          apply: {
            kind: 'pack_add',
            product_id: product.id,
            pack,
            label,
            pack_kg: packKg,
            selling_price: sell,
            mrp,
          },
        });
      }
      continue;
    }

    const diffs = [
      fieldDiff('label', existing.label, label || existing.label),
      fieldDiff('pack_kg', existing.pack_kg, packKg ?? existing.pack_kg),
      fieldDiff('selling_price', normMoney(existing.price), sell),
      fieldDiff('mrp', normMoney(existing.compare_price), mrp),
    ].filter(Boolean);

    const meta = extractPricingMetaFromVariants(product.quick_variants || []);
    const purchaseBefore = normMoney(meta.purchase_rate_per_kg);
    const purchaseAfter = normMoney(pack.purchase_rate);
    if (purchaseAfter != null && purchaseBefore !== purchaseAfter) {
      diffs.push({ field: 'purchase_rate', before: purchaseBefore, after: purchaseAfter });
    }

    if (diffs.length) {
      const priceUp = sell != null && normMoney(existing.price) != null && sell > normMoney(existing.price);
      const priceDown = sell != null && normMoney(existing.price) != null && sell < normMoney(existing.price);
      if (priceUp && normMoney(existing.price) > 0 && (sell - normMoney(existing.price)) / normMoney(existing.price) > 0.25) {
        warnings.push({ entity: 'pack', sku: pack.sku, message: `Large price increase ₹${normMoney(existing.price)} → ₹${sell}` });
      }
      if (priceDown && normMoney(existing.price) > 0 && (normMoney(existing.price) - sell) / normMoney(existing.price) > 0.25) {
        warnings.push({ entity: 'pack', sku: pack.sku, message: `Large price reduction ₹${normMoney(existing.price)} → ₹${sell}` });
      }

      changes.push({
        entity_type: 'pack',
        entity_key: pack.sku,
        product_code: pack.product_code,
        sku: pack.sku,
        change_type: 'update',
        severity: 'info',
        field_diffs: diffs,
        message: priceUp ? 'price increase' : priceDown ? 'price reduction' : 'pack update',
        apply: {
          kind: 'pack_update',
          product_id: product.id,
          sku: pack.sku,
          pack,
          label: label || existing.label,
          pack_kg: packKg ?? existing.pack_kg,
          selling_price: sell,
          mrp,
          purchase_rate: purchaseAfter,
        },
      });
    }
  }

  // Pack ladder warnings (same product)
  for (const [code, list] of packsByProductCode.entries()) {
    const priced = list
      .map((p) => ({
        ...p,
        sell: normMoney(p.selling_price),
        kg: packKgFromQtyUnit(p.pack_qty, p.unit),
      }))
      .filter((p) => p.sell != null && p.kg != null && p.kg > 0)
      .sort((a, b) => a.kg - b.kg);
    for (let i = 1; i < priced.length; i += 1) {
      const smaller = priced[i - 1];
      const larger = priced[i];
      const unitSmall = smaller.sell / smaller.kg;
      const unitLarge = larger.sell / larger.kg;
      if (unitLarge > unitSmall * 1.02) {
        warnings.push({
          entity: 'pack',
          sku: larger.sku,
          message: `Larger pack worse value than ${smaller.sku} (₹/unit)`,
        });
      }
    }
  }

  const summary = {
    products_in_workbook: (parsed.products || []).length,
    packs_in_workbook: (parsed.packs || []).length,
    products_added: changes.filter((c) => c.entity_type === 'product' && c.change_type === 'add').length,
    products_updated: changes.filter((c) => c.entity_type === 'product' && c.change_type === 'update').length,
    packs_added: changes.filter((c) => c.entity_type === 'pack' && c.change_type === 'add').length,
    packs_updated: changes.filter((c) => c.entity_type === 'pack' && c.change_type === 'update').length,
    price_increases: changes.filter((c) => c.message === 'price increase').length,
    price_reductions: changes.filter((c) => c.message === 'price reduction').length,
    change_count: changes.length,
    errors: errors.length,
    warnings: warnings.length,
    stale_workbook: warnings.some((w) => w.code === 'stale_workbook'),
  };

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    changes,
    summary,
  };
}

export function buildSnapshotForChanges(products, changes) {
  const ids = new Set(
    changes
      .map((c) => c.apply?.product_id)
      .filter(Boolean),
  );
  return (products || [])
    .filter((p) => ids.has(p.id))
    .map((p) => ({
      id: p.id,
      product_code: productCodeOf(p),
      name: p.name || p.title,
      local_name: p.local_name || null,
      short_description: p.short_description || null,
      ingredients: p.ingredients || null,
      allergen_info: p.allergen_info || null,
      storage_note: p.storage_note || null,
      category_id: p.category_id || null,
      is_published: p.is_published !== false,
      sell_online: p.sell_online !== false,
      is_featured: Boolean(p.is_featured),
      featured_in_hero: Boolean(p.featured_in_hero),
      quick_variants: Array.isArray(p.quick_variants) ? p.quick_variants : [],
    }));
}

export { statusFlags, packKgFromQtyUnit, displayPack, productCodeOf, isPricingMetaVariant };
