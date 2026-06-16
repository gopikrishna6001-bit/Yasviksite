const STATUS_CONFIG = {
  pending:            { label: 'Pending',             color: 'bg-gray-100 text-gray-500' },
  payment_received:   { label: 'Payment Received',    color: 'bg-blue-100 text-blue-600' },
  confirmed:          { label: 'Confirmed',            color: 'bg-indigo-100 text-indigo-600' },
  packing:            { label: 'Packing',              color: 'bg-amber-100 text-amber-600' },
  ready_for_dispatch: { label: 'Ready to Dispatch',   color: 'bg-warm-turmeric/15 text-warm-turmeric' },
  shipped:            { label: 'Shipped',              color: 'bg-sky-100 text-sky-600' },
  out_for_delivery:   { label: 'Out for Delivery',    color: 'bg-teal-100 text-teal-600' },
  delivered:          { label: 'Delivered',            color: 'bg-forest-canopy/15 text-forest-canopy' },
  cancelled:          { label: 'Cancelled',            color: 'bg-red-100 text-red-500' },
  failed:             { label: 'Failed',               color: 'bg-red-100 text-red-500' },
  refunded:           { label: 'Refunded',             color: 'bg-purple-100 text-purple-500' },
};

export default function OrderStatusBadge({ status, small = false }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: 'bg-gray-100 text-gray-400' };
  return (
    <span className={`font-inter rounded-full w-fit whitespace-nowrap ${cfg.color} ${small ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'}`}>
      {cfg.label}
    </span>
  );
}

export { STATUS_CONFIG };