/**
 * Phase 3 — catalogue media ZIP → R2 → product hero/gallery.
 * Naming: <PRODUCT_CODE>_hero.webp, <PRODUCT_CODE>_2.webp, <PRODUCT_CODE>_3.webp
 * Blank / missing files never delete existing images.
 */

import { unzipSync } from 'fflate';
import { appClient } from '@/api/appClient';
import { supabase } from '@/api/supabaseClient';

const MAX_ZIP_BYTES = 80 * 1024 * 1024;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_FILES = 250;
const ALLOWED_EXT = new Set(['webp', 'jpg', 'jpeg', 'png']);

const NAME_RE = /^(.+?)_(hero|[2-9]|gallery[1-9]?)\.(webp|jpe?g|png)$/i;

function cleanCode(value) {
  return String(value || '').trim();
}

function productCodeOf(product) {
  return cleanCode(product.product_code) || cleanCode(product.sku) || cleanCode(product.slug);
}

function basename(path) {
  const parts = String(path || '').replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || '';
}

function isSafeZipPath(path) {
  const raw = String(path || '').replace(/\\/g, '/');
  if (!raw || raw.endsWith('/')) return false;
  if (raw.startsWith('/') || raw.includes('..')) return false;
  if (/^[a-zA-Z]:/.test(raw)) return false;
  return true;
}

function parseMediaFilename(filename) {
  const base = basename(filename);
  const match = base.match(NAME_RE);
  if (!match) return null;
  const productCode = match[1].trim();
  const roleRaw = match[2].toLowerCase();
  const ext = match[3].toLowerCase();
  if (!ALLOWED_EXT.has(ext === 'jpeg' ? 'jpg' : ext) && !ALLOWED_EXT.has(ext)) return null;

  let role = 'gallery';
  let sortOrder = 2;
  if (roleRaw === 'hero') {
    role = 'hero';
    sortOrder = 0;
  } else if (/^\d+$/.test(roleRaw)) {
    sortOrder = Number(roleRaw);
  } else if (roleRaw.startsWith('gallery')) {
    const n = Number(roleRaw.replace('gallery', '')) || 2;
    sortOrder = n;
  }

  return { productCode, role, sortOrder, filename: base, ext };
}

/**
 * @returns {{ entries: object[], errors: object[], warnings: object[] }}
 */
export function parseCatalogueMediaZip(uint8Array) {
  if (!(uint8Array instanceof Uint8Array)) {
    throw new Error('Invalid ZIP data');
  }
  if (uint8Array.byteLength > MAX_ZIP_BYTES) {
    throw new Error('ZIP exceeds 80MB limit');
  }

  let unzipped;
  try {
    unzipped = unzipSync(uint8Array);
  } catch {
    throw new Error('Could not read ZIP — use a standard .zip of images');
  }

  const entries = [];
  const errors = [];
  const warnings = [];
  const paths = Object.keys(unzipped);

  if (paths.length > MAX_FILES) {
    errors.push({ message: `ZIP has ${paths.length} files (max ${MAX_FILES})` });
    return { entries, errors, warnings };
  }

  for (const path of paths) {
    if (!isSafeZipPath(path)) {
      errors.push({ message: `Rejected unsafe path: ${path}` });
      continue;
    }
    const data = unzipped[path];
    if (!data || !data.length) continue;
    if (data.byteLength > MAX_FILE_BYTES) {
      errors.push({ message: `${basename(path)} exceeds 25MB` });
      continue;
    }

    const parsed = parseMediaFilename(path);
    if (!parsed) {
      if (/\.(webp|jpe?g|png)$/i.test(path)) {
        warnings.push({
          message: `${basename(path)} ignored — use PRODUCTCODE_hero.webp or PRODUCTCODE_2.webp`,
        });
      }
      continue;
    }

    const mime = parsed.ext === 'png'
      ? 'image/png'
      : parsed.ext === 'webp'
        ? 'image/webp'
        : 'image/jpeg';

    entries.push({
      ...parsed,
      path,
      bytes: data,
      mime,
      size: data.byteLength,
    });
  }

  return { entries, errors, warnings };
}

