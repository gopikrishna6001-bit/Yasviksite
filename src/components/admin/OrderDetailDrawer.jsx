import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orders } from '@/services/api';
import { appClient } from '@/api/appClient';
import { X, Package, MapPin, CreditCard, Truck, StickyNote, ChevronDown } from 'lucide-react';
import OrderStatusBadge, { STATUS_CONFIG } from './OrderStatusBadge';
import OrderTimeline from './OrderTimeline';
import { format } from 'date-fns';

const ORDER_STATUSES = Object.keys(STATUS_CONFIG);

export default function OrderDetailDrawer({ order, onClose, currentUser }) {
  const qc = useQueryClient();
  const [newStatus, setNewStatus] = useState(order?.status || 'pending');
  const [statusNote, setStatusNote] = useState('');
  const [adminNotes, setAdminNotes] = useState(order?.admin_notes || '');
  const [trackingId, setTrackingId] = useState(order?.tracking_id || '');
  const [carrier, setCarrier] = useState(order?.carrier || '');
  const [saving, setSaving] = useState(false);

  const updateMut = useMutation({
    mutationFn: ({ id, d }) => orders.update(id, d),
    onSuccess: () => qc.invalidateQueries(['admin-orders']),
  });

  if (!order) return null;

  const total = (order.amount_paise / 100).toFixed(0);
  const statusChanged = newStatus !== order.status;

  const handleSaveStatus = async () => {
    setSaving(true);
    const now = new Date().toISOString();
    const newEntry = {
      timestamp: now,
      status: newStatus,
      note: statusNote || '',
      updated_by: currentUser?.email || 'admin',
    };
    const timeline = [...(order.timeline || []), newEntry];
    await updateMut.mutateAsync({ id: order.id, d: { status: newStatus, timeline, admin_notes: adminNotes, tracking_id: trackingId, carrier } });

    if (statusChanged) {
      try {
        await appClient.functions.invoke('sendOrderNotification', { orderId: order.id, status: newStatus });
      } catch (_) { /* notification failure should not block UI */ }
    }
    setStatusNote('');
    setSaving(false);
    onClose();
  };

  const handleSaveMeta = async () => {
    setSaving(true);
    await updateMut.mutateAsync({ id: order.id, d: { admin_notes: adminNotes, tracking_id: trackingId, carrier } });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-rain-cloud/40" onClick={onClose} />
      <div className="w-full max-w-lg bg-background overflow-y-auto flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-white sticky top-0 z-10">
          <div>
            <p className="font-inter text-xs text-rain-cloud/40 uppercase tracking-wider">Order</p>
            <p className="font-cormorant text-xl text-rain-cloud font-medium">#{order.receipt_id || order.id?.slice(-8)}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-rain-cloud/50" />
          </button>
        </div>

        <div className="flex-1 p-6 space-y-6">
          {/* Status & Amount */}
          <div className="bg-white rounded-2xl p-4 flex items-center justify-between">
            <div>
              <OrderStatusBadge status={order.status} />
              <p className="font-inter text-xs text-rain-cloud/40 mt-1">
                {order.created_date ? format(new Date(order.created_date), 'dd MMM yyyy, h:mm a') : ''}
              </p>
            </div>
            <div className="text-right">
              <p className="font-cormorant text-2xl text-rain-cloud font-medium">₹{total}</p>
              <p className="font-inter text-xs text-rain-cloud/40 capitalize">{order.payment_method || 'razorpay'}</p>
            </div>
          </div>

          {/* Customer */}
          <div className="bg-white rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-3.5 h-3.5 text-rain-cloud/35" />
              <p className="font-inter text-xs font-medium text-rain-cloud/50 uppercase tracking-wider">Customer</p>
            </div>
            <p className="font-inter text-sm font-medium text-rain-cloud">{order.customer_name || '—'}</p>
            <p className="font-inter text-xs text-rain-cloud/50 mt-0.5">{order.customer_email}</p>
            {order.customer_phone && <p className="font-inter text-xs text-rain-cloud/50">{order.customer_phone}</p>}
            {order.shipping_address?.street && (
              <p className="font-inter text-xs text-rain-cloud/45 mt-2 leading-relaxed">
                {order.shipping_address.street}, {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.zip}
              </p>
            )}
            {order.delivery_instructions && (
              <p className="font-inter text-xs text-rain-cloud/40 mt-1 italic">"{order.delivery_instructions}"</p>
            )}
          </div>

          {/* Items */}
          <div className="bg-white rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-3.5 h-3.5 text-rain-cloud/35" />
              <p className="font-inter text-xs font-medium text-rain-cloud/50 uppercase tracking-wider">Items</p>
            </div>
            <div className="space-y-2">
              {(order.items_snapshot || []).map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <p className="font-inter text-sm text-rain-cloud">{item.title}</p>
                    <p className="font-inter text-xs text-rain-cloud/40">{item.unit}{item.variant ? ` · ${item.variant}` : ''} × {item.qty}</p>
                  </div>
                  <p className="font-inter text-sm text-rain-cloud/70">₹{(item.price * item.qty).toFixed(0)}</p>
                </div>
              ))}
              <div className="border-t border-border pt-2 mt-2 flex justify-between">
                <p className="font-inter text-sm font-medium text-rain-cloud">Total</p>
                <p className="font-inter text-sm font-medium text-rain-cloud">₹{total}</p>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="bg-white rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="w-3.5 h-3.5 text-rain-cloud/35" />
              <p className="font-inter text-xs font-medium text-rain-cloud/50 uppercase tracking-wider">Payment</p>
            </div>
            <div className="space-y-1">
              {order.razorpay_order_id && <p className="font-inter text-xs text-rain-cloud/50">Order: <span className="font-mono">{order.razorpay_order_id}</span></p>}
              {order.razorpay_payment_id && <p className="font-inter text-xs text-rain-cloud/50">Payment: <span className="font-mono">{order.razorpay_payment_id}</span></p>}
            </div>
          </div>

          {/* Shipping */}
          <div className="bg-white rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Truck className="w-3.5 h-3.5 text-rain-cloud/35" />
              <p className="font-inter text-xs font-medium text-rain-cloud/50 uppercase tracking-wider">Shipping</p>
            </div>
            <input
              value={trackingId}
              onChange={e => setTrackingId(e.target.value)}
              placeholder="Tracking ID"
              className="w-full px-3 py-2 border border-border rounded-xl font-inter text-sm text-rain-cloud focus:outline-none focus:border-forest-canopy"
            />
            <input
              value={carrier}
              onChange={e => setCarrier(e.target.value)}
              placeholder="Carrier (e.g. Delhivery, Blue Dart)"
              className="w-full px-3 py-2 border border-border rounded-xl font-inter text-sm text-rain-cloud focus:outline-none focus:border-forest-canopy"
            />
          </div>

          {/* Update Status */}
          <div className="bg-white rounded-2xl p-4 space-y-3">
            <p className="font-inter text-xs font-medium text-rain-cloud/50 uppercase tracking-wider">Update Status</p>
            <div className="relative">
              <select
                value={newStatus}
                onChange={e => setNewStatus(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-xl font-inter text-sm text-rain-cloud focus:outline-none focus:border-forest-canopy appearance-none bg-white pr-8"
              >
                {ORDER_STATUSES.map(s => (
                  <option key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rain-cloud/35 pointer-events-none" />
            </div>
            <textarea
              value={statusNote}
              onChange={e => setStatusNote(e.target.value)}
              placeholder="Add a note for this status update (optional)…"
              rows={2}
              className="w-full px-3 py-2 border border-border rounded-xl font-inter text-sm text-rain-cloud focus:outline-none focus:border-forest-canopy resize-none"
            />
          </div>

          {/* Admin Notes */}
          <div className="bg-white rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <StickyNote className="w-3.5 h-3.5 text-rain-cloud/35" />
              <p className="font-inter text-xs font-medium text-rain-cloud/50 uppercase tracking-wider">Admin Notes</p>
            </div>
            <textarea
              value={adminNotes}
              onChange={e => setAdminNotes(e.target.value)}
              placeholder="Internal notes (not visible to customer)…"
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-xl font-inter text-sm text-rain-cloud focus:outline-none focus:border-forest-canopy resize-none"
            />
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-2xl p-4">
            <p className="font-inter text-xs font-medium text-rain-cloud/50 uppercase tracking-wider mb-4">Timeline</p>
            <OrderTimeline timeline={order.timeline} />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-border px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-border rounded-full font-inter text-sm text-rain-cloud/60 hover:bg-muted transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveStatus}
            disabled={saving}
            className="flex-1 py-2.5 bg-wet-earth text-white rounded-full font-inter text-sm hover:bg-wet-earth/90 disabled:opacity-50 transition-all"
          >
            {saving ? 'Saving…' : 'Save & Notify'}
          </button>
        </div>
      </div>
    </div>
  );
}