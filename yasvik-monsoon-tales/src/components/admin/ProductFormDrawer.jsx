import { useState, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { appClient } from '@/api/appClient';
import MediaPickerModal from './MediaPickerModal';
import {
  X, Plus, Trash2, Images, Link2, Package,
  DollarSign, BookOpen, Globe, Loader2
} from 'lucide-react';
import ImageUploadField from './ImageUploadField';
import {
  compareFromInflate,
  comparePerKgFromInflate,
  variantComparePrice,
  variantSellingPrice,
} from '@/lib/productPricingUtils';
import { buildProductSeoMeta } from '@/lib/productSeo';
import { suggestProductSku, collectExistingProductSkus } from '@/lib/productSku';
import { STOCK_MEASURE_TYPE_OPTIONS } from '@/lib/stockMeasureTypes';
import { getStockInputMeta } from '@/lib/stockMeasureTypes';
import { resolveProductMeasureType } from '@/lib/productStockUtils';
import { slugifyMediaName } from '@/lib/mediaSeoNaming';

const TABS = [
  { id: 'basic', label: 'Basic Info', icon: Package },
  { id: 'pricing', label: 'Pricing & Stock', icon: DollarSign },
  { id: 'media', label: 'Media', icon: Images },
  { id: 'story', label: 'Storytelling', icon: BookOpen },
  { id: 'links', label: 'Links', icon: Link2 },
  { id: 'seo', label: 'SEO', icon: Globe },
];

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return trimmed.split('\n').map((line) => line.trim()).filter(Boolean);
    }
  }
  return [];
}

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

