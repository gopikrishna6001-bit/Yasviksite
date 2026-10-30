import { useState, useRef, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { appClient } from '@/api/appClient';
import MediaPickerModal from './MediaPickerModal';
import {
  X, Plus, Trash2, Images, Link2, Package,
  DollarSign, BookOpen, Globe, Loader2, Camera, ImagePlus, Gift,
} from 'lucide-react';
import { files as fileService } from '@/services/api';
import ImageUploadField from './ImageUploadField';
import { formatRupee } from '@/lib/pricingStrategy';
import { buildCategorySelectOptions } from '@/lib/categoryTree';
import { isPricingMetaVariant } from '@/lib/productPricingMeta';
import {
  mergeVariantsFromPackList,
  packLabelsFromVariants,
  parsePackSizeList,
} from '@/lib/productVariantUtils';
import { buildProductSeoMeta } from '@/lib/productSeo';
import { suggestProductSku } from '@/lib/productSku';
import { STOCK_MEASURE_TYPE_OPTIONS } from '@/lib/stockMeasureTypes';
import { getStockInputMeta } from '@/lib/stockMeasureTypes';
import { resolveProductMeasureType } from '@/lib/productStockUtils';
import { slugifyMediaName } from '@/lib/mediaSeoNaming';
import ProductBundleEditorTab from './ProductBundleEditorTab';
import { isSellableBundleProduct } from '@/lib/productBundleUtils';

const TABS = [
  { id: 'basic', label: 'Basic Info', icon: Package },
  { id: 'pricing', label: 'Pricing & Stock', icon: DollarSign },
  { id: 'bundle', label: 'Combo Contents', icon: Gift },
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

function Input({ label, value, onChange, type = 'text', placeholder = '', hint, inputMode }) {
  const isNumericEntry = Boolean(inputMode) || type === 'number';
  return (
    <div>
      <label className="font-inter text-xs text-rain-cloud/55 block mb-1">{label}</label>
      <input
        type={type}
        inputMode={inputMode}
        autoComplete={isNumericEntry ? 'off' : undefined}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full border border-border rounded-xl px-4 py-2.5 font-inter text-sm text-rain-cloud focus:outline-none focus:border-forest-canopy transition-colors bg-white${isNumericEntry ? ' admin-number-box' : ''}`}
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
  const libraryInputRef = useRef();
  const cameraInputRef = useRef();
  const safeValues = asArray(values).filter(Boolean);

  const uploadFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await fileService.upload(file, {
        folder: 'products',
        seoName,
        assetRole: slugifyMediaName(variantLabel) || `variant-${safeValues.length + 1}`,
        entityTitle: seoName,
      });
      onChange([...safeValues, file_url]);
    } catch (err) {
      alert(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleFile = async (e) => {
    await uploadFile(e.target.files?.[0]);
    e.target.value = '';
  };

  const addBtnClass =
    'flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border font-inter text-xs font-semibold text-rain-cloud/50 transition-colors hover:border-forest-canopy hover:text-forest-canopy disabled:opacity-50';

  return (
    <div>
      <label className="mb-2 block font-inter text-xs text-rain-cloud/55">Variant Images</label>
      <div className="mb-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {safeValues.map((url, i) => (
          <div key={i} className="group relative aspect-square overflow-hidden rounded-lg">
            <img src={url} alt={`variant-${i}`} className="h-full w-full border border-border object-cover" />
            <button
              type="button"
              onClick={() => onChange(safeValues.filter((_, j) => j !== i))}
              className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white opacity-100 shadow lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
              aria-label="Remove image"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => libraryInputRef.current?.click()}
          disabled={uploading}
          className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-border text-rain-cloud/35 hover:border-forest-canopy hover:text-forest-canopy disabled:opacity-50"
          aria-label="Add image from library"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </button>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={() => cameraInputRef.current?.click()} disabled={uploading} className={addBtnClass}>
          <Camera className="h-4 w-4" /> Take photo
        </button>
        <button type="button" onClick={() => libraryInputRef.current?.click()} disabled={uploading} className={addBtnClass}>
          <ImagePlus className="h-4 w-4" /> Choose photo
        </button>
      </div>
      <input ref={libraryInputRef} type="file" accept="image/*,.heic,.heif" className="hidden" onChange={handleFile} />
      <input ref={cameraInputRef} type="file" accept="image/*,.heic,.heif" capture="environment" className="hidden" onChange={handleFile} />
    </div>
  );
}

// ─── TAB PANELS ──────────────────────────────────────────────────────────────

function DuplicateQuickTab({ data, onChange, categories }) {
  const f = (key) => (val) => onChange({ ...data, [key]: val });

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 px-4 py-3">
        <p className="font-inter text-sm text-rain-cloud/80">
          Quick duplicate — change the name and category. Slug, SKU, SEO and other details are copied from the source product.
          Set prices in <Link to="/admin/pricing" className="text-wet-earth font-medium hover:underline">Pricing Strategy</Link> after saving.
        </p>
      </div>

      <Input label="Product name *" value={data.title} onChange={f('title')} placeholder="e.g. Homemade Chilli Powder" />
      <Input label="Telugu name (optional)" value={data.local_name} onChange={f('local_name')} placeholder="ఉదా. కారం పొడి" />
      <Select
        label="Category"
        value={data.category_id}
        onChange={f('category_id')}
        options={buildCategorySelectOptions(categories)}
      />

      <Input label="Stock quantity" value={data.stock} onChange={f('stock')} type="text" inputMode="decimal" placeholder="0" />
      <Toggle label="Published" checked={!!data.is_published} onChange={f('is_published')} hint="Show on shop and in price labels" />
    </div>
  );
}

function BasicTab({ data, onChange, categories, catalogProducts }) {
  const f = (key) => (val) => onChange({ ...data, [key]: val });
  const generateSku = () => {
    const sku = suggestProductSku('', catalogProducts);
    onChange({ ...data, sku, product_code: data.product_code || sku });
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
              placeholder="e.g. YAS-001"
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
          <p className="mt-1 font-inter text-[10px] text-rain-cloud/35">Short code for shelf barcode — YAS-001, YAS-002, …</p>
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
        options={buildCategorySelectOptions(categories)}
        hint="Pick a subcategory when you split Regular vs Organic (create subcategories under Admin → Categories)."
      />
      <Input label="Processing Method" value={data.processing_method} onChange={f('processing_method')} placeholder="e.g. Whole pulse, wood pressed, hand pounded" />
      <div className="space-y-3 rounded-xl border border-border/50 bg-rain-mist/20 p-4">
        <p className="font-inter text-xs font-semibold uppercase tracking-wider text-rain-cloud/45">Trust & sourcing</p>
        <Select
          label="Source type"
          value={data.source_type || ''}
          onChange={f('source_type')}
          options={[
            { value: '', label: 'Not set' },
            { value: 'direct', label: 'Direct from farmer' },
            { value: 'vendor', label: 'Trusted vendor' },
            { value: 'house_brand', label: 'Yasvik house brand' },
          ]}
        />
        <Input label="Supplier name" value={data.supplier_name || ''} onChange={f('supplier_name')} placeholder="Optional supplier or co-op name" />
        <Input label="Origin state" value={data.origin_state || ''} onChange={f('origin_state')} placeholder="e.g. Telangana, Karnataka" />
        <Input label="Shelf life" value={data.shelf_life_text || ''} onChange={f('shelf_life_text')} placeholder="e.g. Best within 6 months" />
      </div>
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
        <Toggle label="Published" checked={!!data.is_published} onChange={f('is_published')} hint="Active in store catalog, POS, and labels" />
        <Toggle
          label="Sell online (shop & delivery)"
          checked={data.sell_online !== false}
          onChange={f('sell_online')}
          hint="Turn off to keep the item for store/POS only — it stays in the database but won't show on the website or cart."
        />
        <Toggle
          label="⭐ Best Seller (homepage)"
          checked={!!data.is_featured}
          onChange={(val) => onChange({ ...data, is_featured: val, featured_in_hero: val })}
          hint="Shows in the Best Sellers row on the homepage. Tip: use the Best Sellers panel on the Products list to add/remove/reorder several at once."
        />
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
  const variants = asArray(data.variants).filter((variant) => variant && typeof variant === 'object' && !isPricingMetaVariant(variant));
  const packListText = packLabelsFromVariants(variants);
  const measureType = data.stock_measure_type || resolveProductMeasureType({ quick_variants: variants });
  const stockInputMeta = getStockInputMeta(measureType);

  const handlePackListChange = (text) => {
    const tokens = parsePackSizeList(text);
    const merged = mergeVariantsFromPackList(tokens, variants);
    onChange({ ...data, variants: merged });
  };

  const updateVariant = (index, field, value) => {
    const next = [...variants];
    next[index] = { ...next[index], [field]: value };
    onChange({ ...data, variants: next });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-wet-earth/25 bg-wet-earth/5 p-5 space-y-3">
        <h4 className="font-inter text-sm font-medium text-rain-cloud/85">Prices — set in Pricing Strategy</h4>
        <p className="font-inter text-[11px] text-rain-cloud/50 leading-relaxed">
          Online, store, and MRP rates are controlled only in{' '}
          <Link to="/admin/pricing" className="text-wet-earth font-medium hover:underline">Pricing Strategy</Link>.
          Apply there after changing cost or bands — shop, POS, and labels all use the same saved values.
        </p>
        {variants.length > 0 ? (
          <div className="rounded-xl border border-border/50 bg-white overflow-hidden">
            <table className="w-full text-left font-inter text-xs">
              <thead className="bg-rain-mist/40 text-rain-cloud/50 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-3 py-2">Pack</th>
                  <th className="px-3 py-2">Online</th>
                  <th className="px-3 py-2">Store</th>
                  <th className="px-3 py-2">Web MRP</th>
                  <th className="px-3 py-2">Store MRP</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v, i) => (
                  <tr key={v.label || i} className="border-t border-border/30">
                    <td className="px-3 py-2 font-medium text-rain-cloud">{v.label || '—'}</td>
                    <td className="px-3 py-2">{formatRupee(v.price)}</td>
                    <td className="px-3 py-2">{formatRupee(v.store_price)}</td>
                    <td className="px-3 py-2 line-through text-rain-cloud/45">{formatRupee(v.compare_price)}</td>
                    <td className="px-3 py-2 line-through text-rain-cloud/45">{formatRupee(v.store_compare_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="font-inter text-xs text-rain-cloud/40">Add pack sizes below, then set prices in Pricing Strategy.</p>
        )}
      </div>

      <div className="rounded-2xl border border-border/60 bg-white p-5 space-y-3">
        <label className="font-inter text-sm font-medium text-rain-cloud/80 block">Pack sizes</label>
        <p className="font-inter text-[11px] text-rain-cloud/45">
          Enter sizes separated by commas — e.g. <span className="font-medium">1kg, 500g, 250g, 150g, 50g</span>
        </p>
        <input
          value={packListText}
          onChange={(e) => handlePackListChange(e.target.value)}
          placeholder="1kg, 500g, 250g"
          className="w-full rounded-xl border border-border/70 px-4 py-3 font-inter text-sm text-rain-cloud focus:outline-none focus:border-wet-earth/60"
        />
      </div>

      <div className="border-t border-border/50 pt-4 space-y-4">
        <h4 className="font-inter text-sm font-medium text-rain-cloud/70">Inventory</h4>
        {(data.inventory_mode === 'prepacked_stock' || data.product_group === 'packaged_combo') && (
          <div className="rounded-xl border border-amber-700/30 bg-amber-50/80 px-4 py-3 space-y-2">
            <p className="font-inter text-xs text-amber-950/90 leading-relaxed">
              This combo uses independent inventory. Enter only physically packed units.
            </p>
            <p className="font-inter text-[11px] text-amber-900/70 leading-relaxed">
              This product uses prepacked inventory. Component stock will not be deducted automatically.
            </p>
            {/* TODO(future inventory): BOM inventory, made-to-order bundles, component deduction, substitution rules */}
          </div>
        )}
        <Input label={stockInputMeta.label} value={data.stock} onChange={(val) => onChange({ ...data, stock: val })} type="text" inputMode="decimal" placeholder="0" hint={stockInputMeta.hint} />
      </div>

      {variants.length > 0 ? (
        <div className="border-t border-border/50 pt-4 space-y-3">
          <h4 className="font-inter text-sm font-medium text-rain-cloud/70">Per-pack stock &amp; SKU</h4>
          {variants.map((v, i) => (
            <div key={v.label || i} className="grid grid-cols-2 md:grid-cols-3 gap-3 rounded-xl border border-border/40 p-3 bg-rain-mist/20">
              <div className="col-span-2 md:col-span-3 font-inter text-xs font-medium text-rain-cloud/70">{v.label}</div>
              <div>
                <label className="font-inter text-[10px] text-rain-cloud/55 block mb-1 uppercase tracking-wider">SKU</label>
                <input value={v.sku || ''} onChange={(e) => updateVariant(i, 'sku', e.target.value)} placeholder="SKU" className="w-full rounded-lg border border-border/60 px-2 py-1.5 font-inter text-sm" />
              </div>
              <div>
                <label className="font-inter text-[10px] text-rain-cloud/55 block mb-1 uppercase tracking-wider">Stock</label>
                <input value={v.stock || ''} onChange={(e) => updateVariant(i, 'stock', e.target.value)} type="text" inputMode="numeric" placeholder="0" className="admin-number-box w-full rounded-lg border border-border/60 px-2 py-1.5 font-inter text-sm" />
              </div>
              <VariantImagesField
                values={v.image_urls || []}
                onChange={(urls) => updateVariant(i, 'image_urls', urls)}
                seoName={data.slug || data.title}
                variantLabel={v.label || `variant-${i + 1}`}
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MediaTab({ data, onChange, onOpenPicker, onOpenMultiPicker }) {
  const f = (key) => (val) => onChange({ ...data, [key]: val });
  const hoverMediaText = Array.isArray(data.hover_media) ? data.hover_media.join('\n') : '';
  const images = asArray(data.images).filter(Boolean);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const galleryLibraryRef = useRef();
  const galleryCameraRef = useRef();
  const mediaFolder = isSellableBundleProduct(data) ? 'combos' : 'products';

  const handleHeroChange = (url) => {
    const hero = String(url || '').trim();
    const withoutOldHero = images.filter((item) => item !== data.hero_image);
    const nextImages = hero ? [hero, ...withoutOldHero.filter((item) => item !== hero)] : withoutOldHero;
    onChange({ ...data, hero_image: url, images: nextImages });
  };

  const uploadGalleryFile = async (file) => {
    if (!file) return;
    setGalleryUploading(true);
    try {
      const { file_url } = await fileService.upload(file, {
        folder: mediaFolder,
        entityId: data.id,
        seoName: data.slug || data.title,
        assetRole: `gallery-${images.length + 1}`,
        entityTitle: data.title,
      });
      const merged = [...new Set([...images, file_url])];
      onChange({ ...data, images: merged });
    } catch (err) {
      alert(err?.message || 'Gallery upload failed');
    } finally {
      setGalleryUploading(false);
    }
  };

  const handleGalleryFile = async (e) => {
    await uploadGalleryFile(e.target.files?.[0]);
    e.target.value = '';
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-forest-canopy/15 bg-forest-canopy/5 px-4 py-3 lg:hidden">
        <p className="font-inter text-sm font-medium text-rain-cloud">Quick photo upload</p>
        <p className="mt-1 font-inter text-[11px] leading-relaxed text-rain-cloud/55">
          Tap <strong>Take photo</strong> for pack shots straight from your iPhone camera.
        </p>
      </div>

      <ImageUploadField
        label="Hero Image"
        value={data.hero_image}
        onChange={handleHeroChange}
        aspectClass="aspect-square sm:aspect-video"
        accept="image/*"
        folder={mediaFolder}
        entityId={data.id}
        seoName={data.slug || data.title}
        assetRole="hero"
        entityTitle={data.title}
        hideUrlField
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
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <label className="font-inter text-xs text-rain-cloud/55">Gallery Images</label>
          <button type="button" onClick={onOpenMultiPicker} className="flex items-center gap-1 font-inter text-xs text-forest-canopy hover:text-forest-canopy/80">
            <Images className="w-3.5 h-3.5" /> Media library
          </button>
        </div>
        <div className="mb-2 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => galleryCameraRef.current?.click()}
            disabled={galleryUploading}
            className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-forest-canopy/25 bg-forest-canopy/5 px-3 py-3 font-inter text-xs font-semibold text-forest-canopy disabled:opacity-50"
          >
            {galleryUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            Take gallery photo
          </button>
          <button
            type="button"
            onClick={() => galleryLibraryRef.current?.click()}
            disabled={galleryUploading}
            className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-white px-3 py-3 font-inter text-xs font-semibold text-rain-cloud/70 disabled:opacity-50"
          >
            <ImagePlus className="h-4 w-4" /> Add from photos
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((url, i) => (
            <div key={i} className="group relative aspect-square overflow-hidden rounded-xl">
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onChange({ ...data, images: images.filter((_, j) => j !== i) })}
                className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100"
              >
                <X className="h-3.5 w-3.5 text-white" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => galleryCameraRef.current?.click()}
            className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-border text-rain-cloud/30 hover:border-forest-canopy hover:text-forest-canopy"
            aria-label="Add gallery photo"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
        <input ref={galleryLibraryRef} type="file" accept="image/*,.heic,.heif" className="hidden" onChange={handleGalleryFile} />
        <input ref={galleryCameraRef} type="file" accept="image/*,.heic,.heif" capture="environment" className="hidden" onChange={handleGalleryFile} />
        <p className="mt-1.5 font-inter text-[10px] text-rain-cloud/35">Extra photos for the product page carousel.</p>
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
      <Textarea
        label="Primary customer benefit (Hero launch)"
        value={data.primary_customer_benefit || ''}
        onChange={f('primary_customer_benefit')}
        rows={2}
        placeholder="One clear benefit customers care about — used on editorial Hero cards."
      />
      <Textarea label="Product Description" value={data.story_description} onChange={f('story_description')} rows={6} placeholder="Customer-facing description. Do not add internal strategy notes or unverified claims." />
      <Textarea label="Best For" value={data.best_for} onChange={f('best_for')} rows={2} placeholder="e.g. Pesarattu, sprouts, curries and light family meals." />
      <Textarea label="Storage Note" value={data.storage_note} onChange={f('storage_note')} rows={2} placeholder="e.g. Store airtight in a cool, dry place." />
      <Textarea
        label="Ingredients"
        value={data.ingredients}
        onChange={f('ingredients')}
        rows={2}
        placeholder="Required for flavoured / roasted / sweetened products. Confirm before publishing."
      />
      <Textarea
        label="Allergen information"
        value={data.allergen_info}
        onChange={f('allergen_info')}
        rows={2}
        placeholder="e.g. Contains tree nuts (cashew)."
      />
      <Textarea
        label="Natural variation note"
        value={data.natural_variation_note || ''}
        onChange={f('natural_variation_note')}
        rows={2}
        placeholder="Honest note about batch/season colour or texture variation."
      />
      <Toggle
        label="Subject to availability"
        checked={!!data.subject_to_availability}
        onChange={f('subject_to_availability')}
        hint="Shows a storefront badge when stock depends on incoming lots."
      />
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

export default function ProductFormDrawer({
  open,
  onClose,
  data,
  onChange,
  onSave,
  onDelete,
  isSaving,
  isDeleting = false,
  isEditing,
  isDuplicating = false,
  initialTab = 'basic',
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [pickerTarget, setPickerTarget] = useState(null); // key name for single pick
  const [multiPicker, setMultiPicker] = useState(false);

  useEffect(() => {
    if (open) setActiveTab(initialTab || 'basic');
  }, [open, initialTab]);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories-all'],
    queryFn: () => appClient.entities.Category.filter({ is_active: true }, 'sort_order', 200),
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
  const catalogProducts = useMemo(
    () => allProducts.filter((p) => p.id !== data?.id),
    [allProducts, data?.id],
  );

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
                {TABS.filter((tab) => tab.id !== 'bundle' || isSellableBundleProduct(data)).map(tab => {
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
                {activeTab === 'basic' && <BasicTab data={data} onChange={onChange} categories={categories} catalogProducts={catalogProducts} />}
                {activeTab === 'pricing' && <PricingTab data={data} onChange={onChange} />}
                {activeTab === 'bundle' && isSellableBundleProduct(data) && (
                  <ProductBundleEditorTab data={data} onChange={onChange} catalogProducts={catalogProducts} />
                )}
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
                {isEditing && onDelete ? (
                  <button
                    type="button"
                    onClick={onDelete}
                    disabled={isDeleting || isSaving}
                    className="py-2.5 px-4 rounded-full border border-red-200 font-inter text-sm text-red-600 hover:bg-red-50 transition-all disabled:opacity-50"
                  >
                    {isDeleting ? 'Deleting…' : 'Delete'}
                  </button>
                ) : null}
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-full border border-border font-inter text-sm text-rain-cloud/60 hover:bg-muted/50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={onSave}
                  disabled={isSaving || isDeleting}
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
        folder={isSellableBundleProduct(data) ? 'combos' : 'products'}
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
        folder={isSellableBundleProduct(data) ? 'combos' : 'products'}
        seoName={data.slug || data.title}
        assetRole="gallery"
        entityTitle={data.title}
      />
    </>
  );
}
