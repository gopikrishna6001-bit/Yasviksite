import { YASVIK_SUPPORT_PHONE_DISPLAY, YASVIK_PHONE_DIGITS, YASVIK_WHATSAPP_NUMBER } from '@/lib/storeLocation';
import { STATUS_CONFIG } from '@/components/admin/OrderStatusBadge';
import { allocateOrderDiscountToLines } from '@/lib/orderLinePricing';

const SITE = 'https://www.yasvik.com';

/** Digits only, last 10 for Indian mobiles. */
export function customerPhoneDigits(phone) {
  return String(phone || '').replace(/\D/g, '').slice(-10);
}

function isMobileUa() {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
}

export function customerWhatsAppHref(phone, message, { preferApp = true } = {}) {
  const digits = customerPhoneDigits(phone);
  if (digits.length !== 10) return null;
  // Keep under ~1400 chars — long carts break deep links on mobile
  const text = String(message || '').slice(0, 1400);
  const encoded = encodeURIComponent(text);
  if (preferApp && isMobileUa()) {
    return `whatsapp://send?phone=91${digits}&text=${encoded}`;
  }
  return `https://wa.me/91${digits}?text=${encoded}`;
}

export function isStorePhone(phone) {
  return customerPhoneDigits(phone) === YASVIK_PHONE_DIGITS;
}

/**
 * Open chat TO customer in the same user-gesture turn when possible.
 * Uses api.whatsapp.com (more reliable than whatsapp:// on Business devices).
 */
export function openCustomerWhatsApp(phone, message) {
  const digits = customerPhoneDigits(phone);
  if (digits.length !== 10) return false;
  if (digits === YASVIK_PHONE_DIGITS) return false;

  const text = String(message || '').slice(0, 1400);
  const href = `https://api.whatsapp.com/send?phone=91${digits}&text=${encodeURIComponent(text)}`;

  try {
    if (isMobileUa()) {
      window.location.assign(href);
      return true;
    }

    const a = document.createElement('a');
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  } catch {
    try {
      window.location.href = href;
      return true;
    } catch {
      return false;
    }
  }
}

function orderRef(order = {}) {
  return order.order_number || order.receipt_id || order.id?.slice?.(-8) || '—';
}

function rupeesFromPaise(paise) {
  return Math.round(Number(paise || 0) / 100);
}

function moneyFromOrder(order = {}) {
  if (order.amount_paise != null) return rupeesFromPaise(order.amount_paise);
  return Math.round(Number(order.total || order.total_amount || 0));
}

function formatPaymentLabel(method = '') {
  const raw = String(method || '').replace(/_/g, ' ').trim();
  if (!raw) return '';
  return raw.replace(/\b\w/g, (c) => c.toUpperCase());
}

function customerFirstName(order = {}) {
  const raw = String(order.customer_name || '').trim();
  if (!raw || /^walk[- ]?in/i.test(raw)) return 'there';
  return raw.split(/\s+/)[0];
}

function formatInrDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatInr(amount) {
  const n = Math.round(Number(amount || 0));
  return `₹${n}`;
}

function countOrderItems(order = {}) {
  const items = order.items_snapshot || order.items || [];
  if (!Array.isArray(items) || items.length === 0) return 0;
  return items.length;
}

/** Clean site link — never put raw media/storage paths in WhatsApp. */
export function publicInvoicePageUrl(order = {}, billNo = '') {
  const ref = order.order_number || order.receipt_id || billNo || order.id;
  if (!ref) return null;
  return `${SITE}/invoice/${encodeURIComponent(String(ref))}`;
}

function formatEarnRateHint(breakdown = {}) {
  const lines = Array.isArray(breakdown?.lines) ? breakdown.lines : [];
  const rates = [
    ...new Set(
      lines
        .filter((line) => line?.eligible && Number(line.applied_rate) > 0 && Number(line.earned_paise) > 0)
        .map((line) => Number(line.applied_rate))
    ),
  ].sort((a, b) => a - b);

  if (rates.length === 1) return ` (${rates[0]}% on eligible items)`;
  if (rates.length > 1) return ` (${rates[0]}–${rates[rates.length - 1]}% on eligible items)`;
  return ' (category bonus on this bill)';
}

