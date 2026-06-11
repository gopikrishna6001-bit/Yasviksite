import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appClient } from '@/api/appClient';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import EntityTable from '../../components/admin/EntityTable';
import EntityFormModal from '../../components/admin/EntityFormModal';
import { Plus } from 'lucide-react';
import ImageUploadField from '../../components/admin/ImageUploadField';

const EMPTY = { title: '', slug: '', description: '', cover_image: '', is_featured: false, is_active: true, sort_order: 0 };

function CollectionForm({ data, onChange }) {
  const f = (key) => (e) => onChange({ ...data, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  return (
    <div className="space-y-4">
      {[
        { key: 'title', label: 'Title *', type: 'text' },
        { key: 'slug', label: 'Slug', type: 'text' },
        { key: 'sort_order', label: 'Sort Order', type: 'number' },
      ].map(({ key, label, type }) => (
        <div key={key}>
          <label className="font-inter text-xs text-rain-cloud/55 block mb-1">{label}</label>
          <input type={type} value={data[key] || ''} onChange={f(key)} className="w-full border border-border rounded-xl px-4 py-2.5 font-inter text-sm focus:outline-none focus:border-forest-canopy" />
        </div>
      ))}
      <ImageUploadField label="Cover Image" value={data.cover_image} onChange={(url) => onChange({ ...data, cover_image: url })} aspectClass="aspect-video" />
      <div>
        <label className="font-inter text-xs text-rain-cloud/55 block mb-1">Description</label>
        <textarea value={data.description || ''} onChange={f('description')} rows={3} className="w-full border border-border rounded-xl px-4 py-2.5 font-inter text-sm focus:outline-none resize-none" />
      </div>
      <div className="flex gap-6">
        {[{ key: 'is_featured', label: 'Featured' }, { key: 'is_active', label: 'Active' }].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={!!data[key]} onChange={f(key)} className="w-4 h-4 accent-forest-canopy" />
            <span className="font-inter text-sm text-rain-cloud/70">{label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function AdminCollections() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const { data: collections = [], isLoading } = useQuery({ queryKey: ['admin-collections'], queryFn: () => appClient.entities.Collection.list('sort_order', 100) });
  const createMut = useMutation({ mutationFn: (d) => appClient.entities.Collection.create(d), onSuccess: () => { qc.invalidateQueries(['admin-collections']); closeModal(); } });
  const updateMut = useMutation({ mutationFn: ({ id, d }) => appClient.entities.Collection.update(id, d), onSuccess: () => { qc.invalidateQueries(['admin-collections']); closeModal(); } });
  const deleteMut = useMutation({ mutationFn: (id) => appClient.entities.Collection.delete(id), onSuccess: () => qc.invalidateQueries(['admin-collections']) });

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (item) => { setEditing(item); setForm({ ...item }); setModal(true); };
  const closeModal = () => { setModal(false); setEditing(null); setForm(EMPTY); };
  const handleSave = () => { if (editing) updateMut.mutate({ id: editing.id, d: form }); else createMut.mutate(form); };

  const columns = [
    { key: 'cover_image', label: '', render: (item) => item.cover_image ? <img src={item.cover_image} alt="" className="w-12 h-8 rounded-lg object-cover" /> : <div className="w-12 h-8 rounded-lg bg-temple-stone/30" /> },
    { key: 'title', label: 'Title' },
    { key: 'is_active', label: 'Active', render: (item) => <span className={`font-inter text-xs px-2.5 py-1 rounded-full ${item.is_active ? 'bg-forest-canopy/15 text-forest-canopy' : 'bg-temple-stone/30 text-rain-cloud/40'}`}>{item.is_active ? 'Yes' : 'No'}</span> },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <AdminPageHeader title="Collections" description="Curated product groupings with narrative identity."
        action={<button onClick={openCreate} className="flex items-center gap-2 py-2.5 px-5 bg-wet-earth text-white font-inter text-sm rounded-full hover:bg-wet-earth/90"><Plus className="w-4 h-4" /> Add Collection</button>}
      />
      <div className="bg-white rounded-2xl shadow-sm p-1">
        <EntityTable items={collections} columns={columns} isLoading={isLoading} onEdit={openEdit} onDelete={(item) => deleteMut.mutate(item.id)} />
      </div>
      <EntityFormModal open={modal} onClose={closeModal} title={editing ? 'Edit Collection' : 'New Collection'}>
        <CollectionForm data={form} onChange={setForm} />
        <div className="flex gap-3 mt-6 pt-4 border-t border-border">
          <button onClick={closeModal} className="flex-1 py-2.5 rounded-full border border-border font-inter text-sm text-rain-cloud/60">Cancel</button>
          <button onClick={handleSave} disabled={createMut.isPending || updateMut.isPending} className="flex-1 py-2.5 rounded-full bg-wet-earth text-white font-inter text-sm disabled:opacity-50">{editing ? 'Save' : 'Create'}</button>
        </div>
      </EntityFormModal>
    </div>
  );
}