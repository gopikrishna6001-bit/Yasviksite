import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appClient } from '@/api/appClient';
import { buildAddressDbPayload } from '@/lib/userAddressPayload';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Check, MapPin } from 'lucide-react';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry',
];

function validateAddressForm(form) {
  if (!form.label?.trim()) return 'Add a label like Home or Office.';
  if (!form.building_name?.trim()) return 'House / flat / building is required.';
  if (!form.street?.trim()) return 'Street or colony name is required.';
  if (!form.area?.trim()) return 'Area or locality is required.';
  if (!form.city?.trim()) return 'City is required.';
  if (!form.state?.trim()) return 'State is required.';
  if (!/^\d{6}$/.test(String(form.pin_code || '').trim())) return 'Enter a valid 6-digit PIN code.';
  const phone = String(form.phone || '').replace(/\D/g, '');
  if (!/^[6-9]\d{9}$/.test(phone)) return 'Enter a valid 10-digit mobile number.';
  return '';
}

export default function AddressManager({ user }) {
  const userEmail = user?.email || '';
  const userId = user?.id || '';
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
    onError: (err) => {
      console.error('Address save failed:', err);
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
    mutationFn: async (addressId) => {
      await Promise.all(
        addresses.map((addr) =>
          appClient.entities.UserAddress.update(addr.id, { is_default: addr.id === addressId }),
        ),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-addresses', userEmail] });
    },
  });

  const handleSubmit = (e, formData) => {
    e.preventDefault();
    const payload = buildAddressDbPayload(formData, { userEmail, userId });
    payload.is_default = editingId
      ? Boolean(formData.is_default)
      : addresses.length === 0 || Boolean(formData.is_default);

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const saveError = createMutation.error?.message || updateMutation.error?.message || '';

  return (
    <div className="mb-8">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="font-cormorant text-2xl font-semibold text-deep-forest">Delivery addresses</h3>
        <button
          type="button"
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
          }}
          className="flex items-center gap-1 rounded-full bg-neon-paddy px-3 py-1.5 font-inter text-xs font-bold text-white transition-colors hover:bg-deep-forest"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>

      {saveError && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 font-inter text-xs text-red-600">
          Could not save address. {saveError}
        </p>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-soft-border/30" />)}
        </div>
      ) : addresses.length === 0 ? (
        <div className="rounded-2xl border border-soft-border bg-white py-8 text-center">
          <MapPin className="mx-auto mb-2 h-8 w-8 text-deep-forest/20" />
          <p className="font-inter text-sm text-deep-forest/50">No saved addresses yet</p>
          <p className="mt-1 font-inter text-xs text-deep-forest/35">Add one for faster checkout</p>
        </div>
      ) : (
        <div className="mb-6 space-y-3">
          {addresses.map((addr) => (
            <motion.div
              key={addr.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl border p-4 transition-all ${
                addr.is_default
                  ? 'border-neon-paddy/30 bg-neon-paddy/5'
                  : 'border-soft-border bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <p className="font-inter text-sm font-semibold text-deep-forest">{addr.label}</p>
                    {addr.is_default && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-neon-paddy px-2 py-0.5 font-inter text-[10px] font-bold text-white">
                        <Check className="h-3 w-3" />
                        Default
                      </span>
                    )}
                  </div>
                  <p className="font-inter text-xs leading-relaxed text-deep-forest/70">
                    {addr.building_name}, {addr.street}, {addr.area}
                    <br />
                    {addr.city}, {addr.district ? `${addr.district}, ` : ''}{addr.state} {addr.pin_code || addr.postal_code}
                  </p>
                  {addr.landmark ? (
                    <p className="mt-1 font-inter text-xs text-deep-forest/45">Near {addr.landmark}</p>
                  ) : null}
                  {addr.phone || addr.phone_number ? (
                    <p className="mt-1 font-inter text-xs text-deep-forest/45">+91 {addr.phone || addr.phone_number}</p>
                  ) : null}
                </div>
                <div className="flex flex-col items-end gap-1">
                  {!addr.is_default && (
                    <button
                      type="button"
                      onClick={() => setDefaultMutation.mutate(addr.id)}
                      className="font-inter text-xs font-semibold text-neon-paddy hover:text-deep-forest"
                    >
                      Set default
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditingId(addr.id)}
                    className="font-inter text-xs text-deep-forest/55 hover:text-deep-forest"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(addr.id)}
                    className="text-deep-forest/35 hover:text-red-600"
                    aria-label="Delete address"
                  >
                    <Trash2 className="h-4 w-4" />
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
            editingAddress={addresses.find((a) => a.id === editingId)}
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

function AddressForm({ editingAddress, onSubmit, onCancel, isLoading }) {
  const [form, setForm] = useState(
    editingAddress || {
      label: '',
      building_name: '',
      street: '',
      landmark: '',
      area: '',
      city: '',
      district: '',
      state: 'Telangana',
      pin_code: '',
      phone: '',
      is_default: false,
    },
  );
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingAddress) {
      setForm({
        ...editingAddress,
        pin_code: editingAddress.pin_code || editingAddress.postal_code || '',
        phone: editingAddress.phone || editingAddress.phone_number || '',
      });
    }
  }, [editingAddress?.id]);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const validationError = validateAddressForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    onSubmit(e, form);
  };

  const fieldClass =
    'w-full rounded-xl border border-soft-border bg-white px-3 py-2.5 font-inter text-sm text-deep-forest outline-none transition-colors focus:border-neon-paddy';

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mb-6 rounded-2xl border border-soft-border bg-white p-5"
    >
      <h4 className="mb-4 font-cormorant text-xl font-semibold text-deep-forest">
        {editingAddress ? 'Edit address' : 'New delivery address'}
      </h4>

      <form onSubmit={handleFormSubmit} className="space-y-3">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 font-inter text-xs text-red-600">
            {error}
          </div>
        )}

        <input
          type="text"
          placeholder="Label (Home, Office…)"
          value={form.label}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
          className={fieldClass}
          required
        />
        <input
          type="text"
          placeholder="House / Flat / Building"
          value={form.building_name}
          onChange={(e) => setForm({ ...form, building_name: e.target.value })}
          className={fieldClass}
          required
        />
        <input
          type="text"
          placeholder="Street / Colony"
          value={form.street}
          onChange={(e) => setForm({ ...form, street: e.target.value })}
          className={fieldClass}
          required
        />
        <input
          type="text"
          placeholder="Landmark (optional)"
          value={form.landmark}
          onChange={(e) => setForm({ ...form, landmark: e.target.value })}
          className={fieldClass}
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Area / Locality"
            value={form.area}
            onChange={(e) => setForm({ ...form, area: e.target.value })}
            className={fieldClass}
            required
          />
          <input
            type="text"
            placeholder="City"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            className={fieldClass}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="District"
            value={form.district}
            onChange={(e) => setForm({ ...form, district: e.target.value })}
            className={fieldClass}
          />
          <select
            value={form.state}
            onChange={(e) => setForm({ ...form, state: e.target.value })}
            className={fieldClass}
            required
          >
            <option value="">State</option>
            {INDIAN_STATES.map((state) => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="PIN code"
            value={form.pin_code}
            onChange={(e) => setForm({ ...form, pin_code: e.target.value.replace(/\D/g, '').slice(0, 6) })}
            className={fieldClass}
            required
          />
          <input
            type="tel"
            inputMode="numeric"
            maxLength={10}
            placeholder="Mobile number"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
            className={fieldClass}
            required
          />
        </div>

        <label className="flex items-center gap-2 font-inter text-xs text-deep-forest/65">
          <input
            type="checkbox"
            checked={Boolean(form.is_default)}
            onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
            className="h-4 w-4 accent-neon-paddy"
          />
          Set as default delivery address
        </label>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-soft-border px-4 py-2.5 font-inter text-sm text-deep-forest transition-colors hover:bg-warm-cream"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 rounded-xl bg-neon-paddy px-4 py-2.5 font-inter text-sm font-bold text-white transition-colors hover:bg-deep-forest disabled:opacity-50"
          >
            {isLoading ? 'Saving…' : 'Save address'}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
