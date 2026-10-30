import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { appClient } from '@/api/appClient';
import { X, MapPin, CreditCard, Truck, StickyNote, ChevronDown, MessageCircle, Copy, Check, FileDown } from 'lucide-react';
import OrderStatusBadge, { STATUS_CONFIG } from './OrderStatusBadge';
import OrderTimeline from './OrderTimeline';
import OrderItemsEditor from './OrderItemsEditor';
import { format } from 'date-fns';
import { YASVIK_WHATSAPP_NUMBER } from '@/lib/storeLocation';
import { resolveOrderEtaDisplay } from '@/lib/storeDeliveryRules';
import { downloadOrderInvoicePdf, notifyCustomerWithInvoicePdf } from '@/lib/orderInvoicePdf';
import {
  buildStatusWhatsAppMessage,
  customerPhoneDigits,
  openCustomerWhatsApp,
} from '@/lib/orderWhatsAppNotify';

const ORDER_STATUSES = Object.keys(STATUS_CONFIG);
const WHATSAPP_NUMBER = YASVIK_WHATSAPP_NUMBER;

function buildRiderWhatsAppMessage(order) {
  const addr = order.shipping_address || {};
  const lines = (order.items_snapshot || []).map(
    (i) => `• ${i.title}${i.variant ? ` (${i.variant})` : ''} × ${i.qty}`
  );
  return [
    `🛵 Yasvik delivery — Order ${order.order_number || order.receipt_id || order.id?.slice(-8)}`,
    '',
    `Customer: ${order.customer_name || '—'}`,
    `Phone: ${order.customer_phone || '—'}`,
    `Address: ${[addr.street, addr.city, addr.state, addr.zip].filter(Boolean).join(', ')}`,
    order.delivery_instructions ? `Note: ${order.delivery_instructions}` : null,
    order.delivery_slot ? `Slot: ${order.delivery_slot}` : null,
    '',
    'Items:',
    ...lines,
    '',
    `Total: ₹${((order.amount_paise || 0) / 100).toFixed(0)}`,
  ].filter(Boolean).join('\n');
}

