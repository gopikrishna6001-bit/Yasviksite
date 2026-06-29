import IllustrationLayer from './IllustrationLayer';
import { toPageIllustrationSlot } from '@/lib/illustrationSettings';

export default function PageIllustration({ page }) {
  const slot = toPageIllustrationSlot(page);
  if (!slot) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[min(340px,44vw)] overflow-hidden" aria-hidden="true">
      <IllustrationLayer slot={slot} />
    </div>
  );
}
