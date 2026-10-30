import { format } from 'date-fns';
import { allocateOrderDiscountToLines } from '@/lib/orderLinePricing';

export const YASVIK_STORE = {
  name: 'Yasvik Foods',
  brand: 'Yasvik',
  address: 'Bavanipuram Colony Road no 4, Ashok Nagar, Chanda Nagar, Hyderabad, Telangana 500050',
  addressLines: [
    'Yasvik Store, Bavanipuram Colony Road no 4',
    'Ashok Nagar, Chanda Nagar',
    'Hyderabad, Telangana 500050',
  ],
  phone: '+91 78429 38998',
  email: 'yasvikfoods@gmail.com',
  fssai: '23626032001451',
  website: 'www.yasvik.com',
};

export function buildCartLineRows(items = [], discountPaise = 0, subtotalPaise = null) {
  return allocateOrderDiscountToLines(items, discountPaise, subtotalPaise).map((item) => {
    const discountPercent = item.originalLineTotal > 0 && item.discountAllocated > 0
      ? Math.round((item.discountAllocated / item.originalLineTotal) * 100)
      : 0;
    return {
      title: item.title,
      variant: item.variant,
      sku: item.sku,
      qty: item.qty,
      unitPrice: item.originalUnitPrice,
      lineTotal: item.originalLineTotal,
      discountAllocated: item.discountAllocated,
      discountPercent,
      finalLineTotal: item.finalLineTotal,
      effectiveUnitPrice: item.effectiveUnitPrice,
      isCustom: item.type === 'custom',
    };
  });
}

export function formatSaleDocuments(sale = {}) {
  const items = buildCartLineRows(
    sale.items || [],
    sale.discount_paise || 0,
    sale.subtotal_paise,
  );
  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  const total = sale.amount_paise != null ? sale.amount_paise / 100 : subtotal;
  const discount = sale.discount_paise != null
    ? Number(sale.discount_paise) / 100
    : items.reduce((sum, item) => sum + item.discountAllocated, 0);
  const bonusRedeemed = sale.bonus_redeemed_paise != null
    ? Number(sale.bonus_redeemed_paise) / 100
    : 0;
  const bonusEarned = sale.bonus_earned_paise != null
    ? Number(sale.bonus_earned_paise) / 100
    : 0;
  const bonusBalanceAfter = sale.bonus_balance_after_paise != null
    ? Number(sale.bonus_balance_after_paise) / 100
    : null;

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
    discount,
    discountLabel: sale.discount_label || sale.coupon_code || '',
    bonusRedeemed,
    bonusEarned,
    bonusBalanceAfter,
    bonusExpiresAt: sale.bonus_breakdown?.expires_at || null,
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