export default function OrderDetailDrawer({ order: orderProp, onClose, currentUser, onOrderUpdated }) {
  const qc = useQueryClient();
  const [liveOrder, setLiveOrder] = useState(orderProp);
  const order = liveOrder || orderProp;
  const [newStatus, setNewStatus] = useState(order?.status || 'pending');
  const [statusNote, setStatusNote] = useState('');
  const [adminNotes, setAdminNotes] = useState(order?.admin_notes || '');
  const [trackingId, setTrackingId] = useState(order?.tracking_id || '');
  const [carrier, setCarrier] = useState(order?.carrier || '');
  const [riderName, setRiderName] = useState(order?.rider_name || '');
  const [riderPhone, setRiderPhone] = useState(order?.rider_phone || '');
  const [deliverySlot, setDeliverySlot] = useState(order?.delivery_slot || '');
  const [saving, setSaving] = useState(false);
  const [itemsSaving, setItemsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notifyResult, setNotifyResult] = useState(null);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [invoiceBusy, setInvoiceBusy] = useState(false);
  const [invoiceError, setInvoiceError] = useState('');
  const [waHint, setWaHint] = useState('');
  const [itemsHint, setItemsHint] = useState('');
  const [statusEvents, setStatusEvents] = useState([]);
  const [notificationLog, setNotificationLog] = useState([]);

  const applyUpdatedOrder = (next) => {
    if (!next) return;
    setLiveOrder(next);
    onOrderUpdated?.(next);
  };

  const handleResendConfirmation = async () => {
    if (!order?.id) return;
    setResendingEmail(true);
    setNotifyResult(null);
    try {
      const { data } = await appClient.functions.invoke('resendOrderConfirmation', {
        orderId: order.id,
        status: 'confirmed',
      });
      setNotifyResult(data || { success: true, email_sent: true });
    } catch (err) {
      setNotifyResult({ success: false, email_error: err?.message || 'Resend failed' });
    } finally {
      setResendingEmail(false);
    }
  };

  if (!order) return null;

  const orderRef = order.order_number || order.receipt_id || order.id?.slice(-8);

  const total = ((order.amount_paise || 0) / 100).toFixed(0);
  const statusChanged = newStatus !== order.status;
  const isPos = order.order_channel === 'pos';
  const etaDisplay = resolveOrderEtaDisplay(order.status, order.eta_label);
  const itemsLocked = ['cancelled', 'refunded'].includes(String(order.status || '').toLowerCase());

  const handleSaveItems = async (items) => {
    setItemsSaving(true);
    setItemsHint('');
    setInvoiceError('');
    try {
      const res = await appClient.functions.invoke('adminEditOrderItems', {
        orderId: order.id,
        items,
        note: `Items edited by ${currentUser?.email || 'admin'}`,
      });
      const data = res.data || {};
      if (data.error) throw new Error(data.error);
      const raw = data.order || {};
      const next = {
        ...order,
        ...raw,
        shipping_address: raw.address_snapshot || order.shipping_address || null,
        created_date: raw.created_at || raw.created_date || order.created_date,
        items_snapshot: Array.isArray(raw.items_snapshot) ? raw.items_snapshot : items,
      };
      applyUpdatedOrder(next);
      qc.invalidateQueries(['admin-orders']);
      setItemsHint('Items saved on this order. Download or WhatsApp the invoice to refresh the PDF (same bill number).');
    } catch (err) {
      throw new Error(err?.message || 'Could not save items');
    } finally {
      setItemsSaving(false);
    }
  };

  const handleSaveStatus = async () => {
    setSaving(true);
    const now = new Date().toISOString();
    const newEntry = {
      timestamp: now,
      status: newStatus,
      note: statusNote || '',
      updated_by: currentUser?.email || 'admin',
    };
    const timeline = statusChanged ? [...(order.timeline || []), newEntry] : undefined;

    const phone = order.customer_phone || order.guest_phone;
    if (statusChanged && customerPhoneDigits(phone).length === 10) {
      const msg = buildStatusWhatsAppMessage(
        {
          ...order,
          rider_name: riderName || order.rider_name,
          rider_phone: riderPhone || order.rider_phone,
        },
        newStatus,
        statusNote
      );
      openCustomerWhatsApp(phone, msg);
      setWaHint('WhatsApp opened — tap Send on the Yasvik phone. Saving status…');
    }

    try {
      const res = await appClient.functions.invoke('adminUpdateOrderStatus', {
        orderId: order.id,
        status: newStatus,
        previousStatus: order.status,
        statusNote,
        timeline,
        admin_notes: adminNotes,
        tracking_id: trackingId,
        carrier,
        rider_name: riderName,
        rider_phone: riderPhone,
        delivery_slot: deliverySlot,
      });
      const data = res.data || {};
      setNotifyResult(data.notifyResult || null);
      setStatusEvents(Array.isArray(data.events) ? data.events : []);
      setNotificationLog(Array.isArray(data.notifications) ? data.notifications : []);
      applyUpdatedOrder({
        ...order,
        status: newStatus,
        admin_notes: adminNotes,
        tracking_id: trackingId,
        carrier,
        rider_name: riderName,
        rider_phone: riderPhone,
        delivery_slot: deliverySlot,
        timeline: timeline || order.timeline,
      });
      qc.invalidateQueries(['admin-orders']);
      if (statusChanged && customerPhoneDigits(phone).length === 10) {
        setWaHint('Status saved. WhatsApp opened — tap Send from the Yasvik phone.');
      }
    } catch (err) {
      setNotifyResult({ success: false, email_error: err?.message || 'Update failed' });
    }
    setStatusNote('');
    setSaving(false);
    if (!statusChanged) onClose();
  };

  const handleCopyRiderMessage = async () => {
    const text = buildRiderWhatsAppMessage(order);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy rider message:', text);
    }
  };

  const handleDownloadInvoice = async () => {
    setInvoiceError('');
    setInvoiceBusy(true);
    try {
      await downloadOrderInvoicePdf(order, { isAdmin: true });
    } catch (err) {
      setInvoiceError(err?.message || 'Could not generate invoice PDF');
    } finally {
      setInvoiceBusy(false);
    }
  };

  const handleWhatsAppInvoice = async () => {
    setWaHint('');
    setInvoiceError('');
    setInvoiceBusy(true);
    try {
      const result = await notifyCustomerWithInvoicePdf(order);
      setWaHint(result.hint);
      if (result.invoiceUrl) {
        applyUpdatedOrder({ ...order, invoice_url: result.invoiceUrl });
      }
      if (!result.hasPhone) {
        setInvoiceError(
          result.hint.includes('store WhatsApp')
            ? result.hint
            : 'Add customer phone on this order first.'
        );
      }
    } catch (err) {
      setInvoiceError(err?.message || 'Could not open WhatsApp');
    } finally {
      setInvoiceBusy(false);
    }
  };

  const handleWhatsAppStatus = () => {
    const phone = order.customer_phone || order.guest_phone;
    const msg = buildStatusWhatsAppMessage(
      { ...order, rider_name: riderName, rider_phone: riderPhone, eta_label: order.eta_label },
      newStatus,
      statusNote
    );
    const ok = openCustomerWhatsApp(phone, msg);
    setWaHint(
      ok
        ? 'WhatsApp opened — tap Send on the Yasvik phone.'
        : 'Add a 10-digit customer phone on this order, then try again.'
    );
  };

  const whatsappRiderHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildRiderWhatsAppMessage(order))}`;

  const quickStatus = (status) => {
    setNewStatus(status);
    setStatusNote(`Marked ${STATUS_CONFIG[status]?.label || status}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-rain-cloud/40" onClick={onClose} />
      <div className="w-full max-w-lg bg-background overflow-y-auto flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-white sticky top-0 z-10">
          <div>
            <p className="font-inter text-xs font-medium text-deep-forest/70 uppercase tracking-wider">Order</p>
            <p className="font-cormorant text-xl text-deep-forest font-semibold">{orderRef}</p>
            {isPos && <span className="font-inter text-[10px] px-2 py-0.5 bg-warm-turmeric/15 text-wet-earth rounded-full">POS</span>}
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-deep-forest/70" />
          </button>
        </div>

        <div className="flex-1 p-6 space-y-6">
          <div className="bg-white rounded-2xl p-4 flex items-center justify-between">
            <div>
              <OrderStatusBadge status={order.status} />
              <p className="font-inter text-xs text-rain-cloud/40 mt-1">
                {order.created_date || order.created_at
                  ? format(new Date(order.created_date || order.created_at), 'dd MMM yyyy, h:mm a')
                  : ''}
              </p>
              {etaDisplay && (
                <p className="font-inter text-[10px] text-forest-canopy mt-0.5">{etaDisplay}</p>
              )}
            </div>
            <div className="text-right">
              <p className="font-cormorant text-2xl text-rain-cloud font-medium">₹{total}</p>
              <p className="font-inter text-xs text-rain-cloud/40 capitalize">
                {order.payment_method || 'razorpay'}
                {order.payment_status === 'pending_cod' ? ' · collect on delivery' : ''}
              </p>
              <button
                type="button"
                onClick={handleDownloadInvoice}
                disabled={invoiceBusy}
                className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 font-inter text-[11px] text-rain-cloud/70 hover:border-forest-canopy/40 disabled:opacity-50"
              >
                <FileDown className="w-3.5 h-3.5" />
                {invoiceBusy ? 'Preparing…' : 'Download invoice PDF'}
              </button>
              {invoiceError ? (
                <p className="mt-1 font-inter text-[10px] text-amber-700">{invoiceError}</p>
              ) : null}
            </div>
          </div>

          {!isPos && (
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
                <p className="font-inter text-xs text-rain-cloud/40 mt-1 italic">&ldquo;{order.delivery_instructions}&rdquo;</p>
              )}
              <div className="flex gap-2 mt-3">
                <button type="button" onClick={handleCopyRiderMessage} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border font-inter text-xs text-rain-cloud/60 hover:border-forest-canopy/40">
                  {copied ? <Check className="w-3.5 h-3.5 text-forest-canopy" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy rider note'}
                </button>
                <a href={whatsappRiderHref} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-forest-canopy/10 font-inter text-xs text-forest-canopy">
                  <MessageCircle className="w-3.5 h-3.5" />
                  WhatsApp
                </a>
              </div>
            </div>
          )}

          <OrderItemsEditor
            itemsSnapshot={order.items_snapshot}
            amountPaise={order.amount_paise}
            deliveryFeePaise={order.delivery_fee_paise}
            discountPaise={order.discount_paise}
            canEdit={!itemsLocked}
            saving={itemsSaving}
            onSave={handleSaveItems}
          />
          {itemsHint ? (
            <p className="font-inter text-[11px] text-forest-canopy -mt-4 px-1">{itemsHint}</p>
          ) : null}

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

          {!isPos && (
            <div className="bg-white rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Truck className="w-3.5 h-3.5 text-rain-cloud/35" />
                <p className="font-inter text-xs font-medium text-rain-cloud/50 uppercase tracking-wider">Delivery ops</p>
              </div>
              <input value={riderName} onChange={e => setRiderName(e.target.value)} placeholder="Rider name" className="w-full px-3 py-2 border border-border rounded-xl font-inter text-sm text-rain-cloud focus:outline-none focus:border-forest-canopy" />
              <input value={riderPhone} onChange={e => setRiderPhone(e.target.value)} placeholder="Rider phone" className="w-full px-3 py-2 border border-border rounded-xl font-inter text-sm text-rain-cloud focus:outline-none focus:border-forest-canopy" />
              <input value={deliverySlot} onChange={e => setDeliverySlot(e.target.value)} placeholder="Delivery slot (e.g. 5–8 PM)" className="w-full px-3 py-2 border border-border rounded-xl font-inter text-sm text-rain-cloud focus:outline-none focus:border-forest-canopy" />
              <input value={trackingId} onChange={e => setTrackingId(e.target.value)} placeholder="Tracking ID (optional)" className="w-full px-3 py-2 border border-border rounded-xl font-inter text-sm text-rain-cloud focus:outline-none focus:border-forest-canopy" />
              <input value={carrier} onChange={e => setCarrier(e.target.value)} placeholder="Carrier / in-house" className="w-full px-3 py-2 border border-border rounded-xl font-inter text-sm text-rain-cloud focus:outline-none focus:border-forest-canopy" />
            </div>
          )}

          <div className="bg-white rounded-2xl p-4 space-y-3">
            <p className="font-inter text-xs font-medium text-rain-cloud/50 uppercase tracking-wider">Update Status</p>
            {!isPos && (
              <div className="flex flex-wrap gap-2">
                {['packing', 'out_for_delivery', 'delivered'].map((s) => (
                  <button key={s} type="button" onClick={() => quickStatus(s)} className="px-3 py-1 rounded-full border border-border font-inter text-[11px] text-rain-cloud/55 hover:border-forest-canopy/50">
                    → {STATUS_CONFIG[s]?.label}
                  </button>
                ))}
              </div>
            )}
            <div className="relative">
              <select value={newStatus} onChange={e => setNewStatus(e.target.value)} className="w-full px-3 py-2 border border-border rounded-xl font-inter text-sm text-rain-cloud focus:outline-none focus:border-forest-canopy appearance-none bg-white pr-8">
                {ORDER_STATUSES.map(s => (
                  <option key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rain-cloud/35 pointer-events-none" />
            </div>
            <textarea value={statusNote} onChange={e => setStatusNote(e.target.value)} placeholder="Add a note for this status update (optional)…" rows={2} className="w-full px-3 py-2 border border-border rounded-xl font-inter text-sm text-rain-cloud focus:outline-none focus:border-forest-canopy resize-none" />
          </div>

          <div className="bg-white rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <StickyNote className="w-3.5 h-3.5 text-rain-cloud/35" />
              <p className="font-inter text-xs font-medium text-rain-cloud/50 uppercase tracking-wider">Admin Notes</p>
            </div>
            <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} placeholder="Internal notes (not visible to customer)…" rows={3} className="w-full px-3 py-2 border border-border rounded-xl font-inter text-sm text-rain-cloud focus:outline-none focus:border-forest-canopy resize-none" />
          </div>

          <div className="bg-white rounded-2xl p-4">
            <p className="font-inter text-xs font-medium text-rain-cloud/50 uppercase tracking-wider mb-3">Notify customer (Yasvik WhatsApp)</p>
            <p className="font-inter text-[11px] text-rain-cloud/45 mb-3">
              Opens WhatsApp to the <strong>customer’s</strong> number with bill text and a hosted invoice link. Send from the Yasvik phone. Tap Send once.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleWhatsAppStatus}
                disabled={customerPhoneDigits(order.customer_phone || order.guest_phone).length !== 10}
                className="inline-flex items-center gap-2 rounded-full border border-forest-canopy/30 bg-forest-canopy/5 px-4 py-2 font-inter text-xs text-forest-canopy hover:bg-forest-canopy/10 disabled:opacity-40"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp status
              </button>
              <button
                type="button"
                onClick={handleWhatsAppInvoice}
                disabled={invoiceBusy}
                className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 font-inter text-xs text-white disabled:opacity-60"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                {invoiceBusy ? 'Sending…' : 'Send bill on WhatsApp'}
              </button>
              {order.customer_email ? (
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  disabled={resendingEmail}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 font-inter text-xs text-rain-cloud hover:border-forest-canopy/40 disabled:opacity-50"
                >
                  {resendingEmail ? 'Sending…' : 'Email (optional)'}
                </button>
              ) : null}
            </div>
            {waHint ? <p className="mt-3 font-inter text-[11px] text-forest-canopy">{waHint}</p> : null}
            {customerPhoneDigits(order.customer_phone || order.guest_phone).length !== 10 ? (
              <p className="mt-2 font-inter text-xs text-rain-cloud/40">No customer phone on this order.</p>
            ) : null}
            {notifyResult && (
              <div className="mt-3 rounded-xl border border-border/60 bg-rain-mist/40 px-3 py-2 font-inter text-xs text-rain-cloud/65 space-y-1">
                {notifyResult.email_sent ? <p>✓ Email sent</p> : null}
                {notifyResult.email_error ? <p className="text-amber-700">Email: {notifyResult.email_error}</p> : null}
                {notifyResult.whatsapp_url ? (
                  <a href={notifyResult.whatsapp_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-forest-canopy font-medium">
                    <MessageCircle className="w-3 h-3" /> Open WhatsApp update again
                  </a>
                ) : null}
                <button type="button" onClick={onClose} className="block mt-2 text-rain-cloud/45 underline">Close</button>
              </div>
            )}
            {(statusEvents.length > 0 || notificationLog.length > 0) && (
              <div className="mt-4 space-y-3 rounded-xl border border-border/50 bg-white px-3 py-3">
                {statusEvents.length > 0 ? (
                  <div>
                    <p className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/40 mb-2">Status audit</p>
                    <ul className="space-y-1.5">
                      {statusEvents.slice(0, 5).map((event) => (
                        <li key={event.id} className="font-inter text-[11px] text-rain-cloud/60">
                          <span className="font-semibold capitalize">{event.status}</span>
                          {event.note ? ` — ${event.note}` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {notificationLog.length > 0 ? (
                  <div>
                    <p className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/40 mb-2">Notifications</p>
                    <ul className="space-y-1.5">
                      {notificationLog.slice(0, 5).map((n) => (
                        <li key={n.id} className="font-inter text-[11px] text-rain-cloud/60">
                          {n.channel}: {n.status}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-4">
            <p className="font-inter text-xs font-medium text-rain-cloud/50 uppercase tracking-wider mb-4">Timeline</p>
            <OrderTimeline timeline={order.timeline} />
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-border px-6 py-4 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-full font-inter text-sm text-rain-cloud/60 hover:bg-muted transition-all">Cancel</button>
          <button onClick={handleSaveStatus} disabled={saving} className="flex-1 py-2.5 bg-wet-earth text-white rounded-full font-inter text-sm hover:bg-wet-earth/90 disabled:opacity-50 transition-all">
            {saving ? 'Saving…' : 'Save & WhatsApp'}
          </button>
        </div>
      </div>
    </div>
  );
}
