import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { appClient } from '@/api/appClient';
import { YASVIK_STORE } from '@/lib/posInvoice';
import {
  buildInvoiceWhatsAppMessage,
  buildYasvikBonusMessageLines,
  customerPhoneDigits,
  isStorePhone,
  openCustomerWhatsApp,
} from '@/lib/orderWhatsAppNotify';
import { allocateOrderDiscountToLines } from '@/lib/orderLinePricing';

const CF_API_BASE = import.meta.env.VITE_CLOUDFLARE_API_BASE_URL || '/api';

function rupees(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return n;
}

/** Invoice displays whole rupees only. */
function roundRs(amount) {
  return Math.round(rupees(amount));
}

function formatRupee(amount) {
  return `₹${roundRs(amount)}`;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function maskCustomerPhone(phone = '') {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length < 6) return String(phone || '').trim();
  const last = digits.slice(-5);
  return `${'*'.repeat(Math.max(4, digits.length - 5))}${last}`;
}

/** Always render invoice timestamps in IST (store timezone). */
function formatIstDateLabel(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date());
  }
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

function lineDiscountPercent(lineTotal, discountAllocated) {
  const base = rupees(lineTotal);
  const saved = rupees(discountAllocated);
  if (!(base > 0) || !(saved > 0)) return 0;
  return Math.round((saved / base) * 100);
}

function buildInvoiceLines(order = {}) {
  const items = Array.isArray(order.items_snapshot)
    ? order.items_snapshot
    : Array.isArray(order.items)
      ? order.items
      : [];
  return allocateOrderDiscountToLines(
    items,
    order.discount_paise ?? Math.round(rupees(order.discount_amount) * 100),
    order.subtotal_paise,
  ).map((item) => {
    const lineTotal = item.originalLineTotal;
    const discountAllocated = item.discountAllocated;
    return {
      title: String(item.title || item.name || 'Item').slice(0, 80),
      variant: item.variant || item.unit || '',
      qty: item.qty,
      unitPrice: item.originalUnitPrice,
      lineTotal,
      discountAllocated,
      finalLineTotal: item.finalLineTotal,
      effectiveUnitPrice: item.effectiveUnitPrice,
      discountPercent: lineDiscountPercent(lineTotal, discountAllocated),
    };
  });
}

export function isProvisionalInvoice(order = {}) {
  return Boolean(
    order.provisional
    || order.invoice_kind === 'provisional'
    || order.invoice_kind === 'estimate'
    || String(order.status || '').toLowerCase() === 'provisional'
    || String(order.payment_status || '').toLowerCase() === 'estimate'
  );
}

function resolveAddress(order = {}) {
  const addr = order.shipping_address || order.address_snapshot || {};
  return [
    addr.street || addr.line1 || '',
    [addr.city, addr.state].filter(Boolean).join(', '),
    addr.zip || addr.pincode || addr.pin_code || '',
  ].filter(Boolean);
}

function firstName(name = '') {
  const cleaned = String(name || 'there').replace(/^Walk-in customer$/i, 'there').trim();
  return cleaned.split(/\s+/)[0] || 'there';
}

function resolveTrackUrl(order = {}, billNo = '') {
  const ref = order.order_number || order.receipt_id || billNo || order.id;
  if (!ref) return 'https://www.yasvik.com';
  return `https://www.yasvik.com/orders/${encodeURIComponent(ref)}/track`;
}

/**
 * Build printable invoice data for web or POS orders.
 * Pass provisional/estimate flags on the order for a non-tax estimate PDF.
 */
