import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appClient } from '@/api/appClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Check, MapPin } from 'lucide-react';

export default function AddressManager({ userEmail }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const queryClient = useQueryClient();

  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ['user-addresses', userEmail],
    queryFn: () => appClient.entities.UserAddress.filter({ user_email: userEmail }, '-created_date'),
    enabled: !!userEmail,
  });

  const createMutation = useMutation({
    mutationFn: (data) => appClient.entities.UserAddress.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-addresses', userEmail] });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => appClient.entities.UserAddress.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-addresses', userEmail] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => appClient.entities.UserAddress.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-addresses', userEmail] });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: ({ id, addressId }) => 
      Promise.all([
        appClient.entities.UserAddress.update(id, { is_default: false }),
        appClient.entities.UserAddress.update(addressId, { is_default: true }),
      ]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-addresses', userEmail] });
    },
  });

  const handleSubmit = (e, formData) => {
    e.preventDefault();
    const payload = { ...formData, user_email: userEmail };
    
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-cormorant text-xl text-rain-cloud font-light">Delivery Addresses</h3>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
          }}
          className="flex items-center gap-1 px-3 py-1.5 bg-wet-earth text-white font-inter text-xs rounded-full hover:bg-wet-earth/90 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2].map(i => <div key={i} className="h-24 bg-temple-stone/20 rounded-2xl animate-pulse" />)}
        </div>
      ) : addresses.length === 0 ? (
        <div className="text-center py-8">
          <MapPin className="w-8 h-8 text-rain-cloud/20 mx-auto mb-2" />
          <p className="font-inter text-xs text-rain-cloud/40">No addresses saved yet</p>
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          {addresses.map((addr) => (
            <motion.div
              key={addr.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl p-4 border transition-all ${
                addr.is_default
                  ? 'bg-forest-canopy/5 border-forest-canopy/30'
                  : 'bg-white border-border/20'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="font-inter font-medium text-sm text-rain-cloud">{addr.label}</p>
                    {addr.is_default && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-forest-canopy text-white text-[10px] rounded-full">
                        <Check className="w-3 h-3" />
                        Default
                      </span>
                    )}
                  </div>
                  <p className="font-inter text-xs text-rain-cloud/70 leading-relaxed">
                    {addr.building_name}, {addr.street}, {addr.area}
                    <br />
                    {addr.city}, {addr.district} {addr.pin_code}
                  </p>
                  {addr.landmark && (
                    <p className="font-inter text-xs text-rain-cloud/50 mt-1">Landmark: {addr.landmark}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!addr.is_default && (
                    <button
                      onClick={() => {
                        const defaultAddr = addresses.find(a => a.is_default);
                        setDefaultMutation.mutate({
                          id: defaultAddr?.id || addresses[0].id,
                          addressId: addr.id,
                        });
                      }}
                      className="px-2 py-1 text-xs font-inter text-rain-cloud/60 hover:text-rain-cloud transition-colors"
                    >
                      Set Default
                    </button>
                  )}
                  <button
                    onClick={() => setEditingId(addr.id)}
                    className="px-2 py-1 text-xs font-inter text-rain-cloud/60 hover:text-rain-cloud transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(addr.id)}
                    className="text-rain-cloud/40 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {(showForm || editingId) && (
          <AddressForm
            userEmail={userEmail}
            editingAddress={addresses.find(a => a.id === editingId)}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingId(null);
            }}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function AddressForm({ userEmail, editingAddress, onSubmit, onCancel, isLoading }) {
  const [form, setForm] = useState(
    editingAddress || {
      label: '',
      building_name: '',
      street: '',
      landmark: '',
      area: '',
      city: '',
      district: '',
      state: '',
      pin_code: '',
      phone: '',
    }
  );
  const [error, setError] = useState('');

  // Update form when editing a different address
  useEffect(() => {
    if (editingAddress) {
      setForm(editingAddress);
    }
  }, [editingAddress?.id]);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    // Validate required fields
    if (!form.label || !form.building_name || !form.street || !form.city || !form.state || !form.pin_code || !form.phone) {
      setError('Please fill in all required fields');
      return;
    }
    
    onSubmit(e, form);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-white rounded-2xl p-6 mb-6 border border-border/20"
    >
      <h4 className="font-cormorant text-lg text-rain-cloud font-light mb-4">
        {editingAddress ? 'Edit Address' : 'New Address'}
      </h4>
      
      <form onSubmit={handleFormSubmit} className="space-y-4">
        {error && (
          <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 font-inter">
            {error}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Label (e.g., Home)"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            className="col-span-2 px-3 py-2 text-sm border border-border/40 rounded-lg font-inter focus:border-wet-earth outline-none"
            required
          />
          <input
            type="text"
            placeholder="Building/Flat No"
            value={form.building_name}
            onChange={(e) => setForm({ ...form, building_name: e.target.value })}
            className="col-span-2 px-3 py-2 text-sm border border-border/40 rounded-lg font-inter focus:border-wet-earth outline-none"
            required
          />
          <input
            type="text"
            placeholder="Street"
            value={form.street}
            onChange={(e) => setForm({ ...form, street: e.target.value })}
            className="col-span-2 px-3 py-2 text-sm border border-border/40 rounded-lg font-inter focus:border-wet-earth outline-none"
            required
          />
          <input
            type="text"
            placeholder="Landmark"
            value={form.landmark}
            onChange={(e) => setForm({ ...form, landmark: e.target.value })}
            className="col-span-2 px-3 py-2 text-sm border border-border/40 rounded-lg font-inter focus:border-wet-earth outline-none"
          />
          <input
            type="text"
            placeholder="Area"
            value={form.area}
            onChange={(e) => setForm({ ...form, area: e.target.value })}
            className="col-span-1 px-3 py-2 text-sm border border-border/40 rounded-lg font-inter focus:border-wet-earth outline-none"
            required
          />
          <input
            type="text"
            placeholder="City"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            className="col-span-1 px-3 py-2 text-sm border border-border/40 rounded-lg font-inter focus:border-wet-earth outline-none"
            required
          />
          <input
            type="text"
            placeholder="District"
            value={form.district}
            onChange={(e) => setForm({ ...form, district: e.target.value })}
            className="col-span-1 px-3 py-2 text-sm border border-border/40 rounded-lg font-inter focus:border-wet-earth outline-none"
            required
          />
          <input
            type="text"
            placeholder="State"
            value={form.state}
            onChange={(e) => setForm({ ...form, state: e.target.value })}
            className="col-span-1 px-3 py-2 text-sm border border-border/40 rounded-lg font-inter focus:border-wet-earth outline-none"
            required
          />
          <input
            type="text"
            placeholder="Pin Code"
            value={form.pin_code}
            onChange={(e) => setForm({ ...form, pin_code: e.target.value })}
            className="col-span-1 px-3 py-2 text-sm border border-border/40 rounded-lg font-inter focus:border-wet-earth outline-none"
            required
          />
          <input
            type="tel"
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="col-span-1 px-3 py-2 text-sm border border-border/40 rounded-lg font-inter focus:border-wet-earth outline-none"
            required
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-border/40 text-rain-cloud font-inter text-sm rounded-lg hover:bg-rain-mist transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-wet-earth text-white font-inter text-sm rounded-lg hover:bg-wet-earth/90 disabled:opacity-50 transition-all"
          >
            {isLoading ? 'Saving...' : 'Save Address'}
          </button>
        </div>
      </form>
    </motion.div>
  );
}