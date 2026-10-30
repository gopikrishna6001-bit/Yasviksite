import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Film } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import EditorialCampaignsTab from '@/components/admin/editorial/EditorialCampaignsTab';
import EditorialHeroesTab from '@/components/admin/editorial/EditorialHeroesTab';
import EditorialStoriesTab from '@/components/admin/editorial/EditorialStoriesTab';
import EditorialLaunchReadinessTab from '@/components/admin/editorial/EditorialLaunchReadinessTab';

const TABS = [
  { id: 'campaigns', label: 'Campaigns', hint: '4 homepage slides' },
  { id: 'heroes', label: 'Hero Products', hint: '6 launch Heroes' },
  { id: 'stories', label: 'Stories', hint: 'Video + poster CMS' },
  { id: 'readiness', label: 'Launch Readiness', hint: 'Gates + go-live' },
];

export default function AdminEditorialStorefront() {
  const [tab, setTab] = useState(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash.replace('#', '') : '';
    return TABS.some((t) => t.id === hash) ? hash : 'campaigns';
  });

  const panel = useMemo(() => {
    switch (tab) {
      case 'heroes':
        return <EditorialHeroesTab />;
      case 'stories':
        return <EditorialStoriesTab />;
      case 'readiness':
        return <EditorialLaunchReadinessTab />;
      default:
        return <EditorialCampaignsTab />;
    }
  }, [tab]);

  const selectTab = (id) => {
    setTab(id);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${id}`);
    }
  };

  return (
    <div className="p-6 md:p-8">
      <AdminPageHeader
        title="Editorial Storefront"
        description="Launch console — campaigns here; Heroes and Stories deep-link to existing Products admin and Stories CMS. Activation stays disabled until gates pass. Public homepage stays legacy until the flag is enabled."
        action={(
          <div className="flex flex-wrap gap-2">
            <Link
              to="/admin/storefront-preview/editorial"
              className="inline-flex items-center gap-2 rounded-full border border-soft-border bg-white px-4 py-2 font-inter text-xs font-bold uppercase tracking-wider text-deep-forest"
            >
              <Eye className="h-3.5 w-3.5" />
              Preview
            </Link>
            <Link
              to="/admin/storefront-stories"
              className="inline-flex items-center gap-2 rounded-full border border-soft-border bg-white px-4 py-2 font-inter text-xs font-bold uppercase tracking-wider text-deep-forest"
            >
              <Film className="h-3.5 w-3.5" />
              Stories CMS
            </Link>
          </div>
        )}
      />

      <div className="mb-4 rounded-2xl border border-soft-border bg-white px-4 py-3">
        <p className="font-inter text-sm text-deep-forest/70">
          Path: <span className="font-semibold text-deep-forest">/admin/editorial-storefront</span>
          {' · '}
          Sidebar: Core → Editorial Storefront
          {' · '}
          No SQL or manual media URLs required — use the upload controls on each tab.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 border-b border-soft-border pb-3">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => selectTab(item.id)}
            className={`rounded-full px-4 py-2 text-left transition ${
              tab === item.id
                ? 'bg-deep-forest text-warm-cream'
                : 'bg-white text-deep-forest/70 ring-1 ring-soft-border hover:text-deep-forest'
            }`}
          >
            <span className="block font-inter text-[11px] font-bold uppercase tracking-wider">{item.label}</span>
            <span className={`mt-0.5 block font-inter text-[10px] ${tab === item.id ? 'text-warm-cream/70' : 'text-deep-forest/40'}`}>
              {item.hint}
            </span>
          </button>
        ))}
      </div>

      {panel}
    </div>
  );
}
