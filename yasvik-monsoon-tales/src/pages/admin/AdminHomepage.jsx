import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appClient } from '@/api/appClient';
import { motion } from 'framer-motion';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import EntityFormModal from '../../components/admin/EntityFormModal';
import { Plus, GripVertical, Eye, EyeOff, Pencil, Trash2 } from 'lucide-react';
import ImageUploadField from '../../components/admin/ImageUploadField';

const SECTION_TYPES = ['hero', 'journeys', 'products', 'people', 'stories', 'quote', 'category_grid', 'collection'];
const BG_STYLES = ['rain_mist', 'wet_earth', 'forest_canopy', 'temple_stone', 'rain_cloud', 'transparent'];
const EMPTY = { section_type: 'hero', title: '', subtitle: '', body_text: '', cta_label: '', cta_url: '', media_url: '', media_type: 'image', sort_order: 0, is_active: true, background_style: 'rain_mist' };

function SectionForm({ data, onChange }) {
  const f = (key) => (e) => onChange({ ...data, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  return (
    <div className="space-y-4">
      <div>
        <label className="font-inter text-xs text-rain-cloud/55 block mb-1">Section Type</label>
        <select value={data.section_type || 'hero'} onChange={f('section_type')} className="w-full border border-border rounded-xl px-4 py-2.5 font-inter text-sm focus:outline-none">
          {SECTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      {[
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'subtitle', label: 'Subtitle', type: 'text' },
        { key: 'cta_label', label: 'CTA Button Label', type: 'text' },
        { key: 'cta_url', label: 'CTA URL', type: 'text' },
        { key: 'sort_order', label: 'Sort Order', type: 'number' },
      ].map(({ key, label, type }) => (
        <div key={key}>
          <label className="font-inter text-xs text-rain-cloud/55 block mb-1">{label}</label>
          <input type={type} value={data[key] || ''} onChange={f(key)} className="w-full border border-border rounded-xl px-4 py-2.5 font-inter text-sm focus:outline-none focus:border-forest-canopy" />
        </div>
      ))}
      <ImageUploadField label="Media Image" value={data.media_url} onChange={(url) => onChange({ ...data, media_url: url })} aspectClass="aspect-video" />
      <div>
        <label className="font-inter text-xs text-rain-cloud/55 block mb-1">Body Text</label>
        <textarea value={data.body_text || ''} onChange={f('body_text')} rows={2} className="w-full border border-border rounded-xl px-4 py-2.5 font-inter text-sm focus:outline-none resize-none" />
      </div>
      <div>
        <label className="font-inter text-xs text-rain-cloud/55 block mb-1">Background Style</label>
        <select value={data.background_style || 'rain_mist'} onChange={f('background_style')} className="w-full border border-border rounded-xl px-4 py-2.5 font-inter text-sm focus:outline-none">
          {BG_STYLES.map(b => <option key={b} value={b}>{b.replace(/_/g, ' ')}</option>)}
        </select>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={!!data.is_active} onChange={f('is_active')} className="w-4 h-4 accent-forest-canopy" />
        <span className="font-inter text-sm text-rain-cloud/70">Active</span>
      </label>
    </div>
  );
}

const BG_COLORS = { rain_mist: 'bg-rain-mist', wet_earth: 'bg-wet-earth', forest_canopy: 'bg-forest-canopy', temple_stone: 'bg-temple-stone', rain_cloud: 'bg-rain-cloud', transparent: 'bg-white' };

export default function AdminHomepage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const { data: sections = [], isLoading } = useQuery({ queryKey: ['admin-homepage'], queryFn: () => appClient.entities.HomepageSection.list('sort_order', 50) });
  const createMut = useMutation({ mutationFn: (d) => appClient.entities.HomepageSection.create(d), onSuccess: () => { qc.invalidateQueries(['admin-homepage']); closeModal(); } });
  const updateMut = useMutation({ mutationFn: ({ id, d }) => appClient.entities.HomepageSection.update(id, d), onSuccess: () => { qc.invalidateQueries(['admin-homepage']); closeModal(); } });
  const deleteMut = useMutation({ mutationFn: (id) => appClient.entities.HomepageSection.delete(id), onSuccess: () => qc.invalidateQueries(['admin-homepage']) });

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (item) => { setEditing(item); setForm({ ...item }); setModal(true); };
  const closeModal = () => { setModal(false); setEditing(null); setForm(EMPTY); };
  const handleSave = () => { if (editing) updateMut.mutate({ id: editing.id, d: form }); else createMut.mutate(form); };
  const handleToggle = (item) => updateMut.mutate({ id: item.id, d: { is_active: !item.is_active } });

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <AdminPageHeader title="Homepage" description="Control what sections appear on the homepage and in what order."
        action={<button onClick={openCreate} className="flex items-center gap-2 py-2.5 px-5 bg-rain-cloud text-white font-inter text-sm rounded-full hover:bg-rain-cloud/90"><Plus className="w-4 h-4" /> Add Section</button>}
      />

      {isLoading ? (
        <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-temple-stone/20 rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="space-y-3">
          {sections.map((section, i) => (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`flex items-center gap-4 p-4 rounded-xl border border-border bg-white ${!section.is_active ? 'opacity-50' : ''}`}
            >
              <GripVertical className="w-4 h-4 text-rain-cloud/25 flex-shrink-0" />
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${BG_COLORS[section.background_style] || 'bg-temple-stone'}`} />
              <div className="flex-1 min-w-0">
                <p className="font-inter text-sm text-rain-cloud/80 truncate">
                  <span className="text-rain-cloud/40 text-xs uppercase tracking-wider mr-2">{section.section_type}</span>
                  {section.title || '—'}
                </p>
                {section.subtitle && <p className="font-inter text-xs text-rain-cloud/40 truncate mt-0.5">{section.subtitle}</p>}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button onClick={() => handleToggle(section)} className="p-1.5 rounded-lg text-rain-cloud/35 hover:text-forest-canopy hover:bg-forest-canopy/10 transition-all">
                  {section.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button onClick={() => openEdit(section)} className="p-1.5 rounded-lg text-rain-cloud/35 hover:text-wet-earth hover:bg-wet-earth/10 transition-all">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => deleteMut.mutate(section.id)} className="p-1.5 rounded-lg text-rain-cloud/35 hover:text-red-500 hover:bg-red-50 transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <EntityFormModal open={modal} onClose={closeModal} title={editing ? 'Edit Section' : 'New Section'}>
        <SectionForm data={form} onChange={setForm} />
        <div className="flex gap-3 mt-6 pt-4 border-t border-border">
          <button onClick={closeModal} className="flex-1 py-2.5 rounded-full border border-border font-inter text-sm text-rain-cloud/60">Cancel</button>
          <button onClick={handleSave} disabled={createMut.isPending || updateMut.isPending} className="flex-1 py-2.5 rounded-full bg-rain-cloud text-white font-inter text-sm disabled:opacity-50">{editing ? 'Save' : 'Add Section'}</button>
        </div>
      </EntityFormModal>
    </div>
  );
}