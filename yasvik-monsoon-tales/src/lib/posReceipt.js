import { format } from 'date-fns';

export function formatPosReceiptText(sale = {}) {
  const total = ((sale.amount_paise || 0) / 100).toFixed(0);
  const lines = [
    'YASVIK',
    'Ashok Nagar · Hyderabad',
    format(new Date(), 'dd/MM/yyyy hh:mm a'),
    `Bill #${sale.receipt_id || sale.order_number || '—'}`,
    '—'.repeat(32),
    ...(sale.items || []).map((item) => {
      const left = `${item.title}${item.variant ? ` ${item.variant}` : ''} x${item.qty}`;
      const right = `₹${(item.price * item.qty).toFixed(0)}`;
      return `${left.slice(0, 22).padEnd(22)} ${right}`;
    }),
    '—'.repeat(32),
    `TOTAL${' '.repeat(22)}₹${total}`,
    `Paid: ${(sale.payment_method || 'cash').toUpperCase()}`,
  ];
  if (sale.customer_name) lines.push(`Customer: ${sale.customer_name}`);
  if (sale.customer_phone) lines.push(`Phone: ${sale.customer_phone}`);
  if (sale.cash_received) {
    lines.push(`Cash: ₹${sale.cash_received}`);
    lines.push(`Change: ₹${sale.change_due || 0}`);
  }
  lines.push('', 'Thank you · Visit again');
  return lines.join('\n');
}

export function printPosReceipt(sale) {
  const el = document.getElementById('pos-receipt-print');
  if (!el) {
    window.print();
    return;
  }
  window.print();
}