function Select({ label, value, onChange, options, placeholder = '— Select —', hint }) {
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
      {hint ? <p className="mt-1 font-inter text-[10px] text-rain-cloud/40">{hint}</p> : null}
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
  const safeValues = asArray(values).filter((value) => typeof value === 'string' && value.trim());
  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !safeValues.includes(trimmed)) onChange([...safeValues, trimmed]);
    setInput('');
  };
  return (
    <div>
      <label className="font-inter text-xs text-rain-cloud/55 block mb-1">{label}</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {safeValues.map(v => (
          <span key={v} className="inline-flex items-center gap-1 px-2.5 py-1 bg-muted rounded-full font-inter text-xs text-rain-cloud/70">
            {v}
            <button type="button" onClick={() => onChange(safeValues.filter(t => t !== v))} className="text-rain-cloud/35 hover:text-rain-cloud">
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

function VariantImagesField({ values = [], onChange, seoName = '', variantLabel = '' }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef();
  const safeValues = asArray(values).filter(Boolean);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await appClient.integrations.Core.UploadFile({
      file,
      folder: 'products',
      seoName,
      assetRole: slugifyMediaName(variantLabel) || `variant-${safeValues.length + 1}`,
      entityTitle: seoName,
    });
    onChange([...safeValues, file_url]);
    setUploading(false);
    e.target.value = '';
  };

  return (
    <div>
      <label className="font-inter text-xs text-rain-cloud/55 block mb-2">Variant Images</label>
      <div className="grid grid-cols-4 gap-2 mb-2">
        {safeValues.map((url, i) => (
          <div key={i} className="relative group aspect-square rounded-lg overflow-hidden">
            <img src={url} alt={`variant-${i}`} className="w-full h-full object-cover border border-border" />
            <button
              type="button"
              onClick={() => onChange(safeValues.filter((_, j) => j !== i))}
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

function DuplicateQuickTab({ data, onChange, categories }) {
  const f = (key) => (val) => onChange({ ...data, [key]: val });
  const variants = asArray(data.variants).filter((variant) => variant && typeof variant === 'object');

  const updateVariantPrice = (index, value) => {
    const next = [...variants];
    next[index] = { ...next[index], price: value };
    onChange({ ...data, variants: next });
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 px-4 py-3">
        <p className="font-inter text-sm text-rain-cloud/80">
          Quick duplicate — change the name and price. Slug, SKU, SEO and other details are copied from the source product and set automatically on save.
        </p>
      </div>

      <Input label="Product name *" value={data.title} onChange={f('title')} placeholder="e.g. Homemade Chilli Powder" />
      <Input label="Telugu name (optional)" value={data.local_name} onChange={f('local_name')} placeholder="ఉదా. కారం పొడి" />
      <Select
        label="Category"
        value={data.category_id}
        onChange={f('category_id')}
        options={categories.map((c) => ({ value: c.id, label: c.emotional_title || c.name }))}
      />

      <div className="rounded-2xl border border-border/60 bg-white p-5 space-y-4">
        <h4 className="font-inter text-sm font-medium text-rain-cloud/80">Price</h4>
        <div>
          <label className="font-inter text-xs text-rain-cloud/55 block mb-2 uppercase tracking-wider">Selling price (₹) *</label>
          <input
            type="number"
            value={data.price || ''}
            onChange={(e) => f('price')(e.target.value)}
            placeholder="0"
            className="w-full text-3xl font-cormorant font-medium text-rain-cloud border-b-2 border-wet-earth/50 bg-transparent focus:outline-none focus:border-wet-earth pb-2"
          />
        </div>

        {variants.length > 0 ? (
          <div className="space-y-3 border-t border-border/50 pt-4">
            <p className="font-inter text-xs text-rain-cloud/55">Pack prices (optional — leave as copied or adjust)</p>
            {variants.map((variant, index) => (
              <div key={`${variant.label || 'pack'}-${index}`} className="flex items-center gap-3">
                <span className="min-w-[72px] font-inter text-sm text-rain-cloud/70">{variant.label || `Pack ${index + 1}`}</span>
                <input
                  type="number"
                  value={variant.price ?? ''}
                  onChange={(e) => updateVariantPrice(index, e.target.value)}
                  placeholder="₹"
                  className="flex-1 rounded-xl border border-border px-3 py-2 font-inter text-sm text-rain-cloud focus:border-forest-canopy focus:outline-none"
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <Input label="Stock quantity" value={data.stock} onChange={f('stock')} type="number" placeholder="0" />
      <Toggle label="Published" checked={!!data.is_published} onChange={f('is_published')} hint="Show on shop and in price labels" />
    </div>
  );
}

function BasicTab({ data, onChange, categories, existingSkus }) {
  const f = (key) => (val) => onChange({ ...data, [key]: val });
  const generateSku = () => {
    const sku = suggestProductSku(data.title || data.name, existingSkus);
    onChange({ ...data, sku });
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Input label="Title *" value={data.title} onChange={f('title')} placeholder="e.g. Kurmagram Aged Red Rice" />
        </div>
        <Input label="Product Code" value={data.product_code} onChange={f('product_code')} placeholder="e.g. YAS-PUL-001" />
        <Input label="Slug" value={data.slug} onChange={f('slug')} placeholder="e.g. kurmagram-red-rice" hint="Auto-generated from title if blank" />
        <Input label="Telugu name (తెలుగు)" value={data.local_name} onChange={f('local_name')} placeholder="ఉదా. ఉప్మా రవ్వ · బొంబాయి రవ్వ" />
        <div>
          <label className="font-inter text-xs text-rain-cloud/55 block mb-1">SKU (counter barcode)</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={data.sku || ''}
              onChange={(e) => onChange({ ...data, sku: e.target.value })}
              placeholder="e.g. TOOR-DAL"
              className="flex-1 border border-border rounded-xl px-4 py-2.5 font-inter text-sm text-rain-cloud focus:outline-none focus:border-forest-canopy transition-colors bg-white"
            />
            <button
              type="button"
              onClick={generateSku}
              className="shrink-0 rounded-xl border border-border px-3 py-2.5 font-inter text-xs font-medium text-forest-canopy hover:bg-forest-canopy/5 transition-colors"
            >
              Generate
            </button>
          </div>
          <p className="mt-1 font-inter text-[10px] text-rain-cloud/35">One SKU per product — printed on shelf labels for USB scanner</p>
        </div>
      </div>
      <Select
        label="Measure type"
        value={data.stock_measure_type || 'kg'}
        onChange={f('stock_measure_type')}
        options={STOCK_MEASURE_TYPE_OPTIONS.map((t) => ({ value: t.id, label: t.label }))}
        hint={STOCK_MEASURE_TYPE_OPTIONS.find((t) => t.id === (data.stock_measure_type || 'kg'))?.hint}
      />
      <Select
        label="Category"
        value={data.category_id}
        onChange={f('category_id')}
          options={categories.map(c => ({ value: c.id, label: c.emotional_title || c.name }))}
      />
      <Input label="Processing Method" value={data.processing_method} onChange={f('processing_method')} placeholder="e.g. Whole pulse, wood pressed, hand pounded" />
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
      <TagInput
        label="Quality Badges"
        values={data.purity_badges || []}
        onChange={f('purity_badges')}
      />
      <div className="space-y-3 pt-2 border-t border-border/50">
        <Toggle label="Published" checked={!!data.is_published} onChange={f('is_published')} hint="Make this product visible to customers" />
        <Toggle label="Featured" checked={!!data.is_featured} onChange={f('is_featured')} />
        <Toggle label="⭐ Homepage featured carousel" checked={!!data.featured_in_hero} onChange={f('featured_in_hero')} hint="Shows in the homepage featured carousel (up to 6). Use Short Description for the pitch line and Quality Badges for the label." />
      </div>
      <div className="grid grid-cols-1 gap-4 border-t border-border/50 pt-4 md:grid-cols-3">
        <Input
          label="Sort order"
          value={data.sort_order ?? 0}
          onChange={f('sort_order')}
          type="number"
          placeholder="0"
          hint="Order within a group (lower = first)"
        />
        <Input
          label="Group name"
          value={data.product_group || ''}
          onChange={f('product_group')}
          placeholder="e.g. Oils, Ghee, Rice, Millets"
          hint="Optional label to cluster products in a category"
        />
        <Input
          label="Group order"
          value={data.group_sort_order ?? 0}
          onChange={f('group_sort_order')}
          type="number"
          placeholder="0"
          hint="Order of this group in the category (lower = first). Use the same number for all products in a group."
        />
      </div>
    </div>
  );
}

function PricingTab({ data, onChange }) {
  const f = (key) => (val) => onChange({ ...data, [key]: val });
  const price = parseFloat(data.price) || 0;
  const inflate = parseFloat(data.price_inflate_percent) || 0;
  const variants = asArray(data.variants).filter((variant) => variant && typeof variant === 'object');
  const usesPerKg = Boolean(String(data.selling_price_per_kg || '').trim());
  const sellPerKg = parseFloat(data.selling_price_per_kg) || 0;
  const comparePreview = usesPerKg
    ? comparePerKgFromInflate(sellPerKg, inflate)
    : compareFromInflate(price, inflate);
  const smallPackMargin = parseFloat(data.small_pack_margin_rs) || 0;
  const measureType = data.stock_measure_type || resolveProductMeasureType({ quick_variants: variants });
  const stockInputMeta = getStockInputMeta(measureType);

  return (
    <div className="space-y-6">
      <div className="bg-rain-mist/40 rounded-2xl p-5 border border-temple-stone/20 space-y-4">
        <h4 className="font-inter text-sm font-medium text-rain-cloud/80">Selling price</h4>
        <p className="font-inter text-[11px] text-rain-cloud/45">
          This is the shop price for the default pack. Only use ₹/kg below when you want pack prices calculated automatically.
        </p>
        <div>
          <label className="font-inter text-xs text-rain-cloud/55 block mb-2 uppercase tracking-wider">Selling Price (₹) *</label>
          <input
            type="number"
            value={data.price || ''}
            onChange={(e) => onChange({ ...data, price: e.target.value, selling_price_per_kg: '' })}
            placeholder="0"
            className="w-full text-3xl font-cormorant font-medium text-rain-cloud border-b-2 border-wet-earth/50 bg-transparent focus:outline-none focus:border-wet-earth pb-2"
          />
        </div>
      </div>

      {!usesPerKg ? (
        <div className="rounded-2xl border border-border/60 bg-white p-5 space-y-4">
          <div>
            <h4 className="font-inter text-sm font-medium text-rain-cloud/80">Optional: show MRP / compare</h4>
            <p className="mt-1 font-inter text-[11px] text-rain-cloud/45">
              Inflate % on this pack price. Leave blank for no strikethrough on shop.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Inflate % (optional)" value={data.price_inflate_percent} onChange={f('price_inflate_percent')} type="number" placeholder="e.g. 10 or 30" />
            <div className="flex flex-col justify-end pb-1">
              {comparePreview ? (
                <p className="font-inter text-sm text-rain-cloud/70">
                  Compare will show as{' '}
                  <span className="font-semibold line-through text-rain-cloud/50">₹{comparePreview}</span>
                  {price ? (
                    <span className="text-rain-cloud/45"> · {Math.round(((comparePreview - price) / comparePreview) * 100)}% off</span>
                  ) : null}
                </p>
              ) : (
                <p className="font-inter text-xs text-rain-cloud/40">No compare price on shop</p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-border/60 bg-white p-5 space-y-4">
        <div>
          <h4 className="font-inter text-sm font-medium text-rain-cloud/80">Multi-pack pricing (optional)</h4>
          <p className="mt-1 font-inter text-[11px] text-rain-cloud/45">
            Set ₹/kg and pack kg on each variant. Inflate % applies to the kg rate — that becomes compare/MRP for discount on shop.
            Add small-pack margin (₹5–10) for packs under 1kg if needed.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <Input label="Selling (₹/kg)" value={data.selling_price_per_kg} onChange={f('selling_price_per_kg')} type="number" placeholder="e.g. 80" />
          <Input label="Inflate % on kg rate" value={data.price_inflate_percent} onChange={f('price_inflate_percent')} type="number" placeholder="e.g. 10 or 30" />
          <Input label="Small-pack margin (₹)" value={data.small_pack_margin_rs} onChange={f('small_pack_margin_rs')} type="number" placeholder="e.g. 5 or 10" hint="Added to packs under 1kg" />
        </div>
        {usesPerKg && comparePreview ? (
          <p className="font-inter text-sm text-rain-cloud/70">
            Compare rate:{' '}
            <span className="font-semibold line-through text-rain-cloud/50">₹{comparePreview}/kg</span>
            {sellPerKg ? (
              <span className="text-rain-cloud/45"> · {Math.round(((comparePreview - sellPerKg) / comparePreview) * 100)}% off vs sell rate</span>
            ) : null}
          </p>
        ) : usesPerKg ? (
          <p className="font-inter text-xs text-rain-cloud/40">No compare price on shop</p>
        ) : null}
      </div>

      <div className="border-t border-border/50 pt-4 space-y-4">
        <h4 className="font-inter text-sm font-medium text-rain-cloud/70">Inventory</h4>
        <Input label={stockInputMeta.label} value={data.stock} onChange={f('stock')} type="number" placeholder="0" hint={stockInputMeta.hint} />
      </div>
      <div className="border-t border-border/50 pt-4 space-y-3">
        <h4 className="font-inter text-sm font-medium text-rain-cloud/70">Variants (optional)</h4>
        {variants.map((v, i) => {
          const updateVariant = (field, value) => {
            const nv = [...variants];
            nv[i] = { ...nv[i], [field]: value };
            onChange({ ...data, variants: nv });
          };
          const packKg = v.pack_kg;
          const packPreviewSell = usesPerKg
            ? variantSellingPrice(data.selling_price_per_kg, packKg, smallPackMargin)
            : parseFloat(v.price) || null;
          const packPreviewCompare = usesPerKg
            ? variantComparePrice(data.selling_price_per_kg, packKg, inflate, smallPackMargin)
            : compareFromInflate(packPreviewSell, inflate);

          return (
            <div key={i} className="border border-border/50 rounded-xl p-4 space-y-3">
              <div className="flex gap-2 items-center justify-between">
                <input value={v.label || ''} onChange={e => updateVariant('label', e.target.value)} placeholder="Variant label (e.g. 500g, 1kg)" className="flex-1 border border-border rounded-xl px-3 py-2 font-inter text-sm text-rain-cloud focus:outline-none focus:border-forest-canopy" />
                <button type="button" onClick={() => onChange({ ...data, variants: variants.filter((_, j) => j !== i) })} className="p-2 text-rain-cloud/30 hover:text-red-400 transition-colors flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {packPreviewSell ? (
                <p className="font-inter text-xs text-rain-cloud/60">
                  Sell ₹{packPreviewSell}
                  {packPreviewCompare ? (
                    <span className="text-rain-cloud/45"> · Compare ₹{packPreviewCompare}</span>
                  ) : null}
                  {usesPerKg && smallPackMargin > 0 && parseFloat(packKg) < 1 ? (
                    <span className="text-rain-cloud/40"> (incl. ₹{smallPackMargin} small-pack margin)</span>
                  ) : null}
                </p>
              ) : null}
              <div className={`grid gap-3 ${usesPerKg ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-5'}`}>
                <div>
                  <label className="font-inter text-[10px] text-rain-cloud/55 block mb-1 uppercase tracking-wider">SKU</label>
                  <input value={v.sku || ''} onChange={e => updateVariant('sku', e.target.value)} placeholder="SKU" className="w-full text-sm font-inter font-medium text-rain-cloud border-b-2 border-temple-stone/30 bg-transparent focus:outline-none focus:border-temple-stone" />
                </div>
                <div>
                  <label className="font-inter text-[10px] text-rain-cloud/55 block mb-1 uppercase tracking-wider">Pack kg</label>
                  <input value={v.pack_kg || ''} onChange={e => updateVariant('pack_kg', e.target.value)} type="number" step="0.001" placeholder="0.5" className="w-full text-lg font-cormorant font-medium text-rain-cloud border-b-2 border-temple-stone/30 bg-transparent focus:outline-none focus:border-temple-stone" />
                </div>
                {!usesPerKg ? (
                  <div>
                    <label className="font-inter text-[10px] text-rain-cloud/55 block mb-1 uppercase tracking-wider">Price (₹)</label>
                    <input value={v.price || ''} onChange={e => updateVariant('price', e.target.value)} type="number" placeholder="0" className="w-full text-lg font-cormorant font-medium text-rain-cloud border-b-2 border-wet-earth/50 bg-transparent focus:outline-none focus:border-wet-earth" />
                  </div>
                ) : null}
                <div>
                  <label className="font-inter text-[10px] text-rain-cloud/55 block mb-1 uppercase tracking-wider">Stock</label>
                  <input value={v.stock || ''} onChange={e => updateVariant('stock', e.target.value)} type="number" placeholder="0" className="w-full text-lg font-cormorant font-medium text-rain-cloud border-b-2 border-forest-canopy/50 bg-transparent focus:outline-none focus:border-forest-canopy" />
                </div>
              </div>
              <VariantImagesField
                values={v.image_urls || []}
                onChange={urls => updateVariant('image_urls', urls)}
                seoName={data.slug || data.title}
                variantLabel={v.label || `variant-${index + 1}`}
              />
            </div>
          );
        })}
        <button type="button" onClick={() => onChange({ ...data, variants: [...variants, { label: '', sku: '', pack_kg: '', price: '', stock: '', image_urls: [] }] })} className="flex items-center gap-1.5 font-inter text-xs text-forest-canopy hover:text-forest-canopy/80 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add Variant
        </button>
      </div>
    </div>
  );
}

function MediaTab({ data, onChange, onOpenPicker, onOpenMultiPicker }) {
  const f = (key) => (val) => onChange({ ...data, [key]: val });
  const hoverMediaText = Array.isArray(data.hover_media) ? data.hover_media.join('\n') : '';
  const images = asArray(data.images).filter(Boolean);

  const handleHeroChange = (url) => {
    const hero = String(url || '').trim();
    const withoutOldHero = images.filter((item) => item !== data.hero_image);
    const nextImages = hero ? [hero, ...withoutOldHero.filter((item) => item !== hero)] : withoutOldHero;
    onChange({ ...data, hero_image: url, images: nextImages });
  };

  return (
    <div className="space-y-5">
      <ImageUploadField
        label="Hero Image"
        value={data.hero_image}
        onChange={handleHeroChange}
        aspectClass="aspect-video"
        folder="products"
        entityId={data.id}
        seoName={data.slug || data.title}
        assetRole="hero"
        entityTitle={data.title}
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
          {images.map((url, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden group">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onChange({ ...data, images: images.filter((_, j) => j !== i) })}
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
      <Textarea label="Product Description" value={data.story_description} onChange={f('story_description')} rows={6} placeholder="Customer-facing description. Do not add internal strategy notes or unverified claims." />
      <Textarea label="Best For" value={data.best_for} onChange={f('best_for')} rows={2} placeholder="e.g. Pesarattu, sprouts, curries and light family meals." />
      <Textarea label="Storage Note" value={data.storage_note} onChange={f('storage_note')} rows={2} placeholder="e.g. Store airtight in a cool, dry place." />
      <Textarea label="Yasvik Mark" value={data.yasvik_mark} onChange={f('yasvik_mark')} rows={2} placeholder="Short brand cue shown on product page." />
      <div className="grid gap-4 md:grid-cols-3">
        <Textarea label="Delivery Card" value={data.delivery_card} onChange={f('delivery_card')} rows={3} placeholder="Packed after order" />
        <Textarea label="Pack Info Card" value={data.pack_info_card} onChange={f('pack_info_card')} rows={3} placeholder="Clean packing in useful sizes" />
        <Textarea label="Sourcing Card" value={data.sourcing_card} onChange={f('sourcing_card')} rows={3} placeholder="Carefully selected vendor-sourced stock" />
      </div>
      <Textarea label="Recipe Titles" value={data.recipe_titles} onChange={f('recipe_titles')} rows={2} placeholder="Internal/reference recipe titles from upload sheet." />
    </div>
  );
}

function LinksTab({ data, onChange, journeys, people }) {
  const f = (key) => (val) => onChange({ ...data, [key]: val });
  return (
    <div className="space-y-4">
      <Select label="Linked Journey" value={data.journey_id} onChange={f('journey_id')} options={journeys.map(j => ({ value: j.id, label: j.title }))} placeholder="— No journey —" />
      <Select label="Linked Person (Farmer/Artisan)" value={data.person_id} onChange={f('person_id')} options={people.map(p => ({ value: p.id, label: `${p.name} — ${p.role}` }))} placeholder="— No person —" />
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

export default function ProductFormDrawer({ open, onClose, data, onChange, onSave, isSaving, isEditing, isDuplicating = false }) {
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
  const { data: allProducts = [] } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => appClient.entities.Product.list('-created_date', 500),
    enabled: open,
  });
  const existingSkus = useMemo(() => {
    const others = allProducts.filter((p) => p.id !== data?.id);
    return collectExistingProductSkus(others);
  }, [allProducts, data?.id]);

  const handleSinglePick = (url) => {
    if (pickerTarget) onChange({ ...data, [pickerTarget]: url });
    setPickerTarget(null);
  };
  const handleMultiPick = (urls) => {
    const current = asArray(data.images);
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
                    {isEditing ? 'Edit Product' : isDuplicating ? 'Duplicate Product' : 'New Product'}
                  </h2>
                  {isDuplicating && !isEditing && (
                    <p className="font-inter text-[11px] text-amber-700 mt-1">
                      Change name and price — slug, SKU and labels update automatically on save.
                    </p>
                  )}
                  {data.title && <p className="font-inter text-xs text-rain-cloud/40 mt-0.5">{data.title}</p>}
                </div>
                <button onClick={onClose} className="text-rain-cloud/35 hover:text-rain-cloud/70 transition-colors p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs */}
              {!isDuplicating ? (
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
              ) : null}

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-6 py-5">
                {isDuplicating && !isEditing ? (
                  <DuplicateQuickTab data={data} onChange={onChange} categories={categories} />
                ) : (
                <>
                {activeTab === 'basic' && <BasicTab data={data} onChange={onChange} categories={categories} existingSkus={existingSkus} />}
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
                {activeTab === 'links' && <LinksTab data={data} onChange={onChange} journeys={journeys} people={people} />}
                {activeTab === 'seo' && <SEOTab data={data} onChange={onChange} />}
                </>
                )}
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
                  {isSaving ? 'Saving…' : isEditing ? 'Save Changes' : isDuplicating ? 'Save Duplicate' : 'Create Product'}
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
        folder="products"
        seoName={data.slug || data.title}
        assetRole={pickerTarget === 'hero_image' ? 'hero' : 'gallery'}
        entityTitle={data.title}
      />

      {/* Multi-image picker */}
      <MediaPickerModal
        open={multiPicker}
        onClose={() => setMultiPicker(false)}
        onSelect={handleMultiPick}
        multi={true}
        folder="products"
        seoName={data.slug || data.title}
        assetRole="gallery"
        entityTitle={data.title}
      />
    </>
  );
}
