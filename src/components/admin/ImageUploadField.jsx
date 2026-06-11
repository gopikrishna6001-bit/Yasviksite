import { useState, useRef } from 'react';
import { appClient } from '@/api/appClient';
import { Upload, X, Loader2 } from 'lucide-react';

/**
 * Reusable image upload + URL paste + preview field.
 * Props:
 *   label      — field label
 *   value      — current image URL string
 *   onChange   — called with new URL string
 *   aspectClass — tailwind aspect class, defaults to "aspect-video"
 */
export default function ImageUploadField({ label, value, onChange, aspectClass = 'aspect-video' }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await appClient.integrations.Core.UploadFile({ file });
    onChange(file_url);
    setUploading(false);
    e.target.value = '';
  };

  return (
    <div>
      {label && <label className="font-inter text-xs text-rain-cloud/55 block mb-1">{label}</label>}

      {value ? (
        <div className="relative group">
          <div className={`w-full ${aspectClass} rounded-xl overflow-hidden border border-border bg-muted/20`}>
            <img src={value} alt="" className="w-full h-full object-cover" />
          </div>
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute bottom-2 right-2 px-3 py-1.5 bg-white/90 backdrop-blur-sm text-rain-cloud/70 font-inter text-[11px] rounded-lg border border-border opacity-0 group-hover:opacity-100 transition-opacity shadow flex items-center gap-1"
          >
            <Upload className="w-3 h-3" /> Replace
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full border-2 border-dashed border-border rounded-xl py-8 flex flex-col items-center gap-2 text-rain-cloud/40 hover:border-forest-canopy hover:text-forest-canopy transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <Upload className="w-6 h-6" />
          )}
          <span className="font-inter text-xs">{uploading ? 'Uploading…' : 'Click to upload image'}</span>
        </button>
      )}

      {/* URL paste fallback */}
      <input
        type="text"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder="…or paste image URL"
        className="mt-2 w-full border border-border rounded-xl px-4 py-2 font-inter text-xs text-rain-cloud/70 focus:outline-none focus:border-forest-canopy"
      />

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}