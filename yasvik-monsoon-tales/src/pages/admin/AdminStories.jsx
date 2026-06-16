import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appClient } from '@/api/appClient';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import EntityTable from '../../components/admin/EntityTable';
import EntityFormModal from '../../components/admin/EntityFormModal';
import { Plus } from 'lucide-react';
import ImageUploadField from '../../components/admin/ImageUploadField';

const EMPTY = { title: '', slug: '', excerpt: '', body: '', cover_image: '', read_time_minutes: '', is_featured: false, is_published: false };

function StoryForm({ data, onChange }) {
  const f = (key) => (e) => onChange({ ...data, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  return (
    <div className="space-y-4">
      <div>
        <label className="font-inter text-xs text-rain-cloud/55 block mb-1">Title *</label>
        <input type="text" value={data.title || ''} onChange={f('title')} className="w-full border border-border rounded-xl px-4 py-2.5 font-inter text-sm focus:outline-none focus:border-forest-canopy" />
      </div>
      <ImageUploadField label="Cover Image" value={data.cover_image} onChange={(url) => onChange({ ...data, cover_image: url })} aspectClass="aspect-video" />
      <div>
        <label className="font-inter text-xs text-rain-cloud/55 block mb-1">Read Time (minutes)</label>
        <input type="number" value={data.read_time_minutes || ''} onChange={f('read_time_minutes')} className="w-full border border-border rounded-xl px-4 py-2.5 font-inter text-sm focus:outline-none focus:border-forest-canopy" />
      </div>
      {[{ key: 'excerpt', label: 'Excerpt', rows: 2 }, { key: 'body', label: 'Body Text', rows: 6 }].map(({ key, label, rows }) => (
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

export default function AdminStories() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const { data: stories = [], isLoading } = useQuery({ queryKey: ['admin-stories'], queryFn: () => appClient.entities.Story.list('-created_date', 100) });
  const createMut = useMutation({ mutationFn: (d) => appClient.entities.Story.create(d), onSuccess: () => { qc.invalidateQueries(['admin-stories']); closeModal(); } });
  const updateMut = useMutation({ mutationFn: ({ id, d }) => appClient.entities.Story.update(id, d), onSuccess: () => { qc.invalidateQueries(['admin-stories']); closeModal(); } });
  const deleteMut = useMutation({ mutationFn: (id) => appClient.entities.Story.delete(id), onSuccess: () => qc.invalidateQueries(['admin-stories']) });

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (item) => { setEditing(item); setForm({ ...item }); setModal(true); };
  const closeModal = () => { setModal(false); setEditing(null); setForm(EMPTY); };
  const handleSave = () => { if (editing) updateMut.mutate({ id: editing.id, d: form }); else createMut.mutate(form); };
  const handleToggle = (item) => updateMut.mutate({ id: item.id, d: { is_published: !item.is_published } });

  const columns = [
    { key: 'cover_image', label: '', render: (item) => item.cover_image ? <img src={item.cover_image} alt="" className="w-16 h-10 rounded-lg object-cover" /> : <div className="w-16 h-10 rounded-lg bg-temple-stone/30" /> },
    { key: 'title', label: 'Title' },
    { key: 'read_time_minutes', label: 'Read', render: (item) => item.read_time_minutes ? <span className="font-inter text-xs text-rain-cloud/50">{item.read_time_minutes}m</span> : '—' },
    { key: 'is_published', label: 'Status', render: (item) => <span className={`font-inter text-xs px-2.5 py-1 rounded-full ${item.is_published ? 'bg-forest-canopy/15 text-forest-canopy' : 'bg-temple-stone/30 text-rain-cloud/40'}`}>{item.is_published ? 'Live' : 'Draft'}</span> },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <AdminPageHeader title="Stories" description="Manage editorial narratives and articles."
        action={<button onClick={openCreate} className="flex items-center gap-2 py-2.5 px-5 bg-rain-cloud text-white font-inter text-sm rounded-full hover:bg-rain-cloud/90"><Plus className="w-4 h-4" /> New Story</button>}
      />
      <div className="bg-white rounded-2xl shadow-sm p-1">
        <EntityTable items={stories} columns={columns} isLoading={isLoading} onEdit={openEdit} onDelete={(item) => deleteMut.mutate(item.id)} onTogglePublish={handleToggle} />
      </div>
      <EntityFormModal open={modal} onClose={closeModal} title={editing ? 'Edit Story' : 'New Story'}>
        <StoryForm data={form} onChange={setForm} />
        <div className="flex gap-3 mt-6 pt-4 border-t border-border">
          <button onClick={closeModal} className="flex-1 py-2.5 rounded-full border border-border font-inter text-sm text-rain-cloud/60">Cancel</button>
          <button onClick={handleSave} disabled={createMut.isPending || updateMut.isPending} className="flex-1 py-2.5 rounded-full bg-rain-cloud text-white font-inter text-sm disabled:opacity-50">{editing ? 'Save' : 'Create'}</button>
        </div>
      </EntityFormModal>
    </div>
  );
}