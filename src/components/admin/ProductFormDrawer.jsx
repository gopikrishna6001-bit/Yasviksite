import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { appClient } from '@/api/appClient';
import MediaPickerModal from './MediaPickerModal';
import {
  X, Plus, Trash2, Images, Link2, Package,
  DollarSign, BookOpen, Globe, Loader2
} from 'lucide-react';
import ImageUploadField from './ImageUploadField';
import { buildProductSeoMeta } from '@/lib/productSeo';

const TABS = [
  { id: 'basic', label: 'Basic Info', icon: Package },
  { id: 'pricing', label: 'Pricing & Stock', icon: DollarSign },
  { id: 'media', label: 'Media', icon: Images },
  { id: 'story', label: 'Storytelling', icon: BookOpen },
  { id: 'links', label: 'Links', icon: Link2 },
  { id: 'seo', label: 'SEO', icon: Globe },
];

const HARVEST_SEASONS = ['pre_monsoon', 'monsoon', 'post_monsoon', 'winter', 'summer', 'year_round'];
const AVAILABILITY_OPTIONS = ['in_stock', 'low_stock', 'out_of_stock', 'preorder'];

function Input({ label, value, onChange, type = 'text', placeholder = '', hint }) {
  return (
    <div>
      <label className="font-inter text-xs text-rain-cloud/55 block mb-1">{label}</label>
      <input
        type={type}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-border rounded-xl px-4 py-2.5 font-inter text-sm text-rain-cloud focus:outline-none focus:border-forest-canopy transition-colors bg-white"
      />
      {hint && <p className="mt-1 font-inter text-[10px] text-rain-cloud/35">{hint}</p>}
    </div>
  );
}

function Textarea({ label, value, onChange, rows = 3, placeholder = '' }) {
  return (
    <div>
      <label className="font-inter text-xs text-rain-cloud/55 block mb-1">{label}</label>
      <textarea
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full border border-border rounded-xl px-4 py-2.5 font-inter text-sm text-rain-cloud focus:outline-none focus:border-forest-canopy transition-colors resize-none bg-white"
      />
    </div>
  );
}

