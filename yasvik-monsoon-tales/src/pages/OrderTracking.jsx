import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { appClient } from '@/api/appClient';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Package, MapPin, Truck, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

// Narrative status map
const STATUS_NARRATIVE = {
  pending:              { label: 'Order Received',        icon: Clock,         desc: 'We have your order and are reviewing it now.' },
  payment_received:     { label: 'Payment Confirmed',     icon: CheckCircle2,  desc: 'Your payment came through safely.' },
  confirmed:            { label: 'Carefully Confirmed',   icon: CheckCircle2,  desc: 'Your order has been confirmed by our team.' },
  packing:              { label: 'Being Packed',          icon: Package,       desc: 'Your items are being thoughtfully packed.' },
  ready_for_dispatch:   { label: 'Leaving the Fields',    icon: Package,       desc: 'Your order is packed and ready to begin its journey.' },
  shipped:              { label: 'On Its Way',            icon: Truck,         desc: 'Your order has been dispatched and is travelling to you.' },
  out_for_delivery:     { label: 'Out for Delivery',      icon: Truck,         desc: 'Your order is nearby — arriving today.' },
  delivered:            { label: 'Delivered with Care',   icon: CheckCircle2,  desc: 'Your order has arrived. We hope you love it.' },
  cancelled:            { label: 'Order Cancelled',       icon: AlertCircle,   desc: 'This order has been cancelled.' },
  refunded:             { label: 'Refund Initiated',      icon: AlertCircle,   desc: 'Your refund has been initiated and will reflect shortly.' },
  failed:               { label: 'Payment Failed',        icon: AlertCircle,   desc: 'Payment was not completed for this order.' },
};

const TIMELINE_ORDER = [
  'pending', 'payment_received', 'confirmed', 'packing',
  'ready_for_dispatch', 'shipped', 'out_for_delivery', 'delivered'
];

const isCancelled = (s) => ['cancelled', 'refunded', 'failed'].includes(s);

