import { useState } from 'react';
import { X } from 'lucide-react';

export default function PosLineEditor({ item, onClose, onSave }) {
  const [price, setPrice] = useState(String(item?.price ?? ''));
  const [qty, setQty] = useState(String(item?.qty ?? 1));
  const [note, setNote] = useState(item?.note || '');

  if (!item) return null;

  const handleSave = () => {
    const parsedPrice = Number(price);
    const parsedQty = Math.max(1, Number(qty) || 1);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) return;
    onSave({
      ...item,
      price: parsedPrice,
      qty: parsedQty,
      note: note.trim() || null,
      priceOverridden: parsedPrice !== item.originalPrice,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-rain-cloud/50 p-4" data-pos-allow-typing="true">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-inter text-sm font-semibold text-rain-cloud">{item.title}</h3>
            {item.variant && <p className="font-inter text-xs text-rain-cloud/45">{item.variant}</p>}
          </div>
          <button type="button" onClick={onClose} className="p-1 text-rain-cloud/40"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-inter text-[10px] text-rain-cloud/45 uppercase">Price ₹</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-border rounded-xl font-inter text-sm"
              />
            </div>
            <div>
              <label className="font-inter text-[10px] text-rain-cloud/45 uppercase">Qty</label>
              <input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-border rounded-xl font-inter text-sm"
              />
            </div>
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            className="w-full px-3 py-2 border border-border rounded-xl font-inter text-sm"
          />
          <button type="button" onClick={handleSave} className="w-full py-3 bg-rain-cloud text-white rounded-xl font-inter text-sm font-medium">
            Update line
          </button>
        </div>
      </div>
    </div>
  );
}
