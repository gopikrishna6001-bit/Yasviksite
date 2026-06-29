import { supabase } from '@/api/supabaseClient';
import { normalizeMediaStorageKey } from '@/lib/mediaStorageKey';

function urlMatchesReference(reference = '', targetKey = '') {
  const refKey = normalizeMediaStorageKey(reference);
  if (!refKey || !targetKey) return false;
  return refKey === targetKey || refKey.endsWith(`/${targetKey.split('/').pop()}`);
}

async function countRowsWithValue(table, column, targetKey, excludeId = null) {
  const { data, error } = await supabase.from(table).select(`id,${column}`);
  if (error) return 0;
  return (data || []).filter((row) => {
    if (excludeId && row.id === excludeId) return false;
    return urlMatchesReference(row[column], targetKey);
  }).length;
}

/** Count how many catalog rows still reference a media object key. */
export async function countMediaReferences(targetKey, { excludeMediaAssetId = null } = {}) {
  const key = normalizeMediaStorageKey(targetKey);
  if (!key) return 0;

  const checks = await Promise.all([
    supabase.from('media_assets').select('id,file_path,upload_url').then(({ data }) =>
      (data || []).filter((row) => {
        if (excludeMediaAssetId && row.id === excludeMediaAssetId) return false;
        return urlMatchesReference(row.file_path, key) || urlMatchesReference(row.upload_url, key);
      }).length,
    ),
    countRowsWithValue('products', 'featured_image_url', key),
    countRowsWithValue('categories', 'cover_image', key),
    countRowsWithValue('categories', 'icon_url', key),
    countRowsWithValue('combos', 'featured_image_url', key),
    countRowsWithValue('stories', 'cover_image', key),
    countRowsWithValue('people', 'portrait_image', key),
    countRowsWithValue('journeys', 'cover_image', key),
    countRowsWithValue('page_heroes', 'media_url', key),
    supabase.from('product_images').select('id,image_url').then(({ data }) =>
      (data || []).filter((row) => urlMatchesReference(row.image_url, key)).length,
    ),
  ]);

  return checks.reduce((sum, count) => sum + Number(count || 0), 0);
}

export function formatBytes(bytes = 0) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}