function getProgressIndex(status) {
  if (isCancelled(status)) return -1;
  return TIMELINE_ORDER.indexOf(status);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatAmount(paise) {
  return `₹${(paise / 100).toFixed(0)}`;
}

export default function OrderTracking() {
  const { orderId } = useParams();
  const [contact, setContact] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const isEmail = contact.includes('@');
      const payload = { orderId, [isEmail ? 'email' : 'phone']: contact };
      const res = await appClient.functions.invoke('getOrderTrackingDetails', payload);
      if (res.data?.order) {
        setOrder(res.data.order);
      } else {
        setError(res.data?.error || 'Verification failed. Please check your details.');
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  const statusInfo = order ? (STATUS_NARRATIVE[order.status] || STATUS_NARRATIVE.pending) : null;
  const progressIdx = order ? getProgressIndex(order.status) : -1;
  const cancelled = order ? isCancelled(order.status) : false;

  return (
    <div className="min-h-screen bg-rain-mist font-inter">
      {/* Top nav */}
      <div className="px-5 py-5 flex items-center gap-3">
        <Link to="/" className="text-rain-cloud/50 hover:text-wet-earth transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <span className="font-cormorant text-lg text-rain-cloud tracking-wide">Yasvik</span>
      </div>

      <div className="max-w-lg mx-auto px-5 pb-16">

        {/* Header */}
        <div className="mb-8 mt-2">
          <h1 className="font-cormorant text-3xl text-rain-cloud font-light leading-tight">
            Track Your Order
          </h1>
          <p className="font-inter text-sm text-rain-cloud/50 mt-1.5 leading-relaxed">
            Every order travels with care. Let's find yours.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {!order ? (
            /* Verification form */
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-border/40">
                <p className="font-inter text-sm text-rain-cloud/60 mb-5 leading-relaxed">
                  Enter the email address or phone number you used when placing your order.
                </p>
                <form onSubmit={handleVerify} className="space-y-4">
                  <div>
                    <label className="block font-inter text-xs text-rain-cloud/50 mb-1.5 uppercase tracking-wider">
                      Order Reference
                    </label>
                    <input
                      value={orderId}
                      readOnly
                      className="w-full px-4 py-3 bg-muted/40 border border-border rounded-xl font-inter text-sm text-rain-cloud/60 cursor-default"
                    />
                  </div>
                  <div>
                    <label className="block font-inter text-xs text-rain-cloud/50 mb-1.5 uppercase tracking-wider">
                      Email or Phone
                    </label>
                    <input
                      type="text"
                      value={contact}
                      onChange={e => setContact(e.target.value)}
                      placeholder="you@email.com or 9876543210"
                      required
                      className="w-full px-4 py-3 border border-border rounded-xl font-inter text-sm text-rain-cloud focus:outline-none focus:border-forest-canopy transition-colors"
                    />
                  </div>
                  {error && (
                    <p className="font-inter text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
                  )}
                  <button
                    type="submit"
                    disabled={loading || !contact.trim()}
                    className="w-full py-3 bg-wet-earth text-white font-inter text-sm rounded-xl hover:bg-wet-earth/90 disabled:opacity-50 transition-all"
                  >
                    {loading ? 'Verifying…' : 'View My Order'}
                  </button>
                </form>
              </div>

              {/* Ambient line */}
              <p className="font-cormorant italic text-center text-rain-cloud/30 text-base mt-8">
                "From field to your table, with intention."
              </p>
            </motion.div>

          ) : (
            /* Order tracking view */
            <motion.div
              key="tracking"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-5"
            >
              {/* Status hero */}
              <div className={`rounded-2xl p-6 ${cancelled ? 'bg-red-50 border border-red-100' : 'bg-white border border-border/40 shadow-sm'}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${cancelled ? 'bg-red-100' : 'bg-forest-canopy/10'}`}>
                    {statusInfo && <statusInfo.icon className={`w-6 h-6 ${cancelled ? 'text-red-500' : 'text-forest-canopy'}`} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-inter text-xs text-rain-cloud/40 uppercase tracking-wider mb-1">Current Status</p>
                    <h2 className="font-cormorant text-2xl text-rain-cloud font-medium leading-tight">
                      {statusInfo?.label}
                    </h2>
                    <p className="font-inter text-sm text-rain-cloud/55 mt-1.5 leading-relaxed">
                      {statusInfo?.desc}
                    </p>
                  </div>
                </div>

                {/* Delivery estimate */}
                {order.delivery_estimate && !cancelled && (
                  <div className="mt-4 pt-4 border-t border-border/30">
                    <p className="font-inter text-xs text-rain-cloud/40 uppercase tracking-wider mb-0.5">Estimated Delivery</p>
                    <p className="font-inter text-sm text-rain-cloud font-medium">{order.delivery_estimate}</p>
                  </div>
                )}

                {/* Tracking ID */}
                {order.tracking_id && !cancelled && (
                  <div className="mt-3 pt-3 border-t border-border/30">
                    <p className="font-inter text-xs text-rain-cloud/40 uppercase tracking-wider mb-0.5">Tracking ID</p>
                    <p className="font-inter text-sm text-rain-cloud font-mono">{order.tracking_id}{order.carrier ? ` · ${order.carrier}` : ''}</p>
                  </div>
                )}
              </div>

              {/* Progress timeline */}
              {!cancelled && (
                <div className="bg-white rounded-2xl p-6 border border-border/40 shadow-sm">
                  <p className="font-inter text-xs text-rain-cloud/40 uppercase tracking-wider mb-5">Journey</p>
                  <div className="space-y-0">
                    {TIMELINE_ORDER.map((step, idx) => {
                      const isCompleted = idx <= progressIdx;
                      const isCurrent = idx === progressIdx;
                      const info = STATUS_NARRATIVE[step];
                      return (
                        <div key={step} className="flex items-start gap-3">
                          {/* Dot + line */}
                          <div className="flex flex-col items-center">
                            <div className={`w-3 h-3 rounded-full mt-0.5 flex-shrink-0 transition-all ${
                              isCurrent ? 'bg-forest-canopy ring-4 ring-forest-canopy/20' :
                              isCompleted ? 'bg-forest-canopy' : 'bg-border'
                            }`} />
                            {idx < TIMELINE_ORDER.length - 1 && (
                              <div className={`w-px flex-1 min-h-[28px] mt-1 ${isCompleted && idx < progressIdx ? 'bg-forest-canopy/40' : 'bg-border/60'}`} />
                            )}
                          </div>
                          {/* Label */}
                          <div className={`pb-5 ${idx === TIMELINE_ORDER.length - 1 ? 'pb-0' : ''}`}>
                            <p className={`font-inter text-sm leading-none ${isCurrent ? 'text-rain-cloud font-medium' : isCompleted ? 'text-rain-cloud/70' : 'text-rain-cloud/30'}`}>
                              {info?.label}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Order items */}
              {order.items_snapshot?.length > 0 && (
                <div className="bg-white rounded-2xl p-6 border border-border/40 shadow-sm">
                  <p className="font-inter text-xs text-rain-cloud/40 uppercase tracking-wider mb-4">What's Travelling</p>
                  <div className="space-y-3">
                    {order.items_snapshot.map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div>
                          <p className="font-inter text-sm text-rain-cloud">{item.title}</p>
                          {(item.unit || item.variant) && (
                            <p className="font-inter text-xs text-rain-cloud/40 mt-0.5">
                              {[item.unit, item.variant].filter(Boolean).join(' · ')}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-inter text-sm text-rain-cloud/70">×{item.qty}</p>
                          <p className="font-inter text-xs text-rain-cloud/40">₹{(item.price * item.qty).toFixed(0)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-3 mt-3 border-t border-border/30 flex justify-between">
                    <p className="font-inter text-sm text-rain-cloud/50">Total</p>
                    <p className="font-inter text-sm font-medium text-rain-cloud">{formatAmount(order.amount_paise)}</p>
                  </div>
                </div>
              )}

              {/* Delivery address */}
              {order.shipping_address && (
                <div className="bg-white rounded-2xl p-6 border border-border/40 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-4 h-4 text-rain-cloud/35" />
                    <p className="font-inter text-xs text-rain-cloud/40 uppercase tracking-wider">Delivering To</p>
                  </div>
                  <p className="font-inter text-sm text-rain-cloud/70 leading-relaxed">
                    {[
                      order.shipping_address.street,
                      order.shipping_address.city,
                      order.shipping_address.state,
                      order.shipping_address.zip,
                    ].filter(Boolean).join(', ')}
                  </p>
                  {order.delivery_instructions && (
                    <p className="font-inter text-xs text-rain-cloud/45 mt-2 italic">"{order.delivery_instructions}"</p>
                  )}
                </div>
              )}

              {/* Activity log (from timeline field) */}
              {order.timeline?.length > 0 && (
                <div className="bg-white rounded-2xl p-6 border border-border/40 shadow-sm">
                  <p className="font-inter text-xs text-rain-cloud/40 uppercase tracking-wider mb-4">Activity</p>
                  <div className="space-y-3">
                    {[...order.timeline].reverse().map((entry, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-temple-stone mt-1.5 flex-shrink-0" />
                        <div>
                          <p className="font-inter text-xs text-rain-cloud/60">
                            {STATUS_NARRATIVE[entry.status]?.label || entry.status}
                          </p>
                          {entry.note && (
                            <p className="font-inter text-xs text-rain-cloud/40 mt-0.5">{entry.note}</p>
                          )}
                          <p className="font-inter text-[10px] text-rain-cloud/30 mt-0.5">{formatDate(entry.timestamp)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer touch */}
              <p className="font-cormorant italic text-center text-rain-cloud/30 text-base pt-2">
                Thank you for being part of this journey.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}