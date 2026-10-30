import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appClient } from '@/api/appClient';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { motion } from 'framer-motion';
import { ExternalLink, CheckCircle, AlertCircle, Search, Sparkles } from 'lucide-react';
import { buildProductSeoMeta } from '@/lib/productSeo';

function SEORow({ label, value, field, onSave, multiline = false }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value || '');

  const handleSave = () => { onSave(field, val); setEditing(false); };

  return (
    <div className="border-b border-border/50 py-3">
      <p className="font-inter text-xs text-rain-cloud/45 uppercase tracking-wider mb-2">{label}</p>
      {editing ? (
        <div className="flex gap-2">
          {multiline ? (
            <textarea
              value={val}
              onChange={(e) => setVal(e.target.value)}
              rows={3}
              className="flex-1 border border-border rounded-xl px-4 py-2 font-inter text-sm text-rain-cloud focus:outline-none focus:border-forest-canopy"
            />
          ) : (
            <input
              value={val}
              onChange={(e) => setVal(e.target.value)}
              className="flex-1 border border-border rounded-xl px-4 py-2 font-inter text-sm text-rain-cloud focus:outline-none focus:border-forest-canopy"
            />
          )}
          <button onClick={handleSave} className="py-2 px-4 bg-forest-canopy text-white font-inter text-xs rounded-xl self-start">Save</button>
          <button onClick={() => setEditing(false)} className="py-2 px-4 border border-border font-inter text-xs rounded-xl text-rain-cloud/60 self-start">Cancel</button>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-4">
          <p className="font-inter text-sm text-rain-cloud/70 flex-1">{val || <span className="italic text-rain-cloud/30">Not set — using auto-generated fallback</span>}</p>
          <button onClick={() => { setVal(value || ''); setEditing(true); }} className="font-inter text-xs text-wet-earth hover:text-wet-earth/70 flex-shrink-0">Edit</button>
        </div>
      )}
    </div>
  );
}

function hasExplicitSeo(product = {}) {
  return Boolean(String(product.seo_title || '').trim() && String(product.seo_description || '').trim());
}

