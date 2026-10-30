import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import {
  LAUNCH_STORY_SLUGS,
  assessStoryLaunchReadiness,
} from '@/lib/editorialLaunchReadiness';

async function listStories() {
  const { data, error } = await supabase
    .from('storefront_stories')
    .select('*')
    .order('display_priority', { ascending: true });
  if (error) throw error;
  return data || [];
}

export default function EditorialStoriesTab() {
  const { data: stories = [], isLoading, error } = useQuery({
    queryKey: ['admin-editorial-stories-overview'],
    queryFn: listStories,
  });

  const launchStories = LAUNCH_STORY_SLUGS.map((slug) => stories.find((s) => s.slug === slug)).filter(Boolean);
  const missingSlugs = LAUNCH_STORY_SLUGS.filter((slug) => !stories.some((s) => s.slug === slug));
  const pool = launchStories.length ? launchStories : stories;

  if (isLoading) return <p className="font-inter text-sm text-deep-forest/50">Loading Stories…</p>;
  if (error) {
    return (
      <div className="space-y-4">
        <p className="font-inter text-sm text-amber-900">{error.message}</p>
        <Link
          to="/admin/storefront-stories"
          className="inline-flex items-center gap-2 rounded-full bg-deep-forest px-4 py-2 font-inter text-[11px] font-bold uppercase tracking-wider text-warm-cream"
        >
          Open Stories CMS
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-soft-border bg-white p-4">
        <p className="font-inter text-sm text-deep-forest/70">
          <code className="text-xs">/admin/storefront-stories</code> is the only Stories CMS. This tab links out — it does not duplicate the editor.
        </p>
        <Link
          to="/admin/storefront-stories"
          className="inline-flex items-center gap-2 rounded-full bg-deep-forest px-4 py-2 font-inter text-[11px] font-bold uppercase tracking-wider text-warm-cream"
        >
          Open Stories CMS
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="space-y-3">
        <p className="font-inter text-[11px] font-bold uppercase tracking-wider text-deep-forest/45">
          Launch Stories ({pool.length}/6)
        </p>
        {pool.map((story) => {
          const r = assessStoryLaunchReadiness(story);
          const gaps = [];
          if (!r.hasVideo) gaps.push('video');
          if (!r.hasPoster) gaps.push('poster');
          if (!r.hasCaptions) gaps.push('captions');
          if (!r.hasCta) gaps.push('CTA');
          if (!r.relatedOk) gaps.push('related');
          return (
            <article key={story.id} className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-soft-border bg-white p-4">
              <div className="min-w-0">
                <p className="font-inter text-sm font-semibold text-deep-forest">{story.title}</p>
                <p className="mt-0.5 font-inter text-[11px] text-deep-forest/50">
                  {story.status} · {story.slug}
                </p>
                {gaps.length ? (
                  <p className="mt-2 font-inter text-[11px] text-amber-900">Missing: {gaps.join(', ')}</p>
                ) : (
                  <p className="mt-2 font-inter text-[11px] text-emerald-800">Launch-ready</p>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <span className={`rounded-full px-2 py-0.5 font-inter text-[10px] font-bold uppercase ${r.launchReady ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>
                  {r.launchReady ? 'Ready' : 'Blocked'}
                </span>
                <Link
                  to={`/admin/storefront-stories?edit=${story.id}`}
                  className="inline-flex items-center gap-1 rounded-full border border-soft-border px-3 py-1.5 font-inter text-[11px] font-bold uppercase tracking-wider text-deep-forest"
                >
                  Edit in Stories CMS
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </article>
          );
        })}
        {!pool.length ? (
          <p className="font-inter text-sm text-deep-forest/50">
            No launch Stories found. Create them in the Stories CMS with the approved slugs.
          </p>
        ) : null}
        {missingSlugs.length ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3">
            <p className="font-inter text-[11px] font-bold uppercase tracking-wider text-amber-900">Missing launch slugs</p>
            <ul className="mt-2 list-disc pl-4 font-inter text-xs text-deep-forest/80">
              {missingSlugs.map((slug) => (
                <li key={slug}>{slug}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
