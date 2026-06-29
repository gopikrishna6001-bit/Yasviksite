/** Canonical media library folders — maps to R2 subpaths + media_assets.entity_type */
export const MEDIA_FOLDERS = [
  { id: 'products', label: 'Products', description: 'Product hero & gallery images' },
  { id: 'categories', label: 'Categories', description: 'Category cover tiles' },
  { id: 'combos', label: 'Combos', description: 'Bundle / combo hero images' },
  { id: 'heroes', label: 'Heroes', description: 'Homepage & page hero banners' },
  { id: 'stories', label: 'Stories', description: 'Story cover images' },
  { id: 'people', label: 'People', description: 'Farmer & team portraits' },
  { id: 'illustrations', label: 'Illustrations', description: 'Site atmosphere artwork' },
  { id: 'brand', label: 'Brand', description: 'Logos & brand assets' },
  { id: 'customers', label: 'Profile pictures', description: 'Customer avatar & profile photos' },
  { id: 'general', label: 'General', description: 'Misc uploads' },
];

export const MEDIA_FOLDER_IDS = MEDIA_FOLDERS.map((folder) => folder.id);

const FOLDER_BY_ID = Object.fromEntries(MEDIA_FOLDERS.map((folder) => [folder.id, folder]));

export function getMediaFolderLabel(folderId = '') {
  return FOLDER_BY_ID[String(folderId || 'general')]?.label || 'General';
}

export function isAllowedMediaFolder(folderId = '') {
  return MEDIA_FOLDER_IDS.includes(String(folderId || 'general'));
}

export function normalizeMediaFolder(folderId = '') {
  const value = String(folderId || 'general').trim().toLowerCase();
  return isAllowedMediaFolder(value) ? value : 'general';
}

export function assetMatchesFolder(asset = {}, folderId = 'all') {
  if (!folderId || folderId === 'all') return true;

  const entityType = String(asset.entity_type || '').toLowerCase();
  if (entityType === folderId) return true;

  const filePath = String(asset.file_path || asset.file_url || asset.upload_url || '').toLowerCase();
  return filePath.includes(`/media-assets/${folderId}/`) || filePath.includes(`/${folderId}/`);
}

export function buildMediaAssetName(file, folderId = 'general') {
  const base = String(file?.name || 'upload').replace(/\.[^.]+$/, '');
  return `${getMediaFolderLabel(folderId)} · ${base}`;
}
