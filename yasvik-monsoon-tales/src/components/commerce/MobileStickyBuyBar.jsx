import { Minus, Plus } from 'lucide-react';

export default function MobileStickyBuyBar({
  price,
  quantity,
  onDecrement,
  onIncrement,
  onAddToCart,
  onBuyNow,
  added,
  inStock = true,
  storeOffline = false,
  isPulseActive = false,
  saveLabel = null,
}) {
  if (storeOffline || !inStock) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-soft-border bg-white px-3 pt-2.5 shadow-[0_-8px_30px_rgba(31,61,43,0.1)] pb-[max(0.625rem,env(safe-area-inset-bottom))] md:hidden">
      <div className="mx-auto flex max-w-lg items-center gap-2">
        <div className="min-w-0 flex-shrink-0">
          <p className="font-inter text-lg font-bold leading-none text-deep-forest">₹{price}</p>
          {saveLabel ? (
            <p className="mt-0.5 font-inter text-[10px] font-bold text-deep-forest/65">{saveLabel}</p>
          ) : null}
        </div>
        <div className="flex flex-shrink-0 items-center overflow-hidden rounded-full border border-soft-border">
          <button type="button" onClick={onDecrement} className="flex h-9 w-8 items-center justify-center" aria-label="Decrease quantity">
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-6 text-center font-inter text-sm font-bold">{quantity}</span>
          <button type="button" onClick={onIncrement} className="flex h-9 w-8 items-center justify-center" aria-label="Increase quantity">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <button
          type="button"
          onClick={onAddToCart}
          className={`min-w-0 flex-1 rounded-full bg-deep-forest py-2.5 font-inter text-[10px] font-bold uppercase tracking-wide text-warm-cream ${isPulseActive ? 'premium-haptic-pulse' : ''}`}
        >
          {added ? 'Added' : 'Add to cart'}
        </button>
        {onBuyNow ? (
          <button
            type="button"
            onClick={onBuyNow}
            className="flex-shrink-0 rounded-full border border-deep-forest px-3 py-2.5 font-inter text-[10px] font-bold uppercase tracking-wide text-deep-forest"
          >
            Buy
          </button>
        ) : null}
      </div>
    </div>
  );
}
