import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appClient } from '@/api/appClient';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import EntityTable from '../../components/admin/EntityTable';
import EntityFormModal from '../../components/admin/EntityFormModal';
import { Plus } from 'lucide-react';
import ImageUploadField from '../../components/admin/ImageUploadField';

const EMPTY = { name: '', role: '', location_label: '', portrait_image: '', short_bio: '', long_story: '', quote: '', is_featured: false, is_published: false };

function PersonForm({ data, onChange }) {
  const f = (key) => (e) => onChange({ ...data, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  return (
    <div className="space-y-4">
      {[
        { key: 'name', label: 'Name *', type: 'text' },
        { key: 'role', label: 'Role (e.g. Rice Farmer)', type: 'text' },
        { key: 'location_label', label: 'Location', type: 'text' },
        { key: 'quote', label: 'Signature Quote', type: 'text' },
      ].map(({ key, label, type }) => (
        <div key={key}>
          <label className="font-inter text-xs text-rain-cloud/55 block mb-1">{label}</label>
          <input type={type} value={data[key] || ''} onChange={f(key)} className="w-full border border-border rounded-xl px-4 py-2.5 font-inter text-sm focus:outline-none focus:border-forest-canopy" />
        </div>
      ))}
      <ImageUploadField label="Portrait Image" value={data.portrait_image} onChange={(url) => onChange({ ...data, portrait_image: url })} aspectClass="aspect-square" />
      {[{ key: 'short_bio', label: 'Short Bio', rows: 2 }, { key: 'long_story', label: 'Long Story', rows: 4 }].map(({ key, label, rows }) => (
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

export default function AdminPeople() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const { data: people = [], isLoading } = useQuery({ queryKey: ['admin-people'], queryFn: () => appClient.entities.Person.list('-created_date', 100) });
  const createMut = useMutation({
    mutationFn: (d) => appClient.entities.Person.create(d),
    onSuccess: () => { qc.invalidateQueries(['admin-people']); closeModal(); },
    onError: (err) => { alert(err?.message || 'Failed to create person'); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, d }) => appClient.entities.Person.update(id, d),
    onSuccess: () => { qc.invalidateQueries(['admin-people']); closeModal(); },
    onError: (err) => { alert(err?.message || 'Failed to update person'); },
  });
  const deleteMut = useMutation({ mutationFn: (id) => appClient.entities.Person.delete(id), onSuccess: () => qc.invalidateQueries(['admin-people']) });

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (item) => { setEditing(item); setForm({ ...item }); setModal(true); };
  const closeModal = () => { setModal(false); setEditing(null); setForm(EMPTY); };
  const handleSave = () => { if (editing) updateMut.mutate({ id: editing.id, d: form }); else createMut.mutate(form); };
  const handleToggle = (item) => updateMut.mutate({ id: item.id, d: { is_published: !item.is_published } });

  const columns = [
    { key: 'portrait_image', label: '', render: (item) => item.portrait_image ? <img src={item.portrait_image} alt="" className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 rounded-full bg-temple-stone/30" /> },
    { key: 'name', label: 'Name' },
    { key: 'role', label: 'Role' },
    { key: 'location_label', label: 'Location' },
    { key: 'is_published', label: 'Status', render: (item) => <span className={`font-inter text-xs px-2.5 py-1 rounded-full ${item.is_published ? 'bg-forest-canopy/15 text-forest-canopy' : 'bg-temple-stone/30 text-rain-cloud/40'}`}>{item.is_published ? 'Live' : 'Draft'}</span> },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <AdminPageHeader title="People" description="Manage artisan and farmer profiles."
        action={<button onClick={openCreate} className="flex items-center gap-2 py-2.5 px-5 bg-warm-turmeric text-white font-inter text-sm rounded-full hover:opacity-90"><Plus className="w-4 h-4" /> Add Person</button>}
      />
      <div className="bg-white rounded-2xl shadow-sm p-1">
        <EntityTable items={people} columns={columns} isLoading={isLoading} onEdit={openEdit} onDelete={(item) => deleteMut.mutate(item.id)} onTogglePublish={handleToggle} />
      </div>
      <EntityFormModal open={modal} onClose={closeModal} title={editing ? 'Edit Person' : 'New Person'}>
        <PersonForm data={form} onChange={setForm} />
        <div className="flex gap-3 mt-6 pt-4 border-t border-border">
          <button onClick={closeModal} className="flex-1 py-2.5 rounded-full border border-border font-inter text-sm text-rain-cloud/60">Cancel</button>
          <button onClick={handleSave} disabled={createMut.isPending || updateMut.isPending} className="flex-1 py-2.5 rounded-full bg-warm-turmeric text-white font-inter text-sm disabled:opacity-50">{editing ? 'Save' : 'Create'}</button>
        </div>
      </EntityFormModal>
    </div>
  );
}
