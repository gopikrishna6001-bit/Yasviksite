import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import ImageUploadField from '@/components/admin/ImageUploadField';
import { isCampaignLaunchReady } from '@/lib/editorialStorefront';
import {
  mapCampaignRowToUi,
  mapCampaignUiToRow,
} from '@/lib/editorialLaunchReadiness';
import {
  fetchAllAppSettings,
  upsertAppSetting,
} from '@/services/settingsService';

const CAMPAIGNS_JSON_KEY = 'editorial_campaigns_json';

async function listCampaigns() {
  const { data, error } = await supabase
    .from('editorial_campaigns')
    .select('*')
    .order('display_priority', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapCampaignRowToUi);
}

async function mirrorCampaignsToSettings() {
  const { data, error } = await supabase
    .from('editorial_campaigns')
    .select('*')
    .order('display_priority', { ascending: true });
  if (error) throw error;
  const settings = await fetchAllAppSettings();
  const payload = (data || []).map(mapCampaignRowToUi);
  await upsertAppSetting(settings, CAMPAIGNS_JSON_KEY, JSON.stringify(payload), {
    data_type: 'string',
    description: 'Public-safe mirror of editorial_campaigns for storefront reads.',
  });
}

function CampaignCard({ campaign, onSaved }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(campaign);
  const [msg, setMsg] = useState('');

  const save = useMutation({
    mutationFn: async () => {
      const row = mapCampaignUiToRow(form);
      const { error } = await supabase
        .from('editorial_campaigns')
        .update(row)
        .eq('id', campaign.id);
      if (error) throw error;
      await mirrorCampaignsToSettings();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-editorial-campaigns'] });
      qc.invalidateQueries({ queryKey: ['editorial-campaigns-launch-ready'] });
      setMsg('Saved');
      onSaved?.();
      setTimeout(() => setMsg(''), 2000);
    },
    onError: (err) => setMsg(err?.message || 'Save failed'),
  });

  const set = (key) => (e) => {
    const value = e?.target?.type === 'checkbox' ? e.target.checked : e?.target ? e.target.value : e;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const ready = isCampaignLaunchReady(form);

  return (
    <article className="rounded-2xl border border-soft-border bg-white p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-cormorant text-xl font-semibold text-deep-forest">{form.title}</h3>
          <p className="mt-1 font-inter text-[11px] text-deep-forest/50">slug: {campaign.slug}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full px-2.5 py-1 font-inter text-[10px] font-bold uppercase tracking-wider ${ready ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>
            {ready ? 'Launch-ready' : 'Not ready'}
          </span>
          <span className={`rounded-full px-2.5 py-1 font-inter text-[10px] font-bold uppercase tracking-wider ${form.isActive ? 'bg-deep-forest/10 text-deep-forest' : 'bg-stone-100 text-stone-500'}`}>
            {form.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block font-inter text-[11px] font-bold uppercase tracking-wider text-deep-forest/50">Title</span>
            <input className="w-full rounded-xl border border-border px-3 py-2 font-inter text-sm" value={form.title} onChange={set('title')} />
          </label>
          <label className="block">
            <span className="mb-1 block font-inter text-[11px] font-bold uppercase tracking-wider text-deep-forest/50">Headline</span>
            <textarea className="w-full rounded-xl border border-border px-3 py-2 font-inter text-sm" rows={2} value={form.headline} onChange={set('headline')} />
          </label>
          <label className="block">
            <span className="mb-1 block font-inter text-[11px] font-bold uppercase tracking-wider text-deep-forest/50">Supporting copy</span>
            <textarea className="w-full rounded-xl border border-border px-3 py-2 font-inter text-sm" rows={2} value={form.supportingCopy} onChange={set('supportingCopy')} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block font-inter text-[11px] font-bold uppercase tracking-wider text-deep-forest/50">CTA label</span>
              <input className="w-full rounded-xl border border-border px-3 py-2 font-inter text-sm" value={form.ctaLabel} onChange={set('ctaLabel')} />
            </label>
            <label className="block">
              <span className="mb-1 block font-inter text-[11px] font-bold uppercase tracking-wider text-deep-forest/50">CTA destination</span>
              <input className="w-full rounded-xl border border-border px-3 py-2 font-inter text-sm" value={form.ctaHref} onChange={set('ctaHref')} placeholder="/shop" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block font-inter text-[11px] font-bold uppercase tracking-wider text-deep-forest/50">Media type</span>
              <select className="w-full rounded-xl border border-border px-3 py-2 font-inter text-sm" value={form.mediaType} onChange={set('mediaType')}>
                <option value="image">Image</option>
                <option value="video">Video</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block font-inter text-[11px] font-bold uppercase tracking-wider text-deep-forest/50">Text-safe position</span>
              <select className="w-full rounded-xl border border-border px-3 py-2 font-inter text-sm" value={form.textSafePosition} onChange={set('textSafePosition')}>
                <option value="bottom-left">Bottom left</option>
                <option value="bottom-right">Bottom right</option>
                <option value="top-left">Top left</option>
                <option value="top-right">Top right</option>
                <option value="center">Center</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block font-inter text-[11px] font-bold uppercase tracking-wider text-deep-forest/50">Display priority</span>
              <input type="number" className="w-full rounded-xl border border-border px-3 py-2 font-inter text-sm" value={form.displayPriority} onChange={set('displayPriority')} />
            </label>
            <label className="block">
              <span className="mb-1 block font-inter text-[11px] font-bold uppercase tracking-wider text-deep-forest/50">Media approval</span>
              <select className="w-full rounded-xl border border-border px-3 py-2 font-inter text-sm" value={form.mediaApprovalStatus || 'pending'} onChange={set('mediaApprovalStatus')}>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>
          </div>
          <label className="flex items-center gap-2 font-inter text-sm text-deep-forest">
            <input type="checkbox" checked={!!form.isActive} onChange={set('isActive')} />
            Active on storefront (when launch-ready)
          </label>
        </div>

        <div className="space-y-3">
          <p className="font-inter text-xs text-deep-forest/55">
            Frame media for the slot — keep subject clear of the bottom ~20% where short copy sits.
            Desktop <span className="text-deep-forest/80">21:9</span> (e.g. 1920×823). Mobile{' '}
            <span className="text-deep-forest/80">4:5</span> (e.g. 1080×1350). Poster stills match desktop.
          </p>
          <ImageUploadField
            label="Desktop media (21:9)"
            value={form.desktopMediaUrl}
            onChange={(url) => setForm((prev) => ({ ...prev, desktopMediaUrl: url || '' }))}
            accept={form.mediaType === 'video' ? 'video/*' : 'image/*'}
            folder="heroes"
            aspectClass="aspect-[21/9]"
            hideUrlField
            seoName={campaign.slug}
            assetRole="campaign-desktop"
            entityTitle={form.title}
          />
          <ImageUploadField
            label="Mobile media (4:5)"
            value={form.mobileMediaUrl}
            onChange={(url) => setForm((prev) => ({ ...prev, mobileMediaUrl: url || '' }))}
            accept={form.mediaType === 'video' ? 'video/*' : 'image/*'}
            folder="heroes"
            aspectClass="aspect-[4/5]"
            hideUrlField
            seoName={campaign.slug}
            assetRole="campaign-mobile"
            entityTitle={form.title}
          />
          <ImageUploadField
            label="Poster fallback (21:9 still)"
            value={form.posterImageUrl}
            onChange={(url) => setForm((prev) => ({ ...prev, posterImageUrl: url || '' }))}
            accept="image/*"
            folder="heroes"
            aspectClass="aspect-[21/9]"
            hideUrlField
            seoName={campaign.slug}
            assetRole="campaign-poster"
            entityTitle={form.title}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          disabled={save.isPending}
          onClick={() => save.mutate()}
          className="inline-flex items-center gap-2 rounded-full bg-deep-forest px-5 py-2.5 font-inter text-[11px] font-bold uppercase tracking-wider text-warm-cream disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" />
          Save campaign
        </button>
        {msg ? <p className="font-inter text-xs text-deep-forest/60">{msg}</p> : null}
      </div>
    </article>
  );
}

export default function EditorialCampaignsTab() {
  const { data: campaigns = [], isLoading, error, refetch } = useQuery({
    queryKey: ['admin-editorial-campaigns'],
    queryFn: listCampaigns,
  });

  if (isLoading) return <p className="font-inter text-sm text-deep-forest/50">Loading campaigns…</p>;
  if (error) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p className="font-inter text-sm text-amber-950">
          Campaigns require an admin session ({error.message}). Use{' '}
          <a className="underline" href="/admin/editorial-storefront">/admin/editorial-storefront</a>
          {' '}while signed in, or apply migration{' '}
          <code className="text-xs">20260729141000_editorial_campaigns_rls_authenticated.sql</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="font-inter text-sm text-deep-forest/65">
        Upload approved desktop (21:9), mobile (4:5), and poster media via R2. Keep copy short — the storefront shows theme + headline + CTA only, so footage stays visible. Multiple active campaigns auto-advance about every 4.5s. Slides without approved media stay hidden.
      </p>
      {campaigns.map((campaign) => (
        <CampaignCard key={campaign.id} campaign={campaign} onSaved={() => refetch()} />
      ))}
    </div>
  );
}
