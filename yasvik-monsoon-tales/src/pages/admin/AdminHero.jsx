import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appClient } from '@/api/appClient';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import EntityFormModal from '../../components/admin/EntityFormModal';
import MediaPickerModal from '../../components/admin/MediaPickerModal';
import { Plus, GripVertical, Eye, EyeOff, Pencil, Trash2, Star, Film, Image, SlidersHorizontal, Upload, GalleryHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';

const EMPTY = {
  section_type: 'hero',
  title: '',
  subtitle: '',
  body_text: '',
  cta_label: 'Start Your Journey',
  cta_url: '',
  media_url: '',
  media_type: 'image',
  hero_video: '',
  hero_video_poster: '',
  hero_mode: 'single',
  slide_urls: [],
  slideshow_interval_ms: 5000,
  strip_label: 'From This Journey',
  logo_width: 80,
  logo_height: 80,
  sort_order: 0,
  is_active: true,
  background_style: 'rain_cloud',
  mobile_media_url: '',
};

const parseContent = (content) => {
  if (!content) return {};
  if (typeof content === 'object') return content;
  if (typeof content === 'string') {
    try {
      return JSON.parse(content);
    } catch {
      return {};
    }
  }
  return {};
};

const hydrateHeroForm = (item = {}) => {
  const content = parseContent(item.content || item.content_json);
  return {
    ...EMPTY,
    ...item,
    mobile_media_url: item.mobile_media_url || content.mobile_media_url || '',
  };
};

const CTA_SUGGESTIONS = [
  'Start Your Journey',
  'Begin with Kurmagram',
  'Discover Living Traditions',
  'Explore What\'s Still Real',
];

const MODE_INFO = {
  single: 'Shows one image or video. Use "Hero Image URL" or "Hero Video URL".',
  slideshow: 'Cycles through multiple slides automatically. Add URLs in the Slides list below.',
};

function SlideList({ urls, onChange, onOpenGallery }) {
  const [draft, setDraft] = useState('');
  const [uploading, setUploading] = useState(false);

  const add = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onChange([...urls, trimmed]);
    setDraft('');
  };

  const remove = (i) => onChange(urls.filter((_, idx) => idx !== i));

  const handleFileUpload = async (file) => {
    if (!file) return;
    try {
      setUploading(true);
      const result = await appClient.integrations.Core.UploadFile({ file });
      if (result?.file_url) onChange([...urls, result.file_url]);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      {urls.map((url, i) => (
        <div key={i} className="flex items-center gap-2 bg-rain-mist rounded-xl px-3 py-2">
          <div className="w-10 h-7 rounded-lg overflow-hidden flex-shrink-0 bg-temple-stone/20">
            {url.match(/\.(mp4|webm|mov)(\?|$)/i)
              ? <div className="w-full h-full flex items-center justify-center"><Film className="w-3 h-3 text-rain-cloud/40" /></div>
              : <img src={url} alt="" className="w-full h-full object-cover" onError={e => e.target.style.display='none'} />}
          </div>
          <span className="flex-1 font-inter text-xs text-rain-cloud/60 truncate">{url}</span>
          <button onClick={() => remove(i)} className="text-rain-cloud/30 hover:text-red-400 transition-colors font-inter text-xs">✕</button>
        </div>
      ))}

      {/* Add new slide — 3 options */}
      <div className="border-2 border-dashed border-border rounded-xl p-3 space-y-2 bg-rain-mist/20">
        {/* Upload */}
        <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-white cursor-pointer hover:bg-rain-mist/50 transition-colors ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
          <Upload className="w-4 h-4 text-rain-cloud/50 flex-shrink-0" />
          <span className="font-inter text-xs text-rain-cloud/60">{uploading ? 'Uploading…' : 'Upload image or video'}</span>
          <input
            type="file"
            accept="image/*,video/*"
            className="hidden"
            disabled={uploading}
            onChange={e => handleFileUpload(e.target.files?.[0])}
          />
        </label>

        {/* Gallery picker */}
        <button
          type="button"
          onClick={onOpenGallery}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-white hover:bg-rain-mist/50 transition-colors"
        >
          <GalleryHorizontal className="w-4 h-4 text-forest-canopy/60 flex-shrink-0" />
          <span className="font-inter text-xs text-rain-cloud/60">Select from media gallery</span>
        </button>

        {/* URL input */}
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
            placeholder="Or paste image / video URL…"
            className="flex-1 border border-border rounded-lg px-3 py-2 font-inter text-xs text-rain-cloud focus:outline-none focus:border-forest-canopy bg-white"
          />
          <button
            onClick={add}
            className="px-3 py-2 bg-wet-earth text-white rounded-lg font-inter text-xs hover:bg-wet-earth/90 transition-colors"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

function HeroForm({ data, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [picker, setPicker] = useState(null); // key of field being picked, or '__slide__' for slideshow
  
  const f = (key) => (e) => onChange({ ...data, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const mode = data.hero_mode || 'single';

  const handleFileUpload = async (file, urlKey) => {
    if (!file) return;
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      const result = await appClient.integrations.Core.UploadFile({ file });
      if (result?.file_url) {
        onChange({ ...data, [urlKey]: result.file_url });
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDragDrop = (e, urlKey) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0], urlKey);
    }
  };

  return (
    <>
    <MediaPickerModal
      open={!!picker}
      onClose={() => setPicker(null)}
      onSelect={(url) => {
        if (picker === '__slide__') {
          onChange({ ...data, slide_urls: [...(data.slide_urls || []), url] });
        } else {
          onChange({ ...data, [picker]: url });
        }
        setPicker(null);
      }}
    />
    <div className="space-y-5">
      {/* Mode selector */}
      <div>
        <label className="font-inter text-xs text-rain-cloud/55 block mb-2">Display Mode</label>
        <div className="grid grid-cols-2 gap-2">
          {['single', 'slideshow'].map(m => (
            <button
              key={m}
              type="button"
              onClick={() => onChange({ ...data, hero_mode: m })}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-left transition-all ${
                mode === m
                  ? 'border-forest-canopy bg-forest-canopy/8 text-forest-canopy'
                  : 'border-border text-rain-cloud/50 hover:border-rain-cloud/30'
              }`}
            >
              {m === 'single' ? <Image className="w-4 h-4" /> : <SlidersHorizontal className="w-4 h-4" />}
              <span className="font-inter text-sm capitalize">{m}</span>
            </button>
          ))}
        </div>
        <p className="font-inter text-[11px] text-rain-cloud/35 mt-1.5">{MODE_INFO[mode]}</p>
      </div>

      {/* Logo Upload */}
      <div>
        <label className="font-inter text-xs text-rain-cloud/55 block mb-2">Brand Logo <span className="text-rain-cloud/30">(displayed on hero banner)</span></label>
        <div className="flex gap-2 mb-2">
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleFileUpload(e.dataTransfer.files?.[0], 'logo_url'); }}
            className="flex-1 border-2 border-dashed border-border rounded-xl p-4 bg-rain-mist/30 hover:bg-rain-mist/50 transition-colors"
          >
            <label className="flex flex-col items-center cursor-pointer">
              <Upload className="w-5 h-5 text-rain-cloud/40 mb-1" />
              <span className="font-inter text-xs text-rain-cloud/50">{uploading ? 'Uploading…' : 'Drag logo here or click to upload'}</span>
              <input type="file" accept="image/*" onChange={e => handleFileUpload(e.target.files?.[0], 'logo_url')} disabled={uploading} className="hidden" />
            </label>
          </div>
          <button
            type="button"
            onClick={() => setPicker('logo_url')}
            className="flex flex-col items-center justify-center gap-1 px-4 border-2 border-dashed border-forest-canopy/40 rounded-xl text-forest-canopy/60 hover:bg-forest-canopy/5 transition-colors"
          >
            <GalleryHorizontal className="w-5 h-5" />
            <span className="font-inter text-[10px]">Gallery</span>
          </button>
        </div>
        <input
          type="text"
          value={data.logo_url || ''}
          onChange={f('logo_url')}
          placeholder="Or paste logo URL…"
          className="w-full border border-border rounded-xl px-4 py-2.5 font-inter text-sm text-rain-cloud focus:outline-none focus:border-forest-canopy transition-colors"
        />
        {data.logo_url && (
          <div className="mt-2 flex items-center gap-3 p-3 bg-rain-cloud rounded-xl">
            <img src={data.logo_url} alt="Logo preview" style={{ width: data.logo_width || 80, height: data.logo_height || 80 }} className="object-contain" onError={e => e.target.style.display='none'} />
            <span className="font-inter text-xs text-white/40">Preview</span>
            <button type="button" onClick={() => onChange({ ...data, logo_url: '' })} className="ml-auto font-inter text-xs text-white/30 hover:text-red-400 transition-colors">Remove</button>
          </div>
        )}
      </div>

      {/* Logo Size Controls */}
      {data.logo_url && (
        <div className="space-y-4 bg-rain-mist/30 rounded-xl p-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-inter text-xs text-rain-cloud/55">Logo Width: {data.logo_width || 80}px</label>
            </div>
            <input
              type="range"
              min="20"
              max="400"
              value={data.logo_width || 80}
              onChange={e => onChange({ ...data, logo_width: Number(e.target.value) })}
              className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-forest-canopy"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-inter text-xs text-rain-cloud/55">Logo Height: {data.logo_height || 80}px</label>
            </div>
            <input
              type="range"
              min="20"
              max="400"
              value={data.logo_height || 80}
              onChange={e => onChange({ ...data, logo_height: Number(e.target.value) })}
              className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-forest-canopy"
            />
          </div>
        </div>
      )}

      {/* Text fields */}
      {[
        { key: 'title', label: 'Headline', placeholder: 'e.g. Yasvik' },
        { key: 'subtitle', label: 'Subtitle', placeholder: 'e.g. Natural Foods & Everyday Essentials.' },
        { key: 'cta_url', label: 'CTA Link', placeholder: '/stories' },
        { key: 'strip_label', label: 'Product Strip Label', placeholder: 'e.g. From This Journey' },
      ].map(({ key, label, placeholder }) => (
        <div key={key}>
          <label className="font-inter text-xs text-rain-cloud/55 block mb-1">{label}</label>
          <input
            type="text"
            value={data[key] || ''}
            onChange={f(key)}
            placeholder={placeholder}
            className="w-full border border-border rounded-xl px-4 py-2.5 font-inter text-sm text-rain-cloud focus:outline-none focus:border-forest-canopy transition-colors"
          />
        </div>
      ))}

      {/* CTA Label — with suggestions */}
      <div>
        <label className="font-inter text-xs text-rain-cloud/55 block mb-2">CTA Button Label <span className="text-rain-cloud/30">(choose or customize)</span></label>
        <div className="grid grid-cols-2 gap-2 mb-2">
          {CTA_SUGGESTIONS.map(suggestion => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onChange({ ...data, cta_label: suggestion })}
              className={`py-2 px-3 rounded-lg border text-left font-inter text-xs transition-all ${
                data.cta_label === suggestion
                  ? 'border-forest-canopy bg-forest-canopy/8 text-forest-canopy font-medium'
                  : 'border-border text-rain-cloud/50 hover:border-rain-cloud/30'
              }`}
            >
              {suggestion}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={data.cta_label || ''}
          onChange={f('cta_label')}
          placeholder="Or type custom…"
          className="w-full border border-border rounded-xl px-4 py-2.5 font-inter text-sm text-rain-cloud focus:outline-none focus:border-forest-canopy transition-colors"
        />
      </div>

      {/* Media fields — shown in single mode */}
      {mode === 'single' && (
        <>
          <div>
            <label className="font-inter text-xs text-rain-cloud/55 block mb-1">Hero Image URL <span className="text-rain-cloud/30">(photo, drone shot, promo banner)</span></label>
            <div className="flex gap-2 mb-2">
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={e => handleDragDrop(e, 'media_url')}
                className="flex-1 border-2 border-dashed border-border rounded-xl p-4 bg-rain-mist/30 hover:bg-rain-mist/50 transition-colors"
              >
                <label className="flex flex-col items-center cursor-pointer">
                  <Upload className="w-5 h-5 text-rain-cloud/40 mb-1" />
                  <span className="font-inter text-xs text-rain-cloud/50">Drag image here or click to select</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => handleFileUpload(e.target.files?.[0], 'media_url')}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={() => setPicker('media_url')}
                className="flex flex-col items-center justify-center gap-1 px-4 border-2 border-dashed border-forest-canopy/40 rounded-xl text-forest-canopy/60 hover:bg-forest-canopy/5 transition-colors"
              >
                <GalleryHorizontal className="w-5 h-5" />
                <span className="font-inter text-[10px]">Gallery</span>
              </button>
            </div>
            <input
              type="text"
              value={data.media_url || ''}
              onChange={f('media_url')}
              placeholder="Or paste image URL…"
              className="w-full border border-border rounded-xl px-4 py-2.5 font-inter text-sm text-rain-cloud focus:outline-none focus:border-forest-canopy transition-colors"
           />
            {data.media_url && (
              <div className="mt-2 rounded-xl overflow-hidden aspect-video">
                <img src={data.media_url} alt="" className="w-full h-full object-cover" onError={e => e.target.style.display='none'} />
              </div>
            )}
          </div>

          <div>
            <label className="font-inter text-xs text-rain-cloud/55 block mb-1">Mobile Hero Image URL <span className="text-rain-cloud/30">(portrait-first for phones)</span></label>
            <div className="flex gap-2 mb-2">
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={e => handleDragDrop(e, 'mobile_media_url')}
                className="flex-1 border-2 border-dashed border-border rounded-xl p-4 bg-rain-mist/30 hover:bg-rain-mist/50 transition-colors"
              >
                <label className="flex flex-col items-center cursor-pointer">
                  <Upload className="w-5 h-5 text-rain-cloud/40 mb-1" />
                  <span className="font-inter text-xs text-rain-cloud/50">Drag mobile image here or click to select</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => handleFileUpload(e.target.files?.[0], 'mobile_media_url')}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={() => setPicker('mobile_media_url')}
                className="flex flex-col items-center justify-center gap-1 px-4 border-2 border-dashed border-forest-canopy/40 rounded-xl text-forest-canopy/60 hover:bg-forest-canopy/5 transition-colors"
              >
                <GalleryHorizontal className="w-5 h-5" />
                <span className="font-inter text-[10px]">Gallery</span>
              </button>
            </div>
            <input
              type="text"
              value={data.mobile_media_url || ''}
              onChange={f('mobile_media_url')}
              placeholder="Or paste mobile image URL…"
              className="w-full border border-border rounded-xl px-4 py-2.5 font-inter text-sm text-rain-cloud focus:outline-none focus:border-forest-canopy transition-colors"
            />
            {data.mobile_media_url && (
              <div className="mt-2 rounded-xl overflow-hidden w-full max-w-[220px] aspect-[9/16] bg-rain-mist">
                <img src={data.mobile_media_url} alt="" className="w-full h-full object-cover" onError={e => e.target.style.display='none'} />
              </div>
            )}
          </div>

          <div>
            <label className="font-inter text-xs text-rain-cloud/55 block mb-1">Hero Video URL <span className="text-rain-cloud/30">(drone footage, cinematic reel — loops silently)</span></label>
            <div className="flex gap-2 mb-2">
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={e => handleDragDrop(e, 'hero_video')}
                className="flex-1 border-2 border-dashed border-border rounded-xl p-4 bg-rain-mist/30 hover:bg-rain-mist/50 transition-colors"
              >
                <label className="flex flex-col items-center cursor-pointer">
                  <Upload className="w-5 h-5 text-rain-cloud/40 mb-1" />
                  <span className="font-inter text-xs text-rain-cloud/50">Drag video here or click to select</span>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={e => handleFileUpload(e.target.files?.[0], 'hero_video')}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={() => setPicker('hero_video')}
                className="flex flex-col items-center justify-center gap-1 px-4 border-2 border-dashed border-forest-canopy/40 rounded-xl text-forest-canopy/60 hover:bg-forest-canopy/5 transition-colors"
              >
                <GalleryHorizontal className="w-5 h-5" />
                <span className="font-inter text-[10px]">Gallery</span>
              </button>
            </div>
            <input
              type="text"
              value={data.hero_video || ''}
              onChange={f('hero_video')}
              placeholder="Or paste video URL (.mp4) or YouTube link…"
              className="w-full border border-border rounded-xl px-4 py-2.5 font-inter text-sm text-rain-cloud focus:outline-none focus:border-forest-canopy transition-colors"
            />
            {/* Live preview for video / YouTube */}
            {data.hero_video && (() => {
              const ytMatch = data.hero_video.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
              if (ytMatch) {
                return (
                  <div className="mt-2 rounded-xl overflow-hidden aspect-video">
                    <iframe
                      src={`https://www.youtube.com/embed/${ytMatch[1]}?autoplay=0&controls=1`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                      frameBorder="0"
                    />
                  </div>
                );
              }
              if (data.hero_video.match(/\.(mp4|webm|mov)(\?|$)/i)) {
                return (
                  <div className="mt-2 rounded-xl overflow-hidden aspect-video">
                    <video src={data.hero_video} controls className="w-full h-full object-cover" />
                  </div>
                );
              }
              return null;
            })()}
          </div>
          {data.hero_video && (
            <div>
              <label className="font-inter text-xs text-rain-cloud/55 block mb-1">Video Poster / Thumbnail URL <span className="text-rain-cloud/30">(shown while video loads)</span></label>
              <div className="flex gap-2 mb-2">
                <div
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => handleDragDrop(e, 'hero_video_poster')}
                  className="flex-1 border-2 border-dashed border-border rounded-xl p-4 bg-rain-mist/30 hover:bg-rain-mist/50 transition-colors"
                >
                  <label className="flex flex-col items-center cursor-pointer">
                    <Upload className="w-5 h-5 text-rain-cloud/40 mb-1" />
                    <span className="font-inter text-xs text-rain-cloud/50">Drag image here or click to select</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => handleFileUpload(e.target.files?.[0], 'hero_video_poster')}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => setPicker('hero_video_poster')}
                  className="flex flex-col items-center justify-center gap-1 px-4 border-2 border-dashed border-forest-canopy/40 rounded-xl text-forest-canopy/60 hover:bg-forest-canopy/5 transition-colors"
                >
                  <GalleryHorizontal className="w-5 h-5" />
                  <span className="font-inter text-[10px]">Gallery</span>
                </button>
              </div>
              <input
                type="text"
                value={data.hero_video_poster || ''}
                onChange={f('hero_video_poster')}
                placeholder="Or paste image URL…"
                className="w-full border border-border rounded-xl px-4 py-2.5 font-inter text-sm text-rain-cloud focus:outline-none focus:border-forest-canopy transition-colors"
              />
            </div>
          )}
        </>
      )}

      {/* Slides — shown in slideshow mode */}
      {mode === 'slideshow' && (
        <>
          <div>
            <label className="font-inter text-xs text-rain-cloud/55 block mb-2">Slides <span className="text-rain-cloud/30">(images or video URLs in order)</span></label>
            <SlideList
              urls={Array.isArray(data.slide_urls) ? data.slide_urls : []}
              onChange={(urls) => onChange({ ...data, slide_urls: urls })}
              onOpenGallery={() => setPicker('__slide__')}
            />
          </div>
          <div>
            <label className="font-inter text-xs text-rain-cloud/55 block mb-1">Interval between slides (seconds)</label>
            <input
              type="number"
              min="2"
              max="30"
              value={Math.round((data.slideshow_interval_ms || 5000) / 1000)}
              onChange={e => onChange({ ...data, slideshow_interval_ms: Number(e.target.value) * 1000 })}
              className="w-full border border-border rounded-xl px-4 py-2.5 font-inter text-sm text-rain-cloud focus:outline-none"
            />
          </div>
        </>
      )}

      {/* Sort & visibility */}
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <label className="font-inter text-xs text-rain-cloud/55 block mb-1">Sort Order <span className="text-rain-cloud/30">(lower = first)</span></label>
          <input
            type="number"
            value={data.sort_order || 0}
            onChange={f('sort_order')}
            className="w-full border border-border rounded-xl px-4 py-2.5 font-inter text-sm text-rain-cloud focus:outline-none"
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer pb-2.5">
          <input type="checkbox" checked={!!data.is_active} onChange={f('is_active')} className="w-4 h-4 accent-forest-canopy" />
          <span className="font-inter text-sm text-rain-cloud/70">Active</span>
        </label>
      </div>
    </div>
    </>
  );
}

