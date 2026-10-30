import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import ImageUploadField from '@/components/admin/ImageUploadField';
import { isStorefrontStoryPublishReady } from '@/lib/editorialStorefront';

const STORY_SAVE_KEYS = [
  'title', 'slug', 'short_hook', 'video_url', 'poster_image_url', 'captions',
  'duration_seconds', 'related_product_id', 'related_collection_id',
  'cta_label', 'cta_destination', 'instagram_url', 'youtube_url',
  'display_priority', 'show_on_homepage', 'show_on_product_page', 'show_on_category_page',
  'status', 'language', 'published_at', 'updated_at',
];

export const STOREFRONT_STORY_EMPTY = {
  title: '',
  slug: '',
  short_hook: '',
  video_url: '',
  poster_image_url: '',
  captions: '',
  duration_seconds: 30,
  related_product_id: '',
  related_collection_id: '',
  cta_label: '',
  cta_destination: '',
  instagram_url: '',
  youtube_url: '',
  display_priority: 100,
  show_on_homepage: true,
  show_on_product_page: false,
  show_on_category_page: false,
  status: 'draft',
  language: 'en',
};

export function slugifyStory(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function publishBlockers(story) {
  const missing = [];
  if (!String(story.title || '').trim()) missing.push('title');
  if (!String(story.short_hook || '').trim()) missing.push('hook');
  if (!String(story.captions || '').trim()) missing.push('captions');
  if (!String(story.poster_image_url || '').trim() && !String(story.video_url || '').trim()) {
    missing.push('poster or video');
  }
  if (!String(story.cta_label || '').trim()) missing.push('CTA label');
  if (!String(story.cta_destination || '').trim()) missing.push('CTA destination');
  if (!Number.isFinite(Number(story.display_priority))) missing.push('display priority');
  if (!String(story.related_product_id || '').trim() && !String(story.related_collection_id || '').trim()) {
    missing.push('related product or collection');
  }
  return missing;
}

async function listProductOptions() {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, slug, merchandising_tier')
    .eq('is_published', true)
    .order('name');
  if (error) throw error;
  return data || [];
}

/**
 * Shared Stories form for /admin/storefront-stories and Editorial Storefront Stories tab.
 */
export default function StorefrontStoryEditorForm({
  initial = STOREFRONT_STORY_EMPTY,
  editingId = null,
  onCancel = null,
  onSaved = null,
  compact = false,
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState(() => ({
    ...STOREFRONT_STORY_EMPTY,
    ...initial,
    related_product_id: initial?.related_product_id || '',
    related_collection_id: initial?.related_collection_id || '',
  }));
  const [formError, setFormError] = useState('');
  const [saveOk, setSaveOk] = useState('');

  const { data: products = [] } = useQuery({
    queryKey: ['admin-story-product-options'],
    queryFn: listProductOptions,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (payload.status === 'published') {
        const blockers = publishBlockers(payload);
        if (blockers.length || !isStorefrontStoryPublishReady(payload)) {
          throw new Error(
            `Cannot publish without approved media and content. Missing: ${blockers.join(', ') || 'required fields'}. Keep as draft.`,
          );
        }
      }
      const base = {
        ...STOREFRONT_STORY_EMPTY,
        ...payload,
        slug: payload.slug || slugifyStory(payload.title),
        duration_seconds: Number(payload.duration_seconds) || null,
        display_priority: Number(payload.display_priority) || 100,
        related_product_id: payload.related_product_id || null,
        related_collection_id: payload.related_collection_id || null,
        published_at: payload.status === 'published' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };
      const row = {};
      STORY_SAVE_KEYS.forEach((key) => {
        if (key in base) row[key] = base[key];
      });
      if (editingId) {
        const { error } = await supabase.from('storefront_stories').update(row).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('storefront_stories').insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-storefront-stories'] });
      qc.invalidateQueries({ queryKey: ['editorial-storefront-stories'] });
      qc.invalidateQueries({ queryKey: ['admin-editorial-stories-overview'] });
      qc.invalidateQueries({ queryKey: ['admin-editorial-heroes'] });
      qc.invalidateQueries({ queryKey: ['admin-editorial-launch-gates'] });
      setFormError('');
      setSaveOk('Saved');
      setTimeout(() => setSaveOk(''), 2000);
      onSaved?.();
    },
    onError: (err) => {
      setFormError(String(err?.message || 'Save failed'));
    },
  });

  const f = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormError('');
  };

  const blockers = form.status === 'published' ? publishBlockers(form) : [];
  const heroProducts = products.filter((p) => p.merchandising_tier === 'hero');
  const otherProducts = products.filter((p) => p.merchandising_tier !== 'hero');

  return (
    <div className={compact ? 'space-y-3' : 'space-y-3'}>
      {!compact ? (
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-cormorant text-xl font-semibold text-deep-forest">
            {editingId ? 'Edit story' : 'New story'}
          </h2>
          {editingId && onCancel ? (
            <button type="button" onClick={onCancel} className="font-inter text-xs text-deep-forest/50">
              Cancel
            </button>
          ) : null}
        </div>
      ) : null}

      <input className="w-full rounded-xl border border-border px-3 py-2 font-inter text-sm" placeholder="Title *" value={form.title} onChange={f('title')} />
      <input className="w-full rounded-xl border border-border px-3 py-2 font-inter text-sm" placeholder="Slug" value={form.slug} onChange={f('slug')} />
      <textarea className="w-full rounded-xl border border-border px-3 py-2 font-inter text-sm" rows={2} placeholder="Short hook *" value={form.short_hook} onChange={f('short_hook')} />
      <textarea className="w-full rounded-xl border border-border px-3 py-2 font-inter text-sm" rows={2} placeholder="Captions *" value={form.captions} onChange={f('captions')} />
      <ImageUploadField
        label="Poster image *"
        value={form.poster_image_url}
        onChange={(url) => setForm((prev) => ({ ...prev, poster_image_url: url || '' }))}
        accept="image/*"
        folder="stories"
        hideUrlField
        seoName={form.slug || 'story'}
        assetRole="story-poster"
        entityTitle={form.title}
      />
      <ImageUploadField
        label="Approved 9:16 video *"
        value={form.video_url}
        onChange={(url) => setForm((prev) => ({ ...prev, video_url: url || '' }))}
        accept="video/*"
        folder="stories"
        hideUrlField
        seoName={form.slug || 'story'}
        assetRole="story-video"
        entityTitle={form.title}
      />
      <div className="grid grid-cols-2 gap-3">
        <input className="rounded-xl border border-border px-3 py-2 font-inter text-sm" type="number" placeholder="Duration (sec)" value={form.duration_seconds} onChange={f('duration_seconds')} />
        <input className="rounded-xl border border-border px-3 py-2 font-inter text-sm" type="number" placeholder="Display priority *" value={form.display_priority} onChange={f('display_priority')} />
      </div>
      <label className="block">
        <span className="mb-1 block font-inter text-[11px] font-bold uppercase tracking-wider text-deep-forest/50">Related product</span>
        <select
          className="w-full rounded-xl border border-border px-3 py-2 font-inter text-sm"
          value={form.related_product_id || ''}
          onChange={f('related_product_id')}
        >
          <option value="">None</option>
          {heroProducts.length ? (
            <optgroup label="Hero products">
              {heroProducts.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </optgroup>
          ) : null}
          <optgroup label="All published">
            {otherProducts.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </optgroup>
        </select>
      </label>
      <input className="w-full rounded-xl border border-border px-3 py-2 font-inter text-sm" placeholder="Related collection ID (optional)" value={form.related_collection_id || ''} onChange={f('related_collection_id')} />
      <input className="w-full rounded-xl border border-border px-3 py-2 font-inter text-sm" placeholder="CTA label *" value={form.cta_label} onChange={f('cta_label')} />
      <input className="w-full rounded-xl border border-border px-3 py-2 font-inter text-sm" placeholder="CTA destination path *" value={form.cta_destination} onChange={f('cta_destination')} />
      <input className="w-full rounded-xl border border-border px-3 py-2 font-inter text-sm" placeholder="Instagram URL (optional)" value={form.instagram_url} onChange={f('instagram_url')} />
      <input className="w-full rounded-xl border border-border px-3 py-2 font-inter text-sm" placeholder="YouTube URL (optional)" value={form.youtube_url} onChange={f('youtube_url')} />
      <select className="w-full rounded-xl border border-border px-3 py-2 font-inter text-sm" value={form.status} onChange={f('status')}>
        <option value="draft">Draft</option>
        <option value="published">Published</option>
        <option value="archived">Archived</option>
      </select>
      {blockers.length ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 font-inter text-xs text-amber-900">
          Publish blocked until approved assets exist. Missing: {blockers.join(', ')}.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-4">
        {[
          ['show_on_homepage', 'Homepage'],
          ['show_on_product_page', 'Product page'],
          ['show_on_category_page', 'Category page'],
        ].map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 font-inter text-xs text-deep-forest/70">
            <input type="checkbox" checked={!!form[key]} onChange={f(key)} />
            {label}
          </label>
        ))}
      </div>
      <button
        type="button"
        disabled={!form.title || saveMutation.isPending || (form.status === 'published' && blockers.length > 0)}
        onClick={() => saveMutation.mutate(form)}
        className="inline-flex items-center gap-2 rounded-full bg-deep-forest px-5 py-2.5 font-inter text-[11px] font-bold uppercase tracking-wider text-warm-cream disabled:opacity-50"
      >
        <Save className="h-3.5 w-3.5" />
        {editingId ? 'Save story' : 'Create story'}
      </button>
      {saveOk ? <p className="font-inter text-xs text-deep-forest/60">{saveOk}</p> : null}
      {formError || saveMutation.isError ? (
        <p className="font-inter text-xs text-red-600">{formError || String(saveMutation.error?.message || 'Save failed')}</p>
      ) : null}
    </div>
  );
}
