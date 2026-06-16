import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { files as fileService, mediaAssets } from '@/services/api';
import { motion } from 'framer-motion';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { Upload, Trash2, Image, Film, X } from 'lucide-react';

const FILE_TYPES = ['image', 'video', 'reel', 'drone', 'gallery'];

const getAssetUrl = (asset) => asset?.file_url || asset?.upload_url || asset?.url || '';
const getAssetType = (asset) => asset?.file_type || asset?.media_type || 'image';
const getAssetTitle = (asset) => asset?.title || asset?.name || 'Untitled';

export default function AdminMedia() {
  const qc = useQueryClient();
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [previewItem, setPreviewItem] = useState(null);

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['admin-media'],
    queryFn: () => mediaAssets.list('-created_date', 100),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => mediaAssets.delete(id),
    onSuccess: () => qc.invalidateQueries(['admin-media']),
  });

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        await fileService.upload(file);
      }
      qc.invalidateQueries(['admin-media']);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const filtered = filterType === 'all' ? assets : assets.filter((a) => getAssetType(a) === filterType);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <AdminPageHeader
        title="Media Library"
        description="Upload and manage all visual assets."
        action={
          <>
            <input ref={fileRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleUpload} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 py-2.5 px-5 bg-wet-earth text-white font-inter text-sm rounded-full hover:bg-wet-earth/90 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {uploading ? 'Uploading...' : 'Upload Files'}
            </button>
          </>
        }
      />

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto hide-scrollbar">
        {['all', ...FILE_TYPES].map(t => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`flex-shrink-0 py-1.5 px-4 rounded-full font-inter text-xs capitalize transition-all ${
              filterType === t ? 'bg-rain-cloud text-white' : 'bg-white border border-border text-rain-cloud/55'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="aspect-square rounded-xl bg-temple-stone/30 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 mx-auto bg-temple-stone/20 rounded-full flex items-center justify-center mb-4">
            <Image className="w-7 h-7 text-rain-cloud/30" />
          </div>
          <p className="font-inter text-sm text-rain-cloud/40">No media yet. Upload some files to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map((asset, i) => (
            <motion.div
              key={asset.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03 }}
              className="group relative aspect-square rounded-xl overflow-hidden bg-temple-stone/20 cursor-pointer"
              onClick={() => setPreviewItem(asset)}
            >
              {['video', 'reel', 'drone'].includes(getAssetType(asset)) ? (
                <div className="w-full h-full flex items-center justify-center bg-rain-cloud/10">
                  <Film className="w-8 h-8 text-rain-cloud/30" />
                </div>
              ) : (
                <img src={getAssetUrl(asset)} alt={asset.alt_text || ''} className="w-full h-full object-cover" loading="lazy" />
              )}
              <div className="absolute inset-0 bg-rain-cloud/0 group-hover:bg-rain-cloud/40 transition-all flex items-end p-2 opacity-0 group-hover:opacity-100">
                <button
                  onClick={(e) => { e.stopPropagation(); deleteMut.mutate(asset.id); }}
                  className="p-1.5 bg-red-500/90 text-white rounded-lg"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Preview modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-rain-cloud/80 flex items-center justify-center p-4" onClick={() => setPreviewItem(null)}>
          <div className="relative max-w-lg w-full bg-white rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <button onClick={() => setPreviewItem(null)} className="absolute top-3 right-3 z-10 bg-white/90 p-1.5 rounded-full">
              <X className="w-4 h-4" />
            </button>
            <img src={getAssetUrl(previewItem)} alt="" className="w-full aspect-[4/3] object-cover" />
            <div className="p-4">
              <p className="font-cormorant text-lg text-rain-cloud">{getAssetTitle(previewItem)}</p>
              <p className="font-inter text-xs text-rain-cloud/45 mt-0.5 break-all">{getAssetUrl(previewItem)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