export function matchMediaEntriesToProducts(entries, products = []) {
  const byCode = new Map();
  for (const p of products) {
    const code = productCodeOf(p);
    if (!code) continue;
    byCode.set(code.toLowerCase(), p);
  }

  const matched = [];
  const unmatched = [];

  for (const entry of entries) {
    const product = byCode.get(entry.productCode.toLowerCase());
    if (!product) {
      unmatched.push({ ...entry, reason: `No product with Product Code "${entry.productCode}"` });
      continue;
    }
    matched.push({ ...entry, product });
  }

  // Group by product for preview
  const byProduct = new Map();
  for (const row of matched) {
    const id = row.product.id;
    if (!byProduct.has(id)) {
      byProduct.set(id, {
        product: row.product,
        productCode: productCodeOf(row.product),
        hero: null,
        gallery: [],
      });
    }
    const bucket = byProduct.get(id);
    if (row.role === 'hero') bucket.hero = row;
    else bucket.gallery.push(row);
  }
  for (const bucket of byProduct.values()) {
    bucket.gallery.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  return {
    matched,
    unmatched,
    byProduct: [...byProduct.values()],
  };
}

async function loadGalleryUrls(productId) {
  const { data, error } = await supabase
    .from('product_images')
    .select('image_url, sort_order, is_primary')
    .eq('product_id', productId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data || []).map((r) => r.image_url).filter(Boolean);
}

async function uploadBytesAsFile(entry, product) {
  const file = new File([entry.bytes], entry.filename, { type: entry.mime });
  const result = await appClient.integrations.Core.UploadFile({
    file,
    folder: 'products',
    seoName: productCodeOf(product) || product.slug || product.name,
    assetRole: entry.role === 'hero' ? 'hero' : `gallery-${entry.sortOrder}`,
    entityId: product.id,
    entityTitle: product.title || product.name || '',
  });
  return result.file_url;
}

/**
 * Apply matched media. Never clears images that were not in the ZIP.
 */
export async function applyCatalogueMediaMatches(byProduct = [], { onProgress } = {}) {
  const results = [];
  let index = 0;
  const total = byProduct.length;

  for (const group of byProduct) {
    index += 1;
    onProgress?.({ index, total, productCode: group.productCode });

    const product = group.product;
    const existingHero = String(product.featured_image_url || product.hero_image || '').trim();
    const existingGallery = await loadGalleryUrls(product.id);

    let nextHero = existingHero;
    const uploads = [];

    if (group.hero) {
      const url = await uploadBytesAsFile(group.hero, product);
      nextHero = url;
      uploads.push({ role: 'hero', url, filename: group.hero.filename });
    }

    // Start from existing gallery (excluding hero duplicates)
    const slotMap = new Map();
    existingGallery
      .filter((u) => u && u !== existingHero && u !== nextHero)
      .forEach((url, i) => {
        slotMap.set(i + 2, url); // _2, _3, …
      });

    for (const g of group.gallery) {
      const url = await uploadBytesAsFile(g, product);
      slotMap.set(g.sortOrder, url);
      uploads.push({ role: `gallery-${g.sortOrder}`, url, filename: g.filename });
    }

    const nextGallery = [...slotMap.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, url]) => url)
      .filter(Boolean);

    // Prefer hero first in product_images
    const imageList = nextHero
      ? [nextHero, ...nextGallery.filter((u) => u !== nextHero)]
      : nextGallery;

    const { error: prodErr } = await supabase
      .from('products')
      .update({ featured_image_url: nextHero || null })
      .eq('id', product.id);
    if (prodErr) throw new Error(`${group.productCode}: ${prodErr.message}`);

    await supabase.from('product_images').delete().eq('product_id', product.id);
    if (imageList.length) {
      const rows = imageList.map((url, i) => ({
        product_id: product.id,
        image_url: url,
        sort_order: i,
        is_primary: i === 0,
      }));
      const { error: imgErr } = await supabase.from('product_images').insert(rows);
      if (imgErr) throw new Error(`${group.productCode} gallery: ${imgErr.message}`);
    }

    results.push({
      product_id: product.id,
      product_code: group.productCode,
      hero_changed: Boolean(group.hero),
      gallery_changed: group.gallery.length > 0,
      uploads,
      kept_existing: !group.hero && group.gallery.length === 0,
    });
  }

  return results;
}

export async function processCatalogueMediaZipFile(file, products, { onProgress } = {}) {
  if (!file) throw new Error('Choose a ZIP file');
  if (!/\.zip$/i.test(file.name || '')) throw new Error('Upload a .zip file');
  if (file.size > MAX_ZIP_BYTES) throw new Error('ZIP exceeds 80MB limit');

  const buffer = new Uint8Array(await file.arrayBuffer());
  const parsed = parseCatalogueMediaZip(buffer);
  if (parsed.errors.length && !parsed.entries.length) {
    throw new Error(parsed.errors[0].message);
  }

  const matched = matchMediaEntriesToProducts(parsed.entries, products);
  return {
    ...parsed,
    ...matched,
  };
}
