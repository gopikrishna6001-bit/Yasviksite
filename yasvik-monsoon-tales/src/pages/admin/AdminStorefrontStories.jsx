import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Eye, Plus } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import StorefrontStoryEditorForm, {
  STOREFRONT_STORY_EMPTY,
} from '@/components/admin/StorefrontStoryEditorForm';
import { supabase } from '@/api/supabaseClient';
import { isStorefrontStoryPublishReady } from '@/lib/editorialStorefront';

async function listStories() {
  const { data, error } = await supabase
    .from('storefront_stories')
    .select('*')
    .order('display_priority', { ascending: true });
  if (error) throw error;
  return data || [];
}

export default function AdminStorefrontStories() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: stories = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-storefront-stories'],
    queryFn: listStories,
  });
  const [formSeed, setFormSeed] = useState(STOREFRONT_STORY_EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [formKey, setFormKey] = useState(0);

  const openStory = (story) => {
    setEditingId(story.id);
    setFormSeed({
      ...STOREFRONT_STORY_EMPTY,
      ...story,
      related_product_id: story.related_product_id || '',
      related_collection_id: story.related_collection_id || '',
    });
    setFormKey((k) => k + 1);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormSeed(STOREFRONT_STORY_EMPTY);
    setFormKey((k) => k + 1);
  };

  useEffect(() => {
    const editId = searchParams.get('edit');
    if (!editId || isLoading || !stories.length) return;
    const story = stories.find((s) => s.id === editId);
    if (!story) return;
    openStory(story);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('edit');
      return next;
    }, { replace: true });
  }, [searchParams, stories, isLoading, setSearchParams]);

  return (
    <div className="p-6 md:p-8">
      <AdminPageHeader
        title="Storefront Stories"
        description="Vertical 9:16 Stories CMS — separate from Journeys and long-form Stories articles. Drafts appear in editorial preview only. Do not publish without approved video and poster."
        action={(
          <div className="flex flex-wrap gap-2">
            <Link
              to="/admin/editorial-storefront#stories"
              className="inline-flex items-center gap-2 rounded-full border border-soft-border bg-white px-4 py-2 font-inter text-xs font-bold uppercase tracking-wider text-deep-forest"
            >
              Launch CMS
            </Link>
            <Link
              to="/admin/storefront-preview/editorial"
              className="inline-flex items-center gap-2 rounded-full border border-soft-border bg-white px-4 py-2 font-inter text-xs font-bold uppercase tracking-wider text-deep-forest"
            >
              <Eye className="h-3.5 w-3.5" />
              Open preview
            </Link>
          </div>
        )}
      />

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_1.1fr]">
        <div className="rounded-2xl border border-soft-border bg-white p-5">
          <StorefrontStoryEditorForm
            key={formKey}
            initial={formSeed}
            editingId={editingId}
            onCancel={editingId ? resetForm : null}
            onSaved={() => {
              refetch();
              if (!editingId) resetForm();
            }}
          />
        </div>

        <div className="rounded-2xl border border-soft-border bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-cormorant text-xl font-semibold text-deep-forest">All stories</h2>
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-1 font-inter text-xs font-bold text-neon-paddy"
            >
              <Plus className="h-3.5 w-3.5" />
              New
            </button>
          </div>
          {isLoading ? (
            <p className="mt-4 font-inter text-sm text-deep-forest/50">Loading…</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {stories.map((story) => {
                const ready = isStorefrontStoryPublishReady(story);
                return (
                  <li key={story.id} className="flex items-start justify-between gap-3 rounded-xl border border-soft-border/70 p-3">
                    <div>
                      <p className="font-inter text-sm font-semibold text-deep-forest">{story.title}</p>
                      <p className="mt-0.5 font-inter text-[11px] text-deep-forest/50">
                        {story.status} · priority {story.display_priority}
                        {story.video_url ? ' · has video' : ' · no video'}
                        {ready ? ' · publish-ready' : ' · not publish-ready'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openStory(story)}
                      className="font-inter text-xs font-bold text-neon-paddy"
                    >
                      Edit
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
