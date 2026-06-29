import { useCallback, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, GripVertical, ImagePlus, Loader2, Save, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import ImageUploadField from '@/components/admin/ImageUploadField';
import MediaPickerModal from '@/components/admin/MediaPickerModal';
import {
  ILLUSTRATION_GROUPS,
  parseIllustrationBool,
  parseBottomBlurPercent,
  parseSlides,
  serializeSlides,
} from '@/lib/illustrationSettings';
import {
  fetchAllAppSettings,
  SETTINGS_QUERY_KEYS,
  upsertAppSetting,
} from '@/services/settingsService';
import { toast } from '@/components/ui/use-toast';

// ─── Crop Editor — free size, drag any handle ─────────────────────────────────

function CropEditor({ slide, onUpdate }) {
  const [crop, setCrop] = useState(
    () => slide.crop ?? { unit: '%', x: 0, y: 0, width: 100, height: 100 },
  );

  const handleComplete = useCallback(
    (_, percentCrop) => {
      if (!percentCrop || !percentCrop.width) return;
      const x = Math.round(percentCrop.x + percentCrop.width / 2);
      const y = Math.round(percentCrop.y + percentCrop.height / 2);
      onUpdate({ ...slide, x, y, crop: percentCrop });
    },
    [slide, onUpdate],
  );

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl bg-gray-900">
        <ReactCrop
          crop={crop}
          onChange={(_, pct) => setCrop(pct)}
          onComplete={handleComplete}
          ruleOfThirds
        >
          <img
            src={slide.url}
            alt=""
            draggable={false}
            style={{ display: 'block', maxHeight: 400, width: '100%', objectFit: 'contain' }}
          />
        </ReactCrop>
      </div>
      <p className="font-inter text-[11px] leading-relaxed text-rain-cloud/40">
        Drag any corner or edge to resize · drag the centre of the selection to move it. The highlighted area fills the banner exactly.
      </p>
    </div>
  );
}

// ─── Single Slide Card ───────────────────────────────────────────────────────

function SlideCard({ slide, index, total, onUpdate, onRemove, onMove }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-white shadow-sm">
      {/* Top bar: order controls + remove */}
      <div className="flex items-center gap-2 border-b border-border/40 bg-warm-cream/50 px-4 py-2">
        <GripVertical className="h-4 w-4 flex-shrink-0 text-rain-cloud/30" />
        <span className="flex-1 font-inter text-xs font-semibold text-rain-cloud">Slide {index + 1}</span>
        <button
          type="button"
          onClick={() => onMove(index, -1)}
          disabled={index === 0}
          className="rounded-lg p-1 text-rain-cloud/50 hover:bg-white disabled:opacity-25"
          aria-label="Move up"
        >↑</button>
        <button
          type="button"
          onClick={() => onMove(index, 1)}
          disabled={index === total - 1}
          className="rounded-lg p-1 text-rain-cloud/50 hover:bg-white disabled:opacity-25"
          aria-label="Move down"
        >↓</button>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="rounded-lg p-1 text-red-400 hover:bg-red-50"
          aria-label="Remove slide"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Crop editor */}
      <div className="p-4">
        <p className="mb-3 font-inter text-[11px] font-semibold uppercase tracking-wider text-rain-cloud/50">
          Crop &amp; Focus
        </p>
        <CropEditor
          slide={slide}
          onUpdate={(updated) => onUpdate(index, updated)}
        />
      </div>
    </div>
  );
}

// ─── Slot Editor ─────────────────────────────────────────────────────────────