/** Shared Yasvik Bonus lines for WhatsApp + invoice footers. */
export function buildYasvikBonusMessageLines(order = {}) {
  const hasPhone = customerPhoneDigits(order.customer_phone || order.guest_phone).length === 10;
  const isCounterSale = String(order.order_channel || '').toLowerCase() === 'pos';
  const earned = Number(order.bonus_earned_paise || 0);
  const redeemed = Number(order.bonus_redeemed_paise || 0);
  const balance = order.bonus_balance_after_paise;
  const expiresAt = order.bonus_breakdown?.expires_at;
  const hasDiscount =
    Number(order.discount_paise || 0) > 0 || Number(order.discount_amount || 0) > 0;

  // Discounted bills do not earn bonus — don't mention earn in that case.
  const showEarned = earned > 0 && !hasDiscount;

  if (!showEarned && redeemed <= 0 && balance == null) return [];
  if (!showEarned && redeemed <= 0 && Number(balance) <= 0) return [];

  const lines = ['', 'Your Yasvik Bonus'];
  if (redeemed > 0) {
    lines.push(`Used today: ${formatInr(redeemed / 100)}`);
  }
  if (showEarned) {
    lines.push(
      `Earned today: ${formatInr(earned / 100)}${formatEarnRateHint(order.bonus_breakdown)} (usable from your next order)`
    );
  }
  if (balance != null && (showEarned || redeemed > 0 || Number(balance) > 0)) {
    lines.push(`Balance: ${formatInr(Number(balance) / 100)}`);
  }
  const expiryLabel = formatInrDate(expiresAt);
  if (expiryLabel && (showEarned || Number(balance) > 0)) {
    lines.push(`Valid until: ${expiryLabel}`);
  }

  if (showEarned || redeemed > 0 || Number(balance) > 0) {
    if (hasPhone && isCounterSale) {
      lines.push('On your next visit, we\'ll suggest using your bonus at checkout.');
    } else if (hasPhone) {
      lines.push('Use it on your next order at yasvik.com.');
    } else if (isCounterSale) {
      lines.push('Share your mobile number at the counter to collect and use Yasvik Bonus.');
    } else {
      lines.push('Use the same mobile number on your next order to redeem.');
    }
  }

  return lines;
}

function billMoneySummaryLines(order = {}) {
  const items = order.items_snapshot || order.items || [];
  const discountPaise =
    order.discount_paise != null
      ? Number(order.discount_paise)
      : Math.round(Number(order.discount_amount || 0) * 100);
  const pricedItems = allocateOrderDiscountToLines(items, discountPaise, order.subtotal_paise);

  const actualBilled =
    order.subtotal_paise != null
      ? rupeesFromPaise(order.subtotal_paise)
      : Math.round(pricedItems.reduce((sum, line) => sum + Number(line.originalLineTotal || 0), 0));

  const amountSaved = Math.max(0, rupeesFromPaise(discountPaise));
  const delivery =
    order.delivery_fee_paise != null ? rupeesFromPaise(order.delivery_fee_paise) : 0;
  const redeemed = rupeesFromPaise(order.bonus_redeemed_paise);
  const paid = moneyFromOrder(order);
  const finalBill =
    order.subtotal_paise != null || discountPaise
      ? Math.max(0, actualBilled - amountSaved + delivery)
      : paid + redeemed;

  // No discount — don't mention discount at all (avoids customer confusion).
  if (amountSaved <= 0) {
    if (redeemed > 0) {
      return [
        `Bill total: ${formatInr(paid + redeemed)}`,
        `Yasvik Bonus used: −${formatInr(redeemed)}`,
        `Amount paid: ${formatInr(paid)}`,
      ];
    }
    return [`Bill total: ${formatInr(paid || finalBill)}`];
  }

  const lines = [
    `Bill before discount: ${formatInr(actualBilled)}`,
    `Amount saved: ${formatInr(amountSaved)}`,
    `Final bill: ${formatInr(finalBill)}`,
  ];

  if (redeemed > 0) {
    lines.push(`Yasvik Bonus used: −${formatInr(redeemed)}`);
    lines.push(`Amount paid: ${formatInr(paid)}`);
  } else if (delivery > 0 && paid !== finalBill) {
    lines.push(`Amount paid: ${formatInr(paid)}`);
  }

  if (order.discount_label) {
    lines.push(`Offer: ${order.discount_label}`);
  }

  return lines.filter(Boolean);
}

