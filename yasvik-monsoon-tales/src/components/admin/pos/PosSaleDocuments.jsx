import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Printer, ExternalLink, FileDown, MessageCircle, X } from 'lucide-react';
import { formatSaleDocuments, printPosDocument } from '@/lib/posInvoice';
import { downloadOrderInvoicePdf, notifyCustomerWithInvoicePdf } from '@/lib/orderInvoicePdf';
import { customerPhoneDigits } from '@/lib/orderWhatsAppNotify';

function formatInr(amount) {
  const n = Math.round(Number(amount || 0) * 100) / 100;
  if (Math.abs(n - Math.round(n)) < 0.005) return String(Math.round(n));
  return n.toFixed(2);
}

function maskPhone(phone = '') {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length < 6) return String(phone || '').trim();
  return `${'*'.repeat(Math.max(4, digits.length - 5))}${digits.slice(-5)}`;
}

function DocumentTable({ doc, compact = false }) {
  return (
    <table className={`w-full text-left ${compact ? 'text-[10px]' : 'text-xs'}`}>
      <thead>
        <tr className="border-b border-dashed border-border">
          <th className="py-1 font-medium">Product</th>
          <th className="py-1 font-medium text-center w-8">Qty</th>
          <th className="py-1 font-medium text-right w-14">Price</th>
          <th className="py-1 font-medium text-right w-14">Amount</th>
        </tr>
      </thead>
      <tbody>
        {doc.items.map((item, i) => (
          <tr key={i} className="border-b border-border/30">
            <td className="py-1 pr-1">
              {item.title}
              {item.variant ? <span className="text-rain-cloud/45"> · {item.variant}</span> : null}
              {item.isCustom ? <span className="text-rain-cloud/35"> (custom)</span> : null}
            </td>
            <td className="py-1 text-center">{item.qty}</td>
            <td className="py-1 text-right text-rain-cloud/55">₹{formatInr(item.unitPrice)}</td>
            <td className="py-1 text-right font-medium">₹{formatInr(item.lineTotal)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function saleToOrderPayload(sale) {
  return {
    order_number: sale.order_number || sale.receipt_id,
    receipt_id: sale.receipt_id,
    id: sale.order_id,
    order_id: sale.order_id,
    items_snapshot: (sale.items || []).map((item) => ({
      title: item.title,
      variant: item.variant,
      qty: item.qty,
      price: item.price,
    })),
    customer_name: sale.customer_name || 'Walk-in customer',
    customer_phone: sale.customer_phone || '',
    payment_method: sale.payment_method || 'cash',
    payment_status: 'paid',
    order_channel: sale.order_channel || 'pos',
    amount_paise: sale.amount_paise,
    subtotal_paise: sale.subtotal_paise,
    discount_paise: sale.discount_paise,
    discount_label: sale.discount_label,
    coupon_code: sale.coupon_code,
    bonus_earned_paise: sale.bonus_earned_paise,
    bonus_redeemed_paise: sale.bonus_redeemed_paise,
    bonus_balance_after_paise: sale.bonus_balance_after_paise,
    bonus_breakdown: sale.bonus_breakdown,
    created_date: new Date().toISOString(),
  };
}

export default function PosSaleDocuments({ sale, onDone }) {
  const [docType, setDocType] = useState('receipt');
  const [invoiceBusy, setInvoiceBusy] = useState(false);
  const [waHint, setWaHint] = useState('');
  const [phoneOverride, setPhoneOverride] = useState(sale?.customer_phone || '');

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onDone?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDone]);

  if (!sale) return null;

  const doc = formatSaleDocuments(sale);
  const effectivePhone = customerPhoneDigits(phoneOverride || sale.customer_phone);
  const hasPhone = effectivePhone.length === 10;

  const handleDownloadPdf = async () => {
    setInvoiceBusy(true);
    setWaHint('');
    try {
      await downloadOrderInvoicePdf(saleToOrderPayload({ ...sale, customer_phone: effectivePhone || sale.customer_phone }));
    } finally {
      setInvoiceBusy(false);
    }
  };

  const handleWhatsAppInvoice = async () => {
    setWaHint('');
    if (!hasPhone) {
      setWaHint('Enter the customer’s 10-digit phone above, then send on WhatsApp.');
      return;
    }
    setInvoiceBusy(true);
    try {
      const result = await notifyCustomerWithInvoicePdf({
        ...saleToOrderPayload(sale),
        customer_phone: effectivePhone,
      });
      setWaHint(result.hint);
    } finally {
      setInvoiceBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-rain-cloud/60 p-0 sm:p-4 print:bg-white print:p-0"
      data-pos-allow-typing="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onDone?.();
      }}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-w-md w-full max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden print:shadow-none print:rounded-none print:max-w-none print:max-h-none"
        data-pos-allow-typing="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 flex items-center gap-2 px-4 pt-4 pb-3 border-b border-border/60 print:hidden">
          {['receipt', 'invoice'].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setDocType(type)}
              className={`flex-1 py-2 rounded-full font-inter text-sm capitalize border ${
                docType === type ? 'bg-rain-cloud text-white border-rain-cloud' : 'border-border text-rain-cloud/60'
              }`}
            >
              {type}
            </button>
          ))}
          <button
            type="button"
            onClick={onDone}
            className="shrink-0 p-2 rounded-full border border-border text-rain-cloud/50 hover:text-rain-cloud hover:border-rain-cloud/40"
            aria-label="Close bill"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4">
          {docType === 'receipt' ? (
            <div id="pos-receipt-print" className="pos-receipt-print text-center space-y-2">
              <p className="font-cormorant text-2xl text-rain-cloud">{doc.store.name}</p>
              <p className="font-inter text-xs text-rain-cloud/50">{doc.store.address}</p>
              <p className="font-inter text-[10px] text-rain-cloud/40">{doc.date}</p>
              <p className="font-inter text-xs font-mono text-rain-cloud/60">Bill #{doc.billNo}</p>
              {doc.customerName !== 'Walk-in customer' && (
                <p className="font-inter text-xs text-rain-cloud/55">
                  {doc.customerName}{doc.customerPhone ? ` · ${doc.customerPhone}` : ''}
                </p>
              )}
              <div className="border-t border-dashed border-border my-3 pt-3 space-y-1.5 text-left">
                {doc.items.map((item, i) => (
                  <div key={i} className="flex justify-between font-inter text-xs text-rain-cloud gap-2">
                    <span className="flex-1">
                      {item.title}{item.variant ? ` · ${item.variant}` : ''} × {item.qty}
                    </span>
                    <span className="font-medium">₹{formatInr(item.lineTotal)}</span>
                  </div>
                ))}
              </div>
              {doc.discount > 0 ? (
                <p className="font-inter text-xs text-forest-canopy">
                  Discount{doc.discountLabel ? ` (${doc.discountLabel})` : ''} −₹{formatInr(doc.discount)}
                </p>
              ) : null}
              {doc.bonusRedeemed > 0 ? (
                <p className="font-inter text-xs text-forest-canopy">Yasvik Bonus −₹{formatInr(doc.bonusRedeemed)}</p>
              ) : null}
              <p className="font-cormorant text-2xl text-rain-cloud font-medium pt-2">Total ₹{formatInr(doc.total)}</p>
              {(doc.bonusEarned > 0 || doc.bonusBalanceAfter != null) && (
                <p className="font-inter text-[10px] text-forest-canopy mt-1">
                  {doc.bonusEarned > 0 ? `Bonus earned ₹${formatInr(doc.bonusEarned)} (next order) · ` : ''}
                  {doc.bonusBalanceAfter != null ? `Balance ₹${formatInr(doc.bonusBalanceAfter)}` : ''}
                </p>
              )}
              <p className="font-inter text-xs text-rain-cloud/50">
                Payment: {String(doc.paymentMethod || '').replace(/_/g, ' ')} — Paid
              </p>
              {doc.paymentMethod === 'cash' && doc.cashReceived != null && (
                <p className="font-inter text-xs text-rain-cloud/50">Cash ₹{doc.cashReceived} · Change ₹{doc.changeDue || 0}</p>
              )}
              <p className="font-inter text-[10px] text-rain-cloud/35 mt-2">Thank you for shopping at Yasvik</p>
            </div>
          ) : (
            <div id="pos-invoice-print" className="pos-invoice-print">
              <div className="flex justify-between items-start gap-4 border-b border-border pb-3 mb-3">
                <div>
                  <p className="font-cormorant text-2xl text-rain-cloud">{doc.store.name}</p>
                  <p className="font-inter text-[10px] text-rain-cloud/55 mt-1">{doc.store.address}</p>
                  <p className="font-inter text-[10px] text-rain-cloud/45">{doc.store.phone} · {doc.store.website}</p>
                </div>
                <div className="text-right">
                  <p className="font-inter text-xs font-semibold text-rain-cloud uppercase tracking-wider">Invoice</p>
                  <p className="font-inter text-[10px] text-rain-cloud/50 mt-1">#{doc.billNo}</p>
                  <p className="font-inter text-[10px] text-rain-cloud/45">{doc.date}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3 font-inter text-[10px] text-rain-cloud/60">
                <div>
                  <p className="uppercase tracking-wider text-rain-cloud/40 mb-0.5">Bill to</p>
                  <p className="text-rain-cloud font-medium">{doc.customerName}</p>
                  {doc.customerPhone && <p>{maskPhone(doc.customerPhone)}</p>}
                </div>
                <div className="text-right">
                  <p>FSSAI Lic. {doc.store.fssai}</p>
                  <p>Payment: {String(doc.paymentMethod || '').replace(/_/g, ' ')} — Paid</p>
                </div>
              </div>
              <DocumentTable doc={doc} />
              <div className="mt-3 pt-2 border-t border-border flex justify-between font-inter text-sm">
                <span className="text-rain-cloud/60">Subtotal</span>
                <span className="font-semibold text-rain-cloud">₹{formatInr(doc.subtotal)}</span>
              </div>
              {doc.discount > 0 ? (
                <div className="flex justify-between font-inter text-xs text-forest-canopy mt-1">
                  <span>Discount{doc.discountLabel ? ` (${doc.discountLabel})` : ''}</span>
                  <span>−₹{formatInr(doc.discount)}</span>
                </div>
              ) : null}
              {doc.bonusRedeemed > 0 ? (
                <div className="flex justify-between font-inter text-xs text-forest-canopy mt-1">
                  <span>Yasvik Bonus</span>
                  <span>−₹{formatInr(doc.bonusRedeemed)}</span>
                </div>
              ) : null}
              <div className="flex justify-between font-cormorant text-xl text-rain-cloud font-medium mt-1">
                <span>Total paid</span>
                <span>₹{formatInr(doc.total)}</span>
              </div>
              {(doc.bonusEarned > 0 || doc.bonusBalanceAfter != null) && (
                <p className="font-inter text-[10px] text-forest-canopy mt-2">
                  Yasvik Bonus earned ₹{formatInr(doc.bonusEarned || 0)} (usable from next order).
                  {doc.bonusBalanceAfter != null ? ` Balance ₹${formatInr(doc.bonusBalanceAfter)}.` : ''}
                </p>
              )}
              <p className="font-inter text-[9px] text-rain-cloud/35 mt-3 text-center">Computer-generated invoice · Yasvik Foods</p>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-border bg-white px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] print:hidden space-y-2">
          <div className="rounded-2xl border border-[#25D366]/35 bg-[#25D366]/5 p-3 space-y-2">
            <label className="block font-inter text-[10px] uppercase tracking-wider text-rain-cloud/45">
              Customer WhatsApp number
            </label>
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              value={phoneOverride}
              onChange={(e) => setPhoneOverride(e.target.value)}
              placeholder="10-digit mobile"
              data-pos-allow-typing="true"
              className="w-full rounded-xl border border-border bg-white px-3 py-3 font-inter text-base tracking-wide"
            />
            <button
              type="button"
              onClick={handleWhatsAppInvoice}
              disabled={invoiceBusy}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full font-inter text-sm font-semibold bg-[#25D366] text-white disabled:opacity-60"
            >
              <MessageCircle className="w-5 h-5" />
              {invoiceBusy ? 'Sending on WhatsApp…' : 'Send on WhatsApp'}
            </button>
            {waHint ? (
              <p className={`font-inter text-[11px] ${waHint.includes('sent') || waHint.includes('opened') || waHint.includes('Tap Send') ? 'text-forest-canopy' : 'text-amber-700'}`}>
                {waHint}
              </p>
            ) : (
              <p className="font-inter text-[11px] text-rain-cloud/50">
                WhatsApp opens with bill summary. Tap Send — customer opens the invoice link.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={() => printPosDocument(docType === 'receipt' ? 'pos-receipt-print' : 'pos-invoice-print')}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 border border-border rounded-full font-inter text-sm font-medium"
            >
              <Printer className="w-4 h-4" />
              Print {docType}
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={invoiceBusy}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 border border-border rounded-full font-inter text-sm font-medium disabled:opacity-50"
            >
              <FileDown className="w-4 h-4" />
              {invoiceBusy ? 'Preparing…' : 'PDF invoice'}
            </button>
            <button type="button" onClick={onDone} className="flex-1 py-3 bg-wet-earth text-white rounded-full font-inter text-sm font-medium">
              New bill
            </button>
          </div>
          {sale.order_id && (
            <Link to="/admin/orders" className="flex items-center justify-center gap-1 font-inter text-xs text-forest-canopy">
              View in Orders <ExternalLink className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