function SlotEditor({ slot, savedSlides, savedEnabled, savedBottomBlur, isSaving, onSave }) {
  const [slides, setSlides] = useState(() => savedSlides);
  const [enabled, setEnabled] = useState(savedEnabled);
  const [bottomBlur, setBottomBlur] = useState(savedBottomBlur);
  const [addingUrl, setAddingUrl] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  // Sync when parent data refreshes
  const prevSaved = useRef(savedSlides);
  if (prevSaved.current !== savedSlides) {
    prevSaved.current = savedSlides;
    setSlides(savedSlides);
    setEnabled(savedEnabled);
    setBottomBlur(savedBottomBlur);
  }

  const addSlide = (url) => {
    if (!url) return;
    setSlides((prev) => [...prev, { url, x: 50, y: 50 }]);
    setAddingUrl('');
  };

  const removeSlide = (i) =>
    setSlides((prev) => prev.filter((_, idx) => idx !== i));

  const updateSlide = (i, updated) =>
    setSlides((prev) => prev.map((s, idx) => (idx === i ? updated : s)));

  const moveSlide = (i, dir) => {
    setSlides((prev) => {
      const arr = [...prev];
      const target = i + dir;
      if (target < 0 || target >= arr.length) return arr;
      [arr[i], arr[target]] = [arr[target], arr[i]];
      return arr;
    });
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-border/60 bg-white shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/50 px-6 py-5">
        <div>
          <h3 className="font-cormorant text-2xl text-rain-cloud">{slot.label}</h3>
          <p className="mt-1 font-inter text-sm text-rain-cloud/55">{slot.description}</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="font-inter text-xs text-rain-cloud/55">Show banner</span>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4"
            />
          </label>
          {slot.route && slot.route !== '*' && (
            <Link
              to={slot.route}
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 font-inter text-xs text-rain-cloud/60 hover:bg-rain-mist"
            >
              View page <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>

      <div className="px-6 py-5 space-y-4">
        {/* Slides list */}
        {slides.length > 0 ? (
          <div className="space-y-3">
            {slides.map((slide, i) => (
              <SlideCard
                key={`${i}-${slide.url.slice(-20)}`}
                slide={slide}
                index={i}
                total={slides.length}
                onUpdate={updateSlide}
                onRemove={removeSlide}
                onMove={moveSlide}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/60 py-10 text-center">
            <ImagePlus className="h-7 w-7 text-rain-cloud/25" />
            <p className="font-inter text-sm text-rain-cloud/40">No slides yet — add one below</p>
          </div>
        )}

        {/* Add new slide */}
        <div className="rounded-xl border border-border/60 p-4 space-y-3">
          <p className="font-inter text-sm font-medium text-rain-cloud">Add slide</p>
          <ImageUploadField
            value={addingUrl}
            onChange={(url) => { setAddingUrl(url); if (url) addSlide(url); }}
            aspectClass="aspect-[16/5]"
            accept="image/*"
            folder="illustrations"
          />
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-border/40" />
            <span className="font-inter text-[11px] text-rain-cloud/35">or</span>
            <div className="h-px flex-1 bg-border/40" />
          </div>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="w-full rounded-xl border border-border py-2.5 font-inter text-sm text-rain-cloud/70 hover:bg-rain-mist transition-colors"
          >
            Pick from Media Library
          </button>
        </div>

        {/* Bottom fade control */}
        <div className="rounded-xl border border-border/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-inter text-sm font-medium text-rain-cloud">Bottom fade into page</p>
              <p className="mt-0.5 font-inter text-[11px] text-rain-cloud/45">
                {bottomBlur === 0 ? 'No fade — illustration ends sharply' : `${bottomBlur}% blend into page background`}
              </p>
            </div>
            <span className="font-inter text-xs font-bold text-rain-cloud/60">{bottomBlur}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={bottomBlur}
            onChange={(e) => setBottomBlur(Number(e.target.value))}
            className="mt-3 w-full accent-forest-canopy"
          />
        </div>

        {/* Save */}
        <button
          type="button"
          disabled={isSaving}
          onClick={() => onSave({ slotId: slot.id, slides, enabled, bottomBlur })}
          className="inline-flex items-center gap-2 rounded-full bg-forest-canopy px-5 py-2.5 font-inter text-sm text-white transition-colors hover:bg-forest-canopy/90 disabled:opacity-60"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save {slot.label}
        </button>
      </div>

      {/* Media picker */}
      <MediaPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(url) => { setPickerOpen(false); addSlide(url); }}
      />
    </section>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminIllustrations() {
  const queryClient = useQueryClient();
  const [savingSlot, setSavingSlot] = useState('');

  const { data: settings = [], isLoading } = useQuery({
    queryKey: SETTINGS_QUERY_KEYS.all,
    queryFn: fetchAllAppSettings,
    staleTime: 2 * 60 * 1000,
  });

  const settingsMap = useMemo(() => {
    const map = {};
    for (const s of settings) {
      if (!map[s.setting_key] || new Date(s.updated_date) > new Date(map[s.setting_key].updated_date)) {
        map[s.setting_key] = s;
      }
    }
    return map;
  }, [settings]);

  const getSlotData = useCallback(
    (slotId) => {
      const prefix = `illustration_${slotId}`;
      const enabledRaw = settingsMap[`${prefix}_enabled`]?.value;
      const enabled = parseIllustrationBool(enabledRaw, true);

      const slidesRaw = settingsMap[`${prefix}_slides`]?.value || '';
      const fallbackUrl = String(settingsMap[`${prefix}_url`]?.value || '').trim();
      const slides = parseSlides(slidesRaw, fallbackUrl);

      const bottomBlurRaw = settingsMap[`${prefix}_bottom_blur`]?.value;
      const bottomBlur = parseBottomBlurPercent(bottomBlurRaw, 60);

      return { enabled, slides, bottomBlur };
    },
    [settingsMap],
  );

  const saveMutation = useMutation({
    mutationFn: async ({ slotId, slides, enabled, bottomBlur }) => {
      const prefix = `illustration_${slotId}`;
      await upsertAppSetting(settings, `${prefix}_enabled`, enabled, { data_type: 'boolean' });
      await upsertAppSetting(settings, `${prefix}_slides`, serializeSlides(slides), { data_type: 'string' });
      await upsertAppSetting(settings, `${prefix}_bottom_blur`, bottomBlur, { data_type: 'number' });
    },
    onSuccess: async (_, { slotId }) => {
      await queryClient.invalidateQueries({
        predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'settings',
      });
      await queryClient.refetchQueries({ queryKey: SETTINGS_QUERY_KEYS.all, type: 'active' });
      toast({ title: 'Saved', description: 'Banner slides updated on the storefront.' });
      setSavingSlot('');
    },
    onError: (err) => {
      setSavingSlot('');
      toast({ variant: 'destructive', title: 'Save failed', description: err?.message || 'Could not save slides.' });
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-temple-stone/20" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-8">
        <h1 className="font-cormorant text-3xl font-medium text-rain-cloud">Page Header Banners</h1>
        <p className="mt-2 max-w-2xl font-inter text-sm text-rain-cloud/50">
          Upload one or more images per page. They display as a full-width slideshow at the top of each page. Click any uploaded image to set the crop focal point — the circle shows where the banner will centre when cropped.
        </p>
      </div>

      <div className="space-y-10">
        {ILLUSTRATION_GROUPS.filter((g) => g.id !== 'global').map((group) => (
          <div key={group.id}>
            <h2 className="mb-4 font-cormorant text-2xl text-rain-cloud">{group.label}</h2>
            <div className="space-y-6">
              {group.slots.map((slot) => {
                const { slides, enabled, bottomBlur } = getSlotData(slot.id);
                return (
                  <SlotEditor
                    key={slot.id}
                    slot={slot}
                    savedSlides={slides}
                    savedEnabled={enabled}
                    savedBottomBlur={bottomBlur}
                    isSaving={saveMutation.isPending && savingSlot === slot.id}
                    onSave={(payload) => {
                      setSavingSlot(payload.slotId);
                      saveMutation.mutate(payload);
                    }}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
