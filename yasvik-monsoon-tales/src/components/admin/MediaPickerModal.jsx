import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { files as fileService, mediaAssets } from '@/services/api';
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
import { buildSeoMediaFileName } from '@/lib/mediaSeoNaming';
import { X, Search, Check, Image, Film, Upload, Loader2 } from 'lucide-react';

const FILE_TYPES = ['all', 'image', 'video'];

const getAssetUrl = (asset) => asset?.file_url || asset?.upload_url || asset?.url || '';
const getAssetType = (asset) => {
  const raw = String(asset?.file_type || asset?.media_type || 'image').toLowerCase();
  if (raw.startsWith('video')) return 'video';
  if (raw.startsWith('image')) return 'image';
  return raw;
};
const getAssetTitle = (asset) => asset?.title || asset?.name || '';
const isVideoUrl = (url = '') => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(String(url || ''));

export default function MediaPickerModal({
  open,
  onClose,
  onSelect,
  multi = false,
  folder = 'all',
  seoName = '',
  assetRole = '',
  entityTitle = '',
}) {
  const qc = useQueryClient();
  const uploadRef = useRef(null);
  const [filter, setFilter] = useState('all');
  const [folderFilter, setFolderFilter] = useState(folder === 'all' ? 'all' : normalizeMediaFolder(folder));
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);
  const [uploading, setUploading] = useState(false);

  const activeFolder = folder === 'all' ? folderFilter : normalizeMediaFolder(folder);

  const { data: assets = [], isLoading } = useQuery({
    ...mediaLibraryQueryOptions(),
    queryFn: () => mediaAssets.list('-created_date', MEDIA_LIBRARY_LIMIT),
    enabled: open,
  });

  const filtered = assets.filter((asset) => {
    const matchFolder = assetMatchesFolder(asset, activeFolder);
    const matchType = filter === 'all' || getAssetType(asset) === filter;
    const title = getAssetTitle(asset);
    const matchSearch = !search
      || title.toLowerCase().includes(search.toLowerCase())
      || (asset.alt_text || '').toLowerCase().includes(search.toLowerCase())
      || String(asset.file_path || '').toLowerCase().includes(search.toLowerCase());
    return matchFolder && matchType && matchSearch;
  });

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploading(true);
    try {
      const uploadFolder = activeFolder === 'all' ? normalizeMediaFolder(folder) : activeFolder;
      const resolvedFolder = uploadFolder === 'all' ? 'general' : uploadFolder;
      const { file_url } = await fileService.upload(file, {
        folder: resolvedFolder,
        seoName: seoName || entityTitle,
        assetRole: assetRole || 'gallery',
        entityTitle,
        label: buildSeoMediaFileName({
          seoName: seoName || entityTitle,
          assetRole: assetRole || 'gallery',
          folder: resolvedFolder,
          fallbackName: file.name,
        }),
      });
      qc.invalidateQueries({ queryKey: MEDIA_LIBRARY_QUERY_KEY });

      if (multi) {
        setSelected((prev) => (prev.includes(file_url) ? prev : [...prev, file_url]));
      } else {
        onSelect(file_url);
        handleClose();
      }
    } finally {
      setUploading(false);
    }
  };

  const toggle = (asset) => {
    if (!multi) {
      onSelect(getAssetUrl(asset));
      handleClose();
      return;
    }
    const assetUrl = getAssetUrl(asset);
    setSelected((prev) => (
      prev.includes(assetUrl) ? prev.filter((url) => url !== assetUrl) : [...prev, assetUrl]
    ));
  };

  const confirmMulti = () => {
    onSelect(selected);
    handleClose();
  };

  const handleClose = () => {
    setSelected([]);
    setSearch('');
    setFilter('all');
    setFolderFilter(folder === 'all' ? 'all' : normalizeMediaFolder(folder));
    onClose();
  };

  const canChangeFolder = folder === 'all';

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-rain-cloud/60 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="relative bg-white w-full max-w-4xl max-h-[85vh] rounded-t-3xl sm:rounded-2xl overflow-hidden flex flex-col z-10"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
              <div>
                <h2 className="font-cormorant text-xl text-rain-cloud font-medium">Media Library</h2>
                <p className="font-inter text-xs text-rain-cloud/45 mt-0.5">
                  {canChangeFolder
                    ? 'Browse folders or upload into the selected folder'
                    : `${getMediaFolderLabel(activeFolder)} folder`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input ref={uploadRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleUpload} />
                <button
                  type="button"
                  onClick={() => uploadRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border font-inter text-xs text-rain-cloud/70 hover:bg-rain-mist/40 disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  Upload
                </button>
                <button onClick={handleClose} className="text-rain-cloud/35 hover:text-rain-cloud/70 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="px-6 py-3 border-b border-border/50 flex-shrink-0 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rain-cloud/35" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or path…"
                  className="w-full pl-9 pr-4 py-2 border border-border rounded-xl font-inter text-sm text-rain-cloud focus:outline-none focus:border-forest-canopy"
                />
              </div>

              {canChangeFolder && (
                <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-0.5">
                  <button
                    type="button"
                    onClick={() => setFolderFilter('all')}
                    className={`flex-shrink-0 py-1 px-3 rounded-full font-inter text-xs transition-all ${folderFilter === 'all' ? 'bg-rain-cloud text-white' : 'bg-muted text-rain-cloud/50'}`}
                  >
                    All folders
                  </button>
                  {MEDIA_FOLDERS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFolderFilter(item.id)}
                      className={`flex-shrink-0 py-1 px-3 rounded-full font-inter text-xs transition-all ${folderFilter === item.id ? 'bg-forest-canopy text-white' : 'bg-muted text-rain-cloud/50'}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-2 overflow-x-auto hide-scrollbar">
                {FILE_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFilter(type)}
                    className={`flex-shrink-0 py-1 px-3 rounded-full font-inter text-xs capitalize transition-all ${filter === type ? 'bg-rain-cloud text-white' : 'bg-muted text-rain-cloud/50'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-4">
              {isLoading ? (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                  {[...Array(10)].map((_, i) => <div key={i} className="aspect-square rounded-xl bg-temple-stone/20 animate-pulse" />)}
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16">
                  <Image className="w-8 h-8 text-rain-cloud/20 mx-auto mb-3" />
                  <p className="font-inter text-sm text-rain-cloud/40">No media in this folder yet.</p>
                  <button
                    type="button"
                    onClick={() => uploadRef.current?.click()}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-wet-earth text-white font-inter text-xs"
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload here
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                  {filtered.map((asset) => {
                    const assetUrl = getAssetUrl(asset);
                    const isSelected = selected.includes(assetUrl);
                    const isMedia = ['video', 'reel', 'drone'].includes(getAssetType(asset));
                    return (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => toggle(asset)}
                        className={`group relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${isSelected ? 'border-forest-canopy' : 'border-transparent hover:border-temple-stone'}`}
                      >
                        {isMedia ? (
                          isVideoUrl(assetUrl) ? (
                            <video src={assetUrl} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                          ) : (
                            <div className="w-full h-full bg-rain-cloud/10 flex items-center justify-center">
                              <Film className="w-6 h-6 text-rain-cloud/30" />
                            </div>
                          )
                        ) : (
                          <img src={assetUrl} alt={asset.alt_text || ''} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                        )}
                        {isSelected && (
                          <div className="absolute inset-0 bg-forest-canopy/30 flex items-center justify-center">
                            <div className="w-6 h-6 rounded-full bg-forest-canopy flex items-center justify-center">
                              <Check className="w-3.5 h-3.5 text-white" />
                            </div>
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-rain-cloud/70 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="font-inter text-[9px] text-white truncate">{getAssetTitle(asset) || 'Untitled'}</p>
                          <p className="font-inter text-[8px] text-white/70 truncate">{getMediaFolderLabel(asset.entity_type)}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {multi && selected.length > 0 && (
              <div className="flex-shrink-0 px-6 py-4 border-t border-border bg-white">
                <button
                  type="button"
                  onClick={confirmMulti}
                  className="w-full py-2.5 bg-wet-earth text-white font-inter text-sm rounded-full hover:bg-wet-earth/90 transition-all"
                >
                  Add {selected.length} {selected.length === 1 ? 'Image' : 'Images'}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
