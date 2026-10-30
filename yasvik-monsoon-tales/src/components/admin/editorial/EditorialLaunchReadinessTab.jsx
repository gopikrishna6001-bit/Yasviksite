import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Eye, RefreshCw, ShieldAlert } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import {
  fetchAllAppSettings,
  upsertAppSetting,
  SETTINGS_QUERY_KEYS,
} from '@/services/settingsService';
import { isEditorialStorefrontPublicEnabled } from '@/lib/editorialStorefront';
import {
  mapCampaignRowToUi,
  computeEditorialLaunchGates,
  buildMissingItemsReport,
  assessHeroLaunchReadiness,
  LAUNCH_STORY_SLUGS,
} from '@/lib/editorialLaunchReadiness';

const PREVIEW_QA_KEY = 'editorial_preview_qa_pass';

async function loadHeroesForGates() {
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, slug, featured_image_url, short_description, primary_customer_benefit, ingredients, allergen_info, process_method, processing_method, best_for, storage_note, shelf_life_text, natural_variation_note, origin_state, source_type, seo_title, seo_description')
    .eq('merchandising_tier', 'hero')
    .order('merchandising_priority', { ascending: true });
  if (error) throw error;
  const ids = (products || []).map((p) => p.id);
  const [{ data: images }, { data: stories }] = await Promise.all([
    ids.length
      ? supabase.from('product_images').select('product_id, image_url').in('product_id', ids)
      : Promise.resolve({ data: [] }),
    supabase.from('storefront_stories').select('id, related_product_id'),
  ]);
  const imagesByProduct = {};
  (images || []).forEach((row) => {
    if (!imagesByProduct[row.product_id]) imagesByProduct[row.product_id] = [];
    imagesByProduct[row.product_id].push(row.image_url);
  });
  return (products || []).map((p) => {
    const related = (stories || []).find((s) => s.related_product_id === p.id);
    return {
      ...p,
      galleryUrls: (imagesByProduct[p.id] || []).filter((u) => u && u !== p.featured_image_url),
      relatedStoryId: related?.id || '',
    };
  });
}

async function loadGateBundle() {
  const [heroes, publicFlag, settings] = await Promise.all([
    loadHeroesForGates(),
    isEditorialStorefrontPublicEnabled(),
    fetchAllAppSettings(),
  ]);

  let campaigns = [];
  try {
    const campaignsRes = await supabase.from('editorial_campaigns').select('*').order('display_priority');
    if (!campaignsRes.error && campaignsRes.data?.length) {
      campaigns = campaignsRes.data.map(mapCampaignRowToUi);
    }
  } catch {
    campaigns = [];
  }
  if (!campaigns.length) {
    try {
      const raw = settings.find((s) => s.setting_key === 'editorial_campaigns_json' || s.key === 'editorial_campaigns_json')?.setting_value
        ?? settings.find((s) => s.setting_key === 'editorial_campaigns_json' || s.key === 'editorial_campaigns_json')?.value;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) campaigns = parsed.map((row) => mapCampaignRowToUi({
        id: row.id,
        slug: row.slug,
        title: row.title || row.theme,
        headline: row.headline,
        supporting_copy: row.supportingCopy || row.supporting_copy,
        desktop_media_url: row.desktopMediaUrl || row.desktop_media_url,
        mobile_media_url: row.mobileMediaUrl || row.mobile_media_url,
        poster_image_url: row.posterImageUrl || row.poster_image_url,
        media_type: row.mediaType || row.media_type,
        cta_label: row.ctaLabel || row.cta_label,
        cta_destination: row.ctaHref || row.cta_destination,
        text_safe_position: row.textSafePosition || row.text_safe_position,
        collection_slug: row.collectionSlug || row.collection_slug,
        poster_tone: row.posterTone || row.poster_tone,
        display_priority: row.displayPriority ?? row.display_priority,
        is_active: row.isActive ?? row.is_active,
        media_approval_status: row.mediaApprovalStatus || row.media_approval_status || 'pending',
      }));
    } catch {
      campaigns = [];
    }
  }

  let stories = [];
  try {
    const storiesRes = await supabase.from('storefront_stories').select('*').order('display_priority');
    if (!storiesRes.error) stories = storiesRes.data || [];
  } catch {
    stories = [];
  }

  const previewRaw = String(
    settings.find((s) => s.setting_key === PREVIEW_QA_KEY || s.key === PREVIEW_QA_KEY)?.setting_value
      ?? settings.find((s) => s.setting_key === PREVIEW_QA_KEY || s.key === PREVIEW_QA_KEY)?.value
      ?? '',
  ).toLowerCase();
  const previewQaPass = previewRaw === 'true' || previewRaw === '1' || previewRaw === 'yes'
    ? true
    : previewRaw === 'false' || previewRaw === '0'
      ? false
      : null;

  const launchStories = stories.filter((s) => LAUNCH_STORY_SLUGS.includes(s.slug));
  const summary = computeEditorialLaunchGates({
    campaigns,
    heroes,
    stories: launchStories.length ? launchStories : stories,
    publicFlag,
    previewQaPass,
  });
  summary.campaignNotes = campaigns.map((c) => {
    const missing = [];
    if (!c.desktopMediaUrl && !c.mobileMediaUrl && !c.posterImageUrl) missing.push('media');
    if (String(c.mediaApprovalStatus || '').toLowerCase() !== 'approved') missing.push('media approval');
    if (!c.headline) missing.push('headline');
    if (!c.ctaLabel || !c.ctaHref) missing.push('CTA');
    return `${c.title}: ${missing.length ? `missing ${missing.join(', ')}` : 'OK'}`;
  });
  return { summary, settings, heroes };
}

