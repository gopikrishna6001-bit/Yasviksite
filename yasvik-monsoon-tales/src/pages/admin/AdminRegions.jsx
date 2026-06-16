import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appClient } from '@/api/appClient';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import EntityTable from '../../components/admin/EntityTable';
import EntityFormModal from '../../components/admin/EntityFormModal';
import { Plus } from 'lucide-react';
import ImageUploadField from '../../components/admin/ImageUploadField';

const EMPTY = { name: '', state: '', emotional_label: '', short_description: '', cover_image: '' };

function RegionForm({ data, onChange }) {
  const f = (key) => (e) => onChange({ ...data, [key]: e.target.value });
  return (
    <div className="space-y-4">
      {[
        { key: 'name', label: 'Name *', type: 'text' },
        { key: 'state', label: 'State', type: 'text' },
        { key: 'emotional_label', label: 'Emotional Label (e.g. The Monsoon Heartland)', type: 'text' },
      ].map(({ key, label, type }) => (
        <div key={key}>
          <label className="font-inter text-xs text-rain-cloud/55 block mb-1">{label}</label>
          <input type={type} value={data[key] || ''} onChange={f(key)} className="w-full border border-border rounded-xl px-4 py-2.5 font-inter text-sm focus:outline-none focus:border-forest-canopy" />
        </div>
      ))}
      <ImageUploadField label="Cover Image" value={data.cover_image} onChange={(url) => onChange({ ...data, cover_image: url })} aspectClass="aspect-video" />
      <div>
        <label className="font-inter text-xs text-rain-cloud/55 block mb-1">Short Description</label>
        <textarea value={data.short_description || ''} onChange={f('short_description')} rows={3} className="w-full border border-border rounded-xl px-4 py-2.5 font-inter text-sm focus:outline-none resize-none" />
      </div>
    </div>
  );
}

export default function AdminRegions() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const { data: regions = [], isLoading } = useQuery({ queryKey: ['admin-regions'], queryFn: () => appClient.entities.Region.list('-created_date', 100) });
  const createMut = useMutation({ mutationFn: (d) => appClient.entities.Region.create(d), onSuccess: () => { qc.invalidateQueries(['admin-regions']); closeModal(); } });
  const updateMut = useMutation({ mutationFn: ({ id, d }) => appClient.entities.Region.update(id, d), onSuccess: () => { qc.invalidateQueries(['admin-regions']); closeModal(); } });
  const deleteMut = useMutation({ mutationFn: (id) => appClient.entities.Region.delete(id), onSuccess: () => qc.invalidateQueries(['admin-regions']) });

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (item) => { setEditing(item); setForm({ ...item }); setModal(true); };
  const closeModal = () => { setModal(false); setEditing(null); setForm(EMPTY); };
  const handleSave = () => { if (editing) updateMut.mutate({ id: editing.id, d: form }); else createMut.mutate(form); };

  const columns = [
    { key: 'cover_image', label: '', render: (item) => item.cover_image ? <img src={item.cover_image} alt="" className="w-16 h-10 rounded-lg object-cover" /> : <div className="w-16 h-10 rounded-lg bg-temple-stone/30" /> },
    { key: 'name', label: 'Region' },
    { key: 'state', label: 'State' },
    { key: 'emotional_label', label: 'Label', render: (item) => <span className="font-inter text-xs text-rain-cloud/50 italic">{item.emotional_label || '—'}</span> },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <AdminPageHeader title="Regions" description="Manage geographic roots and landscapes."
        action={<button onClick={openCreate} className="flex items-center gap-2 py-2.5 px-5 bg-moss-green text-white font-inter text-sm rounded-full hover:opacity-90"><Plus className="w-4 h-4" /> Add Region</button>}
      />
      <div className="bg-white rounded-2xl shadow-sm p-1">
        <EntityTable items={regions} columns={columns} isLoading={isLoading} onEdit={openEdit} onDelete={(item) => deleteMut.mutate(item.id)} />
      </div>
      <EntityFormModal open={modal} onClose={closeModal} title={editing ? 'Edit Region' : 'New Region'}>
        <RegionForm data={form} onChange={setForm} />
        <div className="flex gap-3 mt-6 pt-4 border-t border-border">
          <button onClick={closeModal} className="flex-1 py-2.5 rounded-full border border-border font-inter text-sm text-rain-cloud/60">Cancel</button>
          <button onClick={handleSave} disabled={createMut.isPending || updateMut.isPending} className="flex-1 py-2.5 rounded-full bg-moss-green text-white font-inter text-sm disabled:opacity-50">{editing ? 'Save' : 'Create'}</button>
        </div>
      </EntityFormModal>
    </div>
  );
}