function Select({ label, value, onChange, options, placeholder = '— Select —' }) {
  return (
    <div>
      <label className="font-inter text-xs text-rain-cloud/55 block mb-1">{label}</label>
      <select
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-border rounded-xl px-4 py-2.5 font-inter text-sm text-rain-cloud focus:outline-none focus:border-forest-canopy bg-white"
      >
        <option value="">{placeholder}</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function Toggle({ label, checked, onChange, hint }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <div
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 w-9 h-5 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-forest-canopy' : 'bg-temple-stone/50'}`}
      >
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </div>
      <div>
        <span className="font-inter text-sm text-rain-cloud/80 block">{label}</span>
        {hint && <span className="font-inter text-[10px] text-rain-cloud/35">{hint}</span>}
      </div>
    </label>
  );
}

function TagInput({ label, values = [], onChange }) {
  const [input, setInput] = useState('');
  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !values.includes(trimmed)) onChange([...values, trimmed]);
    setInput('');
  };
  return (
    <div>
      <label className="font-inter text-xs text-rain-cloud/55 block mb-1">{label}</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {values.map(v => (
          <span key={v} className="inline-flex items-center gap-1 px-2.5 py-1 bg-muted rounded-full font-inter text-xs text-rain-cloud/70">
            {v}
            <button type="button" onClick={() => onChange(values.filter(t => t !== v))} className="text-rain-cloud/35 hover:text-rain-cloud">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder="Type and press Enter"
          className="flex-1 border border-border rounded-xl px-3 py-2 font-inter text-sm text-rain-cloud focus:outline-none focus:border-forest-canopy"
        />
        <button type="button" onClick={add} className="px-3 py-2 bg-muted rounded-xl font-inter text-xs text-rain-cloud/60 hover:bg-temple-stone/30 transition-colors">
          Add
        </button>
      </div>
    </div>
  );
}

function ImageURLField({ label, value, onChange, onPickFromLibrary }) {
  return (
    <div>
      <label className="font-inter text-xs text-rain-cloud/55 block mb-1">{label}</label>
      <div className="flex gap-2">
        <input
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder="https://… or pick from library"
          className="flex-1 border border-border rounded-xl px-4 py-2.5 font-inter text-sm text-rain-cloud focus:outline-none focus:border-forest-canopy"
        />
        <button
          type="button"
          onClick={onPickFromLibrary}
          className="px-3 py-2 border border-border rounded-xl text-rain-cloud/50 hover:text-wet-earth hover:border-wet-earth/50 transition-colors"
          title="Pick from library"
        >
          <Images className="w-4 h-4" />
        </button>
      </div>
      {value && (
        <img src={value} alt="" className="mt-2 w-full h-28 object-cover rounded-xl border border-border" />
      )}
    </div>
  );
}

// ─── VARIANT IMAGES UPLOAD ────────────────────────────────────────────────────

function VariantImagesField({ values = [], onChange }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await appClient.integrations.Core.UploadFile({ file });
    onChange([...values, file_url]);
    setUploading(false);
    e.target.value = '';
  };

  return (
    <div>
      <label className="font-inter text-xs text-rain-cloud/55 block mb-2">Variant Images</label>
      <div className="grid grid-cols-4 gap-2 mb-2">
        {values.map((url, i) => (
          <div key={i} className="relative group aspect-square rounded-lg overflow-hidden">
            <img src={url} alt={`variant-${i}`} className="w-full h-full object-cover border border-border" />
            <button
              type="button"
              onClick={() => onChange(values.filter((_, j) => j !== i))}
              className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="aspect-square rounded-lg border-2 border-dashed border-border flex items-center justify-center text-rain-cloud/35 hover:border-forest-canopy hover:text-forest-canopy transition-colors disabled:opacity-50"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

// ─── TAB PANELS ──────────────────────────────────────────────────────────────

function BasicTab({ data, onChange, categories }) {
  const f = (key) => (val) => onChange({ ...data, [key]: val });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Input label="Title *" value={data.title} onChange={f('title')} placeholder="e.g. Kurmagram Aged Red Rice" />
        </div>
        <Input label="Slug" value={data.slug} onChange={f('slug')} placeholder="e.g. kurmagram-red-rice" hint="Auto-generated from title if blank" />
        <Input label="SKU" value={data.sku} onChange={f('sku')} placeholder="e.g. YAS-RICE-001" />
      </div>
      <Select
        label="Category"
        value={data.category_id}
        onChange={f('category_id')}
        options={categories.map(c => ({ value: c.id, label: c.emotional_title || c.name }))}
      />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Unit" value={data.unit} onChange={f('unit')} placeholder="e.g. 500g, 1kg" />
        <Input label="Weight (grams)" value={data.weight_grams} onChange={f('weight_grams')} type="number" placeholder="500" />
      </div>
      <Input label="Sourcing Location" value={data.sourcing_location} onChange={f('sourcing_location')} placeholder="e.g. Bastar, Chhattisgarh" />
      <Select
        label="Harvest Season"
        value={data.harvest_season}
        onChange={f('harvest_season')}
        options={HARVEST_SEASONS.map(s => ({ value: s, label: s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }))}
      />
      <Input
        label="Harvest Date"
        value={data.harvest_date}
        onChange={f('harvest_date')}
        type="date"
        hint="Optional. Add only for directly sourced or traceable batches."
      />
      <Input
        label="Batch Testing Date"
        value={data.batch_tested_at}
        onChange={f('batch_tested_at')}
        type="date"
        hint="Optional. Shown only when available; not required for vendor-sourced products."
      />
      <Input label="Delivery Estimate" value={data.delivery_estimate} onChange={f('delivery_estimate')} placeholder="e.g. 3–5 business days" />
      <TagInput label="Certifications (e.g. Organic, GI Tagged)" values={data.certifications || []} onChange={f('certifications')} />
      <TagInput
        label="Purity Badges (e.g. Lab-Tested, No Adulteration)"
        values={data.purity_badges || []}
        onChange={f('purity_badges')}
      />
      <TagInput label="Discovery Tags" values={data.tags || []} onChange={f('tags')} />
      <div className="space-y-3 pt-2 border-t border-border/50">
        <Toggle label="Published" checked={!!data.is_published} onChange={f('is_published')} hint="Make this product visible to customers" />
        <Toggle label="Featured" checked={!!data.is_featured} onChange={f('is_featured')} />
        <Toggle label="⭐ Show in Hero Strip" checked={!!data.featured_in_hero} onChange={f('featured_in_hero')} hint="Pins this product in the homepage 'Selling Now' strip (up to 4 shown)" />
      </div>
    </div>
  );
}

function PricingTab({ data, onChange }) {
  const f = (key) => (val) => onChange({ ...data, [key]: val });
  const comparePrice = parseFloat(data.compare_price) || 0;
  const price = parseFloat(data.price) || 0;
  const discount = comparePrice && comparePrice > price ? Math.round(((comparePrice - price) / comparePrice) * 100) : null;

  return (
    <div className="space-y-6">
      <div className="bg-rain-mist/40 rounded-2xl p-5 border border-temple-stone/20">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="font-inter text-xs text-rain-cloud/55 block mb-2 uppercase tracking-wider">Selling Price (₹) *</label>
            <input
              type="number"
              value={data.price || ''}
              onChange={e => f('price')(e.target.value)}
              placeholder="0"
              className="w-full text-3xl font-cormorant font-medium text-rain-cloud border-b-2 border-wet-earth/50 bg-transparent focus:outline-none focus:border-wet-earth pb-2"
            />
          </div>
          <div>
            <label className="font-inter text-xs text-rain-cloud/55 block mb-2 uppercase tracking-wider">Compare Price (₹)</label>
            <input
              type="number"
              value={data.compare_price || ''}
              onChange={e => f('compare_price')(e.target.value)}
              placeholder="0"
              className="w-full text-3xl font-cormorant font-medium text-rain-cloud/40 line-through border-b-2 border-temple-stone/30 bg-transparent focus:outline-none focus:border-temple-stone pb-2"
            />
          </div>
        </div>
        {discount && (
          <div className="mt-4 flex items-center justify-between">
            <span className="font-inter text-xs text-rain-cloud/50">Discount</span>
            <span className="font-inter text-lg font-semibold text-warm-turmeric">{discount}% OFF</span>
          </div>
        )}
      </div>
      <Input label="Discount Note" value={data.discount_note} onChange={f('discount_note')} placeholder="e.g. 20% off for harvest season" />
      <div className="border-t border-border/50 pt-4 space-y-4">
        <h4 className="font-inter text-sm font-medium text-rain-cloud/70">Inventory</h4>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Stock Quantity" value={data.stock} onChange={f('stock')} type="number" placeholder="0" />
          <Input label="Low Stock Alert Below" value={data.low_stock_threshold} onChange={f('low_stock_threshold')} type="number" placeholder="10" />
        </div>
        <Select
          label="Availability"
          value={data.availability}
          onChange={f('availability')}
          options={AVAILABILITY_OPTIONS.map(o => ({ value: o, label: o.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }))}
        />
        <Input label="Preorder Note" value={data.preorder_note} onChange={f('preorder_note')} placeholder="Ships in 2 weeks" hint="Shown only when availability is 'Preorder'" />
        <Textarea label="Internal Inventory Notes" value={data.inventory_notes} onChange={f('inventory_notes')} rows={2} placeholder="Internal notes for operations team…" />
      </div>
      <div className="border-t border-border/50 pt-4 space-y-3">
        <h4 className="font-inter text-sm font-medium text-rain-cloud/70">Variants (optional)</h4>
        {(data.variants || []).map((v, i) => {
          const updateVariant = (field, value) => {
            const nv = [...(data.variants || [])];
            nv[i] = { ...nv[i], [field]: value };
            onChange({ ...data, variants: nv });
          };
          const vPrice = parseFloat(v.price) || 0;
          const vComparePrice = parseFloat(v.compare_price) || 0;
          const vDiscount = vComparePrice && vComparePrice > vPrice ? Math.round(((vComparePrice - vPrice) / vComparePrice) * 100) : null;
          
          return (
            <div key={i} className="border border-border/50 rounded-xl p-4 space-y-3">
              <div className="flex gap-2 items-center justify-between">
                <input value={v.label || ''} onChange={e => updateVariant('label', e.target.value)} placeholder="Variant label (e.g. 500g, 1kg)" className="flex-1 border border-border rounded-xl px-3 py-2 font-inter text-sm text-rain-cloud focus:outline-none focus:border-forest-canopy" />
                <button type="button" onClick={() => onChange({ ...data, variants: (data.variants || []).filter((_, j) => j !== i) })} className="p-2 text-rain-cloud/30 hover:text-red-400 transition-colors flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-inter text-[10px] text-rain-cloud/55 block mb-1 uppercase tracking-wider">Price (₹)</label>
                  <input value={v.price || ''} onChange={e => updateVariant('price', e.target.value)} type="number" placeholder="0" className="w-full text-lg font-cormorant font-medium text-rain-cloud border-b-2 border-wet-earth/50 bg-transparent focus:outline-none focus:border-wet-earth" />
                </div>
                <div>
                  <label className="font-inter text-[10px] text-rain-cloud/55 block mb-1 uppercase tracking-wider">Compare (₹)</label>
                  <input value={v.compare_price || ''} onChange={e => updateVariant('compare_price', e.target.value)} type="number" placeholder="0" className="w-full text-lg font-cormorant font-medium text-rain-cloud/40 line-through border-b-2 border-temple-stone/30 bg-transparent focus:outline-none focus:border-temple-stone" />
                </div>
                <div>
                  <label className="font-inter text-[10px] text-rain-cloud/55 block mb-1 uppercase tracking-wider">Stock</label>
                  <input value={v.stock || ''} onChange={e => updateVariant('stock', e.target.value)} type="number" placeholder="0" className="w-full text-lg font-cormorant font-medium text-rain-cloud border-b-2 border-forest-canopy/50 bg-transparent focus:outline-none focus:border-forest-canopy" />
                </div>
              </div>
              {vDiscount && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-rain-cloud/50">Discount</span>
                  <span className="font-semibold text-warm-turmeric">{vDiscount}% OFF</span>
                </div>
              )}
              <VariantImagesField
                values={v.image_urls || []}
                onChange={urls => updateVariant('image_urls', urls)}
              />
            </div>
          );
        })}
        <button type="button" onClick={() => onChange({ ...data, variants: [...(data.variants || []), { label: '', price: '', compare_price: '', stock: '', image_urls: [] }] })} className="flex items-center gap-1.5 font-inter text-xs text-forest-canopy hover:text-forest-canopy/80 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add Variant
        </button>
      </div>
    </div>
  );
}

function MediaTab({ data, onChange, onOpenPicker, onOpenMultiPicker }) {
  const f = (key) => (val) => onChange({ ...data, [key]: val });
  const hoverMediaText = Array.isArray(data.hover_media) ? data.hover_media.join('\n') : '';
  return (
    <div className="space-y-5">
      <ImageUploadField
        label="Hero Image"
        value={data.hero_image}
        onChange={f('hero_image')}
        aspectClass="aspect-video"
      />
      <div>
        <label className="font-inter text-xs text-rain-cloud/55 block mb-1">Hero Video URL</label>
        <input
          value={data.hero_video || ''}
          onChange={e => f('hero_video')(e.target.value)}
          placeholder="https://… (cinematic loop video)"
          className="w-full border border-border rounded-xl px-4 py-2.5 font-inter text-sm text-rain-cloud focus:outline-none focus:border-forest-canopy"
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="font-inter text-xs text-rain-cloud/55">Gallery Images</label>
          <button type="button" onClick={onOpenMultiPicker} className="flex items-center gap-1 font-inter text-xs text-forest-canopy hover:text-forest-canopy/80">
            <Images className="w-3.5 h-3.5" /> Pick from Library
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {(data.images || []).map((url, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden group">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onChange({ ...data, images: (data.images || []).filter((_, j) => j !== i) })}
                className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={onOpenMultiPicker}
            className="aspect-square rounded-xl border-2 border-dashed border-border flex items-center justify-center text-rain-cloud/30 hover:border-forest-canopy hover:text-forest-canopy transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        <p className="mt-1.5 font-inter text-[10px] text-rain-cloud/35">Additional product images shown in gallery carousel.</p>
      </div>
      <div>
        <label className="font-inter text-xs text-rain-cloud/55 block mb-1">Hover Media URLs</label>
        <textarea
          value={hoverMediaText}
          onChange={(e) =>
            onChange({
              ...data,
              hover_media: e.target.value
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean),
            })
          }
          rows={3}
          placeholder="One URL per line. First media is used for premium hover swap."
          className="w-full border border-border rounded-xl px-4 py-2.5 font-inter text-sm text-rain-cloud focus:outline-none focus:border-forest-canopy resize-none"
        />
      </div>
    </div>
  );
}

function StoryTab({ data, onChange }) {
  const f = (key) => (val) => onChange({ ...data, [key]: val });
  return (
    <div className="space-y-4">
      <Textarea label="Short Description" value={data.short_description} onChange={f('short_description')} rows={2} placeholder="One punchy line shown on product cards…" />
      <Textarea label="Story Description" value={data.story_description} onChange={f('story_description')} rows={5} placeholder="Rich narrative describing the product's origin, process, and soul…" />
      <Textarea label="Sourcing Story" value={data.sourcing_story} onChange={f('sourcing_story')} rows={4} placeholder="How this product is sourced, who grows it, the journey from farm to table…" />
    </div>
  );
}

function LinksTab({ data, onChange, journeys, people, regions }) {
  const f = (key) => (val) => onChange({ ...data, [key]: val });
  return (
    <div className="space-y-4">
      <Select label="Linked Journey" value={data.journey_id} onChange={f('journey_id')} options={journeys.map(j => ({ value: j.id, label: j.title }))} placeholder="— No journey —" />
      <Select label="Linked Person (Farmer/Artisan)" value={data.person_id} onChange={f('person_id')} options={people.map(p => ({ value: p.id, label: `${p.name} — ${p.role}` }))} placeholder="— No person —" />
      <Select label="Linked Region" value={data.region_id} onChange={f('region_id')} options={regions.map(r => ({ value: r.id, label: `${r.name}${r.state ? `, ${r.state}` : ''}` }))} placeholder="— No region —" />
    </div>
  );
}

function SEOTab({ data, onChange }) {
  const f = (key) => (val) => onChange({ ...data, [key]: val });
  const seoPreview = buildProductSeoMeta(data);
  return (
    <div className="space-y-4">
      <Input label="SEO Title" value={data.seo_title} onChange={f('seo_title')} placeholder="Page title for search engines" />
      <Textarea label="SEO Description" value={data.seo_description} onChange={f('seo_description')} rows={3} placeholder="160-character summary for search results…" />
      {data.seo_description && (
        <p className={`font-inter text-[10px] ${data.seo_description.length > 160 ? 'text-red-400' : 'text-rain-cloud/35'}`}>
          {data.seo_description.length}/160 characters
        </p>
      )}
      <Textarea label="SEO Keywords" value={data.seo_keywords} onChange={f('seo_keywords')} rows={2} placeholder="raw honey, Yasvik honey, natural groceries India" />
      <div className="rounded-2xl border border-border bg-rain-mist/35 p-4">
        <p className="font-inter text-[10px] font-bold uppercase tracking-[0.18em] text-rain-cloud/40">Image SEO Preview</p>
        <div className="mt-3 space-y-2 font-inter text-xs text-rain-cloud/65">
          <p><span className="font-semibold text-rain-cloud/80">Recommended filename:</span> {seoPreview.recommendedFileName}</p>
          <p><span className="font-semibold text-rain-cloud/80">Alt text:</span> {seoPreview.imageAlt}</p>
          <p><span className="font-semibold text-rain-cloud/80">Resolved title:</span> {seoPreview.title}</p>
          <p><span className="font-semibold text-rain-cloud/80">Resolved description:</span> {seoPreview.description}</p>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN DRAWER ─────────────────────────────────────────────────────────────

export default function ProductFormDrawer({ open, onClose, data, onChange, onSave, isSaving, isEditing }) {
  const [activeTab, setActiveTab] = useState('basic');
  const [pickerTarget, setPickerTarget] = useState(null); // key name for single pick
  const [multiPicker, setMultiPicker] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories-all'],
    queryFn: () => appClient.entities.Category.filter({ is_active: true }, 'sort_order', 20),
    enabled: open,
  });
  const { data: journeys = [] } = useQuery({
    queryKey: ['journeys-published'],
    queryFn: () => appClient.entities.Journey.filter({ is_published: true }, 'sort_order', 50),
    enabled: open,
  });
  const { data: people = [] } = useQuery({
    queryKey: ['people-published'],
    queryFn: () => appClient.entities.Person.filter({ is_published: true }, '-created_date', 50),
    enabled: open,
  });
  const { data: regions = [] } = useQuery({
    queryKey: ['regions-all'],
    queryFn: () => appClient.entities.Region.list('name', 50),
    enabled: open,
  });

  const handleSinglePick = (url) => {
    if (pickerTarget) onChange({ ...data, [pickerTarget]: url });
    setPickerTarget(null);
  };
  const handleMultiPick = (urls) => {
    const current = data.images || [];
    const merged = [...new Set([...current, ...urls])];
    onChange({ ...data, images: merged });
    setMultiPicker(false);
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-end lg:items-stretch justify-end">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-rain-cloud/40 backdrop-blur-sm"
              onClick={onClose}
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="relative bg-white w-full max-w-2xl h-full max-h-[95vh] lg:max-h-full rounded-t-3xl lg:rounded-none overflow-hidden flex flex-col z-10 shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-border flex-shrink-0">
                <div>
                  <h2 className="font-cormorant text-2xl text-rain-cloud font-medium">
                    {isEditing ? 'Edit Product' : 'New Product'}
                  </h2>
                  {data.title && <p className="font-inter text-xs text-rain-cloud/40 mt-0.5">{data.title}</p>}
                </div>
                <button onClick={onClose} className="text-rain-cloud/35 hover:text-rain-cloud/70 transition-colors p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-border flex-shrink-0 overflow-x-auto hide-scrollbar">
                {TABS.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-1.5 px-4 py-3 font-inter text-xs whitespace-nowrap border-b-2 transition-all ${
                        activeTab === tab.id
                          ? 'border-wet-earth text-wet-earth'
                          : 'border-transparent text-rain-cloud/45 hover:text-rain-cloud/70'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-6 py-5">
                {activeTab === 'basic' && <BasicTab data={data} onChange={onChange} categories={categories} />}
                {activeTab === 'pricing' && <PricingTab data={data} onChange={onChange} />}
                {activeTab === 'media' && (
                  <MediaTab
                    data={data}
                    onChange={onChange}
                    onOpenPicker={(key) => setPickerTarget(key)}
                    onOpenMultiPicker={() => setMultiPicker(true)}
                  />
                )}
                {activeTab === 'story' && <StoryTab data={data} onChange={onChange} />}
                {activeTab === 'links' && <LinksTab data={data} onChange={onChange} journeys={journeys} people={people} regions={regions} />}
                {activeTab === 'seo' && <SEOTab data={data} onChange={onChange} />}
              </div>

              {/* Footer */}
              <div className="flex gap-3 px-6 py-4 border-t border-border flex-shrink-0 bg-white">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-full border border-border font-inter text-sm text-rain-cloud/60 hover:bg-muted/50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={onSave}
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-full bg-wet-earth text-white font-inter text-sm disabled:opacity-50 hover:bg-wet-earth/90 transition-all"
                >
                  {isSaving ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Single media picker */}
      <MediaPickerModal
        open={!!pickerTarget}
        onClose={() => setPickerTarget(null)}
        onSelect={handleSinglePick}
        multi={false}
      />

      {/* Multi-image picker */}
      <MediaPickerModal
        open={multiPicker}
        onClose={() => setMultiPicker(false)}
        onSelect={handleMultiPick}
        multi={true}
      />
    </>
  );
}
