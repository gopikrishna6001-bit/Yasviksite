import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Save, Loader2, ChevronDown, ChevronUp, Trash2, Image as ImageIcon } from 'lucide-react';
import { appClient } from '@/api/appClient';
import { categories as categoriesApi, products as productsApi } from '@/services/api';
import MediaPickerModal from '@/components/admin/MediaPickerModal';
import { getLatestSettingRecord } from '@/lib/settingsResolver';
import { toast } from '@/components/ui/use-toast';
import {
  fetchAllAppSettings,
  SETTINGS_QUERY_KEYS,
  upsertAppSetting,
} from '@/services/settingsService';
import { DEFAULT_THEME_PRESET_KEY, YASVIK_THEME_PRESETS } from '@/lib/themePresets';

const SETTINGS_SECTIONS = [
  {
    id: 'brand',
    title: 'Brand Identity',
    description: 'Logos, favicon, and brand assets used across the public site.',
    fields: [
      { key: 'brand_logo_horizontal_url', label: 'Header Full Logo', type: 'media', defaultValue: '/brand-logos/horizontal-logo-original.svg' },
      { key: 'brand_logo_wordmark_url', label: 'Wordmark Logo', type: 'media', defaultValue: '/brand-logos/word-mark-logo-original.svg' },
      { key: 'brand_logo_primary_url', label: 'Primary Lockup Logo', type: 'media', defaultValue: '/brand-logos/primary-logo-original.svg' },
      { key: 'brand_logo_symbol_url', label: 'Symbol Logo', type: 'media', defaultValue: '/brand-logos/symbol-original.svg' },
      { key: 'brand_logo_tagline_url', label: 'Tagline Logo', type: 'media', defaultValue: '/brand-logos/tagline-logo-original.svg' },
      { key: 'brand_favicon_url', label: 'Browser Favicon', type: 'media', defaultValue: '/brand-logos/symbol-original.svg' },
      { key: 'brand_organization_logo_url', label: 'SEO Organization Logo', type: 'media', defaultValue: '/brand-logos/horizontal-logo-original.svg' },
      { key: 'brand_logo_header_scale', label: 'Header Logo Scale', type: 'number', defaultValue: 1.12 },
      { key: 'brand_logo_header_width_desktop', label: 'Header Logo Width (Desktop px)', type: 'number', defaultValue: 264 },
      { key: 'brand_logo_header_width_compact', label: 'Header Logo Width (Compact Desktop px)', type: 'number', defaultValue: 242 },
      { key: 'brand_logo_header_width_mobile', label: 'Header Logo Width (Mobile px)', type: 'number', defaultValue: 224 },
    ],
  },
  {
    id: 'theme-colors',
    title: 'Storefront Theme',
    description: 'Switch the public quick-commerce mood from one centralized preset.',
    fields: [
      { key: 'theme_active_preset', label: 'Storefront Theme Preset', type: 'theme-preset', defaultValue: DEFAULT_THEME_PRESET_KEY },
    ],
  },
  {
    id: 'announcement',
    title: 'Announcement Strip',
    description: 'Top marquee strip content and speed.',
    fields: [
      { key: 'announcement_enabled', label: 'Announcement Enabled', type: 'boolean', defaultValue: true },
      {
        key: 'announcement_mode',
        label: 'Announcement Mode',
        type: 'text',
        defaultValue: 'ticker',
        description: 'Use ticker for scrolling messages or promo for a fixed campaign strip with CTA.',
      },
      {
        key: 'announcement_items',
        label: 'Announcement Items',
        type: 'textarea',
        rows: 3,
        defaultValue: 'Sourced by a traveler. Shared like family | From remote hearths to your home | With Yasvik, taste what we lost',
        description: 'Use | separator for multiple messages.',
      },
      { key: 'announcement_speed_seconds', label: 'Scroll Duration (seconds)', type: 'number', defaultValue: 28 },
      { key: 'announcement_cta_label', label: 'Promo CTA Label', type: 'text', defaultValue: '' },
      { key: 'announcement_cta_url', label: 'Promo CTA URL', type: 'text', defaultValue: '' },
    ],
  },
  {
    id: 'hero-campaign',
    title: 'Hero Campaign',
    description: 'Product-led homepage hero media, message, CTA, and product focus card.',
    fields: [
      { key: 'home_hero_headline', label: 'Hero Headline', type: 'text', defaultValue: 'Better choices for everyday living.' },
      {
        key: 'home_hero_subheadline',
        label: 'Hero Subheadline',
        type: 'textarea',
        rows: 3,
        defaultValue: 'From forest floors and village step-irrigation farms to certified clean facilities, Yasvik brings premium FMCG groceries with visible origins.',
      },
      { key: 'home_hero_desktop_media_url', label: 'Hero Media (Desktop)', type: 'media', defaultValue: '' },
      { key: 'home_hero_mobile_media_url', label: 'Hero Media (Mobile Portrait)', type: 'media', defaultValue: '' },
      { key: 'home_hero_product_id', label: 'Hero Product Focus', type: 'product', defaultValue: '' },
      { key: 'home_hero_cta_label', label: 'Hero CTA Label', type: 'text', defaultValue: 'SHOP IN 2 SECONDS' },
      { key: 'home_hero_cta_url', label: 'Hero CTA URL', type: 'text', defaultValue: '#featured' },
      {
        key: 'home_hero_slides_json',
        label: 'Hero Slides (JSON)',
        type: 'textarea',
        rows: 10,
        defaultValue: '',
        description: 'Optional. Add an array of slides: [{"eyebrow":"Shop Bestsellers","title":"Fresh groceries","subtitle":"Save on staples","cta":"Shop Now","href":"/shop","media":"https://..."}]. Each slide can link to /shop, /product/product-id, /our-roots, #featured, etc.',
      },
      {
        key: 'home_pride_phrases',
        label: 'Hero Trust Pills',
        type: 'textarea',
        rows: 3,
        defaultValue: 'Traditional Foods|Fair Prices|Trusted Quality|Taste What Was Lost',
        description: 'Use | separator. First four are shown.',
      },
    ],
  },
  {
    id: 'category-rail',
    title: 'Category Rail',
    description: 'Uses active product categories. Category images/icons are managed on each category record.',
    fields: [
      { key: 'home_category_rail_title', label: 'Internal Note', type: 'text', defaultValue: 'Active categories are shown automatically below hero.' },
    ],
  },
  {
    id: 'trust-blocks',
    title: 'Trust Blocks',
    description: 'Homepage proof cards. Keep wording safe for hybrid sourcing.',
    fields: [
      {
        key: 'home_trust_cards_json',
        label: 'Trust Cards (JSON)',
        type: 'textarea',
        rows: 8,
        defaultValue: '',
        description: 'Optional array: [{"title":"Thoughtfully Chosen","body":"...","icon":"thoughtful"}]. Supported icons: thoughtful, traditional, quality, neighborhood.',
      },
      {
        key: 'home_trust_illustration_urls',
        label: 'Trust Illustration URLs',
        type: 'textarea',
        rows: 5,
        defaultValue: '',
        description: 'Optional. Add up to 4 image URLs, one per line or separated by |.',
      },
    ],
  },
  {
    id: 'story-panels',
    title: 'Native & Traditional Story Cards',
    description: 'Image-led cards below trust proof. Use safe wording: traditional, regional, thoughtfully chosen.',
    fields: [
      {
        key: 'home_story_cards_json',
        label: 'Story Cards (JSON)',
        type: 'textarea',
        rows: 10,
        defaultValue: '',
        description: 'Optional array: [{"title":"Native grains","body":"...","href":"/shop","cta":"Shop grains","media":"https://..."}].',
      },
      {
        key: 'home_story_panel_media_urls',
        label: 'Story Panel Media URLs',
        type: 'textarea',
        rows: 5,
        defaultValue: '',
        description: 'Optional. Add 3 image URLs, one per line or separated by |.',
      },
      { key: 'home_sourcing_title', label: 'Sourcing Title', type: 'text', defaultValue: 'We source through journeys, not brokers.' },
      {
        key: 'home_sourcing_body',
        label: 'Sourcing Body',
        type: 'textarea',
        rows: 4,
        defaultValue: 'We map the back roads, meet independent farmers and bring back foods with memory.',
      },
      { key: 'home_sourcing_media_url', label: 'Sourcing Media', type: 'media', defaultValue: '' },
    ],
  },
  {
    id: 'product-focus',
    title: 'Product Focus Shelf',
    description: 'Homepage shelf after story cards. Choose one category or leave blank to auto-pick.',
    fields: [
      { key: 'home_product_focus_title', label: 'Shelf Title', type: 'text', defaultValue: 'Product in Focus: Better everyday staples' },
      { key: 'home_product_focus_category_id', label: 'Focus Category', type: 'category', defaultValue: '' },
    ],
  },
  {
    id: 'footer-artwork',
    title: 'Footer Artwork',
    description: 'Illustrated footer background and overlay art. Leave blank to use built-in Yasvik illustration shapes.',
    fields: [
      { key: 'footer_background_media_url', label: 'Footer Background Media', type: 'media', defaultValue: '' },
      { key: 'footer_art_overlay_url', label: 'Footer Overlay Illustration', type: 'media', defaultValue: '' },
      { key: 'footer_headline', label: 'Footer Headline', type: 'text', defaultValue: 'All journeys end in roots.' },
      {
        key: 'footer_subcopy',
        label: 'Footer Subcopy',
        type: 'textarea',
        rows: 3,
        defaultValue: 'Traditional foods, fair prices and trusted quality for everyday family kitchens.',
      },
    ],
  },
  {
    id: 'our-roots',
    title: 'Our Roots Page',
    description: 'Top fold editorial copy and section headings.',
    fields: [
      { key: 'roots_philosophy_title', label: 'Philosophy Title', type: 'text', defaultValue: 'THE STORY OF OUR ROOTS' },
      {
        key: 'roots_philosophy_body',
        label: 'Philosophy Body',
        type: 'textarea',
        rows: 4,
        defaultValue: 'Food should not become anonymous. Yasvik exists to reconnect everyday essentials with the people, places and traditions behind them, carrying inherited food wisdom into modern family life with honesty, practicality and care.',
      },
      { key: 'roots_roads_title', label: 'Roads Section Title', type: 'text', defaultValue: 'THE ROADS WE TRAVEL' },
      { key: 'roots_hands_title', label: 'Hands Section Title', type: 'text', defaultValue: 'THE HANDS BEHIND THE HARVEST' },
    ],
  },
  {
    id: 'commerce',
    title: 'Commerce',
    description: 'Store-level threshold and checkout behavior settings.',
    fields: [
      { key: 'free_delivery_threshold', label: 'Free Delivery Threshold (₹)', type: 'number', defaultValue: 999 },
      { key: 'fssai_license_number', label: 'FSSAI License Number', type: 'text', defaultValue: '' },
      { key: 'support_email', label: 'Consumer Support Email', type: 'text', defaultValue: 'hello@yasvik.com' },
      { key: 'brand_origin_credentials', label: 'Brand Origin Credentials', type: 'textarea', rows: 3, defaultValue: 'Thoughtfully chosen everyday essentials, traditional foods, and better alternatives from trusted regional sources.' },
    ],
  },
];

