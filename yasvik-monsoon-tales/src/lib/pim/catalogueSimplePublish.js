/**
 * Publish / rollback simple catalogue imports.
 * Never deletes products absent from the workbook.
 */

import { supabase } from '@/api/supabaseClient';
import {
  extractPricingMetaFromVariants,
  mergePricingMetaIntoQuickVariants,
  isPricingMetaVariant,
} from '@/lib/productPricingMeta';
import { CATALOGUE_SCHEMA_VERSION } from '@/lib/pim/catalogueConstants';
import { slugify } from '@/lib/launchCatalogImport';
import {
  buildSnapshotForChanges,
  displayPack,
} from '@/lib/pim/catalogueSimpleValidateDiff';

function cleanText(value) {
  return String(value ?? '').trim();
}

function applyPackToVariants(quickVariants, applyRow) {
  const variants = Array.isArray(quickVariants) ? [...quickVariants] : [];
  const meta = extractPricingMetaFromVariants(variants);
  const visible = variants.filter((v) => v && !isPricingMetaVariant(v));
  const skuKey = cleanText(applyRow.sku).toLowerCase();
  let found = false;

  const nextVisible = visible.map((v) => {
    if (cleanText(v.sku).toLowerCase() !== skuKey) return v;
    found = true;
    return {
      ...v,
      label: applyRow.label || v.label,
      pack_kg: applyRow.pack_kg ?? v.pack_kg,
      price: applyRow.selling_price ?? v.price,
      compare_price: applyRow.mrp ?? v.compare_price,
      sku: applyRow.sku || v.sku,
    };
  });

  if (!found && applyRow.kind === 'pack_add') {
    nextVisible.push({
      variant_id: crypto.randomUUID?.() || `var_${Date.now()}`,
      sku: applyRow.sku,
      label: applyRow.label || displayPack(applyRow.pack?.pack_qty, applyRow.pack?.unit),
      pack_kg: applyRow.pack_kg,
      price: applyRow.selling_price,
      compare_price: applyRow.mrp,
      stock: 0,
    });
  }

  if (applyRow.purchase_rate != null) {
    meta.purchase_rate_per_kg = String(applyRow.purchase_rate);
  }

  return mergePricingMetaIntoQuickVariants(nextVisible, meta, variants);
}

async function bumpCatalogueVersion({ productCount, variantCount, actorUserId, label, notes }) {
  const { data: latest } = await supabase
    .from('catalogue_versions')
    .select('version_number')
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();
  const next = Number(latest?.version_number || 0) + 1;
  const { data, error } = await supabase
    .from('catalogue_versions')
    .insert({
      version_number: next,
      schema_version: CATALOGUE_SCHEMA_VERSION,
      label,
      source: 'import',
      notes,
      product_count: productCount,
      variant_count: variantCount,
      created_by: actorUserId,
    })
    .select('*')
    .single();
  if (error) throw new Error(`catalogue_versions: ${error.message}`);
  return data;
}

