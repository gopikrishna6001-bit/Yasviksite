import { format } from 'date-fns';

export const YASVIK_STORE = {
  name: 'Yasvik',
  address: 'Ashok Nagar, Hyderabad, Telangana',
  phone: '+91 78429 38998',
  email: 'hello@yasvik.com',
  fssai: '23626032001451',
  website: 'www.yasvik.com',
};

export function buildCartLineRows(items = []) {
  return items.map((item) => ({
    title: item.title,
    variant: item.variant,
    sku: item.sku,
    qty: item.qty,
    unitPrice: Number(item.price) || 0,
    lineTotal: (Number(item.price) || 0) * (item.qty || 1),
    isCustom: item.type === 'custom',
  }));
}

export function formatSaleDocuments(sale = {}) {
  const items = buildCartLineRows(sale.items || []);
  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  const total = sale.amount_paise != null ? sale.amount_paise / 100 : subtotal;

  return {
    billNo: sale.receipt_id || sale.order_number || '—',
    orderId: sale.order_id || null,
    date: format(new Date(), 'dd MMM yyyy, h:mm a'),
    customerName: sale.customer_name || 'Walk-in customer',
    customerPhone: sale.customer_phone || '',
    paymentMethod: sale.payment_method || 'cash',
    cashReceived: sale.cash_received,
    changeDue: sale.change_due,
    items,
    subtotal,
    total,
    store: YASVIK_STORE,
  };
}

export function printPosDocument(elementId) {
  const el = document.getElementById(elementId);
  if (!el) {
    window.print();
    return;
  }
  window.print();
}
