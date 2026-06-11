import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appClient } from '@/api/appClient';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { motion } from 'framer-motion';
import { ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { useState } from 'react';

function SEORow({ label, value, field, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value || '');

  const handleSave = () => { onSave(field, val); setEditing(false); };

  return (
    <div className="border-b border-border/50 py-4">
      <p className="font-inter text-xs text-rain-cloud/45 uppercase tracking-wider mb-2">{label}</p>
      {editing ? (
        <div className="flex gap-2">
          <input
            value={val}
            onChange={e => setVal(e.target.value)}
            className="flex-1 border border-border rounded-xl px-4 py-2 font-inter text-sm text-rain-cloud focus:outline-none focus:border-forest-canopy"
          />
          <button onClick={handleSave} className="py-2 px-4 bg-forest-canopy text-white font-inter text-xs rounded-xl">Save</button>
          <button onClick={() => setEditing(false)} className="py-2 px-4 border border-border font-inter text-xs rounded-xl text-rain-cloud/60">Cancel</button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4">
          <p className="font-inter text-sm text-rain-cloud/70 flex-1 truncate">{val || <span className="italic text-rain-cloud/30">Not set</span>}</p>
          <button onClick={() => setEditing(true)} className="font-inter text-xs text-wet-earth hover:text-wet-earth/70 flex-shrink-0">Edit</button>
        </div>
      )}
    </div>
  );
}

export default function AdminSEO() {
  const qc = useQueryClient();

  const { data: products = [] } = useQuery({
    queryKey: ['seo-products'],
    queryFn: () => appClient.entities.Product.filter({ is_published: true }, '-created_date', 50),
  });

  const { data: stories = [] } = useQuery({
    queryKey: ['seo-stories'],
    queryFn: () => appClient.entities.Story.filter({ is_published: true }, '-created_date', 50),
  });

  const updateProduct = useMutation({
    mutationFn: ({ id, field, value }) => appClient.entities.Product.update(id, { [field]: value }),
    onSuccess: () => qc.invalidateQueries(['seo-products']),
  });

  const updateStory = useMutation({
    mutationFn: ({ id, field, value }) => appClient.entities.Story.update(id, { [field]: value }),
    onSuccess: () => qc.invalidateQueries(['seo-stories']),
  });

  const missingProductSEO = products.filter(p => !p.seo_title || !p.seo_description);
  const hasSEO = products.filter(p => p.seo_title && p.seo_description);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <AdminPageHeader
        title="SEO Manager"
        description="Manage metadata, titles, and descriptions for search engines."
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Products', count: products.length, color: '#6E5846' },
          { label: 'With SEO', count: hasSEO.length, color: '#5B7A4B' },
          { label: 'Missing SEO', count: missingProductSEO.length, color: '#E74C3C' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="font-inter text-xs text-rain-cloud/45 uppercase tracking-wider">{s.label}</p>
            <p className="font-cormorant text-4xl font-medium mt-2" style={{ color: s.color }}>{s.count}</p>
          </motion.div>
        ))}
      </div>

      {/* Products SEO */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-cormorant text-xl text-rain-cloud font-medium">Products SEO</h2>
          <p className="font-inter text-xs text-rain-cloud/40 mt-0.5">Set seo_title and seo_description for each product</p>
        </div>
        <div className="divide-y divide-border/40">
          {products.map(product => (
            <div key={product.id} className="px-6 py-4">
              <div className="flex items-start gap-3 mb-3">
                {product.seo_title && product.seo_description
                  ? <CheckCircle className="w-4 h-4 text-forest-canopy flex-shrink-0 mt-0.5" />
                  : <AlertCircle className="w-4 h-4 text-warm-turmeric flex-shrink-0 mt-0.5" />
                }
                <div className="flex-1">
                  <p className="font-cormorant text-base text-rain-cloud font-medium">{product.title}</p>
                  <SEORow label="SEO Title" value={product.seo_title} field="seo_title"
                    onSave={(field, value) => updateProduct.mutate({ id: product.id, field, value })} />
                  <SEORow label="SEO Description" value={product.seo_description} field="seo_description"
                    onSave={(field, value) => updateProduct.mutate({ id: product.id, field, value })} />
                </div>
              </div>
            </div>
          ))}
          {products.length === 0 && (
            <p className="font-inter text-sm text-rain-cloud/40 px-6 py-8">No published products yet.</p>
          )}
        </div>
      </div>

      {/* Stories SEO */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-cormorant text-xl text-rain-cloud font-medium">Stories SEO</h2>
          <p className="font-inter text-xs text-rain-cloud/40 mt-0.5">Stories use their title and excerpt for meta tags automatically</p>
        </div>
        <div className="divide-y divide-border/40">
          {stories.map(story => (
            <div key={story.id} className="px-6 py-4 flex items-center gap-3">
              <CheckCircle className="w-4 h-4 text-forest-canopy flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-cormorant text-base text-rain-cloud font-medium truncate">{story.title}</p>
                <p className="font-inter text-xs text-rain-cloud/40 truncate">{story.excerpt || 'No excerpt set'}</p>
              </div>
              <a href={`/stories/${story.id}`} target="_blank" rel="noopener noreferrer" className="text-rain-cloud/30 hover:text-rain-cloud/60">
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          ))}
          {stories.length === 0 && (
            <p className="font-inter text-sm text-rain-cloud/40 px-6 py-8">No published stories yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}