export function buildOrderInvoiceDoc(order = {}) {
  const provisional = isProvisionalInvoice(order);
  const lines = buildInvoiceLines(order);
  const subtotalFromLines = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const subtotal =
    order.subtotal_paise != null
      ? rupees(order.subtotal_paise) / 100
      : subtotalFromLines;
  const delivery =
    order.delivery_fee_paise != null ? rupees(order.delivery_fee_paise) / 100 : 0;
  const discount =
    order.discount_paise != null
      ? rupees(order.discount_paise) / 100
      : order.discount_amount != null
        ? rupees(order.discount_amount)
        : 0;
  const total =
    order.amount_paise != null
      ? rupees(order.amount_paise) / 100
      : Math.max(0, subtotal - discount + delivery);
  const bonusRedeemed =
    order.bonus_redeemed_paise != null ? rupees(order.bonus_redeemed_paise) / 100 : 0;
  const bonusEarned =
    order.bonus_earned_paise != null ? rupees(order.bonus_earned_paise) / 100 : 0;
  const bonusBalanceAfter =
    order.bonus_balance_after_paise != null ? rupees(order.bonus_balance_after_paise) / 100 : null;
  const bonusExpiresAt =
    order.bonus_breakdown?.expires_at || order.bonus_expires_at || null;

  const billNo = order.order_number || order.receipt_id || order.id?.slice?.(-8) || '—';
  const created = order.created_date || order.created_at || order.updated_date;
  const dateLabel = created
    ? formatIstDateLabel(created)
    : formatIstDateLabel(new Date());

  const statusRaw = String(
    provisional ? 'estimate' : (order.status || order.payment_status || 'confirmed')
  ).replace(/_/g, ' ');
  const statusLabel = statusRaw.replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    provisional,
    billNo,
    dateLabel,
    customerName: order.customer_name || 'Customer',
    customerPhone: order.customer_phone || order.guest_phone || '',
    customerEmail: order.customer_email || order.guest_email || '',
    paymentMethod: provisional
      ? 'estimate'
      : (order.payment_method || (order.order_channel === 'pos' ? 'counter' : 'online')),
    paymentStatus: provisional ? 'estimate' : (order.payment_status || ''),
    channel: order.order_channel || 'web',
    statusLabel,
    addressLines: resolveAddress(order),
    lines,
    subtotal,
    discount,
    discountLabel: order.discount_label || order.coupon_code || '',
    delivery,
    total,
    bonusRedeemed,
    bonusEarned,
    bonusBalanceAfter,
    bonusExpiresAt,
    trackUrl: order.tracking_url || resolveTrackUrl(order, billNo),
    store: YASVIK_STORE,
  };
}

export function canDownloadOrderInvoice(order = {}, { isAdmin = false } = {}) {
  if (!order) return false;
  if (isAdmin) return true;
  const paid = ['paid', 'pending_cod'].includes(String(order.payment_status || ''));
  const okStatus = !['failed', 'cancelled'].includes(String(order.status || ''));
  return paid && okStatus;
}

const INVOICE_TAGLINE = 'Conscious foods for modern living';
const INVOICE_RANGE =
  'Staples  •  Millets  •  Cold Pressed Oils  •  Healthy Snacks  •  Dry Fruits  •  Pickles  •  Jaggery  •  Super Foods';
const INVOICE_BODY_COPY =
  'Every product you take home from us is selected with care for its quality, authenticity, and everyday goodness.';

