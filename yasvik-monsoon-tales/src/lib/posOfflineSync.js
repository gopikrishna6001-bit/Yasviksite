import { appClient } from '@/api/appClient';
import { markLabelItemsSold } from '@/lib/posBarcode';
import {
  loadPendingPosSales,
  removePendingPosSale,
  updatePendingPosSale,
} from '@/lib/posOfflineStore';

export function isLikelyNetworkError(error) {
  const message = String(error?.message || error || '').toLowerCase();
  return (
    !navigator.onLine
    || message.includes('failed to fetch')
    || message.includes('network')
    || message.includes('load failed')
    || message.includes('networkerror')
  );
}

export async function syncPendingPosSales({ onProgress } = {}) {
  const pending = loadPendingPosSales().filter((sale) => sale.status === 'pending' || sale.status === 'failed');
  const results = { synced: 0, failed: 0, errors: [] };

  for (const sale of pending) {
    onProgress?.(sale);
    try {
      const res = await appClient.functions.invoke('createPosSale', {
        items: sale.items,
        payment_method: sale.payment_method,
        customer_name: sale.customer_name,
        customer_phone: sale.customer_phone,
        client_sale_id: sale.id,
        sold_at: sale.soldAt,
        notes: 'Offline counter sale',
        order_channel: sale.order_channel || 'pos',
        coupon_code: sale.discount_mode === 'coupon' ? sale.coupon_code : null,
        manual_discount_percent: sale.discount_mode === 'percent' ? sale.manual_discount_percent : null,
        manual_discount_paise: sale.discount_mode === 'fixed' ? sale.manual_discount_paise : null,
      });
      const data = res.data;
      if (!data?.success) throw new Error(data?.error || 'Sync failed');

      if (sale.labelBarcodes?.length) {
        await markLabelItemsSold(sale.labelBarcodes);
      }

      removePendingPosSale(sale.id);
      results.synced += 1;
    } catch (error) {
      updatePendingPosSale(sale.id, {
        status: 'failed',
        lastError: error?.message || 'Sync failed',
        lastSyncAttempt: new Date().toISOString(),
      });
      results.failed += 1;
      results.errors.push({ saleId: sale.id, message: error?.message || 'Sync failed' });
    }
  }

  return results;
}

export function buildOfflineSaleRecord({
  id,
  cart,
  paymentMethod,
  customerName,
  customerPhone,
  cashReceived,
  changeDue,
  total,
  subtotalPaise,
  discountPaise,
  discountMode,
  discountLabel,
  couponCode,
  manualPercent,
  manualFixedPaise,
  orderChannel,
}) {
  return {
    id,
    soldAt: new Date().toISOString(),
    status: 'pending',
    payment_method: paymentMethod,
    customer_name: customerName.trim() || 'Walk-in customer',
    customer_phone: customerPhone.replace(/\D/g, '').slice(-10) || null,
    cash_received: paymentMethod === 'cash' && cashReceived ? Number(cashReceived) : null,
    change_due: paymentMethod === 'cash' && cashReceived ? changeDue : null,
    total,
    amount_paise: Math.round(total * 100),
    subtotal_paise: subtotalPaise,
    discount_paise: discountPaise || 0,
    discount_mode: discountMode || 'none',
    discount_label: discountLabel || '',
    coupon_code: couponCode || null,
    manual_discount_percent: manualPercent,
    manual_discount_paise: manualFixedPaise,
    order_channel: orderChannel === 'whatsapp' ? 'whatsapp' : 'pos',
    items: cart.map((i) => ({
      productId: i.productId,
      product_id: i.productId,
      title: i.title,
      variant: i.variant,
      sku: i.sku,
      pack_kg: i.pack_kg,
      qty: i.qty,
      price: i.price,
      original_price: i.originalPrice,
      type: i.type || 'product',
    })),
    cart: [...cart],
    labelBarcodes: cart.map((i) => i.labelBarcode).filter(Boolean),
  };
}
