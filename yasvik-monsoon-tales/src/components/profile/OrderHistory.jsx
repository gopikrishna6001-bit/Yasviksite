import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Calendar, FileDown, MapPin, RefreshCw, ShoppingBag } from 'lucide-react';
import { orders } from '@/services/api';
import { downloadOrderInvoicePdf, canDownloadOrderInvoice } from '@/lib/orderInvoicePdf';
import { useCart } from '@/lib/CartContext';
import { buildReorderCartProduct, extractBuyAgainCandidates } from '@/lib/buyAgainUtils';
import { appClient } from '@/api/appClient';

export default function OrderHistory({ userEmail, userId }) {
  const { addItem, clearCart } = useCart();
  const [busyId, setBusyId] = useState(null);
  const [hint, setHint] = useState('');

  const { data: orderList = [], isLoading } = useQuery({
    queryKey: ['user-orders', userId || userEmail],
    queryFn: () => orders.listByUser(userId || userEmail, 20),
    enabled: !!(userId || userEmail),
  });

  const recentProducts = useMemo(
    () => extractBuyAgainCandidates(orderList, { limit: 8 }),
    [orderList]
  );

  const handleDownload = async (order) => {
    if (!canDownloadOrderInvoice(order)) {
      setHint('Invoice available after payment is confirmed.');
      return;
    }
    setBusyId(order.id);
    setHint('');
    try {
      await downloadOrderInvoicePdf(order);
    } catch (err) {
      setHint(err?.message || 'Could not download invoice.');
    } finally {
      setBusyId(null);
    }
  };

  const handleReorder = async (order) => {
    setBusyId(order.id);
    setHint('');
    try {
      const catalog = await appClient.entities.Product.list('-created_date', 500).catch(() => []);
      const candidates = extractBuyAgainCandidates([order], { limit: 20 });
      clearCart?.();
      let added = 0;
      for (const c of candidates) {
        const product = (catalog || []).find(
          (p) => p.id === c.productId || p.name === c.title || p.title === c.title
        );
        if (!product) continue;
        const { payload, variant, qty } = buildReorderCartProduct(product, c.line);
        if (payload) {
          addItem(payload, variant, qty);
          added += 1;
        }
      }
      setHint(added ? `Added ${added} items — open cart to checkout` : 'Some items are no longer available');
    } finally {
      setBusyId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-32 bg-temple-stone/20 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (orderList.length === 0) {
    return (
      <div className="text-center py-12">
        <ShoppingBag className="w-8 h-8 text-rain-cloud/20 mx-auto mb-3" />
        <p className="font-cormorant text-lg text-rain-cloud/40 font-light">No orders yet</p>
        <p className="font-inter text-xs text-rain-cloud/30 mt-1">Your order history will appear here</p>
        <Link to="/shop" className="inline-block mt-4 font-inter text-sm text-forest-canopy">Browse shop</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {recentProducts.length > 0 && (
        <div>
          <p className="font-inter text-xs uppercase tracking-wider text-rain-cloud/45 mb-2">Recently purchased</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {recentProducts.map((p) => (
              <div
                key={p.productKey}
                className="shrink-0 rounded-xl border border-border/30 bg-white px-3 py-2 min-w-[140px]"
              >
                <p className="font-inter text-xs text-rain-cloud line-clamp-2">{p.title}</p>
                <p className="font-inter text-[10px] text-rain-cloud/40 mt-0.5">
                  {p.line?.variant || 'Bought before'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {hint ? <p className="font-inter text-xs text-forest-canopy">{hint}</p> : null}

      <div className="space-y-4">
        {orderList.map((order, i) => (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-white rounded-2xl p-5 border border-border/20"
          >
            <div className="flex items-start justify-between mb-4 pb-4 border-b border-border/10">
              <div>
                <p className="font-inter text-xs text-rain-cloud/50">Order ID</p>
                <p className="font-cormorant text-base text-rain-cloud font-medium">
                  {order.order_number || order.receipt_id || order.id.slice(0, 8)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-inter text-xs text-rain-cloud/50">Amount</p>
                <p className="font-cormorant text-lg text-rain-cloud font-medium">
                  ₹{((order.amount_paise || 0) / 100).toFixed(0)}
                </p>
              </div>
            </div>

            <div className="space-y-2 mb-3">
              <div className="flex items-center gap-2 text-xs text-rain-cloud/60">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(order.created_date || order.created_at).toLocaleDateString('en-IN', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
              <div className="flex items-start gap-2 text-xs text-rain-cloud/60">
                <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>{order.customer_name}, {order.customer_phone}</span>
              </div>
            </div>

            {order.items_snapshot?.length > 0 && (
              <div className="bg-rain-mist rounded-lg p-3 text-xs mb-3">
                {order.items_snapshot.slice(0, 2).map((item, idx) => (
                  <p key={idx} className="text-rain-cloud/70">
                    {item.title} ×{item.qty}
                  </p>
                ))}
                {order.items_snapshot.length > 2 && (
                  <p className="text-rain-cloud/50 mt-1">+{order.items_snapshot.length - 2} more items</p>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleDownload(order)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 font-inter text-[11px] text-rain-cloud"
              >
                <FileDown className="w-3.5 h-3.5" />
                Download invoice
              </button>
              <button
                type="button"
                disabled={busyId === order.id}
                onClick={() => handleReorder(order)}
                className="inline-flex items-center gap-1.5 rounded-full bg-forest-canopy/10 px-3 py-1.5 font-inter text-[11px] text-forest-canopy disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reorder
              </button>
              <Link
                to={`/orders/${encodeURIComponent(order.order_number || order.id)}/track`}
                className="inline-flex items-center rounded-full border border-border px-3 py-1.5 font-inter text-[11px] text-rain-cloud/60"
              >
                Track
              </Link>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