export default function EditorialLaunchReadinessTab() {
  const qc = useQueryClient();
  const [confirmText, setConfirmText] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-editorial-launch-gates'],
    queryFn: loadGateBundle,
  });

  const summary = data?.summary;
  const settings = data?.settings || [];

  const activate = useMutation({
    mutationFn: async (nextValue) => {
      if (nextValue === true && !summary?.allMandatoryPass) {
        throw new Error('Mandatory gates are still failing.');
      }
      if (nextValue === true && confirmText.trim().toUpperCase() !== 'ACTIVATE') {
        throw new Error('Type ACTIVATE to confirm public go-live.');
      }
      await upsertAppSetting(settings, 'editorial_storefront_public', nextValue ? 'true' : 'false', {
        data_type: 'boolean',
        description: 'When true, public homepage uses editorial layout.',
      });
    },
    onSuccess: async (_, nextValue) => {
      setActionMsg(nextValue ? 'Public editorial storefront ENABLED.' : 'Rolled back — public flag is false.');
      setConfirmText('');
      await qc.invalidateQueries({ queryKey: ['admin-editorial-launch-gates'] });
      await qc.invalidateQueries({ queryKey: SETTINGS_QUERY_KEYS.home });
      await qc.invalidateQueries({ queryKey: ['editorial-storefront-public'] });
    },
    onError: (err) => setActionMsg(err?.message || 'Update failed'),
  });

  const markPreviewQa = useMutation({
    mutationFn: async (pass) => {
      await upsertAppSetting(settings, PREVIEW_QA_KEY, pass ? 'true' : 'false', {
        data_type: 'boolean',
        description: 'Owner-confirmed editorial preview QA result.',
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-editorial-launch-gates'] });
    },
  });

  const exportReport = () => {
    if (!summary) return;
    const text = buildMissingItemsReport(summary);
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `editorial-missing-items-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const heroPercents = useMemo(() => {
    return (data?.heroes || []).map((h) => {
      const r = assessHeroLaunchReadiness(h);
      return { name: h.name, percent: r.percent };
    });
  }, [data?.heroes]);

  if (isLoading) return <p className="font-inter text-sm text-deep-forest/50">Computing readiness…</p>;
  if (error) return <p className="font-inter text-sm text-red-600">{error.message}</p>;
  if (!summary) return null;

  const disabledActivate = !summary.allMandatoryPass || activate.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <Link
          to="/admin/storefront-preview/editorial"
          className="inline-flex items-center gap-2 rounded-full border border-soft-border bg-white px-4 py-2 font-inter text-[11px] font-bold uppercase tracking-wider text-deep-forest"
        >
          <Eye className="h-3.5 w-3.5" />
          Open Preview
        </Link>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 rounded-full border border-soft-border bg-white px-4 py-2 font-inter text-[11px] font-bold uppercase tracking-wider text-deep-forest"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Re-run readiness checks
        </button>
        <button
          type="button"
          onClick={exportReport}
          className="inline-flex items-center gap-2 rounded-full border border-soft-border bg-white px-4 py-2 font-inter text-[11px] font-bold uppercase tracking-wider text-deep-forest"
        >
          <Download className="h-3.5 w-3.5" />
          Export missing-items report
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ['Approved Hero photography', `${summary.counts.heroPhotography} / ${summary.counts.heroTotal}`],
          ['Oil supporting galleries', `${summary.counts.oilGallery} / ${summary.counts.oilTotal || 2}`],
          ['Campaign media ready', `${summary.counts.campaignReady} / ${summary.counts.campaignTotal}`],
          ['Story videos', `${summary.counts.storyVideos} / ${summary.counts.storyTotal}`],
          ['Story posters', `${summary.counts.storyPosters} / ${summary.counts.storyTotal}`],
          ['Hero PDP content', `${summary.counts.heroPdp} / ${summary.counts.heroTotal}`],
          ['Stories launch-ready', `${summary.counts.storiesLaunchReady} / ${summary.counts.storyTotal}`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-soft-border bg-white p-4">
            <p className="font-inter text-[10px] font-bold uppercase tracking-wider text-deep-forest/45">{label}</p>
            <p className="mt-2 font-cormorant text-3xl font-semibold text-deep-forest">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-soft-border bg-white p-5">
        <h3 className="font-cormorant text-xl font-semibold text-deep-forest">Missing items</h3>
        <p className="mt-1 font-inter text-sm text-deep-forest/60">Exact fields still blocking launch — click through to the existing editor.</p>
        {(summary.missingItems || []).length ? (
          <ul className="mt-4 max-h-80 space-y-2 overflow-y-auto">
            {summary.missingItems.map((item, idx) => (
              <li key={`${item.kind}-${item.name}-${item.field}-${idx}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-soft-border/70 px-3 py-2">
                <div>
                  <p className="font-inter text-[10px] font-bold uppercase tracking-wider text-deep-forest/45">{item.kind}</p>
                  <p className="font-inter text-sm text-deep-forest">
                    <span className="font-semibold">{item.name}</span>
                    {' — '}
                    {item.field}
                  </p>
                </div>
                <Link
                  to={item.href}
                  className="rounded-full border border-soft-border px-3 py-1 font-inter text-[10px] font-bold uppercase tracking-wider text-deep-forest"
                >
                  Fix
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 font-inter text-sm text-emerald-800">No missing launch fields detected.</p>
        )}
      </div>

      <div className="rounded-2xl border border-soft-border bg-white p-5">
        <h3 className="font-cormorant text-xl font-semibold text-deep-forest">Live gates</h3>
        <ul className="mt-4 space-y-2">
          {summary.gates.map((gate) => (
            <li key={gate.id} className="flex items-start justify-between gap-3 rounded-xl border border-soft-border/70 px-3 py-2">
              <div>
                <p className="font-inter text-sm font-semibold text-deep-forest">
                  {gate.label}{gate.soft ? ' (soft)' : ''}
                </p>
                <p className="font-inter text-xs text-deep-forest/55">{gate.detail}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 font-inter text-[10px] font-bold uppercase ${gate.pass ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>
                {gate.pass ? 'Pass' : 'Fail'}
              </span>
            </li>
          ))}
        </ul>
        {heroPercents.length ? (
          <div className="mt-4 border-t border-soft-border pt-4">
            <p className="font-inter text-[11px] font-bold uppercase tracking-wider text-deep-forest/45">Per-Hero completion</p>
            <ul className="mt-2 space-y-1">
              {heroPercents.map((h) => (
                <li key={h.name} className="flex justify-between font-inter text-sm text-deep-forest/80">
                  <span>{h.name}</span>
                  <span>{h.percent}%</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-soft-border bg-white p-5">
        <h3 className="font-cormorant text-xl font-semibold text-deep-forest">Preview QA</h3>
        <p className="mt-1 font-inter text-sm text-deep-forest/60">
          Soft gate — confirm after reviewing desktop/mobile preview. Does not replace mandatory content gates.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => markPreviewQa.mutate(true)} className="rounded-full border border-soft-border px-4 py-2 font-inter text-[11px] font-bold uppercase tracking-wider">
            Mark preview QA pass
          </button>
          <button type="button" onClick={() => markPreviewQa.mutate(false)} className="rounded-full border border-soft-border px-4 py-2 font-inter text-[11px] font-bold uppercase tracking-wider">
            Mark preview QA fail
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-800" />
          <div className="flex-1">
            <h3 className="font-cormorant text-xl font-semibold text-deep-forest">Public activation</h3>
            <p className="mt-1 font-inter text-sm text-deep-forest/70">
              Flag: <strong>{summary.publicFlag ? 'true (public editorial ON)' : 'false (legacy home)'}</strong>
            </p>
            {!summary.allMandatoryPass ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-white/80 p-3">
                <p className="font-inter text-xs font-bold uppercase tracking-wider text-amber-900">Activation disabled — failing gates</p>
                <ul className="mt-2 list-disc space-y-1 pl-4 font-inter text-sm text-deep-forest/80">
                  {summary.failing.map((g) => (
                    <li key={g.id}>{g.label}: {g.detail}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-3 font-inter text-sm text-emerald-800">All mandatory gates pass. Type ACTIVATE to enable public editorial home.</p>
            )}

            <div className="mt-4 flex flex-wrap items-end gap-3">
              <label className="block">
                <span className="mb-1 block font-inter text-[11px] font-bold uppercase tracking-wider text-deep-forest/50">Confirmation</span>
                <input
                  className="rounded-xl border border-border bg-white px-3 py-2 font-inter text-sm"
                  placeholder="Type ACTIVATE"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  disabled={disabledActivate}
                />
              </label>
              <button
                type="button"
                disabled={disabledActivate || confirmText.trim().toUpperCase() !== 'ACTIVATE'}
                onClick={() => activate.mutate(true)}
                className="rounded-full bg-deep-forest px-5 py-2.5 font-inter text-[11px] font-bold uppercase tracking-wider text-warm-cream disabled:opacity-40"
              >
                Enable public editorial
              </button>
              <button
                type="button"
                disabled={activate.isPending || !summary.publicFlag}
                onClick={() => activate.mutate(false)}
                className="rounded-full border border-soft-border bg-white px-5 py-2.5 font-inter text-[11px] font-bold uppercase tracking-wider text-deep-forest disabled:opacity-40"
              >
                Rollback (set flag false)
              </button>
            </div>
            {actionMsg ? <p className="mt-3 font-inter text-xs text-deep-forest/70">{actionMsg}</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