export async function saveCatalogueImportDraft({
  parsed,
  validation,
  importMode = 'UPDATE_EXISTING',
  actorUserId = null,
  acknowledgeStale = false,
  liveCatalogueVersion = null,
} = {}) {
  if (!validation.ok) {
    throw new Error(`Fix ${validation.errors.length} error(s) before saving draft.`);
  }
  if (validation.summary.stale_workbook && !acknowledgeStale) {
    throw new Error('Workbook is stale. Re-download latest or acknowledge conflicts.');
  }

  const slimChanges = validation.changes.map(({ apply, ...rest }) => ({
    ...rest,
    apply,
  }));

  const { data, error } = await supabase
    .from('catalogue_import_runs')
    .insert({
      import_mode: importMode,
      status: 'draft',
      schema_version: parsed.schema_version,
      workbook_catalogue_version: parsed.catalogue_version,
      catalogue_version_before: liveCatalogueVersion,
      workbook_filename: parsed.filename,
      workbook_hash: parsed.workbook_hash,
      stale_workbook: Boolean(validation.summary.stale_workbook),
      error_count: validation.errors.length,
      warning_count: validation.warnings.length,
      change_count: validation.changes.length,
      product_count: parsed.products.length,
      variant_count: parsed.packs.length,
      summary: validation.summary,
      parsed_payload: {
        products: parsed.products,
        packs: parsed.packs,
        meta: parsed.meta,
      },
      validation_report: { errors: validation.errors, warnings: validation.warnings },
      diff_report: { changes: slimChanges },
      imported_by: actorUserId,
      validated_at: new Date().toISOString(),
      notes: acknowledgeStale ? 'Owner acknowledged stale workbook' : null,
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);

  if (slimChanges.length) {
    const chunk = slimChanges.slice(0, 500).map((c) => ({
      import_id: data.id,
      entity_type: c.entity_type,
      entity_key: c.entity_key,
      product_code: c.product_code || null,
      sku: c.sku || null,
      change_type: c.change_type,
      severity: c.severity || 'info',
      field_diffs: c.field_diffs || [],
      message: c.message || null,
    }));
    await supabase.from('catalogue_import_changes').insert(chunk);
  }

  return data;
}

export async function publishCatalogueImportRun({
  importId,
  products,
  actorUserId = null,
} = {}) {
  const { data: run, error } = await supabase
    .from('catalogue_import_runs')
    .select('*')
    .eq('id', importId)
    .single();
  if (error || !run) throw new Error(error?.message || 'Import run not found');
  if (!['draft', 'approved'].includes(run.status)) {
    throw new Error(`Cannot publish import in status "${run.status}"`);
  }

  const changes = run.diff_report?.changes || [];
  if (!changes.length) {
    await supabase.from('catalogue_import_runs').update({
      status: 'published',
      published_by: actorUserId,
      published_at: new Date().toISOString(),
      notes: 'No changes',
    }).eq('id', importId);
    return { published: 0, run };
  }

  const snapshot = buildSnapshotForChanges(products, changes);
  await supabase.from('catalogue_import_runs').update({
    status: 'publishing',
    snapshot_before: snapshot,
    approved_by: actorUserId,
    approved_at: new Date().toISOString(),
  }).eq('id', importId);

  const productsById = new Map(products.map((p) => [p.id, { ...p }]));
  let applied = 0;

  try {
    for (const change of changes) {
      const apply = change.apply;
      if (!apply) continue;

      if (apply.kind === 'product_update') {
        const current = productsById.get(apply.product_id);
        if (!current) throw new Error(`Missing product ${apply.product_id}`);
        const patch = {
          name: apply.row.product_name || current.name || current.title,
          local_name: apply.row.local_name || null,
          short_description: apply.row.short_description || null,
          ingredients: apply.row.ingredients || null,
          allergen_info: apply.row.allergen_information || null,
          storage_note: apply.row.storage_override || null,
          category_id: apply.category_id || current.category_id,
          is_published: apply.flags.is_published,
          sell_online: apply.flags.sell_online,
          is_featured: apply.flags.is_featured,
          featured_in_hero: apply.flags.featured_in_hero,
        };
        const { error: upErr } = await supabase.from('products').update(patch).eq('id', apply.product_id);
        if (upErr) throw new Error(upErr.message);
        productsById.set(apply.product_id, { ...current, ...patch, title: patch.name });
        applied += 1;
      }

      if (apply.kind === 'product_add') {
        const code = apply.row.product_code;
        const name = apply.row.product_name || code;
        const slugBase = slugify(name) || slugify(code) || `product-${Date.now()}`;
        const insert = {
          name,
          product_code: code,
          sku: code,
          slug: slugBase,
          local_name: apply.row.local_name || null,
          short_description: apply.row.short_description || null,
          ingredients: apply.row.ingredients || null,
          allergen_info: apply.row.allergen_information || null,
          storage_note: apply.row.storage_override || null,
          category_id: apply.category_id,
          is_published: false,
          sell_online: apply.row.sell_online !== false,
          is_featured: Boolean(apply.row.featured),
          featured_in_hero: Boolean(apply.row.bestseller),
          quick_variants: [],
          price: 0,
        };
        const { data: created, error: crErr } = await supabase.from('products').insert(insert).select('*').single();
        if (crErr) throw new Error(crErr.message);
        productsById.set(created.id, created);
        applied += 1;
      }

      if (apply.kind === 'pack_update' || apply.kind === 'pack_add') {
        const current = productsById.get(apply.product_id);
        if (!current) throw new Error(`Missing product for pack ${apply.sku}`);
        const nextVariants = applyPackToVariants(current.quick_variants, apply);
        const { error: upErr } = await supabase
          .from('products')
          .update({ quick_variants: nextVariants })
          .eq('id', apply.product_id);
        if (upErr) throw new Error(upErr.message);
        productsById.set(apply.product_id, { ...current, quick_variants: nextVariants });
        applied += 1;
      }
    }

    const version = await bumpCatalogueVersion({
      productCount: productsById.size,
      variantCount: changes.filter((c) => c.entity_type === 'pack').length,
      actorUserId,
      label: 'Catalogue import publish',
      notes: `import ${importId}`,
    });

    const { data: published, error: finErr } = await supabase
      .from('catalogue_import_runs')
      .update({
        status: 'published',
        published_by: actorUserId,
        published_at: new Date().toISOString(),
        catalogue_version_after: version.version_number,
      })
      .eq('id', importId)
      .select('*')
      .single();
    if (finErr) throw new Error(finErr.message);

    return { published: applied, run: published, version };
  } catch (err) {
    await supabase.from('catalogue_import_runs').update({
      status: 'failed',
      notes: err?.message || 'Publish failed',
    }).eq('id', importId);
    throw err;
  }
}

export async function rollbackCatalogueImportRun({ importId, actorUserId = null } = {}) {
  const { data: run, error } = await supabase
    .from('catalogue_import_runs')
    .select('*')
    .eq('id', importId)
    .single();
  if (error || !run) throw new Error(error?.message || 'Import run not found');
  if (run.status !== 'published') throw new Error('Only published imports can be rolled back');
  if (!Array.isArray(run.snapshot_before) || !run.snapshot_before.length) {
    throw new Error('No snapshot available for rollback');
  }

  for (const snap of run.snapshot_before) {
    const { error: upErr } = await supabase.from('products').update({
      name: snap.name,
      local_name: snap.local_name,
      short_description: snap.short_description,
      ingredients: snap.ingredients,
      allergen_info: snap.allergen_info,
      storage_note: snap.storage_note,
      category_id: snap.category_id,
      is_published: snap.is_published,
      sell_online: snap.sell_online,
      is_featured: snap.is_featured,
      featured_in_hero: snap.featured_in_hero,
      quick_variants: snap.quick_variants || [],
    }).eq('id', snap.id);
    if (upErr) throw new Error(`Rollback failed for ${snap.product_code || snap.id}: ${upErr.message}`);
  }

  const version = await bumpCatalogueVersion({
    productCount: run.snapshot_before.length,
    variantCount: null,
    actorUserId,
    label: 'Catalogue import rollback',
    notes: `rollback of ${importId}`,
  });

  const { data: rolled, error: finErr } = await supabase
    .from('catalogue_import_runs')
    .update({
      status: 'rolled_back',
      rolled_back_at: new Date().toISOString(),
      catalogue_version_after: version.version_number,
      notes: `Rolled back by ${actorUserId || 'admin'}`,
    })
    .eq('id', importId)
    .select('*')
    .single();
  if (finErr) throw new Error(finErr.message);

  return { run: rolled, version, restored: run.snapshot_before.length };
}

export async function listCatalogueImportRuns(limit = 20) {
  const { data, error } = await supabase
    .from('catalogue_import_runs')
    .select('id, status, import_mode, workbook_filename, change_count, error_count, warning_count, summary, stale_workbook, imported_at, published_at, rolled_back_at, catalogue_version_before, catalogue_version_after')
    .order('imported_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function getCatalogueImportRun(id) {
  const { data, error } = await supabase
    .from('catalogue_import_runs')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}
