import OptimizedImage from '@/components/ui/OptimizedImage';
import { retailClasses } from '@/brand/retailTheme';
import { formatRupee } from '@/lib/comboVisualUtils';

export default function ComboFreeGiftHighlight({ gifts = [], className = '' }) {
  const visible = (gifts || []).filter(Boolean);
  if (!visible.length) return null;

  return (
    <section className={className} aria-label="Free gifts included with this combo">
      <p className={retailClasses.label}>Free with this combo</p>
      <div className="mt-3 space-y-3">
        {visible.map((gift) => {
          const worth = gift.giftWorthPaise || gift.worth_paise;
          const worthLabel = worth ? formatRupee(Number(worth) / 100) : null;
          return (
            <div
              key={gift.id || `${gift.productId}-${gift.title}`}
              className="overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50 via-white to-[#FFFAF0]"
            >
              <div className="flex items-center gap-3 p-3 sm:p-4">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-warm-cream sm:h-20 sm:w-20">
                  {gift.imageUrl ? (
                    <OptimizedImage
                      src={gift.imageUrl}
                      alt={gift.title}
                      preset="thumb"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl" aria-hidden>
                      🎁
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-inter text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-800">
                    Free gift
                  </p>
                  <p className="mt-1 font-cormorant text-xl font-semibold text-deep-forest sm:text-2xl">
                    {gift.title}
                  </p>
                  {gift.quantityLabel ? (
                    <p className="mt-0.5 font-inter text-sm text-deep-forest/70">
                      {gift.quantityLabel}
                    </p>
                  ) : null}
                  {worthLabel ? (
                    <p className="mt-1 font-inter text-sm text-deep-forest/70">
                      Worth
                      {' '}
                      <span className="font-semibold text-deep-forest">{worthLabel}</span>
                      {' '}
                      · included at no extra cost
                    </p>
                  ) : (
                    <p className="mt-1 font-inter text-sm text-deep-forest/70">
                      Included at no extra cost
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
