import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appClient } from '@/api/appClient';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Plus, Trash2, Loader2, Images } from 'lucide-react';
import PageHeroRenderer from '../PageHeroRenderer';

const PAGE_KEYS = ['journeys', 'stories', 'shop', 'recipes', 'people', 'about', 'contact', 'farming_cycle', 'wishlist'];

function Input({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div>
      <label className="font-inter text-xs text-rain-cloud/55 block mb-1">{label}</label>
      <input
        type={type}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-border rounded-xl px-4 py-2.5 font-inter text-sm text-rain-cloud focus:outline-none focus:border-forest-canopy"
      />
    </div>
  );
}

function Textarea({ label, value, onChange, placeholder = '' }) {
  return (
    <div>
      <label className="font-inter text-xs text-rain-cloud/55 block mb-1">{label}</label>
      <textarea
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="w-full border border-border rounded-xl px-4 py-2.5 font-inter text-sm text-rain-cloud focus:outline-none focus:border-forest-canopy resize-none"
      />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label className="font-inter text-xs text-rain-cloud/55 block mb-1">{label}</label>
      <select
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-border rounded-xl px-4 py-2.5 font-inter text-sm text-rain-cloud focus:outline-none focus:border-forest-canopy"
      >
        <option value="">— Select —</option>
        {options.map(o => (
          <option key={o} value={o}>{o.replace(/_/g, ' ').toUpperCase()}</option>
        ))}
      </select>
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-forest-canopy' : 'bg-temple-stone/50'}`}
      >
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </div>
      <span className="font-inter text-sm text-rain-cloud/80">{label}</span>
    </label>
  );
}

