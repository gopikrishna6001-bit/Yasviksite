import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { files as fileService, mediaAssets } from '@/services/api';
import { motion } from 'framer-motion';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import {
  MEDIA_FOLDERS,
  assetMatchesFolder,
  getMediaFolderLabel,
  normalizeMediaFolder,
} from '@/lib/mediaFolders';
import {
  MEDIA_LIBRARY_LIMIT,
  MEDIA_LIBRARY_QUERY_KEY,
  mediaLibraryQueryOptions,
} from '@/lib/mediaLibraryQuery';
import { countMediaReferences, formatBytes } from '@/lib/mediaReferences';
import { normalizeMediaStorageKey } from '@/lib/mediaStorageKey';
import { Upload, Trash2, Image, Film, X, FolderOpen } from 'lucide-react';

const getAssetUrl = (asset) => asset?.file_url || asset?.upload_url || asset?.url || '';
const getAssetType = (asset) => asset?.file_type || asset?.media_type || 'image';
const getAssetTitle = (asset) => asset?.title || asset?.name || 'Untitled';

export default function AdminMedia() {
  const qc = useQueryClient();
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [activeFolder, setActiveFolder] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [previewItem, setPreviewItem] = useState(null);

  const { data: assets = [], isLoading } = useQuery({
    ...mediaLibraryQueryOptions(),
    queryFn: () => mediaAssets.list('-created_date', MEDIA_LIBRARY_LIMIT),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => mediaAssets.delete(id),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: MEDIA_LIBRARY_QUERY_KEY });
      if (result?.storageDeleted) {
        alert('Deleted from media library and R2 storage.');
      } else {
        alert('Removed from media library. File kept in R2 because it is still used on the site.');
      }
    },
    onError: (err) => alert(err?.message || 'Delete failed'),
  });

  const handleDelete = async (asset, event) => {
    event.stopPropagation();
    const storageKey = normalizeMediaStorageKey(asset.file_path || asset.upload_url || getAssetUrl(asset));
    const refs = storageKey ? await countMediaReferences(storageKey, { excludeMediaAssetId: asset.id }) : 0;
    const sizeLabel = asset.file_size ? formatBytes(asset.file_size) : 'unknown size';
    const message = refs > 0
      ? `"${getAssetTitle(asset)}" (${sizeLabel}) is still used in ${refs} place(s).\n\nRemove from library only? The file stays in R2 until nothing references it.`
      : `"${getAssetTitle(asset)}" (${sizeLabel}) will be permanently deleted from R2 storage and the media library.\n\nContinue?`;
    if (!window.confirm(message)) return;
    deleteMut.mutate(asset.id);
  };

  const handleUpload = async (e) => {
    const uploadFiles = Array.from(e.target.files || []);
    if (!uploadFiles.length) return;
    setUploading(true);
    try {
      const folder = activeFolder === 'all' ? 'general' : normalizeMediaFolder(activeFolder);
      for (const file of uploadFiles) {
        await fileService.upload(file, { folder, label: file.name });
      }
      qc.invalidateQueries({ queryKey: MEDIA_LIBRARY_QUERY_KEY });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const filtered = assets.filter((asset) => {
    const matchFolder = assetMatchesFolder(asset, activeFolder);
    const matchType = filterType === 'all' || getAssetType(asset) === filterType;
    return matchFolder && matchType;
  });

  const folderCounts = MEDIA_FOLDERS.reduce((acc, folder) => {
    acc[folder.id] = assets.filter((asset) => assetMatchesFolder(asset, folder.id)).length;
    return acc;
  }, {});

  const activeFolderMeta = MEDIA_FOLDERS.find((folder) => folder.id === activeFolder);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <AdminPageHeader
        title="Media Library"
        description="Organised folders for products, categories, combos, heroes and more — linked to R2."
        action={(
          <>
            <input ref={fileRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleUpload} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 py-2.5 px-5 bg-wet-earth text-white font-inter text-sm rounded-full hover:bg-wet-earth/90 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {uploading ? 'Uploading…' : activeFolder === 'all' ? 'Upload to General' : `Upload to ${activeFolderMeta?.label || 'folder'}`}
            </button>
          </>
        )}
      />

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="space-y-2">
          <button
            type="button"
            onClick={() => setActiveFolder('all')}
            className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 font-inter text-sm transition-all ${activeFolder === 'all' ? 'bg-rain-cloud text-white' : 'bg-white border border-border text-rain-cloud/70 hover:bg-rain-mist/30'}`}
          >
            <span className="flex items-center gap-2"><FolderOpen className="w-4 h-4" /> All media</span>
            <span className="text-xs opacity-70">{assets.length}</span>
          </button>
          {MEDIA_FOLDERS.map((folder) => (
            <button
              key={folder.id}
              type="button"
              onClick={() => setActiveFolder(folder.id)}
              className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 font-inter text-sm transition-all ${activeFolder === folder.id ? 'bg-forest-canopy text-white' : 'bg-white border border-border text-rain-cloud/70 hover:bg-rain-mist/30'}`}
            >
              <span>{folder.label}</span>
              <span className="text-xs opacity-70">{folderCounts[folder.id] || 0}</span>
            </button>
          ))}
        </aside>

        <div>
          {activeFolderMeta && (
            <div className="mb-4 rounded-xl border border-border bg-white px-4 py-3">
              <p className="font-inter text-sm text-rain-cloud">{activeFolderMeta.label}</p>
              <p className="font-inter text-xs text-rain-cloud/45 mt-0.5">{activeFolderMeta.description}</p>
              <p className="font-inter text-[11px] text-rain-cloud/35 mt-1">R2 path: media-assets/{activeFolderMeta.id}/…</p>
            </div>
          )}

          <div className="flex gap-2 mb-6 overflow-x-auto hide-scrollbar">
            {['all', 'image', 'video'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFilterType(type)}
                className={`flex-shrink-0 py-1.5 px-4 rounded-full font-inter text-xs capitalize transition-all ${filterType === type ? 'bg-rain-cloud text-white' : 'bg-white border border-border text-rain-cloud/55'}`}
              >
                {type}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="aspect-square rounded-xl bg-temple-stone/30 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 rounded-2xl border border-dashed border-border bg-white">
              <div className="w-16 h-16 mx-auto bg-temple-stone/20 rounded-full flex items-center justify-center mb-4">
                <Image className="w-7 h-7 text-rain-cloud/30" />
              </div>
              <p className="font-inter text-sm text-rain-cloud/40">No media in this folder yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filtered.map((asset, i) => (
                <motion.div
                  key={asset.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="group relative aspect-square rounded-xl overflow-hidden bg-temple-stone/20 cursor-pointer"
                  onClick={() => setPreviewItem(asset)}
                >
                  {getAssetType(asset) === 'video' ? (
                    <div className="w-full h-full flex items-center justify-center bg-rain-cloud/10">
                      <Film className="w-8 h-8 text-rain-cloud/30" />
                    </div>
                  ) : (
                    <img src={getAssetUrl(asset)} alt={asset.alt_text || ''} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-rain-cloud/75 to-transparent p-2">
                    <p className="font-inter text-[10px] text-white truncate">{getAssetTitle(asset)}</p>
                    <p className="font-inter text-[9px] text-white/70">{getMediaFolderLabel(asset.entity_type)}</p>
                  </div>
                  <div className="absolute inset-0 bg-rain-cloud/0 group-hover:bg-rain-cloud/40 transition-all flex items-start justify-end p-2 opacity-0 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={(e) => handleDelete(asset, e)}
                      className="p-1.5 bg-red-500/90 text-white rounded-lg"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {previewItem && (
        <div className="fixed inset-0 z-50 bg-rain-cloud/80 flex items-center justify-center p-4" onClick={() => setPreviewItem(null)}>
          <div className="relative max-w-lg w-full bg-white rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setPreviewItem(null)} className="absolute top-3 right-3 z-10 bg-white/90 p-1.5 rounded-full">
              <X className="w-4 h-4" />
            </button>
            <img src={getAssetUrl(previewItem)} alt="" className="w-full aspect-[4/3] object-cover" />
            <div className="p-4 space-y-1">
              <p className="font-cormorant text-lg text-rain-cloud">{getAssetTitle(previewItem)}</p>
              <p className="font-inter text-xs text-rain-cloud/45">{getMediaFolderLabel(previewItem.entity_type)} folder</p>
              <p className="font-inter text-xs text-rain-cloud/45 break-all">{getAssetUrl(previewItem)}</p>
              {previewItem.file_path && (
                <p className="font-inter text-[11px] text-rain-cloud/35 break-all">R2: {previewItem.file_path}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
