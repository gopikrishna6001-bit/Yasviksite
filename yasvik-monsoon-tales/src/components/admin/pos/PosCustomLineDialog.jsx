import { useState } from 'react';
import { X } from 'lucide-react';

export default function PosCustomLineDialog({ open, onClose, onAdd }) {
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [qty, setQty] = useState('1');

  if (!open) return null;

  const handleAdd = () => {
    const parsedPrice = Number(price);
    const parsedQty = Math.max(1, Number(qty) || 1);
    if (!title.trim() || !Number.isFinite(parsedPrice) || parsedPrice <= 0) return;
    onAdd({
      title: title.trim(),
      price: parsedPrice,
      qty: parsedQty,
    });
    setTitle('');
    setPrice('');
    setQty('1');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-rain-cloud/50 p-4" data-pos-allow-typing="true">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-cormorant text-xl text-rain-cloud">Custom line item</h3>
          <button type="button" onClick={onClose} className="p-1 text-rain-cloud/40 hover:text-rain-cloud"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Item name *"
            className="w-full px-3 py-2.5 border border-border rounded-xl font-inter text-sm"
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Price ₹ *"
              className="px-3 py-2.5 border border-border rounded-xl font-inter text-sm"
            />
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="Qty"
              className="px-3 py-2.5 border border-border rounded-xl font-inter text-sm"
            />
          </div>
          <p className="font-inter text-[10px] text-rain-cloud/40">Use for items not in catalog, samples, or price overrides at counter.</p>
          <button
            type="button"
            onClick={handleAdd}
            className="w-full py-3 bg-wet-earth text-white rounded-xl font-inter text-sm font-medium"
          >
            Add to bill
          </button>
        </div>
      </div>
    </div>
  );
}
