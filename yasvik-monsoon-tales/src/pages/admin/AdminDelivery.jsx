import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { appClient } from '@/api/appClient';
import { orders } from '@/services/api';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import OrderStatusBadge from '@/components/admin/OrderStatusBadge';
import { MapPin, MessageCircle, Phone, Truck, CheckCircle, Loader2 } from 'lucide-react';
import { YASVIK_WHATSAPP_NUMBER } from '@/lib/storeLocation';

const ACTIVE_STATUSES = ['confirmed', 'packing', 'ready_for_dispatch', 'shipped', 'out_for_delivery'];

function buildMapsUrl(order) {
  const addr = order.shipping_address || order.address_snapshot || {};
  const q = [addr.street, addr.city, addr.state, addr.zip].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

function buildCustomerWhatsApp(order) {
  const phone = String(order.customer_phone || order.guest_phone || '').replace(/\D/g, '').slice(-10);
  if (phone.length !== 10) return null;
  const ref = order.order_number || order.id?.slice(-8);
  return `https://wa.me/91${phone}?text=${encodeURIComponent(`Hi, this is Yasvik regarding your order ${ref}.`)}`;
}

function DeliveryEconomicsFields({ values, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-xl border border-border/30 bg-muted/10 p-3">
      <label className="block">
        <span className="mb-1 block font-inter text-[10px] uppercase tracking-wide text-rain-cloud/45">Fee charged (₹)</span>
        <input
          type="number"
          min="0"
          step="1"
          value={values.feeChargedRs}
          onChange={(e) => onChange({ ...values, feeChargedRs: e.target.value })}
          placeholder="Customer pays"
          className="w-full rounded-lg border border-border px-2.5 py-1.5 font-inter text-xs"
        />
      </label>
      <label className="block">
        <span className="mb-1 block font-inter text-[10px] uppercase tracking-wide text-rain-cloud/45">Courier cost (₹)</span>
        <input
          type="number"
          min="0"
          step="1"
          value={values.actualCostRs}
          onChange={(e) => onChange({ ...values, actualCostRs: e.target.value })}
          placeholder="Rapido / Porter"
          className="w-full rounded-lg border border-border px-2.5 py-1.5 font-inter text-xs"
        />
      </label>
    </div>
  );
}

export default function AdminDelivery() {
  const qc = useQueryClient();
  const [updatingId, setUpdatingId] = useState(null);
  const [deliveryEconomics, setDeliveryEconomics] = useState({});

  const { data: orderList = [], isLoading } = useQuery({
    queryKey: ['admin-delivery-queue'],
    queryFn: () => orders.list('-created_date', 200),
    refetchInterval: 60_000,
  });

  const queue = useMemo(
    () => orderList.filter((o) => o.order_channel !== 'pos' && ACTIVE_STATUSES.includes(o.status)),
    [orderList]
  );

  const outForDelivery = queue.filter((o) => o.status === 'out_for_delivery');
  const ready = queue.filter((o) => o.status !== 'out_for_delivery');

  const getEconomics = (orderId) => deliveryEconomics[orderId] || { feeChargedRs: '', actualCostRs: '' };

  const updateStatus = async (order, status, note) => {
    setUpdatingId(order.id);
    try {
      const econ = getEconomics(order.id);
      const feeChargedPaise = econ.feeChargedRs === '' ? undefined : Math.round(Number(econ.feeChargedRs) * 100);
      const actualCostPaise = econ.actualCostRs === '' ? undefined : Math.round(Number(econ.actualCostRs) * 100);

      await appClient.functions.invoke('adminUpdateOrderStatus', {
        orderId: order.id,
        status,
        previousStatus: order.status,
        statusNote: note,
        ...(feeChargedPaise !== undefined ? { delivery_fee_charged_paise: feeChargedPaise } : {}),
        ...(actualCostPaise !== undefined ? { delivery_cost_actual_paise: actualCostPaise } : {}),
      });
      qc.invalidateQueries(['admin-delivery-queue']);
      qc.invalidateQueries(['admin-orders']);
      qc.invalidateQueries(['admin-orders-kpi']);
    } finally {
      setUpdatingId(null);
    }
  };

  const renderCard = (order) => {
    const addr = order.shipping_address || order.address_snapshot || {};
    const total = ((order.amount_paise || 0) / 100).toFixed(0);
    const mapsUrl = buildMapsUrl(order);
    const customerWa = buildCustomerWhatsApp(order);
    const isCod = order.payment_method === 'cod' && order.payment_status === 'pending_cod';
    const busy = updatingId === order.id;
    const econ = getEconomics(order.id);

    return (
      <div key={order.id} className="bg-white rounded-2xl border border-border/20 p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-sm font-semibold text-rain-cloud">{order.order_number || order.id?.slice(-8)}</p>
            <p className="font-inter text-xs text-rain-cloud/50 mt-0.5">
              {order.created_date ? format(new Date(order.created_date), 'dd MMM, h:mm a') : ''}
            </p>
          </div>
          <div className="text-right">
            <OrderStatusBadge status={order.status} />
            <p className="font-cormorant text-lg text-rain-cloud mt-1">₹{total}</p>
            {isCod ? <p className="font-inter text-[10px] text-sun-dried-clay">Collect COD</p> : null}
          </div>
        </div>

        <div>
          <p className="font-inter text-sm font-medium text-rain-cloud">{order.customer_name || 'Customer'}</p>
          {order.delivery_slot ? (
            <p className="font-inter text-xs text-forest-canopy mt-0.5">Slot: {order.delivery_slot}</p>
          ) : null}
          <p className="font-inter text-xs text-rain-cloud/55 mt-1 leading-relaxed flex items-start gap-1.5">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            {[addr.street, addr.city, addr.zip].filter(Boolean).join(', ')}
          </p>
          {order.delivery_instructions ? (
            <p className="font-inter text-[11px] text-rain-cloud/45 mt-1 italic">{order.delivery_instructions}</p>
          ) : null}
          {(order.delivery_fee_charged_paise || order.delivery_cost_actual_paise) ? (
            <p className="font-inter text-[11px] text-rain-cloud/45 mt-1">
              Delivery: charged ₹{Math.round((order.delivery_fee_charged_paise || 0) / 100)}
              {' · '}
              cost ₹{Math.round((order.delivery_cost_actual_paise || 0) / 100)}
            </p>
          ) : null}
        </div>

        <DeliveryEconomicsFields
          values={econ}
          onChange={(next) => setDeliveryEconomics((prev) => ({ ...prev, [order.id]: next }))}
        />

        <div className="flex flex-wrap gap-2">
          {order.customer_phone ? (
            <a href={`tel:${order.customer_phone}`} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-border font-inter text-xs">
              <Phone className="w-3.5 h-3.5" /> Call
            </a>
          ) : null}
          {customerWa ? (
            <a href={customerWa} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-border font-inter text-xs">
              <MessageCircle className="w-3.5 h-3.5" /> Customer
            </a>
          ) : null}
          <a href={mapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-border font-inter text-xs">
            <MapPin className="w-3.5 h-3.5" /> Maps
          </a>
        </div>

        <div className="flex gap-2 pt-1">
          {order.status !== 'out_for_delivery' ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => updateStatus(order, 'out_for_delivery', 'Out for delivery')}
              className="flex-1 py-2 rounded-full bg-forest-canopy/10 text-forest-canopy font-inter text-xs font-medium disabled:opacity-60 flex items-center justify-center gap-1"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Truck className="w-3.5 h-3.5" />}
              Out for delivery
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => updateStatus(order, 'delivered', isCod ? 'Delivered · COD collected' : 'Delivered')}
              className="flex-1 py-2 rounded-full bg-wet-earth text-white font-inter text-xs font-medium disabled:opacity-60 flex items-center justify-center gap-1"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
              Mark delivered
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-lg mx-auto pb-24">
      <AdminPageHeader
        title="Delivery board"
        description={`${queue.length} active deliveries · staff / driver view`}
      />

      <p className="font-inter text-[11px] text-rain-cloud/45 mb-4 -mt-2">
        Record courier fee charged vs actual cost when dispatching. Checkout fee collection stays off until you flip the flag in worker + commerceCopy.
      </p>

      {isLoading ? (
        <p className="text-center font-inter text-sm text-rain-cloud/45 py-12">Loading queue…</p>
      ) : queue.length === 0 ? (
        <p className="text-center font-inter text-sm text-rain-cloud/45 py-12">No active deliveries right now.</p>
      ) : (
        <div className="space-y-8">
          {outForDelivery.length > 0 && (
            <section>
              <h2 className="font-inter text-xs font-medium uppercase tracking-wider text-rain-cloud/45 mb-3">
                Out now ({outForDelivery.length})
              </h2>
              <div className="space-y-3">{outForDelivery.map(renderCard)}</div>
            </section>
          )}
          {ready.length > 0 && (
            <section>
              <h2 className="font-inter text-xs font-medium uppercase tracking-wider text-rain-cloud/45 mb-3">
                To dispatch ({ready.length})
              </h2>
              <div className="space-y-3">{ready.map(renderCard)}</div>
            </section>
          )}
        </div>
      )}

      <a
        href={`https://wa.me/${YASVIK_WHATSAPP_NUMBER}`}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-6 right-4 sm:right-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-forest-canopy text-white font-inter text-xs shadow-lg"
      >
        <MessageCircle className="w-4 h-4" />
        Yasvik support
      </a>
    </div>
  );
}
