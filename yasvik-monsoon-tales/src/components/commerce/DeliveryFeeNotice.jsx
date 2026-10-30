import { CHECKOUT_DELIVERY_SAVINGS_TIPS } from '@/lib/commerceCopy';

/** Compact delivery-fee notice for cart / checkout. */
export default function DeliveryFeeNotice({ className = '', tips = CHECKOUT_DELIVERY_SAVINGS_TIPS, dense = false }) {
  if (!tips?.length) return null;

  return (
    <ul className={`space-y-1 ${dense ? 'font-inter text-[10px] leading-relaxed text-deep-forest/50' : 'font-inter text-[11px] leading-relaxed text-rain-cloud/50'} ${className}`.trim()}>
      {tips.map((tip) => (
        <li key={tip} className="flex gap-1.5">
          <span className="mt-[0.35em] h-1 w-1 flex-shrink-0 rounded-full bg-neon-paddy/70" aria-hidden="true" />
          <span>{tip}</span>
        </li>
      ))}
    </ul>
  );
}
