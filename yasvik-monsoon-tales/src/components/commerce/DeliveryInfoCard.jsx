import { Truck } from 'lucide-react';
import {
  CHECKOUT_DELIVERY_EXPLAINER,
  CHECKOUT_DELIVERY_PAYMENT_NOTE,
  DELIVERY_FEE_CHECKOUT_LABEL,
  DELIVERY_OFFER_LINE,
  DELIVERY_RATE_CALCULATOR_URL,
} from '@/lib/commerceCopy';
import { YASVIK_DEFAULT_SERVICE_PINCODE } from '@/lib/storeLocation';
import DeliveryFeeNotice from '@/components/commerce/DeliveryFeeNotice';

/** Full home-delivery explanation — checkout only (not cart). */
export default function DeliveryInfoCard({ className = '', compact = false }) {
  const body = (
    <>
      <p className="font-inter text-sm font-medium text-deep-forest/80">{DELIVERY_OFFER_LINE}</p>
      <p className="mt-2 font-inter text-[11px] leading-relaxed text-rain-cloud/55">
        {CHECKOUT_DELIVERY_EXPLAINER}
      </p>
      <p className="mt-2 font-inter text-[11px] leading-relaxed text-rain-cloud/55">
        {CHECKOUT_DELIVERY_PAYMENT_NOTE}
      </p>
      <DeliveryFeeNotice className="mt-3" />
      <p className="mt-2 font-inter text-[11px] leading-relaxed text-rain-cloud/55">
        Estimate your charge on the{' '}
        <a href={DELIVERY_RATE_CALCULATOR_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-forest-canopy underline">
          Delhivery rate calculator
        </a>
        {' '}— our pincode is {YASVIK_DEFAULT_SERVICE_PINCODE}.
      </p>
      <p className="mt-3 font-inter text-xs text-rain-cloud/60">
        Delivery: <span className="font-semibold text-deep-forest/75">{DELIVERY_FEE_CHECKOUT_LABEL}</span>
      </p>
    </>
  );

  if (compact) {
    return (
      <details className={`group rounded-2xl border border-border/20 bg-white ${className}`.trim()}>
        <summary className="flex cursor-pointer list-none items-center gap-2 p-4 [&::-webkit-details-marker]:hidden">
          <Truck className="h-4 w-4 text-neon-paddy" strokeWidth={1.7} aria-hidden="true" />
          <span className="flex-1 font-inter text-sm font-medium text-rain-cloud">Delivery details</span>
          <span className="font-inter text-[10px] text-rain-cloud/40 group-open:hidden">Tap to expand</span>
        </summary>
        <div className="border-t border-border/10 px-4 pb-4 pt-3">{body}</div>
      </details>
    );
  }

  return (
    <section className={`rounded-2xl border border-border/20 bg-white p-5 md:p-6 ${className}`.trim()}>
      <div className="mb-3 flex items-center gap-2">
        <Truck className="h-5 w-5 text-neon-paddy" strokeWidth={1.7} aria-hidden="true" />
        <h2 className="font-cormorant text-xl font-light text-rain-cloud">Home delivery</h2>
      </div>
      {body}
    </section>
  );
}
