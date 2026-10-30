import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { files as fileService } from '@/services/api';
import { normalizeMediaFolder } from '@/lib/mediaFolders';
import { buildSeoMediaFileName } from '@/lib/mediaSeoNaming';
import {
  MEDIA_LIBRARY_QUERY_KEY,
} from '@/lib/mediaLibraryQuery';
import { Camera, Upload, X, Loader2, Images, ImagePlus } from 'lucide-react';
import MediaPickerModal from './MediaPickerModal';

function isVideoUrl(value = '') {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(String(value || ''));
}

const MOBILE_IMAGE_ACCEPT = 'image/*,.heic,.heif';

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
  mobileFriendly = true,
  hideUrlField = false,
}) {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const libraryInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const replaceInputRef = useRef(null);
  const mediaFolder = normalizeMediaFolder(folder);
  const imageOnly = !accept.includes('video');
  const mobileAccept = imageOnly ? MOBILE_IMAGE_ACCEPT : accept;

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

  const uploadFile = async (file) => {
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      const { file_url } = await fileService.upload(file, uploadMeta);
      onChange(file_url);
      qc.invalidateQueries({ queryKey: MEDIA_LIBRARY_QUERY_KEY });
    } catch (err) {
      // R2 may succeed even when media_assets indexing fails — still attach the URL.
      if (err?.file_url) {
        onChange(err.file_url);
        qc.invalidateQueries({ queryKey: MEDIA_LIBRARY_QUERY_KEY });
      }
      const message = err?.message || 'Upload failed. Check connection and try again.';
      setUploadError(message);
      alert(message);
    } finally {
      setUploading(false);
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    await uploadFile(file);
    e.target.value = '';
  };

  const actionBtnClass =
    'flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-white px-3 py-3 font-inter text-xs font-semibold text-rain-cloud/75 transition-colors hover:border-forest-canopy hover:text-forest-canopy disabled:opacity-50';

  const overlayBtnClass =
    'inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-border bg-white/95 px-3 py-2 font-inter text-[11px] font-semibold text-rain-cloud/75 shadow backdrop-blur-sm';

  const overlayGroupClass = 'absolute bottom-2 right-2 flex flex-wrap justify-end gap-1.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity';

  return (
    <div>
      {label ? <label className="mb-1 block font-inter text-xs text-rain-cloud/55">{label}</label> : null}

      {value ? (
        <div className="group relative">
          <div className={`w-full ${aspectClass} overflow-hidden rounded-xl border border-border bg-muted/20`}>
            {isVideoUrl(value) ? (
              <video src={value} className="h-full w-full object-cover" muted loop playsInline controls />
            ) : (
              <img src={value} alt="" className="h-full w-full object-cover" />
            )}
          </div>
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-red-500 text-white opacity-100 shadow lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
            aria-label="Remove image"
          >
            <X className="h-4 w-4" />
          </button>
          <div className={overlayGroupClass}>
            {showPicker ? (
              <button type="button" onClick={() => setPickerOpen(true)} className={overlayBtnClass}>
                <Images className="h-3.5 w-3.5" /> Library
              </button>
            ) : null}
            {mobileFriendly && imageOnly ? (
              <>
                <button type="button" onClick={() => cameraInputRef.current?.click()} className={`${overlayBtnClass} lg:hidden`}>
                  <Camera className="h-3.5 w-3.5" /> Retake
                </button>
                <button type="button" onClick={() => libraryInputRef.current?.click()} className={`${overlayBtnClass} lg:hidden`}>
                  <ImagePlus className="h-3.5 w-3.5" /> Replace
                </button>
              </>
            ) : null}
            <button type="button" onClick={() => replaceInputRef.current?.click()} className={`${overlayBtnClass} hidden lg:inline-flex`}>
              <Upload className="h-3.5 w-3.5" /> Replace
            </button>
          </div>
        </div>
      ) : (
        <div className={`grid gap-2 ${mobileFriendly && imageOnly ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2'}`}>
          {mobileFriendly && imageOnly ? (
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploading}
              className={`${actionBtnClass} border-forest-canopy/25 bg-forest-canopy/5 text-forest-canopy sm:col-span-2`}
            >
              {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
              <span>{uploading ? 'Uploading…' : 'Take photo'}</span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => libraryInputRef.current?.click()}
            disabled={uploading}
            className={actionBtnClass}
          >
            {uploading && !mobileFriendly ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
            <span>{uploading ? 'Uploading…' : mobileFriendly && imageOnly ? 'Choose from photos' : 'Upload new'}</span>
          </button>
          {showPicker ? (
            <button type="button" onClick={() => setPickerOpen(true)} className={actionBtnClass}>
              <Images className="h-5 w-5" />
              <span>Media library</span>
            </button>
          ) : null}
        </div>
      )}

      {uploadError ? (
        <p className="mt-2 font-inter text-[11px] text-red-500">{uploadError}</p>
      ) : null}

      {!hideUrlField ? (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="…or paste image URL"
          className="mt-2 hidden w-full rounded-xl border border-border px-4 py-2 font-inter text-xs text-rain-cloud/70 focus:border-forest-canopy focus:outline-none sm:block"
        />
      ) : null}

      <input ref={libraryInputRef} type="file" accept={mobileAccept} className="hidden" onChange={handleFile} />
      <input
        ref={cameraInputRef}
        type="file"
        accept={mobileAccept}
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />
      <input ref={replaceInputRef} type="file" accept={accept} className="hidden" onChange={handleFile} />

      {showPicker ? (
        <MediaPickerModal
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={(url) => {
            const next = String(url || '').trim();
            if (!next) {
              setUploadError('Selected media has no URL. Try Upload instead.');
              return;
            }
            setUploadError('');
            onChange(next);
            setPickerOpen(false);
          }}
          folder="all"
          uploadFolder={mediaFolder}
          seoName={seoName || entityTitle}
          assetRole={assetRole}
          entityTitle={entityTitle}
          entityId={entityId}
        />
      ) : null}
    </div>
  );
}
