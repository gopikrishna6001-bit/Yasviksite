import { useEffect, useState } from 'react';
import { Minus, Plus, X } from 'lucide-react';

export default function PosLineEditor({ item, onClose, onSave }) {
  const [price, setPrice] = useState(String(item?.price ?? ''));
  const [qty, setQty] = useState(Math.max(1, Number(item?.qty) || 1));
  const [note, setNote] = useState(item?.note || '');
  const [excludeFromDiscount, setExcludeFromDiscount] = useState(Boolean(item?.exclude_from_discount));

  useEffect(() => {
    if (!item) return;
    setPrice(String(item.price ?? ''));
    setQty(Math.max(1, Number(item.qty) || 1));
    setNote(item.note || '');
    setExcludeFromDiscount(Boolean(item.exclude_from_discount));
  }, [item]);

  if (!item) return null;

  const adjustQty = (delta) => {
    setQty((prev) => Math.max(1, (Number(prev) || 1) + delta));
  };

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
      exclude_from_discount: excludeFromDiscount,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-rain-cloud/50 p-0 sm:p-4"
      data-pos-allow-typing="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-sm p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        data-pos-allow-typing="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-inter text-sm font-semibold text-rain-cloud">{item.title}</h3>
            {item.variant && <p className="font-inter text-xs text-rain-cloud/45">{item.variant}</p>}
          </div>
          <button type="button" onClick={onClose} className="p-2 text-rain-cloud/40" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="font-inter text-[10px] text-rain-cloud/45 uppercase tracking-wider">Price ₹</label>
            <input
              type="number"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              data-pos-allow-typing="true"
              className="w-full mt-1 px-3 py-3 border border-border rounded-xl font-inter text-base"
            />
          </div>
          <div>
            <label className="font-inter text-[10px] text-rain-cloud/45 uppercase tracking-wider">Quantity</label>
            <div className="mt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={() => adjustQty(-1)}
                className="w-12 h-12 rounded-xl border border-border flex items-center justify-center bg-white active:scale-[0.97]"
                aria-label="Decrease quantity"
              >
                <Minus className="w-5 h-5" />
              </button>
              <input
                type="number"
                min={1}
                inputMode="numeric"
                value={qty}
                onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                data-pos-allow-typing="true"
                className="flex-1 min-w-0 h-12 px-3 border border-border rounded-xl font-inter text-center text-lg font-semibold tabular-nums"
              />
              <button
                type="button"
                onClick={() => adjustQty(1)}
                className="w-12 h-12 rounded-xl border border-border flex items-center justify-center bg-white active:scale-[0.97]"
                aria-label="Increase quantity"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            data-pos-allow-typing="true"
            className="w-full px-3 py-3 border border-border rounded-xl font-inter text-sm"
          />
          <label className="flex items-start gap-3 rounded-xl border border-border bg-rain-mist/40 px-3 py-3 cursor-pointer">
            <input
              type="checkbox"
              checked={excludeFromDiscount}
              onChange={(e) => setExcludeFromDiscount(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border text-forest-canopy"
            />
            <span>
              <span className="block font-inter text-sm font-medium text-rain-cloud">Exclude from bill discount</span>
              <span className="mt-0.5 block font-inter text-[11px] leading-4 text-rain-cloud/50">
                Use when this item/category should not get flat % / ₹ / coupon discount.
              </span>
            </span>
          </label>
          <button type="button" onClick={handleSave} className="w-full py-3.5 bg-rain-cloud text-white rounded-xl font-inter text-sm font-semibold">
            Update line{qty > 1 ? ` · ×${qty}` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
