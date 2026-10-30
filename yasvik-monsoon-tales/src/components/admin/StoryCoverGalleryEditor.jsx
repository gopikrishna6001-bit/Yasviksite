import { Plus, Trash2 } from 'lucide-react';
import ImageUploadField from '@/components/admin/ImageUploadField';

/**
 * Multi-image cover gallery for stories.
 * Keeps cover_image as the first/primary URL for backwards compatibility.
 */
export default function StoryCoverGalleryEditor({
  coverImage = '',
  coverImages = [],
  onChange,
  entityId,
  seoName,
  title,
}) {
  const list = Array.isArray(coverImages) && coverImages.length
    ? coverImages.filter(Boolean)
    : (coverImage ? [coverImage] : []);

  const commit = (urls) => {
    const clean = urls.filter(Boolean);
    onChange({
      cover_image: clean[0] || '',
      cover_images: clean,
    });
  };

  return (
    <div className="space-y-3">
      <p className="font-inter text-[11px] text-rain-cloud/50">
        Add multiple cover images for a slideshow on the story card and detail page (desktop + mobile).
      </p>
      {list.map((url, index) => (
        <div key={`${url}-${index}`} className="rounded-2xl border border-border/40 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-inter text-xs text-rain-cloud/60">
              Image {index + 1}{index === 0 ? ' (primary)' : ''}
            </p>
            <button
              type="button"
              onClick={() => commit(list.filter((_, i) => i !== index))}
              className="inline-flex items-center gap-1 font-inter text-[11px] text-red-500/80"
            >
              <Trash2 className="w-3.5 h-3.5" /> Remove
            </button>
          </div>
          <ImageUploadField
            label=""
            value={url}
            onChange={(next) => {
              const copy = [...list];
              copy[index] = next;
              commit(copy);
            }}
            aspectClass="aspect-video"
            folder="stories"
            entityId={entityId}
            seoName={seoName}
            assetRole={`cover-${index}`}
            entityTitle={title}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => commit([...list, ''])}
        className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 font-inter text-xs"
      >
        <Plus className="w-3.5 h-3.5" /> Add cover image
      </button>
    </div>
  );
}
