import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Printer, ExternalLink } from 'lucide-react';
import { formatSaleDocuments, printPosDocument } from '@/lib/posInvoice';

function DocumentTable({ doc, compact = false }) {
  return (
    <table className={`w-full text-left ${compact ? 'text-[10px]' : 'text-xs'}`}>
      <thead>
        <tr className="border-b border-dashed border-border">
          <th className="py-1 font-medium">Item</th>
          <th className="py-1 font-medium text-center w-8">Qty</th>
          <th className="py-1 font-medium text-right w-14">Rate</th>
          <th className="py-1 font-medium text-right w-14">Amt</th>
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
            <td className="py-1 text-right">₹{item.unitPrice.toFixed(0)}</td>
            <td className="py-1 text-right font-medium">₹{item.lineTotal.toFixed(0)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function PosSaleDocuments({ sale, onDone }) {
  const [docType, setDocType] = useState('receipt');
  if (!sale) return null;

  const doc = formatSaleDocuments(sale);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-rain-cloud/60 p-4 print:bg-white print:p-0">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 print:shadow-none print:rounded-none print:max-w-none">
        <div className="flex gap-2 mb-4 print:hidden">
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
        </div>

        {docType === 'receipt' ? (
          <div id="pos-receipt-print" className="pos-receipt-print text-center space-y-2 mb-6">
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
                  <span className="flex-1">{item.title}{item.variant ? ` · ${item.variant}` : ''} × {item.qty}</span>
                  <span className="font-medium">₹{item.lineTotal.toFixed(0)}</span>
                </div>
              ))}
            </div>
            <p className="font-cormorant text-2xl text-rain-cloud font-medium pt-2">Total ₹{doc.total.toFixed(0)}</p>
            <p className="font-inter text-xs text-rain-cloud/50 capitalize">Paid via {doc.paymentMethod}</p>
            {doc.paymentMethod === 'cash' && doc.cashReceived != null && (
              <p className="font-inter text-xs text-rain-cloud/50">Cash ₹{doc.cashReceived} · Change ₹{doc.changeDue || 0}</p>
            )}
            <p className="font-inter text-[10px] text-rain-cloud/35 mt-2">Thank you for shopping at Yasvik</p>
          </div>
        ) : (
          <div id="pos-invoice-print" className="pos-invoice-print mb-6">
            <div className="flex justify-between items-start gap-4 border-b border-border pb-3 mb-3">
              <div>
                <p className="font-cormorant text-2xl text-rain-cloud">{doc.store.name}</p>
                <p className="font-inter text-[10px] text-rain-cloud/55 mt-1">{doc.store.address}</p>
                <p className="font-inter text-[10px] text-rain-cloud/45">{doc.store.phone} · {doc.store.website}</p>
              </div>
              <div className="text-right">
                <p className="font-inter text-xs font-semibold text-rain-cloud uppercase tracking-wider">Tax Invoice</p>
                <p className="font-inter text-[10px] text-rain-cloud/50 mt-1">#{doc.billNo}</p>
                <p className="font-inter text-[10px] text-rain-cloud/45">{doc.date}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3 font-inter text-[10px] text-rain-cloud/60">
              <div>
                <p className="uppercase tracking-wider text-rain-cloud/40 mb-0.5">Bill to</p>
                <p className="text-rain-cloud font-medium">{doc.customerName}</p>
                {doc.customerPhone && <p>{doc.customerPhone}</p>}
              </div>
              <div className="text-right">
                <p>FSSAI Lic. {doc.store.fssai}</p>
                <p className="capitalize">Payment: {doc.paymentMethod}</p>
              </div>
            </div>
            <DocumentTable doc={doc} />
            <div className="mt-3 pt-2 border-t border-border flex justify-between font-inter text-sm">
              <span className="text-rain-cloud/60">Subtotal</span>
              <span className="font-semibold text-rain-cloud">₹{doc.subtotal.toFixed(0)}</span>
            </div>
            <div className="flex justify-between font-cormorant text-xl text-rain-cloud font-medium mt-1">
              <span>Total</span>
              <span>₹{doc.total.toFixed(0)}</span>
            </div>
            <p className="font-inter text-[9px] text-rain-cloud/35 mt-3 text-center">Computer-generated invoice · Yasvik natural foods</p>
          </div>
        )}

        <div className="flex gap-2 print:hidden">
          <button
            type="button"
            onClick={() => printPosDocument(docType === 'receipt' ? 'pos-receipt-print' : 'pos-invoice-print')}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 border border-border rounded-full font-inter text-sm font-medium"
          >
            <Printer className="w-4 h-4" />
            Print {docType}
          </button>
          <button type="button" onClick={onDone} className="flex-1 py-3 bg-wet-earth text-white rounded-full font-inter text-sm font-medium">
            New bill
          </button>
        </div>
        {sale.order_id && (
          <Link to="/admin/orders" className="mt-3 flex items-center justify-center gap-1 font-inter text-xs text-forest-canopy print:hidden">
            View in Orders <ExternalLink className="w-3 h-3" />
          </Link>
        )}
      </div>
    </div>
  );
}
