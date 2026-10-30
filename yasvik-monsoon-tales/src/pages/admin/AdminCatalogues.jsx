import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, BookOpen, Download, ExternalLink, FileText, Loader2, Plus, RefreshCw, Save, Sparkles,
} from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { appClient } from '@/api/appClient';

const DESIGN_CARDS = [
  { id: 'classic', label: 'Classic Catalogue', hint: 'Premium grocery · large cards · MRP' },
  { id: 'whatsapp_compact', label: 'WhatsApp Compact', hint: 'Mobile-first · forward-ready' },
  { id: 'premium_magazine', label: 'Premium Magazine', hint: 'Editorial lookbook · large photos' },
  { id: 'festival_specials', label: 'Festival Specials', hint: 'Seasonal merchandising' },
  { id: 'dealer_price_list', label: 'Dealer Price List', hint: 'B2B · gated until pricing exists', dealer: true },
];

const FORMAT_OPTIONS = [
  { id: 'a4_portrait', label: 'A4 Portrait' },
  { id: 'a4_landscape', label: 'A4 Landscape' },
  { id: 'a5_booklet', label: 'A5 Booklet' },
  { id: 'mobile_whatsapp', label: 'Mobile WhatsApp PDF' },
  { id: 'dealer_pdf', label: 'Dealer PDF' },
  { id: 'printable_price_list', label: 'Printable Price List' },
];

const SORT_OPTIONS = [
  ['bestsellers', 'Best sellers / most ordered'],
  ['admin_priority', 'Admin priority'],
  ['newest', 'Newest'],
  ['manual', 'Manual / catalogue priority'],
  ['category_order', 'Category merchandising order'],
  ['homepage_order', 'Homepage order'],
];

const EMPTY = {
  id: null,
  name: '',
  catalogue_type: 'customer',
  template_id: null,
  cover_image_url: '',
  options: {
    design: 'classic',
    format: 'a4_portrait',
    price_mode: 'mrp_and_selling',
    products_per_page: 4,
    sort: 'bestsellers',
    brand_colour: '#1f2a1e',
    cover_image_url: '',
    include_cover: true,
    include_intro: true,
    include_category_heroes: true,
    include_final: true,
    dealer_mode: false,
    dealer_pricing_configured: false,
    content: {
      product_image: true,
      telugu_name: true,
      short_description: true,
      badges: true,
      variant_prices: true,
      mrp: true,
      savings: true,
      qr_code: true,
      stock_status: true,
      category_hero: true,
      page_chrome: true,
    },
  },
  selection: {
    mode: 'all_eligible',
    in_stock_only: false,
    category_ids: [],
    category_slugs: [],
    product_ids: [],
  },
};

async function invoke(name, payload = {}) {
  const { data } = await appClient.functions.invoke(name, payload);
  return data;
}

function typeForDesign(design) {
  if (design === 'whatsapp_compact') return 'whatsapp';
  if (design === 'dealer_price_list') return 'dealer';
  if (design === 'premium_magazine') return 'lookbook';
  return 'customer';
}