function formatPayMethodLabel(method = '') {
  return String(method || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatPayStatusLabel(status = '') {
  const raw = String(status || '').replace(/_/g, ' ').trim();
  if (!raw) return '';
  return raw.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Email-identical HTML used to render the shareable / printable invoice PDF.
 * Width 600px — mobile-friendly like the confirmation email.
 * Lines: Product · Qty · Price (list) · Amount (paid). Discount rollup in summary.
 * Delivery: charged fee when customer pays; “Free · on us” when Yasvik covers it.
 */
export function buildOrderInvoiceHtml(order = {}) {
  const invoice = buildOrderInvoiceDoc(order);
  const provisional = invoice.provisional;
  const thankName = escapeHtml(firstName(invoice.customerName));
  const fullName = escapeHtml(
    String(invoice.customerName || 'there').replace(/^Walk-in customer$/i, 'there')
  );
  const addressLine = invoice.addressLines.length
    ? escapeHtml(invoice.addressLines.join(', '))
    : invoice.channel === 'pos'
      ? ''
      : 'Address on file';
  const payMethodLabel = escapeHtml(formatPayMethodLabel(invoice.paymentMethod));
  const payStatusLabel = escapeHtml(formatPayStatusLabel(invoice.paymentStatus));
  const logoUrl =
    typeof window !== 'undefined' && window.location?.origin
      ? `${window.location.origin}/media/brand/logo-horizontal-white.png`
      : 'https://www.yasvik.com/media/brand/logo-horizontal-white.png';
  // Not a GST tax invoice until HSN/GSTIN/tax breakup are live on the document.
  const docTitle = provisional ? 'Provisional bill' : 'Invoice';
  const greeting = provisional
    ? `Here is your estimate from Yasvik, ${thankName}.`
    : `Thank you for shopping with Yasvik, ${thankName}.`;
  const refLabel = provisional ? 'Estimate number' : 'Invoice number';
  const orderHeading = provisional ? 'Estimated items' : 'Your order';
  const totalLabel = provisional ? 'Estimated total' : 'Total paid';
  const bodyCopy = provisional
    ? 'This is a provisional bill for estimation only. Final amounts may change when the bill is completed at the counter.'
    : INVOICE_BODY_COPY;
  const billToLabel = invoice.addressLines.length ? 'Delivering to' : 'Bill to';
  const maskedPhone = invoice.customerPhone ? maskCustomerPhone(invoice.customerPhone) : '';

  /**
   * html2canvas mis-draws CSS text-decoration:line-through (line sits above glyphs).
   * Use Unicode combining long stroke (U+0336) so each character is struck through
   * in the text itself — same idea as Word strikethrough, no drawn overlay.
   */
  const withStrikethrough = (text) =>
    Array.from(String(text))
      .map((ch) => (/\s/.test(ch) ? ch : `${ch}\u0336`))
      .join('');

  const thStyle =
    'padding:0 4px 10px;font-family:Arial,Helvetica,sans-serif;font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:#8A9586;border-bottom:1px solid #E8E1D5;';
  const itemHeader = `<tr>
        <td style="${thStyle}padding-left:0;text-align:left">Product</td>
        <td width="40" style="${thStyle}text-align:right">Qty</td>
        <td width="72" style="${thStyle}text-align:right">Price</td>
        <td width="80" style="${thStyle}padding-right:0;text-align:right">Amount</td>
      </tr>`;

  // Round each line first, then derive summary so displayed math always adds up.
  const displayLines = invoice.lines.map((line) => {
    const listRs = roundRs(line.lineTotal);
    const paidRs = roundRs(line.finalLineTotal);
    const savedRs = Math.max(0, listRs - paidRs);
    const pct =
      listRs > 0 && savedRs > 0 ? Math.round((savedRs / listRs) * 100) : 0;
    return { ...line, listRs, paidRs, savedRs, pct };
  });
  const displaySubtotal = displayLines.reduce((sum, line) => sum + line.listRs, 0);
  const displayDiscount = displayLines.reduce((sum, line) => sum + line.savedRs, 0);
  const displayBonus = roundRs(invoice.bonusRedeemed);
  const displayDelivery = invoice.delivery > 0 ? roundRs(invoice.delivery) : 0;
  const displayTotal = Math.max(
    0,
    displaySubtotal - displayDiscount - displayBonus + displayDelivery,
  );

  const amountCellStyle =
    'padding:12px 4px;border-bottom:1px solid #EFEAE0;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#1F3D2B;text-align:right;vertical-align:top;white-space:nowrap;font-variant-numeric:tabular-nums';

  const itemRows = displayLines
    .map((line) => {
      const name = escapeHtml(String(line.title || 'Item'));
      const variant = line.variant
        ? `<div style="margin-top:2px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#5C6B58">${escapeHtml(line.variant)}</div>`
        : '';
      const hasSaved = line.savedRs > 0;
      const saveNote = hasSaved
        ? `<div style="margin-top:4px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.35;color:#4F6B3A;font-weight:600">Save ₹${line.savedRs}${line.pct > 0 ? ` · ${line.pct}% off` : ''}</div>`
        : '';
      const priceLabel = `₹${line.listRs}`;
      const priceCell = hasSaved
        ? escapeHtml(withStrikethrough(priceLabel))
        : escapeHtml(priceLabel);
      return `<tr>
        <td style="padding:12px 8px 12px 0;border-bottom:1px solid #EFEAE0;vertical-align:top">
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.3;color:#1F3D2B">${name}</div>
          ${variant}
          ${saveNote}
        </td>
        <td width="40" style="padding:12px 4px;border-bottom:1px solid #EFEAE0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#5C6B58;text-align:right;vertical-align:top;font-variant-numeric:tabular-nums">${line.qty}</td>
        <td width="72" style="${amountCellStyle}">${priceCell}</td>
        <td width="80" style="${amountCellStyle}padding-right:0">₹${line.paidRs}</td>
      </tr>`;
    })
    .join('');

  const showDeliveryRow = invoice.channel !== 'pos';
  const deliveryIsBenefit = showDeliveryRow && !(invoice.delivery > 0);
  const deliveryLabel = !showDeliveryRow
    ? ''
    : invoice.delivery > 0
      ? `₹${displayDelivery}`
      : 'Free · on us';

  const ctaLabel = invoice.channel === 'pos' || provisional ? 'Shop again' : 'Track your order';
  const ctaHref =
    invoice.channel === 'pos' || provisional ? 'https://www.yasvik.com' : invoice.trackUrl;

  const paymentBlock = provisional
    ? `<tr>
            <td style="padding:0 12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#8A9586;white-space:nowrap;vertical-align:top">Status</td>
            <td style="padding:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1F3D2B;line-height:1.4">Estimate only — not billed yet</td>
          </tr>`
    : `<tr>
            <td style="padding:0 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#8A9586;white-space:nowrap;vertical-align:top">Payment status</td>
            <td style="padding:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:#1F3D2B;line-height:1.4">${payStatusLabel || '—'}</td>
          </tr>
          <tr>
            <td style="padding:0 12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#8A9586;white-space:nowrap;vertical-align:top">Payment method</td>
            <td style="padding:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1F3D2B;line-height:1.4">${payMethodLabel || '—'}</td>
          </tr>`;

  const customerSecondary = [
    maskedPhone
      ? `<div style="margin-top:4px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#5C6B58">${escapeHtml(maskedPhone)}</div>`
      : '',
    addressLine
      ? `<div style="margin-top:4px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.45;color:#5C6B58">${addressLine}</div>`
      : '',
  ].join('');

  const discountRowLabel = (() => {
    const raw = String(invoice.discountLabel || '').trim();
    if (!raw) return 'Discount';
    if (/%\s*$/.test(raw) || /^\d+(\.\d+)?%$/.test(raw)) return `Discount (${escapeHtml(raw)})`;
    return `Discount (${escapeHtml(raw)})`;
  })();

  const summaryRows = [
    `<tr>
            <td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#5C6B58">Subtotal</td>
            <td width="88" style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1F3D2B;text-align:right;font-variant-numeric:tabular-nums">₹${displaySubtotal}</td>
          </tr>`,
    displayDiscount > 0
      ? `<tr>
            <td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#5C6B58">${discountRowLabel}</td>
            <td width="88" style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1F3D2B;text-align:right;font-variant-numeric:tabular-nums">− ₹${displayDiscount}</td>
          </tr>`
      : '',
    displayBonus > 0
      ? `<tr>
            <td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#5C6B58">Yasvik Bonus</td>
            <td width="88" style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1F3D2B;text-align:right;font-variant-numeric:tabular-nums">− ₹${displayBonus}</td>
          </tr>`
      : '',
    showDeliveryRow
      ? `<tr>
            <td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${deliveryIsBenefit ? '#4F6B3A' : '#5C6B58'}">Delivery</td>
            <td width="88" style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:${deliveryIsBenefit ? '600' : '400'};color:${deliveryIsBenefit ? '#4F6B3A' : '#1F3D2B'};text-align:right;font-variant-numeric:tabular-nums">${deliveryLabel}</td>
          </tr>`
      : '',
    `<tr>
            <td style="padding:14px 12px 0 0;border-top:2px solid #1F3D2B;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#1F3D2B">${escapeHtml(totalLabel)}</td>
            <td width="88" style="padding:14px 0 0;border-top:2px solid #1F3D2B;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#1F3D2B;text-align:right;font-variant-numeric:tabular-nums">₹${displayTotal}</td>
          </tr>`,
  ].join('');

  return `<div id="yasvik-invoice-root" style="width:600px;margin:0;padding:0;box-sizing:border-box;background:#FFFFFF">
    <div style="background:#FFFFFF;border:1px solid #E8E1D5;border-radius:16px;overflow:hidden">
      <div style="background:#1F3D2B;padding:18px 28px 14px;text-align:center">
        <img src="${logoUrl}" alt="Yasvik" width="168" crossorigin="anonymous" style="display:block;margin:0 auto;max-width:168px;height:auto;border:0" />
        <p style="margin:-14px 0 6px;font-family:Georgia,'Times New Roman',serif;font-size:13px;line-height:1.25;color:#E8E1D5">
          ${escapeHtml(INVOICE_TAGLINE)}
        </p>
        <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:9px;line-height:1.35;letter-spacing:0.03em;color:#C8D4C4">
          ${escapeHtml(INVOICE_RANGE)}
        </p>
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#C8D4C4">
          ${escapeHtml(docTitle)}
        </p>
      </div>

      <div style="padding:28px 32px 0">
        <p style="margin:0 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.3;color:#1F3D2B">
          ${greeting}
        </p>
        <p style="margin:0 0 22px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#5C6B58">
          ${escapeHtml(bodyCopy)}
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#F7F3EA;border-radius:12px">
          <tr>
            <td style="padding:16px 18px;vertical-align:top;width:50%">
              <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:#8A9586">${escapeHtml(refLabel)}</p>
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:18px;line-height:1.25;color:#1F3D2B">${escapeHtml(invoice.billNo)}</p>
              <p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.45;color:#5C6B58">${escapeHtml(invoice.dateLabel)}</p>
            </td>
            <td style="padding:16px 18px;vertical-align:top;width:50%;border-left:1px solid #E8E1D5">
              <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${paymentBlock}</table>
            </td>
          </tr>
        </table>
      </div>

      <div style="padding:22px 32px 0">
        <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:#8A9586">${escapeHtml(billToLabel)}</p>
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;line-height:1.35;color:#1F3D2B">${fullName}</p>
        ${customerSecondary}
      </div>

      ${
        invoice.lines.length
          ? `<div style="padding:26px 32px 0">
        <p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:#8A9586">${escapeHtml(orderHeading)}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;table-layout:fixed">
          ${itemHeader}
          ${itemRows}
        </table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;border-collapse:collapse;max-width:320px;margin-left:auto">
          ${summaryRows}
        </table>
      </div>`
          : `<div style="padding:26px 32px 0"><p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1F3D2B"><strong>${escapeHtml(totalLabel)}:</strong> ${formatRupee(invoice.total)}</p></div>`
      }

      ${
        !provisional && ((invoice.bonusEarned > 0 && invoice.discount <= 0) || invoice.bonusBalanceAfter != null)
          ? `<div style="padding:22px 32px 0">
        <div style="background:#EEF5EA;border-radius:12px;padding:16px 18px;border:1px solid #C8D9C0">
          <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:#5C6B58">Yasvik Bonus</p>
          ${
            invoice.bonusEarned > 0 && invoice.discount <= 0
              ? `<p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1F3D2B">Earned on this order: <strong>${formatRupee(invoice.bonusEarned)}</strong> (category bonus · usable from your next order)</p>`
              : ''
          }
          ${
            invoice.bonusBalanceAfter != null
              ? `<p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1F3D2B">Your balance: <strong>${formatRupee(invoice.bonusBalanceAfter)}</strong></p>`
              : ''
          }
          ${
            invoice.bonusExpiresAt
              ? `<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#5C6B58">Earliest expiry: ${escapeHtml(format(new Date(invoice.bonusExpiresAt), 'dd MMM yyyy'))}</p>`
              : ''
          }
          <p style="margin:10px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5C6B58">${escapeHtml((buildYasvikBonusMessageLines(order).slice(-1)[0] || 'Use the same mobile number on your next order to redeem.'))}</p>
        </div>
      </div>`
          : ''
      }

      <div style="padding:16px 32px 8px;text-align:center">
        <a
          data-invoice-cta="1"
          data-href="${escapeHtml(ctaHref)}"
          href="${escapeHtml(ctaHref)}"
          style="display:inline-block;color:#1F3D2B;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;line-height:1.3;text-align:center;text-decoration:none;white-space:nowrap"
        >${escapeHtml(ctaLabel)}</a>
      </div>
      <div style="padding:0 32px 16px;text-align:center">
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.55;color:#5C6B58;text-align:center">
          Questions? WhatsApp us on ${escapeHtml(invoice.store.phone)}, or visit yasvik.com/contact.
        </p>
      </div>

      <div style="background:#F7F3EA;padding:14px 32px 16px;border-top:1px solid #E8E1D5;text-align:center">
        <p style="margin:0 0 6px;font-family:Georgia,'Times New Roman',serif;font-size:13px;line-height:1.35;color:#1F3D2B">
          Conscious Food · Responsible Sourcing · Honest Quality
        </p>
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.55;color:#8A9586">
          <strong style="color:#5C6B58;font-weight:700">${escapeHtml(invoice.store.name || 'Yasvik Foods')}</strong><br />
          ${(invoice.store.addressLines || [invoice.store.address]).map((line) => escapeHtml(line)).join('<br />')}<br />
          FSSAI Lic. No. ${escapeHtml(invoice.store.fssai || '')}<br />
          ${escapeHtml(invoice.store.website || 'www.yasvik.com')}
          ${provisional ? '<br /><span style="color:#8A9586">Provisional estimate — not a final invoice</span>' : ''}
        </p>
      </div>
    </div>
  </div>`;
}

function measureElementWithinRoot(el, root) {
  let x = 0;
  let y = 0;
  let node = el;
  while (node && node !== root) {
    x += node.offsetLeft || 0;
    y += node.offsetTop || 0;
    node = node.offsetParent;
    if (node && !root.contains(node)) break;
  }
  return {
    x,
    y,
    w: el.offsetWidth || 0,
    h: el.offsetHeight || 0,
  };
}

async function uploadInvoicePdfToMedia(blob, fileName, billNo) {
  try {
    const { supabase } = await import('@/api/supabaseClient');
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) return null;

    const safeRef = String(billNo).replace(/[^\w-]+/g, '');
    const file = new File([blob], fileName, { type: 'application/pdf' });
    const form = new FormData();
    form.append('file', file);
    form.append('bucket', 'media-assets');
    form.append('folder', 'invoices');
    form.append('seo_name', `yasvik-invoice-${safeRef}`);
    form.append('overwrite', '1');

    const res = await fetch(`${CF_API_BASE}/media/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return null;
    return data.file_url || null;
  } catch (err) {
    console.error('[uploadInvoicePdfToMedia]', err);
    return null;
  }
}

async function persistInvoiceUrl(orderId, invoiceUrl) {
  if (!orderId || !invoiceUrl) return;
  try {
    const { orders } = await import('@/services/api');
    await orders.update(orderId, { invoice_url: invoiceUrl });
  } catch (err) {
    console.error('[persistInvoiceUrl]', err);
  }
}

async function waitForImages(root) {
  const imgs = [...root.querySelectorAll('img')];
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          const done = () => resolve();
          img.addEventListener('load', done, { once: true });
          img.addEventListener('error', done, { once: true });
          setTimeout(done, 2500);
        })
    )
  );
}

async function renderInvoiceCanvas(order) {
  const html = buildOrderInvoiceHtml(order);
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText =
    'position:fixed;left:-12000px;top:0;width:600px;pointer-events:none;opacity:1;z-index:-1;';
  host.innerHTML = html;
  document.body.appendChild(host);

  const root = host.querySelector('#yasvik-invoice-root') || host.firstElementChild;
  await waitForImages(root);

  const ctaEl = root.querySelector('[data-invoice-cta]');
  let ctaLink = null;
  if (ctaEl) {
    const box = measureElementWithinRoot(ctaEl, root);
    ctaLink = {
      href: ctaEl.getAttribute('data-href') || '',
      ...box,
    };
  }

  const html2canvas = (await import('html2canvas')).default;
  const canvas = await html2canvas(root, {
    scale: 2,
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#FAF7EF',
    logging: false,
    width: 600,
    height: root.scrollHeight,
    windowWidth: 600,
    windowHeight: root.scrollHeight,
  });

  document.body.removeChild(host);
  return { canvas, ctaLink };
}

/**
 * Build invoice PDF from the email HTML design.
 * One continuous page — no A4 splits or page breaks.
 */
export async function buildOrderInvoicePdfBlob(order = {}) {
  const invoice = buildOrderInvoiceDoc(order);
  const { canvas, ctaLink } = await renderInvoiceCanvas(order);
  const imgData = canvas.toDataURL('image/jpeg', 0.93);

  const marginMm = 8;
  const contentW = 186;
  const contentH = (canvas.height / canvas.width) * contentW;
  const pageW = contentW + marginMm * 2;
  const pageH = contentH + marginMm * 2;
  const imgScale = contentW / canvas.width;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [pageW, pageH],
    compress: true,
  });

  pdf.setFillColor(250, 247, 239);
  pdf.rect(0, 0, pageW, pageH, 'F');
  pdf.addImage(imgData, 'JPEG', marginMm, marginMm, contentW, contentH, undefined, 'FAST');

  if (ctaLink?.href && ctaLink.w > 0 && ctaLink.h > 0) {
    pdf.link(
      marginMm + ctaLink.x * imgScale,
      marginMm + ctaLink.y * imgScale,
      ctaLink.w * imgScale,
      ctaLink.h * imgScale,
      { url: ctaLink.href }
    );
  }

  const fileName = invoice.provisional
    ? `Yasvik-Estimate-${String(invoice.billNo).replace(/[^\w-]+/g, '')}.pdf`
    : `Yasvik-Invoice-${String(invoice.billNo).replace(/[^\w-]+/g, '')}.pdf`;
  const blob = pdf.output('blob');
  return { blob, fileName, invoice, pdf };
}

function triggerBlobDownload(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/**
 * Generate and download invoice PDF (email design). Safe on mobile.
 */
export async function downloadOrderInvoicePdf(order = {}, options = {}) {
  const { blob, fileName, pdf, invoice } = await buildOrderInvoicePdfBlob(order);
  try {
    triggerBlobDownload(blob, fileName);
  } catch {
    pdf.save(fileName);
  }
  if (options.returnDoc) return { fileName, pdf, invoice, blob };
  return { fileName, blob };
}

/**
 * POS notify flow:
 * 1) Upload invoice PDF
 * 2) Try WhatsApp Cloud API document send (real attachment, no share sheet)
 * 3) Fallback: open WhatsApp chat with short summary + invoice link (no PDF download)
 */
export async function notifyCustomerWithInvoicePdf(
  order = {},
  {
    message,
    openWhatsApp = true,
    downloadPdf = false,
  } = {}
) {
  const phone = order.customer_phone || order.guest_phone;
  const digits = customerPhoneDigits(phone);

  if (digits.length !== 10) {
    return {
      fileName: null,
      invoiceUrl: null,
      shared: false,
      sentViaApi: false,
      whatsappOpened: false,
      hasPhone: false,
      hint: 'Enter a 10-digit customer phone, then send on WhatsApp.',
    };
  }

  if (isStorePhone(phone)) {
    return {
      fileName: null,
      invoiceUrl: null,
      shared: false,
      sentViaApi: false,
      whatsappOpened: false,
      hasPhone: false,
      hint: 'Enter the customer’s mobile number — not the Yasvik store WhatsApp number.',
    };
  }

  let built = null;
  let invoiceUrl = null;
  try {
    built = await buildOrderInvoicePdfBlob(order);
    invoiceUrl = await uploadInvoicePdfToMedia(built.blob, built.fileName, built.invoice.billNo);
    const orderId = order?.id || order?.order_id;
    if (invoiceUrl && orderId) {
      await persistInvoiceUrl(orderId, invoiceUrl);
    }
    if (downloadPdf) {
      triggerBlobDownload(built.blob, built.fileName);
    }
  } catch (err) {
    console.error('[notifyCustomerWithInvoicePdf] PDF prepare failed', err);
  }

  const caption =
    message ||
    buildInvoiceWhatsAppMessage(order, {
      invoiceUrl,
      trackUrl: resolveTrackUrl(order, built?.invoice?.billNo),
      includeInvoiceLink: false,
    });

  // True attachment: send via Cloud API when configured.
  if (invoiceUrl) {
    try {
      const { data } = await appClient.functions.invoke('sendInvoiceWhatsApp', {
        phone: digits,
        invoice_url: invoiceUrl,
        caption,
        filename: built?.fileName || 'Yasvik-Invoice.pdf',
        order_id: order?.id || order?.order_id || null,
      });
      if (data?.sent) {
        return {
          fileName: built?.fileName || null,
          invoiceUrl,
          shared: false,
          sentViaApi: true,
          whatsappOpened: false,
          hasPhone: true,
          hint: data.hint || 'Invoice PDF sent on WhatsApp to the customer.',
        };
      }
    } catch (err) {
      console.error('[notifyCustomerWithInvoicePdf] API send failed', err);
    }
  }

  // Seamless fallback for store phone workflow: open chat with summary + tap-able invoice link.
  // (WhatsApp deep links cannot attach files; do not download PDF — that opens the PDF viewer.)
  const chatText =
    message ||
    buildInvoiceWhatsAppMessage(order, {
      invoiceUrl,
      trackUrl: resolveTrackUrl(order, built?.invoice?.billNo),
      includeInvoiceLink: Boolean(invoiceUrl),
    });

  const whatsappOpened = openWhatsApp ? openCustomerWhatsApp(phone, chatText) : false;

  return {
    fileName: built?.fileName || null,
    invoiceUrl,
    shared: false,
    sentViaApi: false,
    whatsappOpened,
    hasPhone: true,
    hint: whatsappOpened
      ? invoiceUrl
        ? 'WhatsApp opened with bill summary. Tap Send — customer opens the invoice link for the PDF.'
        : 'WhatsApp opened with bill summary. Tap Send once.'
      : 'Could not open WhatsApp. Check the customer number and try again.',
  };
}
