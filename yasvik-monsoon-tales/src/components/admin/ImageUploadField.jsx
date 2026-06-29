import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { files as fileService } from '@/services/api';
import { normalizeMediaFolder } from '@/lib/mediaFolders';
import { buildSeoMediaFileName } from '@/lib/mediaSeoNaming';
import {
  MEDIA_LIBRARY_QUERY_KEY,
  mediaLibraryQueryOptions,
} from '@/lib/mediaLibraryQuery';
import { Upload, X, Loader2, Images } from 'lucide-react';
import MediaPickerModal from './MediaPickerModal';

function isVideoUrl(value = '') {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(String(value || ''));
}

export default function ImageUploadField({
  label,
  value,
  onChange,
  aspectClass = 'aspect-video',
  accept = 'image/*,video/*',
  folder = 'general',
  showPicker = true,
  entityId = null,
  seoName = '',
  assetRole = '',
  entityTitle = '',
}) {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const inputRef = useRef();
  const mediaFolder = normalizeMediaFolder(folder);
  const uploadMeta = {
    folder: mediaFolder,
    entityId,
    seoName: seoName || entityTitle,
    assetRole,
    entityTitle,
    label: buildSeoMediaFileName({
      seoName: seoName || entityTitle,
      assetRole,
      folder: mediaFolder,
      fallbackName: label || 'upload',
    }),
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await fileService.upload(file, uploadMeta);
      onChange(file_url);
      qc.invalidateQueries({ queryKey: MEDIA_LIBRARY_QUERY_KEY });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div>
      {label && <label className="font-inter text-xs text-rain-cloud/55 block mb-1">{label}</label>}

      {value ? (
        <div className="relative group">
          <div className={`w-full ${aspectClass} rounded-xl overflow-hidden border border-border bg-muted/20`}>
            {isVideoUrl(value) ? (
              <video src={value} className="w-full h-full object-cover" muted loop playsInline controls />
            ) : (
              <img src={value} alt="" className="w-full h-full object-cover" />
            )}
          </div>
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {showPicker && (
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="px-3 py-1.5 bg-white/90 backdrop-blur-sm text-rain-cloud/70 font-inter text-[11px] rounded-lg border border-border shadow flex items-center gap-1"
              >
                <Images className="w-3 h-3" /> Pick
              </button>
            )}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="px-3 py-1.5 bg-white/90 backdrop-blur-sm text-rain-cloud/70 font-inter text-[11px] rounded-lg border border-border shadow flex items-center gap-1"
            >
              <Upload className="w-3 h-3" /> Replace
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="border-2 border-dashed border-border rounded-xl py-8 flex flex-col items-center gap-2 text-rain-cloud/40 hover:border-forest-canopy hover:text-forest-canopy transition-colors disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
            <span className="font-inter text-xs">{uploading ? 'Uploading…' : 'Upload new'}</span>
          </button>
          {showPicker && (
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="border-2 border-dashed border-border rounded-xl py-8 flex flex-col items-center gap-2 text-rain-cloud/40 hover:border-forest-canopy hover:text-forest-canopy transition-colors"
            >
              <Images className="w-6 h-6" />
              <span className="font-inter text-xs">Pick from library</span>
            </button>
          )}
        </div>
      )}

      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="…or paste image/video URL"
        className="mt-2 w-full border border-border rounded-xl px-4 py-2 font-inter text-xs text-rain-cloud/70 focus:outline-none focus:border-forest-canopy"
      />

      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleFile} />

      {showPicker && (
        <MediaPickerModal
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={onChange}
          folder={mediaFolder}
          seoName={seoName || entityTitle}
          assetRole={assetRole}
          entityTitle={entityTitle}
        />
      )}
    </div>
  );
}
