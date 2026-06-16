import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { orders } from '@/services/api';
import { useAuth } from '@/lib/AuthContext';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import OrderStatusBadge, { STATUS_CONFIG } from '../../components/admin/OrderStatusBadge';
import OrderDetailDrawer from '../../components/admin/OrderDetailDrawer';
import { Search, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

const ALL_STATUSES = ['all', ...Object.keys(STATUS_CONFIG)];

export default function AdminOrders() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const { data: orderList = [], isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => orders.list('-created_date', 200),
  });

  const filtered = useMemo(() => {
    return orderList.filter(o => {
      const q = search.toLowerCase();
      const matchSearch = !search
        || o.customer_name?.toLowerCase().includes(q)
        || o.customer_email?.toLowerCase().includes(q)
        || o.razorpay_order_id?.toLowerCase().includes(q)
        || o.receipt_id?.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || o.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [orderList, search, statusFilter]);

  const totalRevenue = orderList
    .filter(o => ['payment_received', 'confirmed', 'packing', 'ready_for_dispatch', 'shipped', 'out_for_delivery', 'delivered'].includes(o.status))
    .reduce((sum, o) => sum + (o.amount_paise || 0) / 100, 0);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <AdminPageHeader
        title="Orders"
        description={`${orderList.length} total · ₹${totalRevenue.toLocaleString('en-IN')} revenue`}
      />

      {/* Summary chips */}
      <div className="flex gap-2 mb-5 overflow-x-auto hide-scrollbar pb-1">
        {[
          { label: 'All', value: 'all', count: orderList.length },
          { label: 'Confirmed', value: 'confirmed' },
          { label: 'Packing', value: 'packing' },
          { label: 'Shipped', value: 'shipped' },
          { label: 'Delivered', value: 'delivered' },
          { label: 'Cancelled', value: 'cancelled' },
        ].map(chip => {
          const count = chip.count ?? orderList.filter(o => o.status === chip.value).length;
          return (
            <button
              key={chip.value}
              onClick={() => setStatusFilter(chip.value)}
              className={`flex-shrink-0 flex items-center gap-1.5 py-1.5 px-3.5 rounded-full font-inter text-xs transition-all ${
                statusFilter === chip.value
                  ? 'bg-rain-cloud text-white'
                  : 'bg-white border border-border text-rain-cloud/55 hover:border-rain-cloud/30'
              }`}
            >
              {chip.label}
              <span className={`text-[10px] rounded-full px-1.5 ${statusFilter === chip.value ? 'bg-white/20' : 'bg-muted'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rain-cloud/35" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, or order ID…"
            className="w-full pl-9 pr-4 py-2 border border-border rounded-xl font-inter text-sm text-rain-cloud focus:outline-none focus:border-forest-canopy"
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border border-border rounded-xl px-3 py-2 pr-8 font-inter text-sm text-rain-cloud focus:outline-none bg-white appearance-none"
          >
            {ALL_STATUSES.map(s => (
              <option key={s} value={s}>{s === 'all' ? 'All Status' : STATUS_CONFIG[s]?.label || s}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-rain-cloud/35 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-temple-stone/15 rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-inter text-sm text-rain-cloud/40">No orders found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 font-inter text-[11px] text-rain-cloud/40 uppercase tracking-wider font-normal">Order</th>
                  <th className="text-left py-3 px-4 font-inter text-[11px] text-rain-cloud/40 uppercase tracking-wider font-normal">Customer</th>
                  <th className="text-left py-3 px-4 font-inter text-[11px] text-rain-cloud/40 uppercase tracking-wider font-normal hidden sm:table-cell">Items</th>
                  <th className="text-left py-3 px-4 font-inter text-[11px] text-rain-cloud/40 uppercase tracking-wider font-normal">Amount</th>
                  <th className="text-left py-3 px-4 font-inter text-[11px] text-rain-cloud/40 uppercase tracking-wider font-normal">Status</th>
                  <th className="text-left py-3 px-4 font-inter text-[11px] text-rain-cloud/40 uppercase tracking-wider font-normal hidden md:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order, i) => (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => setSelectedOrder(order)}
                    className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4">
                      <p className="font-inter text-xs font-medium text-rain-cloud font-mono">
                        #{order.receipt_id || order.id?.slice(-8)}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-inter text-sm text-rain-cloud">{order.customer_name || '—'}</p>
                      <p className="font-inter text-xs text-rain-cloud/40">{order.customer_email}</p>
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell">
                      <p className="font-inter text-xs text-rain-cloud/55">
                        {(order.items_snapshot || []).length} item{(order.items_snapshot || []).length !== 1 ? 's' : ''}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-inter text-sm text-rain-cloud">₹{(order.amount_paise / 100).toFixed(0)}</p>
                    </td>
                    <td className="py-3 px-4">
                      <OrderStatusBadge status={order.status} small />
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell">
                      <p className="font-inter text-xs text-rain-cloud/40">
                        {order.created_date ? format(new Date(order.created_date), 'dd MMM, h:mm a') : '—'}
                      </p>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-border/50">
              <p className="font-inter text-xs text-rain-cloud/35">Showing {filtered.length} of {orderList.length} orders</p>
            </div>
          </div>
        )}
      </div>

      {selectedOrder && (
        <OrderDetailDrawer
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          currentUser={user}
        />
      )}
    </div>
  );
}