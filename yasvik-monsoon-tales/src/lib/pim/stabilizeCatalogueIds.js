/**
 * Stabilize permanent IDs for PIM-lite Phase 1.
 * - Ensures every sellable pack has variant_id (UUID) + sku
 * - Dual-writes product_variants shadow table
 * - Fills blank product_code from product.sku
 * - Does not change prices, names, or storefront behaviour
 */

import { supabase } from '@/api/supabaseClient';
import { isPricingMetaVariant } from '@/lib/productPricingMeta';
import { CATALOGUE_SCHEMA_VERSION } from '@/lib/pim/catalogueConstants';
import {
  listSellablePackVariants,
  splitPackQuantityUnit,
  suggestPackSku,
} from '@/lib/pim/packUnits';

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `var_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Postgres numeric columns reject "". Treat blank as null. */
function toNumericOrNull(value) {
  if (value === '' || value === null || value === undefined) return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toTextOrNull(value) {
  const raw = String(value ?? '').trim();
  return raw || null;
}

function collectUsedPackSkus(products = []) {
  const used = new Set();
  for (const product of products) {
    for (const v of Array.isArray(product.quick_variants) ? product.quick_variants : []) {
      if (!v || isPricingMetaVariant(v)) continue;
      const sku = String(v.sku || '').trim();
      if (sku) used.add(sku.toLowerCase());
    }
  }
  return used;
}

/**
 * @returns {{ productsUpdated: number, packsTouched: number, skusAssigned: number, variantIdsAssigned: number, productCodesFilled: number, variantRows: object[] }}
 */
export function planCatalogueIdStabilization(products = []) {
  const usedSkus = collectUsedPackSkus(products);
  const updates = [];
  let packsTouched = 0;
  let skusAssigned = 0;
  let variantIdsAssigned = 0;
  let productCodesFilled = 0;
  const variantRows = [];

  for (const product of products) {
    const raw = Array.isArray(product.quick_variants) ? [...product.quick_variants] : [];
    let dirty = false;
    let code = String(product.product_code || '').trim();
    if (!code && product.sku) {
      code = String(product.sku).trim();
      productCodesFilled += 1;
      dirty = true;
    }

    let sellableIndex = 0;
    const nextVariants = raw.map((variant) => {
      if (!variant || isPricingMetaVariant(variant)) return variant;
      const row = { ...variant };
      const split = splitPackQuantityUnit(row, product.stock_measure_type || 'kg');
      let changed = false;
      const packIndex = sellableIndex;
      sellableIndex += 1;

      if (!String(row.variant_id || '').trim()) {
        row.variant_id = newId();
        variantIdsAssigned += 1;
        changed = true;
      }
      if (!String(row.sku || '').trim()) {
        const sku = suggestPackSku(product.sku || code || product.product_code, split.display_pack || row.label, usedSkus);
        usedSkus.add(sku.toLowerCase());
        row.sku = sku;
        skusAssigned += 1;
        changed = true;
      } else {
        usedSkus.add(String(row.sku).trim().toLowerCase());
      }

      if (changed) {
        packsTouched += 1;
        dirty = true;
      }

      variantRows.push({
        id: String(row.variant_id).trim(),
        product_id: product.id,
        sku: String(row.sku).trim(),
        label: toTextOrNull(row.label || split.display_pack) || 'Pack',
        pack_quantity: toNumericOrNull(split.pack_quantity),
        pack_unit: toTextOrNull(split.pack_unit),
        display_pack: toTextOrNull(split.display_pack || row.label) || 'Pack',
        pack_kg: toNumericOrNull(row.pack_kg),
        barcode: toTextOrNull(row.barcode || row.sku),
        shipping_weight: toNumericOrNull(row.shipping_weight),
        stock_tracking_enabled: true,
        low_stock_level: toNumericOrNull(product.low_stock_threshold),
        status: 'Active',
        default_variant: packIndex === 0,
        sort_order: toNumericOrNull(row.sort_order) ?? (packIndex + 1) * 10,
        price: toNumericOrNull(row.price),
        compare_price: toNumericOrNull(row.compare_price),
        store_price: toNumericOrNull(row.store_price),
        store_compare_price: toNumericOrNull(row.store_compare_price),
        stock: toNumericOrNull(row.stock),
        source: 'quick_variants',
        is_active: true,
        updated_at: new Date().toISOString(),
      });

      return row;
    });

    if (dirty) {
      updates.push({
        id: product.id,
        quick_variants: nextVariants,
        ...(code && code !== String(product.product_code || '').trim() ? { product_code: code } : {}),
      });
    }
  }

  return {
    productsUpdated: updates.length,
    packsTouched,
    skusAssigned,
    variantIdsAssigned,
    productCodesFilled,
    updates,
    variantRows,
  };
}

export async function applyCatalogueIdStabilization(products = [], { actorUserId = null } = {}) {
  const plan = planCatalogueIdStabilization(products);

  for (const patch of plan.updates) {
    const { id, ...fields } = patch;
    const { error } = await supabase.from('products').update(fields).eq('id', id);
    if (error) throw new Error(`Failed updating product ${id}: ${error.message}`);
  }

  // Deduplicate by sku (keep last) so unique constraint cannot fail mid-batch
  const bySku = new Map();
  for (const row of plan.variantRows) {
    if (!row.id || !row.sku || !row.product_id) continue;
    bySku.set(row.sku.toLowerCase(), row);
  }
  const rows = [...bySku.values()];

  const chunkSize = 80;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from('product_variants').upsert(chunk, { onConflict: 'id' });
    if (error) {
      throw new Error(`product_variants upsert failed: ${error.message}`);
    }
  }

  const { data: latest, error: verErr } = await supabase
    .from('catalogue_versions')
    .select('version_number')
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (verErr) throw new Error(`catalogue_versions read failed: ${verErr.message}`);

  const nextVersion = Number(latest?.version_number || 0) + 1;
  const { data: versionRow, error: insertErr } = await supabase
    .from('catalogue_versions')
    .insert({
      version_number: nextVersion,
      schema_version: CATALOGUE_SCHEMA_VERSION,
      label: 'ID stabilization',
      source: 'stabilize',
      notes: `Assigned ${plan.variantIdsAssigned} variant_ids, ${plan.skusAssigned} pack SKUs; upserted ${rows.length} product_variants`,
      product_count: products.length,
      variant_count: rows.length,
      created_by: actorUserId,
    })
    .select('*')
    .single();
  if (insertErr) throw new Error(`catalogue_versions insert failed: ${insertErr.message}`);

  return { ...plan, variantRows: rows, version: versionRow };
}

export async function fetchLatestCatalogueVersion() {
  const { data, error } = await supabase
    .from('catalogue_versions')
    .select('*')
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export function sellablePackCount(products = []) {
  return products.reduce((sum, p) => sum + listSellablePackVariants(p).length, 0);
}
