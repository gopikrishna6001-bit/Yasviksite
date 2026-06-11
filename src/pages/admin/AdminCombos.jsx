import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { appClient } from '@/api/appClient';
import { X, Loader2, Plus, Trash2 } from 'lucide-react';
import ImageUploadField from '../../components/admin/ImageUploadField';

export default function AdminCombos() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    product_ids: [],
    combo_price: 0,
    hero_image: '',
    is_featured: false,
    is_published: false,
  });

  const { data: combos = [], isLoading: combosLoading } = useQuery({
    queryKey: ['admin-combos'],
    queryFn: () => appClient.entities.Combo.list('-created_date', 50),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['all-products-combo'],
    queryFn: () => appClient.entities.Product.filter({ is_published: true }, '-created_date', 100),
  });

  // Calculate original price from selected products
  const selectedProducts = products.filter(p => formData.product_ids.includes(p.id));
  const originalPrice = selectedProducts.reduce((sum, p) => sum + (p.price || 0), 0);
  const discountPct = originalPrice > 0 ? Math.round(((originalPrice - formData.combo_price) / originalPrice) * 100) : 0;

  const createMutation = useMutation({
    mutationFn: (data) => appClient.entities.Combo.create({
      ...data,
      original_price: originalPrice,
      discount_percentage: discountPct,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-combos'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => appClient.entities.Combo.update(editingId, {
      ...data,
      original_price: originalPrice,
      discount_percentage: discountPct,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-combos'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => appClient.entities.Combo.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-combos'] }),
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      product_ids: [],
      combo_price: 0,
      hero_image: '',
      is_featured: false,
      is_published: false,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (combo) => {
    setFormData(combo);
    setEditingId(combo.id);
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!formData.title || formData.product_ids.length === 0 || !formData.combo_price) {
      alert('Fill all required fields');
      return;
    }
    if (editingId) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleProductToggle = (productId) => {
    setFormData(prev => ({
      ...prev,
      product_ids: prev.product_ids.includes(productId)
        ? prev.product_ids.filter(id => id !== productId)
        : [...prev.product_ids, productId],
    }));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-cormorant text-3xl text-rain-cloud font-medium">Product Combos</h1>
          <p className="font-inter text-sm text-rain-cloud/45 mt-1">Bundle products with discounts.</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-6 py-3 bg-forest-canopy text-white font-inter text-sm rounded-full hover:bg-forest-canopy/90"
          >
            <Plus className="w-4 h-4" />
            New Combo
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-sm mb-8"
        >
          <div className="space-y-4">
            <div>
              <label className="block font-inter text-sm text-rain-cloud/60 mb-1">Combo Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-border rounded-xl font-inter text-sm focus:outline-none focus:border-forest-canopy"
                placeholder="e.g., Spice Master Bundle"
              />
            </div>

            <div>
              <label className="block font-inter text-sm text-rain-cloud/60 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-border rounded-xl font-inter text-sm focus:outline-none focus:border-forest-canopy h-20"
                placeholder="Why this combo?"
              />
            </div>

            <div>
              <label className="block font-inter text-sm text-rain-cloud/60 mb-2">Select Products *</label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {products.map(p => (
                  <label key={p.id} className="flex items-center gap-2 p-2 border border-border rounded-lg cursor-pointer hover:bg-rain-mist transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.product_ids.includes(p.id)}
                      onChange={() => handleProductToggle(p.id)}
                      className="w-4 h-4"
                    />
                    <span className="font-inter text-xs text-rain-cloud flex-1 truncate">{p.title}</span>
                    <span className="font-inter text-[10px] text-rain-cloud/50 flex-shrink-0">₹{p.price}</span>
                  </label>
                ))}
              </div>
            </div>

            {selectedProducts.length > 0 && (
              <div className="p-3 bg-forest-canopy/5 rounded-xl">
                <p className="font-inter text-xs text-rain-cloud/60 mb-1">Selected: {selectedProducts.length} products</p>
                <p className="font-inter text-xs text-rain-cloud/50">
                  Original value: ₹{originalPrice} | Your combo price:
                </p>
              </div>
            )}

            <div>
              <label className="block font-inter text-sm text-rain-cloud/60 mb-1">Combo Price ₹ *</label>
              <input
                type="number"
                value={formData.combo_price}
                onChange={(e) => setFormData({ ...formData, combo_price: parseFloat(e.target.value) })}
                className="w-full px-4 py-2 border border-border rounded-xl font-inter text-sm focus:outline-none focus:border-forest-canopy"
                placeholder="Final discounted price"
              />
              {discountPct > 0 && (
                <p className="font-inter text-xs text-forest-canopy mt-1">
                  ✓ {discountPct}% savings for customers
                </p>
              )}
            </div>

            <ImageUploadField
              label="Hero Image"
              value={formData.hero_image}
              onChange={(url) => setFormData({ ...formData, hero_image: url })}
              aspectClass="aspect-video"
            />

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="font-inter text-sm text-rain-cloud/60">Featured combo</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_published}
                  onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="font-inter text-sm text-rain-cloud/60">Published</span>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1 py-2.5 bg-forest-canopy text-white font-inter text-sm rounded-full hover:bg-forest-canopy/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                ) : editingId ? 'Update Combo' : 'Create Combo'}
              </button>
              <button
                onClick={resetForm}
                className="px-6 py-2.5 border border-border text-rain-cloud font-inter text-sm rounded-full hover:bg-rain-mist transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Combos list */}
      <div className="space-y-3">
        {combosLoading ? (
          <p className="text-center font-inter text-sm text-rain-cloud/40 py-10">Loading combos…</p>
        ) : combos.length === 0 ? (
          <p className="text-center font-inter text-sm text-rain-cloud/40 py-10">No combos yet.</p>
        ) : (
          combos.map((combo, i) => (
            <motion.div
              key={combo.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-xl p-4 shadow-sm flex items-start gap-4"
            >
              {combo.hero_image && (
                <img src={combo.hero_image} alt={combo.title} className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-cormorant text-lg text-rain-cloud font-light">{combo.title}</h3>
                    <p className="font-inter text-xs text-rain-cloud/50 mt-0.5">{combo.product_ids.length} products</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-cormorant text-lg text-rain-cloud">₹{combo.combo_price}</p>
                    {combo.discount_percentage > 0 && (
                      <p className="font-inter text-[10px] text-forest-canopy font-medium">{combo.discount_percentage}% OFF</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {combo.is_featured && <span className="px-2 py-1 bg-warm-turmeric/10 text-warm-turmeric font-inter text-[9px] rounded">Featured</span>}
                  {combo.is_published ? (
                    <span className="px-2 py-1 bg-forest-canopy/10 text-forest-canopy font-inter text-[9px] rounded">Published</span>
                  ) : (
                    <span className="px-2 py-1 bg-rain-cloud/10 text-rain-cloud/50 font-inter text-[9px] rounded">Draft</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => handleEdit(combo)}
                  className="px-3 py-2 border border-border text-rain-cloud font-inter text-xs rounded-lg hover:bg-rain-mist transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteMutation.mutate(combo.id)}
                  disabled={deleteMutation.isPending}
                  className="w-10 h-10 rounded-lg border border-red-200 text-red-400 hover:bg-red-50 transition-colors flex items-center justify-center disabled:opacity-50"
                >
                  {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
      </div>
      );
      }