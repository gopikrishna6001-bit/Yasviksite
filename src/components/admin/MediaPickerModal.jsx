import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { mediaAssets } from '@/services/api';
import { X, Search, Check, Image, Film } from 'lucide-react';

const FILE_TYPES = ['all', 'image', 'video', 'reel', 'drone', 'gallery'];
const getAssetUrl = (asset) => asset?.file_url || asset?.upload_url || asset?.url || '';
const getAssetType = (asset) => asset?.file_type || asset?.media_type || 'image';
const getAssetTitle = (asset) => asset?.title || asset?.name || '';

export default function MediaPickerModal({ open, onClose, onSelect, multi = false }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['media-picker-assets'],
    queryFn: () => mediaAssets.list('-created_date', 100),
    enabled: open,
  });

  const filtered = assets.filter(a => {
    const matchType = filter === 'all' || getAssetType(a) === filter;
    const title = getAssetTitle(a);
    const matchSearch = !search || title.toLowerCase().includes(search.toLowerCase()) || (a.alt_text || '').toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const toggle = (asset) => {
    if (!multi) {
      onSelect(getAssetUrl(asset));
      onClose();
      return;
    }
    const assetUrl = getAssetUrl(asset);
    setSelected(prev =>
      prev.includes(assetUrl)
        ? prev.filter(u => u !== assetUrl)
        : [...prev, assetUrl]
    );
  };

  const confirmMulti = () => {
    onSelect(selected);
    setSelected([]);
    onClose();
  };

  const handleClose = () => {
    setSelected([]);
    setSearch('');
    setFilter('all');
    onClose();
  };

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
            className="relative bg-white w-full max-w-3xl max-h-[85vh] rounded-t-3xl sm:rounded-2xl overflow-hidden flex flex-col z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
              <h2 className="font-cormorant text-xl text-rain-cloud font-medium">Media Library</h2>
              <button onClick={handleClose} className="text-rain-cloud/35 hover:text-rain-cloud/70 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search & Filter */}
            <div className="px-6 py-3 border-b border-border/50 flex-shrink-0 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rain-cloud/35" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name…"
                  className="w-full pl-9 pr-4 py-2 border border-border rounded-xl font-inter text-sm text-rain-cloud focus:outline-none focus:border-forest-canopy"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto hide-scrollbar">
                {FILE_TYPES.map(t => (
                  <button
                    key={t}
                    onClick={() => setFilter(t)}
                    className={`flex-shrink-0 py-1 px-3 rounded-full font-inter text-xs capitalize transition-all ${filter === t ? 'bg-rain-cloud text-white' : 'bg-muted text-rain-cloud/50'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid */}
            <div className="overflow-y-auto flex-1 p-4">
              {isLoading ? (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                  {[...Array(10)].map((_, i) => <div key={i} className="aspect-square rounded-xl bg-temple-stone/20 animate-pulse" />)}
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16">
                  <Image className="w-8 h-8 text-rain-cloud/20 mx-auto mb-3" />
                  <p className="font-inter text-sm text-rain-cloud/40">No media found.</p>
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
                        onClick={() => toggle(asset)}
                        className={`group relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${isSelected ? 'border-forest-canopy' : 'border-transparent hover:border-temple-stone'}`}
                      >
                        {isMedia ? (
                          <div className="w-full h-full bg-rain-cloud/10 flex items-center justify-center">
                            <Film className="w-6 h-6 text-rain-cloud/30" />
                          </div>
                        ) : (
                          <img src={assetUrl} alt={asset.alt_text || ''} className="w-full h-full object-cover" loading="lazy" />
                        )}
                        {isSelected && (
                          <div className="absolute inset-0 bg-forest-canopy/30 flex items-center justify-center">
                            <div className="w-6 h-6 rounded-full bg-forest-canopy flex items-center justify-center">
                              <Check className="w-3.5 h-3.5 text-white" />
                            </div>
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-rain-cloud/60 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="font-inter text-[9px] text-white truncate">{getAssetTitle(asset) || 'Untitled'}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Multi-select confirm */}
            {multi && selected.length > 0 && (
              <div className="flex-shrink-0 px-6 py-4 border-t border-border bg-white">
                <button
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
