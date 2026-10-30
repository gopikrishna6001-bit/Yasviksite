import { Plus, Trash2 } from 'lucide-react';
import ImageUploadField from '@/components/admin/ImageUploadField';
import { parseHomeHeroSlides } from '@/lib/heroMediaUtils';

/**
 * Visual editor for home_hero_slides_json — desktop + mobile per slide.
 */
export default function HeroSlidesEditor({ value = '', onChange }) {
  const slides = parseHomeHeroSlides(value);

  const commit = (next) => {
    const payload = next
      .filter((s) => s.media || s.mobileMedia)
      .map((s) => ({
        media: s.media || '',
        mobile_media: s.mobileMedia || '',
        poster: s.poster || '',
      }));
    onChange(payload.length ? JSON.stringify(payload, null, 2) : '');
  };

  const updateSlide = (index, patch) => {
    const next = slides.map((s, i) => (i === index ? { ...s, ...patch } : s));
    commit(next);
  };

  const addSlide = () => {
    commit([...slides, { media: '', mobileMedia: '', poster: '' }]);
  };

  const removeSlide = (index) => {
    commit(slides.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <p className="font-inter text-[11px] text-rain-cloud/50">
        Add 2+ slides for an auto-rotating hero on desktop and mobile. Each slide can have a separate mobile crop.
        Single desktop/mobile fields above are used when this list is empty or has one image.
      </p>
      {slides.map((slide, index) => (
        <div key={index} className="rounded-2xl border border-border/50 bg-white p-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-inter text-xs font-medium text-rain-cloud/70">Slide {index + 1}</p>
            <button
              type="button"
              onClick={() => removeSlide(index)}
              className="inline-flex items-center gap-1 font-inter text-[11px] text-red-500/80"
            >
              <Trash2 className="w-3.5 h-3.5" /> Remove
            </button>
          </div>
          <ImageUploadField
            label="Desktop image"
            value={slide.media || ''}
            onChange={(url) => updateSlide(index, { media: url })}
            aspectClass="aspect-video"
            folder="illustrations"
            assetRole={`hero-slide-${index}-desktop`}
          />
          <ImageUploadField
            label="Mobile image (optional)"
            value={slide.mobileMedia || ''}
            onChange={(url) => updateSlide(index, { mobileMedia: url })}
            aspectClass="aspect-[4/5]"
            folder="illustrations"
            assetRole={`hero-slide-${index}-mobile`}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={addSlide}
        className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 font-inter text-xs text-rain-cloud"
      >
        <Plus className="w-3.5 h-3.5" /> Add hero slide
      </button>
    </div>
  );
}
