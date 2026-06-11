import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appClient } from '@/api/appClient';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import ImageUploadField from '../../components/admin/ImageUploadField';
import EntityTable from '../../components/admin/EntityTable';
import EntityFormModal from '../../components/admin/EntityFormModal';
import { Plus, Loader2 } from 'lucide-react';

const EMPTY = { title: '', slug: '', location_label: '', tagline: '', description: '', long_narrative: '', cover_image: '', hero_video: '', sort_order: 0, is_featured: false, is_published: false };

function isInstagramUrl(url) {
  return url && url.includes('instagram.com/reel');
}

function JourneyForm({ data, onChange }) {
  const [fetchingThumb, setFetchingThumb] = useState(false);
  const f = (key) => (e) => onChange({ ...data, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const handleGenerateCover = async () => {
    if (data.cover_image) return;
    if (!data.title && !data.tagline) {
      alert('Please fill in the Title or Tagline first.');
      return;
    }
    setFetchingThumb(true);
    const prompt = `A cinematic, atmospheric photograph for a journey titled "${data.title || data.tagline}". ${data.tagline ? `Mood: ${data.tagline}.` : ''} Natural light, documentary style, India, food and farming culture. No text overlays.`;
    const res = await appClient.integrations.Core.GenerateImage({ prompt });
    if (res?.url) {
      onChange({ ...data, cover_image: res.url });
    }
    setFetchingThumb(false);
  };

  return (
    <div className="space-y-4">
      {[
        { key: 'title', label: 'Title *', type: 'text' },
        { key: 'location_label', label: 'Location Label (e.g. KURMAGRAM)', type: 'text' },
        { key: 'tagline', label: 'Tagline *', type: 'text' },
        { key: 'sort_order', label: 'Sort Order', type: 'number' },
      ].map(({ key, label, type }) => (
        <div key={key}>
          <label className="font-inter text-xs text-rain-cloud/55 block mb-1">{label}</label>
          <input type={type} value={data[key] || ''} onChange={f(key)} className="w-full border border-border rounded-xl px-4 py-2.5 font-inter text-sm focus:outline-none focus:border-forest-canopy" />
        </div>
      ))}

      {/* Instagram Reel URL */}
      <div>
        <label className="font-inter text-xs text-rain-cloud/55 block mb-1">Instagram Reel URL</label>
        <input
          type="text"
          value={data.hero_video || ''}
          onChange={f('hero_video')}
          placeholder="https://www.instagram.com/reel/ABC123/"
          className="w-full border border-border rounded-xl px-4 py-2.5 font-inter text-sm focus:outline-none focus:border-forest-canopy"
        />
      </div>

      {/* Cover Image — upload + URL + AI generate */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="font-inter text-xs text-rain-cloud/55">Cover Image</span>
          <button
            type="button"
            onClick={handleGenerateCover}
            disabled={fetchingThumb || !!data.cover_image}
            className="flex items-center gap-1.5 font-inter text-[10px] text-forest-canopy disabled:opacity-40 hover:underline"
          >
            {fetchingThumb ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            {fetchingThumb ? 'Generating…' : 'AI Generate'}
          </button>
        </div>
        <ImageUploadField value={data.cover_image} onChange={(url) => onChange({ ...data, cover_image: url })} aspectClass="aspect-video" />
      </div>
      {[
        { key: 'description', label: 'Short Description', rows: 2 },
        { key: 'long_narrative', label: 'Long Narrative', rows: 5 },
      ].map(({ key, label, rows }) => (
        <div key={key}>
          <label className="font-inter text-xs text-rain-cloud/55 block mb-1">{label}</label>
          <textarea value={data[key] || ''} onChange={f(key)} rows={rows} className="w-full border border-border rounded-xl px-4 py-2.5 font-inter text-sm focus:outline-none resize-none" />
        </div>
      ))}
      <div className="flex gap-6">
        {[{ key: 'is_featured', label: 'Featured' }, { key: 'is_published', label: 'Published' }].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={!!data[key]} onChange={f(key)} className="w-4 h-4 accent-forest-canopy" />
            <span className="font-inter text-sm text-rain-cloud/70">{label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function AdminJourneys() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const { data: journeys = [], isLoading } = useQuery({ queryKey: ['admin-journeys'], queryFn: () => appClient.entities.Journey.list('sort_order', 100) });
  const createMut = useMutation({ mutationFn: (d) => appClient.entities.Journey.create(d), onSuccess: () => { qc.invalidateQueries(['admin-journeys']); closeModal(); } });
  const updateMut = useMutation({ mutationFn: ({ id, d }) => appClient.entities.Journey.update(id, d), onSuccess: () => { qc.invalidateQueries(['admin-journeys']); closeModal(); } });
  const deleteMut = useMutation({ mutationFn: (id) => appClient.entities.Journey.delete(id), onSuccess: () => qc.invalidateQueries(['admin-journeys']) });

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (item) => { setEditing(item); setForm({ ...item }); setModal(true); };
  const closeModal = () => { setModal(false); setEditing(null); setForm(EMPTY); };
  const handleSave = () => { if (editing) updateMut.mutate({ id: editing.id, d: form }); else createMut.mutate(form); };
  const handleToggle = (item) => updateMut.mutate({ id: item.id, d: { is_published: !item.is_published } });

  const columns = [
    { key: 'cover_image', label: '', render: (item) => item.cover_image ? <img src={item.cover_image} alt="" className="w-12 h-8 rounded-lg object-cover" /> : <div className="w-12 h-8 rounded-lg bg-temple-stone/30" /> },
    { key: 'location_label', label: 'Location', render: (item) => <span className="font-inter text-xs text-moss-green tracking-widest uppercase">{item.location_label}</span> },
    { key: 'tagline', label: 'Tagline' },
    { key: 'is_published', label: 'Status', render: (item) => <span className={`font-inter text-xs px-2.5 py-1 rounded-full ${item.is_published ? 'bg-forest-canopy/15 text-forest-canopy' : 'bg-temple-stone/30 text-rain-cloud/40'}`}>{item.is_published ? 'Live' : 'Draft'}</span> },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <AdminPageHeader title="Journeys" description="Manage cinematic journey narratives."
        action={<button onClick={openCreate} className="flex items-center gap-2 py-2.5 px-5 bg-forest-canopy text-white font-inter text-sm rounded-full hover:bg-forest-canopy/90"><Plus className="w-4 h-4" /> Add Journey</button>}
      />
      <div className="bg-white rounded-2xl shadow-sm p-1">
        <EntityTable items={journeys} columns={columns} isLoading={isLoading} onEdit={openEdit} onDelete={(item) => deleteMut.mutate(item.id)} onTogglePublish={handleToggle} />
      </div>
      <EntityFormModal open={modal} onClose={closeModal} title={editing ? 'Edit Journey' : 'New Journey'}>
        <JourneyForm data={form} onChange={setForm} />
        <div className="flex gap-3 mt-6 pt-4 border-t border-border">
          <button onClick={closeModal} className="flex-1 py-2.5 rounded-full border border-border font-inter text-sm text-rain-cloud/60">Cancel</button>
          <button onClick={handleSave} disabled={createMut.isPending || updateMut.isPending} className="flex-1 py-2.5 rounded-full bg-forest-canopy text-white font-inter text-sm disabled:opacity-50">{editing ? 'Save' : 'Create'}</button>
        </div>
      </EntityFormModal>
    </div>
  );
}