export default function AdminHero() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const { data: heroes = [], isLoading } = useQuery({
    queryKey: ['admin-hero-sections'],
    queryFn: () => appClient.entities.HomepageSection.filter({ section_type: 'hero' }, 'sort_order', 20),
  });

  const createMut = useMutation({
    mutationFn: (d) => appClient.entities.HomepageSection.create({ ...d, section_type: 'hero' }),
    onSuccess: () => { qc.invalidateQueries(['admin-hero-sections']); qc.invalidateQueries(['homepage-sections']); closeModal(); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, d }) => appClient.entities.HomepageSection.update(id, d),
    onSuccess: () => { qc.invalidateQueries(['admin-hero-sections']); qc.invalidateQueries(['homepage-sections']); closeModal(); },
  });
  const deleteMut = useMutation({
    mutationFn: (id) => appClient.entities.HomepageSection.delete(id),
    onSuccess: () => { qc.invalidateQueries(['admin-hero-sections']); qc.invalidateQueries(['homepage-sections']); },
  });

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY, sort_order: heroes.length }); setModal(true); };
  const openEdit   = (item) => { setEditing(item); setForm(hydrateHeroForm(item)); setModal(true); };
  const closeModal = () => { setModal(false); setEditing(null); setForm(EMPTY); };

  const handleSave = () => {
    const existingContent = parseContent(form.content || form.content_json);
    const nextContent = { ...existingContent, mobile_media_url: form.mobile_media_url || '' };
    const payload = {
      ...form,
      sort_order: Number(form.sort_order),
      content: nextContent,
    };
    delete payload.mobile_media_url;
    if (editing) updateMut.mutate({ id: editing.id, d: payload });
    else createMut.mutate(payload);
  };

  const toggleActive = (item) => updateMut.mutate({ id: item.id, d: { is_active: !item.is_active } });

  const modeIcon = (hero) => {
    if (hero.hero_mode === 'slideshow') return <SlidersHorizontal className="w-3 h-3" />;
    if (hero.hero_video) return <Film className="w-3 h-3" />;
    return <Image className="w-3 h-3" />;
  };

  const previewSrc = (hero) => {
    if (hero.hero_video_poster) return hero.hero_video_poster;
    if (hero.slide_urls?.[0] && !hero.slide_urls[0].match(/\.(mp4|webm|mov)/i)) return hero.slide_urls[0];
    return hero.media_url || null;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <AdminPageHeader
        title="Hero Manager"
        description="Manage cinematic hero banners — single image, drone video, promotional shot, or auto-slideshow."
        action={
          <button onClick={openCreate} className="flex items-center gap-2 py-2.5 px-5 bg-wet-earth text-white font-inter text-sm rounded-full hover:bg-wet-earth/90 transition-all">
            <Plus className="w-4 h-4" /> Add Hero
          </button>
        }
      />

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-temple-stone/20 rounded-2xl animate-pulse" />)}</div>
      ) : heroes.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl">
          <Star className="w-8 h-8 text-rain-cloud/20 mx-auto mb-3" />
          <p className="font-inter text-sm text-rain-cloud/40">No hero banners yet. Add your first one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {heroes.map((hero, i) => (
            <motion.div
              key={hero.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm"
            >
              <GripVertical className="w-4 h-4 text-rain-cloud/25 flex-shrink-0" />
              <div className="w-16 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-temple-stone/20">
                {previewSrc(hero)
                  ? <img src={previewSrc(hero)} alt={hero.title} className="w-full h-full object-cover" onError={e => e.target.style.display='none'} />
                  : <div className="w-full h-full flex items-center justify-center text-rain-cloud/20">{modeIcon(hero)}</div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-cormorant text-base text-rain-cloud font-medium truncate">{hero.title || '(untitled)'}</p>
                <p className="font-inter text-xs text-rain-cloud/40 truncate">{hero.subtitle || hero.cta_url || '—'}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="flex items-center gap-1 font-inter text-[10px] text-rain-cloud/30">
                    {modeIcon(hero)}
                    {hero.hero_mode === 'slideshow'
                      ? `Slideshow · ${hero.slide_urls?.length || 0} slides`
                      : hero.hero_video ? 'Video' : 'Image'}
                  </span>
                  <span className="font-inter text-[10px] text-rain-cloud/25">· Order {hero.sort_order}</span>
                  <span className={`font-inter text-[10px] px-2 py-0.5 rounded-full ${hero.is_active ? 'bg-forest-canopy/15 text-forest-canopy' : 'bg-temple-stone/30 text-rain-cloud/40'}`}>
                    {hero.is_active ? 'Active' : 'Hidden'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => toggleActive(hero)} className="p-1.5 rounded-lg text-rain-cloud/35 hover:text-forest-canopy transition-all">
                  {hero.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button onClick={() => openEdit(hero)} className="p-1.5 rounded-lg text-rain-cloud/35 hover:text-wet-earth transition-all">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => deleteMut.mutate(hero.id)} className="p-1.5 rounded-lg text-rain-cloud/35 hover:text-red-500 transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <EntityFormModal open={modal} onClose={closeModal} title={editing ? 'Edit Hero Banner' : 'New Hero Banner'}>
        <HeroForm data={form} onChange={setForm} />
        <div className="flex gap-3 mt-6 pt-4 border-t border-border">
          <button onClick={closeModal} className="flex-1 py-2.5 rounded-full border border-border font-inter text-sm text-rain-cloud/60">Cancel</button>
          <button
            onClick={handleSave}
            disabled={createMut.isPending || updateMut.isPending}
            className="flex-1 py-2.5 rounded-full bg-wet-earth text-white font-inter text-sm disabled:opacity-50"
          >
            {editing ? 'Save Changes' : 'Create Hero'}
          </button>
        </div>
      </EntityFormModal>
    </div>
  );
}