export default function AdminCatalogues() {
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [step, setStep] = useState(1);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewStats, setPreviewStats] = useState(null);
  const [previewPages, setPreviewPages] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [dealerGated, setDealerGated] = useState(false);
  const [notice, setNotice] = useState('');

  const listQuery = useQuery({
    queryKey: ['admin-catalogues'],
    queryFn: () => invoke('listCatalogues').then((d) => d.catalogues || []),
  });

  const templatesQuery = useQuery({
    queryKey: ['admin-catalogue-templates'],
    queryFn: () => invoke('listCatalogueTemplates').then((d) => d.templates || []),
  });

  const categoriesQuery = useQuery({
    queryKey: ['admin-catalogue-categories'],
    queryFn: async () => {
      const rows = await appClient.entities.Category.filter({ is_active: true }, 'sort_order', 200);
      return rows || [];
    },
  });

  const designTemplates = useMemo(
    () => (templatesQuery.data || []).filter((t) => [
      'classic-catalogue', 'whatsapp-compact', 'premium-magazine', 'dealer-price-list', 'festival-specials',
    ].includes(t.key)),
    [templatesQuery.data],
  );

  const curatedPresets = useMemo(
    () => (templatesQuery.data || []).filter((t) => String(t.key || '').startsWith('yasvik-')),
    [templatesQuery.data],
  );

  const categoryOptions = useMemo(
    () => (categoriesQuery.data || []).filter((c) => !c.parent_id),
    [categoriesQuery.data],
  );

  const patchOptions = (patch) => setForm((c) => ({ ...c, options: { ...c.options, ...patch } }));
  const patchContent = (key, value) => setForm((c) => ({
    ...c,
    options: { ...c.options, content: { ...c.options.content, [key]: value } },
  }));

  const applyTemplate = (template) => {
    const options = template.default_options || {};
    const design = options.design || 'classic';
    const isDealer = design === 'dealer_price_list' || template.catalogue_type === 'dealer';
    setForm((current) => ({
      ...current,
      template_id: template.id,
      catalogue_type: template.catalogue_type || typeForDesign(design),
      name: current.name || `${template.name} – ${new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })}`,
      cover_image_url: options.cover_image_url || current.cover_image_url || '',
      options: {
        ...EMPTY.options,
        ...options,
        design,
        dealer_mode: isDealer,
        dealer_pricing_configured: false,
        content: { ...EMPTY.options.content, ...(options.content || {}) },
      },
      selection: {
        ...EMPTY.selection,
        ...(options.selection || {}),
      },
    }));
    setStep(2);
    setNotice(isDealer
      ? `Loaded ${template.name}. Dealer generation is gated until pricing data exists.`
      : `Loaded template: ${template.name}`);
  };

  const saveMutation = useMutation({
    mutationFn: () => invoke('upsertCatalogue', {
      id: form.id,
      name: form.name,
      catalogue_type: form.catalogue_type,
      template_id: form.template_id,
      cover_image_url: form.cover_image_url || form.options.cover_image_url || null,
      options: {
        ...form.options,
        cover_image_url: form.cover_image_url || form.options.cover_image_url || '',
        selection: form.selection,
      },
      selection: form.selection,
    }),
    onSuccess: (data) => {
      setForm((current) => ({ ...current, id: data.catalogue?.id || current.id, name: data.catalogue?.name || current.name }));
      qc.invalidateQueries({ queryKey: ['admin-catalogues'] });
      setNotice('Catalogue saved.');
    },
  });

  const previewMutation = useMutation({
    mutationFn: () => invoke('previewCatalogue', {
      id: form.id,
      name: form.name || 'Yasvik Catalogue',
      catalogue_type: form.catalogue_type,
      cover_image_url: form.cover_image_url,
      options: { ...form.options, cover_image_url: form.cover_image_url, selection: form.selection },
      selection: form.selection,
    }),
    onSuccess: (data) => {
      setPreviewHtml(data.html || '');
      setPreviewStats(data.stats || null);
      setPreviewPages(data.pages || []);
      setWarnings(data.warnings || []);
      setDealerGated(Boolean(data.dealer_gated));
      setStep(8);
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (form.options.dealer_mode && !form.options.dealer_pricing_configured) {
        throw new Error('Dealer pricing is not configured yet. Dealer catalogues cannot be generated.');
      }
      let catalogueId = form.id;
      if (!catalogueId) {
        const saved = await invoke('upsertCatalogue', {
          name: form.name,
          catalogue_type: form.catalogue_type,
          template_id: form.template_id,
          cover_image_url: form.cover_image_url,
          options: { ...form.options, cover_image_url: form.cover_image_url, selection: form.selection },
          selection: form.selection,
        });
        catalogueId = saved.catalogue?.id;
        setForm((current) => ({ ...current, id: catalogueId }));
      }
      return invoke('generateCataloguePdf', {
        id: catalogueId,
        name: form.name,
        catalogue_type: form.catalogue_type,
        cover_image_url: form.cover_image_url,
        options: { ...form.options, cover_image_url: form.cover_image_url, selection: form.selection },
        selection: form.selection,
      });
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin-catalogues'] });
      setWarnings(data.warnings || []);
      setNotice(data.file_url ? 'PDF generated.' : 'Generation finished.');
      if (data.file_url) window.open(data.file_url, '_blank', 'noopener,noreferrer');
    },
  });

  const publishMutation = useMutation({
    mutationFn: (id) => invoke('publishCatalogue', { id, is_latest_public: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-catalogues'] });
      setNotice('Catalogue published to /catalogue');
    },
  });

  const busy = saveMutation.isPending || previewMutation.isPending || generateMutation.isPending || publishMutation.isPending;
  const error = saveMutation.error || previewMutation.error || generateMutation.error || publishMutation.error;
  const isDealer = form.options.dealer_mode || form.catalogue_type === 'dealer';

  return (
    <div className="min-h-full bg-rain-mist p-5 md:p-8">
      <div className="mx-auto max-w-6xl">
        <AdminPageHeader
          title="Catalogue Publishing"
          description="Reusable multi-template engine — one live product database, premium PDF catalogues."
          action={(
            <button
              type="button"
              onClick={() => {
                setForm(EMPTY); setStep(1); setPreviewHtml(''); setNotice(''); setWarnings([]); setDealerGated(false);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-rain-cloud px-4 py-2.5 font-inter text-xs font-semibold text-white"
            >
              <Plus className="h-4 w-4" />
              New catalogue
            </button>
          )}
        />

        {notice ? (
          <div className="mb-4 rounded-xl border border-neon-paddy/30 bg-neon-paddy/10 px-4 py-3 font-inter text-xs text-deep-forest">{notice}</div>
        ) : null}
        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-inter text-xs text-red-700">{error.message}</div>
        ) : null}

        <div className="mb-8 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-2xl border border-border/60 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-cormorant text-xl font-semibold text-rain-cloud">Publisher</h2>
              <p className="font-inter text-[10px] uppercase tracking-[0.14em] text-rain-cloud/40">Step {step} of 8</p>
            </div>

            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <p className="mb-2 font-inter text-[10px] font-bold uppercase tracking-[0.14em] text-rain-cloud/40">Design templates</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(designTemplates.length ? designTemplates : DESIGN_CARDS.map((d) => ({
                      id: d.id, key: d.id, name: d.label, description: d.hint, catalogue_type: typeForDesign(d.id),
                      default_options: { design: d.id },
                    }))).map((template) => {
                      const design = template.default_options?.design || template.key;
                      const dealer = design === 'dealer_price_list' || template.catalogue_type === 'dealer';
                      return (
                        <button
                          key={template.id || template.key}
                          type="button"
                          onClick={() => applyTemplate(template)}
                          className="rounded-xl border border-border px-4 py-4 text-left hover:border-neon-paddy hover:bg-neon-paddy/5"
                        >
                          <p className="font-inter text-sm font-semibold text-rain-cloud">{template.name}</p>
                          <p className="mt-1 font-inter text-xs text-rain-cloud/50">{template.description}</p>
                          {dealer ? (
                            <p className="mt-2 font-inter text-[10px] font-bold uppercase tracking-wider text-amber-700">Gated</p>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="mb-2 font-inter text-[10px] font-bold uppercase tracking-[0.14em] text-rain-cloud/40">Curated catalogues</p>
                  <div className="space-y-2">
                    {curatedPresets.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => applyTemplate(template)}
                        className="flex w-full items-start gap-3 rounded-xl border border-border px-3 py-3 text-left hover:bg-rain-mist/50"
                      >
                        <Sparkles className="mt-0.5 h-4 w-4 text-neon-paddy" />
                        <span>
                          <span className="block font-inter text-sm font-semibold text-rain-cloud">{template.name}</span>
                          <span className="block font-inter text-xs text-rain-cloud/50">{template.description}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block font-inter text-xs font-semibold text-rain-cloud">Catalogue name</span>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
                    placeholder="Yasvik Complete Catalogue – July 2026"
                    className="w-full rounded-xl border border-border px-3.5 py-3 font-inter text-sm outline-none focus:border-neon-paddy"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block font-inter text-xs font-semibold text-rain-cloud">Cover image URL (optional)</span>
                  <input
                    value={form.cover_image_url}
                    onChange={(e) => setForm((c) => ({ ...c, cover_image_url: e.target.value }))}
                    placeholder="https://media.yasvik.com/..."
                    className="w-full rounded-xl border border-border px-3.5 py-3 font-inter text-sm outline-none focus:border-neon-paddy"
                  />
                </label>
                <button type="button" onClick={() => setStep(3)} disabled={!form.name.trim()} className="rounded-xl bg-rain-cloud px-4 py-2.5 font-inter text-xs font-semibold text-white disabled:opacity-40">
                  Continue
                </button>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <p className="font-inter text-xs text-rain-cloud/55">Product selection</p>
                {[
                  ['all_eligible', 'All eligible public products'],
                  ['hero_categories', 'Homepage / hero categories'],
                  ['featured', 'Featured products'],
                  ['organic', 'Organic products'],
                  ['gifting', 'Gifting-flagged products'],
                  ['selected_categories', 'Selected categories'],
                ].map(([mode, label]) => (
                  <label key={mode} className="flex items-center gap-3 rounded-xl border border-border px-3 py-3">
                    <input
                      type="radio"
                      checked={form.selection.mode === mode}
                      onChange={() => setForm((c) => ({ ...c, selection: { ...c.selection, mode } }))}
                    />
                    <span className="font-inter text-sm text-rain-cloud">{label}</span>
                  </label>
                ))}
                {form.selection.mode === 'selected_categories' ? (
                  <div className="grid max-h-48 gap-2 overflow-y-auto rounded-xl border border-border p-3">
                    {categoryOptions.map((cat) => {
                      const checked = (form.selection.category_ids || []).includes(cat.id);
                      return (
                        <label key={cat.id} className="flex items-center gap-2 font-inter text-xs text-rain-cloud">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setForm((c) => {
                                const ids = new Set(c.selection.category_ids || []);
                                if (ids.has(cat.id)) ids.delete(cat.id);
                                else ids.add(cat.id);
                                return { ...c, selection: { ...c.selection, category_ids: [...ids] } };
                              });
                            }}
                          />
                          {cat.name}
                        </label>
                      );
                    })}
                  </div>
                ) : null}
                <label className="flex items-center gap-2 font-inter text-xs text-rain-cloud">
                  <input
                    type="checkbox"
                    checked={Boolean(form.selection.in_stock_only)}
                    onChange={(e) => setForm((c) => ({ ...c, selection: { ...c.selection, in_stock_only: e.target.checked } }))}
                  />
                  In-stock products only
                </label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setStep(2)} className="rounded-xl px-4 py-2.5 font-inter text-xs font-semibold text-rain-cloud/60">Back</button>
                  <button type="button" onClick={() => setStep(4)} className="rounded-xl bg-rain-cloud px-4 py-2.5 font-inter text-xs font-semibold text-white">Continue</button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <p className="font-inter text-xs text-rain-cloud/55">Format & density</p>
                <label className="block font-inter text-sm text-rain-cloud">
                  Page format
                  <select
                    value={form.options.format}
                    onChange={(e) => patchOptions({ format: e.target.value })}
                    className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2"
                  >
                    {FORMAT_OPTIONS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                  </select>
                </label>
                <label className="block font-inter text-sm text-rain-cloud">
                  Products per page
                  <select
                    value={Math.min(
                      Number(form.options.products_per_page) || 4,
                      form.options.design === 'premium_magazine' ? 2
                        : form.options.design === 'whatsapp_compact' ? 6
                          : form.options.design === 'dealer_price_list' ? 14
                            : 4,
                    )}
                    onChange={(e) => patchOptions({ products_per_page: Number(e.target.value) })}
                    className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2"
                  >
                    {(form.options.design === 'premium_magazine'
                      ? [1, 2]
                      : form.options.design === 'whatsapp_compact'
                        ? [2, 4, 6]
                        : form.options.design === 'dealer_price_list'
                          ? [8, 12, 14]
                          : [1, 2, 4]
                    ).map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <span className="mt-1.5 block text-xs text-rain-cloud/50">
                    Limited to a readable density so product images and pack-wise prices never split across pages.
                  </span>
                </label>
                <label className="block font-inter text-sm text-rain-cloud">
                  Brand colour
                  <input
                    type="color"
                    value={form.options.brand_colour || '#1f2a1e'}
                    onChange={(e) => patchOptions({ brand_colour: e.target.value })}
                    className="mt-2 h-10 w-full rounded-xl border border-border bg-white px-2"
                  />
                </label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setStep(3)} className="rounded-xl px-4 py-2.5 font-inter text-xs font-semibold text-rain-cloud/60">Back</button>
                  <button type="button" onClick={() => setStep(5)} className="rounded-xl bg-rain-cloud px-4 py-2.5 font-inter text-xs font-semibold text-white">Continue</button>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-3">
                <p className="font-inter text-xs text-rain-cloud/55">Pricing & content</p>
                {[
                  ['include_cover', 'Cover page'],
                  ['include_intro', 'About page'],
                  ['include_category_heroes', 'Category hero pages'],
                  ['include_final', 'Contact / thank-you page'],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 font-inter text-sm text-rain-cloud">
                    <input type="checkbox" checked={Boolean(form.options[key])} onChange={(e) => patchOptions({ [key]: e.target.checked })} />
                    {label}
                  </label>
                ))}
                <div className="my-2 border-t border-border/60" />
                {Object.entries({
                  product_image: 'Product images',
                  telugu_name: 'Telugu names',
                  short_description: 'Short descriptions',
                  badges: 'Badges',
                  mrp: 'MRP',
                  savings: 'Discount / savings',
                  qr_code: 'Product QR codes',
                  stock_status: 'Stock status',
                  page_chrome: 'Page footer chrome',
                }).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 font-inter text-sm text-rain-cloud">
                    <input type="checkbox" checked={Boolean(form.options.content?.[key])} onChange={(e) => patchContent(key, e.target.checked)} />
                    {label}
                  </label>
                ))}
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setStep(4)} className="rounded-xl px-4 py-2.5 font-inter text-xs font-semibold text-rain-cloud/60">Back</button>
                  <button type="button" onClick={() => setStep(6)} className="rounded-xl bg-rain-cloud px-4 py-2.5 font-inter text-xs font-semibold text-white">Continue</button>
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="space-y-3">
                <p className="font-inter text-xs text-rain-cloud/55">Product sorting</p>
                {SORT_OPTIONS.map(([sort, label]) => (
                  <label key={sort} className="flex items-center gap-3 rounded-xl border border-border px-3 py-3">
                    <input
                      type="radio"
                      checked={form.options.sort === sort}
                      onChange={() => patchOptions({ sort })}
                    />
                    <span className="font-inter text-sm text-rain-cloud">{label}</span>
                  </label>
                ))}
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setStep(5)} className="rounded-xl px-4 py-2.5 font-inter text-xs font-semibold text-rain-cloud/60">Back</button>
                  <button type="button" onClick={() => setStep(7)} className="rounded-xl bg-rain-cloud px-4 py-2.5 font-inter text-xs font-semibold text-white">Continue</button>
                </div>
              </div>
            )}

            {step === 7 && (
              <div className="space-y-4">
                {isDealer ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 font-inter text-xs text-amber-900">
                    <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-3.5 w-3.5" /> Dealer mode gated</p>
                    <p className="mt-1">Dealer price and MOQ fields are not configured yet. You can preview the gated state, but PDF generation is blocked.</p>
                  </div>
                ) : (
                  <p className="font-inter text-xs text-rain-cloud/55">Customer mode — beautiful catalogue with MRP, savings, branding and QR.</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={busy || !form.name.trim()} onClick={() => saveMutation.mutate()} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 font-inter text-xs font-semibold text-rain-cloud">
                    {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save draft
                  </button>
                  <button type="button" disabled={busy || !form.name.trim()} onClick={() => previewMutation.mutate()} className="inline-flex items-center gap-2 rounded-xl bg-rain-cloud px-4 py-2.5 font-inter text-xs font-semibold text-white">
                    {previewMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BookOpen className="h-3.5 w-3.5" />}
                    Preview
                  </button>
                  <button type="button" onClick={() => setStep(6)} className="rounded-xl px-4 py-2.5 font-inter text-xs font-semibold text-rain-cloud/60">Back</button>
                </div>
              </div>
            )}

            {step === 8 && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-rain-mist px-3 py-3">
                    <p className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/40">Products</p>
                    <p className="font-cormorant text-2xl text-rain-cloud">{previewStats?.product_count ?? '—'}</p>
                  </div>
                  <div className="rounded-xl bg-rain-mist px-3 py-3">
                    <p className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/40">Pages</p>
                    <p className="font-cormorant text-2xl text-rain-cloud">{previewStats?.page_count ?? '—'}</p>
                  </div>
                  <div className="rounded-xl bg-rain-mist px-3 py-3">
                    <p className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/40">Est. size</p>
                    <p className="font-cormorant text-2xl text-rain-cloud">
                      {previewStats?.estimated_bytes ? `${Math.round(previewStats.estimated_bytes / 1024 / 1024)} MB` : '—'}
                    </p>
                  </div>
                </div>

                {previewPages.length ? (
                  <div className="rounded-xl border border-border/70 px-3 py-3">
                    <p className="font-inter text-[10px] font-bold uppercase tracking-wider text-rain-cloud/40">Page plan</p>
                    <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto font-inter text-[11px] text-rain-cloud/70">
                      {previewPages.map((p) => (
                        <li key={`${p.page_number}-${p.type}`}>{p.page_number}. {p.type}{p.category_name ? ` · ${p.category_name}` : ''}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {dealerGated ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 font-inter text-xs text-amber-900">
                    Dealer pricing not configured — generation disabled.
                  </div>
                ) : null}

                {warnings.length ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="font-inter text-xs font-semibold text-amber-900">{warnings.length} data-quality warnings</p>
                    <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto font-inter text-[11px] text-amber-800">
                      {warnings.slice(0, 30).map((w, i) => (
                        <li key={`${w.code}-${w.product_id}-${i}`}>{w.code}: {w.name || w.message}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="font-inter text-xs text-forest-canopy">No critical missing-data warnings.</p>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy || dealerGated || isDealer}
                    onClick={() => generateMutation.mutate()}
                    className="inline-flex items-center gap-2 rounded-xl bg-rain-cloud px-4 py-2.5 font-inter text-xs font-semibold text-white disabled:opacity-40"
                  >
                    {generateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    Generate PDF
                  </button>
                  {form.id && !isDealer ? (
                    <button type="button" disabled={busy} onClick={() => publishMutation.mutate(form.id)} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 font-inter text-xs font-semibold text-rain-cloud">
                      Publish to website
                    </button>
                  ) : null}
                  <button type="button" onClick={() => setStep(7)} className="rounded-xl px-4 py-2.5 font-inter text-xs font-semibold text-rain-cloud/60">Back</button>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border/60 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-cormorant text-xl font-semibold text-rain-cloud">Saved catalogues</h2>
              <button type="button" onClick={() => listQuery.refetch()} className="text-rain-cloud/45 hover:text-rain-cloud">
                <RefreshCw className={`h-4 w-4 ${listQuery.isFetching ? 'animate-spin' : ''}`} />
              </button>
            </div>
            {listQuery.isLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-rain-cloud/40" /></div>
            ) : (
              <div className="space-y-3">
                {(listQuery.data || []).map((item) => (
                  <div key={item.id} className="rounded-xl border border-border/70 px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-inter text-sm font-semibold text-rain-cloud">{item.name}</p>
                        <p className="mt-0.5 font-inter text-[11px] text-rain-cloud/45">
                          {item.catalogue_type} · {item.status}{item.is_public ? ' · public' : ''}
                        </p>
                      </div>
                      <FileText className="h-4 w-4 text-rain-cloud/35" />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          const data = await invoke('getCatalogue', { id: item.id });
                          const cat = data.catalogue;
                          setForm({
                            id: cat.id,
                            name: cat.name,
                            catalogue_type: cat.catalogue_type,
                            template_id: cat.template_id,
                            cover_image_url: cat.cover_image_url || '',
                            options: {
                              ...EMPTY.options,
                              ...(cat.options || {}),
                              content: { ...EMPTY.options.content, ...(cat.options?.content || {}) },
                            },
                            selection: { ...EMPTY.selection, ...(cat.selection || cat.options?.selection || {}) },
                          });
                          setStep(7);
                        }}
                        className="rounded-lg border border-border px-2.5 py-1.5 font-inter text-[11px] font-semibold text-rain-cloud"
                      >
                        Edit
                      </button>
                      {item.status !== 'published' && item.catalogue_type !== 'dealer' ? (
                        <button
                          type="button"
                          onClick={() => publishMutation.mutate(item.id)}
                          className="rounded-lg border border-border px-2.5 py-1.5 font-inter text-[11px] font-semibold text-rain-cloud"
                        >
                          Publish
                        </button>
                      ) : item.is_public ? (
                        <a href="/catalogue" className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 font-inter text-[11px] font-semibold text-rain-cloud">
                          View <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))}
                {!listQuery.data?.length ? (
                  <p className="py-8 text-center font-inter text-xs text-rain-cloud/45">No catalogues yet.</p>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {previewHtml ? (
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-white">
            <div className="border-b border-border/50 px-5 py-3">
              <h2 className="font-cormorant text-xl font-semibold text-rain-cloud">Live preview</h2>
              <p className="font-inter text-xs text-rain-cloud/45">Same HTML used for Browser Run PDF export</p>
            </div>
            <iframe title="Catalogue preview" srcDoc={previewHtml} className="h-[80vh] w-full bg-[#f7f1e8]" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
