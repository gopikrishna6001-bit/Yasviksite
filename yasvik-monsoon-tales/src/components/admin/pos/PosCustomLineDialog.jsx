import { useEffect, useRef, useState } from 'react';
import { Minus, Plus, X } from 'lucide-react';

export default function PosCustomLineDialog({ open, onClose, onAdd }) {
  const titleRef = useRef(null);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [qty, setQty] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    setTitle('');
    setPrice('');
    setQty(1);
    setError('');
    const t = setTimeout(() => titleRef.current?.focus({ preventScroll: true }), 80);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const adjustQty = (delta) => {
    setQty((prev) => Math.max(1, (Number(prev) || 1) + delta));
  };

  const handleAdd = () => {
    const parsedPrice = Number(price);
    const parsedQty = Math.max(1, Number(qty) || 1);
    if (!title.trim()) {
      setError('Enter an item name');
      titleRef.current?.focus();
      return;
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setError('Enter a valid price in ₹');
      return;
    }
    onAdd({
      title: title.trim(),
      price: parsedPrice,
      qty: parsedQty,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-rain-cloud/50 p-0 sm:p-4"
      data-pos-allow-typing="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-sm max-h-[92vh] overflow-y-auto overscroll-contain p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        data-pos-allow-typing="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-cormorant text-xl text-rain-cloud">Add item to bill</h3>
          <button type="button" onClick={onClose} className="p-2 -mr-1 text-rain-cloud/40 hover:text-rain-cloud" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="font-inter text-[11px] text-rain-cloud/45 mb-4">
          Quick add for unlisted products, samples, or counter price — same as adding a catalog product.
        </p>
        <div className="space-y-3">
          <div>
            <label className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/45">Item name</label>
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAdd();
                }
              }}
              placeholder="e.g. Dates 250g"
              data-pos-allow-typing="true"
              className="mt-1 w-full px-3 py-3 border border-border rounded-xl font-inter text-base"
            />
          </div>

          <div>
            <label className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/45">Price ₹</label>
            <input
              type="number"
              min={0}
              step="any"
              inputMode="decimal"
              value={price}
              onChange={(e) => {
                setPrice(e.target.value);
                setError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAdd();
                }
              }}
              placeholder="0"
              data-pos-allow-typing="true"
              className="mt-1 w-full px-3 py-3 border border-border rounded-xl font-inter text-base"
            />
          </div>

          <div>
            <label className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/45">Quantity</label>
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
                onChange={(e) => {
                  const next = Math.max(1, Number(e.target.value) || 1);
                  setQty(next);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
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

          {error ? (
            <p className="font-inter text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          ) : null}

          <button
            type="button"
            onClick={handleAdd}
            className="w-full py-3.5 bg-wet-earth text-white rounded-xl font-inter text-sm font-semibold active:scale-[0.99]"
          >
            Add to bill{qty > 1 ? ` · ×${qty}` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