const ALL_CONFIG_FIELDS = SETTINGS_SECTIONS.flatMap((section) => section.fields);
const ALL_CONFIG_KEYS = new Set(ALL_CONFIG_FIELDS.map((field) => field.key));

function normalizeValue(field, rawValue) {
  if (rawValue === undefined || rawValue === null || rawValue === '') return field.defaultValue;
  if (field.type === 'number') return Number(rawValue) || 0;
  if (field.type === 'boolean') return rawValue === true || rawValue === 'true';
  return String(rawValue);
}

function isMediaValue(value = '') {
  const v = String(value).toLowerCase();
  return /\.(jpg|jpeg|png|webp|gif|svg|mp4|webm|mov)(\?|$)/i.test(v) || v.startsWith('http');
}

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const [formValues, setFormValues] = useState({});
  const [savedKey, setSavedKey] = useState('');
  const [expandedSections, setExpandedSections] = useState(() =>
    SETTINGS_SECTIONS.reduce((acc, section) => ({ ...acc, [section.id]: true }), {})
  );
  const [pickerKey, setPickerKey] = useState('');

  const { data: categories = [] } = useQuery({
    queryKey: ['admin-settings-categories'],
    queryFn: () => categoriesApi.list('sort_order', 200),
    staleTime: 10 * 60 * 1000,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['admin-settings-products'],
    queryFn: () => productsApi.listPublished('-created_date', 200),
    staleTime: 10 * 60 * 1000,
  });

  const {
    data: settings = [],
    isLoading,
  } = useQuery({
    queryKey: SETTINGS_QUERY_KEYS.all,
    queryFn: async () => {
      const all = await fetchAllAppSettings();
      const values = {};
      ALL_CONFIG_FIELDS.forEach((field) => {
        const existing = getLatestSettingRecord(all, field.key);
        values[field.key] = normalizeValue(field, existing?.value);
      });
      setFormValues(values);
      return all;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (key) => {
      const field = ALL_CONFIG_FIELDS.find((f) => f.key === key);
      const latestSettings = queryClient.getQueryData(SETTINGS_QUERY_KEYS.all) || settings;
      await upsertAppSetting(latestSettings, key, formValues[key], {
        data_type: field?.type === 'theme-preset' ? 'string' : field?.type,
        description: field?.description || '',
      });
    },
    onMutate: async (key) => {
      await queryClient.cancelQueries({ queryKey: SETTINGS_QUERY_KEYS.all });
      const previous = queryClient.getQueryData(SETTINGS_QUERY_KEYS.all);
      const nowIso = new Date().toISOString();
      const next = Array.isArray(previous) ? [...previous] : [];
      const idx = next.findIndex((item) => item?.key === key);
      if (idx >= 0) {
        next[idx] = {
          ...next[idx],
          value: formValues[key],
          setting_value: formValues[key],
          updated_at: nowIso,
          updated_date: nowIso,
        };
      } else {
        next.unshift({
          id: `optimistic-${key}`,
          key,
          setting_key: key,
          value: formValues[key],
          setting_value: formValues[key],
          updated_at: nowIso,
          updated_date: nowIso,
        });
      }
      queryClient.setQueryData(SETTINGS_QUERY_KEYS.all, next);
      return { previous };
    },
    onSuccess: async (_, key) => {
      await queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === 'settings',
      });
      await queryClient.invalidateQueries({ queryKey: ['home-redesign-settings'] });
      await queryClient.invalidateQueries({ queryKey: ['our-roots-settings'] });
      await queryClient.refetchQueries({ queryKey: SETTINGS_QUERY_KEYS.all, type: 'active' });
      if (key?.startsWith('home_')) {
        await queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEYS.home });
      }
      if (key?.startsWith('roots_')) {
        await queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEYS.roots });
      }
      toast({
        title: 'Setting saved',
        description: `${key} has been updated and reflected on storefront.`,
      });
      setSavedKey(key);
      window.setTimeout(() => setSavedKey(''), 1500);
    },
    onError: (error, _key, context) => {
      if (context?.previous) {
        queryClient.setQueryData(SETTINGS_QUERY_KEYS.all, context.previous);
      }
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: error?.message || 'Could not save this setting. Please try again.',
      });
    },
  });

  const deleteSettingMutation = useMutation({
    mutationFn: async (id) => appClient.entities.AppSettings.delete(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === 'settings',
      });
      await queryClient.refetchQueries({ queryKey: SETTINGS_QUERY_KEYS.all, type: 'active' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: error?.message || 'Could not delete this setting.',
      });
    },
  });

  const legacySettings = useMemo(() => settings.filter((item) => !ALL_CONFIG_KEYS.has(item.key)), [settings]);

  const handleValueChange = (key, value) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const toggleSection = (sectionId) => {
    setExpandedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="h-8 bg-temple-stone/20 rounded animate-pulse w-1/3 mb-4" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="font-cormorant text-3xl text-rain-cloud font-medium">Settings</h1>
        <p className="font-inter text-sm text-rain-cloud/45 mt-1">Clean controls for the redesigned website. Everything here is active and used.</p>
      </div>

      <div className="space-y-5">
        {SETTINGS_SECTIONS.map((section) => (
          <motion.div
            key={section.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-border/60 overflow-hidden"
          >
            <button
              type="button"
              onClick={() => toggleSection(section.id)}
              className="w-full px-6 py-4 flex items-start justify-between text-left"
            >
              <div>
                <h2 className="font-cormorant text-xl text-rain-cloud">{section.title}</h2>
                <p className="font-inter text-xs text-rain-cloud/45 mt-1">{section.description}</p>
              </div>
              {expandedSections[section.id] ? (
                <ChevronUp className="w-5 h-5 text-rain-cloud/35 mt-1" />
              ) : (
                <ChevronDown className="w-5 h-5 text-rain-cloud/35 mt-1" />
              )}
            </button>

            {expandedSections[section.id] && (
              <div className="px-6 pb-5 border-t border-border/50 space-y-5 pt-5">
                {section.fields.map((field) => {
                  const value = formValues[field.key];
                  const isSaving = updateMutation.isPending && updateMutation.variables === field.key;
                  const isSaved = savedKey === field.key && !isSaving;

                  return (
                    <div key={field.key} className="rounded-xl border border-border/70 p-4">
                      <label className="block font-inter text-sm text-rain-cloud/80 mb-1">{field.label}</label>
                      {field.description ? (
                        <p className="font-inter text-xs text-rain-cloud/45 mb-2">{field.description}</p>
                      ) : null}

                      <div className="flex items-end gap-3">
                        <div className="flex-1">
                          {field.type === 'boolean' ? (
                            <label className="inline-flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={Boolean(value)}
                                onChange={(e) => handleValueChange(field.key, e.target.checked)}
                                className="w-4 h-4"
                              />
                              <span className="font-inter text-sm text-rain-cloud">Enabled</span>
                            </label>
                          ) : field.type === 'number' ? (
                            <input
                              type="number"
                              value={value ?? ''}
                              onChange={(e) => handleValueChange(field.key, Number(e.target.value))}
                              className="w-full px-4 py-2 border border-border rounded-xl font-inter text-sm text-rain-cloud focus:outline-none focus:border-forest-canopy"
                            />
                          ) : field.type === 'color' ? (
                            <div className="flex items-center gap-3">
                              <input
                                type="color"
                                value={value || field.defaultValue || '#fff7e4'}
                                onChange={(e) => handleValueChange(field.key, e.target.value)}
                                className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-white p-1"
                              />
                              <input
                                type="text"
                                value={value || ''}
                                onChange={(e) => handleValueChange(field.key, e.target.value)}
                                className="w-full px-4 py-2 border border-border rounded-xl font-inter text-sm text-rain-cloud focus:outline-none focus:border-forest-canopy"
                              />
                            </div>
                          ) : field.type === 'theme-preset' ? (
                            <div className="space-y-3">
                              <select
                                value={value || DEFAULT_THEME_PRESET_KEY}
                                onChange={(e) => handleValueChange(field.key, e.target.value)}
                                className="w-full px-4 py-2 border border-border rounded-xl font-inter text-sm text-rain-cloud focus:outline-none focus:border-forest-canopy"
                              >
                                {YASVIK_THEME_PRESETS.map((theme) => (
                                  <option key={theme.key} value={theme.key}>
                                    {theme.label} — {theme.descriptor}
                                  </option>
                                ))}
                              </select>
                              <div className="grid gap-2 md:grid-cols-2">
                                {YASVIK_THEME_PRESETS.map((theme) => {
                                  const selected = (value || DEFAULT_THEME_PRESET_KEY) === theme.key;
                                  return (
                                    <button
                                      key={theme.key}
                                      type="button"
                                      onClick={() => handleValueChange(field.key, theme.key)}
                                      className={`rounded-2xl border p-3 text-left transition-all ${selected ? 'border-forest-canopy bg-rain-mist shadow-sm' : 'border-border hover:border-forest-canopy/40 hover:bg-rain-mist/50'}`}
                                    >
                                      <div className="flex items-center justify-between gap-3">
                                        <div>
                                          <p className="font-inter text-sm font-semibold text-rain-cloud">{theme.label}</p>
                                          <p className="font-inter text-[11px] text-rain-cloud/50">{theme.descriptor}</p>
                                        </div>
                                        <div className="flex overflow-hidden rounded-full border border-black/10">
                                          {[theme.bgCanvas, theme.bgCard, theme.textMain, theme.actionPrimary].map((color) => (
                                            <span key={color} className="h-6 w-6" style={{ backgroundColor: color }} />
                                          ))}
                                        </div>
                                      </div>
                                      <p className="mt-2 font-inter text-[11px] leading-relaxed text-rain-cloud/45">{theme.bestFor}</p>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ) : field.type === 'category' ? (
                            <select
                              value={value || ''}
                              onChange={(e) => handleValueChange(field.key, e.target.value)}
                              className="w-full px-4 py-2 border border-border rounded-xl font-inter text-sm text-rain-cloud focus:outline-none focus:border-forest-canopy"
                            >
                              <option value="">Select category</option>
                              {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                  {category.name}
                                </option>
                              ))}
                            </select>
                          ) : field.type === 'product' ? (
                            <select
                              value={value || ''}
                              onChange={(e) => handleValueChange(field.key, e.target.value)}
                              className="w-full px-4 py-2 border border-border rounded-xl font-inter text-sm text-rain-cloud focus:outline-none focus:border-forest-canopy"
                            >
                              <option value="">Auto-select featured/latest product</option>
                              {products.map((product) => (
                                <option key={product.id} value={product.id}>
                                  {product.title || product.name || product.id}
                                </option>
                              ))}
                            </select>
                          ) : field.type === 'textarea' ? (
                            <textarea
                              value={value || ''}
                              onChange={(e) => handleValueChange(field.key, e.target.value)}
                              rows={field.rows || 3}
                              className="w-full px-4 py-2 border border-border rounded-xl font-inter text-sm text-rain-cloud focus:outline-none focus:border-forest-canopy"
                            />
                          ) : (
                            <input
                              type="text"
                              value={value || ''}
                              onChange={(e) => handleValueChange(field.key, e.target.value)}
                              className="w-full px-4 py-2 border border-border rounded-xl font-inter text-sm text-rain-cloud focus:outline-none focus:border-forest-canopy"
                            />
                          )}

                          {field.type === 'media' ? (
                            <div className="mt-2 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setPickerKey(field.key)}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border font-inter text-xs text-rain-cloud/70 hover:bg-rain-mist transition-colors"
                              >
                                <ImageIcon className="w-3.5 h-3.5" />
                                Pick from Media
                              </button>
                              {value ? (
                                <a
                                  href={String(value)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-inter text-xs text-forest-canopy hover:underline"
                                >
                                  Preview URL
                                </a>
                              ) : null}
                            </div>
                          ) : null}

                          {field.type === 'media' && value && isMediaValue(value) ? (
                            <div className="mt-3 h-20 w-20 rounded-lg overflow-hidden border border-border bg-rain-mist/60">
                              <img src={String(value)} alt={field.label} className="w-full h-full object-cover" />
                            </div>
                          ) : null}
                        </div>

                        <button
                          type="button"
                          onClick={() => updateMutation.mutate(field.key)}
                          disabled={updateMutation.isPending}
                          className="px-5 py-2 bg-forest-canopy text-white font-inter text-sm rounded-full hover:bg-forest-canopy/90 transition-all disabled:opacity-60 flex items-center gap-2"
                        >
                          {isSaving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : isSaved ? (
                            '✓ Saved'
                          ) : (
                            <>
                              <Save className="w-4 h-4" />
                              Save
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <div className="mt-8 bg-white rounded-2xl shadow-sm border border-border/60 p-5">
        <h3 className="font-cormorant text-xl text-rain-cloud">Legacy / Unused Settings</h3>
        <p className="font-inter text-xs text-rain-cloud/45 mt-1">
          These keys are not used by the redesigned site. Safe to review and delete if no longer needed.
        </p>

        {legacySettings.length === 0 ? (
          <p className="font-inter text-sm text-rain-cloud/55 mt-4">No unused settings found.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {legacySettings.map((setting) => (
              <div key={setting.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 p-3">
                <div className="min-w-0">
                  <p className="font-inter text-sm text-rain-cloud truncate">{setting.key}</p>
                  <p className="font-inter text-xs text-rain-cloud/45 truncate">{String(setting.value ?? '')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteSettingMutation.mutate(setting.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="font-inter text-xs">Delete</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <MediaPickerModal
        open={Boolean(pickerKey)}
        onClose={() => setPickerKey('')}
        onSelect={(url) => {
          if (!pickerKey) return;
          handleValueChange(pickerKey, url);
        }}
      />
    </div>
  );
}