export default function AdminSEO() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['seo-products'],
    queryFn: () => appClient.entities.Product.filter({ is_published: true }, 'name', 500),
  });

  const { data: stories = [] } = useQuery({
    queryKey: ['seo-stories'],
    queryFn: () => appClient.entities.Story.filter({ is_published: true }, '-created_date', 50),
  });

  const updateProduct = useMutation({
    mutationFn: ({ id, field, value }) => appClient.entities.Product.update(id, { [field]: value }),
    onSuccess: () => qc.invalidateQueries(['seo-products']),
  });

  const bulkBackfill = useMutation({
    mutationFn: async () => {
      const targets = products.filter((product) => !hasExplicitSeo(product));
      await Promise.all(targets.map(async (product) => {
        const seo = buildProductSeoMeta(product);
        const patch = {};
        if (!String(product.seo_title || '').trim()) patch.seo_title = seo.title;
        if (!String(product.seo_description || '').trim()) patch.seo_description = seo.description;
        if (!String(product.seo_keywords || '').trim()) patch.seo_keywords = seo.keywords;
        if (!Object.keys(patch).length) return;
        await appClient.entities.Product.update(product.id, patch);
      }));
      return targets.length;
    },
    onSuccess: (count) => {
      qc.invalidateQueries(['seo-products']);
      alert(`Auto-filled SEO for ${count} product${count === 1 ? '' : 's'}.`);
    },
    onError: (err) => alert(err?.message || 'Bulk SEO fill failed'),
  });

  const enriched = useMemo(() => products.map((product) => ({
    product,
    effective: buildProductSeoMeta(product),
    explicit: hasExplicitSeo(product),
  })), [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter(({ product, explicit }) => {
      if (filter === 'missing' && explicit) return false;
      if (filter === 'ready' && !explicit) return false;
      if (!q) return true;
      return String(product.title || '').toLowerCase().includes(q)
        || String(product.seo_title || '').toLowerCase().includes(q);
    });
  }, [enriched, search, filter]);

  const missingCount = enriched.filter((item) => !item.explicit).length;
  const readyCount = enriched.length - missingCount;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <AdminPageHeader
        title="SEO Manager"
        description="Titles, descriptions and Google search appearance for products."
        action={(
          <button
            type="button"
            onClick={() => bulkBackfill.mutate()}
            disabled={bulkBackfill.isPending || missingCount === 0}
            className="inline-flex items-center gap-2 rounded-full bg-forest-canopy px-4 py-2.5 font-inter text-sm text-white disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            {bulkBackfill.isPending ? 'Filling…' : `Auto-fill missing SEO (${missingCount})`}
          </button>
        )}
      />

      <div className="mb-6 rounded-2xl border border-forest-canopy/15 bg-forest-canopy/5 p-4">
        <p className="font-inter text-sm font-medium text-rain-cloud">Google Search indexing</p>
        <ul className="mt-2 space-y-1 font-inter text-xs leading-relaxed text-rain-cloud/55">
          <li>Sitemap: <a href="/sitemap.xml" target="_blank" rel="noreferrer" className="text-forest-canopy underline">/sitemap.xml</a> (all published products)</li>
          <li>Product pages now include Product + Breadcrumb JSON-LD and bot-friendly HTML for Google crawlers.</li>
          <li>Add <code className="rounded bg-white px-1">VITE_GOOGLE_SITE_VERIFICATION</code> to your env, redeploy, then verify in Google Search Console.</li>
          <li>After deploy, request indexing for key product URLs in Search Console → URL Inspection.</li>
        </ul>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Published products', count: products.length, color: '#6E5846' },
          { label: 'SEO ready', count: readyCount, color: '#5B7A4B' },
          { label: 'Needs fill', count: missingCount, color: '#E74C3C' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="font-inter text-xs text-rain-cloud/45 uppercase tracking-wider">{s.label}</p>
            <p className="font-cormorant text-4xl font-medium mt-2" style={{ color: s.color }}>{s.count}</p>
          </motion.div>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rain-cloud/35" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="w-full rounded-xl border border-border py-2 pl-9 pr-3 font-inter text-sm focus:border-forest-canopy focus:outline-none"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-xl border border-border px-3 py-2 font-inter text-sm bg-white"
        >
          <option value="all">All products</option>
          <option value="missing">Needs SEO fill</option>
          <option value="ready">SEO ready</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-cormorant text-xl text-rain-cloud font-medium">Products SEO</h2>
          <p className="font-inter text-xs text-rain-cloud/40 mt-0.5">Preview shows what Google will see. Auto-fill writes missing fields only.</p>
        </div>
        <div className="divide-y divide-border/40">
          {isLoading ? (
            <p className="font-inter text-sm text-rain-cloud/40 px-6 py-8">Loading products…</p>
          ) : filtered.map(({ product, effective, explicit }) => (
            <div key={product.id} className="px-6 py-4">
              <div className="flex items-start gap-3 mb-3">
                {explicit
                  ? <CheckCircle className="w-4 h-4 text-forest-canopy flex-shrink-0 mt-0.5" />
                  : <AlertCircle className="w-4 h-4 text-warm-turmeric flex-shrink-0 mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-cormorant text-base text-rain-cloud font-medium">{product.title}</p>
                    <a href={`/product/${product.slug || product.id}`} target="_blank" rel="noopener noreferrer" className="text-rain-cloud/30 hover:text-rain-cloud/60">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                  <div className="mt-2 rounded-xl border border-border/60 bg-rain-mist/20 p-3">
                    <p className="font-inter text-[11px] uppercase tracking-wider text-rain-cloud/40">Google preview</p>
                    <p className="mt-1 font-inter text-sm text-[#1a0dab] line-clamp-1">{effective.title}</p>
                    <p className="font-inter text-xs text-[#006621]">www.yasvik.com › product › {product.slug || product.id}</p>
                    <p className="mt-1 font-inter text-sm text-rain-cloud/70 line-clamp-2">{effective.description}</p>
                  </div>
                  <SEORow label="SEO Title" value={product.seo_title} field="seo_title"
                    onSave={(field, value) => updateProduct.mutate({ id: product.id, field, value })} />
                  <SEORow label="SEO Description" value={product.seo_description} field="seo_description" multiline
                    onSave={(field, value) => updateProduct.mutate({ id: product.id, field, value })} />
                  <SEORow label="Canonical override" value={product.canonical_override} field="canonical_override" multiline
                    onSave={(field, value) => updateProduct.mutate({ id: product.id, field, value })} />
                  <SEORow label="SEO Keywords" value={product.seo_keywords} field="seo_keywords"
                    onSave={(field, value) => updateProduct.mutate({ id: product.id, field, value })} />
                  <div className="border-b border-border/50 py-3">
                    <p className="font-inter text-xs text-rain-cloud/45 uppercase tracking-wider mb-2">Indexable</p>
                    <label className="inline-flex items-center gap-2 font-inter text-sm text-rain-cloud/70">
                      <input
                        type="checkbox"
                        checked={product.indexable !== false}
                        onChange={(e) => updateProduct.mutate({ id: product.id, field: 'indexable', value: e.target.checked })}
                      />
                      Search engines may index this product page
                    </label>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {!isLoading && filtered.length === 0 && (
            <p className="font-inter text-sm text-rain-cloud/40 px-6 py-8">No products match this filter.</p>
          )}
        </div>
      </div>

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
        </div>
      </div>
    </div>
  );
}