/**
 * Branded Yasvik invoice WhatsApp message — short summary.
 * Full line items live in the attached PDF (WhatsApp cannot hide URLs behind “tap here”).
 */
export function buildInvoiceWhatsAppMessage(order = {}, { invoiceUrl, trackUrl, includeInvoiceLink = false } = {}) {
  const name = customerFirstName(order);
  const ref = orderRef(order);
  const pay = formatPaymentLabel(order.payment_method);
  const isCounterSale = String(order.order_channel || '').toLowerCase() === 'pos';
  const track =
    trackUrl ||
    `${SITE}/orders/${encodeURIComponent(ref)}/track`;
  const bonusLines = buildYasvikBonusMessageLines(order);
  const itemCount = countOrderItems(order);
  const invoiceLink = includeInvoiceLink
    ? (publicInvoicePageUrl(order, ref) || invoiceUrl || null)
    : null;

  return [
    `Namaste ${name},`,
    '',
    `Thank you for choosing Yasvik.`,
    '',
    `Invoice: ${ref}`,
    itemCount > 0 ? `${itemCount} item${itemCount === 1 ? '' : 's'}` : null,
    ...billMoneySummaryLines(order),
    pay ? `Paid via: ${pay}` : null,
    ...bonusLines,
    '',
    invoiceLink
      ? ['Detailed invoice:', invoiceLink].join('\n')
      : 'Detailed invoice is attached as PDF — open it for the full item list.',
    isCounterSale ? null : `Track order: ${track}`,
    `Shop again: ${SITE}`,
    isCounterSale ? null : `Reply *REPEAT* to reorder your previous purchase.`,
    '',
    `With care,`,
    `Yasvik`,
    `Questions: ${YASVIK_SUPPORT_PHONE_DISPLAY}`,
  ].filter((line) => line != null).join('\n');
}

export function buildStatusWhatsAppMessage(order = {}, status, extraNote = '') {
  const name = order.customer_name || 'there';
  const ref = orderRef(order);
  const label = STATUS_CONFIG[status]?.label || status || order.status || 'updated';
  const trackBase = typeof window !== 'undefined' ? window.location.origin : SITE;
  const trackUrl = `${trackBase}/orders/${encodeURIComponent(ref)}/track`;

  const statusLines = {
    confirmed: 'Your order is confirmed and we are getting it ready.',
    packing: 'We are carefully packing your order.',
    ready_for_dispatch: 'Your order is packed and ready to leave the store.',
    shipped: 'Your order is on the way.',
    out_for_delivery: 'Your order is out for delivery today.',
    delivered: 'Your order has been delivered. We hope you love it!',
    cancelled: 'This order has been cancelled. Reply here if you need help.',
  };

  return [
    `Hi ${name}, Yasvik order ${ref}:`,
    `${label}${statusLines[status] ? ` — ${statusLines[status]}` : ''}`,
    extraNote ? `Note: ${extraNote}` : null,
    order.rider_name ? `Rider: ${order.rider_name}${order.rider_phone ? ` (${order.rider_phone})` : ''}` : null,
    `Track: ${trackUrl}`,
    `— Yasvik (${YASVIK_SUPPORT_PHONE_DISPLAY})`,
  ].filter(Boolean).join('\n');
}

export function yasvikBusinessWhatsAppHref(prefill = '') {
  return `https://wa.me/${YASVIK_WHATSAPP_NUMBER}?text=${encodeURIComponent(prefill)}`;
}