export default function PageHeroEditor() {
  const [selectedPage, setSelectedPage] = useState('journeys');
  const [uploading, setUploading] = useState(false);
  const [localHero, setLocalHero] = useState(null);
  const inputRef = useRef();
  const queryClient = useQueryClient();
  const debounceTimerRef = useRef(null);

  const { data: hero, isLoading } = useQuery({
    queryKey: ['page-hero', selectedPage],
    queryFn: async () => {
      const results = await appClient.entities.PageHero.filter({ page_key: selectedPage }, '-updated_date', 1);
      return results[0] || { page_key: selectedPage };
    },
  });

  const displayHero = localHero || hero;

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (hero?.id) {
        return await appClient.entities.PageHero.update(hero.id, data);
      }
      return await appClient.entities.PageHero.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-hero'] });
      setLocalHero(null);
    },
  });

  const handleChange = (field, value) => {
    const updated = { ...(localHero || hero), [field]: value };
    setLocalHero(updated);
    
    // Debounce the save to avoid excessive mutations
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      saveMutation.mutate(updated);
    }, 500);
  };

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !displayHero) return;

    setUploading(true);
    const { file_url } = await appClient.integrations.Core.UploadFile({ file });
    
    if (displayHero.hero_mode === 'slideshow') {
      handleChange('slide_urls', [...(displayHero.slide_urls || []), file_url]);
    } else {
      handleChange('media_url', file_url);
    }
    
    setUploading(false);
    e.target.value = '';
  };

  if (isLoading) return <div className="p-6 text-center">Loading...</div>;
  if (!displayHero) return null;

  return (
    <div className="space-y-8 p-6">
      {/* Page selector */}
      <div>
        <label className="font-inter text-xs text-rain-cloud/55 block mb-2">Select Page</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {PAGE_KEYS.map(key => (
            <button
              key={key}
              onClick={() => setSelectedPage(key)}
              className={`py-2 px-3 rounded-xl font-inter text-xs border-2 transition-all ${
                selectedPage === key
                  ? 'bg-rain-cloud text-white border-rain-cloud'
                  : 'border-border text-rain-cloud/60 hover:border-rain-cloud/40'
              }`}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Editor */}
        <div className="space-y-4">
          <h3 className="font-cormorant text-xl text-rain-cloud">Hero Settings</h3>

          <Input
            label="Label (e.g. EXPLORE)"
            value={displayHero.label}
            onChange={v => handleChange('label', v)}
            placeholder="EXPLORE"
          />

          <Input
            label="Title"
            value={displayHero.title}
            onChange={v => handleChange('title', v)}
            placeholder="Journeys"
          />

          <Textarea
            label="Subtitle"
            value={displayHero.subtitle}
            onChange={v => handleChange('subtitle', v)}
            placeholder="Cinematic field journals from India's heartland"
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Mode"
              value={displayHero.hero_mode}
              onChange={v => handleChange('hero_mode', v)}
              options={['single', 'slideshow']}
            />
            <Select
              label="Media Type"
              value={displayHero.media_type}
              onChange={v => handleChange('media_type', v)}
              options={['image', 'video']}
            />
          </div>

          <div className="border-t border-border/50 pt-4">
            <h4 className="font-inter text-sm font-medium text-rain-cloud/70 mb-3">Media Upload</h4>
            {displayHero.hero_mode === 'single' && (
              <>
                <button
                  onClick={() => inputRef.current?.click()}
                  disabled={uploading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-xl text-rain-cloud/50 hover:border-forest-canopy hover:text-forest-canopy transition-colors disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? 'Uploading...' : 'Upload Image/Video'}
                </button>
                {displayHero.media_url && (
                  <div className="mt-3 relative rounded-xl overflow-hidden border border-border">
                    {displayHero.media_url.includes('.mp4') || displayHero.media_url.includes('.webm') ? (
                      <video src={displayHero.media_url} className="w-full h-32 object-cover" />
                    ) : (
                      <img src={displayHero.media_url} alt="" className="w-full h-32 object-cover" />
                    )}
                    <button
                      onClick={() => handleChange('media_url', '')}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-80 hover:opacity-100"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </>
            )}

            {displayHero.hero_mode === 'slideshow' && (
              <>
                <button
                  onClick={() => inputRef.current?.click()}
                  disabled={uploading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-xl text-rain-cloud/50 hover:border-forest-canopy hover:text-forest-canopy transition-colors disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Add Slide
                </button>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {(displayHero.slide_urls || []).map((url, i) => (
                    <div key={i} className="relative rounded-lg overflow-hidden border border-border group">
                      {url.includes('.mp4') || url.includes('.webm') ? (
                        <video src={url} className="w-full aspect-video object-cover" />
                      ) : (
                        <img src={url} alt="" className="w-full aspect-video object-cover" />
                      )}
                      <button
                        onClick={() => handleChange('slide_urls', displayHero.slide_urls.filter((_, j) => j !== i))}
                        className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <Input
                  label="Slideshow Interval (ms)"
                  value={displayHero.slideshow_interval_ms}
                  onChange={v => handleChange('slideshow_interval_ms', parseFloat(v))}
                  type="number"
                  placeholder="5000"
                />
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="CTA Label"
              value={displayHero.cta_label}
              onChange={v => handleChange('cta_label', v)}
              placeholder="Explore Now"
            />
            <Input
              label="CTA URL"
              value={displayHero.cta_url}
              onChange={v => handleChange('cta_url', v)}
              placeholder="/journeys"
            />
          </div>

          <Select
            label="Background Style"
            value={displayHero.background_style}
            onChange={v => handleChange('background_style', v)}
            options={['rain_mist', 'wet_earth', 'forest_canopy', 'temple_stone', 'rain_cloud', 'transparent']}
          />

          <Toggle
            label="Active"
            checked={displayHero.is_active !== false}
            onChange={v => handleChange('is_active', v)}
          />
        </div>

        {/* Preview */}
        <div className="space-y-3">
          <h3 className="font-cormorant text-xl text-rain-cloud">Preview</h3>
          <div className="border border-border rounded-2xl overflow-hidden">
            <PageHeroRenderer hero={displayHero} />
          </div>
          {saveMutation.isPending && (
            <p className="text-center font-inter text-xs text-rain-cloud/50">Saving...</p>
          )}
        </div>
      </div>

      <input ref={inputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileUpload} />
    </div>
  );
}