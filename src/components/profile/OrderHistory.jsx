import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { orders } from '@/services/api';
import { ShoppingBag, Calendar, MapPin } from 'lucide-react';

export default function OrderHistory({ userEmail }) {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['user-orders', userEmail],
    queryFn: () => orders.listByUser(userEmail, 20),
    enabled: !!userEmail,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="h-32 bg-temple-stone/20 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <ShoppingBag className="w-8 h-8 text-rain-cloud/20 mx-auto mb-3" />
        <p className="font-cormorant text-lg text-rain-cloud/40 font-light">No orders yet</p>
        <p className="font-inter text-xs text-rain-cloud/30 mt-1">Your order history will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order, i) => (
        <motion.div
          key={order.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className="bg-white rounded-2xl p-5 border border-border/20"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-4 pb-4 border-b border-border/10">
            <div>
              <p className="font-inter text-xs text-rain-cloud/50">Order ID</p>
              <p className="font-cormorant text-base text-rain-cloud font-medium">{order.receipt_id || order.id.slice(0, 8)}</p>
            </div>
            <div className="text-right">
              <p className="font-inter text-xs text-rain-cloud/50">Amount</p>
              <p className="font-cormorant text-lg text-rain-cloud font-medium">₹{(order.amount_paise / 100).toFixed(0)}</p>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-2 mb-3">
            <div className="flex items-center gap-2 text-xs text-rain-cloud/60">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(order.created_date).toLocaleDateString('en-IN', {
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

          {/* Items preview */}
          {order.items_snapshot?.length > 0 && (
            <div className="bg-rain-mist rounded-lg p-3 text-xs">
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
        </motion.div>
      ))}
    </div>
  );
}