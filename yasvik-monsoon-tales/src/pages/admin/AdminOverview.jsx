import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  products as productsApi,
  journeys as journeysApi,
  stories as storiesApi,
  people as peopleApi,
  mediaAssets,
  categories as categoriesApi,
  orders as ordersApi,
} from '@/services/api';
import { appClient } from '@/api/appClient';
import { getProductEffectiveStock } from '@/lib/productStockUtils';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Package,
  Map,
  BookOpen,
  Users,
  Image,
  Tag,
  Store,
  ShoppingBag,
  IndianRupee,
  Clock,
  AlertTriangle,
  Truck,
  UserX,
  ChevronRight,
} from 'lucide-react';

function StatCard({ label, count, icon: Icon, to, color }) {
  return (
    <Link to={to}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -2 }}
        className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="font-inter text-xs text-rain-cloud/45 uppercase tracking-wider">{label}</p>
            <p className="font-cormorant text-4xl text-rain-cloud mt-2 font-medium">{count ?? '—'}</p>
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + '20' }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

function OpsQueueSection({ title, icon: Icon, count, to, children, emptyLabel }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-forest-canopy" />
          <h2 className="font-cormorant text-xl font-medium text-rain-cloud">{title}</h2>
          <span className="rounded-full bg-temple-stone/30 px-2 py-0.5 font-inter text-[11px] text-rain-cloud/55">{count}</span>
        </div>
        {to ? (
          <Link to={to} className="inline-flex items-center gap-1 font-inter text-xs text-forest-canopy hover:underline">
            View all
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>
      {count === 0 ? (
        <p className="font-inter text-sm text-rain-cloud/45">{emptyLabel}</p>
      ) : (
        children
      )}
    </section>
  );
}

export default function AdminOverview() {
  const { data: products = [] } = useQuery({ queryKey: ['admin-products-count'], queryFn: () => productsApi.list('-created_date', 500) });
  const { data: journeys = [] } = useQuery({ queryKey: ['admin-journeys-count'], queryFn: () => journeysApi.list('sort_order', 100) });
  const { data: stories = [] } = useQuery({ queryKey: ['admin-stories-count'], queryFn: () => storiesApi.list('-created_date', 100) });
  const { data: people = [] } = useQuery({ queryKey: ['admin-people-count'], queryFn: () => peopleApi.list('-created_date', 100) });
  const { data: media = [] } = useQuery({ queryKey: ['admin-media-count'], queryFn: () => mediaAssets.list('-created_date', 100) });
  const { data: categories = [] } = useQuery({ queryKey: ['admin-categories-count'], queryFn: () => categoriesApi.list('sort_order', 100) });
  const { data: orders = [] } = useQuery({ queryKey: ['admin-orders-kpi'], queryFn: () => ordersApi.list('-created_date', 250) });
  const { data: inactiveCustomers = [] } = useQuery({
    queryKey: ['admin-overview-inactive-customers'],
    queryFn: async () => {
      const res = await appClient.functions.invoke('listCustomers', { filter: 'inactive_30', limit: 50 });
      return res.data?.customers || [];
    },
  });

  const opsKpi = useMemo(() => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todayOrders = orders.filter((order) => {
      const created = new Date(order.created_date || order.created_at);
      return created >= startOfDay;
    });
    const paidToday = todayOrders.filter((order) => order.payment_status === 'paid');
    const revenuePaise = paidToday.reduce(
      (sum, order) => sum + (order.amount_paise ?? Math.round(Number(order.total_amount || 0) * 100)),
      0,
    );
    const pendingFulfillment = orders.filter((order) =>
      ['pending', 'confirmed', 'packing', 'ready_for_dispatch'].includes(String(order.status || '').toLowerCase()),
    );
    return {
      ordersToday: todayOrders.length,
      paidToday: paidToday.length,
      revenueRs: Math.round(revenuePaise / 100),
      pendingFulfillment: pendingFulfillment.length,
      fulfillmentQueue: pendingFulfillment.slice(0, 6),
    };
  }, [orders]);

  const lowStockProducts = useMemo(() => {
    return products
      .filter((p) => {
        const stock = getProductEffectiveStock(p);
        const threshold = Number(p.low_stock_threshold) || 10;
        return stock > 0 && stock <= threshold;
      })
      .sort((a, b) => getProductEffectiveStock(a) - getProductEffectiveStock(b))
      .slice(0, 8);
  }, [products]);

  const stats = [
    { label: 'Products', count: products.length, icon: Package, to: '/admin/products', color: '#6E5846' },
    { label: 'Journeys', count: journeys.length, icon: Map, to: '/admin/journeys', color: '#5B7A4B' },
    { label: 'Stories', count: stories.length, icon: BookOpen, to: '/admin/stories', color: '#2F3A34' },
    { label: 'People', count: people.length, icon: Users, to: '/admin/people', color: '#D1A14B' },
    { label: 'Media Assets', count: media.length, icon: Image, to: '/admin/media', color: '#8BA66D' },
    { label: 'Categories', count: categories.length, icon: Tag, to: '/admin/categories', color: '#CBBCA5' },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="font-cormorant text-3xl text-rain-cloud font-medium">Overview</h1>
        <p className="font-inter text-sm text-rain-cloud/45 mt-1">Store ops and content at a glance.</p>
      </div>

      <div className="mb-8 bg-wet-earth rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="font-inter text-[10px] uppercase tracking-[0.2em] text-white/50">Store counter</p>
            <h2 className="font-cormorant text-2xl mt-1">Bill walk-in customers</h2>
            <p className="font-inter text-sm text-white/65 mt-1">Search products, take cash/UPI/card, print receipt. Sales sync to Orders & inventory.</p>
          </div>
          <Link
            to="/admin/pos"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-wet-earth rounded-full font-inter text-sm font-semibold hover:bg-white/90 shrink-0"
          >
            <Store className="w-4 h-4" />
            Open Counter POS
          </Link>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Orders today', value: opsKpi.ordersToday, icon: ShoppingBag, color: '#6E5846' },
          { label: 'Paid today', value: opsKpi.paidToday, icon: Package, color: '#5B7A4B' },
          { label: 'Revenue today', value: `₹${opsKpi.revenueRs}`, icon: IndianRupee, color: '#D1A14B' },
          { label: 'Awaiting fulfillment', value: opsKpi.pendingFulfillment, icon: Clock, color: '#2F3A34' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-inter text-xs uppercase tracking-wider text-rain-cloud/45">{label}</p>
                <p className="mt-2 font-cormorant text-3xl font-medium text-rain-cloud">{value}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}20` }}>
                <Icon className="h-5 w-5" style={{ color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-8 space-y-4">
        <OpsQueueSection
          title="Fulfillment queue"
          icon={Truck}
          count={opsKpi.pendingFulfillment}
          to="/admin/delivery"
          emptyLabel="No orders waiting to pack or dispatch."
        >
          <ul className="space-y-2">
            {opsKpi.fulfillmentQueue.map((order) => (
              <li key={order.id}>
                <Link
                  to="/admin/orders"
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/30 px-3 py-2.5 hover:bg-muted/20"
                >
                  <div className="min-w-0">
                    <p className="truncate font-inter text-sm font-medium text-rain-cloud">
                      {order.order_number || order.id?.slice(-8)}
                    </p>
                    <p className="truncate font-inter text-xs text-rain-cloud/45">
                      {order.customer_name || 'Customer'} · {String(order.status || '').replace(/_/g, ' ')}
                    </p>
                  </div>
                  <span className="shrink-0 font-inter text-sm text-rain-cloud/70">
                    ₹{Math.round((order.amount_paise || 0) / 100)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </OpsQueueSection>

        <OpsQueueSection
          title="Low stock"
          icon={AlertTriangle}
          count={lowStockProducts.length}
          to="/admin/products"
          emptyLabel="All tracked products above their low-stock threshold."
        >
          <ul className="space-y-2">
            {lowStockProducts.map((product) => (
              <li key={product.id}>
                <Link
                  to="/admin/inventory"
                  className="flex items-center justify-between gap-3 rounded-xl border border-amber-200/60 bg-amber-50/40 px-3 py-2.5 hover:bg-amber-50/70"
                >
                  <p className="truncate font-inter text-sm text-rain-cloud">{product.title || product.name}</p>
                  <span className="shrink-0 font-inter text-xs font-medium text-amber-800">
                    {getProductEffectiveStock(product)} left
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </OpsQueueSection>

        <OpsQueueSection
          title="Inactive customers (30+ days)"
          icon={UserX}
          count={inactiveCustomers.length}
          to="/admin/customers"
          emptyLabel="No inactive customers in the sample — great retention."
        >
          <ul className="space-y-2">
            {inactiveCustomers.slice(0, 8).map((customer) => (
              <li key={customer.id}>
                <Link
                  to={`/admin/customers/${customer.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/30 px-3 py-2.5 hover:bg-muted/20"
                >
                  <div className="min-w-0">
                    <p className="truncate font-inter text-sm font-medium text-rain-cloud">
                      {customer.name || customer.phone_digits || 'Customer'}
                    </p>
                    <p className="truncate font-inter text-xs text-rain-cloud/45">
                      {customer.order_count || 0} orders · ₹{Math.round((customer.total_spend_paise || 0) / 100)}
                    </p>
                  </div>
                  {customer.last_order_at ? (
                    <span className="shrink-0 font-inter text-[10px] text-rain-cloud/40">
                      Last {new Date(customer.last_order_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </OpsQueueSection>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <StatCard {...s} />
          </motion.div>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="font-cormorant text-xl text-rain-cloud font-medium mb-5">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: 'Add New Product', to: '/admin/products', color: '#6E5846' },
            { label: 'Create Journey', to: '/admin/journeys', color: '#5B7A4B' },
            { label: 'Write a Story', to: '/admin/stories', color: '#2F3A34' },
            { label: 'Add Person', to: '/admin/people', color: '#D1A14B' },
          ].map(a => (
            <Link
              key={a.label}
              to={a.to}
              className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-temple-stone transition-all"
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: a.color }} />
              <span className="font-inter text-sm text-rain-cloud/70">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
